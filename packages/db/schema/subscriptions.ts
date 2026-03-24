import { pgTable, text, boolean, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core";
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
