import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import neo4j from "neo4j-driver";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, "../../database/seed.cypher");
const extraSeedPath = join(__dirname, "../../database/seed-extra.cypher");

const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const password = process.env.NEO4J_PASSWORD || "kali-dev-password";

function splitStatements(cypher) {
  return cypher
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const clearSession = driver.session();
  const seedSession = driver.session();

  try {
    await driver.verifyConnectivity();
    console.log(`[seed] Connected to ${uri}`);

    console.log("[seed] Clearing existing graph data...");
    await clearSession.run("MATCH (n) DETACH DELETE n");
    console.log("[seed] Graph cleared.");

    const raw = readFileSync(seedPath, "utf8");
    const statements = splitStatements(raw);
    console.log(`[seed] Running ${statements.length} Cypher statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const label = stmt.slice(0, 60).replace(/\s+/g, " ");
      process.stdout.write(`  [${i + 1}/${statements.length}] ${label}… `);
      await seedSession.run(stmt);
      console.log("ok");
    }

    try {
      const extraRaw = readFileSync(extraSeedPath, "utf8");
      const extraStatements = splitStatements(extraRaw);
      if (extraStatements.length > 0) {
        console.log(`[seed] Running ${extraStatements.length} extra Cypher statements...`);
        for (let i = 0; i < extraStatements.length; i++) {
          const stmt = extraStatements[i];
          const label = stmt.slice(0, 60).replace(/\s+/g, " ");
          process.stdout.write(`  [${i + 1}/${extraStatements.length}] ${label}… `);
          await seedSession.run(stmt);
          console.log("ok");
        }
      }
    } catch {
      console.log("[seed] No extra seed file found, skipping.");
    }

    const count = await seedSession.run("MATCH (f:Farmer) RETURN count(f) AS n");
    const farmers = count.records[0].get("n").toNumber();
    const zoneCount = await seedSession.run("MATCH (z:ClimateZone) RETURN count(z) AS n");
    const zones = zoneCount.records[0].get("n").toNumber();
    const coopCount = await seedSession.run("MATCH (c:Cooperative) RETURN count(c) AS n");
    const coops = coopCount.records[0].get("n").toNumber();
    console.log(`[seed] Done. ${farmers} Farmer nodes, ${zones} ClimateZones, ${coops} Cooperatives in graph.`);

    const { seedOfficers } = await import("../src/services/authService.js");
    await seedOfficers([
      {
        email: "jane.mwangi@kali.co.ke",
        name: "Jane Mwangi",
        branch: "Naivasha",
        password: "KaliBranch2026!",
      },
      {
        email: "j.mwangi@kali.co.ke",
        name: "James Mwangi",
        branch: "Naivasha",
        password: "KaliBranch2026!",
      },
    ]);
    console.log("[seed] 2 Officer accounts ready.");
    console.log(`[seed] Demo credentials: jane.mwangi@kali.co.ke / KaliBranch2026!`);
  } catch (err) {
    console.error("[seed] Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await clearSession.close();
    await seedSession.close();
    await driver.close();
  }
}

main();
