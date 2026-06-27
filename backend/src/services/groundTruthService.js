import { getDriver } from "../config/neo4j.js";

const MITIGATION_BONUS = Number(process.env.GROUND_TRUTH_SCORE_BONUS) || 8;

/** Record active macro alert when climate pipeline finds an advisory. */
export async function upsertClimateAlert(session, { zoneCode, advisory, spi, syncedAt }) {
  if (!advisory) return null;

  await session.run(
    `
    MATCH (z:ClimateZone {id: $zoneCode})
    OPTIONAL MATCH (z)<-[:AFFECTS]-(old:ClimateAlert {active: true})
    SET old.active = false
    CREATE (a:ClimateAlert {
      id: randomUUID(),
      zone_code: $zoneCode,
      advisory: $advisory,
      spi: $spi,
      source: "macro-intelligence",
      active: true,
      created_iso: $syncedAt
    })
    MERGE (a)-[:AFFECTS]->(z)
    RETURN a.id AS id
  `,
    { zoneCode, advisory, spi, syncedAt },
  );
}

/** Sync action items from readiness/Featherless into graph (advisory → plan). */
export async function syncActionPlan(farmerId, zoneCode, actionPoints, advisory) {
  const session = getDriver().session();
  try {
    let resolvedZone = zoneCode || null;
    if (!resolvedZone) {
      const zoneResult = await session.run(
        `
        MATCH (f:Farmer {id: $farmerId})-[:DELIVERS_TO]->(:Cooperative)-[:OPERATES_IN]->(z:ClimateZone)
        RETURN z.id AS zoneCode
        LIMIT 1
      `,
        { farmerId },
      );
      resolvedZone = zoneResult.records[0]?.get("zoneCode") || "UNZONED";
    }

    const planId = `PLAN-${farmerId}`;
    await session.run(
      `
      MATCH (f:Farmer {id: $farmerId})
      MERGE (p:ActionPlan {id: $planId})
      ON CREATE SET p.created_iso = toString(datetime())
      SET p.zone_code = $zoneCode,
          p.advisory_snapshot = $advisory,
          p.updated_iso = toString(datetime()),
          p.active = true
      MERGE (f)-[:HAS_PLAN]->(p)
      WITH f, p
      OPTIONAL MATCH (z:ClimateZone {id: $zoneCode})<-[:AFFECTS]-(a:ClimateAlert {active: true})
      FOREACH (_ IN CASE WHEN a IS NOT NULL THEN [1] ELSE [] END |
        MERGE (p)-[:RESPONDS_TO]->(a)
      )
    `,
      { farmerId, planId, zoneCode: resolvedZone, advisory: advisory || null },
    );

    for (let i = 0; i < actionPoints.length; i++) {
      const ap = actionPoints[i];
      const actionId = `ACT-${farmerId}-${i}`;
      await session.run(
        `
        MATCH (f:Farmer {id: $farmerId})-[:HAS_PLAN]->(p:ActionPlan {id: $planId})
        MERGE (item:ActionItem {id: $actionId})
        SET item.title = $title,
            item.sort_order = $order,
            item.source = $source,
            item.farmer_id = $farmerId
        MERGE (p)-[:INCLUDES]->(item)
        MERGE (f)-[:ASSIGNED]->(item)
      `,
        {
          farmerId,
          planId,
          actionId,
          title: ap.title,
          order: i,
          source: ap.source || "featherless",
        },
      );
      ap.id = actionId;
    }

    return await loadActionStatuses(farmerId, actionPoints);
  } finally {
    await session.close();
  }
}

export async function loadActionStatuses(farmerId, actionPoints) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer {id: $farmerId})-[:ASSIGNED]->(item:ActionItem)
      OPTIONAL MATCH (f)-[c:COMPLETED]->(item)
      OPTIONAL MATCH (f)-[:GROUND_TRUTH]->(v:FieldVerification)-[:CONFIRMS]->(item)
      RETURN item.id AS id, item.title AS title, c IS NOT NULL AS selfDone,
             v IS NOT NULL AS fieldVerified, v.type AS verifyType
      ORDER BY item.sort_order
    `,
      { farmerId },
    );

    const byId = new Map(
      result.records.map((r) => [
        r.get("id"),
        {
          done: r.get("selfDone"),
          fieldVerified: r.get("fieldVerified"),
          verifyType: r.get("verifyType"),
        },
      ]),
    );

    return actionPoints.map((ap) => {
      const st = byId.get(ap.id);
      return {
        ...ap,
        done: st?.done || false,
        fieldVerified: st?.fieldVerified || false,
        verifyType: st?.verifyType || null,
      };
    });
  } finally {
    await session.close();
  }
}

/** Farmer marks an advisory action complete (self-report). */
export async function completeAction(farmerId, actionId) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer {id: $farmerId})-[:ASSIGNED]->(item:ActionItem {id: $actionId})
      MERGE (f)-[c:COMPLETED]->(item)
      SET c.completed_iso = toString(datetime()), c.self_reported = true
      RETURN item.title AS title
    `,
      { farmerId, actionId },
    );
    return result.records.length > 0;
  } finally {
    await session.close();
  }
}

