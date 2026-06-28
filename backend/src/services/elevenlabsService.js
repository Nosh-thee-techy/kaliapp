import { normalizeLang, SUPPORTED_LANGS, getElevenLabsSttCode } from "../config/languages.js";

const ELEVENLABS_API_KEY = (process.env.ELEVENLABS_API_KEY || "").trim();
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
const ELEVENLABS_STT_MODEL = process.env.ELEVENLABS_STT_MODEL || "scribe_v2";

const VOICE_BY_LANG = {
  // Premade voices (free tier) — Rachel (21m00…) requires paid plan
  en: (process.env.ELEVENLABS_VOICE_EN || "EXAVITQu4vr4xnSDxMaL").trim(), // Sarah
  sw: (process.env.ELEVENLABS_VOICE_SW || process.env.ELEVENLABS_VOICE_EN || "EXAVITQu4vr4xnSDxMaL").trim(),
  lg: (process.env.ELEVENLABS_VOICE_LG || process.env.ELEVENLABS_VOICE_EN || "EXAVITQu4vr4xnSDxMaL").trim(),
};

export function isElevenLabsEnabled() {
  return Boolean(ELEVENLABS_API_KEY);
}

export function getVoiceId(lang) {
  return VOICE_BY_LANG[normalizeLang(lang)] || VOICE_BY_LANG.en;
}

export function getSttLanguageCode(lang) {
  return getElevenLabsSttCode(lang);
}

export function getVoiceConfig() {
  return {
    enabled: isElevenLabsEnabled(),
    ttsModel: ELEVENLABS_MODEL,
    sttModel: ELEVENLABS_STT_MODEL,
    languages: Object.values(SUPPORTED_LANGS).map((l) => ({
      code: l.code,
      label: l.label,
      sttCode: l.elevenLabsStt,
      voiceId: getVoiceId(l.code),
    })),
    capabilities: ["stt", "tts", "sts"],
  };
}

/**
 * Speech-to-text via ElevenLabs Scribe (multilingual — en / sw / lg).
 */
export async function transcribeSpeech(audioBuffer, lang = "en", mimeType = "audio/webm") {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs not configured");
  }
  if (!audioBuffer?.length) {
    throw new Error("Empty audio");
  }

  const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("wav") ? "wav" : "webm";
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: mimeType }), `recording.${ext}`);
  formData.append("model_id", ELEVENLABS_STT_MODEL);
  formData.append("language_code", getSttLanguageCode(lang));

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs STT ${res.status}: ${errText.slice(0, 160)}`);
  }

  const data = await res.json();
  const text = String(data.text || data.transcript || "").trim();
  if (!text) {
    throw new Error("No speech detected");
  }
  return text;
}

/**
 * Text-to-speech via ElevenLabs. Returns MP3 buffer or null when disabled.
 */
export async function synthesizeSpeech(text, lang = "en") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  if (!ELEVENLABS_API_KEY) return null;

  const voiceId = getVoiceId(lang);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: ELEVENLABS_MODEL,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.75,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS ${res.status}: ${errText.slice(0, 120)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
