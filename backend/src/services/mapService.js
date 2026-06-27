import { getDriver } from "../config/neo4j.js";

/** Zone centroids on a 1000×700 canvas (Rift Valley / Kenya hub layout). */
const ZONE_COORDS = {
  "KE-RIFT-04": { x: 520, y: 380, label: "Nakuru" },
  "KE-RIFT-02": { x: 480, y: 320, label: "Uasin Gishu" },
  "KE-NE-01": { x: 720, y: 480, label: "Garissa" },
  "KE-NYZ-03": { x: 550, y: 450, label: "Nyandarua" },
  "KE-CEN-01": { x: 500, y: 400, label: "Central" },
  "KE-EAS-02": { x: 600, y: 420, label: "Eastern" },
};

const DEFAULT_HUB = { x: 540, y: 400, label: "Kenya" };

function jitter(id, axis) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const spread = axis === "x" ? 80 : 60;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * spread;
}

function growAsiaFromRecord(r) {
  const d = r.delivery;
  const ch = r.chama;
  const guaranteeCount = r.guaranteeCount;
  const spi = Number(r.zone?.current_spi_index) || 0;

  const supply = (Number(d?.consistency_score) || (Number(d?.delivery_years) || 0) / 5) * 0.45;
  const social =
    (ch?.status === "VERIFIED" || Number(ch?.repayment_rate_pct) >= 90
      ? 0.25
      : Number(ch?.repayment_rate_pct) >= 80
        ? 0.12
        : 0) +
    guaranteeCount * 0.1;
  const climate = spi > -1.0 ? 0.1 : 0.02;
  const residentYears = Number(r.farmer.resident_years) || 0;
  const stability = residentYears >= 5 ? 0.1 : residentYears >= 2 ? 0.05 : 0;
  const systemScore = supply + social + climate + stability;

  let riskTier = "amber";
  if (systemScore >= 0.65 && spi > -1.0) riskTier = "green";
  else if (systemScore < 0.45 || spi <= -1.5) riskTier = "red";

  if (r.farmer.underwriting_state === "APPROVED") riskTier = "green";
  if (r.farmer.underwriting_state === "DECLINED") riskTier = "red";

  return { systemScore: Math.round(systemScore * 1000) / 1000, riskTier, spi };
}

export async function getMapFarmersData() {
  const session = getDriver().session();

  const cypher = `
    MATCH (f:Farmer)
    OPTIONAL MATCH (f)-[d:DELIVERS_TO]->(coop:Cooperative)
    OPTIONAL MATCH (coop)-[:OPERATES_IN]->(zone:ClimateZone)
    OPTIONAL MATCH (f)-[:MEMBER_OF]->(ch:Chama)
    OPTIONAL MATCH (f)-[g:GUARANTEES]-(peer:Farmer)
    WITH f, d, coop, zone, ch, count(DISTINCT g) AS guaranteeCount
    RETURN f, d, coop, zone, ch, guaranteeCount
    ORDER BY f.submitted_iso DESC
    LIMIT 200
  `;

  try {
    const result = await session.run(cypher);
    const chamaClusters = new Map();
    const farmers = [];

    for (const record of result.records) {
      const f = record.get("f").properties;
      const d = record.get("d")?.properties;
      const ch = record.get("ch")?.properties;
      const zone = record.get("zone")?.properties;
      const coop = record.get("coop")?.properties;
      const guaranteeCount =
        record.get("guaranteeCount")?.toNumber?.() ??
        (Number(record.get("guaranteeCount")) || 0);

      const zoneCode = zone?.id || "KE-RIFT-04";
      const hub = ZONE_COORDS[zoneCode] || DEFAULT_HUB;
      const farmerId = f.id || f.national_id;

      const scores = growAsiaFromRecord({
        farmer: f,
        delivery: d,
        chama: ch,
        zone,
        guaranteeCount,
      });

      const x = hub.x + jitter(farmerId, "x");
      const y = hub.y + jitter(farmerId, "y");

      if (ch?.id) {
        if (!chamaClusters.has(ch.id)) {
          chamaClusters.set(ch.id, {
            id: ch.id,
            name: ch.name || ch.id,
            x: hub.x + jitter(ch.id, "x") * 0.3,
            y: hub.y + jitter(ch.id, "y") * 0.3 - 40,
          });
        }
      }

      farmers.push({
        id: farmerId,
        name: f.name,
        phone: f.phone_number,
        status: f.status,
        underwriting_state: f.underwriting_state || "PENDING_INGESTION",
        crop_type: f.crop_type,
        cooperative: coop?.name || "",
        chama_id: ch?.id || null,
        chama_name: ch?.name || null,
        zone_code: zoneCode,
        zone_name: zone?.name || hub.label,
        x,
        y,
        systemScore: scores.systemScore,
        riskTier: scores.riskTier,
        spi: scores.spi,
      });
    }

    return {
      farmers,
      chamas: [...chamaClusters.values()],
      zones: Object.entries(ZONE_COORDS).map(([id, c]) => ({ id, ...c })),
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    await session.close();
  }
}
