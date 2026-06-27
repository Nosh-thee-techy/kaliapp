import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDot,
  Leaf,
  Loader2,
  Sparkles,
  Sprout,
  Target,
} from "lucide-react";
import { fetchFarmerReadiness, completeReadinessAction, type FarmerReadiness } from "@/lib/api-core";

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
  const [lang, setLang] = useState<"en" | "sw" | "lg">("en");
  const [data, setData] = useState<FarmerReadiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.98_0.015_135)]">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.75 0.04 135 / 0.15) 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-md items-center justify-between px-5 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <div className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow">
            <Sprout className="h-4 w-4" />
          </span>
          KaLI
        </div>
        <Link to="/farmer" className="text-xs font-medium text-primary hover:underline">
          USSD
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-md px-5 pb-20">
        {!data && !loading && (
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Leaf className="h-3 w-3" />
              For farmers
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-foreground">
              My credit
              <span className="block text-primary">readiness</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Enter your KTDA or society number. See your score and what to do next — no password needed.
            </p>
          </div>
        )}

        <div className="mt-8 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-elevated backdrop-blur-md">
          <form onSubmit={handleSubmit}>
            <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Member number
            </label>
            <div className="mt-2.5 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="KTDA-43456789"
                className="flex-1 rounded-2xl border border-border/80 bg-white px-4 py-3.5 text-base text-foreground shadow-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
              </button>
            </div>
          </form>

          <div className="mt-4 flex gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-all ${
                  lang === l.code
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Demo: <button type="button" onClick={() => { setInput("KTDA-43456789"); load("KTDA-43456789"); }} className="font-mono text-primary hover:underline">KTDA-43456789</button>
          </p>
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && !data && (
          <div className="mt-12 flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            Loading your profile…
          </div>
        )}

        {data && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-elevated backdrop-blur-md">
              <div className="bg-gradient-to-br from-primary/8 via-transparent to-accent/10 px-6 pt-6 pb-4 text-center">
                <p className="font-display text-lg font-semibold text-foreground">{data.farmer.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.farmer.crop} · {data.farmer.cooperative || data.farmer.zone}
                </p>
                <ScoreRing score={data.readiness.score} band={data.readiness.band} />
                {data.readiness.mitigationBonus ? (
                  <p className="mt-2 text-[11px] font-medium text-success">
                    +{data.readiness.mitigationBonus} ground-truth bonus applied
                  </p>
                ) : null}
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3 w-3" />
                  {data.readiness.label}
                </p>
              </div>
            </div>

            {data.macroAdvisory && (
              <section className="rounded-2xl border border-warning/30 bg-warning/8 p-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-warning-foreground">
                  <Target className="h-3.5 w-3.5" />
                  Zone advisory
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-foreground">{data.macroAdvisory}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Complete the actions below — your agronomist can verify on the ground to boost your score.
                </p>
              </section>
            )}

            {data.headline && (
              <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/12 to-accent/5 p-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
                  <Target className="h-3.5 w-3.5" />
                  Your next step
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-foreground">{data.headline}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">Saved from your KaLI SMS — always here for you.</p>
              </section>
            )}

            <section className="rounded-2xl border border-border/60 bg-white/80 p-5 shadow-card backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Action points</h2>
                {totalActions > 0 && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {doneCount}/{totalActions} done
                  </span>
                )}
              </div>
              {totalActions > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
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
                            ? "border-success/30 bg-success/8"
                            : "border-border/80 bg-background hover:border-primary/25 hover:shadow-sm disabled:opacity-70"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                            done
                              ? "bg-success text-success-foreground"
                              : "bg-primary/10 text-primary group-hover:bg-primary/20"
                          }`}
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span className="flex-1">
                          <span className={`block text-sm leading-snug ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {a.title}
                          </span>
                          {a.fieldVerified && (
                            <span className="mt-1 inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
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
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{s.summary}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.missing.length > 0 && (
              <section className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/20 p-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Still to build</h2>
                <ul className="mt-2.5 space-y-1.5">
                  {data.missing.map((m) => (
                    <li key={m.id} className="flex gap-2 text-sm text-muted-foreground">
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
              className="w-full py-3 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Use a different member number
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function ScoreRing({ score, band }: { score: number; band: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const stroke =
    band === "ready" ? "var(--success)" : band === "almost" ? "var(--accent)" : "var(--muted-foreground)";

  return (
    <div className="relative mx-auto mt-6 h-40 w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="oklch(0.92 0.02 135)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-semibold tabular-nums leading-none text-foreground">{score}</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
