# KaLI — Kenya Agri Lending Intelligence: Final Sprint Status

> **Sprint:** June 27–28, Nairobi · **Track:** Mercy Corps AgriFin (AFRACA) · **Prize target:** 1st place (KES 60,000)

---

## 1. CHALLENGE REQUIREMENTS (AFRACA)

### The problem AFRACA wants solved
Smallholder farmers in Kenya (and across Africa) are **credit invisible** — no formal banking history, no land titles, no collateral. Traditional credit scoring excludes them. AFRACA's 100+ member institutions (central banks, agri development banks, MFIs) need **alternative credit assessment models** that use non-traditional data to evaluate creditworthiness fairly and accurately.

### What judges evaluate (inferred from brief + FAQ)
1. **Problem fit** — Does the solution directly address a real gap in agricultural finance for smallholders?
2. **Working product** — "Not a slide deck." Must demo core value clearly to a real user.
3. **Technical sophistication** — AI/ML, graph DB, alternative data sources actually integrated.
4. **Innovation edge** — How is this different from Tala, Branch, FarmDrive, Apollo Agriculture?
5. **Impact & scale** — Reaches women, youth, PWDs. Path to real deployment.
6. **Partner tech usage** — Neo4j, Featherless (LLM), Masumi (payments), Lovable.

### What position 1 requires
- A **flawless live demo** that works on a laptop with potentially spotty internet
- A **compelling narrative** — problem → solution → impact, told in under 5 minutes
- **Tangible AI** — not just a database query wrapped in a UI
- **Clear AFRACA fit** — they are the stakeholder; the pitch must speak their language
- **Something no other team will have** — our graph-native approach is that edge

---

## 2. WHAT WE HAVE (GOOD)

### Live and working
- **Neo4j graph database** — 7 farmers, 6 chamas, 7 co-ops, 6 climate zones, 3 audit entries, 6 pipeline runs, 2 officers
- **Scoring engine** — Cypher traversal with ~20 point rules (co-op delivery, chama repayment, peer guarantees, land tenure, M-Pesa cashflow, SPI drought, pest proximity). Works live.
- **Officer dashboard** — Queue with status/segment filters, keyboard nav, stat cards, portfolio charts
- **Scorecard page** — Full driver/drag breakdown, climate context, decision form (approve/refer/decline)
- **Decision commit** — Writes to Neo4j: status + AuditEntry + SmsMessage node
- **Auth system** — JWT login/register, Neo4j-backed, bcrypt hashed
- **Climate pipeline** — Randomized jitter simulates CHIRPS/ICPAC sync, promotes `awaiting_climate` farmers
- **Farmer profile** — Score gauge, quick facts, charts, climate window, SMS trail
- **USSD handler** — Full *483*100# flow for registration, loan status, climate advisory
- **Pipeline/audit logs** — Live table with sync trigger button
- **Landing page** — Marketing hero, pillars, stats
- **Farmer phone simulator** — On-screen feature phone with keypad
- **Language switching** — EN / SW / FR
- **SSR, error boundaries, Sadness page** — Production-grade resilience
- **Neo4j partner tech used** — This is our core differentiator

### Mock / stub but presentable
- **SMS** — Stubs to console, nodes created in Neo4j (can demo the concept)
- **Climate data** — Random jitter from seeded values (looks real in demo)
- **M-Pesa charts** — Synthetic sinusoidal data from a single annual number
- **Dashboard charts** — Weekly trend + pie from live Neo4j aggregation
- **Farmer profile charts** — Cashflow, yield, repayment — synthetic but visually credible

---

## 3. GAPS / WEAKNESSES (BRUTAL)

### Critical — will lose us the competition if not fixed

