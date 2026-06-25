import { calculateGraphScore } from "../services/scoringEngine.js";
import {
  listFarmers,
  recordDecision,
  listPipelineRuns,
  listAuditLog,
  listSmsMessages,
  getPortfolioStats,
  getPublicStats as fetchPublicStats,
} from "../services/farmerService.js";
import { syncClimatePipeline } from "../services/climatePipeline.js";

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
    const farmers = await listFarmers({
      status: req.query.status,
      segment: req.query.segment,
    });
    return res.json({ farmers, count: farmers.length });
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
    return res.json({ status: "ok", engine: "neo4j", service: "kali-backend" });
  } catch (error) {
    return res.status(503).json({ status: "degraded", error: error.message });
  }
}
