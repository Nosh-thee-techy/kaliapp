import { routeExplainability } from "../services/explainabilityService.js";
import { parseIncomingIntent } from "../services/featherlessService.js";
import { normalizeLang, SUPPORTED_LANGS } from "../config/languages.js";

/**
 * Dual-output explainability — farmer SMS + officer narrative.
 * POST /api/explain { lookup, lang?, channel? }
 */
export async function postExplain(req, res) {
  try {
    const { lookup, farmerId, phone, lang = "en", channel = "app" } = req.body;
    const id = lookup || farmerId || phone;
    if (!id) {
      return res.status(400).json({ error: "lookup, farmerId, or phone is required" });
    }

    const result = await routeExplainability(id, normalizeLang(lang), { channel });
    if (!result.ok) {
      return res.status(404).json({ error: "Farmer not found" });
    }
    return res.json(result);
  } catch (error) {
    console.error("[explain]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** Agent chat — parse intent or explain score. POST /api/agent/chat */
export async function postAgentChat(req, res) {
  try {
    const { message, lookup, lang = "en", mode = "auto" } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const language = normalizeLang(lang);

    if (mode === "parse" || (!lookup && mode === "auto")) {
      const parsed = await parseIncomingIntent(message, language);
      return res.json({
        type: "parse",
        lang: language,
        parsed,
        reply: buildParseReply(parsed, language),
      });
    }

    if (!lookup) {
      return res.status(400).json({ error: "lookup required for score explanation" });
    }

    const explained = await routeExplainability(lookup, language, { channel: "app" });
    if (!explained.ok) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    return res.json({
      type: "explain",
      lang: language,
      reply: explained.farmer.sms,
      stance: explained.stance,
      unified: explained.unified,
      officerNarrative: explained.officer?.narrative || null,
      provider: explained.farmer.provider,
    });
  } catch (error) {
    console.error("[agent/chat]", error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getSupportedLanguages(_req, res) {
  return res.json({
    languages: Object.values(SUPPORTED_LANGS),
    smsMaxChars: Number(process.env.FARMER_SMS_MAX_CHARS) || 160,
  });
}

function buildParseReply(parsed, lang) {
  const crop = parsed.crop || "—";
  const loc = parsed.location || "—";
  const replies = {
    en: `Got it: ${crop}, location ${loc}. Continue on USSD or submit via your officer.`,
    sw: `Nimeelewa: ${crop}, eneo ${loc}. Endelea kwenye USSD au wasilisha kupitia afisa.`,
    lg: `Nkitegedde: ${crop}, mu ${loc}. Genda mu maaso ne USSD oba omukungu wo.`,
  };
  return replies[lang] || replies.en;
}
