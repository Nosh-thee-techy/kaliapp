import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CloudRain, Loader2, MapPin, Radio, Thermometer, Wind } from "lucide-react";
import { requireBranchOfficerSession } from "@/lib/require-officer";
import { KenyaMap } from "@/components/KenyaMap";
import {
  fetchMapFarmers,
  fetchZoneAnalytics,
  subscribeMapEvents,
  type MapBounds,
  type MapChamaCluster,
  type MapFarmerPin,
  type MapZone,
  type ZoneAnalytics,
} from "@/lib/api-core";
import { getAuthToken } from "@/lib/officer-session";

export const Route = createFileRoute("/map")({
  beforeLoad: requireBranchOfficerSession,
  head: () => ({ meta: [{ title: "Map Workspace — KaLI" }] }),
  component: MapWorkspacePage,
});

const DEFAULT_BOUNDS: MapBounds = {
  southWest: { lat: -4.75, lon: 29.5 },
  northEast: { lat: 5.05, lon: 41.95 },
  center: { lat: 0.3, lon: 35.5 },
  defaultZoom: 6,
};

const RISK_COLORS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
} as const;

function MapWorkspacePage() {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<MapFarmerPin[]>([]);
  const [chamas, setChamas] = useState<MapChamaCluster[]>([]);
  const [zones, setZones] = useState<MapZone[]>([]);
  const [bounds, setBounds] = useState<MapBounds>(DEFAULT_BOUNDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<MapFarmerPin | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [zoneAnalytics, setZoneAnalytics] = useState<ZoneAnalytics | null>(null);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadMap = useCallback(() => {
    fetchMapFarmers()
      .then((data) => {
        setFarmers(data.farmers);
        setChamas(data.chamas);
        setZones(data.zones);
        if (data.bounds) setBounds(data.bounds);
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

  const handleZoneClick = useCallback((zone: MapZone) => {
    setSelectedZone(zone);
    setSelectedFarmer(null);
    setZoneAnalytics(null);
    setZoneLoading(true);

    fetchZoneAnalytics(zone.id)
      .then((data) => setZoneAnalytics(data))
      .catch(() => setZoneAnalytics(null))
      .finally(() => setZoneLoading(false));
  }, []);

  const handleFarmerClick = useCallback((farmer: MapFarmerPin) => {
    setSelectedFarmer(farmer);
    setSelectedZone(null);
    setZoneAnalytics(null);
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Map Workspace</h1>
        <p className="mt-8 text-center text-muted-foreground">Loading Kenya field map from Neo4j…</p>
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
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">East Africa Map Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kenya + Uganda climate zones. Scroll or use +/- to zoom. Click a zone for analytics.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{farmers.length} applicants · {zones.length} zones</span>
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500 opacity-60" />
          Climate zone — click for analytics
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border shadow-card">
          {mounted ? (
            <KenyaMap
              farmers={farmers}
              chamas={chamas}
              zones={zones}
              bounds={bounds}
              selectedFarmerId={selectedFarmer?.id}
              selectedZoneId={selectedZone?.id}
              onFarmerClick={handleFarmerClick}
              onZoneClick={handleZoneClick}
            />
          ) : (
            <div className="flex h-[640px] items-center justify-center bg-muted/30 text-sm text-muted-foreground">
              Initializing map…
            </div>
          )}
        </div>

        {(selectedFarmer || selectedZone) && (
          <aside className="w-full shrink-0 rounded-xl border border-border bg-card p-4 shadow-card lg:w-80">
            {selectedFarmer && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{selectedFarmer.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedFarmer.cooperative || selectedFarmer.zone_name}
                    </p>
                  </div>
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: RISK_COLORS[selectedFarmer.riskTier] }}
                  />
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grow Asia score</span>
                    <span className="font-medium">{selectedFarmer.systemScore ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">State</span>
                    <span className="font-medium">{selectedFarmer.underwriting_state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SPI</span>
                    <span className="font-medium">{selectedFarmer.spi ?? "—"}</span>
                  </div>
                  {selectedFarmer.chama_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chama</span>
                      <span className="font-medium">{selectedFarmer.chama_name}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate({ to: "/scorecard/$id", params: { id: selectedFarmer.id } })}
                  className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Open scorecard
                </button>
              </>
            )}

            {selectedZone && (
              <>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sky-500" />
                  <h3 className="text-sm font-semibold">{selectedZone.label}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Zone analytics · {selectedZone.id}</p>

                {zoneLoading && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading zone analytics…
                  </div>
                )}

                {zoneAnalytics && !zoneLoading && (
                  <div className="mt-4 space-y-4 text-xs">
                    <section>
                      <p className="mb-2 font-medium uppercase tracking-wide text-muted-foreground">Portfolio</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Stat label="Farmers" value={zoneAnalytics.analytics.farmerCount} />
                        <Stat label="Co-ops" value={zoneAnalytics.analytics.cooperativeCount} />
                        <Stat label="Chamas" value={zoneAnalytics.analytics.chamaCount} />
                        <Stat label="Avg score" value={zoneAnalytics.analytics.avgGrowAsiaScore} />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <RiskPill color={RISK_COLORS.green} count={zoneAnalytics.analytics.riskBreakdown.green} />
                        <RiskPill color={RISK_COLORS.amber} count={zoneAnalytics.analytics.riskBreakdown.amber} />
                        <RiskPill color={RISK_COLORS.red} count={zoneAnalytics.analytics.riskBreakdown.red} />
                      </div>
                    </section>

                    <section>
                      <p className="mb-2 font-medium uppercase tracking-wide text-muted-foreground">Climate (graph)</p>
                      <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5">
                        <div className="flex justify-between">
                          <span>SPI index</span>
                          <span className="font-medium">{zoneAnalytics.climate.spi}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rainfall (30d)</span>
                          <span className="font-medium">{zoneAnalytics.climate.rainfallMm30d} mm</span>
                        </div>
                        {zoneAnalytics.climate.advisory && (
                          <p className="mt-1 text-muted-foreground">{zoneAnalytics.climate.advisory}</p>
                        )}
                      </div>
                    </section>

                    <section>
                      <p className="mb-2 flex items-center gap-1.5 font-medium uppercase tracking-wide text-muted-foreground">
                        <CloudRain className="h-3.5 w-3.5" />
                        Weather API
                        <span
                          className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            zoneAnalytics.weather.status === "live"
                              ? "bg-success/15 text-success"
                              : zoneAnalytics.weather.status === "error"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {zoneAnalytics.weather.status}
                        </span>
                      </p>
                      <div className="space-y-1.5 rounded-lg border border-dashed border-border p-2.5">
                        {zoneAnalytics.weather.status === "live" ? (
                          <>
                            <WeatherRow
                              icon={<Thermometer className="h-3.5 w-3.5" />}
                              label="Max temp today"
                              value={
                                zoneAnalytics.weather.temperatureMaxC != null
                                  ? `${zoneAnalytics.weather.temperatureMaxC}°C`
                                  : "—"
                              }
                            />
                            <WeatherRow
                              icon={<CloudRain className="h-3.5 w-3.5" />}
                              label="Rainfall (30d)"
                              value={
                                zoneAnalytics.weather.precipitationMm30d != null
                                  ? `${zoneAnalytics.weather.precipitationMm30d} mm`
                                  : "—"
                              }
                            />
                            <WeatherRow
                              icon={<Wind className="h-3.5 w-3.5" />}
                              label="Max wind"
                              value={
                                zoneAnalytics.weather.windMaxKmh != null
                                  ? `${zoneAnalytics.weather.windMaxKmh} km/h`
                                  : "—"
                              }
                            />
                          </>
                        ) : (
                          <p className="text-muted-foreground">
                            {zoneAnalytics.weather.message ||
                              "Open-Meteo placeholder — live readings load when the API is reachable."}
                          </p>
                        )}
                        <p className="pt-1 text-[10px] text-muted-foreground">
                          Source: {zoneAnalytics.weather.source} · {zoneAnalytics.weather.fetchedAt.slice(0, 19)}
                        </p>
                      </div>
                    </section>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => {
                setSelectedFarmer(null);
                setSelectedZone(null);
                setZoneAnalytics(null);
              }}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Close panel
            </button>
          </aside>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function RiskPill({ color, count }: { color: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: `${color}22` }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {count}
    </span>
  );
}

function WeatherRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
