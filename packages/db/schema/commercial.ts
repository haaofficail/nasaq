import { pgTable, text, boolean, integer, numeric, uuid, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const featureGroups = pgTable("feature_groups", {
  id:        text("id").primaryKey(),
  nameAr:    text("name_ar").notNull(),
  nameEn:    text("name_en"),
  icon:      text("icon"),
  sortOrder: integer("sort_order").default(0),
  isActive:  boolean("is_active").default(true),
});

export const featuresCatalog = pgTable("features_catalog", {
  id:            text("id").primaryKey(),
  groupId:       text("group_id").references(() => featureGroups.id, { onDelete: "set null" }),
  nameAr:        text("name_ar").notNull(),
  nameEn:        text("name_en"),
  descriptionAr: text("description_ar"),
  type:          text("type").default("toggle"),
  icon:          text("icon"),
  isCore:        boolean("is_core").default(false),
  isPremium:     boolean("is_premium").default(false),
  isEnterprise:  boolean("is_enterprise").default(false),
  isActive:      boolean("is_active").default(true),
  sortOrder:     integer("sort_order").default(0),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const quotasCatalog = pgTable("quotas_catalog", {
  id:            text("id").primaryKey(),
  nameAr:        text("name_ar").notNull(),
  nameEn:        text("name_en"),
  unitAr:        text("unit_ar"),
  descriptionAr: text("description_ar"),
  defaultValue:  integer("default_value").default(0),
  hardCap:       integer("hard_cap"),
  softLimit:     boolean("soft_limit").default(false),
  overagePolicy: text("overage_policy").default("block"),
  overagePrice:  numeric("overage_price", { precision: 10, scale: 2 }),
  isActive:      boolean("is_active").default(true),
  sortOrder:     integer("sort_order").default(0),
});

export const planFeatures = pgTable("plan_features", {
  id:        uuid("id").defaultRandom().primaryKey(),
  planId:    text("plan_id").notNull(),
  featureId: text("feature_id").notNull().references(() => featuresCatalog.id, { onDelete: "cascade" }),
  enabled:   boolean("enabled").default(true),
  config:    jsonb("config").default({}),
});

export const planQuotas = pgTable("plan_quotas", {
  id:      uuid("id").defaultRandom().primaryKey(),
  planId:  text("plan_id").notNull(),
  quotaId: text("quota_id").notNull().references(() => quotasCatalog.id, { onDelete: "cascade" }),
  value:   integer("value").notNull().default(0),
});

export const addOns = pgTable("add_ons", {
  id:             uuid("id").defaultRandom().primaryKey(),
  key:            text("key").unique().notNull(),
  nameAr:         text("name_ar").notNull(),
  nameEn:         text("name_en"),
  descriptionAr:  text("description_ar"),
  type:           text("type").notNull(),
  targetFeature:  text("target_feature").references(() => featuresCatalog.id, { onDelete: "set null" }),
  targetQuota:    text("target_quota").references(() => quotasCatalog.id, { onDelete: "set null" }),
  quotaIncrement: integer("quota_increment").default(0),
  priceMonthly:   numeric("price_monthly", { precision: 10, scale: 2 }).default("0"),
  priceYearly:    numeric("price_yearly", { precision: 10, scale: 2 }).default("0"),
  priceOneTime:   numeric("price_one_time", { precision: 10, scale: 2 }).default("0"),
  billingCycle:   text("billing_cycle").default("monthly"),
  isFree:         boolean("is_free").default(false),
  isRecurring:    boolean("is_recurring").default(true),
  maxQuantity:    integer("max_quantity").default(99),
  allowedPlans:   jsonb("allowed_plans").default([]),
  isActive:       boolean("is_active").default(true),
  sortOrder:      integer("sort_order").default(0),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tenantAddOns = pgTable("tenant_add_ons", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  addOnId:       uuid("add_on_id").notNull().references(() => addOns.id, { onDelete: "cascade" }),
  quantity:      integer("quantity").default(1),
  priceOverride: numeric("price_override", { precision: 10, scale: 2 }),
  isFree:        boolean("is_free").default(false),
  grantedBy:     uuid("granted_by"),
  startsAt:      timestamp("starts_at", { withTimezone: true }).defaultNow(),
  endsAt:        timestamp("ends_at", { withTimezone: true }),
  isPermanent:   boolean("is_permanent").default(false),
  isActive:      boolean("is_active").default(true),
  notes:         text("notes"),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tenantFeatureOverrides = pgTable("tenant_feature_overrides", {
  id:          uuid("id").defaultRandom().primaryKey(),
  orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  featureId:   text("feature_id").notNull().references(() => featuresCatalog.id, { onDelete: "cascade" }),
  enabled:     boolean("enabled").notNull(),
  reason:      text("reason"),
  grantedBy:   uuid("granted_by"),
  startsAt:    timestamp("starts_at", { withTimezone: true }).defaultNow(),
  endsAt:      timestamp("ends_at", { withTimezone: true }),
  isPermanent: boolean("is_permanent").default(false),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tenantQuotaOverrides = pgTable("tenant_quota_overrides", {
  id:          uuid("id").defaultRandom().primaryKey(),
  orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  quotaId:     text("quota_id").notNull().references(() => quotasCatalog.id, { onDelete: "cascade" }),
  value:       integer("value").notNull(),
  reason:      text("reason"),
  grantedBy:   uuid("granted_by"),
  startsAt:    timestamp("starts_at", { withTimezone: true }).defaultNow(),
  endsAt:      timestamp("ends_at", { withTimezone: true }),
  isPermanent: boolean("is_permanent").default(false),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tenantGrants = pgTable("tenant_grants", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type:          text("type").notNull(),
  targetId:      text("target_id"),
  value:         jsonb("value").default({}),
  nameAr:        text("name_ar").notNull(),
  reason:        text("reason").notNull(),
  grantedBy:     uuid("granted_by"),
  startsAt:      timestamp("starts_at", { withTimezone: true }).defaultNow(),
  endsAt:        timestamp("ends_at", { withTimezone: true }),
  isPermanent:   boolean("is_permanent").default(false),
  billingEffect: text("billing_effect").default("free"),
  isActive:      boolean("is_active").default(true),
  revokedAt:     timestamp("revoked_at", { withTimezone: true }),
  revokedBy:     uuid("revoked_by"),
  revokeReason:  text("revoke_reason"),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const discounts = pgTable("discounts", {
  id:           uuid("id").defaultRandom().primaryKey(),
  name:         text("name").notNull(),
  type:         text("type").notNull(),
  value:        numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  targetScope:  text("target_scope").notNull(),
  targetId:     text("target_id"),
  billingCycle: text("billing_cycle").default("all"),
  startsAt:     timestamp("starts_at", { withTimezone: true }),
  endsAt:       timestamp("ends_at", { withTimezone: true }),
  isPermanent:  boolean("is_permanent").default(false),
  isStackable:  boolean("is_stackable").default(false),
  isActive:     boolean("is_active").default(true),
  reason:       text("reason"),
  createdBy:    uuid("created_by"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const promotions = pgTable("promotions", {
  id:             uuid("id").defaultRandom().primaryKey(),
  name:           text("name").notNull(),
  descriptionAr:  text("description_ar"),
  internalKey:    text("internal_key").unique(),
  type:           text("type").notNull(),
  value:          numeric("value", { precision: 10, scale: 2 }).default("0"),
  couponCode:     text("coupon_code").unique(),
  isAutomatic:    boolean("is_automatic").default(false),
  priority:       integer("priority").default(0),
  isStackable:    boolean("is_stackable").default(false),
  targetPlans:    jsonb("target_plans").default([]),
  billingCycle:   text("billing_cycle"),
  usageLimit:     integer("usage_limit"),
  usageCount:     integer("usage_count").default(0),
  startsAt:       timestamp("starts_at", { withTimezone: true }),
  endsAt:         timestamp("ends_at", { withTimezone: true }),
  isActive:       boolean("is_active").default(true),
  freeFeatures:   jsonb("free_features").default([]),
  freePeriodDays: integer("free_period_days").default(0),
  createdBy:      uuid("created_by"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const promotionRedemptions = pgTable("promotion_redemptions", {
  id:             uuid("id").defaultRandom().primaryKey(),
  promotionId:    uuid("promotion_id").notNull().references(() => promotions.id, { onDelete: "cascade" }),
  orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  appliedBy:      uuid("applied_by"),
  appliedAt:      timestamp("applied_at", { withTimezone: true }).defaultNow(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  notes:          text("notes"),
});

export const billingOverrides = pgTable("billing_overrides", {
  id:                  uuid("id").defaultRandom().primaryKey(),
  orgId:               uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  billingMode:         text("billing_mode").notNull().default("standard"),
  customPriceMonthly:  numeric("custom_price_monthly", { precision: 10, scale: 2 }),
  customPriceYearly:   numeric("custom_price_yearly", { precision: 10, scale: 2 }),
  billingCycle:        text("billing_cycle"),
  paymentTerms:        text("payment_terms"),
  invoiceNotes:        text("invoice_notes"),
  contractStart:       timestamp("contract_start", { withTimezone: true }),
  contractEnd:         timestamp("contract_end", { withTimezone: true }),
  isBillingPaused:     boolean("is_billing_paused").default(false),
  reason:              text("reason").notNull(),
  createdBy:           uuid("created_by"),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const ruleDefinitions = pgTable("rule_definitions", {
  id:          uuid("id").defaultRandom().primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  trigger:     text("trigger").notNull(),
  conditions:  jsonb("conditions").default([]),
  actions:     jsonb("actions").default([]),
  priority:    integer("priority").default(0),
  scope:       text("scope").default("global"),
  targetId:    text("target_id"),
  isActive:    boolean("is_active").default(true),
  createdBy:   uuid("created_by"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
});
