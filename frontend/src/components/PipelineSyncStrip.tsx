import { useEffect, useState } from "react";
import { fetchPipeline } from "@/lib/api-core";
import type { PipelineRun } from "@/lib/api-core";
import { formatRelative, pipelineRuns as mockPipeline } from "@/lib/mock-data";

function findRun(runs: PipelineRun[], needle: string) {
  return runs.find((r) => r.source.toUpperCase().includes(needle));
}

function SyncPill({ label, run }: { label: string; run?: PipelineRun }) {
  if (!run) {
    return (
      <span className="text-muted-foreground">
        {label} <span className="text-foreground/60">—</span>
      </span>
    );
  }

  const tone =
    run.status === "ok"
      ? "bg-success"
      : run.status === "warn"
        ? "bg-warning"
        : "bg-destructive";

  return (
    <span className="inline-flex items-center gap-1.5" title={run.message}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
      <span className="font-medium text-foreground/90">{label}</span>
      <span className="text-muted-foreground">{formatRelative(run.lastRunIso)}</span>
    </span>
  );
}

export function PipelineSyncStrip() {
  const [runs, setRuns] = useState<PipelineRun[]>(mockPipeline);

  useEffect(() => {
    fetchPipeline()
      .then((d) => setRuns(d.runs))
      .catch(() => setRuns(mockPipeline));
  }, []);

  const chirps = findRun(runs, "CHIRPS");
  const icpac = findRun(runs, "ICPAC");

  return (
    <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] lg:inline-flex">
      <span className="font-semibold uppercase tracking-wider text-muted-foreground">Sync</span>
      <span className="text-border">|</span>
      <SyncPill label="CHIRPS" run={chirps} />
      <span className="text-border">·</span>
      <SyncPill label="ICPAC" run={icpac} />
    </div>
  );
}
