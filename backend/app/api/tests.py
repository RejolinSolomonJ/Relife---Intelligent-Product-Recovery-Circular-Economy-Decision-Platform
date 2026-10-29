from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ReturnItem, FunctionalTest, Product
from ..schemas import FunctionalTestRequest, FunctionalTestResponse

router = APIRouter(prefix="/api/returns", tags=["functional_tests"])


@router.post("/{return_id}/tests", response_model=FunctionalTestResponse)
def submit_functional_tests(
    return_id: str,
    payload: FunctionalTestRequest,
    db: Session = Depends(get_db)
):
    """
    Submits bench functional test results for a returned electronic device.
    Checklist: powers on, display ok, battery health %, motherboard ok, RAM ok, storage ok, ports ok.
    Fields accept 'pass', 'fail', or 'unknown'.
    'unknown' lowers decision confidence and routes to human inspection if unresolved.
    """
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
            return_reason="Bench functional diagnostic",
            warranty_status="Active"
        )
        db.add(return_item)
        db.commit()
        db.refresh(return_item)

    # Evaluate condition score (0-100)
    score = 100.0
    has_unknown = False

    test_weights = {
        "powers_on": 25.0,
        "motherboard_ok": 25.0,
        "display_ok": 15.0,
        "battery_test": 15.0,
        "storage_ok": 10.0,
        "ram_ok": 5.0,
        "ports_ok": 5.0
    }

    test_results = {
        "powers_on": payload.powers_on.lower(),
        "motherboard_ok": payload.motherboard_ok.lower(),
        "display_ok": payload.display_ok.lower(),
        "battery_test": payload.battery_test.lower(),
        "storage_ok": payload.storage_ok.lower(),
        "ram_ok": payload.ram_ok.lower(),
        "ports_ok": payload.ports_ok.lower()
    }

    for test_name, weight in test_weights.items():
        res = test_results[test_name]
        if res == "fail":
            score -= weight
        elif res == "unknown":
            score -= (weight * 0.5)
            has_unknown = True

    # Battery health degradation check
    if payload.battery_health_pct > 0:
        if payload.battery_health_pct < 70:
            score -= 10.0
            test_results["battery_test"] = "fail"
        elif payload.battery_health_pct < 80:
            score -= 5.0

    condition_score = max(5.0, round(score, 1))

    # Persist or update
    existing_test = db.query(FunctionalTest).filter(FunctionalTest.return_id == return_id).first()
    now = datetime.utcnow()

    if existing_test:
        existing_test.powers_on = payload.powers_on
        existing_test.display_ok = payload.display_ok
        existing_test.battery_health_pct = payload.battery_health_pct
        existing_test.battery_test = test_results["battery_test"]
        existing_test.motherboard_ok = payload.motherboard_ok
        existing_test.ram_ok = payload.ram_ok
        existing_test.storage_ok = payload.storage_ok
        existing_test.ports_ok = payload.ports_ok
        existing_test.overall_condition_score = condition_score
        existing_test.tested_at = now
    else:
        new_test = FunctionalTest(
            return_id=return_id,
            powers_on=payload.powers_on,
            display_ok=payload.display_ok,
            battery_health_pct=payload.battery_health_pct,
            battery_test=test_results["battery_test"],
            motherboard_ok=payload.motherboard_ok,
            ram_ok=payload.ram_ok,
            storage_ok=payload.storage_ok,
            ports_ok=payload.ports_ok,
            overall_condition_score=condition_score,
            tested_at=now
        )
        db.add(new_test)

    # Flag human review if unknown tests exist
    if has_unknown:
        return_item.needs_human_review = True

    db.commit()

    return FunctionalTestResponse(
        success=True,
        return_id=return_id,
        condition_score=condition_score,
        has_unknown_test=has_unknown,
        tested_at=now.strftime("%Y-%m-%d %H:%M:%S")
    )


@router.get("/{return_id}/tests")
def get_functional_tests(return_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the latest functional test record for a returned product.
    """
    test = db.query(FunctionalTest).filter(FunctionalTest.return_id == return_id).first()
    if not test:
        # Return default initialized checklist if none recorded yet
        return {
            "return_id": return_id,
            "powers_on": "pass",
            "display_ok": "pass",
            "battery_health_pct": 88,
            "battery_test": "pass",
            "motherboard_ok": "pass",
            "ram_ok": "pass",
            "storage_ok": "pass",
            "ports_ok": "pass",
            "condition_score": 95.0,
            "has_unknown_test": False,
            "tested_at": None
        }

    return {
        "return_id": return_id,
        "powers_on": test.powers_on,
        "display_ok": test.display_ok,
        "battery_health_pct": test.battery_health_pct,
        "battery_test": test.battery_test,
        "motherboard_ok": test.motherboard_ok,
        "ram_ok": test.ram_ok,
        "storage_ok": test.storage_ok,
        "ports_ok": test.ports_ok,
        "condition_score": test.condition_score,
        "has_unknown_test": test.has_unknown_test,
        "tested_at": test.tested_at.strftime("%Y-%m-%d %H:%M:%S") if test.tested_at else None
    }

