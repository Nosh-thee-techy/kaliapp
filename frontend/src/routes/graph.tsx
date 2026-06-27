import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { requireOfficerSession } from "@/lib/require-officer";
import { graphFetch } from "@/lib/api-core";
import { useNavigate } from "@tanstack/react-router";

type GraphNode = {
  id: string;
  name: string;
  type: "farmer" | "cooperative" | "zone" | "chama" | "plot" | "other";
  score: number | null;
};

type GraphLink = {
  source: string;
  target: string;
  type: string;
};

type LayoutNode = GraphNode & { x: number; y: number; vx: number; vy: number };

const COLORS: Record<string, string> = {
  farmer: "#22c55e",
  cooperative: "#3b82f6",
  zone: "#f59e0b",
  chama: "#a855f7",
  plot: "#6b7280",
  other: "#6b7280",
};

const TYPES: Record<string, string> = {
  DELIVERS_TO: "co·op delivery",
  MEMBER_OF: "chama member",
  GUARANTEES: "guarantees",
  OPERATES_IN: "operates in",
  LOCATED_IN: "located in",
  NOTIFIED: "notified",
  DECIDED: "decided",
};

export const Route = createFileRoute("/graph")({
  beforeLoad: requireOfficerSession,
  head: () => ({ meta: [{ title: "Graph View — KaLI" }] }),
  component: GraphPage,
});

const W = 960;
const H = 640;

function forceLayout(nodes: GraphNode[], links: GraphLink[]): LayoutNode[] {
  const layout: LayoutNode[] = nodes.map((n, i) => ({
    ...n,
    x: W / 2 + (Math.random() - 0.5) * W * 0.6,
    y: H / 2 + (Math.random() - 0.5) * H * 0.6,
    vx: 0,
    vy: 0,
  }));

  const nodeMap = new Map(layout.map((n) => [n.id, n]));

  for (let iter = 0; iter < 120; iter++) {
    const cooling = 1 - iter / 120;

    // repulsion
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const a = layout[i];
        const b = layout[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 3000 / (dist * dist);
        dx = (dx / dist) * force * cooling;
        dy = (dy / dist) * force * cooling;
        a.vx -= dx;
        a.vy -= dy;
        b.vx += dx;
        b.vy += dy;
      }
    }

    // attraction along links
    for (const link of links) {
      const a = nodeMap.get(link.source);
      const b = nodeMap.get(link.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 120) * 0.01 * cooling;
      a.vx += (dx / dist) * force;
      a.vy += (dy / dist) * force;
      b.vx -= (dx / dist) * force;
      b.vy -= (dy / dist) * force;
    }

    // center gravity
    for (const n of layout) {
      n.vx += (W / 2 - n.x) * 0.002 * cooling;
      n.vy += (H / 2 - n.y) * 0.002 * cooling;
    }

    // apply
    for (const n of layout) {
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(20, Math.min(W - 20, n.x));
      n.y = Math.max(20, Math.min(H - 20, n.y));
    }
  }

  return layout;
}

