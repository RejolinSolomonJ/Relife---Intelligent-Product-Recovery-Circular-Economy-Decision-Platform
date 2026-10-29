export type DateRange = '7d' | '30d' | 'all';

export interface KPIs {
  total_returns: number;
  total_returns_change_pct: number;
  recovery_rate_pct: number;
  recovery_rate_change_pct: number;
  value_recovered_inr: number;
  value_recovered_change_pct: number;
  waste_diverted_kg: number;
  waste_diverted_change_pct: number;
  awaiting_human_review: number;
  awaiting_human_review_change: number;
}

export interface PathwayDistributionItem {
  name: 'Resale' | 'Repair' | 'Refurbish' | 'Harvest' | 'Recycle';
  count: number;
  percentage: number;
  color: string;
}

export interface ValueOverTimePoint {
  date: string;
  daily_value_inr: number;
  cumulative_value_inr: number;
  returns_count: number;
}

export interface DefectCategoryItem {
  category: string;
  count: number;
  percentage: number;
}

export interface PredictedVsActualItem {
  pathway: string;
  predicted_value: number;
  actual_value: number;
  count: number;
}

export type ReturnStatus = 'Recovered' | 'In progress' | 'Needs human review';

export interface RecentReturnItem {
  id: string;
  product_id: string;
  brand_model: string;
  category: string;
  defect_summary: string;
  recommended_pathway: string;
  confidence: number;
  status: ReturnStatus;
  received_date: string;
}

export interface HumanReviewItem {
  id: string;
  return_id: string;
  product_name: string;
  category: string;
  reason: string;
  defect_confidence: number;
  recommended_pathway: string;
  required_test: string;
  received_date: string;
}

export interface ProductItem {
  id: string;
  brand: string;
  model: string;
  category: string;
  msrp_inr: number;
  weight_kg: number;
}

export interface CreateReturnPayload {
  product_id: string;
  return_reason: string;
  defect_category: string;
  defect_severity: string;
  defect_description: string;
  needs_human_review: boolean;
  review_reason?: string;
  required_test?: string;
}

export interface ResolveReviewPayload {
  action: string;
  pathway?: string;
  notes?: string;
}

export interface DashboardResponse {
  date_range: DateRange;
  is_sample_data: boolean;
  kpis: KPIs;
  pathway_distribution: PathwayDistributionItem[];
  value_over_time: ValueOverTimePoint[];
  common_defects: DefectCategoryItem[];
  predicted_vs_actual: PredictedVsActualItem[];
  recent_returns: RecentReturnItem[];
  human_review_queue: HumanReviewItem[];
}

// -------------------------------------------------------------
// STEP 1 - 7 WIZARD TYPES
// -------------------------------------------------------------

export interface RegisterProductPayload {
  brand: string;
  model: string;
  category: string;
  purchase_price: number;
  age_months: number;
  return_reason: string;
  warranty_status: string;
  customer_reported_issue: string;
}

export interface RegisterProductResponse {
  return_id: string;
  product_id: string;
  brand: string;
  model: string;
  category: string;
  purchase_price: number;
  age_months: number;
  qr_code_data_url: string;
  passport_url: string;
  created_at: string;
}

export interface DefectDetectionItem {
  defect_type: string;
  severity: string;
  confidence: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  description: string;
  is_simulated: boolean;
}

export interface ImageInspectionResponse {
  inspection_id: number;
  return_id: string;
  image_count: number;
  is_blurry: boolean;
  blur_score: number;
  quality_flag: string;
  demo_mode_badge: string;
  detected_category?: string;
  detected_product_label?: string;
  category_confidence?: number;
  detection_method?: string;
  model_version?: string;
  defects: DefectDetectionItem[];
  honesty_notice: string;
  inspected_at: string;
}

export interface SampleImageItem {
  id: string;
  filename: string;
  title: string;
  description: string;
  expected_defect: string;
  severity: string;
  url: string;
}

