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
  grow_asia?: {
    systemScore: number;
    riskTier: string;
    supply_chain_weight: number;
    social_weight: number;
    climate_weight: number;
    stability_weight: number;
    chama_name?: string;
  };
  unified?: {
    canonical_score: number;
    band: string;
    recommendation: string;
    grow_asia_percent: number;
    graph_score: number;
    primary_engine: string;
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
  ground_truth?: {
    hadActiveAlert: boolean;
    verifiedCount: number;
    bonusPoints: number;
    advisory: string | null;
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
const PRODUCTION_API = "https://kaliapp-api.onrender.com";

/** Local dev → localhost:4000. Vercel/prod → VITE_API_CORE_URL or known Render URL. */
function getApiBase(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_CORE_URL) {
    return String(import.meta.env.VITE_API_CORE_URL).replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return DEFAULT_API;
    }
    return PRODUCTION_API;
  }
  return DEFAULT_API;
}

function apiPath(path: string) {
  return `${getApiBase()}${path}`;
}

/** Auth endpoints — never attach stale session token. */
async function authFetch<T>(path: string, body: object): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(apiPath(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `Auth failed (${res.status})`);
    }
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("API request timed out. Is the backend running on port 4000?");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function graphFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const timeoutMs = path.includes("/readiness/") ? 120_000 : 45_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiPath(path), {
      ...init,
      signal: controller.signal,
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
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      const onProd = typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname);
      throw new Error(
        onProd
          ? "API timed out — Render may be waking up (free tier). Wait 30s and retry."
          : "API timed out. Run: cd backend && npm run dev",
      );
    }
    if (err instanceof TypeError && String(err.message).includes("fetch")) {
      const base = getApiBase();
      throw new Error(`Cannot reach API at ${base}. Check backend deploy and CORS.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchGraphHealth(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await graphFetch<{ status: string }>("/api/health");
      if (data.status === "ok") return true;
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return false;
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

/** Map Neo4j farmer rows to dashboard queue shape (segment/status enums). */
export function mapGraphFarmerToDashboard(
  row: GraphFarmerRow,
): import("./mock-data").Farmer {
  const segment = normalizeDashboardSegment(row.segment);
  const status = normalizeDashboardStatus(row.status);
  return {
    id: row.id,
    nationalId: row.nationalId,
    name: row.name,
    phone: row.phone,
    vulnerabilityTag: (row.vulnerabilityTag as import("./mock-data").Farmer["vulnerabilityTag"]) || "Smallholder",
    segment,
    cooperative: row.cooperative,
    coopCode: row.coopCode,
    zoneCode: row.zoneCode,
    zoneName: row.zoneName,
    requestedKes: row.requestedKes,
    acreage: row.acreage,
    status,
    hasLandOwnership: row.hasLandOwnership,
    leaseDurationMonths: row.leaseDurationMonths,
    cooperativeDeliveryYears: row.cooperativeDeliveryYears,
    chamaMonthsConsistent: row.chamaMonthsConsistent,
    mobileMoneyInflowsKes: row.mobileMoneyInflowsKes,
    harvestMonth: row.harvestMonth,
    cropType: row.cropType,
    registeredVia: (row.registeredVia as import("./mock-data").Farmer["registeredVia"]) || "USSD",
    submittedIso: row.submittedIso,
  };
}

export function normalizeDashboardSegment(
  segment: string,
): import("./mock-data").DemographicSegment {
  const s = (segment || "").toLowerCase();
  if (s.includes("women") || s.includes("female")) return "Women";
  if (s.includes("youth")) return "Youth";
  if (s.includes("pwd") || s.includes("disabilit")) return "PWD";
  return "General";
}

export function normalizeDashboardStatus(
  status: string,
): import("./mock-data").ApplicationStatus {
  const known = ["awaiting_climate", "ready_for_review", "escalated", "disbursed"] as const;
  if ((known as readonly string[]).includes(status)) {
    return status as import("./mock-data").ApplicationStatus;
  }
  const s = (status || "").toLowerCase();
  if (s.includes("disburs") || s === "approved") return "disbursed";
  if (s.includes("escalat") || s.includes("flag")) return "escalated";
  if (s.includes("climate") || s.includes("await")) return "awaiting_climate";
  return "ready_for_review";
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
  return authFetch<AuthResult>("/api/auth/login", { email, password });
}

export async function registerOfficer(body: {
  name: string;
  email: string;
  password: string;
  branch?: string;
}): Promise<AuthResult> {
  return authFetch<AuthResult>("/api/auth/register", body);
}

export type IngestResult = {
  ok: boolean;
  applicationId?: string;
  state?: string;
  approved?: boolean;
  systemScore?: { systemScore: number; riskTier: string };
};

export async function postOfficerIngest(body: {
  phone: string;
  nationalId?: string;
  coopCode?: string;
  cropType?: string;
  acreage?: number;
  text?: string;
  lang?: "en" | "sw";
  requestedKes?: number;
  officerId?: string;
}): Promise<IngestResult> {
  return graphFetch("/api/ingest", {
    method: "POST",
    body: JSON.stringify({ ...body, channel: "officer" }),
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

export const API_CORE_BASE = getApiBase;

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
  lat: number;
  lng: number;
  systemScore: number | null;
  riskTier: "green" | "amber" | "red";
  spi: number | null;
};

export type MapChamaCluster = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone_code?: string;
};

export type MapZone = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radiusKm: number;
  farmerCount: number;
};

export type MapBounds = {
  southWest: { lat: number; lon: number };
  northEast: { lat: number; lon: number };
  center: { lat: number; lon: number };
  defaultZoom: number;
};

export type ZoneWeather = {
  source: string;
  status: "live" | "placeholder" | "error";
  zoneId: string;
  zoneName: string;
  lat: number;
  lon: number;
  temperatureMaxC: number | null;
  temperatureAvgMaxC?: number | null;
  precipitationMm30d: number | null;
  windMaxKmh: number | null;
  forecastDays?: string[];
  message: string | null;
  fetchedAt: string;
};

export type ZoneAnalytics = {
  zoneId: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  climate: {
    spi: number;
    rainfallMm30d: number;
    pestProximityKm: number;
    advisory: string | null;
    lastSyncIso: string | null;
  };
  weather: ZoneWeather;
  analytics: {
    farmerCount: number;
    cooperativeCount: number;
    chamaCount: number;
    approved: number;
    atRisk: number;
    needsReview: number;
    avgGrowAsiaScore: number;
    riskBreakdown: { green: number; amber: number; red: number };
  };
  farmers: {
    id: string;
    name: string;
    status?: string;
    underwriting_state?: string;
    crop_type?: string;
  }[];
  fetchedAt: string;
};

export type MapFarmersResponse = {
  farmers: MapFarmerPin[];
  chamas: MapChamaCluster[];
  zones: MapZone[];
  bounds: MapBounds;
  fetchedAt: string;
};

export async function fetchMapFarmers(): Promise<MapFarmersResponse> {
  return graphFetch("/api/map/farmers");
}

export async function fetchZoneAnalytics(zoneId: string): Promise<ZoneAnalytics> {
  return graphFetch(`/api/map/zones/${encodeURIComponent(zoneId)}/analytics`);
}

export async function fetchZoneWeather(zoneId: string): Promise<ZoneWeather> {
  return graphFetch(`/api/map/zones/${encodeURIComponent(zoneId)}/weather`);
}

export type AgentLanguage = { code: string; label: string };

export type AgentChatResponse = {
  type: "parse" | "explain";
  lang: string;
  reply: string;
  parsed?: Record<string, unknown>;
  stance?: string;
  unified?: { canonical_score: number; band: string };
  officerNarrative?: string | null;
  provider?: string;
};

export async function postAgentChat(body: {
  message: string;
  lookup?: string;
  lang?: string;
  mode?: "auto" | "parse" | "explain";
}): Promise<AgentChatResponse> {
  return graphFetch("/api/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchAgentLanguages(): Promise<{ languages: AgentLanguage[]; smsMaxChars: number }> {
  return graphFetch("/api/agent/languages");
}

export type ExplainabilityResult = {
  ok: boolean;
  farmerId: string;
  name: string;
  lang: string;
  langLabel: string;
  stance: string;
  unified: {
    canonical_score: number;
    band: string;
    recommendation: string;
    grow_asia_percent: number;
    graph_score: number;
  };
  farmer: {
    sms: string;
    chars: number;
    maxChars: number;
    provider: string;
    model?: string;
    actionHint?: string | null;
  };
  officer: {
    narrative: string;
    provider: string;
    model?: string;
    drivers: GraphScoreDriver[];
    drags: GraphScoreDriver[];
    climate: GraphScorecard["climate"];
    grow_asia?: { systemScore: number; riskTier: string } | null;
  } | null;
  featherlessEnabled: boolean;
  generatedAt: string;
};

export async function fetchExplainability(
  lookup: string,
  lang = "en",
): Promise<ExplainabilityResult> {
  return graphFetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lookup, lang }),
  });
}

export type ReadinessAction = {
  id: string;
  title: string;
  source: string;
  priority: string;
  done: boolean;
  fieldVerified?: boolean;
  verifyType?: string | null;
};

export type FarmerReadiness = {
  ok: boolean;
  farmer: {
    id: string;
    name: string;
    crop: string;
    cooperative: string;
    zone: string;
    ktdaId: string | null;
    phoneMasked: string;
  };
  readiness: {
    score: number;
    baseScore?: number;
    mitigationBonus?: number;
    band: "ready" | "almost" | "building";
    stance: string;
    label: string;
  };
  headline: string | null;
  macroAdvisory?: string | null;
  actionPoints: ReadinessAction[];
  groundTruth?: {
    hadActiveAlert: boolean;
    verifiedCount: number;
    verifications: { type?: string; officer?: string; iso?: string; action?: string }[];
  };
  strengths: { label: string; summary: string }[];
  missing: { id: string; label: string }[];
  latestMessage: { body: string; sentAt: string; category: string } | null;
  lang: string;
  updatedAt: string;
};

export async function fetchFarmerReadiness(lookup: string, lang = "en"): Promise<FarmerReadiness> {
  const q = lang !== "en" ? `?lang=${encodeURIComponent(lang)}` : "";
  return graphFetch(`/api/readiness/${encodeURIComponent(lookup)}${q}`);
}

export async function completeReadinessAction(lookup: string, actionId: string): Promise<{ ok: boolean }> {
  return graphFetch(`/api/readiness/${encodeURIComponent(lookup)}/actions/${encodeURIComponent(actionId)}/complete`, {
    method: "POST",
  });
}

export async function postFieldVerification(
  farmerId: string,
  body: { actionId?: string; type?: string; notes?: string },
): Promise<{ ok: boolean; verificationId?: string; message?: string }> {
  return graphFetch(`/api/farmers/${encodeURIComponent(farmerId)}/verify-field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type AgronomistMlInsight = {
  priorityScore: number;
  tier: "urgent" | "soon" | "routine";
  visitProbability: number;
  model: string;
  drivers: { label: string; weight: string }[];
};

export type AgronomistQueueItem = {
  farmerId: string;
  name: string;
  phone: string;
  crop: string;
  cooperative: string;
  zoneCode: string;
  zoneName: string;
  spi: number;
  pestProximityKm: number;
  advisory: string | null;
  hasActiveAlert: boolean;
  pendingActions: number;
  pendingItems: { id: string; title: string; completedIso?: string }[];
  daysSinceSelfReport: number;
  cooperativeDeliveryYears: number;
  creditBand: string | null;
  creditScore: number | null;
  ml: AgronomistMlInsight;
};

export type AgronomistStats = {
  ok: boolean;
  pendingVerifications: number;
  totalVerifications: number;
  activeAlerts: number;
};

export type AgronomistZone = { id: string; name: string; hasAlert: boolean };

export type AgronomistFieldInsight = {
  ok: boolean;
  farmer: {
    id: string;
    name: string;
    phone: string;
    crop: string;
    cooperative: string;
    zone: string;
    zoneCode: string;
  };
  climate: {
    spi: number;
    pestProximityKm: number;
    advisory: string | null;
    rainfallMm30d: number;
  };
  actions: { id: string; title: string; selfDone: boolean; verified: boolean }[];
  pendingItems: { id: string; title: string }[];
  credit: { score: number | null; band: string };
  ml: AgronomistMlInsight;
  mitigationBonus: number;
};

export async function fetchAgronomistQueue(zone?: string): Promise<{ ok: boolean; queue: AgronomistQueueItem[]; count: number }> {
  const q = zone ? `?zone=${encodeURIComponent(zone)}` : "";
  return graphFetch(`/api/agronomist/queue${q}`);
}

export async function fetchAgronomistStats(): Promise<AgronomistStats> {
  return graphFetch("/api/agronomist/stats");
}

export async function fetchAgronomistZones(): Promise<{ ok: boolean; zones: AgronomistZone[] }> {
  return graphFetch("/api/agronomist/zones");
}

export async function fetchAgronomistInsight(farmerId: string): Promise<AgronomistFieldInsight> {
  return graphFetch(`/api/agronomist/insight/${encodeURIComponent(farmerId)}`);
}

/** SSE stream — EventSource cannot set Authorization header; pass JWT as query param. */
export function subscribeMapEvents(
  token: string,
  onEvent: (event: { type: string; data: Record<string, unknown> }) => void,
): () => void {
  const url = `${getApiBase()}/api/events/stream?token=${encodeURIComponent(token)}`;
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
