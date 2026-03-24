import { pgTable, text, boolean, timestamp, jsonb, uuid, integer, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// ============================================================
// SUBSCRIPTION ADD-ONS
// الإضافات المفعّلة لكل منشأة — تُدار من لوحة الأدمن
// ============================================================

export const subscriptionAddons = pgTable("subscription_addons", {
  id:             uuid("id").defaultRandom().primaryKey(),
  orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  addonKey:       text("addon_key").notNull(),           // extra_branches | loyalty | …
  addonName:      text("addon_name").notNull(),
  price:          text("price").default("0"),            // stored as text to avoid integer migration issues
  isActive:       boolean("is_active").default(true).notNull(),

  activatedAt:    timestamp("activated_at",  { withTimezone: true }).defaultNow(),
  deactivatedAt:  timestamp("deactivated_at", { withTimezone: true }),
  metadata:       jsonb("metadata").default({}),

  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("subscription_addons_org_idx").on(table.orgId),
  index("subscription_addons_key_idx").on(table.orgId, table.addonKey),
]);

// ============================================================
// SUBSCRIPTION HISTORY
// سجل الاشتراكات لكل منشأة — تجديد / تغيير باقة / …
// ============================================================

// ============================================================
// SUBSCRIPTION ORDERS
// طلبات الشراء (ترقية / تجديد / إضافة) — pending حتى يتم الدفع
// ============================================================

export const subscriptionOrders = pgTable("subscription_orders", {
  id:          uuid("id").defaultRandom().primaryKey(),
  orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  orderType:   text("order_type").notNull(),            // upgrade | addon | renewal
  itemKey:     text("item_key").notNull(),               // planKey or addonKey
  itemName:    text("item_name").notNull(),
  price:       integer("price").default(0),

  status:      text("status").default("pending_payment"), // pending_payment | paid | cancelled | expired
  paymentRef:  text("payment_ref"),                      // filled after payment

  expiresAt:   timestamp("expires_at", { withTimezone: true }), // createdAt + 24h
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("subscription_orders_org_idx").on(table.orgId),
  index("subscription_orders_status_idx").on(table.status),
]);

// ============================================================
// SUBSCRIPTION HISTORY
export const subscriptions = pgTable("subscriptions", {
  id:                 uuid("id").defaultRandom().primaryKey(),
  orgId:              uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  subscriptionNumber: text("subscription_number").unique(),
  planKey:            text("plan_key").notNull(),
  planName:           text("plan_name").notNull(),
  planPrice:          integer("plan_price").default(0),

  startDate:          timestamp("start_date", { withTimezone: true }),
  endDate:            timestamp("end_date", { withTimezone: true }),
  status:             text("status").default("active"),         // active | cancelled | expired
  notes:              text("notes"),

  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("subscriptions_org_idx").on(table.orgId),
]);
