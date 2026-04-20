# Phase 3 Migration Status

## ⚠️ DO NOT DEPLOY TO PRODUCTION UNTIL PHASE 3.B COMPLETES

---

## Inconsistent State — Active During Phase 3.A

| Layer | Current State |
|-------|--------------|
| Reads (GET endpoints) | canonical tables (`booking_records`, `booking_lines`, `booking_line_addons`, `booking_timeline_events`) |
| Writes (POST/PATCH) | legacy tables (`bookings`, `booking_items`, `booking_item_addons`, `booking_events`) |

**Risk:** New bookings created via `POST /` will not appear in:
- `GET /:id/events` timeline (reads `booking_timeline_events`, writes go to `booking_events`)
- `GET /alerts` operational alerts (reads `booking_timeline_events`, writes go to `booking_events`)
- `GET /:id/timeline` (same as above)

**Resolution:** Phase 3.B migrates all write paths to canonical tables. Until then, reads from timeline/events endpoints will return empty data for new bookings.

---

## Phase 3.A Progress

### GET Endpoints — Migrated to Canonical

| # | Endpoint | Commit | Status |
|---|----------|--------|--------|
| 1 | `GET /` | Phase 3.A | Done |
| 2 | `GET /check-availability` | Phase 3.A | Done |
| 3 | `GET /calendar` | Phase 3.A | Done |
| 4 | `GET /calendar/events` | Phase 3.A | Done |
| 5 | `GET /:id` | Phase 3.A | Done |
| 6 | `GET /:id/events` | Phase 3.A | Done |
| 7 | `GET /track/:token` | Phase 3.A | Done |
| 8 | `GET /stats/summary` | Phase 3.A | Done |
| 9 | `GET /stats/trend` | Phase 3.A | Done |
| 10 | `GET /stats/growth` | Phase 3.A | Done |
| 11 | `GET /stats/overview` | Phase 3.A | Done |
| 12 | `GET /alerts` | Phase 3.A | Done |
| 13 | `GET /:id/timeline` | Phase 3.A | Done |

### POST/PATCH Endpoints — Phase 3.A.2 (Mutations) — Pending

| Endpoint | Status |
|----------|--------|
| `POST /` | Pending Phase 3.A.2 |
| `PATCH /:id/status` | Pending Phase 3.A.2 |
| `PATCH /:id/reschedule` | Pending Phase 3.A.2 |
| `POST /:id/payments` | Pending Phase 3.C |
| `POST /track/:token/payment` | Out of scope (Moyasar webhook) |

---

## TODOs for Phase 3.B

- `booking-ops.ts:runPostTransitionAutomations` — still writes to `booking_events` (legacy)
- `booking-ops.ts:recordBlockedTransitionEvent` — still writes to `booking_events` (legacy)
- `PATCH /:id/status` (line ~809) — inserts into `booking_events`, reads/writes `bookings`
- `PATCH /:id/reschedule` (line ~1179) — inserts into `booking_events`, updates `bookings`
- `POST /` (line ~309) — creates `bookings`, `booking_items`, `booking_item_addons`
- All `bookingEvents` writes scattered through transaction blocks

## TODOs for Phase 3.C

- `POST /:id/payments` — payment recording against `payments` table (legacy)
- `GET /:id` payments[] response — currently omitted with TODO comment
