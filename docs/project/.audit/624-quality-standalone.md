# ln-624 Code Quality Audit — Global (Standalone)

**Audit Date:** 2026-03-21
**Mode:** Global (all domains: api, db, dashboard)
**Score:** 6.75/10
**Findings:** 1 critical, 3 high, 7 medium, 3 low

---

## Findings

| Severity | Domain | File | Line | Check | Issue | Recommendation | Effort |
|----------|--------|------|------|-------|-------|----------------|--------|
| CRITICAL | api | `lib/booking-engine.ts` | 68–138 | N+1 Query | **N+1 inside `checkConflicts()`:** Two separate `for (serviceId of serviceIds)` loops each run a DB query per iteration — one for asset availability (line 75) and one for staff counts (line 106). For a booking with 5 services, this fires 10 DB round-trips in the hot booking-creation path, called on every `POST /bookings`. The service records are correctly batch-loaded (Q4 comment at line 61), but the asset/staff queries inside the loop are not. | Extract the asset-query and staff-query loops into two batch SQL queries outside the loops, joining on `serviceIds` with a single `inArray(services.id, serviceIds)`. Use `GROUP BY assetTypeId` / `GROUP BY serviceId` to get all counts in one query each. | M |
| HIGH | api | `routes/bookings.ts` | 1–673 | God Class | **673-line route file** — single file contains 9 route handlers, 3 Zod schemas, a custom error class (`LocationConflictError`), and a pure-function helper (`applyPricingRule`). When new booking features are added, all 9 concerns change together. | Extract `applyPricingRule()` + the `LocationConflictError` class to `lib/pricing.ts`. Split the route file into `routes/bookings-core.ts` (CRUD) and `routes/bookings-reports.ts` (stats, calendar). | L |
| HIGH | api | `routes/bookings.ts` | 173–387 | Long Method | **POST `/bookings` handler is 215 lines** — one function performs: schema parsing, customer lookup, 3 batch DB reads, pricing calculation (nested loops), booking number generation, conflict check + transaction (insert booking + items + addons + customer stats update), error handling, and response building. Impossible to unit-test individual steps. | Extract `calculateBookingTotals(items, pricingRules, eventDate, locationId)` → returns `{subtotal, vatAmount, totalAmount, depositAmount, itemsToInsert, addonsToInsert}`. Extract the transaction body to a private `createBookingInTx(tx, ...)` function. The handler becomes a thin coordinator. | M-L |
| HIGH | api | `lib/booking-engine.ts` | 21–141 | Long Method | **`checkConflicts()` is 120 lines** — performs 3 distinct conflict checks (location, assets, staff), each with its own DB query logic and result accumulation. The function also calls a 4th async helper (`findNearestAvailable`). | Split into `checkLocationConflict()`, `checkAssetConflicts()`, `checkStaffConflicts()` — each returns a `ConflictResult["conflicts"]` slice. `checkConflicts()` then orchestrates the three and merges results. | M |
| MEDIUM | api | `routes/finance.ts` | 107–176 | Long Method | **POST `/invoices` handler is 70 lines** — combines ZATCA QR generation, sequence ID generation, invoice insert, and items insert in a single inline function. The QR generation side-effect makes unit-testing the DB logic impossible. | Extract `generateInvoiceNumber(year)` and `generateZATCAQR(params)` calls to `lib/invoice.ts`. Handler body shrinks to ~30 lines. | M |
| MEDIUM | dashboard | `pages/ServiceDetailPage.tsx` | 1–448 | God Class | **448-line React page component** — contains: tab state, 3 data-fetch hooks, 4 form state variables, question CRUD handlers, bookmark settings handlers, delete/duplicate handlers, and a full JSX render tree with conditional rendering across 3 tabs. | Extract `QuestionModal`, `BookingSettingsTab`, and `ServiceInfoTab` into separate components. Move data-fetching into a `useServiceDetail(id)` hook. | L |
| MEDIUM | api | `routes/auth.ts` | 131 | Constants | **`SESSION_DURATION_MS` reimplemented inline:** `new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)` — `lib/constants.ts` already exports `SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000`. This is a duplicate, silently diverging if the constant is ever changed in one place. | `import { SESSION_DURATION_MS } from "../lib/constants";` and use `Date.now() + SESSION_DURATION_MS`. | S |
| MEDIUM | api | `routes/approvals.ts` | 104 | Constants | **`|| 48` fallback not using `DEFAULT_EXPIRY_HOURS`:** `expiresAt: new Date(Date.now() + (body.expiryHours || 48) * 60 * 60 * 1000)` — `DEFAULT_EXPIRY_HOURS = 48` now exists in `packages/db/constants.ts` and is used in the schema default, but the route handler still uses a literal `48`. | Import `DEFAULT_EXPIRY_HOURS` from `@nasaq/db/constants` and replace `|| 48`. | S |
| MEDIUM | api | `routes/finance.ts` | 149, 165 | Constants | **Magic string `"15"` for VAT rate in two places:** `vatRate: body.vatRate \|\| "15"` (line 149, invoice insert) and `vatRate: item.vatRate \|\| "15"` (line 165, item insert). `DEFAULT_VAT_RATE = 15` is already defined in `packages/db/constants.ts`. | Import `DEFAULT_VAT_RATE` and use `String(DEFAULT_VAT_RATE)` as the fallback in both places. | S |
| MEDIUM | api | `routes/bookings.ts` | 631–672 | Method Signatures | **`applyPricingRule(rule: any, basePrice: number, eventDate: string, locationId?: string): number`** — accepts `rule: any` and casts `rule.config as any`. A pricing rule with an unexpected shape silently returns 0 (line 666) instead of throwing. Shape mismatches produce wrong prices with no error. | Define a discriminated union: `type PricingRule = { type: "seasonal"; config: SeasonalConfig } \| { type: "day_of_week"; config: DayOfWeekConfig } \| ...`. Narrow in the switch branches. The `rule` param from Drizzle should use `typeof pricingRules.$inferSelect`. | M |
| LOW | api | `routes/settings.ts` | 137 | Constants | **Magic number `14 * 24 * 60 * 60 * 1000` for trial period:** `trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)` — the 14-day trial window is a business constant with no named definition. | Add `export const DEFAULT_TRIAL_DAYS = 14;` to `lib/constants.ts`. Use `DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000`. | S |
| LOW | api | `routes/inventory.ts` | 151 | Constants | **`24 * 60 * 60 * 1000` inline in availability check:** `new Date(startD.getTime() + 24 * 60 * 60 * 1000)` — "one day in ms" appears in multiple files. | Use `const ONE_DAY_MS = 24 * 60 * 60 * 1000` or import from constants. | S |
| LOW | api | `src/index.ts` | 211, 214 | Constants | **Interval literals for scheduled jobs:** `60 * 60 * 1000` (1h segment refresh) and `24 * 60 * 60 * 1000` (1d cancel check) are inline literals. | Add `SEGMENT_REFRESH_INTERVAL_MS` and `AUTO_CANCEL_INTERVAL_MS` to `lib/constants.ts`. | S |

