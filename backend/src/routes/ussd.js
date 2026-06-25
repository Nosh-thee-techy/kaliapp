import { Router } from "express";
import { handleUssd } from "../controllers/ussdController.js";

const router = Router();

/** Browser simulator + generic JSON clients */
router.post("/ussd", handleUssd);

/** Africa's Talking production callback URL */
router.post("/callback", handleUssd);

export default router;
