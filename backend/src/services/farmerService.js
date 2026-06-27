import neo4j from "neo4j-driver";
import { getDriver } from "../config/neo4j.js";
import { sendSms } from "./africasTalking.js";

export async function listFarmers({ status, segment, search, page = 1, pageSize = 50 } = {}) {
  const session = getDriver().session();
  const where = [];
  const params = {};

  if (status && status !== "all") {
    where.push("f.status = $status");
    params.status = status;
  }
  if (segment && segment !== "All") {
    where.push("f.demographic_group = $segment");
    params.segment = segment;
  }
  if (search && search.trim()) {
    const term = search.trim();
    where.push(`(
      toLower(f.name) CONTAINS toLower($search) OR
      f.national_id CONTAINS $search OR
      f.id CONTAINS toUpper($search) OR
      replace(f.phone_number, ' ', '') CONTAINS replace($search, ' ', '')
    )`);
    params.search = term;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const skip = (page - 1) * pageSize;

  const countCypher = `
    MATCH (f:Farmer)
    ${whereClause}
    RETURN count(f) AS total
  `;

  const cypher = `
    MATCH (f:Farmer)
    ${whereClause}
    OPTIONAL MATCH (f)-[:DELIVERS_TO]->(coop:Cooperative)
    OPTIONAL MATCH (coop)-[:OPERATES_IN]->(zone:ClimateZone)
    RETURN f, coop, zone
    ORDER BY f.submitted_iso DESC
    SKIP $skip
    LIMIT $limit
  `;

  try {
    const countResult = await session.run(countCypher, params);
    const total = countResult.records[0]?.get("total").toNumber() || 0;

    const result = await session.run(cypher, { ...params, skip: neo4j.int(skip), limit: neo4j.int(pageSize) });
    const farmers = result.records.map((r) => {
      const f = r.get("f").properties;
      const coop = r.get("coop")?.properties;
      const zone = r.get("zone")?.properties;
      return {
        id: f.id,
        nationalId: f.national_id,
        name: f.name,
        phone: f.phone_number,
        vulnerabilityTag: f.vulnerability_tag,
        segment: f.demographic_group,
        cooperative: coop?.name || "",
        coopCode: coop?.id || "",
        zoneCode: zone?.id || "",
        zoneName: zone?.name || "",
        requestedKes: toNum(f.requested_kes),
        acreage: toNum(f.acreage),
        status: f.status || "ready_for_review",
        hasLandOwnership: f.has_land_ownership ? 1 : 0,
        leaseDurationMonths: toNum(f.lease_duration_months),
        cooperativeDeliveryYears: toNum(f.cooperative_delivery_years),
        chamaMonthsConsistent: toNum(f.chama_months_consistent),
        mobileMoneyInflowsKes: toNum(f.mobile_money_inflows_kes),
        harvestMonth: f.harvest_month,
        cropType: f.crop_type,
        registeredVia: f.registered_via,
        submittedIso: f.submitted_iso,
      };
    });
    return { farmers, total, page, pageSize };
  } finally {
    await session.close();
  }
}

export async function recordDecision(lookup, { decision, stance, notes, officer, score }) {
  const session = getDriver().session();
  const statusMap = {
    Approved: "disbursed",
    Referred: "escalated",
    Declined: "escalated",
  };
  const newStatus = statusMap[decision] || "ready_for_review";

  const cypher = `
    MATCH (f:Farmer)
    WHERE f.id = $lookup OR f.national_id = $lookup
    SET f.status = $status,
        f.last_decision = $decision,
        f.last_stance = $stance,
        f.last_decision_notes = $notes,
        f.last_decision_iso = datetime()
    WITH f
    CREATE (a:AuditEntry {
      id: randomUUID(),
      decision: $decision,
      stance: $stance,
      notes: $notes,
      officer: $officer,
      score: $score,
      timestamp_iso: toString(datetime())
    })
    CREATE (f)-[:DECIDED {at: datetime()}]->(a)
    WITH f, a
    CREATE (sms:SmsMessage {
      id: randomUUID(),
      to: f.phone_number,
      body: $smsBody,
      category: "decision",
      sent_iso: toString(datetime())
    })
    CREATE (f)-[:NOTIFIED]->(sms)
    RETURN f, a, sms
  `;

  const scoreHint = decision === "Approved" ? "Approved" : decision;
  const scorePart = score != null ? `KaLI Rating: ${score}/100. ` : "";
  const smsBody = `${scorePart}${scoreHint}. ${notes ? notes.slice(0, 80) : "Contact your branch officer for details."}`;

  try {
    const result = await session.run(cypher, {
      lookup,
      status: newStatus,
      decision,
      stance,
      notes: notes || "",
      officer: officer || "Branch Officer",
      smsBody,
      score: score ?? null,
    });
    if (result.records.length === 0) return null;
    const f = result.records[0].get("f").properties;
    const sms = result.records[0].get("sms").properties;
    try {
      await sendSms({ to: sms.to, message: sms.body });
    } catch (err) {
      console.warn("[sms] delivery failed (graph node saved):", err.message);
    }
    return { farmer: f, sms };
  } finally {
    await session.close();
  }
}

export async function recordSmsSent(lookup, { body, category = "officer" }) {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer)
      WHERE f.id = $lookup OR f.national_id = $lookup
      CREATE (sms:SmsMessage {
        id: randomUUID(),
        to: f.phone_number,
        body: $body,
        category: $category,
        sent_iso: toString(datetime())
      })
      CREATE (f)-[:NOTIFIED]->(sms)
      RETURN sms
    `,
      { lookup, body, category },
    );
    if (result.records.length === 0) return null;
    return result.records[0].get("sms").properties;
  } finally {
    await session.close();
  }
}

export async function registerFarmerFromUssd({
  nationalId,
  phoneNumber,
  coopCode,
  acreage,
  cropType,
  requestedKes,
}) {
  const session = getDriver().session();
  const kaliId = `F-${Date.now().toString().slice(-4)}`;

  const cypher = `
    MERGE (f:Farmer {national_id: $nationalId})
    ON CREATE SET
      f.id = $kaliId,
      f.phone_number = $phoneNumber,
      f.name = "Pending verification",
      f.demographic_group = "General",
      f.vulnerability_tag = "Smallholder",
      f.has_land_ownership = false,
      f.lease_duration_months = 0,
      f.chama_months_consistent = 0,
      f.mobile_money_inflows_kes = 0,
      f.status = "awaiting_climate",
      f.submitted_iso = toString(datetime()),
      f.registered_via = "USSD"
    SET f.requested_kes = coalesce($requestedKes, f.requested_kes, 35000),
        f.crop_type = coalesce($cropType, f.crop_type, "Maize"),
        f.acreage = coalesce($acreage, f.acreage, 1),
        f.harvest_month = coalesce(f.harvest_month, "TBD")
    WITH f
    OPTIONAL MATCH (coop:Cooperative {id: $coopCode})
    FOREACH (_ IN CASE WHEN coop IS NOT NULL THEN [1] ELSE [] END |
      MERGE (f)-[d:DELIVERS_TO]->(coop)
      ON CREATE SET d.delivery_years = 0, d.volume_tons = 0
    )
    WITH f, coop
    OPTIONAL MATCH (coop)-[:OPERATES_IN]->(zone:ClimateZone)
    OPTIONAL MATCH (f)-[:MEMBER_OF]->(memberCh:Chama)
    OPTIONAL MATCH (ch:Chama)
    WHERE memberCh IS NULL
    WITH f, zone, memberCh, ch
    ORDER BY ch.id
    WITH f, zone, memberCh, head(collect(ch)) AS defaultChama
    FOREACH (_ IN CASE WHEN memberCh IS NULL AND defaultChama IS NOT NULL THEN [1] ELSE [] END |
      MERGE (f)-[:MEMBER_OF]->(defaultChama)
    )
    WITH f, zone
    SET f.status = CASE WHEN zone IS NOT NULL THEN "ready_for_review" ELSE "awaiting_climate" END
    CREATE (sms:SmsMessage {
      id: randomUUID(),
      to: f.phone_number,
      body: "KaLI: Registration received. Your application is in the branch queue for graph review.",
      category: "registration",
      sent_iso: toString(datetime())
    })
    CREATE (f)-[:NOTIFIED]->(sms)
    RETURN f, sms
  `;

  try {
    const result = await session.run(cypher, {
      nationalId,
      kaliId,
      phoneNumber,
      coopCode: coopCode || "COOP-NSH-01",
      acreage: acreage ? Number(acreage) : 1,
      cropType: cropType || "Maize",
      requestedKes: requestedKes ? Number(requestedKes) : 35000,
    });
    if (result.records.length === 0) return null;
    const farmer = result.records[0].get("f").properties;
    const sms = result.records[0].get("sms").properties;
    try {
      await sendSms({ to: sms.to, message: sms.body });
    } catch (err) {
      console.warn("[sms] registration notify failed (graph node saved):", err.message);
    }
    return farmer;
  } finally {
    await session.close();
  }
}

export async function setFarmerUnderwritingState(lookup, state) {
  if (!lookup) return;
  const session = getDriver().session();
  try {
    await session.run(
      `
      MATCH (f:Farmer)
      WHERE f.id = $lookup OR f.national_id = $lookup
         OR replace(f.phone_number, ' ', '') = replace($lookup, ' ', '')
         OR replace(f.phone_number, ' ', '') ENDS WITH right(replace($lookup, ' ', ''), 9)
      SET f.underwriting_state = $state,
          f.underwriting_updated_iso = toString(datetime())
      RETURN f.id AS id
    `,
      { lookup: String(lookup), state },
    );
  } finally {
    await session.close();
  }
}

export async function findFarmerByPhone(phoneNumber) {
  const session = getDriver().session();
  const normalized = phoneNumber.replace(/\s/g, "");
  try {
    const result = await session.run(
      `
      MATCH (f:Farmer)
      WHERE replace(f.phone_number, ' ', '') = $phone
         OR replace(f.phone_number, ' ', '') ENDS WITH right($phone, 9)
      RETURN f
      LIMIT 1
    `,
      { phone: normalized },
    );
    if (result.records.length === 0) return null;
    return result.records[0].get("f").properties;
  } finally {
    await session.close();
  }
}

export async function listPipelineRuns() {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (p:PipelineRun) RETURN p ORDER BY p.last_run_iso DESC`,
    );
    return result.records.map((r) => {
      const p = r.get("p").properties;
      return {
        source: p.source,
        lastRunIso: p.last_run_iso,
        status: p.status,
        message: p.message,
      };
    });
  } finally {
    await session.close();
  }
}

