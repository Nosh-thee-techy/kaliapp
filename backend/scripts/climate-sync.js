import "dotenv/config";
import { verifyConnectivity, closeDriver } from "../src/config/neo4j.js";
import { syncClimatePipeline } from "../src/services/climatePipeline.js";

async function main() {
  try {
    await verifyConnectivity();
    console.log("[climate-sync] Neo4j connected");
    const result = await syncClimatePipeline();
    console.log(
      `[climate-sync] Done — ${result.zonesUpdated} zones updated, ${result.farmersPromoted} farmers promoted to ready_for_review`,
    );
    for (const z of result.zones) {
      console.log(
        `  ${z.zoneCode}: rain ${z.rainfall_mm_last_30d}mm · SPI ${z.current_spi_index} · pest ${z.pest_proximity_km}km`,
      );
    }
  } catch (err) {
    console.error("[climate-sync] Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await closeDriver();
  }
}

main();
