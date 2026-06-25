# KaLI Frontend — Officer Web App & Farmer Simulator

The frontend is a **TanStack Start** full-stack React application serving two distinct user interfaces:

1. **Officer Web Dashboard** — Low-bandwidth, data-dense underwriting workspace for rural branch officers
2. **Farmer Phone Simulator** — Browser-based USSD/SMS experience for testing the farmer-side pipeline

---

## Table of contents

- [Directory structure](#directory-structure)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Routes & pages](#routes--pages)
- [Key modules](#key-modules)
- [Backend integration](#backend-integration)
- [Internationalization](#internationalization)
- [UI components](#ui-components)
- [Mock fallbacks](#mock-fallbacks)
- [Build & deploy](#build--deploy)

---

## Directory structure

```
frontend/
├── README.md                 ← This file
├── vite.config.ts            ← Vite + TanStack Start + Nitro plugins
├── tsconfig.json             ← TypeScript config (@/* path alias)
├── components.json           ← shadcn/ui configuration
│
└── src/
    ├── routes/               ← File-based routing (TanStack Router)
    │   ├── __root.tsx        ← App shell, sidebar nav, i18n provider
    │   ├── index.tsx         ← Landing / marketing page
    │   ├── auth.tsx          ← Officer sign-in (mock)
    │   ├── dashboard.tsx     ← Branch portfolio queue ★
    │   ├── scorecard.$id.tsx ← Explanatory underwriting scorecard ★
    │   ├── farmers.$id.tsx   ← Full farmer profile (mock charts)
    │   ├── farmer.tsx        ← USSD phone simulator
    │   ├── logs.tsx          ← Pipeline status + audit ledger
    │   ├── api/
    │   │   └── climate.ts    ← Stub SSR route (mock pipeline fallback)
    │   └── README.md         ← TanStack routing conventions
    │
    ├── components/
    │   └── ui/               ← shadcn/ui primitives (40+ components)
    │
    ├── lib/
    │   ├── api-core.ts       ← Typed HTTP client for backend API ★
    │   ├── mock-data.ts      ← Static fallback data + client-side scoring
    │   ├── i18n.tsx          ← EN / SW / FR translations
    │   ├── utils.ts          ← cn() Tailwind merge helper
    │   ├── error-capture.ts  ← SSR error hook
    │   └── error-page.ts     ← HTML error page renderer
    │
    ├── hooks/
    │   └── use-mobile.tsx    ← Responsive breakpoint hook
    │
    ├── router.tsx            ← Router factory
    ├── routeTree.gen.ts      ← Auto-generated route tree (do not edit)
    ├── server.ts             ← SSR entry (error wrapper)
    ├── start.ts              ← TanStack Start middleware
    └── styles.css            ← Tailwind theme tokens (forest/agri palette)
```

★ = Connected to Neo4j backend when `VITE_API_CORE_URL` is reachable

---

## Tech stack

| Package | Purpose |
|---------|---------|
| `@tanstack/react-start` | Full-stack React framework (SSR + API routes) |
| `@tanstack/react-router` | File-based routing with loaders |
| `@tanstack/react-query` | Server state (available, lightly used) |
| `tailwindcss` v4 | Utility-first styling |
| `@radix-ui/*` | Accessible UI primitives via shadcn |
| `recharts` | Dashboard and profile charts |
| `lucide-react` | Icon set |
| `react-hook-form` + `zod` | Form validation (auth page) |
| `@fontsource/inter` + `fraunces` | Body + display fonts |

---

## Getting started

From the **repository root**:

```bash
bun install
cp .env.example .env

# Ensure backend is running (see backend/README.md)
npm run dev:api

# Start frontend
bun run dev
```

App runs at [http://localhost:5173](http://localhost:5173).

### Vite config note

The frontend `vite.config.ts` sets `root` to the `frontend/` directory so paths resolve correctly when invoked from the monorepo root via:

```bash
vite dev --config frontend/vite.config.ts
```

---

## Routes & pages

TanStack Start uses **file-based routing**. Each `.tsx` file in `src/routes/` maps to a URL.

| Route file | URL | Audience | Data source |
|------------|-----|----------|-------------|
| `index.tsx` | `/` | Public | Mock stats |
| `auth.tsx` | `/auth` | Officer | Mock auth |
| `dashboard.tsx` | `/dashboard` | Officer | **Neo4j** queue (+ mock fallback) |
| `scorecard.$id.tsx` | `/scorecard/:id` | Officer | **Neo4j** graph score |
| `farmers.$id.tsx` | `/farmers/:id` | Officer | Mock + generated charts |
| `farmer.tsx` | `/farmer` | Farmer | Client-side USSD sim |
| `logs.tsx` | `/logs` | Officer | Partial API + mock tables |
| `api/climate.ts` | `/api/climate` | Internal | Mock pipeline stub |

### Officer dashboard (`/dashboard`)

- Live application feed from `GET /api/farmers`
- Segment tabs: All · Women · Youth · PWD · General
- Status filters: Awaiting Climate · Ready for Review · Escalated · Disbursed
- Search by National ID, cooperative code, phone, or name
- Portfolio charts (weekly trend, segment pie, rainfall) — **still mock**

### Scorecard (`/scorecard/:id`)

Loader calls `fetchGraphScorecard(id)` which hits `GET /api/scorecard/:id`.

Displays:
- Graph-computed score (0–100) with Approve / Refer / Decline band
- Drivers (green) and Drags (red) with point values
- Climate context sidebar (SPI, rainfall, pest proximity)
- Asset-substitute banner when triggered
- Decision post matrix → `POST /api/farmers/:id/decision`

Accepts lookup by KaLI ID (`F-1042`) or national ID (`29845112`).

### Farmer simulator (`/farmer`)

Browser mock of a feature phone running USSD `*483*100#`.

**Not yet wired** to `POST /ussd/ussd` on the backend. Sessions run entirely in React state. SMS inbox reads from static `mock-data.ts`.

---

## Key modules

### `src/lib/api-core.ts`

Typed HTTP client for the backend graph API.

```typescript
import { fetchGraphFarmers, fetchGraphScorecard, postGraphDecision } from "@/lib/api-core";

const farmers = await fetchGraphFarmers({ segment: "Women" });
const score = await fetchGraphScorecard("F-1042");
await postGraphDecision("F-1042", {
  decision: "Approved",
  stance: "approve_flexible",
  notes: "Strong co-op history",
});
```

Base URL from `VITE_API_CORE_URL` (default `http://localhost:4000`).

### `src/lib/mock-data.ts`

Static fallback when backend is offline:

- `farmers[]` — 6 demo applicants
- `climateSignals{}` — zone SPI/rainfall/pest data
- `computeScore()` — client-side scoring (superseded by graph engine when live)
- `auditLog[]`, `smsOutbox[]`, `pipelineRuns[]`

### `src/lib/i18n.tsx`

React context providing translations for English, Kiswahili, and French. Used on dashboard and auth pages.

```typescript
const { t, lang, setLang } = useI18n();
t("dashboard.greeting"); // "Hello, Jane"
```

---

## Backend integration

```
frontend/src/lib/api-core.ts
        │
        │  HTTP (JSON)
        ▼
backend/server.js  →  Neo4j
```

| Frontend call | Backend endpoint |
|---------------|------------------|
| `fetchGraphFarmers()` | `GET /api/farmers` |
| `fetchGraphScorecard(id)` | `GET /api/scorecard/:id` |
| `postGraphDecision(id, body)` | `POST /api/farmers/:id/decision` |
| `fetchGraphHealth()` | `GET /api/health` |
| `postUssdSession(body)` | `POST /ussd/ussd` (not wired in UI yet) |
| `API_CORE_BASE + /api/pipeline` | `GET /api/pipeline` |

When the backend is down, dashboard and scorecard gracefully degrade to mock data with visible indicators.

---

## Internationalization

Supported languages (auth page language selector):

| Code | Language |
|------|----------|
| `en` | English |
| `sw` | Kiswahili |
| `fr` | Français |

Add keys in `src/lib/i18n.tsx` under `dictionaries[lang]`.

---

## UI components

Built with [shadcn/ui](https://ui.shadcn.com). Components live in `src/components/ui/`.

Add new components from the repo root:

```bash
cd frontend
npx shadcn@latest add <component-name>
```

Configuration in `components.json` points to the `@/` alias → `src/`.

### Design tokens

Custom agri/forest theme in `src/styles.css`:

- `--primary` — deep forest green
- `--accent` — harvest gold
- `--success`, `--warning`, `--destructive` — status semantics
- `font-display` — Fraunces serif for headings
- Utility classes: `bg-gradient-forest`, `shadow-glow`, `texture-leaf`

---

## Mock fallbacks

| Component | Mock when |
|-----------|-----------|
| Dashboard queue | Backend unreachable on mount |
| Scorecard | Loader catches API error → offline fallback page |
| Dashboard charts | Always (not yet graph-derived) |
| Farmer USSD sim | Always (local state) |
| Auth | Always |
| `/logs` audit table | Always (static `auditLog`) |

---

## Build & deploy

```bash
# Production build (from repo root)
bun run build

# Preview production build
bun run preview
```

Output goes to `.output/` via Nitro. Configure deployment target in `frontend/vite.config.ts` (Nitro preset).

### Linting & formatting

```bash
bun run lint      # ESLint (scans frontend/**/*.{ts,tsx})
bun run format    # Prettier
```

---

## Routing conventions

See [src/routes/README.md](src/routes/README.md) for TanStack file naming rules:

- `index.tsx` → `/`
- `users.$id.tsx` → `/users/:id`
- `__root.tsx` → app shell (never remove `<Outlet />`)
- `routeTree.gen.ts` → auto-generated, do not edit

---

## Next integration steps

1. Wire `/farmer` simulator to `postUssdSession()` → backend USSD handler
2. Bind `/logs` audit table to Neo4j `AuditEntry` nodes
3. Replace dashboard charts with graph-derived aggregates
4. Connect `/farmers/:id` profile to `fetchGraphScorecard()`
5. Replace mock auth with real session management
