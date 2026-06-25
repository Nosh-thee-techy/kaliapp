export type ApplicationStatus =
  | "awaiting_climate"
  | "ready_for_review"
  | "escalated"
  | "disbursed";

export type DemographicSegment = "Women" | "Youth" | "PWD" | "General";

export type Farmer = {
  id: string;
  nationalId: string;
  name: string;
  phone: string;
  vulnerabilityTag: "Female-headed HH" | "Smallholder" | "Youth" | "Pastoralist" | "PWD";
  segment: DemographicSegment;
  cooperative: string;
  coopCode: string;
  zoneCode: string;
  zoneName: string;
  requestedKes: number;
  acreage: number;
  status: ApplicationStatus;
  hasLandOwnership: 0 | 1;
  leaseDurationMonths: number;
  cooperativeDeliveryYears: number;
  chamaMonthsConsistent: number;
  mobileMoneyInflowsKes: number;
  harvestMonth: string;
  cropType: string;
  registeredVia: "USSD" | "Walk-in" | "Cooperative roster";
  submittedIso: string;
};

export type ClimateSignal = {
  zoneCode: string;
  spi: number;
  rainfallMmLast30d: number;
  pestProximityKm: number;
  lastSyncIso: string;
  advisory?: string;
};

export type AuditEntry = {
  id: string;
  farmerId: string;
  farmerName: string;
  officer: string;
  decision: "Approved" | "Referred" | "Declined";
  score: number;
  notes: string;
  timestampIso: string;
};

export type PipelineRun = {
  source: string;
  lastRunIso: string;
  status: "ok" | "warn" | "fail";
  message: string;
};

