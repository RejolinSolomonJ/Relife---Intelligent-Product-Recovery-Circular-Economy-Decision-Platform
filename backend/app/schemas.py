from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class KPIs(BaseModel):
    total_returns: int
    total_returns_change_pct: float
    recovery_rate_pct: float
    recovery_rate_change_pct: float
    value_recovered_inr: float
    value_recovered_change_pct: float
    waste_diverted_kg: float
    waste_diverted_change_pct: float
    awaiting_human_review: int
    awaiting_human_review_change: int


class PathwayDistributionItem(BaseModel):
    name: str
    count: int
    percentage: float
    color: str


class ValueOverTimePoint(BaseModel):
    date: str
    daily_value_inr: float
    cumulative_value_inr: float
    returns_count: int


class DefectCategoryItem(BaseModel):
    category: str
    count: int
    percentage: float


class PredictedVsActualItem(BaseModel):
    pathway: str
    predicted_value: float
    actual_value: float
    count: int


class RecentReturnItem(BaseModel):
    id: str
    product_id: str
    brand_model: str
    category: str
    defect_summary: str
    recommended_pathway: str
    confidence: float
    status: str
    received_date: str


class HumanReviewItem(BaseModel):
    id: str
    return_id: str
    product_name: str
    category: str
    reason: str
    defect_confidence: float
    recommended_pathway: str
    required_test: str
    received_date: str


class DashboardResponse(BaseModel):
    date_range: str
    is_sample_data: bool = True
    kpis: KPIs
    pathway_distribution: List[PathwayDistributionItem]
    value_over_time: List[ValueOverTimePoint]
    common_defects: List[DefectCategoryItem]
    predicted_vs_actual: List[PredictedVsActualItem]
    recent_returns: List[RecentReturnItem]
    human_review_queue: List[HumanReviewItem]


class ProductItem(BaseModel):
    id: str
    brand: str
    model: str
    category: str
    msrp_inr: float
    weight_kg: float
    release_year: Optional[int] = 2024
    specs: Optional[str] = None


class CreateReturnRequest(BaseModel):
    product_id: str
    return_reason: str = "Customer return"
    needs_human_review: bool = False
    review_reason: Optional[str] = None
    required_test: Optional[str] = None
    defect_category: str = "scratch"
    defect_severity: str = "minor"
    defect_description: str = "Surface hairline blemish"


# -------------------------------------------------------------
# STEP 1: Registration Schemas
# -------------------------------------------------------------
class RegisterProductRequest(BaseModel):
    brand: str
    model: str
    category: str = "Laptop"  # Laptop | Smartphone
    purchase_price: float = 85000.0
    age_months: int = 8
    return_reason: str = "Display flickering / cosmetic defect"
    warranty_status: str = "Active"
    customer_reported_issue: str = "Customer reports screen defect after unboxing"


class RegisterProductResponse(BaseModel):
    return_id: str
    product_id: str
    brand: str
    model: str
    category: str
    purchase_price: float
    age_months: int
    qr_code_data_url: str
    passport_url: str
    created_at: str


# -------------------------------------------------------------
# STEP 2: Vision & Defect Detection Schemas
# -------------------------------------------------------------
class DefectDetectionItem(BaseModel):
    defect_type: str  # crack | dent | scratch | missing part
    severity: str     # low | med | high
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    description: str
    is_simulated: bool = True


class ImageInspectionResponse(BaseModel):
    inspection_id: int
    return_id: str
    image_count: int
    is_blurry: bool
    blur_score: float
    quality_flag: str
    demo_mode_badge: str
    defects: List[DefectDetectionItem]
    honesty_notice: str
    inspected_at: str


# -------------------------------------------------------------
# STEP 3: Functional Tests Schemas
# -------------------------------------------------------------
class FunctionalTestRequest(BaseModel):
    powers_on: str = "pass"          # pass | fail | unknown
    display_ok: str = "pass"         # pass | fail | unknown
    battery_health_pct: int = 85     # 0-100 or -1 if unknown
    battery_test: str = "pass"       # pass | fail | unknown
    motherboard_ok: str = "pass"     # pass | fail | unknown
    ram_ok: str = "pass"             # pass | fail | unknown
    storage_ok: str = "pass"         # pass | fail | unknown
    ports_ok: str = "pass"           # pass | fail | unknown
    notes: Optional[str] = "Standard bench diagnostic input"


class FunctionalTestResponse(BaseModel):
    success: bool
    return_id: str
    condition_score: float
    has_unknown_test: bool
    tested_at: str


# -------------------------------------------------------------
# STEP 4 & 5: Cost, Economics & 5-Pathway Decision Schemas
# -------------------------------------------------------------
class CostBreakdownItem(BaseModel):
    parts_cost: float
    labor_cost: float
    testing_cost: float
    cleaning_cost: float
    handling_cost: float
    storage_cost: float
    transport_cost: float
    total_cost: float
    is_confirmed: bool = False


class PathwayEvaluationItem(BaseModel):
    pathway: str
    rank: int
    net_recovery_value: float
    expected_revenue: float
    expected_cost: float
    recovery_time_days: int
    risk_score: float
    environmental_score: float
    weighted_score: float
    is_safety_override: bool
    override_reason: Optional[str] = None
    cost_breakdown: Dict[str, float]


class ObjectiveWeights(BaseModel):
    profit: float = 40.0
    environment: float = 30.0
    speed: float = 15.0
    risk: float = 15.0


class EvaluateDecisionRequest(BaseModel):
    weights: Optional[ObjectiveWeights] = None


class ConfidenceBreakdown(BaseModel):
    detection_confidence: float
    condition_confidence: float
    overall_recommendation_confidence: float


class EnvironmentalImpact(BaseModel):
    waste_diverted_kg: float
    co2e_avoided_kg: float
    lifetime_extension_months: int


class EvaluateDecisionResponse(BaseModel):
    return_id: str
    ranked_pathways: List[PathwayEvaluationItem]
    winner: PathwayEvaluationItem
    runner_up: Optional[PathwayEvaluationItem] = None
    human_review_required: bool
    required_tests: List[str]
    winner_rationale: str
    fallback_rationale: str
    missing_information: str
    confidence_breakdown: ConfidenceBreakdown
    components: Dict[str, Any]
    environmental_impact: EnvironmentalImpact
    honesty_notice: str = "Sample assumption data. Confidence metrics illustrative of trained detector output."


# -------------------------------------------------------------
# STEP 6 & 7: Human Review & Report Schemas
# -------------------------------------------------------------
class ResolveReviewRequest(BaseModel):
    action: str = "pass"  # pass | override
    pathway: Optional[str] = None
    notes: Optional[str] = None


class RecommendationReportResponse(BaseModel):
    return_id: str
    product_name: str
    category: str
    brand: str
    model: str
    purchase_price: float
    age_months: int
    warranty_status: str
    customer_issue: str
    inspection_summary: Dict[str, Any]
    functional_tests: Dict[str, Any]
    ranked_pathways: List[PathwayEvaluationItem]
    winner: PathwayEvaluationItem
    winner_rationale: str
    fallback_rationale: str
    confidence_breakdown: ConfidenceBreakdown
    environmental_impact: EnvironmentalImpact
    qr_code_data_url: Optional[str] = None
    generated_at: str
