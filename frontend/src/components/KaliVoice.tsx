import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, X, AudioLines, Loader2 } from "lucide-react";
import { KaliVoiceOrb } from "@/components/KaliVoiceOrb";
import { postVoiceSts, fetchKaliTts } from "@/lib/api-core";
import type { FarmerReadiness } from "@/lib/api-core";
import {
  buildKaliGreeting,
  speechLang,
  voiceContextFromReadiness,
  voiceCopy,
  type KaliVoiceLang,
} from "@/lib/kali-voice";

type Props = {
  lookup: string;
  lang: KaliVoiceLang;
  readiness: FarmerReadiness;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideFloatButton?: boolean;
};

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1]! : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "audio/webm";
}

export function KaliVoice({
  lookup,
  lang,
  readiness,
  open: openProp,
  onOpenChange,
  hideFloatButton = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [state, setState] = useState<VoiceState>("idle");
  const [caption, setCaption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [greeted, setGreeted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recorderMimeRef = useRef("audio/webm");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const copy = voiceCopy(lang);
  const context = { ...voiceContextFromReadiness(readiness), lookup };

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

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

  const playBase64 = useCallback(
    async (b64: string, mimeType: string) => {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      await playBlob(new Blob([bytes], { type: mimeType }));
    },
    [playBlob],
  );

  const speakText = useCallback(
    async (text: string) => {
      setCaption(text);
      try {
        await playBlob(await fetchKaliTts(text, lang));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("402") || msg.includes("paid_plan") || msg.includes("ElevenLabs")) {
          setError("ElevenLabs voice unavailable — check API plan or voice ID in backend .env");
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          setState("speaking");
          await new Promise<void>((resolve) => {
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = speechLang(lang);
            utter.onend = () => resolve();
            utter.onerror = () => resolve();
            window.speechSynthesis.speak(utter);
          });
        }
      } finally {
        setState("idle");
      }
    },
    [lang, playBlob],
  );

  const runStsTurn = useCallback(
    async (opts: { audio?: string; mimeType?: string; message?: string }) => {
      setState("thinking");
      setError(null);
      try {
        const res = await postVoiceSts({
          ...opts,
          lang,
          context,
        });
        if (res.transcript && !opts.message) {
          setCaption(`You: ${res.transcript}\n\nKali: ${res.reply}`);
        } else {
          setCaption(res.reply);
        }
        if (res.audio) {
          await playBase64(res.audio, res.mimeType);
        } else {
          await speakText(res.reply);
        }
      } catch {
        setError(copy.unavailable);
        setState("idle");
      }
    },
    [context, copy.unavailable, lang, playBase64, speakText],
  );

  const fallbackBrowserStt = useCallback(
    (transcript: string) => {
      void runStsTurn({ message: transcript });
    },
    [runStsTurn],
  );

  const startBrowserStt = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError(copy.micDenied);
      return;
    }
    stopAudio();
    setError(null);
    setState("listening");
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = speechLang(lang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript;
      if (transcript) fallbackBrowserStt(transcript);
      else setState("idle");
    };
    rec.onerror = (ev) => {
      if (ev.error !== "aborted") setError(copy.micDenied);
      setState("idle");
    };
    rec.onend = () => {
      recognitionRef.current = null;
    };
    rec.start();
  }, [copy.micDenied, fallbackBrowserStt, lang, stopAudio]);

  const startListening = useCallback(async () => {
    stopAudio();
    setError(null);

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      startBrowserStt();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = pickRecorderMime();
      recorderMimeRef.current = mimeType;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stopMediaStream();
        mediaRecorderRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: mimeType.split(";")[0] });
        audioChunksRef.current = [];
        if (blob.size < 800) {
          setError(copy.micDenied);
          setState("idle");
          return;
        }
        void blobToBase64(blob).then((audio) =>
          runStsTurn({ audio, mimeType: mimeType.split(";")[0] }),
        );
      };

      recorder.start();
      setState("listening");
    } catch {
      stopMediaStream();
      startBrowserStt();
    }
  }, [copy.micDenied, runStsTurn, startBrowserStt, stopAudio, stopMediaStream]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      stopMediaStream();
      setState("idle");
    }
  }, [stopMediaStream]);

  const onSpeakPress = useCallback(() => {
    if (state === "listening") {
      stopListening();
      return;
    }
    if (state === "speaking") {
      stopAudio();
      setState("idle");
      return;
    }
    if (state === "idle") void startListening();
  }, [startListening, state, stopAudio, stopListening]);

  useEffect(() => {
    if (!open || greeted) return;
    setGreeted(true);
    void speakText(buildKaliGreeting(readiness, lang));
  }, [open, greeted, lang, readiness, speakText]);

  useEffect(() => {
    if (!open) {
      stopListening();
      stopAudio();
      stopMediaStream();
      setState("idle");
      setGreeted(false);
    }
  }, [open, stopAudio, stopListening, stopMediaStream]);

  useEffect(
    () => () => {
      stopListening();
      stopAudio();
      stopMediaStream();
    },
    [stopAudio, stopListening, stopMediaStream],
  );

  const busy = state === "thinking" || state === "speaking";
  const orbActive = state === "listening" || state === "speaking";

  return (
    <>
      {!hideFloatButton && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-5 z-40 flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-[#1a1f3a] to-[#0d1225] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(43,89,255,0.35)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          aria-label={copy.floatLabel}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/30">
            <AudioLines className="h-4 w-4 text-blue-300" />
          </span>
          {copy.floatLabel}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#030712] text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(43,89,255,0.22) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(99,102,241,0.12) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 10% 80%, rgba(59,130,246,0.08) 0%, transparent 45%)",
            }}
          />

          <header className="relative z-10 flex items-center justify-between px-5 py-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold">
                K
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">Kali</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={copy.tapToClose}
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-8">
            <h2 className="text-center font-display text-2xl font-semibold leading-snug sm:text-3xl">
              {copy.tagline}
              <span className="mt-1 block text-white/45">{copy.taglineAccent}</span>
            </h2>

            <div className="my-8 sm:my-10">
              <KaliVoiceOrb active={orbActive} size={280} />
            </div>

            <button
              type="button"
              onClick={onSpeakPress}
              disabled={state === "thinking"}
              className="flex items-center gap-2.5 rounded-full border border-blue-400/40 bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold shadow-[0_0_40px_rgba(59,130,246,0.45)] transition-all hover:shadow-[0_0_56px_rgba(59,130,246,0.55)] disabled:opacity-60"
            >
              {state === "thinking" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {copy.thinking}
                </>
              ) : state === "listening" ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  {copy.listening}
                </>
              ) : state === "speaking" ? (
                <>
                  <AudioLines className="h-4 w-4" />
                  {copy.speaking}
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  {copy.speak}
                </>
              )}
            </button>

            {caption && (
              <p className="mt-8 max-w-sm whitespace-pre-line text-center text-sm leading-relaxed text-white/55">
                {caption}
              </p>
            )}

            {error && <p className="mt-4 max-w-sm text-center text-xs text-red-300/90">{error}</p>}

            {!busy && state === "idle" && (
              <p className="mt-6 text-center text-[11px] text-white/30">
                {readiness.farmer.name} · {readiness.readiness.score}/100 ·{" "}
                {lang === "sw" ? "Kiswahili" : lang === "lg" ? "Luganda" : "English"} · ElevenLabs
              </p>
            )}
          </div>

          <div
            className="pointer-events-none relative z-10 h-24"
            style={{ background: "linear-gradient(to top, rgba(43,89,255,0.15), transparent)" }}
          />
        </div>
      )}
    </>
  );
}
