import { Router } from "express";
import {
  getScorecard,
  getFarmers,
  postDecision,
  getPipeline,
  healthCheck,
} from "../controllers/scorecardController.js";

const router = Router();

router.get("/health", healthCheck);
router.get("/pipeline", getPipeline);
router.get("/farmers", getFarmers);
router.get("/scorecard/:id", getScorecard);
router.post("/farmers/:id/decision", postDecision);

export default router;
