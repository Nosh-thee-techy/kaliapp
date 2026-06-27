import { generateKaliVoiceReply } from "./featherlessService.js";
import { transcribeSpeech, synthesizeSpeech, isElevenLabsEnabled } from "./elevenlabsService.js";
import { normalizeLang } from "../config/languages.js";

/**
 * Full speech-to-speech turn: audio → ElevenLabs STT → Featherless → ElevenLabs TTS.
 */
export async function processVoiceTurn({
  audioBase64,
  mimeType = "audio/webm",
  message,
  lang = "en",
  context = {},
}) {
  const language = normalizeLang(lang);
  let transcript = String(message || "").trim();

  if (!transcript && audioBase64) {
    const buffer = Buffer.from(audioBase64, "base64");
    transcript = await transcribeSpeech(buffer, language, mimeType);
  }

  if (!transcript) {
    throw new Error("No speech detected — try again or speak closer to the mic");
  }

  const reply = await generateKaliVoiceReply(transcript, language, context);
  const audioOut = await synthesizeSpeech(reply, language);

  return {
    transcript,
    reply,
    lang: language,
    audio: audioOut,
    mimeType: "audio/mpeg",
    providers: {
      stt: audioBase64 ? `ElevenLabs ${process.env.ELEVENLABS_STT_MODEL || "scribe_v2"}` : null,
      brain: "Featherless AI",
      tts: audioOut ? `ElevenLabs ${process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2"}` : null,
    },
  };
}

export async function transcribeOnly(audioBase64, lang = "en", mimeType = "audio/webm") {
  const buffer = Buffer.from(audioBase64, "base64");
  const text = await transcribeSpeech(buffer, normalizeLang(lang), mimeType);
  return { text, lang: normalizeLang(lang), provider: "ElevenLabs Scribe" };
}

export async function synthesizeOnly(text, lang = "en") {
  const language = normalizeLang(lang);
  const audio = await synthesizeSpeech(text, language);
  if (!audio) {
    return { text, lang: language, audio: null, fallback: "browser" };
  }
  return { text, lang: language, audio, mimeType: "audio/mpeg", provider: "ElevenLabs" };
}

export { isElevenLabsEnabled };
