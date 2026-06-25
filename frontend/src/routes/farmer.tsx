import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { smsOutbox, formatRelative } from "@/lib/mock-data";

export const Route = createFileRoute("/farmer")({
  head: () => ({
    meta: [
      { title: "Farmer Phone Simulator — KaLI" },
      { name: "description", content: "USSD session and SMS inbox simulator for the farmer-side experience." },
    ],
  }),
  component: FarmerPage,
});

type Screen =
  | { kind: "idle" }
  | { kind: "menu" }
  | { kind: "register"; step: number; values: string[] }
  | { kind: "credit"; step: number; values: string[] }
  | { kind: "done"; message: string };

function FarmerPage() {
  const [screen, setScreen] = useState<Screen>({ kind: "idle" });
  const [dial, setDial] = useState("");
  const [display, setDisplay] = useState<string>(
    "Welcome.\nDial KaLI shortcode\n*483*100#\nthen press Send.",
  );
  const [input, setInput] = useState("");

  function send() {
    if (screen.kind === "idle") {
      if (dial.replace(/\s/g, "") !== "*483*100#") {
        setDisplay("Invalid shortcode.\nTry *483*100#");
        return;
      }
      setScreen({ kind: "menu" });
      setDisplay(
        "KaLI · Kilimo Loans\nReply with number:\n1. Request Input Credit\n2. Register New Farmer\n3. Check Loan Status\n4. Climate Advisory\n0. Exit",
      );
      return;
    }

    if (screen.kind === "menu") {
      if (input === "1") {
        setScreen({ kind: "credit", step: 0, values: [] });
        setDisplay("Request Input Credit\n\nEnter Cooperative Code\n(e.g. COOP-NVS-04)");
      } else if (input === "2") {
        setScreen({ kind: "register", step: 0, values: [] });
        setDisplay("Register New Farmer\n\nEnter your National ID number");
      } else if (input === "3") {
        setScreen({ kind: "done", message: "" });
        setDisplay(
          "Status check\n\nApplication F-1042\nStatus: Ready for Review\nKaLI Score: 75/100\n\nSMS dispatched shortly.",
        );
      } else if (input === "4") {
        setScreen({ kind: "done", message: "" });
        setDisplay(
          "Climate Advisory · KE-RIFT-04\n\nFall armyworm 18km NE.\nScout maize plots within 72h.\n\nEnd of session.",
        );
      } else if (input === "0") {
        reset();
        return;
      } else {
        setDisplay("Invalid option.\nReply 1-4 or 0 to exit.");
      }
      setInput("");
      return;
    }

    if (screen.kind === "register") {
      const next = [...screen.values, input];
      const prompts = [
        "Enter your full name",
        "Enter target crop\n(e.g. Maize, Beans)",
        "Enter intended acreage\n(e.g. 2)",
      ];
      if (screen.step < prompts.length) {
        setScreen({ kind: "register", step: screen.step + 1, values: next });
        setDisplay(prompts[screen.step]);
      } else {
        setScreen({ kind: "done", message: "registered" });
        setDisplay(
          "Registration received.\nA Branch Officer will\nreview your profile.\nYou will receive an SMS\nwith your KaLI rating\nshortly.\n\nEnd of session.",
        );
      }
      setInput("");
      return;
    }

    if (screen.kind === "credit") {
      const next = [...screen.values, input];
      const prompts = [
        "Enter intended acreage\n(e.g. 2)",
        "Enter target crop\n(e.g. French Beans)",
        "Enter amount in KES\n(e.g. 45000)",
      ];
      if (screen.step < prompts.length) {
        setScreen({ kind: "credit", step: screen.step + 1, values: next });
        setDisplay(prompts[screen.step]);
      } else {
        setScreen({ kind: "done", message: "credit" });
        setDisplay(
          "Metrics compiling.\nYour request joins the\nbranch officer queue.\nYou will receive an SMS\nbreakdown shortly.\n\nEnd of session.",
        );
      }
      setInput("");
      return;
    }

    if (screen.kind === "done") reset();
  }

  function reset() {
    setScreen({ kind: "idle" });
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
    if (screen.kind === "idle") setDial((d) => d + k);
    else setInput((v) => v + k);
  }

  function backspace() {
    if (screen.kind === "idle") setDial((d) => d.slice(0, -1));
    else setInput((v) => v.slice(0, -1));
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Field Channel · Zero-bandwidth</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground sm:text-4xl">Farmer Phone Simulator</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The farmer side runs entirely on USSD sessions and SMS push — no data, no app. Try the keypad below
          to walk through what a farmer dialling <span className="font-mono text-foreground">*483*100#</span> sees.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        {/* Phone mockup */}
        <div className="mx-auto">
          <div className="relative rounded-[2.5rem] bg-gradient-soil p-4 shadow-elevated">
            <div className="rounded-[2rem] bg-zinc-900 p-3">
              <div className="mb-3 flex items-center justify-between px-2 text-[10px] text-zinc-400">
                <span>Safaricom</span>
                <span>📶 ▮▮▮▯</span>
                <span>78%</span>
              </div>
              <div className="min-h-[260px] rounded-md bg-[oklch(0.85_0.08_135)] p-4 font-mono text-[13px] leading-snug text-zinc-900 shadow-inner">
                {screen.kind === "idle" ? (
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
                    {screen.kind !== "done" && (
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

              {/* Keypad */}
              <div className="mt-4 space-y-2">
                {keypad.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 gap-2">
                    {row.map((k) => (
                      <button
                        key={k}
                        onClick={() => press(k)}
                        className="rounded-md bg-zinc-700 py-2 text-base font-semibold text-zinc-100 transition-colors active:bg-zinc-600"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={reset}
                    className="rounded-md bg-destructive/80 py-2 text-xs font-semibold text-destructive-foreground active:bg-destructive"
                  >
                    End
                  </button>
                  <button
                    onClick={backspace}
                    className="rounded-md bg-zinc-600 py-2 text-xs font-semibold text-zinc-100 active:bg-zinc-500"
                  >
                    ⌫
                  </button>
                  <button
                    onClick={send}
                    className="rounded-md bg-success py-2 text-xs font-semibold text-success-foreground active:opacity-80"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Feature-phone USSD · Africa's Talking gateway in production
          </p>
        </div>

        {/* Right: USSD spec + SMS inbox */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-foreground">USSD Menu Router</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Evaluates incoming MSISDN. Unlinked numbers see registration; recognized numbers see a customized branching menu.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { code: "1", label: "Request Input Credit", desc: "Coop code → acreage → crop → amount" },
                { code: "2", label: "Register New Farmer", desc: "National ID → name → crop → acreage" },
                { code: "3", label: "Check Loan Status", desc: "Pulls latest decision from SQLite" },
                { code: "4", label: "Climate Advisory", desc: "Pushes zone-specific CHIRPS/ICPAC alert" },
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
                <h2 className="font-display text-lg font-semibold text-foreground">SMS Outbox</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Decision relays + geospatial climate broadcasts dispatched by the branch system.
                </p>
              </div>
              <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] text-success">
                {smsOutbox.length} sent · last 72h
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {smsOutbox.map((sms) => (
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

function CategoryPill({ cat }: { cat: "decision" | "climate" | "registration" }) {
  const map = {
    decision: { label: "Decision", tone: "bg-primary/10 text-primary" },
    climate: { label: "Climate", tone: "bg-warning/15 text-warning-foreground" },
    registration: { label: "Registration", tone: "bg-secondary text-secondary-foreground" },
  } as const;
  const m = map[cat];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.tone}`}>{m.label}</span>;
}
