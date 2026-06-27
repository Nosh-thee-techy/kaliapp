import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  AudioLines,
  Check,
  ChevronRight,
  CircleDot,
  CloudRain,
  Leaf,
  ListChecks,
  Loader2,
  MessageSquare,
  Mic,
  Sprout,
  Target,
  TrendingUp,
} from "lucide-react";
import farmerImg from "@/assets/farmer.jpg";
import { fetchFarmerReadiness, completeReadinessAction, type FarmerReadiness } from "@/lib/api-core";
import { KaliVoice } from "@/components/KaliVoice";
import { readinessCopy, whySectionTitle, type KaliVoiceLang } from "@/lib/kali-voice";

export const Route = createFileRoute("/readiness")({
  head: () => ({
    meta: [
      { title: "My Readiness — KaLI" },
      { name: "description", content: "Check your credit readiness and next steps — KTDA, phone, or member ID." },
    ],
  }),
  component: ReadinessPage,
});

const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "lg", label: "Luganda", flag: "🇺🇬" },
] as const;

function ReadinessPage() {
  const [lookup, setLookup] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("kali.readiness.lookup") || "" : "",
  );
  const [input, setInput] = useState(lookup);
  const [lang, setLang] = useState<KaliVoiceLang>("en");
  const [data, setData] = useState<FarmerReadiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [kaliOpen, setKaliOpen] = useState(false);
  const actionsRef = useRef<HTMLElement>(null);

  const copy = readinessCopy(lang);

  const load = useCallback(
    (id: string) => {
      if (!id.trim()) return;
      setLoading(true);
      setError(null);
      fetchFarmerReadiness(id.trim(), lang)
        .then((r) => {
          setData(r);
          sessionStorage.setItem("kali.readiness.lookup", id.trim());
          setLookup(id.trim());
        })
        .catch((err) => {
          setData(null);
          const msg = err instanceof Error ? err.message : "";
          setError(
            msg.includes("fetch") || msg.includes("timeout") || msg.includes("4000")
              ? "Cannot reach the server. Start the backend: cd backend && npm run dev"
              : "We could not find that member number. Try KTDA-43456789 for demo.",
          );
        })
        .finally(() => setLoading(false));
    },
    [lang],
  );

  useEffect(() => {
    if (lookup) load(lookup);
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(input);
  }

  const doneCount = data ? data.actionPoints.filter((a) => a.done).length : 0;
  const totalActions = data?.actionPoints.length ?? 0;
  const pendingActions = data?.actionPoints.filter((a) => !a.done) ?? [];
  const nextAction = pendingActions[0];
  const whyMessage = data?.whyMessage ?? data?.headline ?? null;

  async function toggleAction(actionId: string, currentlyDone: boolean) {
    if (!lookup || currentlyDone) return;
    setSavingId(actionId);
    try {
      await completeReadinessAction(lookup, actionId);
      setData((prev) =>
        prev
          ? {
              ...prev,
              actionPoints: prev.actionPoints.map((a) => (a.id === actionId ? { ...a, done: true } : a)),
            }
          : prev,
      );
    } catch {
      setError("Could not save that step. Check your connection and try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.12_0.02_280)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(120,80,255,0.25),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(180,255,80,0.08),transparent_50%)]" />

      <header className="relative z-10 mx-auto flex max-w-md items-center justify-between px-5 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <div className="flex items-center gap-2 font-display text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-charcoal">
            <Sprout className="h-4 w-4" />
          </span>
          KaLI
        </div>
        <div className="w-14" />
      </header>

      <div className={`relative z-10 mx-auto max-w-md px-5 ${data ? "pb-32" : "pb-20"}`}>
        {!data && !loading && (
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
              <Leaf className="h-3 w-3" />
              For farmers
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight">
              My credit
              <span className="block text-accent">readiness</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/55">
              Enter your KTDA or society number. See your score and what to do next — no password needed.
            </p>
          </div>
        )}

        {data && (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{copy.greeting(data.farmer.name)}</h1>
            <p className="mt-1 text-sm text-white/50">{copy.subtitle}</p>
          </div>
        )}

        <div
          className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-elevated backdrop-blur-md ${data ? "mt-5" : "mt-8"}`}
        >
          {!data && (
            <form onSubmit={handleSubmit}>
              <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Member number
              </label>
              <div className="mt-2.5 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="KTDA-43456789"
                  className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-accent text-charcoal shadow-lime transition-transform hover:scale-[1.03] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
                </button>
              </div>
            </form>
          )}

          {data && (
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
              {lookup} · {data.farmer.cooperative || data.farmer.zone}
            </p>
          )}

          <div className={`flex gap-2 ${data ? "mt-3" : "mt-4"}`}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-all ${
                  lang === l.code
                    ? "bg-accent text-charcoal shadow-sm"
                    : "bg-white/5 text-white/55 hover:bg-white/10"
                }`}
              >
                <span>{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>

          {!data && (
            <p className="mt-3 text-center text-[11px] text-white/40">
              Demo:{" "}
              <button
                type="button"
                onClick={() => {
                  setInput("KTDA-43456789");
                  load("KTDA-43456789");
                }}
                className="font-mono text-accent hover:underline"
              >
                KTDA-43456789
              </button>
            </p>
          )}
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-red-200">
            {error}
          </p>
        )}

        {loading && !data && (
          <div className="mt-12 flex flex-col items-center gap-3 text-sm text-white/50">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            Loading your profile…
          </div>
        )}

        {data && (
          <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero card — score + farmer context */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-elevated">
              <img src={farmerImg} alt="" className="h-44 w-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.02_280)] via-[oklch(0.12_0.02_280/0.4)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
                <div>
                  <p className="text-xs text-white/60">{data.farmer.crop}</p>
                  <p className="font-display text-lg font-semibold">{data.readiness.label}</p>
                  {pendingActions.length > 0 && (
                    <p className="mt-0.5 text-[11px] font-medium text-accent">{copy.actionsLeft(pendingActions.length)}</p>
                  )}
                </div>
                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md">
                  <span className="font-display text-2xl font-semibold tabular-nums leading-none">{data.readiness.score}</span>
                  <span className="text-[9px] uppercase tracking-wider text-white/50">/ 100</span>
                </div>
              </div>
            </div>

            {/* Primary CTA — Speak with Kali (Valyioo-style) */}
            <button
              type="button"
              onClick={() => setKaliOpen(true)}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff6b2c] to-[#ff8f4c] px-6 py-4 text-base font-bold text-white shadow-[0_8px_32px_rgba(255,107,44,0.45)] transition-all hover:shadow-[0_12px_40px_rgba(255,107,44,0.55)] active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Mic className="h-5 w-5" />
              </span>
              {copy.speakKali}
              <AudioLines className="h-5 w-5 opacity-80 transition-transform group-hover:scale-110" />
            </button>
            <p className="-mt-2 text-center text-[11px] text-white/45">{copy.speakKaliHint}</p>

            {(whyMessage || data.latestMessage) && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {whyMessage
                    ? whySectionTitle(data.readiness.stance, copy)
                    : copy.lastSms}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/85">
                  {whyMessage || data.latestMessage?.body}
                </p>
                <p className="mt-2 text-[11px] text-white/40">{copy.smsPortalHint}</p>
              </section>
            )}

            {/* Next step card — portal actions only, never SMS text */}
            {nextAction && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{copy.nextStep}</span>
                  <span className="rounded-full bg-[#ff6b2c] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {copy.nextBadge}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium leading-relaxed text-white/90">{nextAction.title}</p>
                <button
                  type="button"
                  disabled={savingId === nextAction.id}
                  onClick={() => toggleAction(nextAction.id, false)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-charcoal transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {savingId === nextAction.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {copy.markDone}
                </button>
                <p className="mt-3 text-center text-[11px] text-white/40">{copy.pushKali}</p>
              </section>
            )}

            {/* Quick actions grid */}
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{copy.quickActions}</p>
              <div className="grid grid-cols-2 gap-3">
                <QuickTile icon={Mic} label={copy.talkKali} accent onClick={() => setKaliOpen(true)} />
                <QuickTile
                  icon={ListChecks}
                  label={copy.completeAction}
                  badge={pendingActions.length > 0 ? String(pendingActions.length) : undefined}
                  onClick={() => actionsRef.current?.scrollIntoView({ behavior: "smooth" })}
                />
                <QuickTile
                  icon={CloudRain}
                  label={copy.climateTip}
                  onClick={() => {
                    if (data.macroAdvisory) {
                      document.getElementById("zone-advisory")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                />
                <QuickTile
                  icon={TrendingUp}
                  label={copy.myScore}
                  sub={`${data.readiness.score}/100`}
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                />
              </div>
            </section>

            {data.macroAdvisory && (
              <section id="zone-advisory" className="rounded-2xl border border-warning/25 bg-warning/10 p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-warning">
                  <Target className="h-3.5 w-3.5" />
                  Zone advisory
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-white/85">{data.macroAdvisory}</p>
              </section>
            )}

            <section ref={actionsRef} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Action points</h2>
                {totalActions > 0 && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/60">
                    {doneCount}/{totalActions}
                  </span>
                )}
              </div>
              {totalActions > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-[#ff6b2c] transition-all duration-500"
                    style={{ width: `${(doneCount / totalActions) * 100}%` }}
                  />
                </div>
              )}
              <ul className="mt-4 space-y-2.5">
                {data.actionPoints.map((a, i) => {
                  const done = a.done;
                  const saving = savingId === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        disabled={done || saving}
                        onClick={() => toggleAction(a.id, done)}
                        className={`group flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                          done
                            ? "border-success/30 bg-success/10"
                            : "border-white/10 bg-black/20 hover:border-accent/30"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            done ? "bg-success text-charcoal" : "bg-accent/20 text-accent"
                          }`}
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span className="flex-1">
                          <span className={`block text-sm leading-snug ${done ? "text-white/40 line-through" : "text-white/90"}`}>
                            {a.title}
                          </span>
                          {a.fieldVerified && (
                            <span className="mt-1 inline-block rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold text-success">
                              Verified on farm
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {data.strengths.length > 0 && (
              <section className="rounded-2xl border border-success/20 bg-success/5 p-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-success">Lenders already trust</h2>
                <ul className="mt-2.5 space-y-2">
                  {data.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-white/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{s.summary}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.missing.length > 0 && (
              <section className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Still to build</h2>
                <ul className="mt-2.5 space-y-1.5">
                  {data.missing.map((m) => (
                    <li key={m.id} className="flex gap-2 text-sm text-white/50">
                      <CircleDot className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
                      {m.label}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <button
              type="button"
              onClick={() => {
                setData(null);
                setInput("");
                setLookup("");
                sessionStorage.removeItem("kali.readiness.lookup");
              }}
              className="w-full py-3 text-center text-xs font-medium text-white/35 transition-colors hover:text-white/60"
            >
              Use a different member number
            </button>
          </div>
        )}

        {data && lookup && (
          <>
            <KaliVoice
              lookup={lookup}
              lang={lang}
              readiness={data}
              open={kaliOpen}
              onOpenChange={setKaliOpen}
              hideFloatButton
            />

            {/* Sticky bottom bar — central Kali FAB */}
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[oklch(0.12_0.02_280/0.95)] px-6 pb-5 backdrop-blur-xl">
              <div className="mx-auto flex max-w-md items-center justify-around py-3">
                <Link to="/" className="flex flex-col items-center gap-0.5 text-[10px] text-white/45 hover:text-white/70">
                  <Sprout className="h-5 w-5" />
                  Home
                </Link>
                <button
                  type="button"
                  onClick={() => setKaliOpen(true)}
                  className="-mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b2c] to-[#ff8f4c] text-white shadow-[0_8px_28px_rgba(255,107,44,0.5)] transition-transform hover:scale-105 active:scale-95"
                  aria-label={copy.speakKali}
                >
                  <Mic className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  onClick={() => actionsRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="relative flex flex-col items-center gap-0.5 text-[10px] text-white/45 hover:text-white/70"
                >
                  <ListChecks className="h-5 w-5" />
                  Steps
                  {pendingActions.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff6b2c] px-1 text-[9px] font-bold text-white">
                      {pendingActions.length}
                    </span>
                  )}
                </button>
              </div>
            </nav>
          </>
        )}
      </div>
    </main>
  );
}

function QuickTile({
  icon: Icon,
  label,
  sub,
  badge,
  accent,
  onClick,
}: {
  icon: typeof Mic;
  label: string;
  sub?: string;
  badge?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
        accent
          ? "border-[#ff6b2c]/30 bg-[#ff6b2c]/10 hover:bg-[#ff6b2c]/15"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      {badge && (
        <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff6b2c] px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          accent ? "bg-[#ff6b2c]/25 text-[#ff8f4c]" : "bg-white/10 text-accent"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-xs font-semibold leading-tight text-white/90">{label}</span>
      {sub && <span className="text-[10px] text-white/45">{sub}</span>}
    </button>
  );
}