/** Officer / agronomist ground-truth verification (FarmerQue layer). */
export async function recordFieldVerification(farmerId, { actionId, type, officerId, notes }) {
  const session = getDriver().session();
  const verifyType = type || "checkin";
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer {id: $farmerId})
      OPTIONAL MATCH (f)-[:ASSIGNED]->(item:ActionItem {id: $actionId})
      CREATE (v:FieldVerification {
        id: randomUUID(),
        type: $verifyType,
        officer: $officerId,
        notes: $notes,
        verified_iso: toString(datetime())
      })
      MERGE (f)-[:GROUND_TRUTH]->(v)
      FOREACH (_ IN CASE WHEN item IS NOT NULL THEN [1] ELSE [] END |
        MERGE (v)-[:CONFIRMS]->(item)
        MERGE (f)-[c:COMPLETED]->(item)
        SET c.completed_iso = toString(datetime()), c.verified = true
      )
      RETURN v.id AS id, item.title AS actionTitle
    `,
      { farmerId, actionId: actionId || null, verifyType, officerId: officerId || "field-officer", notes: notes || "" },
    );
    return result.records[0]?.get("id") || null;
  } finally {
    await session.close();
  }
}

/**
 * Credit synthesis: macro alert + ground-truth verification → score bonus.
 */
export async function getMitigationBonus(farmerId) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer {id: $farmerId})
      OPTIONAL MATCH (f)-[:DELIVERS_TO]->(:Cooperative)-[:OPERATES_IN]->(z:ClimateZone)
      OPTIONAL MATCH (z)<-[:AFFECTS]-(alert:ClimateAlert {active: true})
      OPTIONAL MATCH (f)-[:GROUND_TRUTH]->(v:FieldVerification)-[:CONFIRMS]->(:ActionItem)
      WHERE alert IS NOT NULL
      RETURN count(DISTINCT alert) > 0 AS hadActiveAlert,
             count(DISTINCT v) AS verifiedCount,
             collect(DISTINCT alert.advisory)[0] AS advisory
    `,
      { farmerId },
    );
    if (result.records.length === 0) {
      return { hadActiveAlert: false, verifiedCount: 0, bonusPoints: 0, advisory: null };
    }
    const r = result.records[0];
    const hadActiveAlert = r.get("hadActiveAlert");
    const verifiedCount =
      r.get("verifiedCount")?.toNumber?.() ?? (Number(r.get("verifiedCount")) || 0);
    const bonusPoints = hadActiveAlert && verifiedCount > 0 ? MITIGATION_BONUS : 0;
    return {
      hadActiveAlert,
      verifiedCount,
      bonusPoints,
      advisory: r.get("advisory"),
    };
  } finally {
    await session.close();
  }
}

export async function getGroundTruthTrail(farmerId) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer {id: $farmerId})
      OPTIONAL MATCH (z:ClimateZone)<-[:OPERATES_IN]-(:Cooperative)<-[:DELIVERS_TO]-(f)
      OPTIONAL MATCH (alert:ClimateAlert {active: true})-[:AFFECTS]->(z)
      OPTIONAL MATCH (f)-[:GROUND_TRUTH]->(v:FieldVerification)
      OPTIONAL MATCH (v)-[:CONFIRMS]->(item:ActionItem)
      RETURN alert.advisory AS advisory, alert.spi AS spi, alert.created_iso AS alertIso,
             collect(DISTINCT {type: v.type, officer: v.officer, iso: v.verified_iso, action: item.title}) AS verifications
    `,
      { farmerId },
    );
    if (!result.records.length) return null;
    const r = result.records[0];
    return {
      advisory: r.get("advisory"),
      spi: r.get("spi"),
      alertIso: r.get("alertIso"),
      verifications: (r.get("verifications") || []).filter((v) => v?.type),
    };
  } finally {
    await session.close();
  }
}
