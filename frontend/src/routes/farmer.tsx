import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { formatRelative } from "@/lib/mock-data";
import { fetchSmsMessages, postUssdSession, fetchAgentLanguages } from "@/lib/api-core";
import type { AgentLanguage, SmsMessage } from "@/lib/api-core";
import { Phone, RefreshCw } from "lucide-react";
import { FeaturePhoneCallSim } from "@/components/FeaturePhoneCallSim";
import { FarmerSimulatorVoice } from "@/components/FarmerSimulatorVoice";
import { DEFAULT_FARMER_LANGS, type KaliVoiceLang } from "@/lib/kali-voice";

export const Route = createFileRoute("/farmer")({
  head: () => ({
    meta: [
      { title: "Farmer Phone Simulator — KaLI" },
      { name: "description", content: "USSD, voice call, and SMS inbox simulator for the farmer-side experience." },
    ],
  }),
  component: FarmerPage,
});

const SHORTCODE = "*384*11400#";
const KALI_VOICE_LINE = "08003841140";
const DEFAULT_PHONE = "+254712345678";

type PhoneMode = "dialer" | "ussd" | "call";

function normalizeDial(raw: string): string {
  return raw.replace(/\s/g, "").replace(/^\+254/, "0");
}

function isUssdDial(raw: string): boolean {
  return normalizeDial(raw) === SHORTCODE.replace(/\s/g, "");
}

function isVoiceDial(raw: string): boolean {
  const d = normalizeDial(raw);
  return d === KALI_VOICE_LINE || d === "803841140" || d === "0803841140";
}

