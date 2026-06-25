import { createFileRoute } from "@tanstack/react-router";
import { pipelineRuns } from "@/lib/mock-data";

export const Route = createFileRoute("/api/climate")({
  server: {
    handlers: {
      GET: async () => {
        // Stub: in production this would proxy CHIRPS/ICPAC worker outputs.
        return Response.json({
          runs: pipelineRuns,
          fetchedAt: new Date().toISOString(),
        });
      },
    },
  },
});
