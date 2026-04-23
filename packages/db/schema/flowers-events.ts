import {
  pgTable, text, timestamp, boolean,
  uuid, integer, index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { bookings } from "./bookings";
// service_orders is a raw SQL table (no Drizzle schema) — referenced by UUID only

// ============================================================
// FLOWER RESERVATIONS — reserve batches before deduction
// Source priority: service_order (event ops) > booking (direct link)
// ============================================================

export const flowerReservations = pgTable(
  "flower_reservations",
  {
    id:             uuid("id").defaultRandom().primaryKey(),
    orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

    // Explicit reservation sources — remove polymorphic source_type/source_id.
    // Nullable by design: reservations may still originate from a legacy service order
    // until flowers/events is fully migrated onto canonical booking records.
    bookingId:      uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    /*
     * MASSIVE WARNING:
     * legacy_service_order_id points to the raw SQL service_orders.id column but CANNOT
     * enforce a real FK because service_orders still has no Drizzle schema.
     * This legacy escape hatch MUST be migrated to bookingRecords / canonical bookings
     * ASAP so flowers/events reservations stop bypassing the platform constitution.
     */
    legacyServiceOrderId: uuid("legacy_service_order_id"),

    // Flower identity
    variantId:      uuid("variant_id").notNull(),   // → flower_variants.id
    batchId:        uuid("batch_id"),                // → flower_batches.id (nullable: pre-batch reservation)

    // Quantity
    quantity:       integer("quantity").notNull(),

    // Lifecycle
    status:         text("status").notNull().default("reserved"),
    reservedAt:     timestamp("reserved_at",  { withTimezone: true }).defaultNow().notNull(),
    releasedAt:     timestamp("released_at",  { withTimezone: true }),
    deductedAt:     timestamp("deducted_at",  { withTimezone: true }),

    notes:          text("notes"),
    createdAt:      timestamp("created_at",   { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgStatusIdx:       index("flower_reservations_org_status_idx").on(t.orgId, t.status),
    variantStatusIdx:   index("flower_reservations_variant_status_idx").on(t.variantId, t.status),
  })
);

export type FlowerReservation     = typeof flowerReservations.$inferSelect;
export type NewFlowerReservation  = typeof flowerReservations.$inferInsert;
