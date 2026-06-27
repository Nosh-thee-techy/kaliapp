import { routeExplainability } from "../services/explainabilityService.js";
import { parseIncomingIntent, generateKaliVoiceReply } from "../services/featherlessService.js";
import { synthesizeSpeech, isElevenLabsEnabled } from "../services/elevenlabsService.js";
import { normalizeLang, SUPPORTED_LANGS } from "../config/languages.js";
import { recordSmsByPhone, recordSmsSent } from "../services/farmerService.js";
import { sendSms } from "../services/africasTalking.js";
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

/** Agent chat — parse intent, explain score, or voice conversation. POST /api/agent/chat */
export async function postAgentChat(req, res) {
  try {
    const { message, lookup, lang = "en", mode = "auto", context } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const language = normalizeLang(lang);

    if (mode === "voice") {
      const reply = await generateKaliVoiceReply(message.trim(), language, context || {});
      await persistAgentSms(lookup, reply, "explainability");
      return res.json({
        type: "voice",
        lang: language,
        reply,
        provider: "Featherless AI",
      });
    }

    if (mode === "parse" || (!lookup && mode === "auto")) {
      const parsed = await parseIncomingIntent(message, language);
      const reply = buildParseReply(parsed, language);
      await persistAgentSms(lookup, reply, "registration");
      return res.json({
        type: "parse",
        lang: language,
        parsed,
        reply,
      });
    }

    if (!lookup) {
      return res.status(400).json({ error: "lookup required for score explanation" });
    }

    const explained = await routeExplainability(lookup, language, { channel: "app" });
    if (!explained.ok) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    await persistAgentSms(lookup, explained.farmer.sms, "explainability");

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

async function persistAgentSms(lookup, body, category) {
  if (!lookup || !body?.trim()) return;
  try {
    const sms =
      String(lookup).includes("+") || /^\d{9,}$/.test(String(lookup).replace(/\D/g, ""))
        ? await recordSmsByPhone(String(lookup), { body: body.trim(), category })
        : await recordSmsSent(String(lookup), { body: body.trim(), category });
    if (sms?.to) {
      await sendSms({ to: sms.to, message: sms.body }).catch(() => {});
    }
  } catch (err) {
    console.warn("[agent/chat→sms]", err.message);
  }
}

export async function getSupportedLanguages(_req, res) {
  return res.json({
    languages: Object.values(SUPPORTED_LANGS),
    smsMaxChars: Number(process.env.FARMER_SMS_MAX_CHARS) || 160,
    elevenLabsEnabled: isElevenLabsEnabled(),
    voiceApi: "/api/voice",
  });
}

/** Text-to-speech for Kali voice. POST /api/agent/tts */
export async function postAgentTts(req, res) {
  try {
    const { text, lang = "en" } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const language = normalizeLang(lang);
    const audio = await synthesizeSpeech(text.trim(), language);

    if (!audio) {
      return res.status(503).json({
        error: "ElevenLabs not configured",
        fallback: "browser",
        text: text.trim(),
      });
    }

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audio.length,
      "Cache-Control": "no-store",
    });
    return res.send(audio);
  } catch (error) {
    console.error("[agent/tts]", error);
    return res.status(500).json({ error: error.message });
  }
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
