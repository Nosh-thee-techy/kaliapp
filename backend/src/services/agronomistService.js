import { getDriver } from "../config/neo4j.js";
import { rankQueue, scoreVisitPriority } from "./agronomistMlService.js";
import { calculateGraphScore } from "./scoringEngine.js";

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function daysSince(iso) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/** Farmers with self-reported actions pending field verification. */
export async function getVerificationQueue({ zoneCode, limit = 50 } = {}) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer)-[:ASSIGNED]->(item:ActionItem)
      OPTIONAL MATCH (f)-[done:COMPLETED]->(item)
      OPTIONAL MATCH (v:FieldVerification)-[:CONFIRMS]->(item)
      WITH f, item, done, v
      WHERE done IS NOT NULL AND v IS NULL
      OPTIONAL MATCH (f)-[:DELIVERS_TO]->(coop:Cooperative)-[:OPERATES_IN]->(z:ClimateZone)
      OPTIONAL MATCH (alert:ClimateAlert {active: true})-[:AFFECTS]->(z)
      WITH f, z, alert, coop,
           collect(DISTINCT {
             id: item.id,
             title: item.title,
             completedIso: done.completed_iso
           }) AS pendingItems
      WHERE ($zoneCode IS NULL OR z.id = $zoneCode)
      RETURN
        f.id AS farmerId,
        f.name AS name,
        f.phone_number AS phone,
        f.crop_type AS crop,
        f.cooperative_delivery_years AS coopYears,
        coop.name AS cooperative,
        z.id AS zoneCode,
        z.name AS zoneName,
        z.current_spi_index AS spi,
        z.pest_proximity_km AS pestKm,
        alert.advisory AS advisory,
        alert IS NOT NULL AS hasActiveAlert,
        pendingItems,
        size(pendingItems) AS pendingCount
      ORDER BY pendingCount DESC
      LIMIT $limit
    `,
      { zoneCode: zoneCode || null, limit: Math.min(limit, 100) },
    );

    const rows = result.records.map((r) => {
      const pendingItems = (r.get("pendingItems") || []).filter((i) => i?.id);
      const oldest = pendingItems
        .map((i) => i.completedIso)
        .filter(Boolean)
        .sort()[0];
      return {
        farmerId: r.get("farmerId"),
        name: r.get("name"),
        phone: r.get("phone"),
        crop: r.get("crop"),
        cooperative: r.get("cooperative"),
        zoneCode: r.get("zoneCode"),
        zoneName: r.get("zoneName"),
        spi: num(r.get("spi")),
        pestProximityKm: num(r.get("pestKm"), 999),
        advisory: r.get("advisory"),
        hasActiveAlert: r.get("hasActiveAlert"),
        pendingActions: num(r.get("pendingCount")),
        pendingItems,
        daysSinceSelfReport: daysSince(oldest),
        cooperativeDeliveryYears: num(r.get("coopYears")),
        creditBand: null,
      };
    });

    for (const row of rows) {
      try {
        const score = await calculateGraphScore(row.farmerId);
        row.creditBand = score?.band || "Refer";
        row.creditScore = score?.aggregate_score ?? null;
      } catch {
        row.creditBand = "Refer";
      }
    }

    return rankQueue(rows);
  } finally {
    await session.close();
  }
}

export async function getAgronomistStats() {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      OPTIONAL MATCH (f:Farmer)-[:ASSIGNED]->(item:ActionItem)
      OPTIONAL MATCH (f)-[done:COMPLETED]->(item)
      OPTIONAL MATCH (v:FieldVerification)-[:CONFIRMS]->(item)
      WITH count(CASE WHEN done IS NOT NULL AND v IS NULL THEN 1 END) AS pendingVerifications
      OPTIONAL MATCH (fv:FieldVerification)
      WHERE fv.verified_iso IS NOT NULL
      WITH pendingVerifications, count(fv) AS totalVerifications
      OPTIONAL MATCH (a:ClimateAlert {active: true})
      RETURN pendingVerifications, totalVerifications, count(DISTINCT a) AS activeAlerts
    `);
    const r = result.records[0];
    const pending =
      r?.get("pendingVerifications")?.toNumber?.() ?? (Number(r?.get("pendingVerifications")) || 0);
    const verified =
      r?.get("totalVerifications")?.toNumber?.() ?? (Number(r?.get("totalVerifications")) || 0);
    const alerts = r?.get("activeAlerts")?.toNumber?.() ?? (Number(r?.get("activeAlerts")) || 0);
    return { pendingVerifications: pending, totalVerifications: verified, activeAlerts: alerts };
  } finally {
    await session.close();
  }
}

