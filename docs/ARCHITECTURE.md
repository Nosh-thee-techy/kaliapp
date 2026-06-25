# KaLI — Graph-Native Architecture

> **Note:** This document is the high-level architecture reference. For setup and folder layouts, see [README.md](../README.md), [frontend/README.md](../frontend/README.md), and [backend/README.md](../backend/README.md).

KaLI evaluates **Network Resilience**, not isolated spreadsheet rows. The platform is built around **Neo4j** as the single source of truth for farmers, cooperatives, chamas, climate zones, and the relationships between them.

## System overview

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│  Farmer USSD/SMS    │     │   backend (Express)      │     │  Officer Web App    │
│  /farmer simulator  │────►│   neo4j-driver + Cypher  │◄────│  TanStack Start     │
│  POST /ussd/ussd    │     │   scoringEngine.js       │     │  /dashboard         │
└─────────────────────┘     └────────────┬─────────────┘     │  /scorecard/:id     │
                                         │                    └─────────────────────┘
                                         ▼
                              ┌──────────────────────┐
                              │      Neo4j 5.x       │
                              │  Farmer ──► Chama    │
                              │    │         Coop    │
                              │    └──► ClimateZone  │
                              └──────────────────────┘
```

## Graph topology (truth model)

| Node | Purpose |
|------|---------|
| `Farmer` | Applicant profile, tenure, cashflow, status |
| `Chama` | Social collateral — group repayment rate |
| `Cooperative` | Supply-chain hub — delivery history |
| `ClimateZone` | SPI, rainfall, pest proximity (climate contagion) |
| `FarmPlot` | Acreage linked to farmer |
| `AuditEntry` / `SmsMessage` | Decision journal + outbound notifications |

| Relationship | Meaning |
|--------------|---------|
| `MEMBER_OF` | Farmer → Chama |
| `DELIVERS_TO` | Farmer → Cooperative (delivery_years, volume) |
| `OPERATES_IN` | Cooperative → ClimateZone |
| `GUARANTEES` | Peer Farmer → Farmer (trust propagation) |
| `LOCATED_IN` | Farmer → FarmPlot |
| `DECIDED` / `NOTIFIED` | Post-underwriting audit trail |

## Scoring layers (Cypher traversal)

One query in `backend/src/services/scoringEngine.js` walks:

```cypher
MATCH (f:Farmer) WHERE f.id = $lookup OR f.national_id = $lookup
OPTIONAL MATCH (f)-[del:DELIVERS_TO]->(coop)-[:OPERATES_IN]->(zone)
OPTIONAL MATCH (f)-[:MEMBER_OF]->(chama)
OPTIONAL MATCH (f)<-[:GUARANTEES]-(peer:Farmer {credit_standing: "Excellent"})
```

| Layer | Rule | Points |
|-------|------|--------|
| A — Social collateral | Chama repayment ≥ 95% | +15 |
| B — Peer guarantee | `[:GUARANTEES]` from Excellent peer | +10 |
| C — Climate contagion | Zone SPI ≤ −1.0 | −15 |
| Asset substitute | No land + lease ≥ 24mo or co-op ≥ 2y | +10–15 |

## API contracts

Base URL: `http://localhost:4000` (see `.env.example`)

| Method | Path | Consumer |
|--------|------|----------|
| `GET` | `/api/health` | Ops / startup check |
| `GET` | `/api/farmers` | Dashboard queue |
| `GET` | `/api/scorecard/:id` | Scorecard page |
| `POST` | `/api/farmers/:id/decision` | Commit stance + SMS |
| `GET` | `/api/pipeline` | Logs / sync console |
| `POST` | `/ussd/ussd` | Telco gateway (plain text) |

## Climate contagion demo

Update a zone SPI in Neo4j Browser — every farmer connected via `DELIVERS_TO → OPERATES_IN` inherits the new risk on the next scorecard load:

```cypher
MATCH (z:ClimateZone {id: "KE-RIFT-04"})
SET z.current_spi_index = -2.0
```

No per-farmer file updates required.
