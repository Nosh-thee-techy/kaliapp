import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./src/routes/api.js";
import ussdRoutes from "./src/routes/ussd.js";
import { verifyConnectivity, closeDriver } from "./src/config/neo4j.js";

const app = express();
const PORT = Number(process.env.PORT) || Number(process.env.API_CORE_PORT) || 4000;

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "5mb" }));
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
      ingest: "POST /api/ingest (USSD/Voice/Officer unified pipeline)",
      voice: "GET /api/voice | POST /api/voice/stt | POST /api/voice/tts | POST /api/voice/sts",
      map: "GET /api/map/farmers (Bearer JWT)",
      events: "GET /api/events/stream?token=JWT (SSE live map)",
      ussd: "POST /ussd/ussd | POST /ussd/callback | POST /ussd/voice",
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