| Issue | Severity | Fix |
|-------|----------|-----|
| **No AI/ML model anywhere** — scoring = deterministic Cypher rules + JS if/else. Judges want AI. | **DEATH SENTENCE** | Add a Featherless-hosted LLM that generates a natural-language credit narrative and/or risk assessment from the graph data. Or train a lightweight ML model using historical farmer data. |
| **No Masumi integration** — Masumi is a partner/sponsor. Zero usage. Other teams will use it. | **LOSE POINTS** | Integrate Masumi payment network for loan disbursement or agent-to-agent credit scoring payments. Even a stub with their testnet. |
| **No Featherless LLM usage** — Second partner tech untouched. | **LOSE POINTS** | Use Featherless to deploy an open-source LLM that answers officer questions or generates farmer-facing credit explanations in Swahili. |
| **"Alternative data" is seeded, not connected** — No real API integration with M-Pesa, CHIRPS, ICPAC, KALRO, or any live data source. | **WEAKENS CREDIBILITY** | At minimum add a live data ingestion demo. For a real integration, connect to a free weather API (Open-Meteo) as a proxy for ICPAC. |
| **Mock scoring diverges from backend** — Client-side `computeScore()` uses different weights. If Neo4j goes down during demo, scores change. | **DEMO RISK** | Align mock scoring with backend, or eliminate the divergence entirely. |
| **No officer onboarding / user management** — Single hardcoded seed. No multi-branch, no roles. | **INCOMPLETE** | Add branch-based officer registration and basic role support. |
| **SMS is stub only** — "SMS farmer" button on profile page is a dead link. | **BAD DEMO MOMENT** | Wire the button to at least create an SmsMessage node and show it in the trail. |
| **No logout that works** — Clicking logout redirects to `/auth` which immediately redirects back to dashboard. | **LOOKS BUGGY** | Fix the session clearing + redirect logic. |

### Important — should fix before sprint

| Issue | Fix |
|-------|-----|
| NPM Run seed doesn't work cleanly — need to clear Neo4j data before reseeding | Add `MATCH (n) DETACH DELETE n` as a pre-seed step or `--force` flag |
| Search is client-side only — won't scale | Add a `?q=` server-side search endpoint for farmers |
| No pagination on any list endpoint | Add `LIMIT 50` + `SKIP` to farmer/audit/SMS queries |
| Two farmers named "Mary Wanjiku" with same phone (39201928 + F-1042) | Deduplicate or differentiate clearly |
| Asset-substitute logic differs between mock and backend | Standardise to backend logic |
| `GET /api/sms` is public (no JWT) — exposes farmer phone numbers | Add JWT protection |
| No HTTPS, no CORS hardening, no rate limiting | Dev-only acceptable but mention in pitch |
| Settings icon in sidebar links to nothing | Either implement or remove |
| Notification bell has no logic | Either implement or remove |
| Forgot password link is `#` | Either implement or remove |

### Cosmetic / polish
| Issue |
|-------|
| The "Archetype" farmer (39201928) and F-1042 are both Mary Wanjiku — confusing |
| Farmer profile "SMS farmer" link has no onClick |
| Dashboard mock fallback shows bare "Offline mock mode" text |
| Console warning about `vite-tsconfig-paths` being redundant |

---

## 4. WIN STRATEGY

### Core pitch narrative (5-minute demo flow)
1. **The problem** (30s): 350M unbanked Africans. Smallholder farmers excluded from credit because they lack formal banking history and land titles. AFRACA's 100+ member institutions need a new way to assess creditworthiness.
2. **Our insight** (30s): These farmers are not "high risk" — they're **unscored**. They have rich networks: chama savings groups, cooperative delivery records, M-Pesa cashflow, peer guarantees. All of this lives in relationships, not spreadsheets.
3. **Graph-native scoring** (60s): Live demo — search a farmer, show the graph scorecard. Explain how Cypher traverses Farmer → Chama → Coop → ClimateZone to build a network resilience score. No traditional data needed.
4. **AI layer** (if implemented): Show Featherless-hosted LLM generating a farmer risk narrative in real time from the graph data. "This farmer has 3 years of consistent co-op delivery, strong chama repayment at 96.5%, but faces climate drag from Naivasha's SPI of -1.2."
5. **Climate intelligence** (30s): Show the climate pipeline — sync CHIRPS/ICPAC data, watch drought risk cascade through the graph to every connected farmer automatically.
6. **USSD access** (30s): Show the farmer phone simulator — register, check status, get climate advisory — all on a feature phone. No smartphone needed.
7. **Impact** (30s): Currently serving women (4/7 farmers), youth (1), PWD (1). Designed for AFRACA member institutions to deploy with their existing cooperative networks.

