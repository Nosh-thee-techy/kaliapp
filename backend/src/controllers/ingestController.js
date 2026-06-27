import { handleLoanApplicationWorkflow } from "../services/underwriterAgent.js";
import { parseIncomingIntent } from "../services/featherlessService.js";

/**
 * Unified ingest — normalizes USSD, Voice, and Officer payloads.
 *
 * Body: {
 *   channel: 'ussd' | 'voice' | 'officer',
 *   phone: string,
 *   text?: string,
 *   lang?: 'en' | 'sw' | 'sheng',
 *   nationalId?: string,
 *   coopCode?: string,
 *   acreage?: number,
 *   cropType?: string,
 *   farmerId?: string,
 *   requestedKes?: number,
 *   officerId?: string
 * }
 */
export async function postIngest(req, res) {
  try {
    const {
      channel = "officer",
      phone,
      text,
      lang = "en",
      nationalId,
      coopCode,
      acreage,
      cropType,
      farmerId,
      requestedKes,
      officerId,
    } = req.body;

    if (!phone && !farmerId && !nationalId) {
      return res.status(400).json({ error: "phone, farmerId, or nationalId is required" });
    }

    const result = await handleLoanApplicationWorkflow({
      id: req.body.id,
      channel,
      phone,
      text,
      lang,
      nationalId,
      coopCode,
      acreage,
      cropType,
      lookup: farmerId || nationalId,
      farmerId,
      requestedKes,
      officerId: officerId || req.officer?.name,
    });

    return res.status(result.ok ? 200 : 422).json(result);
  } catch (error) {
    console.error("[ingest]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** Parse-only endpoint for testing Featherless without full workflow. */
export async function postIngestParse(req, res) {
  try {
    const { text, lang = "en" } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    const parsed = await parseIncomingIntent(text, lang);
    return res.json({ parsed });
  } catch (error) {
    console.error("[ingest/parse]", error);
    return res.status(500).json({ error: error.message });
  }
}
