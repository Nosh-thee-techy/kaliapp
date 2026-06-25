import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { formatRelative } from "@/lib/mock-data";
import { fetchSmsMessages, postUssdSession } from "@/lib/api-core";
import type { SmsMessage } from "@/lib/api-core";

export const Route = createFileRoute("/farmer")({
  head: () => ({
    meta: [
      { title: "Farmer Phone Simulator — KaLI" },
      { name: "description", content: "USSD session and SMS inbox simulator for the farmer-side experience." },
    ],
  }),
  component: FarmerPage,
});

const SHORTCODE = "*483*100#";
const DEFAULT_PHONE = "+254712345678";

function FarmerPage() {
  const [phoneNumber, setPhoneNumber] = useState(DEFAULT_PHONE);
  const [dialed, setDialed] = useState(false);
  const [sessionText, setSessionText] = useState("");
  const [input, setInput] = useState("");
  const [dial, setDial] = useState("");
  const [display, setDisplay] = useState(
    "Welcome.\nDial KaLI shortcode\n*483*100#\nthen press Send.",
  );
  const [loading, setLoading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [smsList, setSmsList] = useState<SmsMessage[]>([]);
  const [smsLive, setSmsLive] = useState(false);

  const loadSms = useCallback(() => {
    fetchSmsMessages({ phone: phoneNumber, limit: 20 })
      .then((messages) => {
        setSmsList(messages);
        setSmsLive(true);
      })
      .catch(() => setSmsLive(false));
  }, [phoneNumber]);

  useEffect(() => {
    loadSms();
    const id = setInterval(loadSms, 8000);
    return () => clearInterval(id);
  }, [loadSms]);

  async function runUssd(nextText: string | undefined) {
    setLoading(true);
    try {
      const raw = await postUssdSession({ phoneNumber, text: nextText });
      const body = raw.replace(/^(CON|END)\s*/i, "");
      setDisplay(body);
      const ended = raw.startsWith("END");
      setSessionEnded(ended);
      if (ended) loadSms();
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
    if (!dialed) {
      if (dial.replace(/\s/g, "") !== SHORTCODE) {
        setDisplay("Invalid shortcode.\nTry *483*100#");
        return;
      }
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
    setDialed(false);
    setSessionText("");
    setSessionEnded(false);
    setDial("");
    setInput("");
    setDisplay("Welcome.\nDial KaLI shortcode\n*483*100#\nthen press Send.");
  }

  const keypad = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  function press(k: string) {
    if (!dialed) setDial((d) => d + k);
    else if (!sessionEnded) setInput((v) => v + k);
  }

  function backspace() {
    if (!dialed) setDial((d) => d.slice(0, -1));
    else setInput((v) => v.slice(0, -1));
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Field Channel · Zero-bandwidth</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground sm:text-4xl">Farmer Phone Simulator</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Live USSD sessions via the backend graph API. Dial <span className="font-mono text-foreground">{SHORTCODE}</span>{" "}
          — registrations and credit requests write to Neo4j and appear on the officer dashboard.
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
          {smsLive && (
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] text-success">
              SMS inbox live
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
                <span>📶 ▮▮▮▯</span>
                <span>{loading ? "…" : "78%"}</span>
              </div>
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
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Session text: <span className="font-mono">{sessionText || "(new)"}</span>
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
                { code: "2", label: "Check Loan Status", desc: "Live graph score from backend" },
                { code: "3", label: "Climate Advisory", desc: "Zone advisory via Cooperative → ClimateZone path" },
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
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">SMS Inbox</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Decision relays from Neo4j <code className="text-xs">NOTIFIED</code> edges — polls every 8s.
                </p>
              </div>
              <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] text-success">
                {smsList.length} message{smsList.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {smsList.length === 0 && (
                <li className="text-sm text-muted-foreground">No messages yet for {phoneNumber}.</li>
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
  };
  const m = map[cat] || map.decision;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.tone}`}>{m.label}</span>;
}
