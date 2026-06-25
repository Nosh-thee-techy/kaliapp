import { calculateGraphScore } from "../services/scoringEngine.js";
import { listFarmers, recordDecision, listPipelineRuns } from "../services/farmerService.js";

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
    const result = await recordDecision(req.params.id, {
      decision,
      stance,
      notes,
      officer,
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

export async function healthCheck(_req, res) {
  try {
    const { verifyConnectivity } = await import("../config/neo4j.js");
    await verifyConnectivity();
    return res.json({ status: "ok", engine: "neo4j", service: "kali-api-core" });
  } catch (error) {
    return res.status(503).json({ status: "degraded", error: error.message });
  }
}
