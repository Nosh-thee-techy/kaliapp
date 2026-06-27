import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getDriver, verifyConnectivity, closeDriver } from "../src/config/neo4j.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repairPath = join(__dirname, "../../database/seed-repair.cypher");

async function main() {
  await verifyConnectivity();
  const driver = getDriver();
  const session = driver.session();
  const statements = readFileSync(repairPath, "utf8")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    for (const stmt of statements) {
      await session.run(stmt);
    }
    const links = await session.run("MATCH (:Farmer)-[:MEMBER_OF]->(:Chama) RETURN count(*) AS n");
    console.log(`[repair] Done. MEMBER_OF links: ${links.records[0].get("n").toNumber()}`);
  } finally {
    await session.close();
    await closeDriver();
  }
}

main().catch((err) => {
  console.error("[repair] Failed:", err.message);
  process.exitCode = 1;
});
