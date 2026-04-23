import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
// ============================================================
// ENUMS
// ============================================================
export const integrationTypeEnum = pgEnum("integration_type", [
    "booking_channel", // قناة حجز خارجية (gatherin, booking.com)
    "food_delivery", // توصيل طلبات (hungerstation, jahez)
    "last_mile", // شركة شحن (smsa, naq, toyou)
    "messaging", // مراسلة (whatsapp, sms)
    "payments", // دفع (moyasar, stripe, paypal)
    "calendar", // تقويم (google calendar)
    "automation", // أتمتة (zapier, n8n)
    "ota", // قناة حجز فندقي (booking.com, airbnb)
    "analytics", // تحليلات (google analytics, mixpanel)
    "custom_webhook", // webhook مخصص
]);
export const integrationStatusEnum = pgEnum("integration_status", [
    "active",
    "inactive",
    "error",
    "pending_setup",
    "expired",
]);
export const syncJobStatusEnum = pgEnum("sync_job_status", [
    "queued",
    "running",
    "completed",
    "failed",
    "cancelled",
]);
// ============================================================
// INTEGRATION PROVIDER REGISTRY — ثابت في الكود، لا جدول
// ============================================================
// يُعرَّف هذا في packages/api/src/lib/integration-providers.ts
// ============================================================
// INTEGRATION CONFIGS — إعدادات التكامل لكل org
// ============================================================
export const integrationConfigs = pgTable("integration_configs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }), // فرع معين أو null = جميع
    // Provider
    providerId: text("provider_id").notNull(), // gatherin, hungerstation, smsa, whatsapp, etc.
    integrationName: text("integration_name"), // اسم مخصص للتكامل
    integrationType: integrationTypeEnum("integration_type").notNull(),
    // Credentials (مشفَّرة في الإنتاج — نخزن كـ JSON مشفر)
    credentials: jsonb("credentials").default({}), // {"api_key": "...", "webhook_secret": "..."}
    // Mappings
    entityMappings: jsonb("entity_mappings").default({}), // {"external_id": "internal_id"}
    // Settings
    settings: jsonb("settings").default({}), // إعدادات خاصة بالمزود
    // Status
    status: integrationStatusEnum("status").default("pending_setup").notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastError: text("last_error"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("integration_configs_org_idx").on(table.orgId),
    index("integration_configs_provider_idx").on(table.providerId),
]);
// ============================================================
// WEBHOOK LOGS — سجل الـ Webhooks الواردة والصادرة
// ============================================================
export const webhookLogs = pgTable("webhook_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    integrationConfigId: uuid("integration_config_id").references(() => integrationConfigs.id, { onDelete: "set null" }),
    direction: text("direction").notNull(), // inbound | outbound
    providerId: text("provider_id"),
    eventType: text("event_type"), // new_booking, order_status, delivery_update
    // Request/response
    headers: jsonb("headers").default({}),
    payload: jsonb("payload"),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    // Processing
    processed: boolean("processed").default(false),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    retryCount: integer("retry_count").default(0),
    // Linked internal entity
    internalEntityType: text("internal_entity_type"), // booking, reservation, order
    internalEntityId: text("internal_entity_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("webhook_logs_org_idx").on(table.orgId),
    index("webhook_logs_created_idx").on(table.createdAt),
]);
// ============================================================
// SYNC JOBS — مهام المزامنة المجدولة
// ============================================================
export const syncJobs = pgTable("sync_jobs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    integrationConfigId: uuid("integration_config_id").references(() => integrationConfigs.id, { onDelete: "cascade" }),
    jobType: text("job_type").notNull(), // sync_catalog, sync_availability, pull_orders, push_status
    status: syncJobStatusEnum("status").default("queued").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Results
    recordsProcessed: integer("records_processed").default(0),
    recordsCreated: integer("records_created").default(0),
    recordsUpdated: integer("records_updated").default(0),
    recordsFailed: integer("records_failed").default(0),
    errorSummary: text("error_summary"),
    triggeredBy: text("triggered_by").default("scheduler"), // scheduler, manual, webhook
    retryCount: integer("retry_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("sync_jobs_org_idx").on(table.orgId),
]);
// ============================================================
// INTEGRATIONS — جدول التكاملات الموحد (الجيل الثاني)
// ============================================================
export const integrations = pgTable("integrations", {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull().default("inactive"),
    credentials: jsonb("credentials").default({}),
    config: jsonb("config").default({}),
    webhookUrl: text("webhook_url"),
    webhookSecret: text("webhook_secret"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("integrations_org_id_idx").on(table.orgId),
]);
// ============================================================
// INTEGRATION LOGS — سجل الطلبات الواردة والصادرة
// ============================================================
export const integrationLogs = pgTable("integration_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id"),
    direction: text("direction").notNull(),
    endpoint: text("endpoint"),
    method: text("method"),
    requestBody: jsonb("request_body"),
    responseBody: jsonb("response_body"),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("integration_logs_org_id_idx").on(table.orgId),
    index("integration_logs_integration_id_idx").on(table.integrationId),
    index("integration_logs_created_at_idx").on(table.createdAt),
]);
//# sourceMappingURL=integrations.js.map