import random
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Component, Buyer, ReturnItem, Product, WaitlistEnquiry
from ..pricing_data import SEED_BUYERS

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


class AllocateComponentRequest(BaseModel):
    component_id: int
    buyer_id: int
    notes: Optional[str] = None


class StartAuctionRequest(BaseModel):
    start_price: float
    floor_price: float
    step_amount: float = 150.0
    step_interval_min: int = 2


class BuyAuctionRequest(BaseModel):
    buyer_name: str = "Apex Circular Refurb"
    buyer_email: Optional[str] = "buyer@apexrefurb.com"


class BuyerInfo(BaseModel):
    id: int
    name: str
    buyer_type: str
    target_components: str
    min_condition: str
    bid_price_factor: float
    demand_rating: str
    location: str


class PriceChartPoint(BaseModel):
    step: int
    time_label: str
    price: float
    status: str  # past | current | next


class ReverseAuctionInfo(BaseModel):
    active: bool
    start_price: float
    floor_price: float
    current_price: float
    step_interval_min: int
    step_amount: float
    steps_elapsed: int
    seconds_to_next_drop: int
    price_chart: List[PriceChartPoint]


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
    sample_assumption_note: str = "Illustrative sample market valuation; physical testing needed to verify."
    
    # Dynamic Pricing & Reverse Auction Fields (Feature 2)
    listed_days_ago: int = 3
    suggested_price: float
    demand_inquiries_count: int = 0
    condition_multiplier: float = 1.0
    demand_multiplier: float = 1.0
    age_decay_factor: float = 1.0
    pricing_rationale: str = ""
    is_reverse_auction: bool = False
    auction_info: Optional[ReverseAuctionInfo] = None
    is_sold: bool = False
    sold_price: Optional[float] = None


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
    now = datetime.utcnow()
    total_waitlist_enquiries = db.query(WaitlistEnquiry).filter(WaitlistEnquiry.status == "active").all()

    for idx, c in enumerate(components):
        # Match buyer
        ret_item = db.query(ReturnItem).filter(ReturnItem.id == c.return_id).first()
        prod_name = f"{ret_item.product.brand} {ret_item.product.model}" if ret_item and ret_item.product else "Electronic Device"
        cat = ret_item.product.category if ret_item and ret_item.product else "Electronics"

        # Best buyer match & count matching buyers
        matched_buyer_obj = None
        best_factor = 0.0
        match_score = 88
        matching_buyers_count = 0

        for b in buyers:
            if c.component_type.lower() in [t.strip().lower() for t in b.target_components.split(",")]:
                matching_buyers_count += 1
                if b.bid_price_factor > best_factor:
                    best_factor = b.bid_price_factor
                    matched_buyer_obj = b
                    match_score = int(b.bid_price_factor * 100) - (2 if c.condition != "Grade A" else 0)

        indicative_rev = round(c.estimated_value * (best_factor if best_factor > 0 else 0.90), 0)

        # Dynamic Suggested Price Calculation (Feature 2)
        cond_map = {"Grade A": 1.0, "Grade B": 0.85, "Grade C": 0.70, "Defective": 0.35}
        cond_mult = cond_map.get(c.condition, 0.85)

        # Count waitlist demand matching category / keywords
        waitlist_matches = sum(
            1 for w in total_waitlist_enquiries 
            if w.category.lower() in cat.lower() or cat.lower() in w.category.lower() or c.component_type.lower() in w.model.lower()
        )
        total_demand_count = matching_buyers_count + waitlist_matches

        if total_demand_count >= 5:
            demand_mult = 1.15
        elif total_demand_count >= 2:
            demand_mult = 1.05
        else:
            demand_mult = 0.92

        listed_days = c.listed_days_ago if c.listed_days_ago is not None else ((idx % 7) + 2)
        # Price drops gradually (approx 1.5% per 2 days unsold, floor at 65%)
        age_decay = max(0.65, round(1.0 - (listed_days * 0.015), 3))

        suggested_price = round(c.estimated_value * cond_mult * demand_mult * age_decay, 0)
        pricing_rationale = (
            f"Base INR {c.estimated_value:,.0f} x Cond({c.condition} {cond_mult:.2f}) "
            f"x Demand({total_demand_count} inq {demand_mult:.2f}) x Age({listed_days}d {age_decay:.2f})"
        )

        # Reverse auction handling
        auction_info = None
        if c.is_reverse_auction and c.auction_started_at:
            elapsed_minutes = (now - c.auction_started_at).total_seconds() / 60.0
            steps_elapsed = int(elapsed_minutes // max(1, c.auction_step_interval_min))
            price_drop = steps_elapsed * c.auction_step_amount
            current_price = max(c.auction_floor_price, c.auction_start_price - price_drop)
            c.auction_current_price = current_price
            step_sec = c.auction_step_interval_min * 60
            seconds_to_next = max(0, int(step_sec - ((now - c.auction_started_at).total_seconds() % step_sec)))

            chart_points = []
            for s in range(max(0, steps_elapsed - 2), steps_elapsed + 4):
                p = max(c.auction_floor_price, c.auction_start_price - (s * c.auction_step_amount))
                if s < steps_elapsed:
                    status = "past"
                    label = f"-{(steps_elapsed - s) * c.auction_step_interval_min}m"
                elif s == steps_elapsed:
                    status = "current"
                    label = "NOW"
                else:
                    status = "next"
                    label = f"+{(s - steps_elapsed) * c.auction_step_interval_min}m"
                chart_points.append(PriceChartPoint(step=s, time_label=label, price=p, status=status))

            auction_info = ReverseAuctionInfo(
                active=not c.is_sold,
                start_price=c.auction_start_price,
                floor_price=c.auction_floor_price,
                current_price=current_price,
                step_interval_min=c.auction_step_interval_min,
                step_amount=c.auction_step_amount,
                steps_elapsed=steps_elapsed,
                seconds_to_next_drop=seconds_to_next,
                price_chart=chart_points,
            )

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
            listed_days_ago=listed_days,
            suggested_price=suggested_price,
            demand_inquiries_count=total_demand_count,
            condition_multiplier=cond_mult,
            demand_multiplier=demand_mult,
            age_decay_factor=age_decay,
            pricing_rationale=pricing_rationale,
            is_reverse_auction=c.is_reverse_auction,
            auction_info=auction_info,
            is_sold=c.is_sold,
            sold_price=c.sold_price,
        ))

    return results


