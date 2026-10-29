import {
  DashboardResponse,
  DateRange,
  ProductItem,
  CreateReturnPayload,
  ResolveReviewPayload,
  RegisterProductPayload,
  RegisterProductResponse,
  ImageInspectionResponse,
  SampleImageItem,
  FunctionalTestPayload,
  FunctionalTestResponse,
  ObjectiveWeights,
  EvaluateDecisionResponse,
  RecommendationReportResponse,
  BuyerInfo,
  ComponentCardItem,
  OutcomeRecordItem,
  OutcomesSummary,
  RecordOutcomePayload,
  SupplyChainPartner,
  SupplyChainMatchResponse,
  DispatchRequest,
  DispatchResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010';

export async function fetchDashboardData(range: DateRange = '30d'): Promise<DashboardResponse> {
  const url = `${API_BASE_URL}/api/dashboard?range=${range}`;

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    throw error;
  }
}

export async function fetchProducts(): Promise<ProductItem[]> {
  const url = `${API_BASE_URL}/api/products`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function createReturn(payload: CreateReturnPayload): Promise<any> {
  const url = `${API_BASE_URL}/api/returns`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create return: ${res.status}`);
  return await res.json();
}

export async function resolveReview(returnId: string, payload: ResolveReviewPayload): Promise<any> {
  const url = `${API_BASE_URL}/api/returns/${returnId}/resolve`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to resolve review: ${res.status}`);
  return await res.json();
}

export async function runAITriage(): Promise<any> {
  const url = `${API_BASE_URL}/api/triage/run`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to execute AI triage: ${res.status}`);
  return await res.json();
}

// -------------------------------------------------------------
// STEP 1 - 7 WIZARD API CLIENT CALLS
// -------------------------------------------------------------

export async function registerProduct(payload: RegisterProductPayload): Promise<RegisterProductResponse> {
  const url = `${API_BASE_URL}/api/returns/register`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Registration failed: ${res.status}`);
  }
  return await res.json();
}

export async function fetchSampleImages(): Promise<SampleImageItem[]> {
  const url = `${API_BASE_URL}/api/inspections/sample-images`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch sample images: ${res.status}`);
  const data = await res.json();
  return data.samples || [];
}

export async function uploadInspection(formData: FormData): Promise<ImageInspectionResponse> {
  const url = `${API_BASE_URL}/api/inspections/upload`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Inspection upload failed: ${res.status}`);
  }
  return await res.json();
}

export async function submitFunctionalTests(
  returnId: string,
  payload: FunctionalTestPayload
): Promise<FunctionalTestResponse> {
  const url = `${API_BASE_URL}/api/returns/${returnId}/tests`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Functional tests failed: ${res.status}`);
  }
  return await res.json();
}

export async function getFunctionalTests(returnId: string): Promise<any> {
  const url = `${API_BASE_URL}/api/returns/${returnId}/tests`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch tests: ${res.status}`);
  return await res.json();
}

export async function getPathwayEconomics(returnId: string): Promise<any> {
  const url = `${API_BASE_URL}/api/returns/${returnId}/economics`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch economics: ${res.status}`);
  return await res.json();
}

export async function evaluateDecision(
  returnId: string,
  weights?: ObjectiveWeights
): Promise<EvaluateDecisionResponse> {
  const url = `${API_BASE_URL}/api/returns/${returnId}/evaluate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weights ? { weights } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Decision evaluation failed: ${res.status}`);
  }
  return await res.json();
}

export async function getRecommendationReport(returnId: string): Promise<RecommendationReportResponse> {
  const url = `${API_BASE_URL}/api/returns/${returnId}/report`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch report: ${res.status}`);
  return await res.json();
}

export async function resolveHumanReview(
  returnId: string,
  payload: ResolveReviewPayload
): Promise<any> {
  const url = `${API_BASE_URL}/api/returns/${returnId}/resolve-review`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to resolve human review: ${res.status}`);
  }
  return await res.json();
}


// Step 8: Marketplace API Client
export async function fetchMarketplaceComponents(filters?: {
  component_type?: string;
  condition?: string;
  is_harvested?: boolean;
}): Promise<ComponentCardItem[]> {
  const params = new URLSearchParams();
  if (filters?.component_type) params.append('component_type', filters.component_type);
  if (filters?.condition) params.append('condition', filters.condition);
  if (filters?.is_harvested !== undefined) params.append('is_harvested', String(filters.is_harvested));

  const url = `${API_BASE_URL}/api/marketplace/components?${params.toString()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch marketplace components: ${res.status}`);
  return await res.json();
}

export async function fetchMarketplaceBuyers(): Promise<BuyerInfo[]> {
  const url = `${API_BASE_URL}/api/marketplace/buyers`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch marketplace buyers: ${res.status}`);
  return await res.json();
}