function FarmerPage() {
  const [phoneNumber, setPhoneNumber] = useState(DEFAULT_PHONE);
  const [dialed, setDialed] = useState(false);
  const [sessionText, setSessionText] = useState("");
  const [input, setInput] = useState("");
  const [dial, setDial] = useState("");
  const [display, setDisplay] = useState(
    `Welcome.\nDial USSD ${SHORTCODE}\nor voice ${KALI_VOICE_LINE.slice(0, 4)} ${KALI_VOICE_LINE.slice(4, 7)} ${KALI_VOICE_LINE.slice(7)}\nthen press Send.`,
  );
  const [loading, setLoading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [smsList, setSmsList] = useState<SmsMessage[]>([]);
  const [smsLive, setSmsLive] = useState(false);
  const [smsRefreshing, setSmsRefreshing] = useState(false);
  const [agentLang, setAgentLang] = useState<KaliVoiceLang>("sw");
  const [phoneMode, setPhoneMode] = useState<PhoneMode>("dialer");
  const [languages, setLanguages] = useState<AgentLanguage[]>(
    DEFAULT_FARMER_LANGS.map(({ code, label, flag }) => ({ code, label, flag })),
  );

  useEffect(() => {
    fetchAgentLanguages()
      .then((r) => {
        if (r.languages?.length) setLanguages(r.languages);
      })
      .catch(() => {});
  }, []);

  const loadSms = useCallback(() => {
    return fetchSmsMessages({ phone: phoneNumber, limit: 20 })
      .then((messages) => {
        setSmsList(messages);
        setSmsLive(true);
      })
      .catch(() => setSmsLive(false));
  }, [phoneNumber]);

  const refreshSms = useCallback(() => {
    setSmsRefreshing(true);
    loadSms().finally(() => setSmsRefreshing(false));
  }, [loadSms]);

  useEffect(() => {
    loadSms();
    const id = setInterval(loadSms, 3000);
    return () => clearInterval(id);
  }, [loadSms]);

  function boostSmsPoll() {
    refreshSms();
  }

  async function runUssd(nextText: string | undefined) {
    setLoading(true);
    try {
      const raw = await postUssdSession({ phoneNumber, text: nextText });
      const body = raw.replace(/^(CON|END)\s*/i, "");
      setDisplay(body);
      const ended = raw.startsWith("END");
      setSessionEnded(ended);
      if (ended) boostSmsPoll();
      return ended;
    } catch {
      setDisplay("System unavailable.\nIs the backend running?\nTry: npm run dev:api");
      setSessionEnded(true);
      return true;
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (phoneMode === "call") return;

    if (!dialed) {
      if (isVoiceDial(dial)) {
        setPhoneMode("call");
        setDial("");
        return;
      }
      if (!isUssdDial(dial)) {
        setDisplay(`Invalid number.\nUSSD: ${SHORTCODE}\nVoice: ${KALI_VOICE_LINE}`);
        return;
      }
      setPhoneMode("ussd");
      setDialed(true);
      setInput("");
      await runUssd(undefined);
      return;
    }

    if (sessionEnded) {
      reset();
      return;
    }

    if (!input.trim()) return;

    const next = sessionText ? `${sessionText}*${input.trim()}` : input.trim();
    setSessionText(next);
    setInput("");
    await runUssd(next);
  }

  function reset() {
    setPhoneMode("dialer");
    setDialed(false);
    setSessionText("");
    setSessionEnded(false);
    setDial("");
    setInput("");
    setDisplay(
      `Welcome.\nDial USSD ${SHORTCODE}\nor voice ${KALI_VOICE_LINE.slice(0, 4)} ${KALI_VOICE_LINE.slice(4, 7)} ${KALI_VOICE_LINE.slice(7)}\nthen press Send.`,
    );
  }

  function endCall() {
    setPhoneMode("dialer");
    setDial("");
    setDisplay("Call ended.\nThank you for calling KaLI.");
    boostSmsPoll();
  }

  function quickDialVoice() {
    setPhoneMode("call");
    setDial("");
    setDialed(false);
    setSessionText("");
    setSessionEnded(false);
  }

  function quickDialUssd() {
    setDial(SHORTCODE);
  }

  const keypad = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  function press(k: string) {
    if (phoneMode === "call") return;
    if (!dialed) setDial((d) => d + k);
    else if (!sessionEnded) setInput((v) => v + k);
  }

  function backspace() {
    if (phoneMode === "call") return;
    if (!dialed) setDial((d) => d.slice(0, -1));
    else setInput((v) => v.slice(0, -1));
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Field Channel · Zero-bandwidth</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground sm:text-4xl">Farmer Phone Simulator</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Point-to-point USSD, voice call, and SMS — no Africa&apos;s Talking keys required. Dial{" "}
          <span className="font-mono text-foreground">{SHORTCODE}</span> for USSD or{" "}
          <span className="font-mono text-foreground">{KALI_VOICE_LINE}</span> to call Kali on the feature phone.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">
            Simulated MSISDN
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="ml-2 rounded-lg border border-input bg-card px-3 py-1.5 font-mono text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={quickDialUssd}
            className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
          >
            USSD shortcut
          </button>
          <button
            type="button"
            onClick={quickDialVoice}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
          >
            <Phone className="h-3 w-3" />
            Call Kali
          </button>
          {smsLive ? (
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] text-success">
              SMS inbox live · simulator
            </span>
          ) : (
            <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-[11px] text-warning-foreground">
              Backend offline
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <div className="mx-auto">
          <div className="relative rounded-[2.5rem] bg-gradient-soil p-4 shadow-elevated">
            <div className="rounded-[2rem] bg-zinc-900 p-3">
              <div className="mb-3 flex items-center justify-between px-2 text-[10px] text-zinc-400">
                <span>Safaricom</span>
                <span>{phoneMode === "call" ? "📞 Voice" : "📶 ▮▮▮▯"}</span>
                <span>{loading ? "…" : "78%"}</span>
              </div>
              {phoneMode === "call" ? (
                <FeaturePhoneCallSim
                  phoneNumber={phoneNumber}
                  lang={agentLang}
                  onEndCall={endCall}
                  onSmsDelivered={boostSmsPoll}
                />
              ) : (
                <>
              <div className="min-h-[260px] rounded-md bg-[oklch(0.85_0.08_135)] p-4 font-mono text-[13px] leading-snug text-zinc-900 shadow-inner">
                    {!dialed ? (
                      <>
                        <div className="whitespace-pre-line">{display}</div>
                        <div className="mt-3 border-t border-zinc-900/30 pt-2">
                          <span className="text-[10px] uppercase tracking-wider opacity-70">Dialer</span>
                          <div className="mt-0.5 break-all text-base font-semibold">
                            {dial || <span className="opacity-50">_</span>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="whitespace-pre-line">{display}</div>
                        {!sessionEnded && (
                          <div className="mt-3 border-t border-zinc-900/30 pt-2">
                            <span className="text-[10px] uppercase tracking-wider opacity-70">Reply</span>
                            <div className="mt-0.5 break-all text-base font-semibold">
                              {input || <span className="opacity-50">_</span>}
                            </div>
                          </div>
                        )}
                      </>
                    )}
              </div>

              <div className="mt-4 space-y-2">
                {keypad.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 gap-2">
                    {row.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => press(k)}
                        disabled={loading}
                        className="rounded-md bg-zinc-700 py-2 text-base font-semibold text-zinc-100 transition-colors active:bg-zinc-600 disabled:opacity-50"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-md bg-destructive/80 py-2 text-xs font-semibold text-destructive-foreground"
                  >
                    End
                  </button>
                  <button
                    type="button"
                    onClick={backspace}
                    className="rounded-md bg-zinc-600 py-2 text-xs font-semibold text-zinc-100"
                  >
                    ⌫
                  </button>
                  <button
                    type="button"
                    onClick={send}
                    disabled={loading}
                    className="rounded-md bg-success py-2 text-xs font-semibold text-success-foreground disabled:opacity-50"
                  >
                    {loading ? "…" : "Send"}
                  </button>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {phoneMode === "call" ? (
              <>Voice call · {KALI_VOICE_LINE} · Africa&apos;s Talking pending</>
            ) : (
              <>
                Session: <span className="font-mono">{sessionText || "(new)"}</span>
              </>
            )}
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-foreground">USSD Menu Router</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Backend evaluates MSISDN and routes to register, credit, status, or climate flows.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { code: "1", label: "Register / Request Credit", desc: "Writes Farmer node + coop link in Neo4j" },
                { code: "2", label: "Check Loan Status", desc: "Featherless ≤160 char explainer in your language" },
                { code: "3", label: "Climate Advisory", desc: "Zone advisory via Cooperative → ClimateZone path" },
                { code: "4", label: "Explain My Score", desc: "Plain-language why — same as voice menu 4" },
                { code: "☎", label: "Voice helpline", desc: `Dial ${KALI_VOICE_LINE} on the phone — speak with Kali` },
              ].map((m) => (
                <div key={m.code} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-baseline gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">{m.code}</span>
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-600" />
              <h2 className="font-display text-lg font-semibold text-foreground">Voice Call IVR</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Simulates Africa&apos;s Talking inbound call to <span className="font-mono">{KALI_VOICE_LINE}</span>.
              Ring → connect → IVR menu (1–4) or speak freely. Kali replies with ElevenLabs voice; SMS summary hits
              the inbox.
            </p>
            <FarmerSimulatorVoice
              phoneNumber={phoneNumber}
              lang={agentLang}
              languages={languages}
              onLangChange={setAgentLang}
              onSmsDelivered={boostSmsPoll}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">SMS Inbox</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real messages from Neo4j <code className="text-xs">NOTIFIED</code> edges — USSD, voice, and officer
                  decisions. Africa&apos;s Talking optional; simulator writes to graph instantly.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={refreshSms}
                  disabled={smsRefreshing}
                  className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  aria-label="Refresh SMS inbox"
                >
                  <RefreshCw className={`h-4 w-4 ${smsRefreshing ? "animate-spin" : ""}`} />
                </button>
                <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] text-success">
                  {smsList.length} message{smsList.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {smsList.length === 0 && (
                <li className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  No messages yet for {phoneNumber}. Try USSD menu <span className="font-mono">2*4</span> (explain score)
                  or speak with Kali above.
                </li>
              )}
              {smsList.map((sms) => (
                <li key={sms.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{sms.to}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CategoryPill cat={sms.category} />
                      {formatRelative(sms.sentIso)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{sms.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

function CategoryPill({ cat }: { cat: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    decision: { label: "Decision", tone: "bg-primary/10 text-primary" },
    climate: { label: "Climate", tone: "bg-warning/15 text-warning-foreground" },
    registration: { label: "Registration", tone: "bg-secondary text-secondary-foreground" },
    explainability: { label: "Explainer", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  };
  const m = map[cat] || map.decision;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.tone}`}>{m.label}</span>;
}
