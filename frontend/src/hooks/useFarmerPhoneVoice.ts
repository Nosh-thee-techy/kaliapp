import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFarmerReadiness, fetchKaliTts, postAgentChat } from "@/lib/api-core";
import { speechLang, voiceContextFromReadiness, callGreeting, menuPrompt, normalizeFarmerLang, type KaliVoiceLang } from "@/lib/kali-voice";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useFarmerPhoneVoice(phoneNumber: string, lang: KaliVoiceLang | string, onSmsDelivered?: () => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [reply, setReply] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [farmerName, setFarmerName] = useState<string | null>(null);
  const [lcdLines, setLcdLines] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceContextRef = useRef<Record<string, unknown>>({ lookup: phoneNumber });

  useEffect(() => {
    fetchFarmerReadiness(phoneNumber, lang)
      .then((data) => {
        setFarmerName(data.farmer.name);
        voiceContextRef.current = { ...voiceContextFromReadiness(data), lookup: phoneNumber };
      })
      .catch(() => {
        voiceContextRef.current = { lookup: phoneNumber };
      });
  }, [phoneNumber, lang]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const playBlob = useCallback(
    async (blob: Blob) => {
      stopAudio();
      setState("speaking");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("playback failed"));
          };
          audio.play().catch(reject);
        });
      } finally {
        setState("idle");
      }
    },
    [stopAudio],
  );

  const speakText = useCallback(
    async (text: string, showOnLcd = true) => {
      if (showOnLcd) {
        setLcdLines(text.split("\n").slice(0, 6));
      }
      try {
        await playBlob(await fetchKaliTts(text, lang));
      } catch {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          setState("speaking");
          await new Promise<void>((resolve) => {
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = speechLang(lang);
            utter.onend = () => resolve();
            utter.onerror = () => resolve();
            window.speechSynthesis.speak(utter);
          });
          setState("idle");
        }
      }
    },
    [lang, playBlob],
  );

  const runVoiceTurn = useCallback(
    async (message: string, lcdPrefix?: string) => {
      setState("thinking");
      setError(null);
      setTranscript(message);
      if (lcdPrefix) setLcdLines([lcdPrefix, message].slice(0, 6));
      try {
        const res = await postAgentChat({
          message,
          lookup: phoneNumber,
          lang,
          mode: "voice",
          context: voiceContextRef.current,
        });
        setReply(res.reply);
        onSmsDelivered?.();
        setLcdLines(["KaLI:", res.reply].slice(0, 6));
        await speakText(res.reply, false);
      } catch {
        setError(
          lang === "sw"
            ? "Kali haipatikani — hakikisha backend inaendesha."
            : "Kali unavailable — is the backend running?",
        );
        setState("idle");
      }
    },
    [lang, onSmsDelivered, phoneNumber, speakText],
  );

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError(
        lang === "sw"
          ? "Kivinjari hakiungi mkono sauti. Tumia Chrome."
          : "Voice not supported — try Chrome or Edge.",
      );
      return;
    }

    stopAudio();
    setError(null);
    setState("listening");
    setLcdLines(lang === "sw" ? ["Sikiliza…", "Ongea sasa"] : ["Listening…", "Speak now"]);

    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = speechLang(lang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      recognitionRef.current = null;
      if (text) void runVoiceTurn(text, lang === "sw" ? "Wewe:" : "You:");
      else setState("idle");
    };

    rec.onerror = (ev) => {
      if (ev.error !== "aborted") {
        setError(lang === "sw" ? "Ruhusu kipaza sauti." : "Allow microphone access.");
      }
      recognitionRef.current = null;
      setState("idle");
    };

    rec.onend = () => {
      recognitionRef.current = null;
    };

    rec.start();
  }, [lang, runVoiceTurn, stopAudio]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState("idle");
  }, []);

  const onMenuKey = useCallback(
    (key: string) => {
      const prompt = menuPrompt(lang, key);
      if (prompt) void runVoiceTurn(prompt, `Menu ${key}`);
    },
    [lang, runVoiceTurn],
  );

  const onMicPress = useCallback(() => {
    if (state === "listening") {
      stopListening();
      return;
    }
    if (state === "speaking") {
      stopAudio();
      setState("idle");
      return;
    }
    if (state === "idle") startListening();
  }, [startListening, state, stopAudio, stopListening]);

  const playGreeting = useCallback(async () => {
    const text = callGreeting(lang);
    setLcdLines(["KaLI Core", "Connected", "", text.split(".")[0] + "."]);
    setState("speaking");
    await speakText(text);
  }, [lang, speakText]);

  const resetCall = useCallback(() => {
    stopListening();
    stopAudio();
    setReply(null);
    setTranscript(null);
    setError(null);
    setLcdLines([]);
    setState("idle");
  }, [stopAudio, stopListening]);

  useEffect(
    () => () => {
      stopListening();
      stopAudio();
    },
    [stopAudio, stopListening],
  );

  return {
    state,
    reply,
    transcript,
    error,
    farmerName,
    lcdLines,
    setLcdLines,
    runVoiceTurn,
    onMenuKey,
    onMicPress,
    playGreeting,
    resetCall,
    stopAudio,
    stopListening,
  };
}
