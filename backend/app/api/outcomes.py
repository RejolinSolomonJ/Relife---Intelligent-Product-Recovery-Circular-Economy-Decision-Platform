from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ReturnItem, Recommendation, RecoveryOutcome, Product

router = APIRouter(prefix="/api/outcomes", tags=["outcomes"])


class RecordOutcomeRequest(BaseModel):
    return_id: str
    actual_pathway: str
    actual_revenue: float
    actual_cost: float
    actual_time_days: int = 2
    waste_diverted_kg: Optional[float] = None
    notes: Optional[str] = None


class OutcomeRecordResponse(BaseModel):
    id: int
    return_id: str
    product_name: str
    category: str
    predicted_pathway: str
    actual_pathway: str
    predicted_revenue: float
    actual_revenue: float
    predicted_cost: float
    actual_cost: float
    predicted_net_value: float
    actual_net_value: float
    actual_time_days: int
    waste_diverted_kg: float
    completed_at: str
    notes: Optional[str] = None
    revenue_variance_pct: float
    cost_variance_pct: float


class OutcomesSummaryResponse(BaseModel):
    total_realized_revenue: float
    total_realized_cost: float
    total_net_value: float
    total_waste_diverted_kg: float
    avg_accuracy_pct: float
    outcomes: List[OutcomeRecordResponse]


@router.get("", response_model=OutcomesSummaryResponse)
def get_outcomes_summary(db: Session = Depends(get_db)):
    """
    Returns closed-loop realized outcomes with predicted vs actual comparison.
    """
    outcomes = db.query(RecoveryOutcome).order_by(RecoveryOutcome.completed_at.desc()).all()

    record_items = []
    total_rev = 0.0
    total_cost = 0.0
    total_waste = 0.0
    variance_sum = 0.0

    for out in outcomes:
        ret = db.query(ReturnItem).filter(ReturnItem.id == out.return_id).first()
        prod = ret.product if ret else None
        prod_name = f"{prod.brand} {prod.model}" if prod else "Electronic Device"
        category = prod.category if prod else "Electronics"

        rec = db.query(Recommendation).filter(Recommendation.return_id == out.return_id).first()
        pred_rev = rec.predicted_value_inr if rec else (prod.msrp_inr * 0.6 if prod else 50000.0)
        pred_cost = rec.estimated_cost_inr if rec else 5000.0
        pred_pathway = rec.pathway if rec else out.actual_pathway

        act_rev = out.actual_revenue if out.actual_revenue > 0 else (getattr(out, "actual_value_inr", None) or pred_rev)
        act_cost = out.actual_cost if out.actual_cost > 0 else (getattr(out, "refurbish_cost_inr", None) or pred_cost)

        pred_nrv = pred_rev - pred_cost
        act_nrv = act_rev - act_cost

        rev_var = ((act_rev - pred_rev) / pred_rev * 100) if pred_rev else 0.0
        cost_var = ((act_cost - pred_cost) / pred_cost * 100) if pred_cost else 0.0

        total_rev += act_rev
        total_cost += act_cost
        total_waste += (out.waste_diverted_kg or 0.0)
        variance_sum += abs(rev_var)

        record_items.append(OutcomeRecordResponse(
            id=out.id,
            return_id=out.return_id,
            product_name=prod_name,
            category=category,
            predicted_pathway=pred_pathway,
            actual_pathway=out.actual_pathway,
            predicted_revenue=round(pred_rev, 2),
            actual_revenue=round(act_rev, 2),
            predicted_cost=round(pred_cost, 2),
            actual_cost=round(act_cost, 2),
            predicted_net_value=round(pred_nrv, 2),
            actual_net_value=round(act_nrv, 2),
            actual_time_days=out.actual_time_days or 2,
            waste_diverted_kg=round(out.waste_diverted_kg or 0.0, 3),
            completed_at=out.completed_at.strftime("%Y-%m-%d %H:%M") if out.completed_at else "",
            notes=out.notes,
            revenue_variance_pct=round(rev_var, 1),
            cost_variance_pct=round(cost_var, 1)
        ))

    avg_var = (variance_sum / len(outcomes)) if outcomes else 0.0
    accuracy = max(50.0, min(99.0, 100.0 - avg_var))

    return OutcomesSummaryResponse(
        total_realized_revenue=round(total_rev, 2),
        total_realized_cost=round(total_cost, 2),
        total_net_value=round(total_rev - total_cost, 2),
        total_waste_diverted_kg=round(total_waste, 3),
        avg_accuracy_pct=round(accuracy, 1),
        outcomes=record_items
    )