export async function allocateComponent(
  componentId: number,
  buyerId: number,
  notes?: string
): Promise<any> {
  const url = `${API_BASE_URL}/api/marketplace/allocate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ component_id: componentId, buyer_id: buyerId, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to allocate component: ${res.status}`);
  }
  return await res.json();
}

// Step 9: Outcomes API Client
export async function fetchOutcomes(): Promise<OutcomesSummary> {
  const url = `${API_BASE_URL}/api/outcomes`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch outcomes: ${res.status}`);
  return await res.json();
}

export async function recordActualOutcome(payload: RecordOutcomePayload): Promise<OutcomeRecordItem> {
  const url = `${API_BASE_URL}/api/outcomes`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to record outcome: ${res.status}`);
  }
  return await res.json();
}

// Storefront & Waitlist API Client
export async function fetchShopListings(params?: {
  category?: string;
  condition?: string;
  listing_type?: string;
  search?: string;
}): Promise<{ listings: any[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.condition) query.append('condition', params.condition);
  if (params?.listing_type) query.append('listing_type', params.listing_type);
  if (params?.search) query.append('search', params.search);

  const url = `${API_BASE_URL}/api/shop/listings?${query.toString()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch shop listings: ${res.status}`);
  return await res.json();
}

export async function publishShopListing(payload: any): Promise<any> {
  const url = `${API_BASE_URL}/api/shop/listings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to publish listing: ${res.status}`);
  }
  return await res.json();
}

export async function createWaitlistEnquiry(payload: any): Promise<any> {
  const url = `${API_BASE_URL}/api/shop/enquiries`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to submit pre-enquiry: ${res.status}`);
  }
  return await res.json();
}

export async function fetchWaitlistEnquiries(): Promise<{
  enquiries: any[];
  demand_per_model: any[];
  total_active_enquiries: number;
}> {
  const url = `${API_BASE_URL}/api/shop/enquiries`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch waitlist enquiries: ${res.status}`);
  return await res.json();
}

export async function fetchReservations(buyer_email?: string): Promise<{ reservations: any[]; total: number }> {
  const url = `${API_BASE_URL}/api/shop/reservations${buyer_email ? `?buyer_email=${encodeURIComponent(buyer_email)}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch reservations: ${res.status}`);
  return await res.json();
}

export async function confirmReservation(reservationId: number): Promise<any> {
  const url = `${API_BASE_URL}/api/shop/reservations/${reservationId}/confirm`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to confirm reservation: ${res.status}`);
  }
  return await res.json();
}

export async function releaseReservation(reservationId: number): Promise<any> {
  const url = `${API_BASE_URL}/api/shop/reservations/${reservationId}/release`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to release reservation: ${res.status}`);
  }
  return await res.json();
}

export async function triggerExpiryCheck(): Promise<any> {
  const url = `${API_BASE_URL}/api/shop/reservations/expire-check`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to run expiry check: ${res.status}`);
  return await res.json();
}

export async function fetchShopNotifications(email?: string): Promise<{ notifications: any[]; unread_count: number }> {
  const url = `${API_BASE_URL}/api/shop/notifications${email ? `?user_email=${encodeURIComponent(email)}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
  return await res.json();
}

export async function seedShopDemo(): Promise<any> {
  const url = `${API_BASE_URL}/api/shop/seed`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to seed shop demo: ${res.status}`);
  return await res.json();
}

// -------------------------------------------------------------
// Chennai Supply Chain & Circular Logistics Integration
// -------------------------------------------------------------

export async function fetchSupplyChainPartners(params?: {
  pathway?: string;
  category?: string;
  part_type?: string;
  location?: string;
}): Promise<SupplyChainPartner[]> {
  const searchParams = new URLSearchParams();
  if (params?.pathway) searchParams.append('pathway', params.pathway);
  if (params?.category) searchParams.append('category', params.category);
  if (params?.part_type) searchParams.append('part_type', params.part_type);
  if (params?.location) searchParams.append('location', params.location);

  const qs = searchParams.toString();
  const url = `${API_BASE_URL}/api/supply-chain/partners${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch supply chain partners: ${res.status}`);
  return await res.json();
}

export async function fetchSupplyChainMatch(returnId: string): Promise<SupplyChainMatchResponse> {
  const url = `${API_BASE_URL}/api/supply-chain/match/${encodeURIComponent(returnId)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch supply chain match for ${returnId}: ${res.status}`);
  return await res.json();
}

export async function dispatchSupplyChainOrder(payload: DispatchRequest): Promise<DispatchResponse> {
  const url = `${API_BASE_URL}/api/supply-chain/dispatch`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to dispatch order: ${res.status}`);
  }
  return await res.json();
}
