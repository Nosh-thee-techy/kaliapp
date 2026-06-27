import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getDriver, verifyConnectivity, closeDriver } from "../src/config/neo4j.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ugandaPath = join(__dirname, "../../database/seed-uganda.cypher");

async function main() {
  await verifyConnectivity();
  const session = getDriver().session();
  const statements = readFileSync(ugandaPath, "utf8")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("//"));

  try {
    for (const stmt of statements) {
      await session.run(stmt);
    }
    const zones = await session.run("MATCH (z:ClimateZone) WHERE z.id STARTS WITH 'UG-' RETURN count(z) AS n");
    const farmers = await session.run("MATCH (f:Farmer) WHERE f.id STARTS WITH 'F-UG-' RETURN count(f) AS n");
    console.log(
      `[seed:uganda] Done. Uganda zones: ${zones.records[0].get("n").toNumber()}, demo farmers: ${farmers.records[0].get("n").toNumber()}`,
    );
  } finally {
    await session.close();
    await closeDriver();
  }
}

main().catch((err) => {
  console.error("[seed:uganda] Failed:", err.message);
  process.exitCode = 1;
});
