# KaLI API Reference

Base URL (local): `http://localhost:4000`  
All `/api/*` routes are prefixed unless noted.

---

## Authentication

| Type | Routes | Header |
|------|--------|--------|
| **Public** | health, readiness, explain, agent, ingest, verify | None |
| **Officer JWT** | farmers, scorecard, map, agronomist, decisions | `Authorization: Bearer <token>` |

Login: `POST /api/auth/login`

```json
{ "email": "jane.mwangi@kali.co.ke", "password": "KaliBranch2026!" }
```

Response includes `token` — store in frontend officer session.

---

## Health & stats

### `GET /api/health`

```json
{
  "status": "ok",
  "engine": "neo4j",
  "service": "kali-backend",
  "partner_tech": {
    "featherless": true,
    "masumi": false,
    "neo4j": true,
    "africas_talking": false
  }
}
```

### `GET /api/stats/public`

Public portfolio counters for landing page.

### `GET /api/stats/portfolio` 🔒

Officer portfolio aggregates.

---

## Farmers & scorecards 🔒

### `GET /api/farmers`

Query: `?status=all&segment=All`

Returns `{ farmers: [...] }` for dashboard queue.

### `GET /api/scorecard/:id`

Full graph assessment: drivers, drags, climate, unified score, ML blend, `ground_truth`.

### `POST /api/farmers/:id/decision`

```json
{
  "decision": "Approved",
  "stance": "approve_flexible",
  "notes": "Strong co-op history",
  "officer": "Jane Mwangi"
}
```

### `POST /api/farmers/:id/verify-field` 🔒

```json
{
  "actionId": "ACT-F-1056-0",
  "type": "agronomist-checkin",
  "notes": "Mulch applied on 2 acres"
}
```

### `POST /api/farmers/:id/sms` 🔒

Officer-initiated SMS to farmer.

### `POST /api/farmers/:id/masumi-disburse` 🔒

Partner disbursement intent.

---

## Farmer readiness (public)

### `GET /api/readiness/:lookup?lang=en`

Lookup: KTDA ID, phone, or national ID.

```json
{
  "ok": true,
  "farmer": { "id": "F-1056", "name": "James Mburu", ... },
  "readiness": { "score": 46, "baseScore": 46, "mitigationBonus": 0, "band": "almost" },
  "macroAdvisory": "Drought stress — conserve soil moisture",
  "actionPoints": [{ "id": "ACT-F-1056-0", "title": "...", "done": false }],
  "groundTruth": { "hadActiveAlert": true, "verifiedCount": 0 }
}
```

### `POST /api/readiness/:lookup/actions/:actionId/complete`

Marks farmer self-report complete.

---

## Explainability (public)

### `POST /api/explain`

```json
{ "lookup": "F-1042", "lang": "sw" }
```

Returns dual farmer SMS + officer narrative.

### `POST /api/agent/chat`

KaLI agent conversational interface.

### `GET /api/agent/languages`

Supported language codes: `en`, `sw`, `lg`.

---

## Agronomist platform 🔒

### `GET /api/agronomist/stats`

```json
{
  "ok": true,
  "pendingVerifications": 2,
  "totalVerifications": 5,
  "activeAlerts": 3
}
```

### `GET /api/agronomist/queue?zone=Z-KER-01`

ML-ranked verification queue.

### `GET /api/agronomist/zones`

Climate zones with alert flags.

### `GET /api/agronomist/insight/:farmerId`

Field panel: climate, ML drivers, pending actions, credit band.

---

## Map 🔒

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/map/farmers` | Geo pins with risk colors |
| `GET` | `/api/map/zones/:zoneId/analytics` | Zone farmer stats |
| `GET` | `/api/map/zones/:zoneId/weather` | Open-Meteo live weather |

---

## Ingest & pipeline

### `POST /api/ingest` (public)

Unified USSD/voice/officer ingest.

### `POST /api/pipeline/sync` 🔒

Climate + partner pipeline sync.

### `GET /api/events/stream?token=JWT` 

SSE for live map updates.

---

## USSD (separate mount)

Base: `/ussd`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ussd/ussd` | Africa's Talking USSD callback |
| `POST` | `/ussd/callback` | Delivery reports |
| `POST` | `/ussd/voice` | Voice ingest |

---

## Error format

```json
{ "error": "Human-readable message" }
```

HTTP codes: `400` validation · `401` auth · `404` not found · `500` server

---

## Rate & latency notes

- **Readiness first load** may take 30–90s when Featherless generates action points; subsequent loads are faster once `ActionPlan` exists in Neo4j.
- **Scorecard** recalculates graph score on every request (includes ground-truth bonus).
