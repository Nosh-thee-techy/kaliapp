import { getZoneCoords } from "../config/zoneCoords.js";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

/**
 * Live weather from Open-Meteo (free, no API key).
 * Returns structured payload for map zone analytics panel.
 */
export async function fetchZoneWeather(zoneId) {
  const coords = getZoneCoords(zoneId);
  const placeholder = {
    source: "open-meteo",
    status: "placeholder",
    zoneId,
    zoneName: coords.name,
    lat: coords.lat,
    lon: coords.lon,
    message: "Configure OPEN_METEO_ENABLED=true and network access for live readings.",
    temperatureMaxC: null,
    precipitationMm30d: null,
    windMaxKmh: null,
    fetchedAt: new Date().toISOString(),
  };

  if (process.env.OPEN_METEO_ENABLED === "false") {
    return placeholder;
  }

  try {
    const url =
      `${OPEN_METEO_BASE}?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&daily=temperature_2m_max,precipitation_sum,wind_speed_10m_max` +
      `&past_days=30&forecast_days=3&timezone=Africa/Nairobi`;

    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      return { ...placeholder, status: "error", message: `Open-Meteo HTTP ${res.status}` };
    }

    const data = await res.json();
    const daily = data.daily || {};
    const temps = (daily.temperature_2m_max || []).filter((v) => v != null);
    const rain = (daily.precipitation_sum || []).filter((v) => v != null);
    const wind = (daily.wind_speed_10m_max || []).filter((v) => v != null);

    return {
      source: "open-meteo",
      status: "live",
      zoneId,
      zoneName: coords.name,
      lat: coords.lat,
      lon: coords.lon,
      temperatureMaxC: temps.length ? Math.round(temps[temps.length - 1] * 10) / 10 : null,
      temperatureAvgMaxC: temps.length
        ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
        : null,
      precipitationMm30d: rain.length ? Math.round(rain.reduce((a, b) => a + b, 0)) : null,
      windMaxKmh: wind.length ? Math.round(Math.max(...wind) * 10) / 10 : null,
      forecastDays: (daily.time || []).slice(-3),
      message: null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ...placeholder,
      status: "error",
      message: err.message || "Open-Meteo unavailable",
    };
  }
}
