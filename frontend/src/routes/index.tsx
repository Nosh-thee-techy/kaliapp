import { createFileRoute, Link } from "@tanstack/react-router";
import { Sprout, Smartphone, CloudRain, Scale, ShieldCheck, Sparkles, ArrowRight, Bug, Users, Banknote, Leaf, Target, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { farmers as mockFarmers, climateSignals } from "@/lib/mock-data";
import { fetchPublicStats } from "@/lib/api-core";
import type { PublicStats } from "@/lib/api-core";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KaLI — Climate-smart credit for smallholder farmers" },
      { name: "description", content: "KaLI scores smallholder farmers on cooperative ties, mobile money, and live climate signals — so branch officers can lend fairly and fast." },
    ],
  }),
  component: LandingPage,
});

const PILLARS = [
  {
    icon: Smartphone,
    title: "USSD-first onboarding",
    body: "Farmers register on any feature phone via *483#. No smartphone, no data plan, no branch visit required.",
  },
  {
    icon: Users,
    title: "Cooperative & chama signals",
    body: "Delivery history with the local cooperative and chama savings discipline replace traditional collateral.",
  },
  {
    icon: CloudRain,
    title: "Live climate scoring",
    body: "CHIRPS rainfall, ICPAC SPI drought index, and KALRO pest proximity feeds adjust risk in real time.",
  },
  {
    icon: Scale,
    title: "Explainable decisions",
    body: "Every score shows its drivers and drags. Officers can override with a written rationale — fully audited.",
  },
];

const STEPS = [
  { n: "01", t: "Farmer dials *483#", d: "Picks crop, requests amount, consents to data sharing." },
  { n: "02", t: "Signals stream in", d: "Co-op deliveries, M-Pesa inflows, climate grids merge into one profile." },
  { n: "03", t: "Officer reviews", d: "Scorecard explains the number. Approve, refer, or decline in one tap." },
  { n: "04", t: "SMS goes out", d: "Decision and climate advisories reach the farmer in their language." },
];

