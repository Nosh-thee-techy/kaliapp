import { Router } from "express";
import { handleUssd } from "../controllers/ussdController.js";

const router = Router();

router.post("/ussd", handleUssd);

export default router;
