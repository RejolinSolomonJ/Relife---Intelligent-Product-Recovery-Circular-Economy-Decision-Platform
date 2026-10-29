from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    ReturnItem,
    Inspection,
    Defect,
    FunctionalTest,
    RecoveryOption,
    Recommendation,
    Product
)
from ..schemas import (
    EvaluateDecisionRequest,
    EvaluateDecisionResponse,
    RecommendationReportResponse,
    ResolveReviewRequest,
    PathwayEvaluationItem,
    ConfidenceBreakdown,
    EnvironmentalImpact
)
from ..decision_engine import evaluate_five_pathways
from ..pricing_data import PATHWAY_OPERATIONAL_COSTS, DEFECT_PART_COSTS

router = APIRouter(prefix="/api/returns", tags=["decision_engine"])


def _gather_context(return_id: str, db: Session):
    return_item = db.query(ReturnItem).filter(ReturnItem.id == return_id).first()
    if not return_item:
        prod = db.query(Product).first()
        if not prod:
            prod = Product(id="PROD-GEN-01", brand="Generic", model="Asset", category="Laptop", base_msrp=60000.0, weight_kg=1.4)
            db.add(prod)
            db.flush()
        return_item = ReturnItem(
            id=return_id,
            product_id=prod.id,
            purchase_price=55000.0,
            age_months=6,
            return_reason="Automated circular triage",
            warranty_status="Active"
        )
        db.add(return_item)
        db.commit()
        db.refresh(return_item)

    product = return_item.product
    msrp = return_item.purchase_price or (product.msrp_inr if product else 85000.0)
    weight_kg = product.weight_kg if product else 1.45
    category = product.category if product else "Laptop"

    # Get latest inspection and defects
    inspection = (
        db.query(Inspection)
        .filter(Inspection.return_id == return_id)
        .order_by(Inspection.id.desc())
        .first()
    )
    defects_data = []
    is_blurry = False
    blur_score = 150.0

    if inspection:
        is_blurry = inspection.is_blurry
        blur_score = inspection.blur_score
        defects = db.query(Defect).filter(Defect.inspection_id == inspection.id).all()
        for d in defects:
            defects_data.append({
                "defect_type": d.defect_type,
                "severity": d.severity,
                "confidence": d.confidence,
                "bbox_x": d.bbox_x,
                "bbox_y": d.bbox_y,
                "bbox_w": d.bbox_w,
                "bbox_h": d.bbox_h,
                "description": d.description,
            })

    # Get functional tests
    test = db.query(FunctionalTest).filter(FunctionalTest.return_id == return_id).first()
    functional_tests = {
        "powers_on": test.powers_on if test else "pass",
        "display_ok": test.display_ok if test else "pass",
        "battery_health_pct": test.battery_health_pct if test else 85,
        "battery_test": test.battery_test if test else "pass",
        "motherboard_ok": test.motherboard_ok if test else "pass",
        "ram_ok": test.ram_ok if test else "pass",
        "storage_ok": test.storage_ok if test else "pass",
        "ports_ok": test.ports_ok if test else "pass",
    }

    return return_item, product, msrp, weight_kg, category, defects_data, functional_tests, is_blurry, blur_score, inspection, test


@router.get("/{return_id}/economics")
def get_pathway_economics(return_id: str, db: Session = Depends(get_db)):
    """
    Step 4: Cost & Value Estimation.
    Returns itemized operational and parts cost breakdowns, expected resale values,
    and net recovery values across all 5 circular pathways.
    Every number is tagged 'sample assumption' / 'estimated'.
    """
    return_item, product, msrp, weight_kg, category, defects, functional_tests, is_blurry, blur_score, _, _ = _gather_context(return_id, db)

    evaluation = evaluate_five_pathways(
        product_msrp=msrp,
        product_weight_kg=weight_kg,
        category=category,
        defects=defects,
        functional_tests=functional_tests,
        is_blurry=is_blurry,
        blur_score=blur_score,
    )

    return {
        "return_id": return_id,
        "product_name": f"{return_item.product.brand} {return_item.product.model}" if return_item.product else "Electronic Device",
        "purchase_price": msrp,
        "category": category,
        "tag": "sample assumption",
        "pathway_economics": evaluation["ranked_pathways"],
        "harvestable_components": evaluation["components"],
        "honesty_notice": "All cost and revenue figures are synthetic benchmarks based on market data feeds for electronics recovery."
    }


