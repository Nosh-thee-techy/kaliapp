import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { farmers, SEGMENT_META, STATUS_META, type Farmer } from "@/lib/mock-data";
import { fetchGraphScorecard, postGraphDecision, fetchExplainability, postMasumiDisburse, postFieldVerification } from "@/lib/api-core";
import type { GraphScorecard, ExplainabilityResult } from "@/lib/api-core";
import { getOfficer } from "@/lib/officer-session";
import { toast } from "sonner";
import { requireBranchOfficerSession } from "@/lib/require-officer";
import { SadnessErrorPage } from "@/components/SadnessErrorPage";
import { ExternalLink, Loader2, Brain, Wallet, CheckCircle2, MessageSquare, Cpu, MapPin } from "lucide-react";

export const Route = createFileRoute("/scorecard/$id")({
  beforeLoad: requireBranchOfficerSession,
  head: ({ params }) => ({
    meta: [
      { title: `Scorecard ${params.id} — KaLI` },
      { name: "description", content: "Explanatory underwriting scorecard with drivers, drags, and manual override." },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const graph = await fetchGraphScorecard(params.id);
      return { source: "graph" as const, graph };
    } catch {
      const farmer = farmers.find((f) => f.id === params.id || f.nationalId === params.id);
      if (!farmer) throw notFound();
      return { source: "mock" as const, farmer };
    }
  },
  component: ScorecardPage,
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

type ScorecardLoaderData =
  | { source: "graph"; graph: GraphScorecard }
  | { source: "mock"; farmer: Farmer };

function ScorecardPage() {
  const data = Route.useLoaderData() as ScorecardLoaderData;
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<null | string>(null);
  const [stance, setStance] = useState<string>("approve_flexible");

  if (data.source === "graph") {
    return (
      <GraphScorecardView
        graph={data.graph}
        notes={notes}
        setNotes={setNotes}
        submitting={submitting}
        setSubmitting={setSubmitting}
        stance={stance}
        setStance={setStance}
        navigate={navigate}
      />
    );
  }

  return <MockScorecardFallback farmer={data.farmer} />;
}

function GraphScorecardView({
  graph,
  notes,
  setNotes,
  submitting,
  setSubmitting,
  stance,
  setStance,
  navigate,
}: {
  graph: GraphScorecard;
  notes: string;
  setNotes: (v: string) => void;
  submitting: string | null;
  setSubmitting: (v: string | null) => void;
  stance: string;
  setStance: (v: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [explainability, setExplainability] = useState<ExplainabilityResult | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState(false);
  const [explainLang, setExplainLang] = useState<"en" | "sw" | "lg">("en");
  const [masumiLoading, setMasumiLoading] = useState(false);
  const [masumiResult, setMasumiResult] = useState<string | null>(null);
  const [liveGraph, setLiveGraph] = useState(graph);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    setLiveGraph(graph);
  }, [graph]);

  useEffect(() => {
    setExplainLoading(true);
    setExplainError(false);
    fetchExplainability(graph.id, explainLang)
      .then((r) => {
        setExplainability(r);
        setExplainLoading(false);
      })
      .catch(() => {
        setExplainError(true);
        setExplainLoading(false);
      });
  }, [graph.id, explainLang]);

  async function handleMasumiDisburse() {
    setMasumiLoading(true);
    try {
      const officer = getOfficer()?.name || "Branch Officer";
      const result = await postMasumiDisburse(graph.id, {
        amount: graph.requested_kes,
        officerId: officer,
      });
      if (result.ok) {
        setMasumiResult(`Payment ID: ${result.paymentId} — ${result.status}`);
        toast.success("Masumi disbursement initiated", {
          description: `${result.paymentId} for KES ${graph.requested_kes.toLocaleString()}`,
        });
      } else {
        toast.error("Masumi disbursement failed", { description: result.error });
      }
    } catch {
      toast.error("Masumi network error", { description: "Is the backend running?" });
    } finally {
      setMasumiLoading(false);
    }
  }
  async function handleFieldVerify() {
    setVerifyLoading(true);
    try {
      const result = await postFieldVerification(liveGraph.id, {
        type: "checkin",
        notes: "Officer confirmed advisory action on farm",
      });
      if (result.ok) {
        toast.success("Ground-truth verification recorded", {
          description: result.message || "Score will update on refresh.",
        });
        const refreshed = await fetchGraphScorecard(liveGraph.id);
        setLiveGraph(refreshed);
      }
    } catch {
      toast.error("Verification failed", { description: "Is the backend running?" });
    } finally {
      setVerifyLoading(false);
    }
  }

  const score = {
    total: liveGraph.unified?.canonical_score ?? liveGraph.total,
    band: (liveGraph.unified?.band as typeof liveGraph.band) ?? liveGraph.band,
    drivers: liveGraph.drivers,
    drags: liveGraph.drags,
    assetSubstituteApplied: liveGraph.asset_substitute_applied,
  };
  const climate = liveGraph.climate;
  const segment = liveGraph.segment as keyof typeof SEGMENT_META;
  const status = liveGraph.status as keyof typeof STATUS_META;
  const groundTruth = liveGraph.ground_truth;

  const bandGradient =
    score.band === "Approve"
      ? "from-success to-primary"
      : score.band === "Refer"
        ? "from-warning to-accent"
        : "from-destructive to-accent";

  async function logDecision(decision: "Approved" | "Referred" | "Declined") {
    setSubmitting(decision);
    try {
      const officer = getOfficer()?.name || "Branch Officer";
      const result = await postGraphDecision(graph.id, { decision, stance, notes, officer });
      toast.success(`Decision logged for ${graph.name}`, {
        description: result.sms?.body || `KaLI Rating: ${score.total}/100. ${decision}.`,
      });
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Neo4j write failed", { description: "Is the backend API running?" });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to queue
      </Link>

      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
        Neo4j graph traversal · {graph.graph_context.is_guaranteed ? "peer guarantee active" : "network context loaded"}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {graph.id} · {graph.cooperative}
                </p>
                <h1 className="mt-1.5 font-display text-3xl font-semibold text-foreground">{graph.name}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-0.5 font-medium ${SEGMENT_META[segment]?.tone || SEGMENT_META.General.tone}`}>
                    {SEGMENT_META[segment]?.label || graph.segment}
                  </span>
                  <Tag>{graph.vulnerability_tag}</Tag>
                  <Tag>{graph.crop_type}</Tag>
                  <Tag>{graph.acreage} acres · {graph.harvest_month} harvest</Tag>
                  <Tag>{graph.zone_name}</Tag>
                  <Tag>{graph.phone}</Tag>
                  {STATUS_META[status] && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${STATUS_META[status].tone}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`} />
                      {STATUS_META[status].label}
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/60 px-4 py-3 text-right">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Requested</div>
                <div className="font-display text-2xl font-semibold tabular-nums text-foreground">
                  KES {graph.requested_kes.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground">via {graph.registered_via}</div>
              </div>
            </div>
          </div>

          {score.assetSubstituteApplied && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/8 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-harvest text-primary-foreground shadow-card">
                ⚖
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Asset-substitute logic triggered</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Graph traversal compensated baseline using lease/co-op/chama paths rather than land title.
                </p>
              </div>
            </div>
          )}

          <section className="mt-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Network resilience engine</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Score computed via Cypher traversal across Farmer → Chama → Cooperative → ClimateZone nodes.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Panel title="Drivers" subtitle="Social & supply-chain boosters" tone="success" items={score.drivers} />
              <Panel title="Drags" subtitle="Climate contagion & risk markers" tone="destructive" items={score.drags} />
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/5 via-card to-card p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-accent" />
                  <h2 className="font-display text-lg font-semibold text-foreground">eSusFarm explainability</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dual-output routing — farmer sees ≤160 char action SMS; officer sees full audit narrative for MIS.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { code: "en", label: "English" },
                    { code: "sw", label: "Kiswahili" },
                    { code: "lg", label: "Luganda" },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setExplainLang(l.code)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      explainLang === l.code
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {explainLoading && (
              <div className="mt-6 flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Featherless generating dual outputs…
              </div>
            )}

            {explainError && !explainLoading && (
              <p className="mt-6 text-sm text-muted-foreground">
                Explainability unavailable. Check Featherless API key and backend connection.
              </p>
            )}

            {explainability && !explainLoading && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MessageSquare className="h-4 w-4 text-sky-600" />
                      Farmer SMS preview
                    </div>
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                      {explainability.farmer.chars}/{explainability.farmer.maxChars} chars
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    What reaches USSD / voice / shared phone — no scores, no ML jargon.
                  </p>
                  <div className="mt-4 rounded-lg border border-dashed border-sky-500/40 bg-background p-4 font-mono text-sm leading-relaxed text-foreground">
                    {explainability.farmer.sms}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span>Stance: {explainability.stance}</span>
                    <span>{explainability.farmer.provider}</span>
                  </div>
                  {explainability.farmer.actionHint && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Next action focus: {explainability.farmer.actionHint}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Cpu className="h-4 w-4 text-accent" />
                      Officer audit narrative
                    </div>
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                      MIS / hidden from farmer UI
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Full graph breakdown for field officers, lenders, and judges — satellite, SPI, network history.
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/90">
                    {explainability.officer?.narrative ||
                      `${graph.name}: ${score.drivers.length} drivers, ${score.drags.length} drags, unified score ${score.total}/100.`}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-background/80 p-2">
                      <span className="text-muted-foreground">SPI</span>
                      <p className="font-semibold tabular-nums">{climate.spi.toFixed(1)}</p>
                    </div>
                    <div className="rounded-md bg-background/80 p-2">
                      <span className="text-muted-foreground">Grow Asia</span>
                      <p className="font-semibold tabular-nums">
                        {explainability.officer?.grow_asia?.systemScore != null
                          ? `${Math.round(explainability.officer.grow_asia.systemScore * 100)}%`
                          : graph.unified?.grow_asia_percent != null
                            ? `${graph.unified.grow_asia_percent}%`
                            : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Model: {explainability.officer?.model?.split("/").pop() || "Featherless"}</span>
                    <span>{explainability.officer?.provider || explainability.farmer.provider}</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Decision post matrix</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Commit stance to the graph. Creates DECIDED edge, audit node, and SMS notification.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { id: "approve_flexible", label: "Approve · Flexible Repayment", hint: "Align installments to harvest cycle" },
                { id: "approve_standard", label: "Approve · Standard Terms", hint: "Default 6-month schedule" },
                { id: "refer_committee", label: "Refer to Regional Committee", hint: "Escalate for supervisor override" },
                { id: "decline_with_reason", label: "Decline with Reason", hint: "Triggers structured rejection SMS" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    stance === opt.id
                      ? "border-primary bg-primary/5 shadow-card"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <input type="radio" name="stance" className="sr-only" checked={stance === opt.id} onChange={() => setStance(opt.id)} />
                  <div className="text-sm font-medium text-foreground">{opt.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{opt.hint}</div>
                </label>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Field verification, supervisor consultation, community references…"
              className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={!!submitting}
                onClick={() => logDecision(stance.startsWith("approve") ? "Approved" : stance.startsWith("refer") ? "Referred" : "Declined")}
                className="inline-flex items-center rounded-lg bg-gradient-hero px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? "Writing to Neo4j…" : "Commit decision & dispatch SMS"}
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </Link>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className={`rounded-2xl bg-gradient-to-br ${bandGradient} p-6 text-center text-primary-foreground shadow-elevated texture-grain`}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary-foreground/80">
              {graph.unified ? "KaLI Unified Score" : "KaLI Graph Score"}
            </p>
            <div className="mt-2 font-display text-6xl font-semibold tabular-nums leading-none">
              {score.total}
              <span className="text-2xl text-primary-foreground/70">/100</span>
            </div>
            {graph.unified && (
              <p className="mt-2 text-xs text-primary-foreground/85">
                Grow Asia {graph.unified.grow_asia_percent}% · Graph {graph.unified.graph_score}/100
              </p>
            )}
            <span className="mt-3 inline-flex rounded-full bg-background/20 px-3 py-1 text-xs font-medium backdrop-blur">
              {graph.unified?.recommendation ?? graph.recommendation}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Climate context</h3>
              <span className="font-mono text-[10px] text-muted-foreground">{climate.zone_code}</span>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="SPI (drought index)" value={climate.spi.toFixed(1)} tone={climate.spi <= -1.5 ? "danger" : climate.spi <= -0.5 ? "warn" : "ok"} />
              <Row label="Rainfall (30d)" value={`${climate.rainfall_mm_last_30d} mm`} />
              <Row label="Pest proximity" value={`${climate.pest_proximity_km} km`} tone={climate.pest_proximity_km < 25 ? "danger" : "ok"} />
            </dl>
            {climate.advisory && (
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning-foreground">
                <strong>Active advisory:</strong> {climate.advisory}
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">Climate contagion via Cooperative → ClimateZone path.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Ground-truth loop
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Macro advisory → farmer action → field verification → credit bonus (+{groundTruth?.bonusPoints ?? 8} pts).
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                label="Active zone alert"
                value={groundTruth?.hadActiveAlert ? "Yes" : "No"}
                tone={groundTruth?.hadActiveAlert ? "warn" : "ok"}
              />
              <Row label="Field verifications" value={String(groundTruth?.verifiedCount ?? 0)} />
              <Row
                label="Mitigation bonus"
                value={groundTruth?.bonusPoints ? `+${groundTruth.bonusPoints}` : "—"}
                tone={groundTruth?.bonusPoints ? "ok" : undefined}
              />
            </dl>
            {groundTruth?.advisory && (
              <div className="mt-3 rounded-md border border-primary/25 bg-primary/5 p-2.5 text-xs text-foreground">
                {groundTruth.advisory}
              </div>
            )}
            <button
              type="button"
              onClick={handleFieldVerify}
              disabled={verifyLoading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
            >
              {verifyLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recording…
                </>
              ) : (
                <>Verify field action (FarmerQue layer)</>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Graph network signals</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Chama" value={graph.graph_context.chama_name || "—"} />
              <Row label="Chama repayment" value={graph.graph_context.chama_repayment_rate_pct ? `${graph.graph_context.chama_repayment_rate_pct}%` : "—"} />
              <Row label="Peer guarantee" value={graph.graph_context.is_guaranteed ? "Active" : "None"} />
              <Row label="Co-op delivery" value={`${graph.cooperative_delivery_years}y`} />
              <Row label="M-Pesa inflows (12mo)" value={`KES ${graph.mobile_money_inflows_kes.toLocaleString()}`} />
              <Row label="Land tenure" value={graph.has_land_ownership ? "Owned" : `${graph.lease_duration_months}mo lease`} />
            </dl>
          </div>

          {/* MASUMI PAYMENT */}
          {graph.ml && graph.blended && (
            <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Cpu className="h-4 w-4 text-accent" />
                ML Credit Layer
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-medium text-accent-foreground">
                  Hybrid AI
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Graph Cypher (60%)</span>
                <span className="font-display text-xl font-semibold tabular-nums">{graph.blended.graphScore}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Logistic Regression (40%)</span>
                <span className="font-display text-xl font-semibold tabular-nums">{graph.blended.mlScore}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
                <span className="text-xs font-semibold text-foreground">Blended Score</span>
                <div className="text-right">
                  <span className="font-display text-2xl font-semibold tabular-nums">{graph.blended.blended}</span>
                  <span className="ml-1 text-xs text-muted-foreground">/100</span>
                  <div className={`text-[10px] font-semibold uppercase ${graph.blended.blendedBand === "Approve" ? "text-success" : graph.blended.blendedBand === "Refer" ? "text-accent" : "text-destructive"}`}>
                    {graph.blended.blendedBand}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-secondary/50 p-2.5">
                <div className="text-[10px] text-muted-foreground">Approve probability</div>
                <div className="text-sm font-semibold tabular-nums">{(graph.ml.approvedProbability * 100).toFixed(1)}%</div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">{graph.blended.model}</p>
            </div>
          )}

          {/* MASUMI PAYMENT */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              Disburse via Masumi
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">Partner Tech</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Disburse KES {graph.requested_kes.toLocaleString()} to {graph.name} via the Masumi Payment Network.
            </p>
            {masumiResult ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-success/10 p-3 text-xs text-success">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{masumiResult}</span>
              </div>
            ) : (
              <button
                onClick={handleMasumiDisburse}
                disabled={masumiLoading}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary/90 disabled:opacity-60"
              >
                {masumiLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</>
                ) : (
                  <><ExternalLink className="h-3.5 w-3.5" /> Disburse KES {graph.requested_kes.toLocaleString()}</>
                )}
              </button>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function MockScorecardFallback({ farmer }: { farmer: import("@/lib/mock-data").Farmer }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">Offline mock mode</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Neo4j backend unavailable. Start Neo4j and run <code className="text-xs">cd backend && npm run seed</code>.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">Farmer: {farmer.name} ({farmer.id})</p>
      <Link to="/dashboard" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        Back to dashboard
      </Link>
    </main>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-xs text-secondary-foreground">
      {children}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  tone,
  items,
}: {
  title: string;
  subtitle: string;
  tone: "success" | "destructive";
  items: { label: string; points: number; detail: string }[];
}) {
  const accent =
    tone === "success"
      ? "border-success/30 bg-gradient-to-br from-success/8 to-transparent"
      : "border-destructive/30 bg-gradient-to-br from-destructive/8 to-transparent";
  const dot = tone === "success" ? "bg-success" : "bg-destructive";
  const points = tone === "success" ? "text-success" : "text-destructive";
  return (
    <div className={`rounded-xl border ${accent} p-4 shadow-card`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{subtitle}</span>
      </div>
      <ul className="mt-3 space-y-3">
        {items.length === 0 && <li className="text-sm text-muted-foreground">No entries.</li>}
        {items.map((it, i) => (
          <li key={i} className="flex gap-3">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{it.label}</span>
                <span className={`text-sm font-semibold tabular-nums ${points}`}>
                  {it.points > 0 ? "+" : ""}
                  {it.points}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{it.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "danger" }) {
  const valueTone =
    tone === "danger" ? "text-destructive" : tone === "warn" ? "text-accent" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-medium tabular-nums ${valueTone}`}>{value}</dd>
    </div>
  );
}
