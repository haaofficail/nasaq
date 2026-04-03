import { pgTable, text, timestamp, boolean, jsonb, integer, numeric, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";

// ============================================================
// PLATFORM CONFIG — إعدادات منصة نسق (صف واحد id="default")
// ============================================================

export const platformConfig = pgTable("platform_config", {
  id:             text("id").primaryKey().default("default"),
  platformName:   text("platform_name").default("نسق"),
  logoUrl:        text("logo_url"),
  faviconUrl:     text("favicon_url"),
  primaryColor:   text("primary_color").default("#5b9bd5"),
  supportEmail:   text("support_email"),
  supportPhone:   text("support_phone"),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy:      text("updated_by"),
});

// ============================================================
// PLATFORM PLANS — باقات نسق القابلة للتعديل
// ============================================================

// ============================================================
// PLATFORM KILL SWITCHES — إيقاف ميزة للجميع فوراً
// ============================================================

export const platformKillSwitches = pgTable("platform_kill_switches", {
  id:          text("id").primaryKey(),           // e.g. "access_control", "flower_master"
  isDisabled:  boolean("is_disabled").default(false).notNull(),
  reason:      text("reason"),                    // يُعرض للمستخدم عند الإيقاف
  disabledBy:  text("disabled_by"),               // اسم الأدمن
  disabledAt:  timestamp("disabled_at", { withTimezone: true }),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// QUOTA USAGE — تتبع الاستخدام الفعلي لكل منشأة
// ============================================================

export const quotaUsage = pgTable("quota_usage", {
  id:          uuid("id").defaultRandom().primaryKey(),
  orgId:       uuid("org_id").notNull(),
  metricKey:   text("metric_key").notNull(),  // "users", "locations", "invoices_month"
  period:      text("period").notNull(),       // "2025-01" أو "all_time"
  usedCount:   integer("used_count").default(0).notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("quota_usage_unique_idx").on(table.orgId, table.metricKey, table.period),
  index("quota_usage_org_idx").on(table.orgId),
]);

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
