import {
  getVerificationQueue,
  getAgronomistStats,
  getFarmerFieldInsight,
  listActiveZones,
} from "../services/agronomistService.js";

/** GET /api/agronomist/queue */
export async function getAgronomistQueue(req, res) {
  try {
    const zoneCode = req.query.zone || null;
    const limit = Number(req.query.limit) || 50;
    const queue = await getVerificationQueue({ zoneCode, limit });
    return res.json({ ok: true, queue, count: queue.length });
  } catch (error) {
    console.error("[agronomist/queue]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** GET /api/agronomist/stats */
export async function getAgronomistStatsHandler(req, res) {
  try {
    const stats = await getAgronomistStats();
    return res.json({ ok: true, ...stats });
  } catch (error) {
    console.error("[agronomist/stats]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** GET /api/agronomist/zones */
export async function getAgronomistZones(req, res) {
  try {
    const zones = await listActiveZones();
    return res.json({ ok: true, zones });
  } catch (error) {
    console.error("[agronomist/zones]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** GET /api/agronomist/insight/:farmerId */
export async function getAgronomistInsight(req, res) {
  try {
    const insight = await getFarmerFieldInsight(req.params.farmerId);
    if (!insight) return res.status(404).json({ error: "Farmer not found" });
    return res.json({ ok: true, ...insight });
  } catch (error) {
    console.error("[agronomist/insight]", error);
    return res.status(500).json({ error: error.message });
  }
}
