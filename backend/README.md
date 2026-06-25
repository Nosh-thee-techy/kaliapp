# KaLI Backend — Graph-Native API Service

The backend is an **Express.js** service that executes **Cypher graph traversals** against Neo4j to score farmer creditworthiness, manage the application queue, handle USSD sessions, and journal underwriting decisions.

Neo4j is **non-negotiable** — it is the single source of truth for all farmer, cooperative, chama, and climate data.

---

## Table of contents

- [Directory structure](#directory-structure)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [USSD handler](#ussd-handler)
- [Scoring engine](#scoring-engine)
- [Graph data model](#graph-data-model)
- [Seeding](#seeding)
- [Decision workflow](#decision-workflow)
- [Error handling](#error-handling)
- [Development tips](#development-tips)

---

## Directory structure

```
backend/
├── README.md                          ← This file
├── package.json                       ← npm dependencies
├── package-lock.json
├── server.js                          ← Express app entry point
│
├── scripts/
│   └── seed.js                        ← Runs database/seed.cypher against Neo4j
│
└── src/
    ├── config/
    │   └── neo4j.js                   ← Driver singleton (getDriver, verifyConnectivity)
    │
    ├── services/
    │   ├── scoringEngine.js           ← Core Cypher traversal + point rules ★
    │   └── farmerService.js           ← Queue list, USSD registration, decisions
    │
    ├── controllers/
    │   ├── scorecardController.js     ← REST handlers (scorecard, farmers, pipeline)
    │   └── ussdController.js          ← Stateful USSD plain-text handler
    │
    └── routes/
        ├── api.js                     ← Mounted at /api
        └── ussd.js                    ← Mounted at /ussd
```

★ = Business logic heart of KaLI

Related files outside this directory:

```
../database/seed.cypher    ← Graph seed data (farmers, zones, chamas, pipelines)
../docker-compose.neo4j.yml
../.env.example
```

---

## Tech stack

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.x | HTTP server |
| `neo4j-driver` | 5.x | Official Neo4j Bolt driver |
| `cors` | 2.x | Cross-origin for frontend dev server |
| `dotenv` | 16.x | Environment variable loading |

---

## Getting started

### Prerequisites

Neo4j 5.x running on `bolt://localhost:7687`.

**Option A — Docker (from repo root):**

```bash
npm run neo4j:up
```

**Option B — Neo4j Desktop:** Create a local DB with password `kali-dev-password`.

### Install & run

```bash
cd backend
npm install

# Seed the graph (from repo root)
npm run neo4j:seed

# Start API with file watching
npm run dev
# → http://localhost:4000
```

### Verify

```bash
curl http://localhost:4000/api/health
# {"status":"ok","engine":"neo4j","service":"kali-backend"}

curl http://localhost:4000/api/scorecard/F-1042
# Full graph scorecard JSON with drivers, drags, climate
```

---

## Environment variables

Set in repo root `.env` (loaded by `dotenv` in `server.js`):

| Variable | Default | Description |
|----------|---------|-------------|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt connection URI |
| `NEO4J_USER` | `neo4j` | Database username |
| `NEO4J_PASSWORD` | `kali-dev-password` | Database password |
| `API_CORE_PORT` | `4000` | HTTP listen port |
| `CORS_ORIGIN` | `true` (all) | Allowed frontend origin |

---

## API reference

Base URL: `http://localhost:4000`

### Health

```
GET /api/health
```

Returns `{ status, engine, service }`. Returns `503` if Neo4j is unreachable.

---

### Farmers queue

```
GET /api/farmers
GET /api/farmers?status=ready_for_review
GET /api/farmers?segment=Women
```

**Response:**

```json
{
  "farmers": [
    {
      "id": "F-1042",
      "nationalId": "29845112",
      "name": "Mary Wanjiku",
      "segment": "Women",
      "status": "ready_for_review",
      "cooperative": "Naivasha Horticulture Co-op",
      "zoneCode": "KE-RIFT-04",
      "requestedKes": 45000
    }
  ],
  "count": 7
}
```

---

### Scorecard (graph traversal)

```
GET /api/scorecard/:id
```

`:id` accepts KaLI ID (`F-1042`) or national ID (`29845112`).

**Response:**

```json
{
  "id": "F-1042",
  "name": "Mary Wanjiku",
  "aggregate_score": 78,
  "total": 78,
  "band": "Approve",
  "recommendation": "APPROVED (Flexible Crop Alignment)",
  "drivers": [
    { "label": "Chama collective financial trust", "points": 15, "detail": "..." }
  ],
  "drags": [
    { "label": "Climate zone dry spell", "points": -15, "detail": "SPI -1.2 in KE-RIFT-04" }
  ],
  "asset_substitute_applied": true,
  "climate": { "spi": -1.2, "pest_proximity_km": 12 },
  "graph_context": { "is_guaranteed": false, "chama_name": "Tumaini Women Savings Circle" }
}
```

---

### Commit decision

```
POST /api/farmers/:id/decision
Content-Type: application/json

{
  "decision": "Approved",
  "stance": "approve_flexible",
  "notes": "Strong 3y co-op delivery history",
  "officer": "J. Mwangi"
}
```

**Effects in Neo4j:**
1. Updates `Farmer.status` → `disbursed` / `escalated`
2. Creates `AuditEntry` node linked via `[:DECIDED]`
3. Creates `SmsMessage` node linked via `[:NOTIFIED]`

---

### Pipeline status

```
GET /api/pipeline
```

Returns `PipelineRun` nodes from the graph (CHIRPS, ICPAC, M-Pesa, etc.).

---

## USSD handler

```
POST /ussd/ussd
Content-Type: application/json

{
  "phoneNumber": "+254712345678",
  "text": "1*29845112*COOP-NVS-04*2*French Beans"
}
```

Returns **plain text** (Africa's Talking convention):

- `CON` — continue session (show menu, wait for input)
- `END` — terminate session

### Session flow

| `text` value | Response |
|--------------|----------|
| (empty) | Main menu (customized if phone recognized) |
| `1` | Registration: enter National ID |
| `1*<id>*<coop>*<acreage>*<crop>` | Creates Farmer node, ends session |
| `2*<id>` | Returns live graph score |
| `3` | Climate advisory for farmer's zone |
| `0` | Exit |

### Example — check loan status

```bash
curl -X POST http://localhost:4000/ussd/ussd \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+254712345678","text":"2*29845112"}'
```

```
END Name: Mary Wanjiku
KaLI Score: 78/100
Stance: APPROVED
Key Flag: Chama collective financial trust
```

---

## Scoring engine

`src/services/scoringEngine.js` → `calculateGraphScore(lookup)`

### Cypher query (single pass)

```cypher
MATCH (f:Farmer)
WHERE f.id = $lookup OR f.national_id = $lookup
OPTIONAL MATCH (f)-[del:DELIVERS_TO]->(coop:Cooperative)-[:OPERATES_IN]->(zone:ClimateZone)
OPTIONAL MATCH (f)-[:MEMBER_OF]->(chama:Chama)
OPTIONAL MATCH (f)<-[:GUARANTEES]-(peer:Farmer)
  WHERE peer.credit_standing = "Excellent"
OPTIONAL MATCH (f)-[:LOCATED_IN]->(plot:FarmPlot)
RETURN f, del, coop, zone, chama, plot, count(peer) > 0 AS is_guaranteed
```

### Scoring rules

| Rule | Condition | Points |
|------|-----------|--------|
| Cooperative velocity | `delivery_years >= 3` | +15 |
| Emerging co-op ties | `delivery_years >= 1` | +8 |
| No co-op history | `< 1 year` | −10 |
| Chama trust | `repayment_rate_pct >= 95` | +15 |
| Moderate Chama | `repayment_rate_pct >= 85` | +8 |
| Peer guarantee | `is_guaranteed = true` | +10 |
| Land ownership | `has_land_ownership = true` | +10 |
| Lease substitute | no land + `lease >= 24mo` | +15 |
| Co-op substitute | no land + `delivery_years >= 2` | +10 |
| No collateral | none of above | −12 |
| Chama savings streak | `chama_months >= 18` | +12 |
| Strong M-Pesa | `inflows >= 100,000 KES` | +10 |
| Thin M-Pesa | `inflows < 50,000 KES` | −5 |
| Severe drought | `SPI <= -1.5` | −15 |
| Climate dry spell | `SPI <= -1.0` | −15 |
| Below-normal rain | `SPI <= -0.5` | −6 |
| Favourable rain | `SPI >= 0.5` | +6 |
| Pest alert | `pest_km <= 15` | −10 |
| Pest warning | `pest_km < 25` | −8 |

**Baseline:** 50 · **Clamp:** 0–100

**Bands:** ≥ 65 Approve · 50–64 Refer · &lt; 50 Decline

---

## Graph data model

### Nodes

| Label | Key properties |
|-------|-------------|
| `Farmer` | `id`, `national_id`, `name`, `phone_number`, `demographic_group`, `has_land_ownership`, `status`, `requested_kes` |
| `Chama` | `id`, `name`, `repayment_rate_pct` |
| `Cooperative` | `id`, `name` |
| `ClimateZone` | `id`, `name`, `current_spi_index`, `pest_proximity_km`, `rainfall_mm_last_30d`, `advisory` |
| `FarmPlot` | `id`, `acreage` |
| `AuditEntry` | `id`, `decision`, `stance`, `notes`, `officer`, `timestamp_iso` |
| `SmsMessage` | `id`, `to`, `body`, `category`, `sent_iso` |
| `PipelineRun` | `source`, `status`, `message`, `last_run_iso` |

### Relationships

| Type | From → To | Properties |
|------|-----------|------------|
| `MEMBER_OF` | Farmer → Chama | — |
| `DELIVERS_TO` | Farmer → Cooperative | `delivery_years`, `volume_tons` |
| `OPERATES_IN` | Cooperative → ClimateZone | — |
| `GUARANTEES` | Farmer → Farmer | — |
| `LOCATED_IN` | Farmer → FarmPlot | — |
| `DECIDED` | Farmer → AuditEntry | `at` |
| `NOTIFIED` | Farmer → SmsMessage | — |

### Topology diagram

```
(:Chama {repayment_rate_pct: 96.5})
         ▲
         │ [:MEMBER_OF]
         │
(:Farmer) ◄──[:GUARANTEES]── (:Farmer {credit_standing: "Excellent"})
    │
    ├──[:DELIVERS_TO {delivery_years: 3}]──► (:Cooperative)
    │                                              │
    │ [:LOCATED_IN]                                │ [:OPERATES_IN]
    ▼                                              ▼
(:FarmPlot)                              (:ClimateZone {current_spi_index: -1.2})
```

---

## Seeding

```bash
# From repo root
npm run neo4j:seed

# Or directly
cd backend && npm run seed
```

Reads `../database/seed.cypher` and executes each statement sequentially.

### Seeded data

- **6 climate zones** (KE-RIFT-04, KE-NE-01, etc.) with SPI and pest data
- **7 cooperatives** linked to zones
- **6 chamas** with repayment rates
- **7 farmers** including archetype `39201928` (Mary Wanjiku) with peer guarantee
- **6 pipeline run** nodes

### Climate contagion test

After seeding, run in Neo4j Browser:

```cypher
MATCH (z:ClimateZone {id: "KE-RIFT-04"})
SET z.current_spi_index = -2.0
```

Then `GET /api/scorecard/F-1042` — score drops for all farmers in that zone path.

---

## Decision workflow

```
POST /api/farmers/:id/decision
        │
        ▼
┌─────────────────────────────────────────┐
│ 1. MATCH Farmer by id or national_id    │
│ 2. SET status, last_decision, notes     │
│ 3. CREATE AuditEntry                    │
│ 4. CREATE (Farmer)-[:DECIDED]->(Audit)  │
│ 5. CREATE SmsMessage with body          │
│ 6. CREATE (Farmer)-[:NOTIFIED]->(SMS)   │
└─────────────────────────────────────────┘
        │
        ▼
Status map: Approved → disbursed · Referred/Declined → escalated
```

SMS body template:

```
KaLI Rating update. Approved. Strong 3y co-op delivery history
```

*(No real telco dispatch yet — graph node only.)*

---

## Error handling

- Neo4j connection failure on startup → warning logged, server still starts
- Unknown farmer on scorecard → `404 { error: "Farmer not tracked in agricultural network" }`
- USSD errors → `END System temporarily unavailable. Try again later.`
- All controller errors → `500 { error: message }`

---

## Development tips

### Watch mode

```bash
npm run dev    # node --watch server.js
```

### Query farmers in Neo4j Browser

```cypher
MATCH (f:Farmer)-[:DELIVERS_TO]->(c:Cooperative)-[:OPERATES_IN]->(z:ClimateZone)
RETURN f.name, c.name, z.current_spi_index
```

### Add a new farmer via Cypher

```cypher
MERGE (f:Farmer {id: "F-2001"})
SET f.national_id = "12345678",
    f.name = "Test Farmer",
    f.phone_number = "+254700000000",
    f.demographic_group = "Youth",
    f.status = "ready_for_review"
```

### Production considerations

- Use Neo4j Aura or managed instance with TLS (`neo4j+s://`)
- Add authentication middleware on REST routes
- Rate-limit USSD endpoint
- Connect SMS `SmsMessage` creation to Africa's Talking / Safaricom gateway
- Schedule Python worker to update `ClimateZone` nodes from CHIRPS/ICPAC feeds

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with `--watch` (auto-restart on file change) |
| `npm start` | Production start |
| `npm run seed` | Execute `database/seed.cypher` |

---

## Related docs

- [../README.md](../README.md) — Project overview and quick start
- [../frontend/README.md](../frontend/README.md) — Officer web app and API client
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) — Graph topology reference
