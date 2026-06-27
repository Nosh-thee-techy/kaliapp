# Neo4j Integration Document
**Kenya AI Challenge — Neo4j Track**

> Recommended length: 1 page. Maximum: 2 pages.  
> **Do not include passwords, API keys, credentials, or connection strings in submissions.**

| Field | Value |
|-------|-------|
| **Project Name** | KaLI — Kenya Agri Lending Intelligence |
| **Team Name** | *[Team Technitians]* |
| **Selected Challenge Brief** | Climate-smart, inclusive agricultural credit for East African smallholders (graph-native underwriting & field-verified advisory) |
| **Prototype** | https://kali-lending.vercel.app |
| **Source** | https://github.com/Nosh-thee-techy/kaliapp |
| **Deep technical reference** | `docs/NEO4J_GRAPH_ENGINE.md` (appendix — not part of this submission) |

---

## 1. How We Used Neo4j

Neo4j is the **core underwriting database** for KaLI — not a cache or analytics sidecar. Every credit score, loan queue entry, officer decision, and farmer readiness profile is driven by **graph traversal** in Neo4j Aura.

**What Neo4j stores:** Farmers, cooperatives, climate zones, chamas (savings groups), farm plots, audit decisions, SMS notifications, climate alerts, farmer action plans, and field verifications.

**What Neo4j connects:** A farmer is linked to their cooperative delivery history, chama repayment behaviour, peer guarantors, climate zone (via co-op), and optional farm plot. Ground-truth nodes link macro advisories → farmer actions → agronomist verification → credit bonus.

**What Neo4j retrieves:** A single Cypher query walks `Farmer → Cooperative → ClimateZone`, plus `MEMBER_OF → Chama`, `GUARANTEES` peers, and `LOCATED_IN → FarmPlot`. The backend turns path properties into an explainable 0–100 score with named drivers and drags.

**What Neo4j helps the system reason over:** (1) **Network resilience** — co-op tenure and chama trust substitute for land collateral; (2) **Climate contagion** — updating one `ClimateZone` node changes risk for all farmers on that hub; (3) **Ground-truth credit** — mitigation bonus (+8) applies only when an active zone alert exists *and* a `FieldVerification` confirms the farmer acted.

**User-facing surfaces powered by Neo4j:** Officer dashboard & scorecards, farmer My Readiness portal, agronomist field queue, East Africa risk map, USSD ingest, and audit/SMS trail.

---

## 2. Why Neo4j Matters

Smallholder credit in Kenya/Uganda is a **relationship problem**, not a spreadsheet problem. A farmer’s risk depends on who they deliver to, who guarantees them, their group savings record, and shared climate stress in their cooperative’s zone — data that lives naturally as a **graph**.

Relational databases would require multiple JOINs and duplicated climate fields per farmer. With Neo4j:

- **One zone update** (SPI, pest proximity, advisory) propagates to every connected farmer through `Cooperative → OPERATES_IN → ClimateZone` — no per-farmer ETL.
- **Peer guarantees** and **chama membership** are first-class edges, queried in one pass alongside supply-chain history.
- **Explainability** is built in: each score driver maps to a traversable path (e.g. “Chama repayment 96% → +15”), which officers see on scorecards and farmers receive as SMS in Kiswahili/Luganda.
- **Field verification** closes the loop between macro climate advice and individual credit — edges `COMPLETED` and `CONFIRMS` prevent self-reported checkboxes alone from moving scores.

Neo4j improves **decision quality** (fairer scores for leaseholding women farmers), **risk visibility** (live map pins coloured by graph score), and **advisory quality** (readiness actions synced from the same graph context that drives underwriting).

---

## 3. Graph Model

### Main Nodes

