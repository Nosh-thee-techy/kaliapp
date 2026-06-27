import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  Leaf,
  Loader2,
  MapPin,
  Sparkles,
  Target,
  Thermometer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAgronomistQueue,
  fetchAgronomistStats,
  fetchAgronomistZones,
  fetchAgronomistInsight,
  postFieldVerification,
  type AgronomistQueueItem,
  type AgronomistFieldInsight,
  type AgronomistStats,
  type AgronomistZone,
} from "@/lib/api-core";
import { getOfficer } from "@/lib/officer-session";
import { requireOfficerSession } from "@/lib/require-officer";

export const Route = createFileRoute("/agronomist")({
  beforeLoad: requireOfficerSession,
  head: () => ({
    meta: [
      { title: "Field Intelligence — KaLI Agronomist" },
      { name: "description", content: "ML-prioritized field verification queue for ground-truth credit signals." },
    ],
  }),
  component: AgronomistPage,
});

const TIER_STYLES = {
  urgent: {
    ring: "var(--destructive)",
    badge: "bg-destructive/15 text-destructive border-destructive/25",
    label: "Urgent visit",
  },
  soon: {
    ring: "var(--accent)",
    badge: "bg-accent/15 text-accent-foreground border-accent/30",
    label: "Visit soon",
  },
  routine: {
    ring: "var(--primary)",
    badge: "bg-primary/10 text-primary border-primary/20",
    label: "Routine",
  },
} as const;

