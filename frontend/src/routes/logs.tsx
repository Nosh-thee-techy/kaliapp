import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { auditLog, pipelineRuns, formatRelative, type PipelineRun } from "@/lib/mock-data";
import { fetchAuditLog, fetchPipeline } from "@/lib/api-core";
import type { AuditEntry } from "@/lib/api-core";
import { requireOfficerSession } from "@/lib/require-officer";

export const Route = createFileRoute("/logs")({
  beforeLoad: requireOfficerSession,
  head: () => ({
    meta: [
      { title: "Pipeline & Logs — KaLI" },
      { name: "description", content: "Monitor branch data pipeline and chronological audit ledger." },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const [pipeline, setPipeline] = useState<PipelineRun[]>(pipelineRuns);
  const [pipelineLive, setPipelineLive] = useState(false);
  const [pipelineSynced, setPipelineSynced] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditLive, setAuditLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPipeline()
      .then((d) => {
        if (cancelled) return;
        setPipeline(d.runs);
        setPipelineSynced(d.fetchedAt);
        setPipelineLive(true);
      })
      .catch(() => {
        if (!cancelled) setPipelineLive(false);
      });

    fetchAuditLog({ limit: 50 })
      .then((entries) => {
        if (cancelled) return;
        setAudit(entries);
        setAuditLive(true);
      })
      .catch(() => {
        if (!cancelled) {
          setAudit(
            auditLog.map((a) => ({
              id: a.id,
              farmerId: a.farmerId,
              farmerName: a.farmerName,
              officer: a.officer,
              decision: a.decision,
              notes: a.notes,
              score: a.score,
              timestampIso: a.timestampIso,
            })),
          );
          setAuditLive(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toneClass = (s: PipelineRun["status"]) =>
    s === "ok"
      ? "bg-success/10 text-success"
      : s === "warn"
        ? "bg-warning/15 text-warning-foreground"
        : "bg-destructive/10 text-destructive";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Local System Maintenance</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-foreground sm:text-4xl">
        Pipeline & Audit Ledger
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Python workers sync climate signals into Neo4j; every credit decision is journaled below.
      </p>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">Pipeline status matrix</h2>
          <span className="text-xs text-muted-foreground">
            {pipelineLive ? "Neo4j · " : "Mock · "}
            {pipelineSynced ? `synced ${formatRelative(pipelineSynced)}` : "fetching…"}
          </span>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Last run</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pipeline.map((r) => (
                <tr key={r.source}>
                  <td className="px-4 py-3 font-medium text-foreground">{r.source}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelative(r.lastRunIso)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass(r.status)}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Audit ledger</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every committed decision from Neo4j <code className="text-xs">DECIDED</code> edges.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{auditLive ? "Live graph" : "Mock fallback"}</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Farmer</th>
                <th className="px-4 py-3 font-medium">Officer</th>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 text-right font-medium">Score</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audit.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No decisions logged yet. Commit a stance on a scorecard to see entries here.
                  </td>
                </tr>
              )}
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{String(a.id).slice(0, 8)}</td>
                  <td className="px-4 py-3 text-foreground">
                    {a.farmerName}{" "}
                    <span className="text-xs text-muted-foreground">({a.farmerId})</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{a.officer}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.decision === "Approved"
                          ? "bg-success/10 text-success"
                          : a.decision === "Referred"
                            ? "bg-warning/15 text-warning-foreground"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {a.decision}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{a.score ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelative(a.timestampIso)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
