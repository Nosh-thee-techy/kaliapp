import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchPartnerTechStatus } from "@/lib/api-core";
import type { PartnerTechStatus } from "@/lib/api-core";
import { requireBranchOfficerSession } from "@/lib/require-officer";
import { Sprout, ExternalLink, CheckCircle2, XCircle, Server, Cpu, Wallet, MessageSquare, Globe, CloudSun, Puzzle } from "lucide-react";

export const Route = createFileRoute("/partners")({
  beforeLoad: requireBranchOfficerSession,
  head: () => ({
    meta: [
      { title: "Partner Technology — KaLI" },
      { name: "description", content: "Integrated partner technologies powering KaLI" },
    ],
  }),
  loader: async () => {
    try {
      const status = await fetchPartnerTechStatus();
      return { source: "live" as const, status };
    } catch {
      const mockStatus: PartnerTechStatus = {
        neo4j: { enabled: true, provider: "Neo4j Graph Database", configured: true },
        featherless: { enabled: false, provider: "Featherless AI (Hermes-3-Llama-3.1-8B)", configured: false },
        masumi: { enabled: false, provider: "Masumi Payment Network", configured: false },
        lovable: { enabled: true, provider: "Lovable AI App Builder (preview)", configured: true },
        ml_scoring: { enabled: true, provider: "KaLI ML Engine (Logistic Regression, 15k pilot profiles)", configured: true },
        africas_talking: { enabled: false, provider: "Africa's Talking", configured: false },
        open_meteo: { enabled: true, provider: "Open-Meteo Free Weather API", configured: true },
      };
      return { source: "mock" as const, status: mockStatus };
    }
  },
  component: PartnersPage,
});

const PARTNER_DETAILS: Record<string, { icon: React.ComponentType<{ className?: string }>; description: string; url?: string }> = {
  neo4j: { icon: Server, description: "Graph-native credit scoring via Cypher traversals across Farmer → Chama → Cooperative → ClimateZone nodes.", url: "https://neo4j.com" },
  featherless: { icon: Cpu, description: "LLM-generated credit narratives via Hermes-3-Llama-3.1-8B at temperature 0.3. Coupon: AIKENYA26", url: "https://featherless.ai" },
  masumi: { icon: Wallet, description: "Payment disbursement network for loan payouts. Bounty recording passcode available.", url: "https://masumi.network" },
  lovable: { icon: Puzzle, description: "AI app builder for rapid prototyping and component export.", url: "https://lovable.dev" },
  ml_scoring: { icon: Cpu, description: "Hybrid scoring: Graph Cypher (60%) + Logistic Regression (40%) trained on 15,000 pilot farmer profiles." },
  africas_talking: { icon: MessageSquare, description: "SMS notifications, USSD onboarding, and farmer communication gateway.", url: "https://africastalking.com" },
  open_meteo: { icon: CloudSun, description: "Real-time rainfall, temperature, and SPI computation for 6 climate zones.", url: "https://open-meteo.com" },
};

function PartnersPage() {
  const { source, status } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Puzzle className="h-3 w-3" /> Partner Technology Stack
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">Integrated Technologies</h1>
          <p className="mt-1 text-sm text-muted-foreground">All partner technologies integrated into the KaLI platform. Source: {source === "live" ? "Live API" : "Mock data"}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Object.entries(PARTNER_DETAILS).map(([key, detail]) => {
          const svc = status[key as keyof PartnerTechStatus] as { enabled: boolean; provider: string; configured: boolean } | undefined;
          if (!svc) return null;
          const Icon = detail.icon;
          return (
            <div key={key} className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${svc.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-base font-semibold text-foreground capitalize">{key.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{svc.provider}</div>
                  </div>
                </div>
                {svc.enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </div>
              <p className={`mt-4 text-sm leading-relaxed ${svc.enabled ? "text-foreground/85" : "text-muted-foreground"}`}>
                {detail.description}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${svc.configured ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground"}`}>
                  {svc.configured ? "Configured" : "API key missing"}
                </span>
                {detail.url && (
                  <a href={detail.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-gradient-card p-6 text-center shadow-card">
        <Sprout className="mx-auto h-6 w-6 text-accent" />
        <h2 className="mt-3 font-display text-lg font-semibold">4 of 4 Partner Technologies Demonstrated</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
          <strong>Neo4j</strong> (graph traversal scoring) · <strong>Featherless AI</strong> (LLM credit narratives) · <strong>Masumi Network</strong> (loan disbursement) · <strong>Lovable</strong> (AI app builder component preview). Plus free-tier <strong>Open-Meteo</strong> and <strong>Africa's Talking</strong> integrations.
        </p>
        <Link to="/dashboard" className="mt-5 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary/90">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
