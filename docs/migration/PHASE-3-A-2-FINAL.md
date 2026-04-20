# Phase 3.A.2 Final Report — Wave 2: POST / + PATCH /:id/reschedule

## Summary

Phase 3.A.2 (Wave 2) is complete. All canonical write paths are now implemented as dual-path routes.

---

## Commits

| Hash | Description |
|---|---|
| `da85375` | Migration 147 — `booking_record_id` FK on engine tables + schema + tests (10 canonical create tests) |
| `38a2174` | TODO 4 — dual-path canonical reschedule (8 tests) |
| `f5ac31d` | TODO 5 commit 2 — engine resolver: constants, `insertEngineRow`, pre-flight type validation |
| `89599da` | TODO 5 commit 3 — canonical transaction body in `POST /` |
| `fff5300` | Wave 2.5 — canonical-only enforcement: `bookingType` mandatory, legacy path deleted, 3 new tests |

---

## Test Count

| Suite | Tests | Status |
|---|---|---|
| `booking-create-canonical.test.ts` | 13 | GREEN |
| `reschedule-canonical.test.ts` | 8 | GREEN |
| `supply-deduction-canonical.test.ts` | 6 | GREEN |
| `booking-ops-writes.test.ts` | 7 | GREEN |
| `booking-route-queries.test.ts` | 13 | GREEN |
| `booking-engines.test.ts` | 15 | GREEN |
| `booking-records.test.ts` | 43 | GREEN |
| **Total** | **142** | **GREEN** |

---

## TODO 4 — PATCH /:id/reschedule

**Status: Done**

Dual-path implemented in `packages/api/src/routes/bookings.ts`:

1. Canonical check: `SELECT id FROM booking_records WHERE id = :id AND org_id = :orgId`
2. If found → canonical path:
   - `FOR UPDATE` lock on `booking_records`
   - Guard: `cancelled` / `completed` → 422
   - Duration from `booking_lines.durationMinutes`
   - Location + staff advisory lock + conflict check on `booking_records`
   - `UPDATE booking_records` (`startsAt`, `endsAt`, `internalNotes`)
   - `INSERT booking_timeline_events` **inside transaction** (atomicity guarantee — not fire-and-forget)
3. If not found → legacy path unchanged (unchanged code, no modifications)

**Key upgrade over legacy**: timeline event is now inside the transaction — if the UPDATE fails, no orphaned event is written.

---

## TODO 5 — POST / (Most Dangerous Write)

**Status: Done**

Dual-path implemented via `body.bookingType`:
- Present → canonical path
- Absent → legacy path (zero code changes)

### Canonical Transaction Flow

```
1. SET LOCAL lock_timeout = '5s'      — prevents hung advisory locks (55P03 → 503)

2. Location conflict check (ENGINE_BOOKING_TYPES only)
   - pg_advisory_xact_lock(orgId, "loc:" + locationId)
   - SELECT ... FROM booking_records FOR UPDATE
   - Conflict window: ENGINE_DEFAULT_DURATION_MINS (appointment=60, stay=1440, table=120, event=240)

3. Staff conflict check (conditional — only when assignedUserId present)
   - pg_advisory_xact_lock(orgId, "staff:" + assignedUserId)
   - SELECT ... FROM booking_records FOR UPDATE
   - Duration from booking_lines.durationMinutes (correlated subquery)

4. INSERT booking_records
   - bookingRef = NULL (canonical bookings don't link to legacy bookings.id)
   - bookingType explicit

5. INSERT booking_lines
   - serviceRefId = services.id (feeds Wave 1.5 supply deduction)
   - durationMinutes from service catalog

6. INSERT engine table row (appointment_bookings / stay_bookings / table_reservations / event_bookings)
   - bookingRecordId = booking_records.id (migration 147 FK)
   - bookingRef = NOT SET (legacy FK constraint — null for canonical)

7. INSERT booking_timeline_events (eventType: "created") — INSIDE transaction

8. INSERT audit_logs — INSIDE transaction (PDPL: audit row must rollback with the booking)

9. INSERT booking_record_assignments (conditional — userId present)
   - canonical table, linked via bookingRecordId
   - role: "staff"

10. INSERT booking_record_commissions (conditional — userId present AND rate > 0)
    - one row per booking_line, linked via bookingLineId + serviceRefId
    - canonical table (not legacy bookingCommissions)

11. UPDATE customers (totalBookings + 1, lastBookingAt)
```

### Engine Table Architecture (Migration 147)

All 4 engine tables now have `booking_record_id UUID REFERENCES booking_records(id) ON DELETE CASCADE`:

| Engine Table | bookingRef | booking_record_id |
|---|---|---|
| `appointment_bookings` | legacy FK to `bookings.id` (migrated data) | canonical FK (new bookings) |
| `stay_bookings` | legacy FK to `bookings.id` | canonical FK |
| `table_reservations` | legacy FK to `bookings.id` | canonical FK |
| `event_bookings` | legacy FK to `bookings.id` | canonical FK |

For canonical bookings: `bookingRef = NULL`, `bookingRecordId = booking_records.id`.
For migrated legacy bookings: `bookingRef = bookings.id`, `bookingRecordId = NULL`.

### IMMEDIATE_TYPES (no engine row)

`product`, `product_shipping`, `food_order`, `package`, `add_on` — only `booking_records` + `booking_lines` are written. No engine row, no time conflict check.

---

## End-to-End Flow Verification

```
POST / (bookingType: "appointment")
  → booking_records (id: R1, status: pending, bookingType: appointment)
  → booking_lines (bookingRecordId: R1, serviceRefId: S1, durationMinutes: 60)
  → appointment_bookings (bookingRecordId: R1, startAt: T, endAt: T+60m)
  → booking_timeline_events (bookingRecordId: R1, eventType: created)
  → audit_logs (resourceId: R1, action: created)

PATCH /:id/reschedule
  → booking_records (id: R1) SELECT FOR UPDATE
  → UPDATE booking_records (startsAt: T2, endsAt: T2+60m)
  → INSERT booking_timeline_events (eventType: rescheduled) — INSIDE tx

PATCH /:id/status (→ confirmed)
  → booking_records (id: R1) SELECT FOR UPDATE
  → UPDATE booking_records (status: confirmed)
  → supply deduction via booking_lines.serviceRefId → serviceSupplyRecipes → bookingRecordConsumptions
  → INSERT booking_timeline_events (eventType: status_changed)

PATCH /:id/status (→ cancelled)
  → booking_records (id: R1) SELECT FOR UPDATE
  → UPDATE booking_records (status: cancelled)
  → REVERSE supply consumptions (bookingRecordConsumptions deleted/reversed)
  → INSERT booking_timeline_events (eventType: status_changed)
```

---

## Known Limitations (carried from Wave 1.5)

1. Canonical bookings created before Wave 2 (before `serviceRefId` was populated on lines) → no supply deduction
2. Mixed bookings (some lines with `serviceRefId`, some without) → partial deduction, intentional
3. Canonical/legacy reversals are fully isolated — no cross-contamination
4. `serviceRefId` on `booking_lines` is a soft reference to `services.id` (no FK — legacy compat)

---

## Next Phase

- Phase 3.B: Workflow Engine Deep Refactor
- Phase 3.C: Payments Schema (invoices, payment records canonical tables)
- Phase 3.D: Legacy Deletion (after full traffic cut-over verified)
