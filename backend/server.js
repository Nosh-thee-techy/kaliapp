import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./src/routes/api.js";
import ussdRoutes from "./src/routes/ussd.js";
import { verifyConnectivity, closeDriver } from "./src/config/neo4j.js";

const app = express();
const PORT = Number(process.env.API_CORE_PORT) || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRoutes);
app.use("/ussd", ussdRoutes);

app.get("/", (_req, res) => {
  res.json({
    service: "KaLI Graph-Native API Core",
    docs: {
      health: "GET /api/health",
      auth: "POST /api/auth/login | POST /api/auth/register | GET /api/auth/me",
      farmers: "GET /api/farmers (Bearer JWT)",
      scorecard: "GET /api/scorecard/:id",
      decision: "POST /api/farmers/:id/decision",
      ussd: "POST /ussd/ussd | POST /ussd/callback (Africa's Talking)",
    },
  });
});

async function start() {
  try {
    await verifyConnectivity();
    console.log("[backend] Neo4j connection verified");
  } catch (err) {
    console.warn("[backend] Neo4j not reachable — start Neo4j and run `npm run seed` in backend/");
    console.warn(err.message);
  }

  app.listen(PORT, () => {
    console.log(`[backend] listening on http://localhost:${PORT}`);
  });
}

process.on("SIGINT", async () => {
  await closeDriver();
  process.exit(0);
});

start();
