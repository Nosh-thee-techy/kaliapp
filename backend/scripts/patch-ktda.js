import "dotenv/config";
import { getDriver, closeDriver } from "../src/config/neo4j.js";

const session = getDriver().session();
try {
  await session.run(
    `MATCH (f:Farmer {id: $id}) SET f.ktda_id = $ktda RETURN f.name AS name, f.ktda_id AS ktda`,
    { id: "F-1056", ktda: "KTDA-43456789" },
  );
  console.log("[patch] KTDA ID set on F-1056 (James Mburu, Tea)");
} finally {
  await session.close();
  await closeDriver();
}
