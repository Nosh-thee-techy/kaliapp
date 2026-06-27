import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { requireOfficerSession } from "@/lib/require-officer";
import {
  fetchMapFarmers,
  subscribeMapEvents,
  type MapFarmerPin,
  type MapChamaCluster,
} from "@/lib/api-core";
import { getAuthToken } from "@/lib/officer-session";

export const Route = createFileRoute("/map")({
  beforeLoad: requireOfficerSession,
  head: () => ({ meta: [{ title: "Map Workspace — KaLI" }] }),
  component: MapWorkspacePage,
});

const W = 1000;
const H = 700;

const RISK_COLORS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
} as const;

function MapWorkspacePage() {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<MapFarmerPin[]>([]);
  const [chamas, setChamas] = useState<MapChamaCluster[]>([]);
  const [zones, setZones] = useState<{ id: string; x: number; y: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapFarmerPin | null>(null);
  const [live, setLive] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: W, h: H });
  const panRef = useRef({ dragging: false, startX: 0, startY: 0, vbX: 0, vbY: 0 });

  const loadMap = useCallback(() => {
    fetchMapFarmers()
      .then((data) => {
        setFarmers(data.farmers);
        setChamas(data.chamas);
        setZones(data.zones);
        setLoading(false);
        setError(null);
      })
      .catch(() => {
        setError("Could not load map data. Is the backend running?");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const unsubscribe = subscribeMapEvents(token, ({ type, data }) => {
      setLive(true);
      setLastEvent(new Date().toLocaleTimeString());

      if (type === "map_pin_updated" || type === "application_updated") {
        const farmerId = data.farmerId as string;
        if (!farmerId) return;

        setFarmers((prev) => {
          const idx = prev.findIndex((f) => f.id === farmerId);
          const riskTier = (data.riskTier as MapFarmerPin["riskTier"]) || "amber";
          const patch: Partial<MapFarmerPin> = {
            underwriting_state: (data.state as string) || "PENDING_INGESTION",
            systemScore: (data.systemScore as number) ?? null,
            riskTier,
            name: (data.name as string) || prev[idx]?.name || farmerId,
          };

          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
          }
          return prev;
        });

        setTimeout(loadMap, 800);
      }
    });

    return unsubscribe;
  }, [loadMap]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const p = panRef.current;
      p.dragging = true;
      p.startX = e.clientX;
      p.startY = e.clientY;
      p.vbX = viewBox.x;
      p.vbY = viewBox.y;
    },
    [viewBox],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const p = panRef.current;
      if (!p.dragging || !svgRef.current) return;
      const dx = (e.clientX - p.startX) * (viewBox.w / svgRef.current.clientWidth);
      const dy = (e.clientY - p.startY) * (viewBox.h / svgRef.current.clientHeight);
      setViewBox((v) => ({ ...v, x: p.vbX - dx, y: p.vbY - dy }));
    },
    [viewBox],
  );

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false;
  }, []);

  const chamaMap = new Map(chamas.map((c) => [c.id, c]));

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Map Workspace</h1>
        <p className="mt-8 text-center text-muted-foreground">Loading farmer pins from Neo4j…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Map Workspace</h1>
        <p className="mt-8 text-center text-muted-foreground">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Field Officer View</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">Map Workspace</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{farmers.length} applicants</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
              live ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            <Radio className={`h-3 w-3 ${live ? "animate-pulse" : ""}`} />
            {live ? `Live${lastEvent ? ` · ${lastEvent}` : ""}` : "SSE connected"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {(["green", "amber", "red"] as const).map((tier) => (
          <span key={tier} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLORS[tier] }} />
            {tier === "green" ? "Approved" : tier === "amber" ? "Needs verification" : "Climate / risk stress"}
          </span>
        ))}
      </div>

      <div className="mt-4 flex gap-4">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="flex-1 cursor-grab overflow-hidden rounded-xl border border-border bg-[#0f1419] shadow-card active:cursor-grabbing"
          style={{ height: 640 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <rect x={0} y={0} width={W} height={H} fill="#0f1419" />

          {zones.map((z) => (
            <g key={z.id}>
              <circle cx={z.x} cy={z.y} r={48} fill="#1e293b" stroke="#334155" strokeWidth={1} opacity={0.6} />
              <text x={z.x} y={z.y + 64} textAnchor="middle" fill="#64748b" fontSize={10}>
                {z.label}
              </text>
            </g>
          ))}

          {chamas.map((ch) => (
            <g key={ch.id}>
              <polygon
                points={`${ch.x},${ch.y - 10} ${ch.x + 10},${ch.y + 6} ${ch.x - 10},${ch.y + 6}`}
                fill="#a855f7"
                opacity={0.85}
              />
              <text x={ch.x} y={ch.y + 22} textAnchor="middle" fill="#c4b5fd" fontSize={9}>
                {ch.name}
              </text>
            </g>
          ))}

          {farmers.map((f) => {
            const chama = f.chama_id ? chamaMap.get(f.chama_id) : null;
            return (
              <g key={f.id}>
                {chama && (
                  <line
                    x1={f.x}
                    y1={f.y}
                    x2={chama.x}
                    y2={chama.y}
                    stroke="#a855f7"
                    strokeWidth={1}
                    opacity={0.35}
                    strokeDasharray="4 3"
                  />
                )}
              </g>
            );
          })}

          {farmers.map((f) => {
            const isSelected = selected?.id === f.id;
            const color = RISK_COLORS[f.riskTier] || RISK_COLORS.amber;
            return (
              <g
                key={`pin-${f.id}`}
                onClick={() => {
                  setSelected(f);
                  navigate({ to: "/scorecard/$id", params: { id: f.id } });
                }}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={f.x}
                  cy={f.y}
                  r={isSelected ? 11 : 8}
                  fill={color}
                  stroke={isSelected ? "#fff" : "#0f1419"}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={0.95}
                />
              </g>
            );
          })}
        </svg>

        {selected && (
          <div className="w-72 shrink-0 rounded-xl border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold">{selected.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{selected.cooperative || selected.zone_name}</p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grow Asia score</span>
                <span className="font-medium">{selected.systemScore ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">State</span>
                <span className="font-medium">{selected.underwriting_state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SPI</span>
                <span className="font-medium">{selected.spi ?? "—"}</span>
              </div>
              {selected.chama_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chama</span>
                  <span className="font-medium">{selected.chama_name}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
