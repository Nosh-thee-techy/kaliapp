import { useFarmerPhoneVoice } from "@/hooks/useFarmerPhoneVoice";
import { Mic, Loader2, AudioLines } from "lucide-react";
import { KaliVoiceOrb } from "@/components/KaliVoiceOrb";
import type { AgentLanguage } from "@/lib/api-core";
import type { KaliVoiceLang } from "@/lib/kali-voice";

type Props = {
  phoneNumber: string;
  lang: KaliVoiceLang;
  languages: AgentLanguage[];
  onLangChange: (code: KaliVoiceLang) => void;
  onSmsDelivered?: () => void;
};

export function FarmerSimulatorVoice({
  phoneNumber,
  lang,
  languages,
  onLangChange,
  onSmsDelivered,
}: Props) {
  const voice = useFarmerPhoneVoice(phoneNumber, lang, onSmsDelivered);

  const hint =
    lang === "sw"
      ? "Pia piga 08003841140 kwenye simu ya mkulima — uzoefu sawa wa simu."
      : lang === "lg"
        ? "Osobola n'okukuba 08003841140 ku ssimu — ekintu kye kimu."
        : "Or dial 08003841140 on the feature phone — same voice call experience.";

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

      <p className="mt-4 text-sm text-muted-foreground">{hint}</p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <KaliVoiceOrb active={voice.state === "listening" || voice.state === "speaking"} size={100} />
        </div>
        <div className="flex-1 space-y-3 text-center sm:text-left">
          {voice.farmerName && (
            <p className="text-xs text-muted-foreground">
              Profile: <span className="font-medium text-foreground">{voice.farmerName}</span> · {phoneNumber}
            </p>
          )}
          <button
            type="button"
            onClick={voice.onMicPress}
            disabled={voice.state === "thinking"}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-50"
          >
            {voice.state === "thinking" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kali is thinking…
              </>
            ) : voice.state === "listening" ? (
              <>Listening…</>
            ) : voice.state === "speaking" ? (
              <>
                <AudioLines className="h-4 w-4" />
                Kali is speaking…
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Quick speak (browser)
              </>
            )}
          </button>
          {voice.error && <p className="text-xs text-destructive">{voice.error}</p>}
        </div>
      </div>
    </div>
  );
}