function AgronomistPage() {
  const [stats, setStats] = useState<AgronomistStats | null>(null);
  const [zones, setZones] = useState<AgronomistZone[]>([]);
  const [queue, setQueue] = useState<AgronomistQueueItem[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgronomistQueueItem | null>(null);
  const [insight, setInsight] = useState<AgronomistFieldInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAgronomistStats(),
      fetchAgronomistZones(),
      fetchAgronomistQueue(zoneFilter || undefined),
    ])
      .then(([s, z, q]) => {
        setStats(s);
        setZones(z.zones);
        setQueue(q.queue);
      })
      .catch(() => toast.error("Could not load field queue", { description: "Is the backend running?" }))
      .finally(() => setLoading(false));
  }, [zoneFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function openFarmer(item: AgronomistQueueItem) {
    setSelected(item);
    setInsight(null);
    setNotes("");
    setInsightLoading(true);
    try {
      const data = await fetchAgronomistInsight(item.farmerId);
      setInsight(data);
    } catch {
      toast.error("Could not load field insight");
    } finally {
      setInsightLoading(false);
    }
  }

  async function handleVerify(actionId: string) {
    if (!selected) return;
    setVerifyLoading(true);
    try {
      const result = await postFieldVerification(selected.farmerId, {
        actionId,
        type: "agronomist-checkin",
        notes: notes || "Agronomist confirmed mitigation on farm",
      });
      if (result.ok) {
        toast.success("Ground-truth verified", {
          description: "Credit score will reflect mitigation bonus on next assessment.",
        });
        setSelected(null);
        setInsight(null);
        refresh();
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifyLoading(false);
    }
  }

  const urgentCount = queue.filter((q) => q.ml.tier === "urgent").length;

  return (
    <main className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[oklch(0.98_0.015_135)]">
      <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Leaf className="h-3 w-3" />
              Ground-truth platform
            </span>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Field intelligence
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              ML-ranked visit queue — confirm farmer mitigation actions to unlock credit bonuses for your zone.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-white/70 px-4 py-2.5 text-xs text-muted-foreground shadow-card backdrop-blur-sm">
            <Brain className="h-4 w-4 text-primary" />
            <span>
              Signed in as <strong className="text-foreground">{getOfficer()?.name || "Field officer"}</strong>
            </span>
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending verifications"
            value={stats?.pendingVerifications ?? "—"}
            icon={Target}
            tone="primary"
          />
          <StatCard label="ML urgent queue" value={urgentCount} icon={Sparkles} tone="warn" />
          <StatCard label="Active zone alerts" value={stats?.activeAlerts ?? "—"} icon={CloudRain} tone="accent" />
          <StatCard label="Total verified" value={stats?.totalVerifications ?? "—"} icon={CheckCircle2} tone="success" />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <ZoneChip active={!zoneFilter} onClick={() => setZoneFilter(null)} label="All zones" />
          {zones.map((z) => (
            <ZoneChip
              key={z.id}
              active={zoneFilter === z.id}
              onClick={() => setZoneFilter(z.id)}
              label={z.name}
              alert={z.hasAlert}
            />
          ))}
        </div>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">ML visit queue</h2>
            <span className="text-xs text-muted-foreground">{queue.length} farmers ranked by field priority</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-24 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              Ranking field visits…
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 bg-white/60 px-8 py-16 text-center backdrop-blur-sm">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success/70" />
              <p className="mt-4 font-display text-lg font-semibold text-foreground">Queue is clear</p>
              <p className="mt-2 text-sm text-muted-foreground">
                No farmers with self-reported actions awaiting verification.
                <br />
                Demo tip: complete actions on{" "}
                <Link to="/readiness" className="font-medium text-primary hover:underline">
                  My Readiness
                </Link>{" "}
                first.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {queue.map((item) => (
                <QueueCard key={item.farmerId} item={item} onOpen={() => openFarmer(item)} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {selected && (
        <VerifyPanel
          item={selected}
          insight={insight}
          loading={insightLoading}
          notes={notes}
          setNotes={setNotes}
          verifyLoading={verifyLoading}
          onClose={() => {
            setSelected(null);
            setInsight(null);
          }}
          onVerify={handleVerify}
        />
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warn" | "accent" | "success";
}) {
  const tones = {
    primary: "from-primary/10 to-transparent border-primary/15",
    warn: "from-destructive/8 to-transparent border-destructive/15",
    accent: "from-accent/12 to-transparent border-accent/20",
    success: "from-success/10 to-transparent border-success/20",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-card backdrop-blur-sm ${tones[tone]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ZoneChip({
  label,
  active,
  alert,
  onClick,
}: {
  label: string;
  active: boolean;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/80 bg-white/70 text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {alert && <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />}
      {label}
    </button>
  );
}

function PriorityRing({ score, tier }: { score: number; tier: keyof typeof TIER_STYLES }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const style = TIER_STYLES[tier];
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="oklch(0.92 0.02 135)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={style.ring}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-foreground">
        {score}
      </span>
    </div>
  );
}

function QueueCard({ item, onOpen }: { item: AgronomistQueueItem; onOpen: () => void }) {
  const tier = TIER_STYLES[item.ml.tier];
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full gap-4 rounded-3xl border border-white/60 bg-white/80 p-5 text-left shadow-elevated backdrop-blur-md transition-all hover:border-primary/25 hover:shadow-glow"
      >
        <PriorityRing score={item.ml.priorityScore} tier={item.ml.tier} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold text-foreground">{item.name}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${tier.badge}`}>
              {tier.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.crop} · {item.cooperative || item.zoneName}
          </p>
          {item.advisory && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-warning-foreground">{item.advisory}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5">
              <Target className="h-3 w-3" />
              {item.pendingActions} to verify
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5">
              <Thermometer className="h-3 w-3" />
              SPI {item.spi.toFixed(1)}
            </span>
            {item.creditScore != null && (
              <span className="rounded-md bg-muted/50 px-2 py-0.5">Credit {item.creditScore}</span>
            )}
          </div>
        </div>
        <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </button>
    </li>
  );
}

function VerifyPanel({
  item,
  insight,
  loading,
  notes,
  setNotes,
  verifyLoading,
  onClose,
  onVerify,
}: {
  item: AgronomistQueueItem;
  insight: AgronomistFieldInsight | null;
  loading: boolean;
  notes: string;
  setNotes: (v: string) => void;
  verifyLoading: boolean;
  onClose: () => void;
  onVerify: (actionId: string) => void;
}) {
  const tier = TIER_STYLES[item.ml.tier];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-charcoal/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-border/60 bg-[oklch(0.99_0.012_135)] shadow-elevated animate-in slide-in-from-right duration-300">
        <div className="flex items-start justify-between border-b border-border/60 bg-gradient-to-br from-primary/8 via-transparent to-accent/8 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Field verification</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">{item.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {item.zoneName} · {item.crop}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/80 bg-white/80 p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : insight ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Brain className="h-4 w-4" />
                  ML visit priority
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <PriorityRing score={insight.ml.priorityScore} tier={insight.ml.tier} />
                  <div>
                    <p className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${tier.badge}`}>
                      {tier.label}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{insight.ml.model}</p>
                    <p className="text-xs text-foreground">
                      Visit probability: <strong>{(insight.ml.visitProbability * 100).toFixed(1)}%</strong>
                    </p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {insight.ml.drivers.map((d) => (
                    <li key={d.label} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      {d.label}
                    </li>
                  ))}
                </ul>
              </div>

              {insight.climate.advisory && (
                <div className="rounded-2xl border border-warning/30 bg-warning/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-warning-foreground">Zone advisory</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{insight.climate.advisory}</p>
                </div>
              )}

              <div className="rounded-2xl border border-border/60 bg-white/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Climate signals</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">SPI</dt>
                    <dd className="font-semibold tabular-nums">{insight.climate.spi.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Rainfall 30d</dt>
                    <dd className="font-semibold tabular-nums">{insight.climate.rainfallMm30d} mm</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Pest proximity</dt>
                    <dd className="font-semibold tabular-nums">{insight.climate.pestProximityKm} km</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Credit</dt>
                    <dd className="font-semibold tabular-nums">
                      {insight.credit.score ?? "—"} <span className="text-xs font-normal text-muted-foreground">({insight.credit.band})</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">Actions to confirm on farm</p>
                <ul className="mt-3 space-y-2">
                  {(insight.pendingItems.length ? insight.pendingItems : item.pendingItems).map((action) => (
                    <li key={action.id}>
                      <button
                        type="button"
                        disabled={verifyLoading}
                        onClick={() => onVerify(action.id)}
                        className="flex w-full items-start gap-3 rounded-2xl border border-border/80 bg-background p-4 text-left transition-all hover:border-success/40 hover:bg-success/5 disabled:opacity-60"
                      >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                        <span>
                          <span className="block text-sm font-medium text-foreground">{action.title}</span>
                          <span className="mt-1 text-[11px] text-muted-foreground">Tap to verify — unlocks +8 credit bonus</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Field notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Mulch applied on 2 acres, pest traps checked…"
                  className="mt-2 w-full resize-none rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <Link
                to="/scorecard/$id"
                params={{ id: item.farmerId }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open full scorecard <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