@router.post("/components/{component_id}/start-auction")
def start_reverse_auction(
    component_id: int, 
    payload: StartAuctionRequest, 
    db: Session = Depends(get_db)
):
    """
    Retailer sets starting price, floor price, and step interval for component reverse auction.
    """
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    now = datetime.utcnow()
    comp.is_reverse_auction = True
    comp.auction_start_price = payload.start_price
    comp.auction_floor_price = payload.floor_price
    comp.auction_current_price = payload.start_price
    comp.auction_step_amount = payload.step_amount
    comp.auction_step_interval_min = payload.step_interval_min
    comp.auction_started_at = now
    comp.is_sold = False
    comp.sold_price = None

    db.commit()
    db.refresh(comp)

    return {
        "success": True,
        "component_id": comp.id,
        "component_type": comp.component_type,
        "start_price": comp.auction_start_price,
        "floor_price": comp.auction_floor_price,
        "step_interval_min": comp.auction_step_interval_min,
        "step_amount": comp.auction_step_amount,
        "message": f"Reverse auction initiated for {comp.component_type}. Price steps down every {comp.auction_step_interval_min} minute(s)."
    }


@router.post("/components/{component_id}/buy-auction")
def buy_reverse_auction(
    component_id: int, 
    payload: BuyAuctionRequest, 
    db: Session = Depends(get_db)
):
    """
    Buyer clicks 'Buy now' at the current reverse auction price, locking the transaction.
    """
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    if not comp.is_reverse_auction or not comp.auction_started_at:
        raise HTTPException(status_code=400, detail="Reverse auction is not active for this component")

    if comp.is_sold:
        raise HTTPException(status_code=400, detail="This component has already been sold")

    now = datetime.utcnow()
    elapsed_minutes = (now - comp.auction_started_at).total_seconds() / 60.0
    steps_elapsed = int(elapsed_minutes // max(1, comp.auction_step_interval_min))
    price_drop = steps_elapsed * comp.auction_step_amount
    final_price = max(comp.auction_floor_price, comp.auction_start_price - price_drop)

    comp.is_sold = True
    comp.is_harvested = True
    comp.sold_price = final_price
    db.commit()

    return {
        "success": True,
        "transaction_id": f"AUCTION-WIN-{comp.id:04d}-{random.randint(1000, 9999)}",
        "component_id": comp.id,
        "component_type": comp.component_type,
        "buyer_name": payload.buyer_name,
        "winning_price_inr": final_price,
        "original_start_price": comp.auction_start_price,
        "buyer_savings_inr": max(0.0, comp.auction_start_price - final_price),
        "message": f"Reverse auction won! {comp.component_type} acquired by {payload.buyer_name} for {final_price:,.0f} INR."
    }


@router.post("/components/{component_id}/reset-auction")
def reset_reverse_auction(component_id: int, db: Session = Depends(get_db)):
    """
    Helper to reset reverse auction state for demo replay.
    """
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    comp.is_reverse_auction = False
    comp.auction_started_at = None
    comp.is_sold = False
    comp.sold_price = None
    db.commit()

    return {"success": True, "message": f"Auction state reset for component #{comp.id}"}


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