export interface FunctionalTestPayload {
  powers_on: string;
  display_ok: string;
  battery_health_pct: number;
  battery_test: string;
  motherboard_ok: string;
  ram_ok: string;
  storage_ok: string;
  ports_ok: string;
  notes?: string;
}

export interface FunctionalTestResponse {
  success: boolean;
  return_id: string;
  condition_score: number;
  has_unknown_test: boolean;
  tested_at: string;
}

export interface PathwayEvaluationItem {
  pathway: string;
  rank: number;
  net_recovery_value: number;
  expected_revenue: number;
  expected_cost: number;
  recovery_time_days: number;
  risk_score: number;
  environmental_score: number;
  weighted_score: number;
  is_safety_override: boolean;
  override_reason?: string;
  cost_breakdown: Record<string, number>;
}

export interface ObjectiveWeights {
  profit: number;
  environment: number;
  speed: number;
  risk: number;
}

export interface ConfidenceBreakdown {
  detection_confidence: number;
  condition_confidence: number;
  overall_recommendation_confidence: number;
}

export interface EnvironmentalImpact {
  waste_diverted_kg: number;
  co2e_avoided_kg: number;
  lifetime_extension_months: number;
}

export interface EvaluateDecisionResponse {
  return_id: string;
  ranked_pathways: PathwayEvaluationItem[];
  winner: PathwayEvaluationItem;
  runner_up?: PathwayEvaluationItem;
  human_review_required: boolean;
  required_tests: string[];
  winner_rationale: string;
  fallback_rationale: string;
  missing_information: string;
  confidence_breakdown: ConfidenceBreakdown;
  components: Record<string, any>;
  environmental_impact: EnvironmentalImpact;
  honesty_notice: string;
}

export interface RecommendationReportResponse {
  return_id: string;
  product_name: string;
  category: string;
  brand: string;
  model: string;
  purchase_price: number;
  age_months: number;
  warranty_status: string;
  customer_issue: string;
  inspection_summary: {
    image_url: string;
    is_blurry: boolean;
    blur_score: number;
    defects_detected: number;
    defects: DefectDetectionItem[];
  };
  functional_tests: Record<string, any>;
  ranked_pathways: PathwayEvaluationItem[];
  winner: PathwayEvaluationItem;
  winner_rationale: string;
  fallback_rationale: string;
  confidence_breakdown: ConfidenceBreakdown;
  environmental_impact: EnvironmentalImpact;
  qr_code_data_url?: string;
  generated_at: string;
}


// Step 8: Component Marketplace Interfaces
export interface BuyerInfo {
  id: number;
  name: string;
  buyer_type: string;
  target_components: string;
  min_condition: string;
  bid_price_factor: number;
  demand_rating: string;
  location: string;
}

export interface ComponentCardItem {
  id: number;
  return_id: string;
  product_name: string;
  category: string;
  component_type: string;
  condition: string;
  estimated_value: number;
  indicative_revenue: number;
  is_harvested: boolean;
  matched_buyer?: BuyerInfo;
  match_score: number;
  sample_assumption_note: string;
}

// Step 9: Closed-Loop Outcome Tracking Interfaces
export interface OutcomeRecordItem {
  id: number;
  return_id: string;
  product_name: string;
  category: string;
  predicted_pathway: string;
  actual_pathway: string;
  predicted_revenue: number;
  actual_revenue: number;
  predicted_cost: number;
  actual_cost: number;
  predicted_net_value: number;
  actual_net_value: number;
  actual_time_days: number;
  waste_diverted_kg: number;
  completed_at: string;
  notes?: string;
  revenue_variance_pct: number;
  cost_variance_pct: number;
}

export interface OutcomesSummary {
  total_realized_revenue: number;
  total_realized_cost: number;
  total_net_value: number;
  total_waste_diverted_kg: number;
  avg_accuracy_pct: number;
  outcomes: OutcomeRecordItem[];
}

export interface RecordOutcomePayload {
  return_id: string;
  actual_pathway: string;
  actual_revenue: number;
  actual_cost: number;
  actual_time_days: number;
  waste_diverted_kg?: number;
  notes?: string;
}