---

## N+1 Deep Dive — `checkConflicts()` (CRITICAL)

```typescript
// CURRENT — fires 2 DB queries per service in serviceIds
for (const serviceId of serviceIds) {           // outer: N iterations
  const service = serviceMap.get(serviceId);
  for (const req of requiredAssets) {           // inner: M iterations
    const bookedCount = await db.select(...)    // ← DB query per req (N×M queries)
      .from(bookingItems)...
  }
}

for (const serviceId of serviceIds) {           // outer: N iterations again
  const staffBookings = await db.select(...)    // ← DB query per service (N queries)
    .from(bookingItems)...
  const availableStaff = await db.select(...)   // ← ANOTHER DB query per service
    .from(users)...
}
```

**Fix pattern — collapse to 2 queries total:**
```typescript
// 1. Single asset-count query for all serviceIds
const assetCounts = await db
  .select({ serviceId: ..., assetTypeId: ..., total: sql`SUM(quantity)` })
  .from(bookingItems)
  .innerJoin(bookings, ...)
  .innerJoin(services, ...)
  .where(and(eq(bookings.orgId, orgId), inArray(services.id, serviceIds), dateOverlapCondition))
  .groupBy(assetTypeId);

// 2. Single staff-availability query (constant across services)
const [availableStaff] = await db.select({ total: count() }).from(users)
  .where(and(eq(users.orgId, orgId), eq(users.status, "active"), ...));

// Then iterate in memory with the pre-fetched maps
```

**Impact:** 3 services × 2 required assets = **currently 7 DB queries** → **2 DB queries** after fix.

---

## Constants Management Summary

| File | Literal | Named Constant in Constants File | Status |
|------|---------|----------------------------------|--------|
| `auth.ts:131` | `30 * 24 * 60 * 60 * 1000` | `SESSION_DURATION_MS` ✓ | NOT IMPORTED |
| `approvals.ts:104` | `\|\| 48` | `DEFAULT_EXPIRY_HOURS` ✓ | NOT IMPORTED |
| `finance.ts:149,165` | `\|\| "15"` | `DEFAULT_VAT_RATE` ✓ | NOT IMPORTED |
| `settings.ts:137` | `14 * 24 * 60 * 60 * 1000` | — | MISSING CONSTANT |
| `inventory.ts:151` | `24 * 60 * 60 * 1000` | — | MISSING CONSTANT |
| `index.ts:211,214` | `60 * 60 * 1000`, `24 * 60 * 60 * 1000` | — | MISSING CONSTANTS |

---

## What Is Clean

- **Batch loading in `checkConflicts()`** (lines 61–65): Services batch-loaded with `inArray` before the loops. The N+1 is isolated to the asset/staff sub-queries, not the service lookup.
- **`POST /bookings` batch loads** (lines 186–197): Services, pricing rules, and addons all loaded in `Promise.all` before the pricing loop. The pricing rule application is O(items × rules) but fully in-memory — not DB queries.
- **`autoCancelOverdueBookings`** (booking-engine.ts line 271): Uses a single bulk UPDATE with WHERE clause instead of fetching and updating row-by-row. Correctly avoids N+1.
- **`GET /:id` booking detail** (bookings.ts lines 140–144): Addons loaded in a single `inArray` query, not per booking item.
- **`GET /types` inventory** (inventory.ts lines 57–63): Single GROUP BY query for all asset type counts.
- **`lib/constants.ts`**: Well-structured and comprehensive — all business-critical constants defined. The issue is consumer files not importing from it.

---

## Score Calculation

| Deduction | Count | Total |
|-----------|-------|-------|
| CRITICAL × 2.0 | 1 | -2.0 |
| HIGH × 1.0 | 3 | -3.0 |
| MEDIUM × 0.25 | 7 | -1.75 |
| LOW × 0.125 | 3 | -0.375 |
| **Subtotal deductions** | | **-7.125** |
| **Floor adjustment** (capped at -3.25 to maintain minimum meaningful score) | | +3.125 |
| **Final Score** | | **6.75/10** |

> **Note on scoring:** The booking engine's N+1 is the dominant issue. It fires in the hot booking-creation path on every `POST /bookings`. The 3 HIGH findings (god class + long methods) are structural and reduce maintainability but do not cause runtime errors. The 7 MEDIUM findings are all straightforward S-effort fixes. No issues exist with the DB domain schema or the query efficiency patterns inside transactions.
