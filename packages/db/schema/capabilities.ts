import { pgTable, text, boolean, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

// ============================================================
// CAPABILITY REGISTRY
// Master list of all possible capabilities with metadata
// ============================================================

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