export type SmsMessage = {
  id: string;
  farmerId: string;
  to: string;
  body: string;
  category: "decision" | "climate" | "registration";
  sentIso: string;
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

export const farmers: Farmer[] = [
  {
    id: "F-1042",
    nationalId: "29845112",
    name: "Mary Wanjiku",
    phone: "+254712345678",
    vulnerabilityTag: "Female-headed HH",
    segment: "Women",
    cooperative: "Naivasha Horticulture Co-op",
    coopCode: "COOP-NVS-04",
    zoneCode: "KE-RIFT-04",
    zoneName: "Naivasha Basin",
    requestedKes: 45000,
    acreage: 1.5,
    status: "ready_for_review",
    hasLandOwnership: 0,
    leaseDurationMonths: 36,
    cooperativeDeliveryYears: 3,
    chamaMonthsConsistent: 18,
    mobileMoneyInflowsKes: 128000,
    harvestMonth: "January",
    cropType: "French Beans",
    registeredVia: "USSD",
    submittedIso: hoursAgo(3),
  },
  {
    id: "F-1043",
    nationalId: "31220984",
    name: "Joseph Kiprono",
    phone: "+254722110983",
    vulnerabilityTag: "Youth",
    segment: "Youth",
    cooperative: "Eldoret Grain SACCO",
    coopCode: "COOP-ELD-02",
    zoneCode: "KE-RIFT-02",
    zoneName: "Uasin Gishu Plateau",
    requestedKes: 80000,
    acreage: 3,
    status: "awaiting_climate",
    hasLandOwnership: 1,
    leaseDurationMonths: 0,
    cooperativeDeliveryYears: 1,
    chamaMonthsConsistent: 6,
    mobileMoneyInflowsKes: 64000,
    harvestMonth: "August",
    cropType: "Maize",
    registeredVia: "Cooperative roster",
    submittedIso: hoursAgo(1),
  },
  {
    id: "F-1044",
    nationalId: "27331290",
    name: "Amina Hassan",
    phone: "+254733776201",
    vulnerabilityTag: "Pastoralist",
    segment: "Women",
    cooperative: "Garissa Livestock Group",
    coopCode: "COOP-GRS-01",
    zoneCode: "KE-NE-01",
    zoneName: "North Eastern Range",
    requestedKes: 60000,
    acreage: 0,
    status: "escalated",
    hasLandOwnership: 0,
    leaseDurationMonths: 0,
    cooperativeDeliveryYears: 2,
    chamaMonthsConsistent: 24,
    mobileMoneyInflowsKes: 41000,
    harvestMonth: "N/A",
    cropType: "Goat restocking",
    registeredVia: "Walk-in",
    submittedIso: hoursAgo(28),
  },
  {
    id: "F-1045",
    nationalId: "30119772",
    name: "Peter Otieno",
    phone: "+254700554120",
    vulnerabilityTag: "Smallholder",
    segment: "General",
    cooperative: "Kisumu Rice Growers",
    coopCode: "COOP-KSM-03",
    zoneCode: "KE-NYZ-03",
    zoneName: "Ahero Irrigation Belt",
    requestedKes: 35000,
    acreage: 1.2,
    status: "ready_for_review",
    hasLandOwnership: 0,
    leaseDurationMonths: 12,
    cooperativeDeliveryYears: 4,
    chamaMonthsConsistent: 30,
    mobileMoneyInflowsKes: 96000,
    harvestMonth: "March",
    cropType: "Rice",
    registeredVia: "USSD",
    submittedIso: hoursAgo(7),
  },
  {
    id: "F-1046",
    nationalId: "33445918",
    name: "Daniel Mwangi",
    phone: "+254710887234",
    vulnerabilityTag: "PWD",
    segment: "PWD",
    cooperative: "Nyeri Dairy Cooperative",
    coopCode: "COOP-NYR-05",
    zoneCode: "KE-CEN-01",
    zoneName: "Mt. Kenya South",
    requestedKes: 52000,
    acreage: 0.8,
    status: "ready_for_review",
    hasLandOwnership: 1,
    leaseDurationMonths: 0,
    cooperativeDeliveryYears: 4,
    chamaMonthsConsistent: 22,
    mobileMoneyInflowsKes: 110000,
    harvestMonth: "Continuous",
    cropType: "Dairy",
    registeredVia: "Cooperative roster",
    submittedIso: hoursAgo(14),
  },
  {
    id: "F-1031",
    nationalId: "28774512",
    name: "Grace Mutua",
    phone: "+254711223344",
    vulnerabilityTag: "Female-headed HH",
    segment: "Women",
    cooperative: "Machakos Maize Co-op",
    coopCode: "COOP-MCK-02",
    zoneCode: "KE-EAS-02",
    zoneName: "Machakos Lowlands",
    requestedKes: 50000,
    acreage: 2,
    status: "disbursed",
    hasLandOwnership: 1,
    leaseDurationMonths: 0,
    cooperativeDeliveryYears: 5,
    chamaMonthsConsistent: 36,
    mobileMoneyInflowsKes: 152000,
    harvestMonth: "December",
    cropType: "Maize",
    registeredVia: "Walk-in",
    submittedIso: hoursAgo(96),
  },
];

export const climateSignals: Record<string, ClimateSignal> = {
  "KE-RIFT-04": { zoneCode: "KE-RIFT-04", spi: -1.6, rainfallMmLast30d: 22, pestProximityKm: 18, lastSyncIso: hoursAgo(4), advisory: "Fall armyworm detected 18km NE — scout maize plots within 72h." },
  "KE-RIFT-02": { zoneCode: "KE-RIFT-02", spi: 0.4, rainfallMmLast30d: 78, pestProximityKm: 60, lastSyncIso: hoursAgo(4) },
  "KE-NE-01": { zoneCode: "KE-NE-01", spi: -2.1, rainfallMmLast30d: 8, pestProximityKm: 40, lastSyncIso: hoursAgo(4), advisory: "Severe drought signal — destock advisory issued." },
  "KE-NYZ-03": { zoneCode: "KE-NYZ-03", spi: 0.9, rainfallMmLast30d: 110, pestProximityKm: 95, lastSyncIso: hoursAgo(4) },
  "KE-EAS-02": { zoneCode: "KE-EAS-02", spi: -0.3, rainfallMmLast30d: 54, pestProximityKm: 70, lastSyncIso: hoursAgo(4) },
  "KE-CEN-01": { zoneCode: "KE-CEN-01", spi: 0.2, rainfallMmLast30d: 88, pestProximityKm: 80, lastSyncIso: hoursAgo(4) },
};

export const pipelineRuns: PipelineRun[] = [
  { source: "CHIRPS Rainfall Grids", lastRunIso: hoursAgo(4), status: "ok", message: "12 zones refreshed" },
  { source: "ICPAC SPI Index", lastRunIso: hoursAgo(6), status: "ok", message: "All zones in range" },
  { source: "Cooperative Delivery Ledger", lastRunIso: hoursAgo(26), status: "warn", message: "Delayed sync from Naivasha node" },
  { source: "M-Pesa Inflow Aggregator", lastRunIso: hoursAgo(2), status: "ok", message: "OK" },
  { source: "Pest Proximity Feed (KALRO)", lastRunIso: hoursAgo(48), status: "fail", message: "Endpoint timeout — retrying" },
  { source: "USSD Session Router", lastRunIso: hoursAgo(1), status: "ok", message: "342 sessions in last 24h" },
];

export const auditLog: AuditEntry[] = [
  { id: "A-9001", farmerId: "F-1031", farmerName: "Grace Mutua", officer: "J. Mwangi", decision: "Approved", score: 78, notes: "Strong 5y co-op delivery", timestampIso: hoursAgo(72) },
  { id: "A-9002", farmerId: "F-1028", farmerName: "Samuel Cheruiyot", officer: "L. Akinyi", decision: "Referred", score: 54, notes: "Awaiting cooperative confirmation", timestampIso: hoursAgo(48) },
  { id: "A-9003", farmerId: "F-1019", farmerName: "Faith Njeri", officer: "J. Mwangi", decision: "Declined", score: 38, notes: "Drought zone + no co-op affiliation", timestampIso: hoursAgo(24) },
];

export const smsOutbox: SmsMessage[] = [
  {
    id: "SMS-2201",
    farmerId: "F-1031",
    to: "+254711223344",
    body: "KaLI Rating: 78/100. Approved. KES 50,000 disbursed. Repayment set for December harvest.",
    category: "decision",
    sentIso: hoursAgo(72),
  },
  {
    id: "SMS-2202",
    farmerId: "F-1042",
    to: "+254712345678",
    body: "KaLI Alert: Fall armyworm detected near Naivasha. Scout your French Bean plots within 72h. Reply HELP for extension officer.",
    category: "climate",
    sentIso: hoursAgo(6),
  },
  {
    id: "SMS-2203",
    farmerId: "F-1044",
    to: "+254733776201",
    body: "KaLI Drought Advisory: Severe SPI in Garissa. Destocking and water-point map sent via *483*100*4#.",
    category: "climate",
    sentIso: hoursAgo(12),
  },
];

export type ScoreBreakdown = {
  total: number;
  band: "Approve" | "Refer" | "Decline";
  drivers: { label: string; points: number; detail: string }[];
  drags: { label: string; points: number; detail: string }[];
  assetSubstituteApplied: boolean;
};

export function computeScore(farmer: Farmer, climate: ClimateSignal): ScoreBreakdown {
  const drivers: ScoreBreakdown["drivers"] = [];
  const drags: ScoreBreakdown["drags"] = [];
  let assetSubstituteApplied = false;

  if (farmer.cooperativeDeliveryYears >= 3) {
    drivers.push({ label: "Cooperative delivery history", points: 18, detail: `${farmer.cooperativeDeliveryYears} years of consistent deliveries to ${farmer.cooperative}` });
  } else if (farmer.cooperativeDeliveryYears >= 1) {
    drivers.push({ label: "Emerging cooperative ties", points: 8, detail: `${farmer.cooperativeDeliveryYears} year(s) with ${farmer.cooperative}` });
  } else {
    drags.push({ label: "No cooperative history", points: -10, detail: "Less than 1 year of verifiable deliveries" });
  }

  if (farmer.hasLandOwnership === 1) {
    drivers.push({ label: "Land ownership verified", points: 20, detail: "Title deed on file" });
  } else if (farmer.leaseDurationMonths >= 24 || farmer.cooperativeDeliveryYears >= 2) {
    assetSubstituteApplied = true;
    drivers.push({ label: "Asset-substitute applied", points: 10, detail: `No title, but ${farmer.leaseDurationMonths}mo lease / ${farmer.cooperativeDeliveryYears}y co-op qualifies as collateral substitute` });
  } else {
    drags.push({ label: "No collateral or substitute", points: -12, detail: "No title, short lease, limited co-op tenure" });
  }

  if (farmer.chamaMonthsConsistent >= 18) {
    drivers.push({ label: "Chama saving consistency", points: 12, detail: `${farmer.chamaMonthsConsistent} consecutive months of group savings` });
  } else if (farmer.chamaMonthsConsistent >= 6) {
    drivers.push({ label: "Moderate savings discipline", points: 6, detail: `${farmer.chamaMonthsConsistent} months tracked` });
  }

  if (farmer.mobileMoneyInflowsKes >= 100000) {
    drivers.push({ label: "Mobile money cashflow", points: 10, detail: `KES ${farmer.mobileMoneyInflowsKes.toLocaleString()} inflows in last 12mo` });
  } else if (farmer.mobileMoneyInflowsKes < 50000) {
    drags.push({ label: "Thin mobile cashflow", points: -5, detail: `Only KES ${farmer.mobileMoneyInflowsKes.toLocaleString()} recorded` });
  }

  if (climate.spi <= -1.5) {
    drags.push({ label: "Severe drought signal", points: -15, detail: `SPI ${climate.spi.toFixed(1)} in ${climate.zoneCode} (CHIRPS/ICPAC)` });
  } else if (climate.spi <= -0.5) {
    drags.push({ label: "Below-normal rainfall", points: -6, detail: `SPI ${climate.spi.toFixed(1)} — monitor closely` });
  } else if (climate.spi >= 0.5) {
    drivers.push({ label: "Favourable rainfall window", points: 6, detail: `SPI ${climate.spi.toFixed(1)} supports projected yield` });
  }

  if (climate.pestProximityKm < 25) {
    drags.push({ label: "Pest proximity alert", points: -8, detail: `Outbreak within ${climate.pestProximityKm}km of zone` });
  }

  const base = 60;
  const total = Math.max(0, Math.min(100, base + drivers.reduce((s, d) => s + d.points, 0) + drags.reduce((s, d) => s + d.points, 0)));
  const band: ScoreBreakdown["band"] = total >= 65 ? "Approve" : total >= 50 ? "Refer" : "Decline";

  return { total, band, drivers, drags, assetSubstituteApplied };
}

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.round(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export const STATUS_META: Record<ApplicationStatus, { label: string; tone: string; dot: string }> = {
  awaiting_climate: { label: "Awaiting Climate Ingestion", tone: "bg-warning/15 text-warning-foreground border-warning/30", dot: "bg-warning" },
  ready_for_review: { label: "Ready for Review", tone: "bg-primary/10 text-primary border-primary/30", dot: "bg-primary" },
  escalated: { label: "Escalated", tone: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
  disbursed: { label: "Disbursed", tone: "bg-success/10 text-success border-success/30", dot: "bg-success" },
};

export const SEGMENT_META: Record<DemographicSegment, { label: string; tone: string }> = {
  Women: { label: "Women", tone: "bg-[oklch(0.92_0.05_15)] text-[oklch(0.35_0.12_15)]" },
  Youth: { label: "Youth", tone: "bg-[oklch(0.92_0.08_75)] text-[oklch(0.38_0.14_55)]" },
  PWD: { label: "PWD", tone: "bg-[oklch(0.9_0.06_260)] text-[oklch(0.35_0.14_260)]" },
  General: { label: "General", tone: "bg-secondary text-secondary-foreground" },
};