| Node type | What it represents |
|-----------|-------------------|
| `Farmer` | Smallholder applicant — tenure, M-Pesa inflows, crop, status, demographic segment |
| `Cooperative` | KTDA society / dairy union / SACCO hub — supply-chain anchor |
| `ClimateZone` | Shared climate hub — SPI, rainfall, pest proximity, active advisory |
| `Chama` | Savings group — social collateral & repayment rate |
| `FarmPlot` | Land acreage linked to farmer |
| `ClimateAlert` | Active macro advisory for a zone (ground-truth loop) |
| `ActionItem` / `ActionPlan` | Farmer mitigation steps responding to advisory |
| `FieldVerification` | Agronomist on-farm attestation |
| `AuditEntry` / `SmsMessage` | Officer decisions & farmer notifications |
| `Officer` | Branch loan officer (auth) |

### Main Relationships

| Relationship | What it means |
|--------------|---------------|
| `DELIVERS_TO` | Farmer → Cooperative (delivery years, volume) |
| `OPERATES_IN` | Cooperative → ClimateZone (climate contagion path) |
| `MEMBER_OF` | Farmer → Chama (group savings / repayment) |
| `GUARANTEES` | Peer Farmer → Farmer (trust propagation) |
| `LOCATED_IN` | Farmer → FarmPlot |
| `AFFECTS` | ClimateAlert → ClimateZone |
| `COMPLETED` | Farmer self-reported action done |
| `CONFIRMS` | FieldVerification → ActionItem (ground truth) |
| `DECIDED` / `NOTIFIED` | Audit trail & SMS history |

**Optional properties (examples):** `Farmer.mobile_money_inflows_kes`, `Farmer.has_land_ownership`, `ClimateZone.current_spi_index`, `DELIVERS_TO.delivery_years`, `Chama.repayment_rate_pct`, `FieldVerification.verified_iso`

---

## 4. Architecture / Integration

| | |
|--|--|
| **Architecture flow** | Farmer USSD / My Readiness / Officer web app → **Express API (Render)** → **Neo4j Aura** → Cypher scoring & writes → JSON scorecard, queue, map pins, SMS text returned to UI |
| **Integration status** | **Fully working** (production: Vercel frontend, Render backend, Neo4j Aura; live health check reports `engine: neo4j`) |
| **Short explanation** | Neo4j Aura is the single source of truth. `scoringEngine.js` runs single-pass Cypher traversal; `growAsiaScoring.js` adds weighted in-graph supply/social/climate scores; `groundTruthService.js` writes verification edges that adjust credit. Climate pipeline updates zone nodes from Open-Meteo. Featherless AI generates farmer SMS from graph context — LLM does not replace the graph score. **Incomplete/simulated:** live M-Pesa ingestion, Africa's Talking production SMS, Masumi disbursement (stub), satellite imagery. |

```
[Farmer UI / USSD] ──► [KaLI API] ──► [Neo4j Aura]
                         │                │
[Officer Dashboard] ◄────┘                ├── ClimateZone (SPI, advisory)
[Agronomist Field] ◄─────────────────────├── Farmer → Coop → Zone paths
[Scorecard + Map]  ◄─────────────────────┘── Audit & verification edges
```

---

## 5. Current Status

| | |
|--|--|
| **Working** | Neo4j Aura connected in production; graph seed (Kenya + Uganda zones, 15+ farmers); single-pass Cypher credit scoring with drivers/drags; unified Grow Asia + graph score; officer JWT auth stored as `Officer` nodes; dashboard queue & explainable scorecards; My Readiness portal (KTDA lookup); agronomist ML visit queue & field verification (+8 mitigation bonus); climate zone sync & map pins; USSD backend ingest; in-app graph visualisation (`/graph`); SSE map updates |
| **Incomplete or simulated** | M-Pesa cashflow is seeded, not live; SMS/USSD via Africa's Talking sandbox; Masumi disbursement stub; no live satellite/soil APIs; Featherless explainability requires API key in production env |
| **Next improvement** | Live cooperative roster ingest (KTDA API); production telco SMS; scheduled climate sync on Render; IP-allowlisted Aura hardening; logistic regression retrained on real portfolio outcomes |

---

**Before submitting:** Ensure this document matches the prototype (https://kali-lending.vercel.app), GitHub source, and Neo4j technical proof video (live Cypher in Aura Browser + scorecard driver walkthrough).

*Template: Kenya AI Challenge — Neo4j Track. KaLI team submission.*
