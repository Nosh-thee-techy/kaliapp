import { getDriver } from "../config/neo4j.js";

const GROW_ASIA_CYPHER = `
  MATCH (f:Farmer)
  WHERE replace(f.phone_number, ' ', '') = $phone
     OR replace(f.phone_number, ' ', '') ENDS WITH right($phone, 9)
     OR f.id = $lookup OR f.national_id = $lookup
  OPTIONAL MATCH (f)-[d:DELIVERS_TO]->(c:Cooperative)
  OPTIONAL MATCH (f)-[:MEMBER_OF]->(ch:Chama)
  OPTIONAL MATCH (f)-[g:GUARANTEES]-(peer:Farmer)
  OPTIONAL MATCH (f)-[:DELIVERS_TO]->(:Cooperative)-[:OPERATES_IN]->(cz:ClimateZone)
  WITH f, d, ch, count(DISTINCT g) AS guaranteeCount, cz
  RETURN
    f.id AS farmerId,
    f.name AS name,
    f.phone_number AS phone,
    f.status AS status,
    f.underwriting_state AS underwriting_state,
    coalesce(d.consistency_score, toFloat(coalesce(d.delivery_years, 0)) / 5.0) * 0.45 AS supply_chain_weight,
    (CASE
      WHEN coalesce(ch.status, '') = 'VERIFIED' OR coalesce(ch.repayment_rate_pct, 0) >= 90 THEN 0.25
      WHEN coalesce(ch.repayment_rate_pct, 0) >= 80 THEN 0.12
      ELSE 0
    END) + (guaranteeCount * 0.10) AS social_weight,
    CASE
      WHEN coalesce(cz.current_spi_index, 0) > -1.0 THEN 0.10
      ELSE 0.02
    END AS climate_weight,
    CASE
      WHEN coalesce(f.resident_years, 0) >= 5 THEN 0.10
      WHEN coalesce(f.resident_years, 0) >= 2 THEN 0.05
      ELSE 0
    END AS stability_weight,
    coalesce(cz.current_spi_index, 0) AS spi,
    coalesce(ch.id, '') AS chama_id,
    coalesce(ch.name, '') AS chama_name,
    coalesce(cz.id, '') AS zone_code
  LIMIT 1
`;

/**
 * Grow Asia / SAFIRA weighted graph score (0–1 scale).
 * @param {{ phone?: string, lookup?: string }} params
 */
export async function executeGraphScoreQuery({ phone, lookup } = {}) {
  const session = getDriver().session();
  const normalizedPhone = (phone || "").replace(/\s/g, "");

  try {
    const result = await session.run(GROW_ASIA_CYPHER, {
      phone: normalizedPhone,
      lookup: lookup || "",
    });

    if (result.records.length === 0) return null;

    const r = result.records[0];
    const supply = num(r.get("supply_chain_weight"));
    const social = num(r.get("social_weight"));
    const climate = num(r.get("climate_weight"));
    const stability = num(r.get("stability_weight"));
    const systemScore = supply + social + climate + stability;
    const spi = num(r.get("spi"));

    let riskTier = "amber";
    if (systemScore >= 0.65 && spi > -1.0) riskTier = "green";
    else if (systemScore < 0.45 || spi <= -1.5) riskTier = "red";

    return {
      farmerId: r.get("farmerId"),
      name: r.get("name"),
      phone: r.get("phone"),
      status: r.get("status"),
      underwriting_state: r.get("underwriting_state"),
      systemScore: Math.round(systemScore * 1000) / 1000,
      supply_chain_weight: supply,
      social_weight: social,
      climate_weight: climate,
      stability_weight: stability,
      spi,
      chama_id: r.get("chama_id"),
      chama_name: r.get("chama_name"),
      zone_code: r.get("zone_code"),
      riskTier,
      approved: systemScore >= 0.65,
    };
  } finally {
    await session.close();
  }
}

function num(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}
