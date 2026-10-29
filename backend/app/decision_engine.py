"""
ReLife AI - Five-Pathway Circular Decision Engine
Evaluates: Direct Resale, Repair, Refurbishment, Component Harvesting, Recycling.
Incorporates:
- Cost & Revenue estimation (parts, labor, testing, cleaning, transport)
- Multi-criteria weighted scoring (Profit, Environment, Speed, Risk)
- Absolute safety & quality override constraints
- Human review routing triggers
- Explainable rationale & confidence breakdowns
"""

from typing import Dict, List, Any, Optional
from .pricing_data import (
    COMPONENT_VALUE_RATIOS,
    PATHWAY_OPERATIONAL_COSTS,
    DEFECT_PART_COSTS,
    ENVIRONMENTAL_FACTORS,
)


def evaluate_five_pathways(
    product_msrp: float,
    product_weight_kg: float,
    category: str,
    defects: List[Dict[str, Any]],
    functional_tests: Dict[str, Any],
    is_blurry: bool = False,
    blur_score: float = 150.0,
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Core mathematical decision engine evaluating all 5 recovery pathways.
    """
    if weights is None:
        weights = {"profit": 40.0, "environment": 30.0, "speed": 15.0, "risk": 15.0}

    # Normalize weights so they sum to 1.0
    total_w = sum(weights.values()) or 100.0
    w_profit = weights.get("profit", 40.0) / total_w
    w_eco = weights.get("environment", 30.0) / total_w
    w_speed = weights.get("speed", 15.0) / total_w
    w_risk = weights.get("risk", 15.0) / total_w

    cat_lower = category.lower()
    if any(k in cat_lower for k in ["cloth", "dress", "textile", "apparel", "garment"]):
        cat_key = "Clothing"
    elif any(k in cat_lower for k in ["mouse", "pointer", "trackball", "peripheral"]):
        cat_key = "Mouse"
    elif any(k in cat_lower for k in ["phone", "mobile", "smartphone"]):
        cat_key = "Smartphone"
    else:
        cat_key = "Laptop"
    is_apparel = any(k in category.lower() for k in ["cloth", "dress", "textile", "apparel", "garment", "fabric", "fashion", "linen", "cotton"]) or any(d.get("defect_type") in ["stain", "tear"] for d in defects)

    # Analyze defects
    has_crack = any(d.get("defect_type") == "crack" for d in defects)
    has_dent = any(d.get("defect_type") == "dent" for d in defects)
    has_scratch = any(d.get("defect_type") == "scratch" for d in defects)
    has_missing_part = any(d.get("defect_type") == "missing part" for d in defects)
    has_stain = any(d.get("defect_type") == "stain" for d in defects)
    has_tear = any(d.get("defect_type") == "tear" for d in defects)
    min_defect_conf = min([d.get("confidence", 90.0) for d in defects], default=90.0)

    # Analyze functional tests
    powers_on = functional_tests.get("powers_on", "pass")
    display_ok = functional_tests.get("display_ok", "pass")
    battery_test = functional_tests.get("battery_test", "pass")
    battery_health = functional_tests.get("battery_health_pct", 85)
    motherboard_ok = functional_tests.get("motherboard_ok", "pass")
    ram_ok = functional_tests.get("ram_ok", "pass")
    storage_ok = functional_tests.get("storage_ok", "pass")

    has_unknown_test = any(
        v == "unknown" for v in [powers_on, display_ok, battery_test, motherboard_ok, ram_ok, storage_ok]
    )

    # 1. Estimate Parts Cost for Repair & Refurbishment
    parts_cost_sum = 0.0
    for d in defects:
        dtype = d.get("defect_type", "scratch")
        cost = DEFECT_PART_COSTS.get(cat_key, {}).get(dtype, 1500.0)
        parts_cost_sum += cost

    if battery_health < 75 or battery_test == "fail":
        parts_cost_sum += DEFECT_PART_COSTS.get(cat_key, {}).get("battery fault", 3000.0)
    if display_ok == "fail" and not has_crack:
        parts_cost_sum += DEFECT_PART_COSTS.get(cat_key, {}).get("crack", 7500.0)

    # 2. Estimate Component Harvesting Value
    component_values = {}
    ratios = COMPONENT_VALUE_RATIOS.get(cat_key, COMPONENT_VALUE_RATIOS["Laptop"])
    for comp, ratio in ratios.items():
        # Degrade value if component failed functional test
        cond = "Grade A"
        val = product_msrp * ratio * 0.85
        if comp == "display" and (has_crack or display_ok == "fail"):
            cond = "Defective"
            val = 0.0
        elif comp == "battery" and (battery_test == "fail" or battery_health < 70):
            cond = "Defective"
            val = 0.0
        elif comp == "motherboard" and motherboard_ok == "fail":
            cond = "Defective"
            val = 0.0
        elif comp == "ram" and ram_ok == "fail":
            cond = "Defective"
            val = 0.0
        elif comp == "storage" and storage_ok == "fail":
            cond = "Defective"
            val = 0.0

        component_values[comp] = {"condition": cond, "value": round(val, 2)}

    harvest_total_revenue = sum(c["value"] for c in component_values.values())

    # 3. Evaluate Each Pathway
    pathways_eval = []

    # -------------------------------------------------------------
    # Pathway 1: Direct Resale
    # -------------------------------------------------------------
    resale_rev = product_msrp * 0.76
    resale_ops = PATHWAY_OPERATIONAL_COSTS["Direct Resale"]
    resale_total_cost = sum(resale_ops.values())
    resale_nrv = resale_rev - resale_total_cost
    resale_time = 1  # 1 day
    resale_risk = 12.0
    resale_eco = 95.0

    # Safety & Quality Check for Resale
    resale_override = False
    resale_override_reason = None
    if is_apparel and (has_stain or has_tear):
        resale_override = True
        resale_override_reason = "Fabric stain or structural tear violates pre-owned Grade A resale standards."
    elif has_crack or display_ok == "fail":
        resale_override = True
        resale_override_reason = "Display damaged or cracked. Direct resale disqualified."
    elif battery_test == "fail" or (isinstance(battery_health, (int, float)) and battery_health > 0 and battery_health < 70):
        resale_override = True
        resale_override_reason = "Battery health < 70% or battery test failed. Resale is a safety hazard."
    elif powers_on != "pass" or motherboard_ok != "pass":
        resale_override = True
        resale_override_reason = "Power or motherboard fault detected. Device inoperable."
    elif has_dent:
        resale_override = True
        resale_override_reason = "Structural chassis dent violates Grade A certified resale criteria."

    pathways_eval.append({
        "pathway": "Direct Resale",
        "expected_revenue": round(resale_rev, 2),
        "expected_cost": round(resale_total_cost, 2),
        "net_recovery_value": round(resale_nrv, 2),
        "recovery_time_days": resale_time,
        "risk_score": resale_risk,
        "environmental_score": resale_eco,
        "is_safety_override": resale_override,
        "override_reason": resale_override_reason,
        "cost_breakdown": {**resale_ops, "parts_cost": 0.0, "total_cost": round(resale_total_cost, 2)},
    })

    # -------------------------------------------------------------
    # Pathway 2: Repair
    # -------------------------------------------------------------
    repair_rev = product_msrp * 0.65
    repair_ops = PATHWAY_OPERATIONAL_COSTS["Repair"]
    repair_parts = parts_cost_sum if parts_cost_sum > 0 else 2500.0
    repair_total_cost = sum(repair_ops.values()) + repair_parts
    repair_nrv = repair_rev - repair_total_cost
    repair_time = 3  # 3 days
    repair_risk = 22.0
    repair_eco = 88.0

    repair_override = False
    repair_override_reason = None
    if is_apparel and (has_stain or has_tear):
        repair_override = True
        repair_override_reason = "Restoration cost (specialized chemical stain stripping & re-weaving) exceeds pre-owned garment MSRP."
    elif repair_total_cost > (product_msrp * 0.65):
        repair_override = True
        repair_override_reason = "Cumulative repair cost exceeds 65% of device MSRP (uneconomical repair)."
    elif motherboard_ok == "fail" and powers_on == "fail":
        repair_override = True
        repair_override_reason = "Motherboard unrecoverable with standard module swap."

    pathways_eval.append({
        "pathway": "Repair",
        "expected_revenue": round(repair_rev, 2),
        "expected_cost": round(repair_total_cost, 2),
        "net_recovery_value": round(repair_nrv, 2),
        "recovery_time_days": repair_time,
        "risk_score": repair_risk,
        "environmental_score": repair_eco,
        "is_safety_override": repair_override,
        "override_reason": repair_override_reason,
        "cost_breakdown": {**repair_ops, "parts_cost": round(repair_parts, 2), "total_cost": round(repair_total_cost, 2)},
    })

    # -------------------------------------------------------------
    # Pathway 3: Refurbishment
    # -------------------------------------------------------------
    refurb_rev = product_msrp * 0.55
    refurb_ops = PATHWAY_OPERATIONAL_COSTS["Refurbishment"]
    refurb_parts = parts_cost_sum * 1.25  # complete cosmetic & cell renewal
    refurb_total_cost = sum(refurb_ops.values()) + refurb_parts
    refurb_nrv = refurb_rev - refurb_total_cost
    refurb_time = 5  # 5 days
    refurb_risk = 28.0
    refurb_eco = 85.0

    refurb_override = False
    refurb_override_reason = None
    if is_apparel and (has_stain or has_tear):
        refurb_override = True
        refurb_override_reason = "Extensive textile fiber contamination prevents commercial upcycling."
    elif refurb_total_cost > (product_msrp * 0.70):
        refurb_override = True
        refurb_override_reason = "Refurbishment bill of materials exceeds secondary market realization."

    pathways_eval.append({
        "pathway": "Refurbishment",
        "expected_revenue": round(refurb_rev, 2),
        "expected_cost": round(refurb_total_cost, 2),
        "net_recovery_value": round(refurb_nrv, 2),
        "recovery_time_days": refurb_time,
        "risk_score": refurb_risk,
        "environmental_score": refurb_eco,
        "is_safety_override": refurb_override,
        "override_reason": refurb_override_reason,
        "cost_breakdown": {**refurb_ops, "parts_cost": round(refurb_parts, 2), "total_cost": round(refurb_total_cost, 2)},
    })

    # -------------------------------------------------------------
    # Pathway 4: Component Harvesting
    # -------------------------------------------------------------
    harvest_rev = harvest_total_revenue
    harvest_ops = PATHWAY_OPERATIONAL_COSTS["Component Harvesting"]
    harvest_total_cost = sum(harvest_ops.values())
    harvest_nrv = harvest_rev - harvest_total_cost
    harvest_time = 2  # 2 days
    harvest_risk = 18.0
    harvest_eco = 74.0

    harvest_override = False
    harvest_override_reason = None
    if is_apparel and (has_stain or has_tear):
        harvest_override = True
        harvest_override_reason = "Contaminated textile fabric; button/zipper component harvesting yields uneconomical return."
    elif harvest_rev < 1500.0:
        harvest_override = True
        harvest_override_reason = "All major internal sub-assemblies defective or zero market yield."

    pathways_eval.append({
        "pathway": "Component Harvesting",
        "expected_revenue": round(harvest_rev, 2),
        "expected_cost": round(harvest_total_cost, 2),
        "net_recovery_value": round(harvest_nrv, 2),
        "recovery_time_days": harvest_time,
        "risk_score": harvest_risk,
        "environmental_score": harvest_eco,
        "is_safety_override": harvest_override,
        "override_reason": harvest_override_reason,
        "cost_breakdown": {**harvest_ops, "parts_cost": 0.0, "total_cost": round(harvest_total_cost, 2)},
    })

    # -------------------------------------------------------------
    # Pathway 5: Recycling
    # -------------------------------------------------------------
    if is_apparel:
        recycle_rev = max(450.0, product_weight_kg * 400.0 + 350.0)
        recycle_ops = {"cleaning_cost": 50.0, "testing_cost": 40.0, "handling_cost": 60.0, "storage_cost": 30.0, "transport_cost": 50.0}
        recycle_total_cost = sum(recycle_ops.values())
        recycle_nrv = max(220.0, recycle_rev - recycle_total_cost)
        recycle_time = 1  # 1 day
        recycle_risk = 5.0
        recycle_eco = 98.0  # 98% circular textile diversion
    else:
        recycle_rev = product_weight_kg * 450.0  # ₹450 per kg in precious metals scrap
        recycle_ops = PATHWAY_OPERATIONAL_COSTS["Recycling"]
        recycle_total_cost = sum(recycle_ops.values())
        recycle_nrv = recycle_rev - recycle_total_cost
        recycle_time = 1  # 1 day
        recycle_risk = 5.0
        recycle_eco = 60.0

    pathways_eval.append({
        "pathway": "Recycling",
        "expected_revenue": round(recycle_rev, 2),
        "expected_cost": round(recycle_total_cost, 2),
        "net_recovery_value": round(recycle_nrv, 2),
        "recovery_time_days": recycle_time,
        "risk_score": recycle_risk,
        "environmental_score": recycle_eco,
        "is_safety_override": False,
        "override_reason": None,
        "cost_breakdown": {**recycle_ops, "parts_cost": 0.0, "total_cost": round(recycle_total_cost, 2)},
    })

    # 4. Compute Normalized Weighted Scores
    max_nrv = max([p["net_recovery_value"] for p in pathways_eval], default=1.0)
    min_nrv = min([p["net_recovery_value"] for p in pathways_eval], default=0.0)
    nrv_range = max(1.0, max_nrv - min_nrv)

    for p in pathways_eval:
        if p["is_safety_override"]:
            p["weighted_score"] = 0.0
        else:
            norm_profit = ((p["net_recovery_value"] - min_nrv) / nrv_range) * 100.0
            norm_eco = p["environmental_score"]
            norm_speed = max(0.0, (1.0 - (p["recovery_time_days"] / 7.0))) * 100.0
            norm_risk = 100.0 - p["risk_score"]

            score = (
                (w_profit * norm_profit) +
                (w_eco * norm_eco) +
                (w_speed * norm_speed) +
                (w_risk * norm_risk)
            )
            p["weighted_score"] = round(score, 1)

    # Sort pathways descending by weighted score
    ranked_pathways = sorted(pathways_eval, key=lambda x: x["weighted_score"], reverse=True)
    for idx, p in enumerate(ranked_pathways, 1):
        p["rank"] = idx

    winner = ranked_pathways[0]
    runner_up = ranked_pathways[1] if len(ranked_pathways) > 1 else None

    # 5. Determine Human Review Routing Triggers
    human_review_required = False
    required_tests = []

    if is_blurry or blur_score < 100.0:
        human_review_required = True
        required_tests.append("Re-capture optical photos with stabilized lighting (Laplacian variance < 100)")

    if min_defect_conf < 70.0:
        human_review_required = True
        required_tests.append("Perform manual optical microscope inspection on low-confidence defect areas")

    if has_unknown_test:
        human_review_required = True
        unknown_fields = [k for k, v in functional_tests.items() if v == "unknown"]
        required_tests.append(f"Execute bench diagnostic for unknown tests: {', '.join(unknown_fields)}")

    if runner_up and not winner["is_safety_override"] and not runner_up["is_safety_override"]:
        score_diff = abs(winner["weighted_score"] - runner_up["weighted_score"])
        if score_diff < 4.0:
            human_review_required = True
            required_tests.append(
                f"Close margin between {winner['pathway']} and {runner_up['pathway']} (delta: {round(score_diff, 1)} pts). Confirm manual condition grading."
            )

    # 6. Generate Explainable Rationales
    winner_name = winner["pathway"]
    if winner_name == "Repair":
        winner_rationale = (
            f"Repair is recommended because the device has isolated modular defects (estimated repair cost: ₹{winner['cost_breakdown']['parts_cost']:,}). "
            f"After parts and labor, it yields an optimal Net Recovery Value of ₹{winner['net_recovery_value']:,} with an 88% environmental salvage score."
        )
    elif winner_name == "Component Harvesting":
        winner_rationale = (
            f"Component Harvesting is recommended because cumulative unit repair exceeds secondary market return, "
            f"yet high-value sub-assemblies (viable display/motherboard/RAM) provide a net recovery value of ₹{winner['net_recovery_value']:,}."
        )
    elif winner_name == "Direct Resale":
        winner_rationale = (
            f"Direct Resale is the optimal pathway. The product passed all visual and electrical tests with Grade A casing, "
            f"delivering maximum net realization of ₹{winner['net_recovery_value']:,} in 1 business day."
        )
    elif winner_name == "Refurbishment":
        winner_rationale = (
            f"Refurbishment is recommended for multi-surface wear. Complete re-casing and cycle renewal unlocks certified pre-owned value of ₹{winner['net_recovery_value']:,}."
        )
    else:
        if is_apparel:
            winner_rationale = (
                "Whole-Material Circular Textile Recycling is strongly recommended. The garment has severe stain/tear damage "
                "rendering resale, repair, and refurbishment uneconomical. Diverting the entire material to mechanical fiber shredding "
                "recovers circular spun yarn, preventing 100% of textile waste from landfills with an environmental score of 98/100."
            )
        else:
            winner_rationale = (
                "Recycling is recommended due to unrecoverable electrical faults and high parts cost. Certified smelting ensures zero hazardous landfill discharge."
            )

    fallback_rationale = []
    for p in ranked_pathways[1:]:
        if p["is_safety_override"]:
            fallback_rationale.append(f"• {p['pathway']}: Disqualified due to safety constraint ({p['override_reason']}).")
        else:
            diff_inr = winner["net_recovery_value"] - p["net_recovery_value"]
            fallback_rationale.append(
                f"• {p['pathway']}: Lower overall score ({p['weighted_score']} pts). Generated ₹{abs(round(diff_inr, 0)):,} less net value than {winner_name}."
            )

    # Confidence ratings
    detection_conf = round(min_defect_conf, 1)
    condition_conf = 55.0 if has_unknown_test else 92.0
    rec_conf = round((detection_conf * 0.4 + condition_conf * 0.6), 1)

    return {
        "ranked_pathways": ranked_pathways,
        "winner": winner,
        "runner_up": runner_up,
        "human_review_required": human_review_required,
        "required_tests": required_tests,
        "winner_rationale": winner_rationale,
        "fallback_rationale": "\n".join(fallback_rationale),
        "missing_information": "Some functional tests are unknown, lowering recommendation confidence." if has_unknown_test else "All required visual and functional tests are verified.",
        "confidence_breakdown": {
            "detection_confidence": detection_conf,
            "condition_confidence": condition_conf,
            "overall_recommendation_confidence": rec_conf,
        },
        "components": component_values,
        "environmental_impact": {
            "waste_diverted_kg": round(product_weight_kg * ENVIRONMENTAL_FACTORS["waste_diverted_ratio"].get(winner_name, 0.85), 3),
            "co2e_avoided_kg": round(product_weight_kg * ENVIRONMENTAL_FACTORS["co2e_saved_per_kg"], 1),
            "lifetime_extension_months": ENVIRONMENTAL_FACTORS["lifetime_extension_months"].get(winner_name, 12),
        }
    }

