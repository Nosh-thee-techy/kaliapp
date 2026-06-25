import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, Users, CloudRain, ArrowRight } from "lucide-react";
import {
  farmers as mockFarmers,
  climateSignals,
  STATUS_META,
  SEGMENT_META,
  formatRelative,
  type ApplicationStatus,
  type DemographicSegment,
  type Farmer,
} from "@/lib/mock-data";
import { fetchGraphFarmers } from "@/lib/api-core";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — KaLI" },
      { name: "description", content: "Today's loan queue and branch portfolio." },
    ],
  }),
  component: DashboardPage,
});

const segmentTabs: ("All" | DemographicSegment)[] = ["All", "Women", "Youth", "PWD", "General"];

function DashboardPage() {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [segment, setSegment] = useState<"All" | DemographicSegment>("All");
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState<Farmer[]>(mockFarmers);
  const [graphLive, setGraphLive] = useState(false);

  useEffect(() => {
    fetchGraphFarmers()
      .then((rows) => {
        setQueue(rows as unknown as Farmer[]);
        setGraphLive(true);
      })
      .catch(() => setGraphLive(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<ApplicationStatus, number> = {
      awaiting_climate: 0,
      ready_for_review: 0,
      escalated: 0,
      disbursed: 0,
    };
    queue.forEach((f) => (c[f.status] += 1));
    return c;
  }, [queue]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return queue
      .filter((f) => (statusFilter === "all" ? true : f.status === statusFilter))
      .filter((f) => (segment === "All" ? true : f.segment === segment))
      .filter((f) =>
        !term
          ? true
          : f.nationalId.includes(term) ||
            f.coopCode.toLowerCase().includes(term) ||
            f.phone.replace(/\s/g, "").includes(term.replace(/\s/g, "")) ||
            f.name.toLowerCase().includes(term),
      );
  }, [statusFilter, segment, q, queue]);

  const friendlyStatus: Record<ApplicationStatus, string> = {
    awaiting_climate: t("dashboard.waiting"),
    ready_for_review: t("dashboard.ready"),
    escalated: t("dashboard.escalated"),
    disbursed: t("dashboard.disbursed"),
  };

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10 sm:px-8">
      {/* GREETING */}
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            {t("dashboard.greeting")} 👋
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{t("dashboard.subtitle")}</p>
          {graphLive && (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-primary">
              Live · Neo4j graph queue
            </p>
          )}
        </div>
        <Link
          to="/farmer"
          className="inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          Open farmer phone <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* STAT CARDS */}
      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.ready")}
          value={counts.ready_for_review}
          tone="primary"
        />
        <StatCard
          label={t("dashboard.waiting")}
          value={counts.awaiting_climate}
          tone="warning"
        />
        <StatCard
          label={t("dashboard.escalated")}
          value={counts.escalated}
          tone="destructive"
        />
        <StatCard
          label={t("dashboard.disbursed")}
          value={counts.disbursed}
          tone="accent"
        />
      </section>

      {/* CHARTS */}
      <PortfolioCharts />

      {/* QUEUE */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
              {t("dashboard.queue")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} of {farmers.length} requests
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {segmentTabs.map((s) => (
              <button
                key={s}
                onClick={() => setSegment(s)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  segment === s
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "All" ? t("dashboard.allStatus") : s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("dashboard.search")}
              className="w-full rounded-full border border-border bg-card pl-10 pr-4 py-3 text-sm shadow-card focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={t("dashboard.allStatus")} count={farmers.length} />
            {(Object.keys(STATUS_META) as ApplicationStatus[]).map((s) => (
              <StatusChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                label={friendlyStatus[s]}
                count={counts[s]}
                dot={STATUS_META[s].dot}
              />
            ))}
          </div>
        </div>

        {/* Card list (less crowded than a table) */}
        <div className="mt-6 grid gap-4">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="group grid grid-cols-1 items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated md:grid-cols-[1.4fr_1fr_1fr_auto]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-base font-semibold text-primary-foreground">
                  {f.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <Link to="/farmers/$id" params={{ id: f.id }} className="block truncate font-semibold text-foreground hover:text-primary">
                    {f.name}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground">{f.phone} · {f.cropType}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEGMENT_META[f.segment].tone}`}>
                  {SEGMENT_META[f.segment].label}
                </span>
                <span className="text-xs text-muted-foreground">{f.cooperative}</span>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">{formatRelative(f.submittedIso)}</div>
                <div className="font-display text-lg font-semibold tabular-nums text-foreground">
                  KES {f.requestedKes.toLocaleString()}
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[f.status].dot}`} />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {friendlyStatus[f.status]}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 md:justify-end">
                <Link
                  to="/farmers/$id"
                  params={{ id: f.id }}
                  className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  {t("dashboard.profile")}
                </Link>
                <Link
                  to="/scorecard/$id"
                  params={{ id: f.id }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary/90"
                >
                  {t("dashboard.assess")} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground">
              No farmers match this filter.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "accent" | "warning" | "destructive";
}) {
  const tones = {
    primary: "from-primary/10 to-primary/0 border-primary/20",
    accent: "from-accent/25 to-accent/0 border-accent/40",
    warning: "from-warning/20 to-warning/0 border-warning/30",
    destructive: "from-destructive/15 to-destructive/0 border-destructive/30",
  } as const;
  const dot = {
    primary: "bg-primary",
    accent: "bg-accent",
    warning: "bg-warning",
    destructive: "bg-destructive",
  } as const;
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tones[tone]} p-6 shadow-card`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${dot[tone]}`} />
        {label}
      </div>
      <div className="mt-3 font-display text-5xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function StatusChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs transition-all ${
        active
          ? "border-charcoal bg-charcoal text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      <span className="font-semibold">{label}</span>
      <span className={`rounded-full px-1.5 py-0 text-[10px] ${active ? "bg-white/20" : "bg-secondary"}`}>{count}</span>
    </button>
  );
}

const SEGMENT_COLORS: Record<DemographicSegment, string> = {
  Women: "var(--primary)",
  Youth: "var(--accent)",
  PWD: "var(--ochre)",
  General: "var(--earth)",
};

function PortfolioCharts() {
  const { t } = useI18n();
  const segmentData = (["Women", "Youth", "PWD", "General"] as DemographicSegment[]).map((s) => ({
    name: s,
    value: farmers.filter((f) => f.segment === s).length,
  }));

  const weeks = ["W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1", "Now"];
  const trend = weeks.map((w, i) => ({
    w,
    sent: 6 + Math.round(Math.sin(i / 1.6) * 4 + i * 1.2),
    requested: 9 + Math.round(Math.cos(i / 1.4) * 5 + i * 1.4),
  }));

  const zoneRain = Object.values(climateSignals).map((c) => ({
    zone: c.zoneCode.replace("KE-", ""),
    mm: c.rainfallMmLast30d,
    spi: c.spi,
  }));

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-3">
      <div className="rounded-3xl border border-border bg-card p-7 shadow-card lg:col-span-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t("dashboard.weeklyTrend")}
            </div>
            <div className="mt-1 font-display text-2xl font-semibold text-foreground">
              Last 8 weeks
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Requested
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Sent
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={trend} margin={{ top: 20, right: 12, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="dReq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dDis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="w" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, fontSize: 12 }} />
            <Area type="monotone" dataKey="requested" stroke="var(--primary)" fill="url(#dReq)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="sent" stroke="var(--accent)" fill="url(#dDis)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-3xl border border-border bg-card p-7 shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          {t("dashboard.equity")}
        </div>
        <div className="mt-1 font-display text-2xl font-semibold text-foreground">{farmers.length} people</div>
        <div className="mt-2 flex h-[240px] items-center gap-4">
          <ResponsiveContainer width="55%" height="100%">
            <PieChart>
              <Pie data={segmentData} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={4}>
                {segmentData.map((s) => (
                  <Cell key={s.name} fill={SEGMENT_COLORS[s.name as DemographicSegment]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-2 text-sm">
            {segmentData.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEGMENT_COLORS[s.name as DemographicSegment] }} />
                  {s.name}
                </span>
                <span className="font-semibold tabular-nums">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-7 shadow-card lg:col-span-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CloudRain className="h-4 w-4 text-primary" />
              {t("dashboard.rainfall")}
            </div>
            <div className="mt-1 font-display text-2xl font-semibold text-foreground">Last 30 days · mm</div>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">Updated 4h ago</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={zoneRain} margin={{ top: 20, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="zone" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, fontSize: 12 }} />
            <Bar dataKey="mm" radius={[10, 10, 0, 0]}>
              {zoneRain.map((z) => (
                <Cell key={z.zone} fill={z.spi <= -1.5 ? "var(--destructive)" : z.spi <= -0.5 ? "var(--warning)" : "var(--accent)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
