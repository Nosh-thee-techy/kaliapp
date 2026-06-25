import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import neo4j from "neo4j-driver";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, "../../database/seed.cypher");

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
  const session = driver.session();
  const raw = readFileSync(seedPath, "utf8");
  const statements = splitStatements(raw);

  console.log(`[seed] Running ${statements.length} Cypher statements against ${uri}`);

  try {
    await driver.verifyConnectivity();
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const label = stmt.slice(0, 60).replace(/\s+/g, " ");
      process.stdout.write(`  [${i + 1}/${statements.length}] ${label}… `);
      await session.run(stmt);
      console.log("ok");
    }
    const count = await session.run("MATCH (f:Farmer) RETURN count(f) AS n");
    const farmers = count.records[0].get("n").toNumber();
    console.log(`[seed] Done. ${farmers} Farmer nodes in graph.`);

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
    console.log("[seed] 2 Officer accounts ready (see README for demo credentials).");
  } catch (err) {
    console.error("[seed] Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
