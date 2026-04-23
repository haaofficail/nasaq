import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { DEFAULT_EXPIRY_HOURS } from "../constants";
// ============================================================
// APPROVAL SYSTEM
// ============================================================
export const approvalStatusEnum = pgEnum("approval_status", [
    "pending", // بانتظار الموافقة
    "approved", // تمت الموافقة
    "rejected", // مرفوض
    "expired", // انتهت الصلاحية
]);
// ============================================================
// APPROVAL RULES
// قواعد تحدد متى يُطلب الموافقة
// ============================================================
export const approvalRules = pgTable("approval_rules", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "خصم أكثر من 15%"
    description: text("description"),
    // Trigger: when this condition is met
    triggerResource: text("trigger_resource").notNull(), // booking, payment, service
    triggerAction: text("trigger_action").notNull(), // cancel, edit_price, refund, discount
    triggerCondition: jsonb("trigger_condition").notNull(),
    /*
      Examples:
      { field: "discountPercent", op: "gt", value: 15 }
      { field: "totalAmount", op: "gt", value: 5000 }
      { field: "refundAmount", op: "gt", value: 0 }
    */
    // Who needs to approve
    approverRoleId: uuid("approver_role_id"), // الدور المطلوب موافقته
    approverUserId: uuid("approver_user_id"), // أو مستخدم محدد
    // Settings
    expiryHours: integer("expiry_hours").default(DEFAULT_EXPIRY_HOURS), // ينتهي بعد X ساعة
    isActive: boolean("is_active").default(true).notNull(),
    priority: integer("priority").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// APPROVAL REQUESTS
// طلبات الموافقة الفعلية
// ============================================================
export const approvalRequests = pgTable("approval_requests", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id").references(() => approvalRules.id),
    // What needs approval
    resource: text("resource").notNull(), // booking, payment
    resourceId: text("resource_id").notNull(), // ID of the record
    action: text("action").notNull(), // cancel, edit_price, refund
    // Context
    description: text("description").notNull(), // "إلغاء حجز NSQ-2026-A1B2 — المبلغ: 16,000 ر.س"
    requestData: jsonb("request_data"), // البيانات المطلوب تغييرها
    // Requester
    requestedBy: uuid("requested_by").notNull().references(() => users.id),
    // Approver
    approverRoleId: uuid("approver_role_id"),
    approverUserId: uuid("approver_user_id"),
    // Status
    status: approvalStatusEnum("status").default("pending").notNull(),
    // Resolution
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"), // ملاحظة الموافق/الرافض
    // Expiry
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=approvals.js.map