### What makes us different from competitors
- **Tala / Branch**: Smartphone-only, SMS-based data extraction, urban bias. We target rural feature-phone farmers via USSD.
- **FarmDrive**: Same problem space — but they use ML on agronomic data. We use **graph network topology** — relationships as collateral.
- **Apollo Agriculture**: Input financing (seeds/fertilizer). We provide cash credit for any use.
- **Traditional credit bureaus**: Require formal banking history. Our graph works with zero bureau data.

### Our unique edge (hammer in the pitch)
> "Every other credit scoring model treats farmers as isolated data points in a spreadsheet row. We treat them as **nodes in a network**. When you evaluate a farmer, you're evaluating their community, their cooperative, their climate zone — all in a single Cypher query. That's not just different AI. It's a different philosophy of risk."

### Partner tech talking points
| Partner | How we use it | Why it matters |
|---------|--------------|----------------|
| **Neo4j** | Core graph database. Every farmer, chama, cooperative, climate zone is a node. Scoring = Cypher path traversal. | Non-negotiable foundation. Graph is the product. |
| **Featherless** *(needs implementation)* | Host a fine-tuned LLM (Llama 3 or Mistral) that generates farmer risk narratives from graph data. | Adds the "AI" to "AI Challenge." Converts graph → natural language. |
| **Masumi** *(needs implementation)* | Disburse approved loans via Masumi payment network. Agent-to-agent credit payments. | Shows real financial pipeline. Partner visibility. |

### Last 24h before sprint — what to build

**MUST DO (will lose if missing):**
1. ⚠️ Featherless LLM integration — even a basic call: "Given this farmer data, generate a 3-sentence credit assessment in simple English/Swahili"
2. ⚠️ Masumi payment stub — at minimum show "Disburse via Masumi" button on approved decisions

**SHOULD DO (will improve score):**
3. Connect Open-Meteo free weather API as a real climate data source instead of random jitter
4. Fix the mock scoring divergence
5. Wire the "SMS farmer" button to actually create and display an SMS node
6. Fix logout

**NICE TO HAVE (polish):**
7. Add a "Live Graph" visualization showing the Neo4j graph browser embedded in the UI
8. Pre-seed more farmers (20+) so the dashboard doesn't look empty
9. Add a "Pitch Mode" button that opens a simplified full-screen demo flow

---

## 5. SCRIPT / PITCH REFERENCE

### Opening (15s)
> "Hi, we're Technetians. We built **Ka LI** — a graph-native credit scoring engine for Kenya's smallholder farmers. AFRACA members have 100+ institutions asking the same question: how do you lend to someone with no bank account, no land title, and no credit history? Our answer: don't look at the person. Look at their network."

### The demo (3 min)
> *[Open dashboard at localhost:3000, search F-1045 Peter Otieno]*
> "This is Peter Otieno. He farms 1.2 acres of rice in Ahero. No land title. No bank loan ever. But he's been delivering to Kisumu Rice Growers for 4 years. He's been in Ahero Rice Chama for 30 months with 94% repayment. His zone SPI is 0.9 — good rainfall. Our graph gives him a 72/100. Approve Flexible."
>
> *[Click Approve, show decision committed]*
> "Notice what we didn't need. No credit bureau check. No land title. No smartphone. Just the network he's part of."
>
> *[Open the farmer phone simulator, dial *483*100#]*
> "And Peter accesses all of this through USSD on a Ksh 1,000 phone. No data plan. No app store."

### Closing (45s)
> "AFRACA's member institutions serve millions of farmers across Africa. Every single one of them faces the same problem: how to say yes to a farmer when the file is empty. Our graph-native approach turns thin files into rich networks. It replaces collateral with community. And it works on a $20 phone."

### What to emphasize for 1st place
| Judge concern | Our answer |
|---------------|-----------|
| "Is this really AI?" | The graph is our AI — Cypher traversal as a reasoning engine. Plus LLM-powered narrative. |
| "Is it working?" | Live demo, right now. Every API call hits Neo4j. |
| "Why AFRACA?" | AFRACA's 100+ members are exactly the institutions that need graph-based alternative scoring. |
| "Why smallholders?" | 70% of Kenya's workforce. The largest unserved credit market. |
| "Will it scale?" | Graph queries are sub-100ms. Neo4j handles millions of nodes. |
| "How is this different?" | Everyone else uses ML on flat data. We use network topology. No one else does this. |