export async function getFarmerFieldInsight(farmerId) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer {id: $farmerId})
      OPTIONAL MATCH (f)-[:DELIVERS_TO]->(coop:Cooperative)-[:OPERATES_IN]->(z:ClimateZone)
      OPTIONAL MATCH (alert:ClimateAlert {active: true})-[:AFFECTS]->(z)
      OPTIONAL MATCH (f)-[:ASSIGNED]->(item:ActionItem)
      OPTIONAL MATCH (f)-[done:COMPLETED]->(item)
      OPTIONAL MATCH (v:FieldVerification)-[:CONFIRMS]->(item)
      RETURN f, z, alert, coop,
             collect(DISTINCT {
               id: item.id,
               title: item.title,
               selfDone: done IS NOT NULL,
               verified: v IS NOT NULL
             }) AS actions
    `,
      { farmerId },
    );
    if (!result.records.length) return null;

    const rec = result.records[0];
    const f = rec.get("f").properties;
    const z = rec.get("z")?.properties || {};
    const alert = rec.get("alert")?.properties || null;
    const coop = rec.get("coop")?.properties || {};
    const actions = (rec.get("actions") || []).filter((a) => a?.id);
    const pending = actions.filter((a) => a.selfDone && !a.verified);

    const row = {
      farmerId: f.id,
      name: f.name,
      crop: f.crop_type,
      cooperative: coop.name,
      zoneCode: z.id,
      zoneName: z.name,
      spi: num(z.current_spi_index),
      pestProximityKm: num(z.pest_proximity_km, 999),
      advisory: alert?.advisory || z.advisory || null,
      hasActiveAlert: !!alert,
      pendingActions: pending.length,
      pendingItems: pending,
      daysSinceSelfReport: 0,
      cooperativeDeliveryYears: num(f.cooperative_delivery_years),
      creditBand: null,
    };

    const score = await calculateGraphScore(farmerId);
    row.creditBand = score?.band || "Refer";
    row.creditScore = score?.aggregate_score ?? null;
    row.ml = scoreVisitPriority(row);

    return {
      farmer: {
        id: f.id,
        name: f.name,
        phone: f.phone_number,
        crop: f.crop_type,
        cooperative: coop.name,
        zone: z.name,
        zoneCode: z.id,
      },
      climate: {
        spi: row.spi,
        pestProximityKm: row.pestProximityKm,
        advisory: row.advisory,
        rainfallMm30d: num(z.rainfall_mm_last_30d),
      },
      actions,
      pendingItems: pending,
      credit: { score: row.creditScore, band: row.creditBand },
      ml: row.ml,
      mitigationBonus: score?.ground_truth?.bonusPoints ?? 0,
    };
  } finally {
    await session.close();
  }
}

export async function listActiveZones() {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (z:ClimateZone)
      OPTIONAL MATCH (alert:ClimateAlert {active: true})-[:AFFECTS]->(z)
      RETURN z.id AS id, z.name AS name, alert IS NOT NULL AS hasAlert
      ORDER BY z.name
    `);
    return result.records.map((r) => ({
      id: r.get("id"),
      name: r.get("name"),
      hasAlert: r.get("hasAlert"),
    }));
  } finally {
    await session.close();
  }
}