@router.post("/{return_id}/evaluate", response_model=EvaluateDecisionResponse)
def evaluate_return_decision(
    return_id: str,
    payload: Optional[EvaluateDecisionRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Step 5 & 6: Five-Pathway Multi-Criteria Decision Engine & Human Review Routing.
    Evaluates Direct Resale, Repair, Refurbishment, Component Harvesting, Recycling.
    Applies safety override constraints, computes weighted ranking from sliders,
    identifies human review triggers, and saves recommendation.
    """
    return_item, product, msrp, weight_kg, category, defects, functional_tests, is_blurry, blur_score, inspection, test = _gather_context(return_id, db)

    weights = None
    if payload and payload.weights:
        weights = {
            "profit": payload.weights.profit,
            "environment": payload.weights.environment,
            "speed": payload.weights.speed,
            "risk": payload.weights.risk,
        }

    eval_result = evaluate_five_pathways(
        product_msrp=msrp,
        product_weight_kg=weight_kg,
        category=category,
        defects=defects,
        functional_tests=functional_tests,
        is_blurry=is_blurry,
        blur_score=blur_score,
        weights=weights,
    )

    winner = eval_result["winner"]
    now = datetime.utcnow()

    # Clear previous options and save fresh evaluated options
    db.query(RecoveryOption).filter(RecoveryOption.return_id == return_id).delete()
    for opt in eval_result["ranked_pathways"]:
        rec_opt = RecoveryOption(
            return_id=return_id,
            pathway=opt["pathway"],
            rank=opt["rank"],
            net_recovery_value=opt["net_recovery_value"],
            expected_revenue=opt["expected_revenue"],
            expected_cost=opt["expected_cost"],
            recovery_time_days=opt["recovery_time_days"],
            risk_score=opt["risk_score"],
            environmental_score=opt["environmental_score"],
            weighted_score=opt["weighted_score"],
            is_safety_override=opt["is_safety_override"],
            override_reason=opt["override_reason"],
        )
        db.add(rec_opt)

    # Save or update recommendation
    rec = db.query(Recommendation).filter(Recommendation.return_id == return_id).first()
    if not rec:
        rec = Recommendation(
            return_id=return_id,
            selected_pathway=winner["pathway"],
            predicted_value_inr=winner["net_recovery_value"],
            confidence_overall=eval_result["confidence_breakdown"]["overall_recommendation_confidence"],
            confidence_detection=eval_result["confidence_breakdown"]["detection_confidence"],
            confidence_condition=eval_result["confidence_breakdown"]["condition_confidence"],
            winner_rationale=eval_result["winner_rationale"],
            fallback_rationale=eval_result["fallback_rationale"],
            missing_information=eval_result["missing_information"],
            safety_override_triggered=winner["is_safety_override"],
            human_review_required=eval_result["human_review_required"],
            required_tests="; ".join(eval_result["required_tests"]),
            generated_at=now,
        )
        db.add(rec)
    else:
        rec.selected_pathway = winner["pathway"]
        rec.predicted_value_inr = winner["net_recovery_value"]
        rec.confidence_overall = eval_result["confidence_breakdown"]["overall_recommendation_confidence"]
        rec.confidence_detection = eval_result["confidence_breakdown"]["detection_confidence"]
        rec.confidence_condition = eval_result["confidence_breakdown"]["condition_confidence"]
        rec.winner_rationale = eval_result["winner_rationale"]
        rec.fallback_rationale = eval_result["fallback_rationale"]
        rec.missing_information = eval_result["missing_information"]
        rec.safety_override_triggered = winner["is_safety_override"]
        rec.human_review_required = eval_result["human_review_required"]
        rec.required_tests = "; ".join(eval_result["required_tests"])
        rec.generated_at = now

    # Update ReturnItem header state
    return_item.status = "Evaluated"
    return_item.needs_human_review = eval_result["human_review_required"]

    db.commit()

    return EvaluateDecisionResponse(
        return_id=return_id,
        ranked_pathways=[PathwayEvaluationItem(**p) for p in eval_result["ranked_pathways"]],
        winner=PathwayEvaluationItem(**winner),
        runner_up=PathwayEvaluationItem(**eval_result["runner_up"]) if eval_result["runner_up"] else None,
        human_review_required=eval_result["human_review_required"],
        required_tests=eval_result["required_tests"],
        winner_rationale=eval_result["winner_rationale"],
        fallback_rationale=eval_result["fallback_rationale"],
        missing_information=eval_result["missing_information"],
        confidence_breakdown=ConfidenceBreakdown(**eval_result["confidence_breakdown"]),
        components=eval_result["components"],
        environmental_impact=EnvironmentalImpact(**eval_result["environmental_impact"]),
        honesty_notice="Sample assumption data. Confidence metrics illustrative of trained detector output."
    )


@router.get("/{return_id}/report", response_model=RecommendationReportResponse)
def get_recommendation_report(return_id: str, db: Session = Depends(get_db)):
    """
    Step 7: Explainable Recommendation Report.
    Returns full decision rationale, visual inspection breakdown, functional test checklist,
    comparative pathways bar chart data, confidence breakdown, and printable report payload.
    """
    return_item, product, msrp, weight_kg, category, defects, functional_tests, is_blurry, blur_score, inspection, test = _gather_context(return_id, db)

    eval_result = evaluate_five_pathways(
        product_msrp=msrp,
        product_weight_kg=weight_kg,
        category=category,
        defects=defects,
        functional_tests=functional_tests,
        is_blurry=is_blurry,
        blur_score=blur_score,
    )

    winner = eval_result["winner"]
    now = datetime.utcnow()

    prod_name = f"{product.brand} {product.model}" if product else "Electronic Device"

    return RecommendationReportResponse(
        return_id=return_id,
        product_name=prod_name,
        category=category,
        brand=product.brand if product else "Unknown",
        model=product.model if product else "Unknown",
        purchase_price=msrp,
        age_months=return_item.age_months,
        warranty_status=return_item.warranty_status or "Active",
        customer_issue=return_item.customer_issue or "Cosmetic return",
        inspection_summary={
            "image_url": inspection.image_url if inspection else "/api/inspections/image/laptop_cracked_screen.jpg",
            "is_blurry": is_blurry,
            "blur_score": blur_score,
            "defects_detected": len(defects),
            "defects": defects,
        },
        functional_tests=functional_tests,
        ranked_pathways=[PathwayEvaluationItem(**p) for p in eval_result["ranked_pathways"]],
        winner=PathwayEvaluationItem(**winner),
        winner_rationale=eval_result["winner_rationale"],
        fallback_rationale=eval_result["fallback_rationale"],
        confidence_breakdown=ConfidenceBreakdown(**eval_result["confidence_breakdown"]),
        environmental_impact=EnvironmentalImpact(**eval_result["environmental_impact"]),
        qr_code_data_url=return_item.qr_code_data,
        generated_at=now.strftime("%Y-%m-%d %H:%M:%S")
    )


@router.post("/{return_id}/resolve-review")
def resolve_human_review(
    return_id: str,
    payload: ResolveReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Resolves human review routing after technician performs manual bench tests or overrides pathway.
    """
    return_item = db.query(ReturnItem).filter(ReturnItem.id == return_id).first()
    if not return_item:
        raise HTTPException(status_code=404, detail=f"Return {return_id} not found")

    return_item.needs_human_review = False
    return_item.status = "Review Resolved"

    rec = db.query(Recommendation).filter(Recommendation.return_id == return_id).first()
    if rec:
        rec.human_review_required = False
        if payload.pathway:
            rec.recommended_pathway = payload.pathway
            rec.winner_rationale = f"Technician Manual Override to {payload.pathway}. Notes: {payload.notes or 'Diagnostic confirmed by human expert'}"

    db.commit()

    return {
        "success": True,
        "return_id": return_id,
        "status": "Review Resolved",
        "recommended_pathway": rec.recommended_pathway if rec else "Repair",
        "resolved_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }
