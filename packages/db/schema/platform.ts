import { pgTable, text, timestamp, boolean, jsonb, integer, numeric } from "drizzle-orm/pg-core";

// ============================================================
// PLATFORM PLANS — باقات نسق القابلة للتعديل
// ============================================================

export const platformPlans = pgTable("platform_plans", {
  id: text("id").primaryKey(),           // basic, advanced, pro, enterprise
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }).default("0"),
  priceYearly: numeric("price_yearly", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").default("SAR"),
  trialDays: integer("trial_days").default(14),
  maxUsers: integer("max_users").default(5),
  maxLocations: integer("max_locations").default(1),
  features: jsonb("features").default([]),       // display features list
  capabilities: jsonb("capabilities").default([]), // default enabled capabilities
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
