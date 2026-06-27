/** Climate zone centroids — Kenya + Uganda (eSusFarm). Shared by map, climate, weather. */

export const KENYA_ZONE_COORDS = {
  "KE-RIFT-04": { lat: -0.75, lon: 36.38, name: "Naivasha Basin", radiusKm: 42, country: "KE" },
  "KE-RIFT-02": { lat: 0.52, lon: 35.28, name: "Uasin Gishu Plateau", radiusKm: 55, country: "KE" },
  "KE-NE-01": { lat: -0.45, lon: 39.65, name: "North Eastern Range", radiusKm: 80, country: "KE" },
  "KE-NYZ-03": { lat: -0.18, lon: 34.52, name: "Ahero Irrigation Belt", radiusKm: 38, country: "KE" },
  "KE-CEN-01": { lat: -0.48, lon: 37.13, name: "Mt. Kenya South", radiusKm: 45, country: "KE" },
  "KE-EAS-02": { lat: -1.52, lon: 37.27, name: "Machakos Lowlands", radiusKm: 48, country: "KE" },
};

/** eSusFarm Uganda — parametric / value-chain regions */
export const UGANDA_ZONE_COORDS = {
  "UG-CEN-01": { lat: 0.35, lon: 32.58, name: "Central Buganda", radiusKm: 45, country: "UG" },
  "UG-EAS-02": { lat: 1.08, lon: 34.18, name: "Mbale Eastern Highlands", radiusKm: 50, country: "UG" },
  "UG-NOR-01": { lat: 2.77, lon: 32.3, name: "Gulu Northern Belt", radiusKm: 65, country: "UG" },
  "UG-WES-03": { lat: -0.61, lon: 30.65, name: "Mbarara Western Dairy", radiusKm: 48, country: "UG" },
  "UG-SWE-02": { lat: -0.34, lon: 31.73, name: "Masaka Coffee Belt", radiusKm: 42, country: "UG" },
  "UG-NE-01": { lat: 2.53, lon: 34.67, name: "Karamoja Pastoral", radiusKm: 90, country: "UG" },
};

export const ALL_ZONE_COORDS = { ...KENYA_ZONE_COORDS, ...UGANDA_ZONE_COORDS };

/** East Africa viewport — Kenya + Uganda on officer map */
export const EAST_AFRICA_MAP_BOUNDS = {
  southWest: { lat: -4.75, lon: 29.5 },
  northEast: { lat: 5.05, lon: 41.95 },
  center: { lat: 0.3, lon: 35.5 },
  defaultZoom: 6,
};

/** @deprecated use EAST_AFRICA_MAP_BOUNDS */
export const KENYA_MAP_BOUNDS = EAST_AFRICA_MAP_BOUNDS;

export function getZoneCoords(zoneId) {
  return ALL_ZONE_COORDS[zoneId] || ALL_ZONE_COORDS["KE-RIFT-04"];
}

export function zonesForCountry(country) {
  return Object.entries(ALL_ZONE_COORDS)
    .filter(([, c]) => c.country === country)
    .map(([id, c]) => ({ id, ...c }));
}
