import { getFarmerReadiness, markReadinessActionComplete } from "../services/readinessService.js";
import { recordFieldVerification } from "../services/groundTruthService.js";
import { findFarmerByLookup } from "../services/farmerLookup.js";

/** GET /api/readiness/:lookup?lang=sw */
export async function getReadiness(req, res) {
  try {
    const lookup = req.params.lookup || req.query.lookup;
    if (!lookup) {
      return res.status(400).json({ error: "lookup is required (KTDA ID, phone, or national ID)" });
    }
    const lang = req.query.lang || "en";
    const result = await getFarmerReadiness(lookup, lang);
    if (!result.ok) {
      return res.status(404).json({ error: "Farmer not found. Check your KTDA or member number." });
    }
    return res.json(result);
  } catch (error) {
    console.error("[readiness]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** POST /api/readiness/:lookup/actions/:actionId/complete */
export async function postReadinessActionComplete(req, res) {
  try {
    const result = await markReadinessActionComplete(req.params.lookup, req.params.actionId);
    if (!result.ok) {
      return res.status(404).json({ error: "Farmer or action not found" });
    }
    return res.json({ ok: true, farmerId: result.farmerId });
  } catch (error) {
    console.error("[readiness/complete]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** POST /api/farmers/:id/verify-field — officer ground-truth (FarmerQue layer) */
export async function postFieldVerification(req, res) {
  try {
    const { actionId, type, notes } = req.body;
    const farmerId = req.params.id;
    const officerId = req.officer?.name || req.body.officerId || "field-officer";

    const verificationId = await recordFieldVerification(farmerId, {
      actionId,
      type: type || "checkin",
      officerId,
      notes,
    });

    if (!verificationId) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    return res.json({
      ok: true,
      verificationId,
      message: "Ground-truth verification recorded. Credit score will reflect on next assessment.",
    });
  } catch (error) {
    console.error("[verify-field]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** POST /api/verify — public lookup variant for demos */
export async function postVerifyByLookup(req, res) {
  try {
    const { lookup, actionId, type, notes, officerId } = req.body;
    if (!lookup) return res.status(400).json({ error: "lookup is required" });
    const farmer = await findFarmerByLookup(lookup);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });

    const verificationId = await recordFieldVerification(farmer.id, {
      actionId,
      type: type || "checkin",
      officerId: officerId || "agronomist",
      notes,
    });

    return res.json({ ok: true, verificationId, farmerId: farmer.id });
  } catch (error) {
    console.error("[verify]", error);
    return res.status(500).json({ error: error.message });
  }
}
