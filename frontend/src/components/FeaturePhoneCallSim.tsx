import { useEffect, useState } from "react";
import { PhoneOff, Mic } from "lucide-react";
import { useFarmerPhoneVoice, type VoiceState } from "@/hooks/useFarmerPhoneVoice";
import type { KaliVoiceLang } from "@/lib/kali-voice";

type Props = {
  phoneNumber: string;
  lang: KaliVoiceLang;
  onEndCall: () => void;
  onSmsDelivered?: () => void;
};

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function stateLabel(state: VoiceState, lang: KaliVoiceLang): string {
  if (state === "listening") return lang === "sw" ? "● REC" : lang === "lg" ? "● REC" : "● REC";
  if (state === "thinking") return lang === "sw" ? "…" : "…";
  if (state === "speaking") return lang === "sw" ? "♪ Kali" : "♪ Kali";
  return "";
}

export function FeaturePhoneCallSim({ phoneNumber, lang, onEndCall, onSmsDelivered }: Props) {
  const voice = useFarmerPhoneVoice(phoneNumber, lang, onSmsDelivered);
  const [phase, setPhase] = useState<"ringing" | "connected">("ringing");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const ringTimer = setTimeout(() => {
      setPhase("connected");
      void voice.playGreeting();
    }, 1400);
    return () => clearTimeout(ringTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "connected") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  function handleEnd() {
    voice.resetCall();
    onEndCall();
  }

  function handleKey(k: string) {
    if (phase !== "connected" || voice.state === "thinking") return;
    if (["1", "2", "3", "4"].includes(k)) voice.onMenuKey(k);
  }

  const displayLines =
    phase === "ringing"
      ? ["Calling…", "KaLI Helpline", "0800 384 1140", ""]
      : voice.lcdLines.length > 0
        ? voice.lcdLines
        : ["KaLI connected", voice.farmerName ? voice.farmerName.split(" ")[0]! : phoneNumber, "1-4 menu · Speak"];

  const keypad = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  return (
    <>
      <div className="mb-2 flex items-center justify-between px-1 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          {phase === "ringing" ? (
            <span className="animate-pulse text-amber-400">Ringing</span>
          ) : (
            <span className="text-emerald-400">{stateLabel(voice.state, lang) || "Connected"}</span>
          )}
        </span>
        <span className="font-mono tabular-nums">{phase === "connected" ? formatDuration(seconds) : "0:00"}</span>
      </div>

      <div className="min-h-[260px] rounded-md bg-[oklch(0.85_0.08_135)] p-3 font-mono text-[12px] leading-snug text-zinc-900 shadow-inner">
        <div className="border-b border-zinc-900/20 pb-1 text-[10px] uppercase tracking-wider opacity-70">
          {phase === "ringing" ? "Outgoing" : "KaLI · Voice IVR"}
        </div>
        <div className="mt-2 space-y-1">
          {displayLines.map((line, i) => (
            <div key={i} className={i === 0 && phase === "connected" ? "font-bold" : ""}>
              {line || "\u00A0"}
            </div>
          ))}
        </div>
        {voice.transcript && phase === "connected" && (
          <div className="mt-2 border-t border-zinc-900/20 pt-2 text-[11px] opacity-80">
            {lang === "sw" ? "Wewe:" : "You:"} {voice.transcript}
          </div>
        )}
        {voice.error && <div className="mt-2 text-[11px] text-red-800">{voice.error}</div>}
      </div>

      <div className="mt-4 space-y-2">
        {keypad.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-2">
            {row.map((k) => {
              const isMenu = ["1", "2", "3", "4"].includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKey(k)}
                  disabled={phase !== "connected" || voice.state === "thinking"}
                  className={`rounded-md py-2 text-base font-semibold transition-colors disabled:opacity-40 ${
                    isMenu && phase === "connected"
                      ? "bg-emerald-800/90 text-emerald-50 ring-1 ring-emerald-600/50"
                      : "bg-zinc-700 text-zinc-100 active:bg-zinc-600"
                  }`}
                >
                  {k}
                  {isMenu && phase === "connected" && (
                    <span className="mt-0.5 block text-[8px] font-normal opacity-80">
                      {k === "1" ? "Apply" : k === "2" ? "Status" : k === "3" ? "Climate" : "Score"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={handleEnd}
            className="flex items-center justify-center gap-1 rounded-md bg-red-700 py-2.5 text-xs font-semibold text-white"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            End
          </button>
          <button
            type="button"
            onClick={() => phase === "connected" && voice.onMicPress()}
            disabled={phase !== "connected" || voice.state === "thinking"}
            className={`flex items-center justify-center gap-1 rounded-md py-2.5 text-xs font-semibold disabled:opacity-50 ${
              voice.state === "listening"
                ? "animate-pulse bg-red-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            {voice.state === "listening"
              ? lang === "sw"
                ? "Simama"
                : "Stop"
              : voice.state === "thinking"
                ? "…"
                : lang === "sw"
                  ? "Ongea"
                  : "Speak"}
          </button>
          <button
            type="button"
            disabled
            className="rounded-md bg-zinc-600 py-2.5 text-xs font-semibold text-zinc-400 opacity-50"
          >
            Hold
          </button>
        </div>
      </div>

      {voice.reply && phase === "connected" && (
        <p className="mt-2 text-center text-[10px] text-zinc-500">
          SMS summary · {voice.reply.length} chars · inbox
        </p>
      )}
    </>
  );
}
