import { calculateGraphScore } from "../services/scoringEngine.js";
import { executeGraphScoreQuery } from "../services/growAsiaScoring.js";
import { unifiedStance } from "../services/scoringUnified.js";
import {
  listFarmers,
  recordDecision,
  recordSmsSent,
  recordSmsByPhone,
  listPipelineRuns,
  listAuditLog,
  listSmsMessages,
  getPortfolioStats,
  getPublicStats as fetchPublicStats,
  findUniqueFarmers,
} from "../services/farmerService.js";
import { sendSms, isAfricasTalkingEnabled } from "../services/africasTalking.js";
import { syncClimatePipeline } from "../services/climatePipeline.js";
import { generateCreditNarrative, isFeatherlessEnabled } from "../services/featherlessService.js";
import { createMasumiPaymentIntent, isMasumiEnabled } from "../services/masumiService.js";
import { mlApproveProbability, blendedGraphMlScore, isMlEnabled } from "../services/mlScoringService.js";
import { USSD_SHORTCODE, USSD_SESSION_TTL_SEC } from "../config/ussd.js";

export async function getScorecard(req, res) {
  try {
    const assessment = await calculateGraphScore(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: "Farmer not tracked in agricultural network" });
    }
    const growAsia = await executeGraphScoreQuery({ lookup: req.params.id });
    const unified = unifiedStance({
      growAsiaScore: growAsia?.systemScore,
      graphScore: assessment.aggregate_score,
    });
    const mlFeatures = {
      cooperative_delivery_years: assessment.cooperative_delivery_years,
      chama_months_consistent: assessment.chama_months_consistent,
      chama_repayment_rate_pct: assessment.graph_context?.chama_repayment_rate_pct || 0,
      mobile_money_inflows_kes: assessment.mobile_money_inflows_kes,
      has_land_ownership: assessment.has_land_ownership,
      lease_duration_months: assessment.lease_duration_months,
      is_guaranteed: assessment.graph_context?.is_guaranteed || false,
      spi_index: assessment.climate?.spi || 0,
      pest_proximity_km: assessment.climate?.pest_proximity_km || 999,
      acreage: assessment.acreage || 0,
    };
    const mlResult = mlApproveProbability(mlFeatures);
    const blended = blendedGraphMlScore(assessment.total, assessment.band, mlResult);
    return res.json({
      ...assessment,
      grow_asia: growAsia,
      unified,
      ml: mlResult,
      blended,
    });
  } catch (error) {
    console.error("[scorecard]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getFarmers(req, res) {
  try {
    const result = await listFarmers({
      status: req.query.status,
      segment: req.query.segment,
      search: req.query.q,
      page: Number(req.query.page) || 1,
      pageSize: Math.min(Number(req.query.pageSize) || 50, 200),
    });
    return res.json(result);
  } catch (error) {
    console.error("[farmers]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function postDecision(req, res) {
  try {
    const { decision, stance, notes, officer } = req.body;
    if (!decision) {
      return res.status(400).json({ error: "decision is required" });
    }
    const assessment = await calculateGraphScore(req.params.id);
    const result = await recordDecision(req.params.id, {
      decision,
      stance,
      notes,
      officer: officer || req.officer?.name || "Branch Officer",
      score: assessment?.aggregate_score ?? assessment?.total ?? null,
    });
    if (!result) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    return res.json({
      ok: true,
      farmer: result.farmer,
      sms: result.sms,
    });
  } catch (error) {
    console.error("[decision]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function postSmsToFarmer(req, res) {
  try {
    const { body, category } = req.body;
    if (!body) {
      return res.status(400).json({ error: "SMS body is required" });
    }
    const sms = await recordSmsSent(req.params.id, {
      body,
      category: category || "officer",
    });
    if (!sms) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    try {
      await sendSms({ to: sms.to, message: sms.body });
    } catch (err) {
      console.warn("[sms] delivery failed (graph node saved):", err.message);
    }
    return res.json({ ok: true, sms, delivered: isAfricasTalkingEnabled() });
  } catch (error) {
    console.error("[sms]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** Public simulator — record + stub-deliver SMS by farmer phone (no Africa's Talking required). */
export async function postSimulateSms(req, res) {
  try {
    const { phone, body, category } = req.body;
    if (!phone?.trim()) {
      return res.status(400).json({ error: "phone is required" });
    }
    if (!body?.trim()) {
      return res.status(400).json({ error: "SMS body is required" });
    }
    const sms = await recordSmsByPhone(phone.trim(), {
      body: body.trim(),
      category: category || "explainability",
    });
    if (!sms) {
      return res.status(404).json({ error: "No farmer registered for this phone number" });
    }
    try {
      await sendSms({ to: sms.to, message: sms.body });
    } catch (err) {
      console.warn("[sms/simulate] delivery failed (graph node saved):", err.message);
    }
    return res.json({
      ok: true,
      sms: {
        id: sms.id,
        to: sms.to,
        body: sms.body,
        category: sms.category || category || "explainability",
        sentIso: sms.sent_iso,
      },
      delivered: isAfricasTalkingEnabled(),
      mode: isAfricasTalkingEnabled() ? "live" : "simulator",
    });
  } catch (error) {
    console.error("[sms/simulate]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getFarmersDuplicateCheck(req, res) {
  try {
    const duplicates = await findUniqueFarmers();
    return res.json({ duplicates });
  } catch (error) {
    console.error("[farmers/duplicates]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getPipeline(req, res) {
  try {
    const runs = await listPipelineRuns();
    return res.json({ runs, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[pipeline]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function postPipelineSync(_req, res) {
  try {
    const result = await syncClimatePipeline();
    const runs = await listPipelineRuns();
    return res.json({ ok: true, ...result, runs });
  } catch (error) {
    console.error("[pipeline/sync]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getAudit(req, res) {
  try {
    const entries = await listAuditLog({
      limit: Number(req.query.limit) || 50,
      farmerId: req.query.farmerId,
    });
    return res.json({ entries, count: entries.length });
  } catch (error) {
    console.error("[audit]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getSms(req, res) {
  try {
    const messages = await listSmsMessages({
      phone: req.query.phone,
      farmerId: req.query.farmerId,
      limit: Number(req.query.limit) || 50,
    });
    return res.json({ messages, count: messages.length });
  } catch (error) {
    console.error("[sms]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getPortfolio(req, res) {
  try {
    const stats = await getPortfolioStats();
    return res.json({ ...stats, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[portfolio]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getPublicStats(req, res) {
  try {
    const stats = await fetchPublicStats();
    return res.json(stats);
  } catch (error) {
    console.error("[public-stats]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function healthCheck(_req, res) {
  try {
    const { verifyConnectivity } = await import("../config/neo4j.js");
    await verifyConnectivity();
    return res.json({
      status: "ok",
      engine: "neo4j",
      service: "kali-backend",
      partner_tech: {
        featherless: isFeatherlessEnabled(),
        masumi: isMasumiEnabled(),
        neo4j: true,
        africas_talking: Boolean(process.env.AT_API_KEY),
      },
      ussd: {
        shortcode: USSD_SHORTCODE,
        sessionTtlSec: USSD_SESSION_TTL_SEC,
        sessionStore: process.env.REDIS_URL?.trim() ? "redis" : "memory",
        fsm: true,
      },
    });
  } catch (error) {
    return res.status(503).json({ status: "degraded", error: error.message });
  }
}

export async function getAiNarrative(req, res) {
  try {
    const assessment = await calculateGraphScore(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    const narrative = await generateCreditNarrative(assessment);
    return res.json({
      farmerId: assessment.id,
      narrative: narrative.narrative,
      model: narrative.model,
      provider: narrative.provider,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ai-narrative]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function postMasumiDisburse(req, res) {
  try {
    const { amount, officerId } = req.body;
    const assessment = await calculateGraphScore(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    const payment = await createMasumiPaymentIntent({
      farmerId: assessment.id,
      farmerName: assessment.name,
      amount: amount || assessment.requested_kes,
      currency: "KES",
      officerId: officerId || req.officer?.name || "Branch Officer",
      loanId: `LN-${assessment.id}-${Date.now().toString(36).toUpperCase()}`,
    });
    return res.json(payment);
  } catch (error) {
    console.error("[masumi]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getPartnerTechStatus(_req, res) {
  return res.json({
    neo4j: { enabled: true, provider: "Neo4j Graph Database", configured: true },
    featherless: { enabled: isFeatherlessEnabled(), provider: "Featherless AI", configured: Boolean(process.env.FEATHERLESS_API_KEY) },
    masumi: { enabled: isMasumiEnabled(), provider: "Masumi Payment Network", configured: Boolean(process.env.MASUMI_API_KEY) },
    africas_talking: { enabled: Boolean(process.env.AT_API_KEY), provider: "Africa's Talking", configured: Boolean(process.env.AT_API_KEY) },
    lovable: { enabled: true, provider: "Lovable AI App Builder (preview)", configured: true },
    ml_scoring: { enabled: isMlEnabled(), provider: "KaLI ML Engine (Logistic Regression, 15k pilot profiles)", configured: true },
    open_meteo: { enabled: true, provider: "Open-Meteo Free Weather API", configured: true },
  });
}

export async function getGraphData(_req, res) {
  const { getDriver } = await import("../config/neo4j.js");
  const session = getDriver().session();
  try {
    const nodeQuery = `
      MATCH (n)
      WHERE n:Farmer OR n:Cooperative OR n:ClimateZone OR n:Chama OR n:FarmPlot
      RETURN n, labels(n) AS lbs
    `;
    const nodeResult = await session.run(nodeQuery);
    const nodes = nodeResult.records.map((r) => {
      const n = r.get("n").properties;
      const lbs = r.get("lbs");
      const type = lbs.includes("Farmer") ? "farmer"
        : lbs.includes("Cooperative") ? "cooperative"
        : lbs.includes("ClimateZone") ? "zone"
        : lbs.includes("Chama") ? "chama"
        : "plot";
      return {
        id: n.id,
        nationalId: n.national_id,
        name: n.name || "",
        type,
        score: n.current_spi_index ?? null,
      };
    });

    const relQuery = `
      MATCH (a)-[r]->(b)
      WHERE (a:Farmer OR a:Cooperative OR a:ClimateZone OR a:Chama OR a:FarmPlot)
        AND (b:Farmer OR b:Cooperative OR b:ClimateZone OR b:Chama OR b:FarmPlot)
      RETURN
        coalesce(a.id, a.national_id) AS src,
        coalesce(b.id, b.national_id) AS tgt,
        type(r) AS relType
    `;
    const relResult = await session.run(relQuery);
    const links = relResult.records.map((r) => ({
      source: r.get("src"),
      target: r.get("tgt"),
      type: r.get("relType"),
    }));

    // add IN_ZONE edges from plots to zones for visualization continuity
    return res.json({ nodes, links });
  } finally {
    await session.close();
  }
}

export async function getMapFarmers(_req, res) {
  try {
    const { getMapFarmersData } = await import("../services/mapService.js");
    const data = await getMapFarmersData();
    return res.json(data);
  } catch (error) {
    console.error("[map/farmers]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getMapZoneAnalytics(req, res) {
  try {
    const { getZoneAnalytics } = await import("../services/mapService.js");
    const data = await getZoneAnalytics(req.params.zoneId);
    if (!data) {
      return res.status(404).json({ error: "Climate zone not found" });
    }
    return res.json(data);
  } catch (error) {
    console.error("[map/zone]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getMapZoneWeather(req, res) {
  try {
    const { fetchZoneWeather } = await import("../services/weatherService.js");
    const data = await fetchZoneWeather(req.params.zoneId);
    return res.json(data);
  } catch (error) {
    console.error("[map/weather]", error);
    return res.status(500).json({ error: error.message });
  }
}
