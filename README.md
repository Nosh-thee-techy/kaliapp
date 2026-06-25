# KaLI — Kenya Agri Lending Intelligence

**Climate-smart, graph-native credit scoring for smallholder farmers in East Africa.**

KaLI (Kenya Agri Lending Intelligence) helps rural loan officers underwrite agricultural micro-loans fairly and fast — without relying on land titles or formal banking history. It replaces traditional collateral with **network resilience signals**: cooperative delivery history, chama savings discipline, mobile money cashflow, peer guarantees, and live climate risk data.

The platform is split into two distinct interfaces matching real-world operational environments:

| Interface | Users | Channel | Purpose |
|-----------|-------|---------|---------|
| **Officer Web App** | Rural branch loan officers | Desktop/tablet browser | Rich, low-bandwidth dashboard for queue triage and explainable underwriting |
| **Farmer Pipeline** | Smallholder farmers (Women, Youth, PWD) | USSD + SMS on feature phones | Zero-data registration, status checks, and climate advisories |

---

## Table of contents

- [Vision & problem statement](#vision--problem-statement)
- [Repository structure](#repository-structure)
- [Architecture overview](#architecture-overview)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [User flows](#user-flows)
- [Scoring model](#scoring-model)
- [What's live vs mock](#whats-live-vs-mock)
- [Scripts reference](#scripts-reference)
- [Further reading](#further-reading)

---

## Vision & problem statement

Traditional credit models exclude smallholder farmers — especially women, youth, and persons with disabilities (PWDs) — because they lack:

- Formal banking history ("thin files")
- Immovable collateral (land titles)
- Smartphone apps or reliable internet

KaLI bridges this gap by evaluating **network resilience** in a Neo4j graph database. Instead of isolated spreadsheet rows, the system traverses relationships between farmers, chamas, cooperatives, and climate zones to produce explainable, auditable credit scores.

> **Core principle:** Credit that reads the weather, not just the wallet.

---

## Repository structure

This is a **monorepo** with clearly separated frontend and backend:

```
kaliapp/
├── README.md                      ← You are here (project overview)
├── package.json                   ← Root scripts (orchestrates frontend + backend)
├── bun.lock                       ← Frontend dependency lockfile (Bun)
├── docker-compose.neo4j.yml       ← Local Neo4j 5 container
├── .env.example                   ← Environment variable template
│
├── frontend/                      ← Officer web app + farmer USSD simulator
│   ├── README.md                  ← Frontend docs (routes, components, dev guide)
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── components.json            ← shadcn/ui config
│   └── src/
│       ├── routes/                ← TanStack Start file-based pages
│       ├── components/ui/         ← shadcn/ui component library
│       ├── lib/                   ← API client, i18n, mock fallbacks
│       ├── hooks/
│       ├── server.ts              ← SSR entry wrapper
│       └── start.ts               ← TanStack Start instance
│
├── backend/                       ← Graph-native Express API
│   ├── README.md                  ← Backend docs (API, Neo4j, scoring engine)
│   ├── server.js                  ← Express app entry
│   ├── package.json               ← Backend dependencies (npm)
│   ├── scripts/seed.js            ← Cypher seed runner
│   └── src/
│       ├── config/neo4j.js        ← Neo4j driver singleton
│       ├── services/              ← scoringEngine, farmerService
│       ├── controllers/           ← scorecard, USSD handlers
│       └── routes/                ← REST + USSD route mounts
│
├── database/
│   └── seed.cypher                ← Graph topology seed (farmers, zones, chamas)
│
└── docs/
    └── ARCHITECTURE.md              ← Graph topology & scoring layers reference
```

---

## Architecture overview

```
 [FARMER: USSD/SMS]              [NEO4J GRAPH]              [OFFICER: WEB APP]
        │                              │                            │
 1. Dial *483*100#                     │                     1. Open /dashboard
 2. Register / request credit ────────►│◄──────────────────── 2. Search queue
        │                    Farmer nodes                        │
        │                    Chama / Coop / Zone                 ▼
        │                              │                 3. /scorecard/:id
        │                              │                    Cypher traversal
        │                              │                            │
        │◄──── SMS notification ◄──────┤◄──── POST /decision ──────┘
        │                              │
```

**Data flows through a single Neo4j graph.** Farmer actions via USSD create or update nodes. Officer decisions write audit edges and SMS notification nodes. Climate zone updates cascade risk to all connected farmers automatically.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full graph topology and Cypher scoring rules.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TanStack Start, TanStack Router, TanStack Query |
| **UI** | Tailwind CSS 4, shadcn/ui (Radix), Recharts, Lucide icons |
| **Backend** | Node.js, Express 4, neo4j-driver 5 |
| **Database** | Neo4j 5 (graph — non-negotiable core) |
| **Build** | Vite 8, Nitro, TypeScript 5 |
| **Package managers** | Bun (frontend), npm (backend) |

---

## Quick start

### Prerequisites

- [Bun](https://bun.sh) (frontend)
- [Node.js 20+](https://nodejs.org) (backend)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Neo4j) — or [Neo4j Desktop](https://neo4j.com/download/)

### 1. Clone and install

```bash
git clone https://github.com/Nosh-thee-techy/kaliapp.git
cd kaliapp

# Frontend dependencies
bun install

# Backend dependencies
cd backend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Defaults work for local Docker Neo4j
```

### 3. Start Neo4j and seed the graph

```bash
npm run neo4j:up          # Docker: bolt://localhost:7687
npm run neo4j:seed        # Loads database/seed.cypher
```

Neo4j Browser: [http://localhost:7474](http://localhost:7474) — user `neo4j`, password `kali-dev-password`

### 4. Run both services

```bash
# Terminal 1 — Graph API (port 4000)
npm run dev:api

# Terminal 2 — Web app (port 5173)
npm run dev
```

### 5. Explore

| URL | Description |
|-----|-------------|
| [http://localhost:5173](http://localhost:5173) | Landing page |
| [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | Officer queue (live from Neo4j) |
| [http://localhost:5173/scorecard/F-1042](http://localhost:5173/scorecard/F-1042) | Graph scorecard for Mary Wanjiku |
| [http://localhost:5173/farmer](http://localhost:5173/farmer) | USSD phone simulator |
| [http://localhost:4000/api/health](http://localhost:4000/api/health) | Backend health check |

---

## Environment variables

| Variable | Default | Used by |
|----------|---------|---------|
| `NEO4J_URI` | `bolt://localhost:7687` | Backend |
| `NEO4J_USER` | `neo4j` | Backend |
| `NEO4J_PASSWORD` | `kali-dev-password` | Backend |
| `API_CORE_PORT` | `4000` | Backend |
| `CORS_ORIGIN` | `http://localhost:5173` | Backend |
| `VITE_API_CORE_URL` | `http://localhost:4000` | Frontend |

Copy `.env.example` to `.env` at the repo root. The backend loads it via `dotenv`. The frontend reads `VITE_*` variables at build time.

---

## User flows

### Loan officer flow

```
Authenticate → Monitor queue → Search by ID → Open scorecard
    → Review drivers/drags → Select stance → Commit decision → SMS dispatched
```

1. Sign in at `/auth` (mock — redirects to dashboard)
2. Open `/dashboard`, filter by segment (Women / Youth / PWD / General)
3. Click **Assess** on a farmer row → `/scorecard/:id`
4. Review graph-computed score, drivers, drags, climate context
5. Choose stance (Approve Flexible / Refer / Decline), add notes, commit
6. Decision writes to Neo4j; SMS node created for farmer notification

### Farmer flow

```
Dial *483*100# → Navigate menu → Enter coop code & acreage
    → Session ends → SMS breakdown received
```

1. Open `/farmer` (browser simulator) or dial via real USSD gateway
2. Register or request input credit via keypad menus
3. Application appears in officer queue as `awaiting_climate` or `ready_for_review`
4. After officer decision, farmer receives SMS with rating and stance

---

## Scoring model

Scores are computed via **single-pass Cypher graph traversal** in `backend/src/services/scoringEngine.js`.

| Signal | Source in graph | Effect |
|--------|-----------------|--------|
| Cooperative delivery ≥ 3 years | `[:DELIVERS_TO]` edge | +15 drivers |
| Chama repayment ≥ 95% | `[:MEMBER_OF]` → Chama node | +15 drivers |
| Peer guarantee | `<-[:GUARANTEES]-` Excellent farmer | +10 drivers |
| No land title + long lease / co-op tenure | Farmer properties | Asset substitute +10–15 |
| Zone SPI ≤ −1.0 | `Coop → ClimateZone` path | −15 drags (climate contagion) |
| Pest within 15 km | ClimateZone property | −10 drags |

**Bands:** ≥ 65 Approve · 50–64 Refer · &lt; 50 Decline

---

## What's live vs mock

| Feature | Status |
|---------|--------|
| Dashboard queue table | **Live** (Neo4j via backend API) |
| Scorecard scoring + drivers/drags | **Live** (Cypher traversal) |
| Decision commit + graph audit write | **Live** (Neo4j nodes) |
| Officer authentication | Mock (no real session) |
| Farmer USSD simulator UI | Mock (client-side only; backend USSD endpoint exists but UI not wired) |
| Farmer profile `/farmers/:id` | Mock (static data + generated charts) |
| Dashboard charts (weekly trend, pie) | Mock (synthetic data) |
| Audit ledger UI on `/logs` | Mock (static table; API fetch exists but UI not bound) |
| SMS delivery to real phones | Mock (graph node only; no telco gateway) |
| CHIRPS / ICPAC / M-Pesa pipelines | Mock (seeded values in `seed.cypher`) |

The frontend falls back to `frontend/src/lib/mock-data.ts` when the backend is unreachable.

---

## Scripts reference

Run from the **repository root**:

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Start frontend dev server |
| `dev:api` | `npm run dev:api` | Start backend Express API |
| `neo4j:up` | `npm run neo4j:up` | Start Neo4j Docker container |
| `neo4j:seed` | `npm run neo4j:seed` | Seed graph from `database/seed.cypher` |
| `build` | `bun run build` | Production frontend build |
| `lint` | `bun run lint` | ESLint across frontend |
| `format` | `bun run format` | Prettier format |

---

## Further reading

- [frontend/README.md](frontend/README.md) — Routes, components, i18n, API client, dev guide
- [backend/README.md](backend/README.md) — REST/USSD API, Neo4j config, scoring engine, seeding
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Graph topology, relationships, climate contagion

---

## Target users

**Persona A — Rural Loan Officer:** Operates in low-resource branches with intermittent internet. Needs rapid, defensible underwriting without multi-week field verification.

**Persona B — Smallholder Farmer (Women, Youth, PWDs):** May rely on leased land, chamas, and cooperative ties. Needs a transparent, fair credit pathway via feature phone.

---

## License

Private — all rights reserved.
