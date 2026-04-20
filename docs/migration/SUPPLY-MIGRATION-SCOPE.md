# Wave 1.5 — Supply Migration Scope

## Current State Analysis

### bookingItems → canonical equivalent

`booking_items` (legacy):
- `bookingId` → references `bookings.id`
- `serviceId` → **the key for recipe lookup** (references `services.id`)
- `serviceName`, `serviceType` → snapshots
- `quantity`, `unitPrice`, `totalPrice`

`booking_lines` (canonical):
- `bookingRecordId` → references `booking_records.id`
- `serviceRefId uuid` — **already exists**, designed for "optional legacy service reference during migration"
- `itemRefId uuid` — canonical catalog item reference
- `itemName`, `itemType` → snapshots
- `quantity`, `unitPrice`, `totalPrice`

**Key finding:** `serviceRefId` on `booking_lines` was purpose-built for this exact scenario.
**No schema migration (migration 148) needed.** `serviceRefId` IS the bridge.

---

### serviceSupplyRecipes → no changes needed

`service_supply_recipes`:
- `serviceId` → references `services.id`
- `supplyId` → references `salon_supplies.id`
- `quantity` → amount to deduct per unit

This table is service-centric, not booking-centric.
Both legacy and canonical paths use it via `serviceId`.
**No changes needed.**

---

### bookingConsumptions → canonical equivalent

`booking_consumptions` (legacy):
- `bookingId` → references `bookings.id`
- `bookingItemId` → references `booking_items.id`

`booking_consumptions_canonical` (canonical, already exists):
- `bookingRecordId` → references `booking_records.id`
- `bookingLineId` → references `booking_lines.id`

Both tables have: `supplyId`, `quantity`, `unit`, `consumedAt`, `createdBy`.

---

### Business types affected

Supply deduction in `PATCH /:id/status` runs for **all** booking types on completion.
No `bookingType` filter exists — every `newStatus === "completed"` triggers it.
Most relevant for: salon, spa, cafe, restaurant (recipe-based services).

---

## Architectural Decision

### Option Δ: Use `serviceRefId` (no new migration)

The `serviceRefId` field already exists on `booking_lines`. The supply deduction chain becomes:

**Deduction path:**
1. Read `booking_lines WHERE booking_record_id = id` → get `serviceRefId`, `quantity`
2. Read `service_supply_recipes WHERE service_id = serviceRefId` → get `supplyId`, recipe qty
3. Deduct from `salon_supplies`
4. Write to `booking_consumptions_canonical` with `bookingRecordId` + `bookingLineId`

**Legacy fallback (existing path, unchanged):**
1. Read `booking_items WHERE booking_id = id` → get `serviceId`, `quantity`
2. Read `service_supply_recipes WHERE service_id = serviceId`
3. Deduct from `salon_supplies`
4. Write to `booking_consumptions` with `bookingId` + `bookingItemId`

**Union pattern:**
```typescript
const canonicalLines = await getCanonicalDeductables(bookingRecordId);  // bookingLines.serviceRefId
const legacyItems    = await getLegacyDeductables(bookingId);           // bookingItems.serviceId
// Run deduction for each non-empty set
```

**Idempotency guard:** Check BOTH tables before deducting.

**Reversal:** Symmetric — check `booking_consumptions_canonical` for canonical, `booking_consumptions` for legacy.

### Why not the other options:

- **Option A** (ADD serviceId to bookingLines): Redundant — `serviceRefId` already serves this.
- **Option B** (full canonical consumptions only): Breaks legacy path until Phase 3.D.
- **Option C** (hybrid bridge function): More indirection than needed; direct dual-path is cleaner.

---

## Implementation Plan

1. Update `PATCH /:id/status` supply deduction to run dual-path:
   - Lines (canonical): `bookingLines.serviceRefId` → recipes → `bookingRecordConsumptions`
   - Items (legacy): `bookingItems.serviceId` → recipes → `bookingConsumptions` ← unchanged
2. Update idempotency guard to check both tables
3. Update supply reversal to check + reverse both tables
4. `POST /` (Wave 2) will populate `serviceRefId` when creating canonical booking lines

## Out of scope

- Changing `serviceSupplyRecipes` schema
- Changing `salonSupplies` schema
- Full `bookingConsumptions` migration (Phase 3.B)
- Recipe engine refactor (Phase 3.B)

---

## Known Limitations (Wave 1.5)

### 1. No deduction for canonical bookings created before Wave 2

`bookingLines.serviceRefId` is only populated by `POST /` **after Wave 2 ships**.
Existing canonical booking records created before Wave 2 will have `serviceRefId = NULL` on all lines → supply deduction is silently skipped for those bookings.

**Impact:** Canonical bookings created between Wave 1.5 and Wave 2 ship date will not trigger supply deduction.
**Mitigation:** A backfill query can set `serviceRefId` on historical lines after Wave 2, if needed.
**Resolution:** Wave 2 — `POST /` populates `serviceRefId` on new booking lines.

### 2. Mixed booking: partial deduction

A booking with some lines having `serviceRefId` and some without will only deduct supplies for the lines with a valid `serviceRefId`. Lines without it are skipped with a `debug` log. This is intentional (ad-hoc items with no recipe).

### 3. No reversal for canonical consumptions created before canonical reversal code

The canonical reversal path (reading `bookingRecordConsumptions`) was added in the same wave. Any legacy `bookingConsumptions` rows are reversed by the legacy path. The two paths are independent — there is no cross-path contamination.

### 4. serviceRefId bridges to legacy service catalog

`serviceRefId` references `services.id` (the legacy service catalog), not a canonical catalog item. This remains correct through Phase 3.D. When the canonical catalog replaces the legacy one, the recipe lookup key will change — tracked in `docs/tech-debt/RECIPES-FUTURE-WORK.md`.
