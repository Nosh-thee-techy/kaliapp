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

function stripComments(raw) {
  return raw.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
}

function splitStatements(cypher) {
  return cypher.split(";").map((s) => s.trim()).filter(Boolean);
}

function buildVarMap(statements) {
  const map = {};
  const nodePattern = /MERGE\s*\(\s*(\w+)\s*:\s*(\w+)\s*\{[^}]*id\s*:\s*"([^"]+)"[^}]*\}/g;
  for (const stmt of statements) {
    for (const [, varName, label, id] of stmt.matchAll(nodePattern)) {
      if (!map[varName]) map[varName] = { label, id };
    }
  }
  return map;
}

function fixRelationship(stmt, varMap) {
  const definedVars = new Set();
  const defPattern = /MERGE\s*\(\s*(\w+)\s*:/g;
  for (const [, v] of stmt.matchAll(defPattern)) definedVars.add(v);

  const usedVars = new Set();
  const srcPattern = /MERGE\s*\(\s*(\w+)\s*\)\s*-\[/g;
  const tgtPattern = /->\s*\(\s*(\w+)\s*\)/g;
  for (const [, v] of stmt.matchAll(srcPattern)) usedVars.add(v);
  for (const [, v] of stmt.matchAll(tgtPattern)) usedVars.add(v);

  const matches = [];
  for (const v of usedVars) {
    if (definedVars.has(v)) continue;
    const info = varMap[v];
    if (info) matches.push(`MATCH (${v}:${info.label} {id: "${info.id}"})`);
  }

  if (matches.length > 0) return matches.join(" ") + " " + stmt;
  return stmt;
}

async function runFile(driver, filePath, varMap) {
  const raw = stripComments(readFileSync(filePath, "utf8"));
  const statements = splitStatements(raw);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const short = stmt.slice(0, 60).replace(/\s+/g, " ");
    const fixed = fixRelationship(stmt, varMap);
    process.stdout.write(`  [${i + 1}/${statements.length}] ${short}… `);
    await driver.executeQuery(fixed, {}, { database: "neo4j" });
    console.log("ok");
  }
}

async function main() {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  try {
    await driver.verifyConnectivity();
    console.log(`[seed] Connected to ${uri}`);

    console.log("[seed] Clearing existing graph data...");
    await driver.executeQuery("MATCH (n) DETACH DELETE n", {}, { database: "neo4j" });
    console.log("[seed] Graph cleared.");

    // Build variable map from ALL statements across both files
    const mainStatements = splitStatements(stripComments(readFileSync(seedPath, "utf8")));
    const extraStatements = splitStatements(stripComments(readFileSync(extraSeedPath, "utf8")));
    const allStatements = [...mainStatements, ...extraStatements];
    const varMap = buildVarMap(allStatements);
    console.log(`[seed] Variable map: ${Object.keys(varMap).length} entries`);

    await runFile(driver, seedPath, varMap);
    await runFile(driver, extraSeedPath, varMap);

    const count = await driver.executeQuery("MATCH (f:Farmer) RETURN count(f) AS n", {}, { database: "neo4j" });
    const farmers = count.records[0].get("n").toNumber();
    const zoneCount = await driver.executeQuery("MATCH (z:ClimateZone) RETURN count(z) AS n", {}, { database: "neo4j" });
    const zones = zoneCount.records[0].get("n").toNumber();
    const coopCount = await driver.executeQuery("MATCH (c:Cooperative) RETURN count(c) AS n", {}, { database: "neo4j" });
    const coops = coopCount.records[0].get("n").toNumber();
    console.log(`[seed] Done. ${farmers} Farmer nodes, ${zones} ClimateZones, ${coops} Cooperatives in graph.`);

    const relCount = await driver.executeQuery(
      "MATCH ()-[r]->() RETURN count(r) AS n", {}, { database: "neo4j" }
    );
    const rels = relCount.records[0].get("n").toNumber();
    console.log(`[seed] ${rels} total relationships.`);

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
    await driver.close();
  }
}

main();