@router.post("", response_model=OutcomeRecordResponse)
def record_outcome(payload: RecordOutcomeRequest, db: Session = Depends(get_db)):
    """
    Records an actual closed-loop outcome for a product return, comparing predicted vs actual.
    """
    ret = db.query(ReturnItem).filter(ReturnItem.id == payload.return_id).first()
    if not ret:
        raise HTTPException(status_code=404, detail="Return item not found")

    rec = db.query(Recommendation).filter(Recommendation.return_id == payload.return_id).first()
    prod = ret.product
    prod_name = f"{prod.brand} {prod.model}" if prod else "Electronic Device"
    category = prod.category if prod else "Electronics"

    pred_rev = rec.predicted_value_inr if rec else (prod.msrp_inr * 0.6 if prod else 50000.0)
    pred_cost = rec.estimated_cost_inr if rec else 5000.0
    pred_pathway = rec.pathway if rec else payload.actual_pathway

    waste_div = payload.waste_diverted_kg
    if waste_div is None:
        unit_weight = prod.weight_kg if prod else 1.5
        waste_div = unit_weight * 0.94

    now = datetime.utcnow()
    outcome = db.query(RecoveryOutcome).filter(RecoveryOutcome.return_id == payload.return_id).first()
    if not outcome:
        outcome = RecoveryOutcome(
            return_id=payload.return_id,
            actual_pathway=payload.actual_pathway,
            actual_revenue=payload.actual_revenue,
            actual_cost=payload.actual_cost,
            refurbish_cost_inr=payload.actual_cost,
            actual_value_inr=payload.actual_revenue,
            actual_time_days=payload.actual_time_days,
            waste_diverted_kg=round(waste_div, 3),
            notes=payload.notes or f"Manually recorded outcome via {payload.actual_pathway}.",
            completed_at=now
        )
        db.add(outcome)
    else:
        outcome.actual_pathway = payload.actual_pathway
        outcome.actual_revenue = payload.actual_revenue
        outcome.actual_cost = payload.actual_cost
        outcome.refurbish_cost_inr = payload.actual_cost
        outcome.actual_value_inr = payload.actual_revenue
        outcome.actual_time_days = payload.actual_time_days
        outcome.waste_diverted_kg = round(waste_div, 3)
        outcome.notes = payload.notes or outcome.notes
        outcome.completed_at = now

    # Update ReturnItem status
    ret.status = "Recovered"
    ret.needs_human_review = False
    db.commit()
    db.refresh(outcome)

    rev_var = ((payload.actual_revenue - pred_rev) / pred_rev * 100) if pred_rev else 0.0
    cost_var = ((payload.actual_cost - pred_cost) / pred_cost * 100) if pred_cost else 0.0

    return OutcomeRecordResponse(
        id=outcome.id,
        return_id=outcome.return_id,
        product_name=prod_name,
        category=category,
        predicted_pathway=pred_pathway,
        actual_pathway=outcome.actual_pathway,
        predicted_revenue=round(pred_rev, 2),
        actual_revenue=round(outcome.actual_revenue, 2),
        predicted_cost=round(pred_cost, 2),
        actual_cost=round(outcome.actual_cost, 2),
        predicted_net_value=round(pred_rev - pred_cost, 2),
        actual_net_value=round(outcome.actual_revenue - outcome.actual_cost, 2),
        actual_time_days=outcome.actual_time_days,
        waste_diverted_kg=round(outcome.waste_diverted_kg, 3),
        completed_at=outcome.completed_at.strftime("%Y-%m-%d %H:%M"),
        notes=outcome.notes,
        revenue_variance_pct=round(rev_var, 1),
        cost_variance_pct=round(cost_var, 1)
    )

