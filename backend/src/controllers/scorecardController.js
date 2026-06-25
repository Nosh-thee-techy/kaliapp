import { calculateGraphScore } from "../services/scoringEngine.js";
import {
  listFarmers,
  recordDecision,
  recordSmsSent,
  listPipelineRuns,
  listAuditLog,
  listSmsMessages,
  getPortfolioStats,
  getPublicStats as fetchPublicStats,
  findUniqueFarmers,
} from "../services/farmerService.js";
import { syncClimatePipeline } from "../services/climatePipeline.js";
import { generateCreditNarrative, isFeatherlessEnabled } from "../services/featherlessService.js";
import { createMasumiPaymentIntent, isMasumiEnabled } from "../services/masumiService.js";

export async function getScorecard(req, res) {
  try {
    const assessment = await calculateGraphScore(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: "Farmer not tracked in agricultural network" });
    }
    return res.json(assessment);
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
    return res.json({ ok: true, sms });
  } catch (error) {
    console.error("[sms]", error);
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
    neo4j: { enabled: true, provider: "Neo4j Graph Database" },
    featherless: { enabled: isFeatherlessEnabled(), provider: "Featherless AI", configured: Boolean(process.env.FEATHERLESS_API_KEY) },
    masumi: { enabled: isMasumiEnabled(), provider: "Masumi Payment Network", configured: Boolean(process.env.MASUMI_API_KEY) },
    africas_talking: { enabled: Boolean(process.env.AT_API_KEY), provider: "Africa's Talking", configured: Boolean(process.env.AT_API_KEY) },
    open_meteo: { enabled: true, provider: "Open-Meteo Free Weather API", configured: true },
  });
}
