import {
  pgTable, text, timestamp, uuid,
  numeric, integer, boolean, index,
} from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { users } from "./auth";
import { customers } from "./customers";

// ============================================================
// WORK ORDERS — أوامر العمل
// Workshop, phone repair, laundry, tailor, field service
// ============================================================

export const workOrders = pgTable("work_orders", {
  id:          uuid("id").defaultRandom().primaryKey(),
  orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  locationId:  uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  orderNumber: text("order_number").notNull(),

  // Customer — registered or walk-in
  customerId:    uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName:  text("customer_name").notNull(),
  customerPhone: text("customer_phone"),

  // Workflow status
  // received | diagnosing | waiting_parts | in_progress | ready | delivered | cancelled
  status:   text("status").notNull().default("received"),
  // repair | service | maintenance | installation | other
  category: text("category").notNull().default("repair"),

  // Item / device being serviced
  itemName:      text("item_name").notNull(),
  itemModel:     text("item_model"),
  itemSerial:    text("item_serial"),
  itemBarcode:   text("item_barcode"),
  itemCondition: text("item_condition"),

  // Problem & outcome
  problemDescription: text("problem_description").notNull(),
  diagnosis:          text("diagnosis"),
  resolution:         text("resolution"),

  // Financials
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  finalCost:     numeric("final_cost",     { precision: 10, scale: 2 }),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  depositPaid:   boolean("deposit_paid").default(false),
  isPaid:        boolean("is_paid").default(false),

  // Warranty period in days
  warrantyDays: integer("warranty_days").default(0),

  // Financial integration
  journalEntryId: uuid("journal_entry_id"),
  paymentStatus:  text("payment_status").notNull().default("unpaid"), // unpaid | paid | refunded

  // Key dates
  estimatedReadyAt: timestamp("estimated_ready_at", { withTimezone: true }),
  confirmedAt:      timestamp("confirmed_at",       { withTimezone: true }),
  diagnosingAt:     timestamp("diagnosing_at",      { withTimezone: true }),
  waitingPartsAt:   timestamp("waiting_parts_at",   { withTimezone: true }),
  inProgressAt:     timestamp("in_progress_at",     { withTimezone: true }),
  readyAt:          timestamp("ready_at",           { withTimezone: true }),
  deliveredAt:      timestamp("delivered_at",       { withTimezone: true }),
  cancelledAt:      timestamp("cancelled_at",       { withTimezone: true }),

  // Cancellation tracking
  cancellationReason: text("cancellation_reason"),
  cancelledBy:        uuid("cancelled_by").references(() => users.id, { onDelete: "set null" }),

  // Assignment
  assignedToId:  uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  internalNotes: text("internal_notes"),

  // Optimistic locking
  version: integer("version").notNull().default(1),

  isActive:    boolean("is_active").default(true).notNull(),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("work_orders_org_idx").on(t.orgId),
  index("work_orders_status_idx").on(t.orgId, t.status),
  index("work_orders_number_idx").on(t.orgId, t.orderNumber),
  index("work_orders_customer_idx").on(t.customerId),
  index("work_orders_assigned_idx").on(t.assignedToId),
]);

// ============================================================
// ACCESS LOGS — سجل الدخول (للجيم والصالات وأماكن الاشتراكات)
// ============================================================

export const accessLogs = pgTable("access_logs", {
  id:         uuid("id").defaultRandom().primaryKey(),
  orgId:      uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),

  customerId:   uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name"),

  // method: qr | manual | card
  method: text("method").notNull().default("manual"),

  // Whether entry was granted or denied
  granted:     boolean("granted").notNull().default(true),
  denyReason:  text("deny_reason"),

  // The access token that was scanned (for QR flow)
  accessToken: text("access_token"),

  accessedAt:  timestamp("accessed_at", { withTimezone: true }).defaultNow().notNull(),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
}, (t) => [
  index("access_logs_org_idx").on(t.orgId),
  index("access_logs_accessed_at_idx").on(t.orgId, t.accessedAt),
  index("access_logs_customer_idx").on(t.customerId),
]);
