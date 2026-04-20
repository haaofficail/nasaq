# Engine Tables — Architecture Analysis (Wave 2 Pre-flight)

## Finding: All 4 Engine Tables Have NO FK to booking_records

After full schema inspection of `packages/db/schema/canonical-bookings.ts`:

| Engine Table | File line | Has bookingRecordId FK? | Has bookingRef? |
|---|---|---|---|
| `appointment_bookings` | 31 | **No** | `uuid("booking_ref")` — "legacy tracking only — no FK" |
| `stay_bookings` | 86 | **No** | `uuid("booking_ref")` — "legacy tracking only — no FK" |
| `table_reservations` | 149 | **No** | `uuid("booking_ref")` — "legacy tracking only — no FK" |
| `event_bookings` | 200 | **No** | `uuid("booking_ref")` — "legacy tracking only — no FK" |

`booking_records` itself also has `bookingRef: uuid("booking_ref") // legacy tracking only — no FK` (line 270).

---

## Architectural Decision: No Migration 149 Needed

### Why NOT adding `booking_record_id` FK to engine tables

Engine tables are standalone entities. They predate `booking_records` and are designed to work independently:
- `booking-engines.test.ts` (15 tests) creates engine rows with no `booking_records` reference
- Adding a NOT NULL FK would break all existing standalone engine rows
- Adding a nullable FK adds coupling without solving anything the soft link can't handle

### The correct link mechanism (already in schema)

`booking_records.bookingRef` is the forward reference to the engine row. The flow in `POST /`:

```
pre-generate engineRowId = crypto.randomUUID()

INSERT booking_records { bookingRef: engineRowId, ... }
INSERT appointment_bookings { id: engineRowId, bookingRef: record.id, ... }
```

- `booking_records.bookingRef` → engine row's `id` (forward: find engine details from record)
- engine `bookingRef` → `booking_records.id` (reverse: find record from engine row)

Both are soft links (no FK). This matches the existing pattern for ALL tables in this schema.

---

## event_bookings — Full Schema

**Location:** `packages/db/schema/canonical-bookings.ts`, lines 200–258

```
Fields:
  id, orgId, customerId, bookingRef (soft)
  bookingNumber, status, paymentStatus
  eventType      — wedding|corporate|birthday|conference
  eventName
  eventDate      — date (NOT timestamp!) ← note
  eventStart     — timestamp with tz
  eventEnd       — timestamp with tz
  setupAt        — timestamp with tz
  teardownAt     — timestamp with tz
  locationId, customLocation, locationNotes
  guestCount, confirmedGuests
  packageId, packageSnapshot (jsonb)
  subtotal, discountAmount, vatAmount, totalAmount, depositAmount, paidAmount, balanceDue
  assignedUserId
  source, customerNotes, internalNotes, questionAnswers (jsonb)
  cancelledAt, cancellationReason, noShowAt
  createdAt, updatedAt
```

**Minimum required fields for INSERT:**
`orgId`, `customerId`, `bookingNumber`, `eventDate` (date type)

---

## bookingType → Engine Table Mapping

From `booking_records.bookingType` comment: "appointment|event" — but based on engine tables:

```typescript
const ENGINE_MAP = {
  appointment:       "appointment_bookings",
  stay:              "stay_bookings",
  table_reservation: "table_reservations",
  event:             "event_bookings",
} as const;

// These types require no engine row:
const IMMEDIATE_TYPES = new Set([
  "product",
  "product_shipping",
  "food_order",
  "package",
  "add_on",
]);
```

Unknown types (not in ENGINE_MAP and not in IMMEDIATE_TYPES) → **reject with 400** before transaction.
