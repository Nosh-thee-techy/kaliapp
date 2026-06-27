import { Router } from "express";
import {
  getScorecard,
  getFarmers,
  postDecision,
  postSmsToFarmer,
  postSimulateSms,
  getFarmersDuplicateCheck,
  getPipeline,
  postPipelineSync,
  getAudit,
  getSms,
  getPortfolio,
  getPublicStats,
  healthCheck,
  getAiNarrative,
  postMasumiDisburse,
  getPartnerTechStatus,
  getGraphData,
  getMapFarmers,
  getMapZoneAnalytics,
  getMapZoneWeather,
} from "../controllers/scorecardController.js";
import { postIngest, postIngestParse } from "../controllers/ingestController.js";
import { postExplain, postAgentChat, getSupportedLanguages, postAgentTts } from "../controllers/explainController.js";
import { getVoiceStatus, postVoiceStt, postVoiceTts, postVoiceSts } from "../controllers/voiceController.js";
import { getReadiness, postReadinessActionComplete, postVerifyByLookup, postFieldVerification } from "../controllers/readinessController.js";
import {
  getAgronomistQueue,
  getAgronomistStatsHandler,
  getAgronomistZones,
  getAgronomistInsight,
} from "../controllers/agronomistController.js";
import { getEventStream, getEventStreamStatus } from "../controllers/sseController.js";
import authRoutes from "./auth.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAgronomist, requireBranchOfficer } from "../middleware/roleMiddleware.js";

const router = Router();

const PUBLIC = new Set([
  "/health",
  "/stats/public",
  "/ingest",
  "/ingest/parse",
  "/explain",
  "/agent/chat",
  "/agent/languages",
  "/agent/tts",
  "/voice",
  "/voice/stt",
  "/voice/tts",
  "/voice/sts",
  "/readiness",
  "/verify",
  "/sms",
  "/sms/simulate",
]); // public API routes (no JWT)

router.use("/auth", authRoutes);

router.use((req, res, next) => {
  if (req.path.startsWith("/auth")) return next();
  if (PUBLIC.has(req.path)) return next();
  if (req.path.startsWith("/readiness")) return next();
  if (req.path === "/events/stream") return next();
  return requireAuth(req, res, () => {
    const agronomistPath =
      req.path.startsWith("/agronomist") || /\/verify-field$/.test(req.path);
    if (agronomistPath) return requireAgronomist(req, res, next);
    return requireBranchOfficer(req, res, next);
  });
});

router.get("/health", healthCheck);
router.get("/stats/public", getPublicStats);
router.get("/sms", getSms);
router.post("/sms/simulate", postSimulateSms);

router.post("/ingest", postIngest);
router.post("/ingest/parse", postIngestParse);
router.post("/explain", postExplain);
router.post("/agent/chat", postAgentChat);
router.get("/agent/languages", getSupportedLanguages);
router.post("/agent/tts", postAgentTts);

router.get("/voice", getVoiceStatus);
router.post("/voice/stt", postVoiceStt);
router.post("/voice/tts", postVoiceTts);
router.post("/voice/sts", postVoiceSts);

router.get("/readiness/:lookup", getReadiness);
router.post("/readiness/:lookup/actions/:actionId/complete", postReadinessActionComplete);
router.post("/verify", postVerifyByLookup);

router.get("/events/stream", getEventStream);
router.get("/events/status", getEventStreamStatus);

router.get("/pipeline", getPipeline);
router.post("/pipeline/sync", postPipelineSync);
router.get("/audit", getAudit);
router.get("/stats/portfolio", getPortfolio);
router.get("/farmers", getFarmers);
router.get("/farmers/duplicates", getFarmersDuplicateCheck);
router.get("/scorecard/:id", getScorecard);
router.post("/farmers/:id/decision", postDecision);
router.post("/farmers/:id/verify-field", postFieldVerification);
router.post("/farmers/:id/sms", postSmsToFarmer);
router.get("/farmers/:id/ai-narrative", getAiNarrative);
router.post("/farmers/:id/masumi-disburse", postMasumiDisburse);
router.get("/partner-tech", getPartnerTechStatus);
router.get("/graph-data", getGraphData);
router.get("/map/farmers", getMapFarmers);
router.get("/map/zones/:zoneId/analytics", getMapZoneAnalytics);
router.get("/map/zones/:zoneId/weather", getMapZoneWeather);

router.get("/agronomist/queue", getAgronomistQueue);
router.get("/agronomist/stats", getAgronomistStatsHandler);
router.get("/agronomist/zones", getAgronomistZones);
router.get("/agronomist/insight/:farmerId", getAgronomistInsight);

export default router;
