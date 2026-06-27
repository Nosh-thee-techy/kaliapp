import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapBounds, MapChamaCluster, MapFarmerPin, MapZone } from "@/lib/api-core";

const RISK_COLORS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
} as const;

type KenyaMapProps = {
  farmers: MapFarmerPin[];
  chamas: MapChamaCluster[];
  zones: MapZone[];
  bounds: MapBounds;
  selectedFarmerId?: string | null;
  selectedZoneId?: string | null;
  onFarmerClick: (farmer: MapFarmerPin) => void;
  onZoneClick: (zone: MapZone) => void;
  className?: string;
};

export function KenyaMap({
  farmers,
  chamas,
  zones,
  bounds,
  selectedFarmerId,
  selectedZoneId,
  onFarmerClick,
  onZoneClick,
  className,
}: KenyaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    farmers: L.LayerGroup;
    chamas: L.LayerGroup;
    zones: L.LayerGroup;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [bounds.center.lat, bounds.center.lon],
      zoom: bounds.defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 5,
      maxZoom: 14,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const kenyaBounds = L.latLngBounds(
      [bounds.southWest.lat, bounds.southWest.lon],
      [bounds.northEast.lat, bounds.northEast.lon],
    );
    map.setMaxBounds(kenyaBounds.pad(0.15));
    map.fitBounds(kenyaBounds, { padding: [24, 24] });

    layersRef.current = {
      farmers: L.layerGroup().addTo(map),
      chamas: L.layerGroup().addTo(map),
      zones: L.layerGroup().addTo(map),
    };

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, [bounds]);

  useEffect(() => {
    const layers = layersRef.current;
    const map = mapRef.current;
    if (!layers || !map) return;

    layers.zones.clearLayers();
    zones.forEach((zone) => {
      const isSelected = selectedZoneId === zone.id;
      const circle = L.circle([zone.lat, zone.lng], {
        radius: (zone.radiusKm || 40) * 1000,
        color: isSelected ? "#38bdf8" : "#475569",
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? "#0ea5e9" : "#1e293b",
        fillOpacity: isSelected ? 0.22 : 0.12,
      });
      circle.bindTooltip(
        `<strong>${zone.label}</strong><br/>${zone.farmerCount} farmer${zone.farmerCount === 1 ? "" : "s"}<br/><em>Click for analytics</em>`,
        { direction: "top", sticky: true },
      );
      circle.on("click", () => onZoneClick(zone));
      circle.addTo(layers.zones);
    });

    layers.chamas.clearLayers();
    const chamaById = new globalThis.Map(chamas.map((c) => [c.id, c]));
    chamas.forEach((ch) => {
      const marker = L.circleMarker([ch.lat, ch.lng], {
        radius: 7,
        color: "#c4b5fd",
        fillColor: "#a855f7",
        fillOpacity: 0.9,
        weight: 2,
      });
      marker.bindTooltip(`<strong>${ch.name}</strong><br/>Chama cluster`);
      marker.addTo(layers.chamas);
    });

    layers.farmers.clearLayers();
    farmers.forEach((f) => {
      const isSelected = selectedFarmerId === f.id;
      const color = RISK_COLORS[f.riskTier] || RISK_COLORS.amber;
      const marker = L.circleMarker([f.lat, f.lng], {
        radius: isSelected ? 10 : 7,
        color: isSelected ? "#ffffff" : color,
        fillColor: color,
        fillOpacity: 0.95,
        weight: isSelected ? 3 : 1.5,
      });

      const chama = f.chama_id ? chamaById.get(f.chama_id) : null;
      if (chama) {
        L.polyline(
          [
            [f.lat, f.lng],
            [chama.lat, chama.lng],
          ],
          { color: "#a855f7", weight: 1, opacity: 0.35, dashArray: "4 4" },
        ).addTo(layers.farmers);
      }

      marker.bindTooltip(
        `<strong>${f.name}</strong><br/>${f.zone_name}<br/>Score: ${f.systemScore ?? "—"}`,
      );
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onFarmerClick(f);
      });
      marker.addTo(layers.farmers);
    });
  }, [
    farmers,
    chamas,
    zones,
    selectedFarmerId,
    selectedZoneId,
    onFarmerClick,
    onZoneClick,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: 640, width: "100%", borderRadius: 12, zIndex: 0 }}
    />
  );
}
