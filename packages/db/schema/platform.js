import { pgTable, text, timestamp, boolean, jsonb, integer, numeric, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
// ============================================================
// PLATFORM CONFIG — إعدادات منصة نسق (صف واحد id="default")
// ============================================================
export const platformConfig = pgTable("platform_config", {
    id: text("id").primaryKey().default("default"),
    platformName: text("platform_name").default("نسق"),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    primaryColor: text("primary_color").default("#5b9bd5"),
    supportEmail: text("support_email"),
    supportPhone: text("support_phone"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: text("updated_by"),
});
// ============================================================
// PLATFORM PLANS — باقات نسق القابلة للتعديل
// ============================================================
// ============================================================
// PLATFORM KILL SWITCHES — إيقاف ميزة للجميع فوراً
// ============================================================
export const platformKillSwitches = pgTable("platform_kill_switches", {
    id: text("id").primaryKey(), // e.g. "access_control", "flower_master"
    isDisabled: boolean("is_disabled").default(false).notNull(),
    reason: text("reason"), // يُعرض للمستخدم عند الإيقاف
    disabledBy: text("disabled_by"), // اسم الأدمن
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// QUOTA USAGE — تتبع الاستخدام الفعلي لكل منشأة
// ============================================================
export const quotaUsage = pgTable("quota_usage", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull(),
    metricKey: text("metric_key").notNull(), // "users", "locations", "invoices_month"
    period: text("period").notNull(), // "2025-01" أو "all_time"
    usedCount: integer("used_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("quota_usage_unique_idx").on(table.orgId, table.metricKey, table.period),
    index("quota_usage_org_idx").on(table.orgId),
]);
// ============================================================
// PLATFORM PLANS — باقات نسق القابلة للتعديل
// ============================================================
export const platformPlans = pgTable("platform_plans", {
    id: text("id").primaryKey(), // basic, advanced, pro, enterprise
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en"),
    priceMonthly: numeric("price_monthly", { precision: 10, scale: 2 }).default("0"),
    priceYearly: numeric("price_yearly", { precision: 10, scale: 2 }).default("0"),
    currency: text("currency").default("SAR"),
    trialDays: integer("trial_days").default(14),
    maxUsers: integer("max_users").default(5),
    maxLocations: integer("max_locations").default(1),
    features: jsonb("features").default([]), // display features list
    capabilities: jsonb("capabilities").default([]), // default enabled capabilities
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// ADMIN WA TEMPLATES — قوالب واتساب السوبر أدمن
// ============================================================
export const adminWaTemplates = pgTable("admin_wa_templates", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    category: text("category").default("general").notNull(), // general | credentials | offer | notice | renewal
    body: text("body").notNull(),
    variables: jsonb("variables").default([]),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// ADMIN WA MESSAGES — سجل رسائل واتساب الأدمن
// ============================================================
export const adminWaMessages = pgTable("admin_wa_messages", {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").notNull(),
    orgId: uuid("org_id"),
    recipientPhone: text("recipient_phone").notNull(),
    recipientName: text("recipient_name"),
    templateId: uuid("template_id"),
    messageText: text("message_text").notNull(),
    channel: text("channel").default("whatsapp").notNull(),
    status: text("status").default("pending").notNull(), // pending | sent | failed
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    // invite extensions
    attachmentUrl: text("attachment_url"),
    category: text("category").default("general").notNull(), // general | invite | ...
    providerMessageId: text("provider_message_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("idx_admin_wa_messages_admin").on(table.adminId),
    index("idx_admin_wa_messages_org").on(table.orgId),
    index("idx_admin_wa_messages_created").on(table.createdAt),
    index("idx_admin_wa_messages_category").on(table.category),
    index("idx_admin_wa_messages_phone").on(table.recipientPhone),
]);
//# sourceMappingURL=platform.js.map