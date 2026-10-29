import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Component, Buyer, ReturnItem, Product
from ..pricing_data import SEED_BUYERS

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


class AllocateComponentRequest(BaseModel):
    component_id: int
    buyer_id: int
    notes: Optional[str] = None


class BuyerInfo(BaseModel):
    id: int
    name: str
    buyer_type: str
    target_components: str
    min_condition: str
    bid_price_factor: float
    demand_rating: str
    location: str


class ComponentCardResponse(BaseModel):
    id: int
    return_id: str
    product_name: str
    category: str
    component_type: str
    condition: str
    estimated_value: float
    indicative_revenue: float
    is_harvested: bool
    matched_buyer: Optional[BuyerInfo] = None
    match_score: int
    sample_assumption_note: str = "Sample indicative market value"


@router.get("/buyers", response_model=List[BuyerInfo])
def list_buyers(db: Session = Depends(get_db)):
    """
    Returns registered B2B buyers for circular components.
    """
    buyers = db.query(Buyer).all()
    if not buyers:
        for b in SEED_BUYERS:
            b_obj = Buyer(
                id=b["id"],
                name=b["name"],
                buyer_type=b["buyer_type"],
                target_components=b["target_components"],
                min_condition=b["min_condition"],
                bid_price_factor=b["bid_price_factor"],
                demand_rating=b["demand_rating"],
                location=b["location"],
            )
            db.add(b_obj)
        db.commit()
        buyers = db.query(Buyer).all()

    return [
        BuyerInfo(
            id=b.id,
            name=b.name,
            buyer_type=b.buyer_type,
            target_components=b.target_components,
            min_condition=b.min_condition,
            bid_price_factor=b.bid_price_factor,
            demand_rating=b.demand_rating,
            location=b.location,
        )
        for b in buyers
    ]


@router.get("/components", response_model=List[ComponentCardResponse])
def list_components(
    component_type: Optional[str] = Query(None, description="Filter by type: display, RAM, storage, motherboard, battery"),
    condition: Optional[str] = Query(None, description="Filter by condition: Grade A, Grade B, Grade C"),
    is_harvested: Optional[bool] = Query(None, description="Filter by harvested status"),
    db: Session = Depends(get_db)
):
    """
    Returns listed harvestable components matched against circular buyers with compatibility scores.
    """
    buyers = db.query(Buyer).all()
    if not buyers:
        list_buyers(db)
        buyers = db.query(Buyer).all()

    components = db.query(Component).all()

    # If components table is empty, auto-populate from returns items to ensure realistic demo data
    if not components:
        returns = db.query(ReturnItem).limit(10).all()
        comp_types = [
            ("display", "Liquid Retina / OLED Assembly", 0.30, ["Grade A", "Grade B"]),
            ("motherboard", "OEM Logic Board (Tested)", 0.32, ["Grade A", "Grade B"]),
            ("storage", "NVMe PCIe 4.0 SSD 512GB", 0.10, ["Grade A"]),
            ("ram", "LPDDR5 16GB Dual-Channel Module", 0.08, ["Grade A"]),
            ("battery", "High-Health Lithium Cell (88-94%)", 0.07, ["Grade B"]),
            ("camera_module", "Periscope Triple Camera Sensor", 0.12, ["Grade A", "Grade B"]),
        ]
        
        for ret in returns:
            msrp = ret.product.msrp_inr if ret.product else 80000.0
            # Add 2-3 components per item
            selected_types = random.sample(comp_types, 3)
            for c_type, label, ratio, grades in selected_types:
                val = round(msrp * ratio * random.uniform(0.85, 1.15), 0)
                comp = Component(
                    return_id=ret.id,
                    component_type=c_type,
                    condition=random.choice(grades),
                    estimated_value=val,
                    is_harvested=random.random() < 0.25,
                )
                db.add(comp)
        db.commit()
        components = db.query(Component).all()

    # Filtering
    if component_type:
        components = [c for c in components if c.component_type.lower() == component_type.lower()]
    if condition:
        components = [c for c in components if c.condition.lower() == condition.lower()]
    if is_harvested is not None:
        components = [c for c in components if c.is_harvested == is_harvested]

    results = []
    for c in components:
        # Match buyer
        ret_item = db.query(ReturnItem).filter(ReturnItem.id == c.return_id).first()
        prod_name = f"{ret_item.product.brand} {ret_item.product.model}" if ret_item and ret_item.product else "Electronic Device"
        cat = ret_item.product.category if ret_item and ret_item.product else "Electronics"

        # Best buyer match
        matched_buyer_obj = None
        best_factor = 0.0
        match_score = 88
        for b in buyers:
            if c.component_type.lower() in [t.strip().lower() for t in b.target_components.split(",")]:
                if b.bid_price_factor > best_factor:
                    best_factor = b.bid_price_factor
                    matched_buyer_obj = b
                    match_score = int(b.bid_price_factor * 100) - (2 if c.condition != "Grade A" else 0)

        indicative_rev = round(c.estimated_value * (best_factor if best_factor > 0 else 0.90), 0)

        results.append(ComponentCardResponse(
            id=c.id,
            return_id=c.return_id,
            product_name=prod_name,
            category=cat,
            component_type=c.component_type.capitalize(),
            condition=c.condition,
            estimated_value=c.estimated_value,
            indicative_revenue=indicative_rev,
            is_harvested=c.is_harvested,
            matched_buyer=BuyerInfo(
                id=matched_buyer_obj.id,
                name=matched_buyer_obj.name,
                buyer_type=matched_buyer_obj.buyer_type,
                target_components=matched_buyer_obj.target_components,
                min_condition=matched_buyer_obj.min_condition,
                bid_price_factor=matched_buyer_obj.bid_price_factor,
                demand_rating=matched_buyer_obj.demand_rating,
                location=matched_buyer_obj.location,
            ) if matched_buyer_obj else None,
            match_score=min(99, max(75, match_score)),
        ))

    return results


@router.post("/allocate")
def allocate_component(payload: AllocateComponentRequest, db: Session = Depends(get_db)):
    """
    Allocates a harvested component to a circular B2B buyer and issues an order manifest.
    """
    comp = db.query(Component).filter(Component.id == payload.component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    buyer = db.query(Buyer).filter(Buyer.id == payload.buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    comp.is_harvested = True
    comp.buyer_match_id = buyer.id
    db.commit()

    transacted_amount = round(comp.estimated_value * buyer.bid_price_factor, 0)

    return {
        "success": True,
        "transaction_id": f"B2B-TXN-{comp.id:04d}-{random.randint(1000, 9999)}",
        "component_id": comp.id,
        "component_type": comp.component_type,
        "allocated_to": buyer.name,
        "buyer_location": buyer.location,
        "realized_value_inr": transacted_amount,
        "message": f"Successfully allocated {comp.component_type} to {buyer.name} for {transacted_amount} INR."
    }