function GraphPage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LayoutNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: W, h: H });
  const panRef = useRef({ x: 0, y: 0, dragging: false, startX: 0, startY: 0, vbX: 0, vbY: 0 });

  useEffect(() => {
    graphFetch<{ nodes: GraphNode[]; links: GraphLink[] }>("/api/graph-data")
      .then((data) => {
        setLinks(data.links);
        setNodes(forceLayout(data.nodes, data.links));
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load graph data. Is the backend running?");
        setLoading(false);
      });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const p = panRef.current;
    p.dragging = true;
    p.startX = e.clientX;
    p.startY = e.clientY;
    p.vbX = viewBox.x;
    p.vbY = viewBox.y;
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const p = panRef.current;
    if (!p.dragging) return;
    const dx = (e.clientX - p.startX) * (viewBox.w / svgRef.current!.clientWidth);
    const dy = (e.clientY - p.startY) * (viewBox.h / svgRef.current!.clientHeight);
    setViewBox((v) => ({ ...v, x: p.vbX - dx, y: p.vbY - dy }));
  }, [viewBox]);

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false;
  }, []);

  const linkTypes = [...new Set(links.map((l) => l.type))];

  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(linkTypes));

  const toggleType = (t: string) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const filteredLinks = links.filter((l) => visibleTypes.has(l.type));
  const linkedIds = new Set<string>();
  for (const l of filteredLinks) {
    linkedIds.add(l.source);
    linkedIds.add(l.target);
  }
  const filteredNodes = nodes.filter((n) => linkedIds.has(n.id));

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Network Visualization</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">Graph View</h1>
        <p className="mt-8 text-center text-muted-foreground">Loading graph data from Neo4j…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Network Visualization</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">Graph View</h1>
        <p className="mt-8 text-center text-muted-foreground">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Network Visualization</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">
            Neo4j Graph
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{filteredNodes.length} nodes · {filteredLinks.length} edges</span>
          <span className="rounded-full bg-success/10 px-2 py-1 font-medium text-success">Live</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {linkTypes.map((t) => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              visibleTypes.has(t)
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground line-through"
            }`}
          >
            {TYPES[t] || t}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-4">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="flex-1 cursor-grab overflow-hidden rounded-xl border border-border bg-card shadow-card active:cursor-grabbing"
          style={{ height: 640 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {filteredLinks.map((l, i) => {
            const a = filteredNodes.find((n) => n.id === l.source);
            const b = filteredNodes.find((n) => n.id === l.target);
            if (!a || !b) return null;
            return (
              <line
                key={`link-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={hovered === l.source || hovered === l.target ? "#60a5fa" : "#374151"}
                strokeWidth={hovered === l.source || hovered === l.target ? 2.5 : 1}
                opacity={hovered && hovered !== l.source && hovered !== l.target ? 0.1 : 0.4}
              />
            );
          })}

          {filteredNodes.map((n) => {
            const isSelected = selected?.id === n.id;
            const isHovered = hovered === n.id;
            const r = n.type === "farmer" ? 8 : n.type === "cooperative" ? 10 : n.type === "zone" ? 12 : n.type === "chama" ? 9 : 6;
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  if (n.type === "farmer") {
                    navigate({ to: "/scorecard/$id", params: { id: n.id } });
                  } else {
                    setSelected(isSelected ? null : n);
                  }
                }}
                style={{ cursor: n.type === "farmer" ? "pointer" : "default" }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isSelected ? r + 4 : isHovered ? r + 2 : r}
                  fill={COLORS[n.type]}
                  stroke={isSelected ? "#fff" : isHovered ? "#e5e7eb" : "transparent"}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
                  opacity={hovered && hovered !== n.id ? 0.2 : 0.9}
                />
                {isHovered && (
                  <text
                    x={n.x}
                    y={n.y - r - 8}
                    textAnchor="middle"
                    fill="#e5e7eb"
                    fontSize={11}
                    fontWeight={500}
                  >
                    {n.name || n.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {selected && (
          <div className="w-64 shrink-0 rounded-xl border border-border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">{selected.name || selected.id}</h3>
            <p className="mt-1 text-xs text-muted-foreground capitalize">{selected.type}</p>
            {selected.score != null && (
              <p className="mt-2 text-xs text-muted-foreground">SPI: {selected.score}</p>
            )}
            <div className="mt-3 space-y-1">
              {filteredLinks
                .filter((l) => l.source === selected.id || l.target === selected.id)
                .slice(0, 10)
                .map((l, i) => {
                  const peer = filteredNodes.find((n) => n.id === (l.source === selected.id ? l.target : l.source));
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[9px]">{TYPES[l.type] || l.type}</span>
                      <span>{peer?.name || peer?.id || "?"}</span>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
