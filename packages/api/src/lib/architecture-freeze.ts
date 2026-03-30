/**
 * Architecture Freeze — Nasaq
 * Enforced: 2026-03-30
 *
 * This file is the AUTHORITATIVE record of architectural decisions.
 * Any violation is a bug, not a feature.
 */

// ============================================================
// FREEZE 1: bookings table
// ============================================================
//
// STATUS: FROZEN — no new writes
//
// REASON: bookings holds appointments + hotel stays + table reservations
//   + event bookings in a single table. This creates uncontrolled coupling.
//
// RULE:
//   - Reads from bookings: ALLOWED (for legacy data)
//   - New writes to bookings: PROHIBITED
//   - New features: use engine-specific tables below
//
// CANONICAL REPLACEMENTS:
//   appointment → appointment_bookings (Engine: Appointment)
//   hotel/car   → stay_bookings        (Engine: Stay)
//   restaurant  → table_reservations   (Engine: Table)
//   events      → event_bookings       (Engine: Event)
//
// ============================================================

// ============================================================
// FREEZE 2: services.offeringType
// ============================================================
//
// STATUS: FROZEN — no new enum values
//
// REASON: offeringType conflates 11 unrelated concepts in one column.
//   Every route has if/switch on offeringType — fragile and unmaintainable.
//
// RULE:
//   - Read existing offeringType: ALLOWED
//   - Add new offeringType value: PROHIBITED
//   - New catalog items: use catalog_items + type-specific definition table
//
// CANONICAL REPLACEMENTS:
//   service      → catalog_items(item_type="service")  + service_definitions
//   product      → catalog_items(item_type="product")  + product_definitions
//   rental       → catalog_items(item_type="rental_unit") + rental_unit_definitions
//   subscription → catalog_items(item_type="subscription") [future]
//
// ============================================================

// ============================================================
// FREEZE 3: payments duplication
// ============================================================
//
// STATUS: UNIFYING — migration in progress
//
// RULE:
//   - payments (schema/bookings.ts): CANONICAL financial record
//     → All payment recording goes here
//     → Single source of truth for amount, method, status
//
//   - payment_transactions (schema/payment-gateway.ts): GATEWAY EVENTS ONLY
//     → Stores raw Moyasar responses
//     → Always has payment_id FK pointing to payments table
//     → Never written manually — only by gateway callback handler
//
// ============================================================

// ============================================================
// FREEZE 4: new payment flows
// ============================================================
//
// STATUS: ENFORCED
//
// RULE:
//   - No new payment flow outside payments.ts route
//   - No inline payment logic in booking routes, POS, or anywhere else
//   - Payment service: packages/api/src/engines/shared/payment-service.ts [to be created]
//
// ============================================================

// ============================================================
// ENGINES — canonical home for new features
// ============================================================
//
// RULE: No new feature outside engines/
//
// Engine        Business Types                    New Feature Location
// -----------   --------------------------        -------------------------
// appointment   salon, clinic, photography        engines/appointment/
// commerce      retail, bakery, flower, food      engines/commerce/
// stay          hotel, car_rental, chalet         engines/stay/
// lease         rental, real_estate               engines/lease/
// event         events, weddings, conference      engines/event/
// table         restaurant, cafe                  engines/table/
// field_service maintenance, workshop             engines/field_service/
// education     school                            engines/education/
//
// ============================================================

// Export the freeze rules as runtime checks (used in route guards)

export const FROZEN_TABLES = ["bookings", "services"] as const;

export const FROZEN_OFFERING_TYPES = [
  "service", "product", "package", "rental", "room_booking",
  "vehicle_rental", "subscription", "digital_product",
  "add_on", "reservation", "extra_charge",
] as const;

export const CANONICAL_BOOKING_TABLES = {
  appointment: "appointment_bookings",
  stay:        "stay_bookings",
  table:       "table_reservations",
  event:       "event_bookings",
} as const;

export const CANONICAL_CATALOG_TABLES = {
  service:     "service_definitions",
  product:     "product_definitions",
  rental_unit: "rental_unit_definitions",
} as const;

/**
 * Runtime guard — call this in any route that tries to write to bookings
 * to enforce the freeze at runtime during transition period.
 */
export function assertNotFrozen(table: string): void {
  if (process.env.NODE_ENV === "development" && FROZEN_TABLES.includes(table as any)) {
    console.warn(
      `[ARCHITECTURE FREEZE] Direct write to "${table}" detected. ` +
      `Use the appropriate engine table instead. See architecture-freeze.ts`
    );
  }
}