function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    fetchPublicStats()
      .then((s) => {
        setStats(s);
        setLive(true);
      })
      .catch(() => setLive(false));
  }, []);

  const ready = stats?.ready ?? mockFarmers.filter((f) => f.status === "ready_for_review").length;
  const advisories = stats?.advisories ?? Object.values(climateSignals).filter((c) => c.advisory).length;
  const womenYouth = stats?.womenYouth ?? mockFarmers.filter((f) => f.segment === "Women" || f.segment === "Youth").length;

  return (
    <main className="relative overflow-hidden">
      {/* TOP NAV */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 text-primary-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-glow">
              <Sprout className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold">KaLI</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/70">Kenya Agri Lending Intelligence</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-primary-foreground/80 md:flex">
            <a href="#what" className="rounded-md px-3 py-1.5 hover:text-primary-foreground">What it is</a>
            <a href="#readiness" className="rounded-md px-3 py-1.5 hover:text-primary-foreground">My readiness</a>
            <a href="#how" className="rounded-md px-3 py-1.5 hover:text-primary-foreground">How it works</a>
            <a href="#impact" className="rounded-md px-3 py-1.5 hover:text-primary-foreground">Impact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/readiness"
              className="hidden rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-2 text-sm font-medium text-primary-foreground backdrop-blur hover:bg-primary-foreground/15 sm:inline-flex"
            >
              Farmers
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              Officer sign in <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative bg-gradient-forest pb-32 pt-32 text-primary-foreground sm:pt-40">
        <FieldDecor />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-xs font-medium text-primary-foreground/85 backdrop-blur">
              <Leaf className="h-3.5 w-3.5 text-accent" />
              For Kenyan branch officers · Pilot live in Naivasha
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Credit that reads
              <span className="block text-accent">the weather, not just the wallet.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-primary-foreground/80 sm:text-lg">
              KaLI turns cooperative deliveries, chama savings, mobile money flows, and live drought &
              pest signals into a transparent loan decision — so a smallholder without a title deed
              still gets a fair hearing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/readiness"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                Check my readiness <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/5 px-5 py-3 text-sm font-medium text-primary-foreground backdrop-blur hover:bg-primary-foreground/10"
              >
                Officer portal
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/5 px-5 py-3 text-sm font-medium text-primary-foreground backdrop-blur hover:bg-primary-foreground/10"
              >
                See how it works
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-primary-foreground/15 pt-6 text-left">
              <MiniStat k={ready} label="Ready for review" />
              <MiniStat k={advisories} label="Climate advisories live" />
              <MiniStat k={womenYouth} label="Women + Youth in queue" />
              {live && (
                <p className="col-span-3 text-[10px] uppercase tracking-wider text-primary/80">Live Neo4j portfolio</p>
              )}
            </div>
          </div>

          <PhoneMock />
        </div>
      </section>

      {/* FARMER READINESS */}
      <section id="readiness" className="border-y border-border bg-[oklch(0.98_0.015_135)] py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Target className="h-3.5 w-3.5" />
              For farmers · Kenya & Uganda
            </span>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Your readiness,
              <span className="block text-primary">in one place.</span>
            </h2>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              Tea farmers enter a KTDA number. Everyone else uses their society ID or phone. No app install, no password —
              just your member number and the action steps we already send by SMS, saved as a simple checklist.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "See your credit readiness score (0–100)",
                "Get your next step in English, Kiswahili, or Luganda",
                "Tick off action points as you complete them",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/readiness"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              Open My Readiness <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ReadinessPreview />
        </div>
      </section>

      {/* PILLARS */}
      <section id="what" className="bg-background py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">What KaLI is</span>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              A second opinion on every loan, grounded in the field.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Branch officers in rural Kenya juggle thin files and weather they can't predict. KaLI gives
              them four lenses, all in one screen.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => (
              <div
                key={p.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                <span className="absolute right-4 top-4 font-mono text-[10px] text-muted-foreground/50">0{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">How it works</span>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                From feature phone to disbursement, in four moves.
              </h2>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent"
            >
              See a live portfolio <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-accent">{s.n}</span>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 lg:rotate-0" />
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact" className="relative overflow-hidden bg-background py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Why it matters</span>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              We don't bucket Women, Youth, PWD and General into one queue.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              KaLI segments applicants so branch decisions can be audited for equity — and asset-substitute rules
              ensure a farmer without a title deed but with three years of co-op deliveries still qualifies.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, t: "Auditable", d: "Every override carries a reason and a timestamp." },
                { icon: Sparkles, t: "Fair-by-design", d: "Asset substitutes for landless smallholders." },
                { icon: Banknote, t: "M-Pesa-aware", d: "Real cashflow, not just declared income." },
                { icon: Bug, t: "Pest-aware", d: "Outbreaks within 25km warn the officer instantly." },
              ].map((x) => (
                <div key={x.t} className="rounded-xl border border-border bg-card p-4">
                  <x.icon className="h-4 w-4 text-accent" />
                  <div className="mt-2 text-sm font-semibold text-foreground">{x.t}</div>
                  <div className="text-xs text-muted-foreground">{x.d}</div>
                </div>
              ))}
            </div>
          </div>
          <ClimateMap />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-forest py-20 text-primary-foreground texture-leaf">
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6">
          <Sprout className="h-10 w-10 text-accent" />
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Lend with the climate, not against it.
          </h2>
          <p className="mt-4 max-w-xl text-primary-foreground/80">
            Sign in to your branch portal to triage today's applications.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            Sign in to KaLI <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:px-6">
          <div>© {new Date().getFullYear()} KaLI · A climate-smart credit tool for Kenyan branch officers.</div>
          <div className="flex items-center gap-2">
            <Leaf className="h-3.5 w-3.5 text-accent" />
            Naivasha pilot · Built with cooperatives
          </div>
        </div>
      </footer>
    </main>
  );
}

