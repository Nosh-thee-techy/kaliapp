export type GraphScoreDriver = {
  label: string;
  points: number;
  detail: string;
};

export type GraphScorecard = {
  id: string;
  national_id: string;
  name: string;
  phone: string;
  demographic: string;
  segment: string;
  vulnerability_tag: string;
  cooperative: string;
  coop_code: string;
  zone_code: string;
  zone_name: string;
  requested_kes: number;
  acreage: number;
  status: string;
  crop_type: string;
  harvest_month: string;
  registered_via: string;
  has_land_ownership: boolean;
  lease_duration_months: number;
  cooperative_delivery_years: number;
  chama_months_consistent: number;
  mobile_money_inflows_kes: number;
  aggregate_score: number;
  total: number;
  band: "Approve" | "Refer" | "Decline";
  recommendation: string;
  drivers: GraphScoreDriver[];
  drags: GraphScoreDriver[];
  asset_substitute_applied: boolean;
  climate: {
    zone_code: string;
    spi: number;
    rainfall_mm_last_30d: number;
    pest_proximity_km: number;
    advisory: string | null;
    last_sync_iso: string | null;
  };
  graph_context: {
    chama_id?: string;
    chama_name?: string;
    chama_repayment_rate_pct?: number;
    is_guaranteed: boolean;
    cooperative_id?: string;
  };
};

export type GraphFarmerRow = {
  id: string;
  nationalId: string;
  name: string;
  phone: string;
  vulnerabilityTag: string;
  segment: string;
  cooperative: string;
  coopCode: string;
  zoneCode: string;
  zoneName: string;
  requestedKes: number;
  acreage: number;
  status: string;
  hasLandOwnership: 0 | 1;
  leaseDurationMonths: number;
  cooperativeDeliveryYears: number;
  chamaMonthsConsistent: number;
  mobileMoneyInflowsKes: number;
  harvestMonth: string;
  cropType: string;
  registeredVia: string;
  submittedIso: string;
};

const BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_CORE_URL
    ? String(import.meta.env.VITE_API_CORE_URL).replace(/\/$/, "")
    : "http://localhost:4000";

async function graphFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Graph API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchGraphHealth(): Promise<boolean> {
  try {
    const data = await graphFetch<{ status: string }>("/api/health");
    return data.status === "ok";
  } catch {
    return false;
  }
}

export async function fetchGraphFarmers(params?: {
  status?: string;
  segment?: string;
}): Promise<GraphFarmerRow[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.segment) q.set("segment", params.segment);
  const suffix = q.toString() ? `?${q}` : "";
  const data = await graphFetch<{ farmers: GraphFarmerRow[] }>(`/api/farmers${suffix}`);
  return data.farmers;
}

export async function fetchGraphScorecard(id: string): Promise<GraphScorecard> {
  return graphFetch<GraphScorecard>(`/api/scorecard/${encodeURIComponent(id)}`);
}

export async function postGraphDecision(
  id: string,
  body: { decision: string; stance: string; notes: string; officer?: string },
): Promise<{ ok: boolean; sms?: { body: string } }> {
  return graphFetch(`/api/farmers/${encodeURIComponent(id)}/decision`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postUssdSession(body: {
  text?: string;
  phoneNumber: string;
}): Promise<string> {
  const res = await fetch(`${BASE}/ussd/ussd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.text();
}

export { BASE as API_CORE_BASE };
