# PATCH /:id/reschedule — Current Flow Analysis

## Current Implementation (Legacy Path)

### Steps (in order)

1. **Parse & validate** body: `eventDate`, `eventEndDate?`, `assignedUserId?`, `reason`, `notes?`
2. **Open `db.transaction()`**
3. **Read** `bookings` (legacy) with `FOR UPDATE` lock
4. **Guard**: `cancelled` or `completed` → 422 reject
5. **Duration lookup** (for conflict window):
   - Raw SQL on `booking_items JOIN services` → `SUM(duration_minutes)` for this booking
   - Fallback: 60 minutes
6. **Advisory lock**: `pg_advisory_xact_lock(hashtext(orgId), hashtext('staff:' + staffId))`
7. **Staff conflict check**: raw SQL on `bookings` table — finds overlapping bookings for same staff
   - Overlap window: `[staffStart, staffEnd)` where staffEnd = eventDate + duration
   - Skips `cancelled`/`no_show` statuses
   - `FOR UPDATE` on conflicting rows
8. **Build `internalNotes`**: appends `[تأجيل DATE] من: PREV → إلى: NEW — السبب: REASON`
9. **Update `bookings`**: `eventDate`, `internalNotes`, optionally `eventEndDate`, `assignedUserId`
10. **Return** updated booking
11. **OUTSIDE transaction (fire-and-forget)**:
    - `db.insert(bookingEvents)` → `rescheduled` event (legacy timeline)
    - `insertAuditLog()` → audit trail

### Does it recalculate pricing? **No**
### Does it handle coupons? **No** (coupon fields not touched)
### Does it write timeline event? **Yes** — to `bookingEvents` (legacy), fire-and-forget outside transaction

---

## Field Name Mapping (legacy → canonical)

| Legacy (`bookings`) | Canonical (`bookingRecords`) |
|---|---|
| `eventDate` | `startsAt` |
| `eventEndDate` | `endsAt` |
| `assignedUserId` | `assignedUserId` (unchanged) |
| `internalNotes` | `internalNotes` (unchanged) |
| Duration source: `booking_items.durationMinutes` | Duration source: `bookingLines.durationMinutes` |
| Conflict table: `bookings` | Conflict table: `bookingRecords` |
| Timeline table: `bookingEvents` | Timeline table: `bookingTimelineEvents` |

---

## Canonical Path Design (Wave 2)

### Strategy: Dual-path lookup

```
PATCH /:id/reschedule
  → Try bookingRecords WHERE id + orgId (canonical)
    → found: run canonical reschedule
  → Else try bookings WHERE id + orgId (legacy)
    → found: run legacy reschedule (existing code, unchanged)
  → Neither: 404
```

This ensures:
- Canonical bookings (created by Wave 2 POST /) get canonical reschedule
- Legacy bookings (created before migration) continue to work via existing path
- No data mixing

### Canonical reschedule transaction

```
db.transaction(async (tx) => {
  SELECT bookingRecords FOR UPDATE
  Guard: cancelled/completed → 422
  Duration: SELECT SUM(durationMinutes) FROM bookingLines WHERE bookingRecordId = id
  Advisory lock
  Conflict: SELECT bookingRecords WHERE startsAt/endsAt overlap + same orgId/assignedUserId
  Build internalNotes log line
  UPDATE bookingRecords SET startsAt, endsAt?, assignedUserId?, internalNotes
  INSERT bookingTimelineEvents (rescheduled) ← INSIDE transaction (not fire-and-forget)
})
```

### Key difference from legacy

Timeline event is written **inside** the transaction (not fire-and-forget), ensuring atomicity. If the update succeeds, the event is guaranteed to exist.

---

## Known Limitations

- Reschedule only works on canonical bookings created by Wave 2 `POST /`. Pre-migration bookings use legacy path.
- No pricing recalculation on reschedule (same as legacy — by design).
- Coupon fields not re-evaluated (same as legacy).
