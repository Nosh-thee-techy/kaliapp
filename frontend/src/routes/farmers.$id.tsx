import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  farmers,
  climateSignals,
  computeScore,
  formatRelative,
  SEGMENT_META,
  STATUS_META,
  smsOutbox,
  auditLog,
  type Farmer,
} from "@/lib/mock-data";
import { fetchGraphScorecard, fetchAuditLog, fetchSmsMessages } from "@/lib/api-core";
import type { GraphScorecard, SmsMessage, AuditEntry } from "@/lib/api-core";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Sprout,
  Wallet,
  Users,
  Calendar,
  CloudRain,
  Bug,
  Droplets,
  Wheat,
  ShieldCheck,
  FileText,
  MessageSquare,
} from "lucide-react";
import { requireOfficerSession } from "@/lib/require-officer";
import { SadnessErrorPage } from "@/components/SadnessErrorPage";

export const Route = createFileRoute("/farmers/$id")({
  beforeLoad: requireOfficerSession,
  head: ({ params }) => ({
    meta: [
      { title: `Farmer ${params.id} — KaLI` },
      { name: "description", content: "Full farmer profile, repayment history, climate zone and SMS trail." },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const graph = await fetchGraphScorecard(params.id);
      const [audit, sms] = await Promise.all([
        fetchAuditLog({ farmerId: params.id, limit: 10 }),
        fetchSmsMessages({ farmerId: params.id, limit: 10 }),
      ]);
      return { source: "graph" as const, graph, audit, sms };
    } catch {
      const farmer = farmers.find((f) => f.id === params.id || f.nationalId === params.id);
      if (!farmer) throw notFound();
      return { source: "mock" as const, farmer };
    }
  },
  component: FarmerDetailPage,
  notFoundComponent: () => (
    <SadnessErrorPage
      variant="missing"
      actions={
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Back to dashboard
        </Link>
      }
    />
  ),
});

const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function graphToFarmer(g: GraphScorecard): Farmer {
  return {
    id: g.id,
    nationalId: g.national_id,
    name: g.name,
    phone: g.phone,
    vulnerabilityTag: g.vulnerability_tag as Farmer["vulnerabilityTag"],
    segment: g.segment as Farmer["segment"],
    cooperative: g.cooperative,
    coopCode: g.coop_code,
    zoneCode: g.zone_code,
    zoneName: g.zone_name,
    requestedKes: g.requested_kes,
    acreage: g.acreage,
    status: g.status as Farmer["status"],
    hasLandOwnership: g.has_land_ownership ? 1 : 0,
    leaseDurationMonths: g.lease_duration_months,
    cooperativeDeliveryYears: g.cooperative_delivery_years,
    chamaMonthsConsistent: g.chama_months_consistent,
    mobileMoneyInflowsKes: g.mobile_money_inflows_kes,
    harvestMonth: g.harvest_month,
    cropType: g.crop_type,
    registeredVia: g.registered_via as Farmer["registeredVia"],
    submittedIso: new Date().toISOString(),
  };
}

function FarmerDetailPage() {
  const data = Route.useLoaderData();
  const farmer = data.source === "graph" ? graphToFarmer(data.graph) : data.farmer;
  const climate =
    data.source === "graph"
      ? {
          zoneCode: data.graph.climate.zone_code,
          spi: data.graph.climate.spi,
          rainfallMmLast30d: data.graph.climate.rainfall_mm_last_30d,
          pestProximityKm: data.graph.climate.pest_proximity_km,
          advisory: data.graph.climate.advisory ?? undefined,
          lastSyncIso: data.graph.climate.last_sync_iso || new Date().toISOString(),
        }
      : climateSignals[farmer.zoneCode];
  const score =
    data.source === "graph"
      ? {
          total: data.graph.total,
          band: data.graph.band,
          drivers: data.graph.drivers,
          drags: data.graph.drags,
          assetSubstituteApplied: data.graph.asset_substitute_applied,
        }
      : computeScore(farmer, climate);
  const smsTrail: SmsMessage[] =
    data.source === "graph"
      ? data.sms
      : smsOutbox.filter((s) => s.farmerId === farmer.id).map((s) => ({ ...s }));
  const auditTrail: AuditEntry[] =
    data.source === "graph"
      ? data.audit
      : auditLog
          .filter((a) => a.farmerId === farmer.id)
          .map((a) => ({
            id: a.id,
            farmerId: a.farmerId,
            farmerName: a.farmerName,
            officer: a.officer,
            decision: a.decision,
            notes: a.notes,
            score: a.score,
            timestampIso: a.timestampIso,
          }));

  const monthlyBase = farmer.mobileMoneyInflowsKes / 12;

  const mpesa = MONTHS.map((m, i) => ({
    m,
    inflow: Math.round(monthlyBase * (0.7 + 0.3 * Math.sin(i / 2))),
    outflow: Math.round(monthlyBase * (0.5 + 0.2 * Math.cos(i / 2))),
  }));

  const rainfall = MONTHS.map((m, i) => ({
    m,
    mm: Math.max(2, Math.round(climate.rainfallMmLast30d * (0.5 + 0.5 * Math.sin(i / 1.8 + 1)))),
  }));

  const yieldTrend = [2020, 2021, 2022, 2023, 2024, 2025].map((y, i) => ({
    y: String(y),
    yield: Math.round((farmer.acreage || 1) * (6 + i * 1.1 + score.total / 50)) / 10,
  }));

  const repaymentShare = [
    { name: "On time", value: Math.min(95, 60 + Math.round(score.total * 0.35)), tone: "var(--success)" },
    { name: "Late <30d", value: Math.max(5, 25 - Math.round(score.total * 0.1)), tone: "var(--accent)" },
    { name: "Late >30d", value: Math.max(2, 15 - Math.round(score.total * 0.08)), tone: "var(--destructive)" },
  ];

  const scoreBands = [
    { name: "Score", value: score.total, fill: score.band === "Approve" ? "var(--success)" : score.band === "Refer" ? "var(--accent)" : "var(--destructive)" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to portfolio
      </Link>

      {/* HEADER */}
      <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-forest p-7 text-primary-foreground shadow-elevated texture-leaf">
          <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SEGMENT_META[farmer.segment].tone}`}>
                {SEGMENT_META[farmer.segment].label} · {farmer.vulnerabilityTag}
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-5xl">
                {farmer.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary-foreground/80">
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />{farmer.phone}</span>
                <span className="font-mono">ID {farmer.nationalId}</span>
                <span className="font-mono">{farmer.id}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" />{farmer.zoneName}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/scorecard/$id"
                  params={{ id: farmer.id }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground shadow-glow"
                >
                  Open scorecard
                </Link>
                <a className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/25 bg-primary-foreground/5 px-4 py-2 text-xs font-medium backdrop-blur hover:bg-primary-foreground/10">
                  <MessageSquare className="h-3 w-3" /> SMS farmer
                </a>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-primary-foreground/70">Requested</div>
              <div className="font-display text-4xl font-semibold text-accent">
                KES {(farmer.requestedKes / 1000).toFixed(0)}k
              </div>
              <div className="mt-1 text-xs text-primary-foreground/70">{farmer.cropType} · {farmer.acreage} acre</div>
            </div>
          </div>
        </div>

        {/* Score gauge */}
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-accent">KaLI Score</div>
              <div className="mt-1 font-display text-2xl font-semibold">{score.band}</div>
              <div className="text-xs text-muted-foreground">{STATUS_META[farmer.status].label}</div>
            </div>
            <div className="h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={scoreBands} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "var(--muted)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold text-foreground tabular-nums">{score.total}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
            <Tag tone="success" label="Drivers" v={score.drivers.length} />
            <Tag tone="warn" label="Drags" v={score.drags.length} />
            <Tag tone="primary" label="Substitute" v={score.assetSubstituteApplied ? "Yes" : "No"} />
          </div>
        </div>
      </section>

      {/* QUICK FACTS */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Fact icon={Users} label="Cooperative" value={farmer.cooperative} sub={farmer.coopCode} />
        <Fact icon={Calendar} label="Co-op tenure" value={`${farmer.cooperativeDeliveryYears} yr`} sub="deliveries" />
        <Fact icon={Wallet} label="M-Pesa 12mo" value={`KES ${(farmer.mobileMoneyInflowsKes / 1000).toFixed(0)}k`} sub="inflows" />
        <Fact icon={Sprout} label="Crop" value={farmer.cropType} sub={`Harvest ${farmer.harvestMonth}`} />
        <Fact icon={ShieldCheck} label="Land" value={farmer.hasLandOwnership ? "Titled" : `Lease ${farmer.leaseDurationMonths}mo`} sub={farmer.acreage ? `${farmer.acreage} acre` : "—"} />
        <Fact icon={FileText} label="Chama" value={`${farmer.chamaMonthsConsistent} mo`} sub="consistent" />
      </section>

      {/* CHARTS ROW */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <ChartCard title="M-Pesa cashflow" sub="12-month rolling, KES" icon={Wallet}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mpesa}>
              <defs>
                <linearGradient id="in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="inflow" stroke="var(--primary)" fill="url(#in)" strokeWidth={2} />
              <Area type="monotone" dataKey="outflow" stroke="var(--accent)" fill="url(#out)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Yield trend" sub={`${farmer.cropType} · tonnes / acre`} icon={Wheat}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={yieldTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="y" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="yield" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--accent)" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Repayment record" sub="Across all past loans" icon={ShieldCheck}>
          <div className="flex h-[220px] items-center gap-3">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={repaymentShare} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {repaymentShare.map((d, i) => (
                    <Cell key={i} fill={d.tone} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-2 text-xs">
              {repaymentShare.map((d) => (
                <li key={d.name} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.tone }} />
                    {d.name}
                  </span>
                  <span className="font-semibold tabular-nums">{d.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>
      </section>

      {/* CLIMATE + LOCATION */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-accent">Climate window · {farmer.zoneCode}</div>
              <h3 className="mt-1 font-display text-xl font-semibold">{farmer.zoneName}</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> CHIRPS · {formatRelative(climate.lastSyncIso)}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <ClimateMetric icon={Droplets} label="Rainfall 30d" value={`${climate.rainfallMmLast30d}mm`} tone="primary" />
            <ClimateMetric icon={CloudRain} label="SPI Index" value={climate.spi.toFixed(1)} tone={climate.spi <= -1.5 ? "destructive" : climate.spi <= -0.5 ? "accent" : "success"} />
            <ClimateMetric icon={Bug} label="Pest proximity" value={`${climate.pestProximityKm}km`} tone={climate.pestProximityKm < 25 ? "destructive" : "muted"} />
          </div>
          {climate.advisory && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
              <Bug className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="text-foreground"><strong>Advisory pushed:</strong> {climate.advisory}</span>
            </div>
          )}
          <div className="mt-5">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Rainfall trend · last 12 months</div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={rainfall}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="mm" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-accent">Where they farm</div>
          <h3 className="mt-1 font-display text-xl font-semibold">{farmer.zoneName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {farmer.cooperative} catchment · {farmer.acreage ? `${farmer.acreage} acre under ${farmer.cropType}` : `${farmer.cropType} enterprise`}
          </p>

          {/* Stylised zone map */}
          <div className="relative mt-4 aspect-square overflow-hidden rounded-2xl bg-gradient-forest text-primary-foreground">
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
              <defs>
                <pattern id="lines" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                  <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                </pattern>
                <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d="M20,140 Q60,40 110,60 T190,120 Q160,200 80,180 Z" fill="url(#lines)" stroke="var(--accent)" strokeOpacity="0.6" strokeWidth="1.5" />
              <circle cx="105" cy="105" r="42" fill="url(#glow)" />
              <circle cx="105" cy="105" r="5" fill="var(--accent)" />
              <circle cx="105" cy="105" r="10" fill="none" stroke="var(--accent)" strokeOpacity="0.6">
                <animate attributeName="r" from="6" to="36" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.7" to="0" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <text x="105" y="135" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.8" fontFamily="ui-monospace">{farmer.zoneCode}</text>
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-secondary/60 p-2.5">
              <div className="text-muted-foreground">Registered via</div>
              <div className="mt-0.5 font-semibold">{farmer.registeredVia}</div>
            </div>
            <div className="rounded-lg bg-secondary/60 p-2.5">
              <div className="text-muted-foreground">Submitted</div>
              <div className="mt-0.5 font-semibold">{formatRelative(farmer.submittedIso)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* SCORE BREAKDOWN + SMS TRAIL */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Why this score?</h3>
          <div className="mt-4 space-y-2">
            {score.drivers.map((d, i) => (
              <DriverRow key={`d${i}`} sign="+" label={d.label} detail={d.detail} points={d.points} positive />
            ))}
            {score.drags.map((d, i) => (
              <DriverRow key={`g${i}`} sign="" label={d.label} detail={d.detail} points={d.points} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">SMS & audit trail</h3>
            <span className="text-xs text-muted-foreground">{smsTrail.length + auditTrail.length} events</span>
          </div>
          <div className="mt-4 space-y-3">
            {smsTrail.length === 0 && auditTrail.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages or decisions logged yet.</p>
            )}
            {smsTrail.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>SMS · {s.category}</span>
                  <span>{formatRelative(s.sentIso)}</span>
                </div>
                <div className="mt-1 text-sm text-foreground">{s.body}</div>
              </div>
            ))}
            {auditTrail.map((a) => (
              <div key={a.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-primary">
                  <span>Officer decision · {a.decision}</span>
                  <span>{formatRelative(a.timestampIso)}</span>
                </div>
                <div className="mt-1 text-sm">{a.notes} · by {a.officer} · score {a.score ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Fact({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <Icon className="h-4 w-4 text-accent" />
      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold text-foreground">{value}</div>
      {sub && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, sub, icon: Icon, children }: { title: string; sub: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-display text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-muted-foreground">{sub}</div>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ClimateMetric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: "primary" | "accent" | "success" | "destructive" | "muted" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent-foreground",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  } as const;
  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <Icon className="h-4 w-4" />
      <div className="mt-2 text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Tag({ tone, label, v }: { tone: "success" | "warn" | "primary"; label: string; v: number | string }) {
  const tones = {
    success: "bg-success/10 text-success",
    warn: "bg-accent/10 text-accent-foreground",
    primary: "bg-primary/10 text-primary",
  } as const;
  return (
    <div className={`rounded-lg px-2 py-1.5 ${tones[tone]}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="font-semibold">{v}</div>
    </div>
  );
}

function DriverRow({ sign, label, detail, points, positive }: { sign: string; label: string; detail: string; points: number; positive?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${positive ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
      <div className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
        {sign}{points}
      </div>
    </div>
  );
}
