import { getAuthToken } from "./officer-session";

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
  ml?: {
    approvedProbability: number;
    mlScore: number;
    mlBand: string;
    model: string;
    weightsUsed: Record<string, number>;
    featuresUsed: string[];
  };
  blended?: {
    blended: number;
    blendedBand: string;
    graphWeight: number;
    mlWeight: number;
    graphScore: number;
    mlScore: number;
    model: string;
  };
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

export type PipelineRun = {
  source: string;
  lastRunIso: string;
  status: "ok" | "warn" | "fail";
  message: string;
};

export type AuditEntry = {
  id: string;
  farmerId: string;
  farmerName: string;
  officer: string;
  decision: string;
  stance?: string;
  notes: string;
  score: { low: number; high: number } | null;
  timestampIso: string;
};

export type SmsMessage = {
  id: string;
  farmerId?: string;
  to: string;
  body: string;
  category: "decision" | "climate" | "registration";
  sentIso: string;
};

export type PortfolioStats = {
  segments: { name: string; value: number }[];
  zones: { zoneCode: string; name: string; spi: number; rainfallMmLast30d: number; pestProximityKm: number; advisory: string | null }[];
  weekly: { w: string; requested: number; sent: number }[];
  total: number;
  fetchedAt?: string;
};

export type PublicStats = {
  ready: number;
  escalated: number;
  advisories: number;
  womenYouth: number;
  total: number;
};

const DEFAULT_API = "http://localhost:4000";

const BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_CORE_URL
    ? String(import.meta.env.VITE_API_CORE_URL).replace(/\/$/, "")
    : DEFAULT_API;

function apiPath(path: string) {
  return `${BASE}${path}`;
}

export async function graphFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const res = await fetch(apiPath(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function fetchPipeline(): Promise<{ runs: PipelineRun[]; fetchedAt: string }> {
  return graphFetch("/api/pipeline");
}

export async function syncClimatePipeline(): Promise<{
  ok: boolean;
  zonesUpdated: number;
  farmersPromoted: number;
  syncedAt: string;
  runs: PipelineRun[];
}> {
  return graphFetch("/api/pipeline/sync", { method: "POST" });
}

export async function fetchAuditLog(params?: {
  limit?: number;
  farmerId?: string;
}): Promise<AuditEntry[]> {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.farmerId) q.set("farmerId", params.farmerId);
  const suffix = q.toString() ? `?${q}` : "";
  const data = await graphFetch<{ entries: AuditEntry[] }>(`/api/audit${suffix}`);
  return data.entries;
}

export async function fetchSmsMessages(params?: {
  phone?: string;
  farmerId?: string;
  limit?: number;
}): Promise<SmsMessage[]> {
  const q = new URLSearchParams();
  if (params?.phone) q.set("phone", params.phone);
  if (params?.farmerId) q.set("farmerId", params.farmerId);
  if (params?.limit) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  const data = await graphFetch<{ messages: SmsMessage[] }>(`/api/sms${suffix}`);
  return data.messages;
}

export async function fetchPortfolioStats(): Promise<PortfolioStats> {
  return graphFetch("/api/stats/portfolio");
}

export async function fetchPublicStats(): Promise<PublicStats> {
  return graphFetch("/api/stats/public");
}

export async function postUssdSession(body: {
  text?: string;
  phoneNumber: string;
}): Promise<string> {
  const res = await fetch(apiPath("/ussd/ussd"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.text();
}

export type AuthResult = {
  token: string;
  officer: { name: string; email: string; branch: string };
};

export async function loginOfficer(email: string, password: string): Promise<AuthResult> {
  return graphFetch<AuthResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerOfficer(body: {
  name: string;
  email: string;
  password: string;
  branch?: string;
}): Promise<AuthResult> {
  return graphFetch<AuthResult>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type AiNarrative = {
  farmerId: string;
  narrative: string;
  model: string;
  provider: string;
  generatedAt: string;
};

export type MasumiPaymentResult = {
  ok: boolean;
  paymentId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  recipient?: string;
  farmerId?: string;
  loanId?: string;
  provider?: string;
  error?: string;
  note?: string;
};

export type PartnerTechEntry = {
  enabled: boolean;
  provider: string;
  configured: boolean;
};

export type PartnerTechStatus = {
  neo4j: PartnerTechEntry;
  featherless: PartnerTechEntry;
  masumi: PartnerTechEntry;
  lovable: PartnerTechEntry;
  ml_scoring: PartnerTechEntry;
  africas_talking: PartnerTechEntry;
  open_meteo: PartnerTechEntry;
};

export async function fetchAiNarrative(id: string): Promise<AiNarrative> {
  return graphFetch<AiNarrative>(`/api/farmers/${encodeURIComponent(id)}/ai-narrative`);
}

export async function postMasumiDisburse(
  id: string,
  body: { amount?: number; officerId?: string },
): Promise<MasumiPaymentResult> {
  return graphFetch(`/api/farmers/${encodeURIComponent(id)}/masumi-disburse`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postSmsToFarmer(
  id: string,
  body: { body: string; category?: string },
): Promise<{ ok: boolean; sms: { body: string } }> {
  return graphFetch(`/api/farmers/${encodeURIComponent(id)}/sms`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchPartnerTechStatus(): Promise<PartnerTechStatus> {
  return graphFetch("/api/partner-tech");
}

export { BASE as API_CORE_BASE };

export type MapFarmerPin = {
  id: string;
  name: string;
  phone: string;
  status: string;
  underwriting_state: string;
  crop_type: string;
  cooperative: string;
  chama_id: string | null;
  chama_name: string | null;
  zone_code: string;
  zone_name: string;
  x: number;
  y: number;
  systemScore: number | null;
  riskTier: "green" | "amber" | "red";
  spi: number | null;
};

export type MapChamaCluster = {
  id: string;
  name: string;
  x: number;
  y: number;
};

export type MapFarmersResponse = {
  farmers: MapFarmerPin[];
  chamas: MapChamaCluster[];
  zones: { id: string; x: number; y: number; label: string }[];
  fetchedAt: string;
};

export async function fetchMapFarmers(): Promise<MapFarmersResponse> {
  return graphFetch("/api/map/farmers");
}

/** SSE stream — EventSource cannot set Authorization header; pass JWT as query param. */
export function subscribeMapEvents(
  token: string,
  onEvent: (event: { type: string; data: Record<string, unknown> }) => void,
): () => void {
  const url = `${BASE}/api/events/stream?token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);

  const handler = (type: string) => (ev: MessageEvent) => {
    try {
      onEvent({ type, data: JSON.parse(ev.data) });
    } catch {
      /* ignore malformed */
    }
  };

  es.addEventListener("map_pin_updated", handler("map_pin_updated"));
  es.addEventListener("application_updated", handler("application_updated"));

  es.onerror = () => {
    /* browser auto-reconnects */
  };

  return () => es.close();
}
