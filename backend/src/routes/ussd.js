import { Router } from "express";
import { handleUssd, handleVoiceIngest } from "../controllers/ussdController.js";

const router = Router();

router.post("/ussd", handleUssd);
router.post("/callback", handleUssd);
router.post("/voice", handleVoiceIngest);

export default router;
