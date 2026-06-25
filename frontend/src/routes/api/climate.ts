import { createFileRoute } from "@tanstack/react-router";

const API_BASE = process.env.VITE_API_CORE_URL || "http://localhost:4000";

export const Route = createFileRoute("/api/climate")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/pipeline`);
          if (res.ok) return Response.json(await res.json());
        } catch {
          /* fall through */
        }
        const { pipelineRuns } = await import("@/lib/mock-data");
        return Response.json({
          runs: pipelineRuns,
          fetchedAt: new Date().toISOString(),
        });
      },
    },
  },
});
