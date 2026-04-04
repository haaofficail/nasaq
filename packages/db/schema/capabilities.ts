import { pgTable, text, boolean, timestamp, uuid, uniqueIndex, varchar } from "drizzle-orm/pg-core";

// ============================================================
// CAPABILITY REGISTRY
// Master list of all possible capabilities with metadata
// ============================================================

// ============================================================
// PLAN CAPABILITIES
// Maps which capabilities are included in each plan by default.
// This is the authoritative source for plan-level feature access.
// ============================================================

export const planCapabilities = pgTable("plan_capabilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  planCode: varchar("plan_code", { length: 20 }).notNull(),      // "free" | "basic" | "advanced" | "pro" | "enterprise"
  capabilityKey: text("capability_key").notNull(),               // FK to capability_registry.key
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("plan_capabilities_unique_idx").on(table.planCode, table.capabilityKey),
]);

// Global reference data — not tenant-scoped by design
export const capabilityRegistry = pgTable("capability_registry", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),                        // "inventory" | "pos" | "hotel"
  labelAr: text("label_ar").notNull(),
  labelEn: text("label_en").notNull(),
  description: text("description"),
  category: text("category").notNull(),              // core | vertical | financial | marketing | operational
  requires: text("requires").array(),                // capability keys that must also be enabled
  isPremium: boolean("is_premium").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("capability_registry_key_idx").on(table.key),
]);
