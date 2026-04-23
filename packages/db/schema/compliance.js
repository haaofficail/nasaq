import { pgTable, uuid, text, boolean, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
// ============================================================
// ENUMS
// ============================================================
export const privacyRequestTypeEnum = pgEnum("privacy_request_type", ["export", "delete"]);
export const privacyRequestStatusEnum = pgEnum("privacy_request_status", [
    "pending",
    "processing",
    "completed",
    "rejected",
]);
export const securityIncidentSeverityEnum = pgEnum("security_incident_severity", [
    "low",
    "medium",
    "high",
    "critical",
]);
// ============================================================
// ORGANIZATION LEGAL SETTINGS (إعدادات قانونية لكل منشأة)
// PDPL + نظام التجارة الإلكترونية م/69
// ============================================================
export const organizationLegalSettings = pgTable("organization_legal_settings", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),
    // بيانات المنشأة القانونية
    businessName: text("business_name"),
    commercialRegistration: text("commercial_registration"), // رقم السجل التجاري
    vatNumber: text("vat_number"), // الرقم الضريبي 15 رقم
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    // سياسات الخدمة
    refundPolicy: text("refund_policy"), // سياسة الاسترداد
    cancellationPolicy: text("cancellation_policy"), // سياسة الإلغاء
    // إعدادات الخصوصية (PDPL)
    dataRetentionDays: integer("data_retention_days").default(365),
    allowDataExport: boolean("allow_data_export").default(true),
    allowDataDeletion: boolean("allow_data_deletion").default(true),
    dpoEmail: text("dpo_email"), // مسؤول حماية البيانات
    // روابط الصفحات القانونية
    privacyPolicyUrl: text("privacy_policy_url"),
    termsUrl: text("terms_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
// ============================================================
// PRIVACY REQUESTS (طلبات حقوق البيانات — PDPL المادة 11-16)
// ============================================================
export const privacyRequests = pgTable("privacy_requests", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    type: privacyRequestTypeEnum("type").notNull(), // export | delete
    status: privacyRequestStatusEnum("status").default("pending").notNull(),
    // بيانات مقدّم الطلب
    requesterName: text("requester_name"),
    requesterEmail: text("requester_email"),
    requesterPhone: text("requester_phone"),
    notes: text("notes"),
    // معالجة الطلب
    processedBy: uuid("processed_by"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
    orgIdx: index("idx_privacy_requests_org_id").on(t.orgId),
    statusIdx: index("idx_privacy_requests_status").on(t.status),
}));
// ============================================================
// SECURITY INCIDENTS (سجل حوادث الأمان — PDPL المادة 20)
// الإخطار خلال 72 ساعة لـ NDMO/SDAIA
// ============================================================
export const securityIncidents = pgTable("security_incidents", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    type: text("type").notNull(), // data_breach | unauthorized_access | phishing | etc
    description: text("description").notNull(),
    severity: securityIncidentSeverityEnum("severity").notNull(),
    affectedData: text("affected_data"), // وصف البيانات المتأثرة
    actionsTaken: text("actions_taken"), // الإجراءات المتخذة
    // الإخطار لـ NDMO (مطلوب خلال 72 ساعة للحوادث الجسيمة — PDPL م/20)
    reportedToNdmo: boolean("reported_to_ndmo").default(false),
    ndmoReportedAt: timestamp("ndmo_reported_at", { withTimezone: true }),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow(),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
    orgIdx: index("idx_security_incidents_org_id").on(t.orgId),
    severityIdx: index("idx_security_incidents_severity").on(t.severity),
}));
//# sourceMappingURL=compliance.js.map