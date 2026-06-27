import { getDriver } from "../config/neo4j.js";
import { ALL_ZONE_COORDS, EAST_AFRICA_MAP_BOUNDS } from "../config/zoneCoords.js";
import { fetchZoneWeather } from "./weatherService.js";

function jitterDeg(id, axis) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const spread = axis === "lat" ? 0.06 : 0.08;
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
    const chamaClusters = new globalThis.Map();
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
      const hub = ALL_ZONE_COORDS[zoneCode] || ALL_ZONE_COORDS["KE-RIFT-04"];
      const farmerId = f.id || f.national_id;

      const scores = growAsiaFromRecord({
        farmer: f,
        delivery: d,
        chama: ch,
        zone,
        guaranteeCount,
      });

      const lat = hub.lat + jitterDeg(farmerId, "lat");
      const lng = hub.lon + jitterDeg(farmerId, "lng");

      if (ch?.id) {
        if (!chamaClusters.has(ch.id)) {
          chamaClusters.set(ch.id, {
            id: ch.id,
            name: ch.name || ch.id,
            lat: hub.lat + jitterDeg(ch.id, "lat") * 0.25,
            lng: hub.lon + jitterDeg(ch.id, "lng") * 0.25,
            zone_code: zoneCode,
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
        zone_name: zone?.name || hub.name,
        lat,
        lng,
        systemScore: scores.systemScore,
        riskTier: scores.riskTier,
        spi: scores.spi,
      });
    }

    const zones = Object.entries(ALL_ZONE_COORDS).map(([id, c]) => ({
      id,
      label: c.name,
      lat: c.lat,
      lng: c.lon,
      radiusKm: c.radiusKm,
      farmerCount: farmers.filter((f) => f.zone_code === id).length,
    }));

    return {
      farmers,
      chamas: [...chamaClusters.values()],
      zones,
      bounds: EAST_AFRICA_MAP_BOUNDS,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    await session.close();
  }
}

export async function getZoneAnalytics(zoneId) {
  const session = getDriver().session();

  try {
    const zoneResult = await session.run(
      `
      MATCH (z:ClimateZone {id: $zoneId})
      OPTIONAL MATCH (coop:Cooperative)-[:OPERATES_IN]->(z)
      OPTIONAL MATCH (f:Farmer)-[:DELIVERS_TO]->(coop)
      OPTIONAL MATCH (f)-[:MEMBER_OF]->(ch:Chama)
      RETURN z,
             count(DISTINCT f) AS farmerCount,
             count(DISTINCT coop) AS coopCount,
             count(DISTINCT ch) AS chamaCount
    `,
      { zoneId },
    );

    if (zoneResult.records.length === 0) {
      return null;
    }

    const r = zoneResult.records[0];
    const z = r.get("z").properties;
    const coords = ALL_ZONE_COORDS[zoneId] || ALL_ZONE_COORDS["KE-RIFT-04"];

    const farmersResult = await session.run(
      `
      MATCH (z:ClimateZone {id: $zoneId})<-[:OPERATES_IN]-(coop:Cooperative)<-[:DELIVERS_TO]-(f:Farmer)
      RETURN f.id AS id, f.name AS name, f.status AS status, f.underwriting_state AS state,
             f.crop_type AS crop
      LIMIT 50
    `,
      { zoneId },
    );

    const farmersList = farmersResult.records.map((rec) => ({
      id: rec.get("id"),
      name: rec.get("name"),
      status: rec.get("status"),
      underwriting_state: rec.get("state"),
      crop_type: rec.get("crop"),
    }));

    const mapData = await getMapFarmersData();
    const zoneFarmers = mapData.farmers.filter((f) => f.zone_code === zoneId);
    const approved = zoneFarmers.filter((f) => f.riskTier === "green").length;
    const atRisk = zoneFarmers.filter((f) => f.riskTier === "red").length;
    const avgScore =
      zoneFarmers.length > 0
        ? Math.round(
            (zoneFarmers.reduce((s, f) => s + (f.systemScore || 0), 0) / zoneFarmers.length) * 1000,
          ) / 1000
        : 0;

    const weather = await fetchZoneWeather(zoneId);

    return {
      zoneId,
      name: z.name || coords.name,
      lat: coords.lat,
      lng: coords.lon,
      radiusKm: coords.radiusKm,
      climate: {
        spi: Number(z.current_spi_index) || 0,
        rainfallMm30d: Number(z.rainfall_mm_last_30d) || 0,
        pestProximityKm: Number(z.pest_proximity_km) || 0,
        advisory: z.advisory || null,
        lastSyncIso: z.last_sync_iso || null,
      },
      weather,
      analytics: {
        farmerCount: r.get("farmerCount")?.toNumber?.() ?? zoneFarmers.length,
        cooperativeCount: r.get("coopCount")?.toNumber?.() ?? 0,
        chamaCount: r.get("chamaCount")?.toNumber?.() ?? 0,
        approved,
        atRisk,
        needsReview: zoneFarmers.length - approved - atRisk,
        avgGrowAsiaScore: avgScore,
        riskBreakdown: {
          green: approved,
          amber: zoneFarmers.filter((f) => f.riskTier === "amber").length,
          red: atRisk,
        },
      },
      farmers: farmersList.length ? farmersList : zoneFarmers.slice(0, 20),
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    await session.close();
  }
}
