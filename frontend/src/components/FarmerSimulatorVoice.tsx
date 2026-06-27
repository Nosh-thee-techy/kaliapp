import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, AudioLines } from "lucide-react";
import { KaliVoiceOrb } from "@/components/KaliVoiceOrb";
import {
  fetchFarmerReadiness,
  fetchKaliTts,
  postAgentChat,
  type AgentLanguage,
} from "@/lib/api-core";
import { speechLang, voiceContextFromReadiness, type KaliVoiceLang } from "@/lib/kali-voice";

type Props = {
  phoneNumber: string;
  lang: KaliVoiceLang;
  languages: AgentLanguage[];
  onLangChange: (code: KaliVoiceLang) => void;
  onSmsDelivered?: () => void;
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

export function FarmerSimulatorVoice({
  phoneNumber,
  lang,
  languages,
  onLangChange,
  onSmsDelivered,
}: Props) {
  const [state, setState] = useState<VoiceState>("idle");
  const [reply, setReply] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [farmerName, setFarmerName] = useState<string | null>(null);

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
    async (text: string) => {
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
    async (message: string) => {
      setState("thinking");
      setError(null);
      setTranscript(message);
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
        await speakText(res.reply);
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
          ? "Kivinjari chako hakiungi mkono sauti. Tumia Chrome au Edge."
          : "Voice not supported in this browser. Try Chrome or Edge.",
      );
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
      const text = ev.results[0]?.[0]?.transcript?.trim();
      recognitionRef.current = null;
      if (text) void runVoiceTurn(text);
      else setState("idle");
    };

    rec.onerror = (ev) => {
      if (ev.error !== "aborted") {
        setError(
          lang === "sw"
            ? "Ruhusu kipaza sauti kwenye kivinjari."
            : "Allow microphone access in your browser.",
        );
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

  useEffect(
    () => () => {
      stopListening();
      stopAudio();
    },
    [stopAudio, stopListening],
  );

  const orbActive = state === "listening" || state === "speaking";
  const hint =
    lang === "sw"
      ? "Bonyeza kipaza sauti — uliza kuhusu alama yako, mkopo, au hali ya hewa."
      : lang === "lg"
        ? "Koona mic — buza ku bubonero, ssente, oba obudde."
        : "Tap the mic — ask about your score, loan, or climate tip.";

  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        {languages.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => onLangChange(l.code as KaliVoiceLang)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              lang === l.code ? "bg-primary text-primary-foreground" : "border border-border bg-background"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <KaliVoiceOrb active={orbActive} size={140} />
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-sm text-muted-foreground">{hint}</p>
          {farmerName && (
            <p className="text-xs text-muted-foreground">
              {lang === "sw" ? "Wasifu:" : "Profile:"}{" "}
              <span className="font-medium text-foreground">{farmerName}</span> · {phoneNumber}
            </p>
          )}

          <button
            type="button"
            onClick={onMicPress}
            disabled={state === "thinking"}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-50"
          >
            {state === "thinking" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {lang === "sw" ? "Kali anafikiria…" : "Kali is thinking…"}
              </>
            ) : state === "listening" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                </span>
                {lang === "sw" ? "Nasikiliza…" : "Listening…"}
              </>
            ) : state === "speaking" ? (
              <>
                <AudioLines className="h-4 w-4" />
                {lang === "sw" ? "Kali anaongea…" : "Kali is speaking…"}
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                {lang === "sw" ? "Ongea na Kali" : lang === "lg" ? "Yogera ne Kali" : "Speak with Kali"}
              </>
            )}
          </button>

          {transcript && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">You:</span> {transcript}
            </p>
          )}

          {reply && (
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-left text-sm">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                SMS reply · {reply.length} chars · delivered to inbox
              </p>
              <p className="mt-1 text-foreground">{reply}</p>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
