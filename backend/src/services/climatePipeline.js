import { getDriver } from "../config/neo4j.js";

const CHIRPS_SOURCE = "CHIRPS Rainfall Grids";
const ICPAC_SOURCE = "ICPAC SPI Index";
const PEST_SOURCE = "Pest Proximity Feed (KALRO)";

/** Jitter climate readings — replace with real CHIRPS/ICPAC API calls in production. */
function nextClimateReading(zone) {
  const spi = Number(zone.spi) || 0;
  const rainfall = Number(zone.rainfallMmLast30d) || 40;
  const pestKm = Number(zone.pestProximityKm) || 50;

  const rainDelta = (Math.random() - 0.45) * 18;
  const newRainfall = Math.max(0, Math.round(rainfall + rainDelta));
  const spiDelta = (Math.random() - 0.5) * 0.35;
  let newSpi = Math.round((spi + spiDelta) * 10) / 10;
  newSpi = Math.max(-2.5, Math.min(2, newSpi));

  const pestDelta = (Math.random() - 0.5) * 8;
  const newPestKm = Math.max(5, Math.round(pestKm + pestDelta));

  let advisory = zone.advisory || null;
  if (newSpi <= -1.5) {
    advisory = `Severe drought signal (SPI ${newSpi}) — defer input credit until rainfall recovers.`;
  } else if (newPestKm < 20) {
    advisory = `Pest/locust activity within ${newPestKm}km — scout fields within 72h.`;
  } else if (newSpi > -0.5 && newPestKm > 40) {
    advisory = null;
  }

  return {
    zoneCode: zone.zoneCode,
    rainfall_mm_last_30d: newRainfall,
    current_spi_index: newSpi,
    pest_proximity_km: newPestKm,
    advisory,
  };
}

export async function syncClimatePipeline() {
  const driver = getDriver();
  const session = driver.session();
  const syncedAt = new Date().toISOString();

  try {
    const zonesResult = await session.run(`
      MATCH (z:ClimateZone)
      RETURN z.id AS id, z.name AS name,
             z.current_spi_index AS spi,
             z.rainfall_mm_last_30d AS rainfall,
             z.pest_proximity_km AS pest,
             z.advisory AS advisory
      ORDER BY z.id
    `);

    const zones = zonesResult.records.map((r) => ({
      zoneCode: r.get("id"),
      name: r.get("name"),
      spi: r.get("spi"),
      rainfallMmLast30d: r.get("rainfall"),
      pestProximityKm: r.get("pest"),
      advisory: r.get("advisory"),
    }));

    const updates = zones.map(nextClimateReading);

    for (const u of updates) {
      await session.run(
        `
        MATCH (z:ClimateZone {id: $zoneCode})
        SET z.rainfall_mm_last_30d = $rainfall,
            z.current_spi_index = $spi,
            z.pest_proximity_km = $pest,
            z.advisory = $advisory,
            z.last_sync_iso = $syncedAt
      `,
        {
          zoneCode: u.zoneCode,
          rainfall: u.rainfall_mm_last_30d,
          spi: u.current_spi_index,
          pest: u.pest_proximity_km,
          advisory: u.advisory,
          syncedAt,
        },
      );
    }

    await session.run(
      `
      MERGE (p:PipelineRun {source: $source})
      SET p.status = "ok",
          p.message = $message,
          p.last_run_iso = $syncedAt
    `,
      {
        source: CHIRPS_SOURCE,
        message: `${updates.length} zones refreshed`,
        syncedAt,
      },
    );

    await session.run(
      `
      MERGE (p:PipelineRun {source: $source})
      SET p.status = "ok",
          p.message = "SPI indices recomputed for all climate hubs",
          p.last_run_iso = $syncedAt
    `,
      { source: ICPAC_SOURCE, syncedAt },
    );

    const pestWarnings = updates.filter((u) => u.pest_proximity_km < 25).length;
    await session.run(
      `
      MERGE (p:PipelineRun {source: $source})
      SET p.status = $status,
          p.message = $message,
          p.last_run_iso = $syncedAt
    `,
      {
        source: PEST_SOURCE,
        status: pestWarnings > 0 ? "warn" : "ok",
        message:
          pestWarnings > 0
            ? `${pestWarnings} zone(s) within pest proximity threshold`
            : "No new pest outbreaks detected",
        syncedAt,
      },
    );

    const promoteResult = await session.run(`
      MATCH (f:Farmer {status: "awaiting_climate"})
            -[:DELIVERS_TO]->(:Cooperative)
            -[:OPERATES_IN]->(:ClimateZone)
      SET f.status = "ready_for_review"
      RETURN count(f) AS promoted
    `);

    const farmersPromoted = promoteResult.records[0]?.get("promoted")?.toNumber?.() ?? 0;

    return {
      syncedAt,
      zonesUpdated: updates.length,
      farmersPromoted,
      zones: updates,
    };
  } finally {
    await session.close();
  }
}
