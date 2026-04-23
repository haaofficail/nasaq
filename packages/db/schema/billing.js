import { pgTable, uuid, varchar, decimal, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
// ============================================================
// PRICING PLANS — الباقات والأسعار الرئيسية
// NOTE: plan_features already exists linked to features_catalog
//       → using pricing_plan_features for the simpler plan-based features
// NOTE: addons already exists as org-scoped service addons
//       → using plan_addons for plan-level vertical addons
// ============================================================
export const plans = pgTable("plans", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    nameAr: varchar("name_ar", { length: 50 }).notNull(),
    nameEn: varchar("name_en", { length: 50 }).notNull(),
    priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull(),
    priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }).notNull(),
    originalPriceMonthly: decimal("original_price_monthly", { precision: 10, scale: 2 }),
    originalPriceYearly: decimal("original_price_yearly", { precision: 10, scale: 2 }),
    maxBranches: integer("max_branches").notNull().default(1),
    maxEmployees: integer("max_employees").notNull().default(10),
    trialDays: integer("trial_days").notNull().default(0),
    isLaunchOffer: boolean("is_launch_offer").default(true),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
});
export const pricingPlanFeatures = pgTable("pricing_plan_features", {
    id: uuid("id").primaryKey().defaultRandom(),
    planCode: varchar("plan_code", { length: 20 }).notNull(),
    featureKey: varchar("feature_key", { length: 100 }).notNull(),
    isIncluded: boolean("is_included").default(false),
});
export const planAddons = pgTable("plan_addons", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    nameAr: varchar("name_ar", { length: 100 }).notNull(),
    nameEn: varchar("name_en", { length: 100 }).notNull(),
    descriptionAr: varchar("description_ar", { length: 255 }),
    priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
});
export const resourceAddons = pgTable("resource_addons", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    nameAr: varchar("name_ar", { length: 100 }).notNull(),
    priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
    priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }),
    unitAr: varchar("unit_ar", { length: 50 }),
    quantity: integer("quantity").default(1),
    createdAt: timestamp("created_at").defaultNow(),
});
export const orgAddons = pgTable("org_addons", {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    addonCode: varchar("addon_code", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("active"),
    startedAt: timestamp("started_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
});
export const orgResourceAddons = pgTable("org_resource_addons", {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    resourceCode: varchar("resource_code", { length: 50 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    status: varchar("status", { length: 20 }).default("active"),
    startedAt: timestamp("started_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
});
//# sourceMappingURL=billing.js.map