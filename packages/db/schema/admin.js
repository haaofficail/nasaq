import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
// ============================================================
// ORG IN-APP ALERTS — تنبيهات داخل الداشبورد
// ============================================================
export const orgAlerts = pgTable("org_alerts", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = all org users
    type: text("type").notNull(), // booking_new | booking_cancelled | support_reply | subscription_expiry | payment_due
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"), // رابط داخلي للانتقال إليه عند الضغط
    isRead: boolean("is_read").default(false).notNull(),
    priority: text("priority").default("normal"), // low | normal | high | urgent
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("org_alerts_org_idx").on(t.orgId),
    index("org_alerts_user_idx").on(t.userId),
    index("org_alerts_read_idx").on(t.isRead),
]);
// ============================================================
// PLATFORM AUDIT LOG — سجل أعمال السوبر أدمن
// ============================================================
export const platformAuditLog = pgTable("platform_audit_log", {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").notNull().references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // verify_org, suspend_org, change_plan, impersonate, ...
    targetType: text("target_type").notNull(), // org, user, ticket, announcement
    targetId: text("target_id"),
    details: jsonb("details").default({}),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("platform_audit_admin_idx").on(table.adminId),
    index("platform_audit_target_idx").on(table.targetType, table.targetId),
]);
// ============================================================
// ORG DOCUMENTS — وثائق KYC للمنشآت
// ============================================================
export const orgDocuments = pgTable("org_documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // commercial_register, vat_certificate, id_copy, other
    label: text("label"),
    fileUrl: text("file_url").notNull(),
    documentNumber: text("document_number"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: text("status").default("pending").notNull(), // pending, approved, rejected
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    notes: text("notes"),
    rejectionReason: text("rejection_reason"),
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("org_documents_org_idx").on(table.orgId),
]);
// ============================================================
// SUPPORT TICKETS — تذاكر الدعم الفني
// ============================================================
export const supportTickets = pgTable("support_tickets", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    openedBy: uuid("opened_by").references(() => users.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    category: text("category").default("general"), // general, billing, technical, onboarding
    priority: text("priority").default("normal"), // low, normal, high, urgent
    status: text("status").default("open").notNull(), // open, in_progress, resolved, closed
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    messages: jsonb("messages").default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("support_tickets_org_idx").on(table.orgId),
    index("support_tickets_status_idx").on(table.status),
]);
// ============================================================
// PLATFORM ANNOUNCEMENTS — إعلانات للمنشآت
// ============================================================
export const platformAnnouncements = pgTable("platform_announcements", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: text("type").default("info"), // info, warning, maintenance, feature
    targetPlan: text("target_plan"), // NULL = all plans
    isActive: boolean("is_active").default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// SYSTEM HEALTH LOG — سجل صحة النظام
// ============================================================
export const systemHealthLog = pgTable("system_health_log", {
    id: uuid("id").defaultRandom().primaryKey(),
    apiLatencyMs: integer("api_latency_ms"),
    dbLatencyMs: integer("db_latency_ms"),
    errorRate: numeric("error_rate", { precision: 5, scale: 2 }),
    activeOrgs: integer("active_orgs"),
    activeSessions: integer("active_sessions"),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("system_health_time_idx").on(table.recordedAt),
]);
//# sourceMappingURL=admin.js.map