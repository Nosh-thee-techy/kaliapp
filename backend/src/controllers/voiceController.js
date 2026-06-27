import { normalizeLang } from "../config/languages.js";
import {
  processVoiceTurn,
  transcribeOnly,
  synthesizeOnly,
  isElevenLabsEnabled,
} from "../services/voiceService.js";
import { getVoiceConfig } from "../services/elevenlabsService.js";

/** GET /api/voice — capabilities + Featherless-aligned languages */
export async function getVoiceStatus(_req, res) {
  return res.json(getVoiceConfig());
}

/** POST /api/voice/stt — speech-to-text (ElevenLabs Scribe) */
export async function postVoiceStt(req, res) {
  try {
    if (!isElevenLabsEnabled()) {
      return res.status(503).json({ error: "ElevenLabs not configured", fallback: "browser-stt" });
    }

    const { audio, mimeType = "audio/webm", lang = "en" } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "audio (base64) is required" });
    }

    const result = await transcribeOnly(audio, lang, mimeType);
    return res.json(result);
  } catch (error) {
    console.error("[voice/stt]", error);
    return res.status(500).json({ error: error.message });
  }
}

/** POST /api/voice/tts — text-to-speech (ElevenLabs) */
export async function postVoiceTts(req, res) {
  try {
    const { text, lang = "en", format = "binary" } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const language = normalizeLang(lang);
    const result = await synthesizeOnly(text.trim(), language);

    if (!result.audio) {
      return res.status(503).json({
        error: "ElevenLabs not configured",
        fallback: "browser",
        text: text.trim(),
        lang: language,
      });
    }

    if (format === "json") {
      return res.json({
        text: result.text,
        lang: language,
        mimeType: result.mimeType,
        audio: result.audio.toString("base64"),
        provider: result.provider,
      });
    }

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": result.audio.length,
      "Cache-Control": "no-store",
    });
    return res.send(result.audio);
  } catch (error) {
    console.error("[voice/tts]", error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/voice/sts — speech-to-speech turn
 * audio (base64) → STT → Featherless Kali → TTS → audio (base64)
 * Optional `message` skips STT when text is already known.
 */
export async function postVoiceSts(req, res) {
  try {
    const { audio, mimeType = "audio/webm", lang = "en", context, message } = req.body;
    if (!audio && !message?.trim()) {
      return res.status(400).json({ error: "audio or message is required" });
    }

    if (!isElevenLabsEnabled() && message?.trim()) {
      const turn = await processVoiceTurn({
        message,
        lang,
        context: context || {},
      });
      return res.json({
        transcript: turn.transcript,
        reply: turn.reply,
        lang: turn.lang,
        mimeType: turn.mimeType,
        audio: null,
        providers: { ...turn.providers, stt: "browser", tts: "browser" },
      });
    }

    if (!isElevenLabsEnabled()) {
      return res.status(503).json({ error: "ElevenLabs not configured", fallback: "browser-stt" });
    }

    const turn = await processVoiceTurn({
      audioBase64: audio,
      mimeType,
      message,
      lang,
      context: context || {},
    });

    return res.json({
      transcript: turn.transcript,
      reply: turn.reply,
      lang: turn.lang,
      mimeType: turn.mimeType,
      audio: turn.audio ? turn.audio.toString("base64") : null,
      providers: turn.providers,
    });
  } catch (error) {
    console.error("[voice/sts]", error);
    return res.status(500).json({ error: error.message });
  }
}
