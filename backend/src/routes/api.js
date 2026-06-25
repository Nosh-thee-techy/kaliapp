import { Router } from "express";
import {
  getScorecard,
  getFarmers,
  postDecision,
  getPipeline,
  postPipelineSync,
  getAudit,
  getSms,
  getPortfolio,
  getPublicStats,
  healthCheck,
} from "../controllers/scorecardController.js";
import authRoutes from "./auth.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

const PUBLIC = new Set(["/health", "/stats/public", "/sms"]);

router.use("/auth", authRoutes);

router.use((req, res, next) => {
  if (PUBLIC.has(req.path)) return next();
  return requireAuth(req, res, next);
});

router.get("/health", healthCheck);
router.get("/stats/public", getPublicStats);
router.get("/sms", getSms);

router.get("/pipeline", getPipeline);
router.post("/pipeline/sync", postPipelineSync);
router.get("/audit", getAudit);
router.get("/stats/portfolio", getPortfolio);
router.get("/farmers", getFarmers);
router.get("/scorecard/:id", getScorecard);
router.post("/farmers/:id/decision", postDecision);

export default router;