export async function listAuditLog({ limit = 50, farmerId } = {}) {
  const session = getDriver().session();
  const params = { limit: neo4j.int(limit) };
  let match = `MATCH (f:Farmer)-[:DECIDED]->(a:AuditEntry)`;
  if (farmerId) {
    match += ` WHERE f.id = $farmerId OR f.national_id = $farmerId`;
    params.farmerId = farmerId;
  }
  try {
    const result = await session.run(
      `${match}
       RETURN a, f.id AS farmerId, f.name AS farmerName
       ORDER BY a.timestamp_iso DESC
       LIMIT $limit`,
      params,
    );
    return result.records.map((r) => {
      const a = r.get("a").properties;
      return {
        id: a.id,
        farmerId: r.get("farmerId"),
        farmerName: r.get("farmerName"),
        officer: a.officer || "Branch Officer",
        decision: a.decision,
        stance: a.stance,
        notes: a.notes || "",
        score: a.score ?? null,
        timestampIso: a.timestamp_iso,
      };
    });
  } finally {
    await session.close();
  }
}

export async function listSmsMessages({ phone, farmerId, limit = 50 } = {}) {
  const session = getDriver().session();
  const params = { limit: neo4j.int(limit) };
  let where = "";
  if (farmerId) {
    where = `WHERE f.id = $farmerId OR f.national_id = $farmerId`;
    params.farmerId = farmerId;
  } else if (phone) {
    where = `WHERE replace(f.phone_number, ' ', '') = replace($phone, ' ', '')`;
    params.phone = phone.replace(/\s/g, "");
  }
  try {
    const result = await session.run(
      `MATCH (f:Farmer)-[:NOTIFIED]->(sms:SmsMessage)
       ${where}
       RETURN sms, f.id AS farmerId
       ORDER BY sms.sent_iso DESC
       LIMIT $limit`,
      params,
    );
    return result.records.map((r) => {
      const sms = r.get("sms").properties;
      return {
        id: sms.id,
        farmerId: r.get("farmerId"),
        to: sms.to,
        body: sms.body,
        category: sms.category || "decision",
        sentIso: sms.sent_iso,
      };
    });
  } finally {
    await session.close();
  }
}

