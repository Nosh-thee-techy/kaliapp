import { getDriver } from "../config/neo4j.js";

const FARMER_MATCH = `
  MATCH (f:Farmer)
  WHERE f.id = $lookup OR f.national_id = $lookup
`;

const TRAVERSAL = `
  OPTIONAL MATCH (f)-[del:DELIVERS_TO]->(coop:Cooperative)-[:OPERATES_IN]->(zone:ClimateZone)
  OPTIONAL MATCH (f)-[:MEMBER_OF]->(chama:Chama)
  OPTIONAL MATCH (f)<-[:GUARANTEES]-(peer:Farmer)
    WHERE peer.credit_standing = "Excellent"
  OPTIONAL MATCH (f)-[:LOCATED_IN]->(plot:FarmPlot)
`;

/**
 * Graph-native credit score via single-pass Cypher traversal.
 * @param {string} lookup — KaLI id (F-1042) or national ID
 */
export async function calculateGraphScore(lookup) {
  const session = getDriver().session();

  const cypherQuery = `
    ${FARMER_MATCH}
    ${TRAVERSAL}
    RETURN
      f AS farmer,
      del AS coop_metrics,
      coop AS cooperative,
      zone AS climate,
      chama AS social,
      plot AS farm_plot,
      count(peer) > 0 AS is_guaranteed
  `;

  try {
    const result = await session.run(cypherQuery, { lookup });
    if (result.records.length === 0) return null;

    const record = result.records[0];
    const farmer = record.get("farmer").properties;
    const coopRel = record.get("coop_metrics");
    const coop = record.get("cooperative")?.properties || {};
    const climate = record.get("climate")?.properties || {};
    const social = record.get("social")?.properties || {};
    const plot = record.get("farm_plot")?.properties || {};
    const isGuaranteed = record.get("is_guaranteed");
    const coopMetrics = coopRel?.properties || {};

    const deliveryYears = num(coopMetrics.delivery_years, 0);
    const repaymentRate = num(social.repayment_rate_pct, 0);
    const spi = num(climate.current_spi_index, 0);
    const pestKm = num(climate.pest_proximity_km, 999);
    const hasLand = farmer.has_land_ownership === true;
    const leaseMonths = num(farmer.lease_duration_months, 0);

    let score = 50;
    const drivers = [];
    const drags = [];
    let assetSubstituteApplied = false;

    if (deliveryYears >= 3) {
      score += 15;
      drivers.push({
        label: "Cooperative delivery history",
        points: 15,
        detail: `Strong ${deliveryYears}+ year delivery consistency to ${coop.name || "cooperative"}`,
      });
    } else if (deliveryYears >= 1) {
      score += 8;
      drivers.push({
        label: "Emerging cooperative ties",
        points: 8,
        detail: `${deliveryYears} year(s) with ${coop.name || "cooperative"}`,
      });
    } else {
      score -= 10;
      drags.push({
        label: "No cooperative history",
        points: -10,
        detail: "Less than 1 year of verifiable deliveries",
      });
    }

    if (repaymentRate >= 95) {
      score += 15;
      drivers.push({
        label: "Chama collective financial trust",
        points: 15,
        detail: `Excellent group repayment rate (${repaymentRate}%)`,
      });
    } else if (repaymentRate >= 85) {
      score += 8;
      drivers.push({
        label: "Moderate Chama integrity",
        points: 8,
        detail: `Group repayment rate ${repaymentRate}%`,
      });
    }

    if (isGuaranteed) {
      score += 10;
      drivers.push({
        label: "Peer guarantee (trust propagation)",
        points: 10,
        detail: "Credit risk mitigated by verified peer with Excellent standing",
      });
    }

    if (hasLand) {
      score += 10;
      drivers.push({
        label: "Land ownership verified",
        points: 10,
        detail: "Title deed on file",
      });
    } else if (leaseMonths >= 24) {
      assetSubstituteApplied = true;
      score += 15;
      drivers.push({
        label: "Stable lease framework",
        points: 15,
        detail: `${leaseMonths} months lease overrides asset deficit`,
      });
    } else if (deliveryYears >= 2) {
      assetSubstituteApplied = true;
      score += 10;
      drivers.push({
        label: "Supply chain as collateral substitute",
        points: 10,
        detail: `${deliveryYears}y cooperative throughput substitutes for land title`,
      });
    } else {
      score -= 12;
      drags.push({
        label: "No collateral or substitute",
        points: -12,
        detail: "No title, short lease, limited co-op tenure",
      });
    }

    const chamaMonths = num(farmer.chama_months_consistent, 0);
    if (chamaMonths >= 18) {
      score += 12;
      drivers.push({
        label: "Chama saving consistency",
        points: 12,
        detail: `${chamaMonths} consecutive months of group savings`,
      });
    }

    const mpesa = num(farmer.mobile_money_inflows_kes, 0);
    if (mpesa >= 100000) {
      score += 10;
      drivers.push({
        label: "Mobile money cashflow",
        points: 10,
        detail: `KES ${mpesa.toLocaleString()} inflows in last 12mo`,
      });
    } else if (mpesa < 50000 && mpesa > 0) {
      score -= 5;
      drags.push({
        label: "Thin mobile cashflow",
        points: -5,
        detail: `Only KES ${mpesa.toLocaleString()} recorded`,
      });
    }

    if (spi <= -1.5) {
      score -= 15;
      drags.push({
        label: "Severe drought signal (climate contagion)",
        points: -15,
        detail: `SPI ${spi.toFixed(1)} in ${climate.id || "zone"} — shared climate hub risk`,
      });
    } else if (spi <= -1.0) {
      score -= 15;
      drags.push({
        label: "Climate zone dry spell",
        points: -15,
        detail: `Shared climate hub registering rainfall deficits (SPI: ${spi})`,
      });
    } else if (spi <= -0.5) {
      score -= 6;
      drags.push({
        label: "Below-normal rainfall",
        points: -6,
        detail: `SPI ${spi.toFixed(1)} — monitor closely`,
      });
    } else if (spi >= 0.5) {
      score += 6;
      drivers.push({
        label: "Favourable rainfall window",
        points: 6,
        detail: `SPI ${spi.toFixed(1)} supports projected yield`,
      });
    }

    if (pestKm <= 15) {
      score -= 10;
      drags.push({
        label: "Pest proximity alert",
        points: -10,
        detail: `Active infestation tracked within ${pestKm}km of zone`,
      });
    } else     if (pestKm < 25) {
      score -= 8;
      drags.push({
        label: "Pest proximity warning",
        points: -8,
        detail: `Outbreak within ${pestKm}km of zone`,
      });
    }

    const { getMitigationBonus } = await import("./groundTruthService.js");
    const mitigation = await getMitigationBonus(farmer.id);
    if (mitigation.bonusPoints > 0) {
      score += mitigation.bonusPoints;
      drivers.push({
        label: "Ground-truth mitigation verified",
        points: mitigation.bonusPoints,
        detail: `Macro advisory issued; ${mitigation.verifiedCount} field action(s) confirmed on the ground`,
      });
    }

    const aggregateScore = Math.min(Math.max(score, 0), 100);
    const band =
      aggregateScore >= 65 ? "Approve" : aggregateScore >= 50 ? "Refer" : "Decline";
    const recommendation =
      aggregateScore >= 65
        ? "APPROVED (Flexible Crop Alignment)"
        : aggregateScore >= 50
          ? "REFER TO FIELD AUDIT COMMITTEE"
          : "DECLINE — REVIEW DRAGS";

    return {
      id: farmer.id,
      national_id: farmer.national_id,
      name: farmer.name,
      phone: farmer.phone_number,
      demographic: farmer.demographic_group,
      segment: farmer.demographic_group,
      vulnerability_tag: farmer.vulnerability_tag,
      cooperative: coop.name,
      coop_code: coop.id,
      zone_code: climate.id,
      zone_name: climate.name,
      requested_kes: num(farmer.requested_kes, 0),
      acreage: num(plot.acreage) || num(farmer.acreage),
      status: farmer.status || "ready_for_review",
      crop_type: farmer.crop_type,
      harvest_month: farmer.harvest_month,
      registered_via: farmer.registered_via,
      has_land_ownership: hasLand,
      lease_duration_months: leaseMonths,
      cooperative_delivery_years: deliveryYears,
      chama_months_consistent: chamaMonths,
      mobile_money_inflows_kes: mpesa,
      aggregate_score: aggregateScore,
      total: aggregateScore,
      band,
      recommendation,
      drivers,
      drags,
      asset_substitute_applied: assetSubstituteApplied,
      climate: {
        zone_code: climate.id,
        spi,
        rainfall_mm_last_30d: num(climate.rainfall_mm_last_30d, 0),
        pest_proximity_km: pestKm,
        advisory: climate.advisory || null,
        last_sync_iso: climate.last_sync_iso || null,
      },
      graph_context: {
        chama_id: social.id,
        chama_name: social.name,
        chama_repayment_rate_pct: repaymentRate,
        is_guaranteed: isGuaranteed,
        cooperative_id: coop.id,
      },
      ground_truth: mitigation,
    };
  } finally {
    await session.close();
  }
}

function num(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}
