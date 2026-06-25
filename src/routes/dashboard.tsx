import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { TrendingUp, Users, CloudRain } from "lucide-react";
import {
  farmers,
  climateSignals,
  STATUS_META,
  SEGMENT_META,
  formatRelative,
  type ApplicationStatus,
  type DemographicSegment,
} from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Branch Portfolio — KaLI" },
      { name: "description", content: "In-review queue for cooperative and walk-in farmer loan applications." },
    ],
  }),
  component: DashboardPage,
});

const segmentTabs: ("All" | DemographicSegment)[] = ["All", "Women", "Youth", "PWD", "General"];

function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [segment, setSegment] = useState<"All" | DemographicSegment>("All");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<ApplicationStatus, number> = {
      awaiting_climate: 0,
      ready_for_review: 0,
      escalated: 0,
      disbursed: 0,
    };
    farmers.forEach((f) => (c[f.status] += 1));
    return c;
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return farmers
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
  }, [statusFilter, segment, q]);

  const totalRequested = filtered.reduce((s, f) => s + f.requestedKes, 0);
  const climateAlerts = Object.values(climateSignals).filter((c) => c.advisory).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elevated sm:p-8 texture-grain">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
              Branch Command Center
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Portfolio & In-Review Queue
            </h1>
            <p className="mt-3 text-sm text-primary-foreground/80 sm:text-base">
              Applications from USSD self-service, cooperative rosters, and walk-ins.
              Segmented so officers cannot treat Women, Youth, PWD, and General applicants as a single bucket.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-background/15 p-3 text-center backdrop-blur sm:grid-cols-4">
            <Stat label="Awaiting climate" value={counts.awaiting_climate} />
            <Stat label="Ready" value={counts.ready_for_review} />
            <Stat label="Escalated" value={counts.escalated} />
            <Stat label="Disbursed" value={counts.disbursed} />
          </div>
        </div>
      </section>

      {/* Climate broadcast strip */}
      {climateAlerts > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-warning px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
            ⚡ Climate broadcast
          </span>
          <span className="text-warning-foreground">
            {climateAlerts} zone advisor{climateAlerts > 1 ? "ies" : "y"} pushed to farmer SMS in the last 6 hours
          </span>
          <Link to="/farmer" className="ml-auto text-xs font-medium text-foreground underline-offset-2 hover:underline">
            View farmer phone →
          </Link>
        </div>
      )}

      {/* Portfolio analytics */}
      <PortfolioCharts />

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {segmentTabs.map((s) => (
            <button
              key={s}
              onClick={() => setSegment(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                segment === s
                  ? "bg-foreground text-background shadow-card"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 lg:max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="National ID, Coop code, phone, or name…"
            className="w-full rounded-lg border border-input bg-card pl-8 pr-3 py-2.5 text-sm shadow-card focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Status chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="All statuses" count={farmers.length} />
        {(Object.keys(STATUS_META) as ApplicationStatus[]).map((s) => (
          <StatusChip
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            label={STATUS_META[s].label}
            count={counts[s]}
            dot={STATUS_META[s].dot}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Showing {filtered.length} of {farmers.length} applications · Total requested{" "}
        <span className="font-semibold text-foreground">KES {totalRequested.toLocaleString()}</span>
      </p>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Farmer</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Cooperative</th>
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((f) => (
                <tr key={f.id} className="group transition-colors hover:bg-secondary/30">
                  <td className="px-4 py-3.5">
                    <Link
                      to="/farmers/$id"
                      params={{ id: f.id }}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {f.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {f.id} · ID {f.nationalId} · {f.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${SEGMENT_META[f.segment].tone}`}>
                      {SEGMENT_META[f.segment].label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-foreground">{f.cooperative}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{f.coopCode}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-foreground">{f.zoneName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{f.zoneCode}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_META[f.status].tone}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[f.status].dot}`} />
                      {STATUS_META[f.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-foreground">
                    KES {f.requestedKes.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatRelative(f.submittedIso)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Link
                        to="/farmers/$id"
                        params={{ id: f.id }}
                        className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                      >
                        Profile
                      </Link>
                      <Link
                        to="/scorecard/$id"
                        params={{ id: f.id }}
                        className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-card transition-all hover:bg-primary/90 hover:shadow-glow"
                      >
                        Assess →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No farmers match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-1">
      <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-primary-foreground/70">{label}</div>
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
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-all ${
        active
          ? "border-foreground/20 bg-foreground text-background shadow-card"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      <span className="font-medium">{label}</span>
      <span className={`rounded-full px-1.5 py-0 text-[10px] ${active ? "bg-background/20" : "bg-secondary"}`}>{count}</span>
    </button>
  );
}

const SEGMENT_COLORS: Record<DemographicSegment, string> = {
  Women: "var(--accent)",
  Youth: "var(--primary)",
  PWD: "var(--ochre)",
  General: "var(--earth)",
};

function PortfolioCharts() {
  const segmentData = (["Women", "Youth", "PWD", "General"] as DemographicSegment[]).map((s) => ({
    name: s,
    value: farmers.filter((f) => f.segment === s).length,
  }));

  // Synthetic 8-week disbursement trend from existing farmers + base
  const weeks = ["W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1", "Now"];
  const trend = weeks.map((w, i) => ({
    w,
    disbursed: 6 + Math.round(Math.sin(i / 1.6) * 4 + i * 1.2),
    requested: 9 + Math.round(Math.cos(i / 1.4) * 5 + i * 1.4),
  }));

  const zoneRain = Object.values(climateSignals).map((c) => ({
    zone: c.zoneCode.replace("KE-", ""),
    mm: c.rainfallMmLast30d,
    spi: c.spi,
  }));

  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-xs">
          <TrendingUp className="h-4 w-4 text-accent" />
          <span className="font-semibold text-foreground">8-week pipeline</span>
          <span className="ml-auto text-muted-foreground">applications</span>
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={trend} margin={{ top: 12, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="dReq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dDis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="w" stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey="requested" stroke="var(--accent)" fill="url(#dReq)" strokeWidth={2} />
            <Area type="monotone" dataKey="disbursed" stroke="var(--primary)" fill="url(#dDis)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-xs">
          <Users className="h-4 w-4 text-accent" />
          <span className="font-semibold text-foreground">Equity mix</span>
          <span className="ml-auto text-muted-foreground">{farmers.length} in queue</span>
        </div>
        <div className="flex h-[170px] items-center gap-3">
          <ResponsiveContainer width="55%" height="100%">
            <PieChart>
              <Pie data={segmentData} dataKey="value" innerRadius={38} outerRadius={68} paddingAngle={3}>
                {segmentData.map((s) => (
                  <Cell key={s.name} fill={SEGMENT_COLORS[s.name as DemographicSegment]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-1.5 text-xs">
            {segmentData.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEGMENT_COLORS[s.name as DemographicSegment] }} />
                  {s.name}
                </span>
                <span className="font-semibold tabular-nums">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-xs">
          <CloudRain className="h-4 w-4 text-accent" />
          <span className="font-semibold text-foreground">Zone rainfall · 30d</span>
          <span className="ml-auto text-muted-foreground">mm</span>
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={zoneRain} margin={{ top: 12, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="zone" stroke="var(--muted-foreground)" fontSize={9} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="mm" radius={[6, 6, 0, 0]}>
              {zoneRain.map((z) => (
                <Cell key={z.zone} fill={z.spi <= -1.5 ? "var(--destructive)" : z.spi <= -0.5 ? "var(--accent)" : "var(--primary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