function MiniStat({ k, label }: { k: number; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold text-accent">{k}</div>
      <div className="text-[11px] uppercase tracking-wider text-primary-foreground/70">{label}</div>
    </div>
  );
}

function FieldDecor() {
  return (
    <>
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary-glow/20 blur-3xl" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0 L0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </>
  );
}

function PhoneMock() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, []);
  const sms = [
    { from: "KaLI", body: "Rating 78/100. KES 45,000 approved. Repay after January harvest." },
    { from: "KaLI Alert", body: "Fall armyworm 18km NE — scout maize plots within 72h." },
    { from: "KaLI", body: "Drought advisory: SPI -2.1 in Garissa. Destocking guide sent." },
  ];
  const current = sms[tick % sms.length];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-accent/10 blur-2xl" />
      <div className="relative rounded-[2.5rem] border border-primary-foreground/15 bg-primary-foreground/5 p-3 shadow-elevated backdrop-blur-xl">
        <div className="overflow-hidden rounded-[2rem] bg-foreground p-5 text-background">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-background/60">
            <span>Safaricom · 4G</span>
            <span>9:14</span>
          </div>
          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-wider text-accent">USSD · *483#</div>
            <div className="mt-2 font-display text-2xl font-semibold leading-snug">
              Karibu, Mary.
            </div>
            <div className="mt-3 text-sm text-background/70">
              1. Apply for input loan<br />2. Check loan status<br />3. Climate alerts<br />4. Talk to officer
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-accent">{current.from}</div>
            <div className="mt-1 text-sm text-background">{current.body}</div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-background/50">
            <span>Reply HELP for officer</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessPreview() {
  const actions = [
    { done: true, text: "Deliver tea to your society this season" },
    { done: false, text: "Save with your chama every month" },
    { done: false, text: "Keep M-Pesa records active" },
  ];
  const done = actions.filter((a) => a.done).length;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-white shadow-elevated">
        <div className="bg-gradient-to-br from-primary/10 via-white to-accent/10 px-6 pt-8 pb-6 text-center">
          <p className="text-xs text-muted-foreground">James Mburu · Tea</p>
          <div className="relative mx-auto mt-4 h-32 w-32">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="oklch(0.94 0.02 135)" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={314}
                strokeDashoffset={314 - (46 / 100) * 314}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-4xl font-semibold text-foreground">46</span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">/ 100</span>
            </div>
          </div>
          <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            Building trust
          </span>
        </div>
        <div className="border-t border-border/60 bg-muted/20 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Your next step</p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">
            Keep delivering to your co-op — lenders see every season you show up.
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Action points</span>
            <span>{done}/{actions.length}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {actions.map((a, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                  a.done ? "border-success/30 bg-success/8 text-muted-foreground line-through" : "border-border bg-background"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${a.done ? "bg-success text-white" : "bg-primary/10 text-primary"}`}>
                  {a.done ? "✓" : i + 1}
                </span>
                {a.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ClimateMap() {
  const zones = Object.values(climateSignals);
  return (
    <div className="relative rounded-3xl border border-border bg-gradient-card p-6 shadow-elevated">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-accent">Live climate grid</div>
          <div className="mt-1 font-display text-xl font-semibold">6 zones · CHIRPS + ICPAC</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />synced 4h ago
        </span>
      </div>
      <div className="mt-5 grid gap-2.5">
        {zones.map((z) => {
          const sev = z.spi <= -1.5 ? "high" : z.spi <= -0.5 ? "mid" : "ok";
          const bar = sev === "high" ? "bg-destructive" : sev === "mid" ? "bg-accent" : "bg-success";
          const pct = Math.min(100, Math.max(8, ((z.spi + 3) / 6) * 100));
          return (
            <div key={z.zoneCode} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">{z.zoneCode}</span>
                <span className="font-semibold text-foreground">SPI {z.spi.toFixed(1)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
              </div>
              {z.advisory && (
                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-accent">
                  <Bug className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{z.advisory}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