export async function listClimateZones() {
  const session = getDriver().session();
  try {
    const result = await session.run(`MATCH (z:ClimateZone) RETURN z ORDER BY z.id`);
    return result.records.map((r) => {
      const z = r.get("z").properties;
      return {
        zoneCode: z.id,
        name: z.name,
        spi: toNum(z.current_spi_index),
        rainfallMmLast30d: toNum(z.rainfall_mm_last_30d),
        pestProximityKm: toNum(z.pest_proximity_km),
        advisory: z.advisory || null,
      };
    });
  } finally {
    await session.close();
  }
}

export async function getPortfolioStats() {
  const data = await listFarmers();
  const farmers = data.farmers;
  const zones = await listClimateZones();

  const segments = ["Women", "Youth", "PWD", "General"].map((name) => ({
    name,
    value: farmers.filter((f) => f.segment === name).length,
  }));

  const now = Date.now();
  const weekMs = 7 * 24 * 3600 * 1000;
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const weekEnd = now - i * weekMs;
    const weekStart = weekEnd - weekMs;
    const label = i === 0 ? "Now" : `W-${i}`;
    let requested = 0;
    let sent = 0;
    for (const f of farmers) {
      const t = Date.parse(f.submittedIso);
      if (Number.isNaN(t)) continue;
      if (t >= weekStart && t < weekEnd) requested += 1;
      if (f.status === "disbursed" && t >= weekStart && t < weekEnd) sent += 1;
    }
    return { w: label, requested, sent };
  }).reverse();

  return { segments, zones, weekly, total: farmers.length };
}

export async function getPublicStats() {
  const data = await listFarmers();
  const farmers = data.farmers;
  const zones = await listClimateZones();
  return {
    ready: farmers.filter((f) => f.status === "ready_for_review").length,
    escalated: farmers.filter((f) => f.status === "escalated").length,
    advisories: zones.filter((z) => z.advisory).length,
    womenYouth: farmers.filter((f) => f.segment === "Women" || f.segment === "Youth").length,
    total: farmers.length,
  };
}

export async function findUniqueFarmers() {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (f:Farmer)
      WITH f.phone_number AS phone, collect(f) AS farmers
      WHERE size(farmers) > 1
      UNWIND farmers AS f
      RETURN f.id AS id, f.name AS name, f.phone_number AS phone
      ORDER BY f.submitted_iso DESC
    `);
    return result.records.map((r) => ({
      id: r.get("id"),
      name: r.get("name"),
      phone: r.get("phone"),
    }));
  } finally {
    await session.close();
  }
}

function toNum(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}
