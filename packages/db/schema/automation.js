import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
// ============================================================
// ENUMS
// ============================================================
export const automationStatusEnum = pgEnum("automation_status", [
    "active",
    "paused",
    "draft",
]);
export const notificationChannelEnum = pgEnum("notification_channel", [
    "whatsapp",
    "sms",
    "email",
    "push",
    "internal", // إشعار داخلي في لوحة التحكم
]);
export const triggerTypeEnum = pgEnum("trigger_type", [
    "event", // عند حدث معين
    "schedule", // مجدول (يومي/أسبوعي/شهري)
    "condition", // عند تحقق شرط
]);
// ============================================================
// AUTOMATION RULES — قواعد الأتمتة
// ============================================================
export const automationRules = pgTable("automation_rules", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "تأكيد الحجز الجديد"
    description: text("description"),
    // Status
    status: automationStatusEnum("status").default("draft").notNull(),
    // Trigger
    triggerType: triggerTypeEnum("trigger_type").notNull(),
    triggerEvent: text("trigger_event"), // booking.created, payment.received, booking.status_changed
    triggerSchedule: text("trigger_schedule"), // cron expression: "0 8 * * *" (daily at 8am)
    // Conditions (optional — filter when trigger fires)
    conditions: jsonb("conditions").default([]),
    /*
      [
        { field: "booking.totalAmount", op: "gt", value: 5000 },
        { field: "booking.status", op: "eq", value: "confirmed" },
      ]
    */
    // Actions (what to do when triggered)
    actions: jsonb("actions").notNull(),
    /*
      [
        { type: "send_notification", channel: "whatsapp", templateId: "tpl-123" },
        { type: "update_status", resource: "booking", newStatus: "confirmed" },
        { type: "create_task", taskType: "setup", assignTo: "auto" },
        { type: "wait", duration: "24h" },
        { type: "send_notification", channel: "sms", templateId: "tpl-456" },
      ]
    */
    // Stats
    timesTriggered: integer("times_triggered").default(0),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// NOTIFICATION TEMPLATES — قوالب الإشعارات
// ============================================================
export const notificationTemplates = pgTable("notification_templates", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "تأكيد حجز"
    channel: notificationChannelEnum("channel").notNull(),
    // Content
    subject: text("subject"), // لـ البريد
    body: text("body").notNull(), // النص مع متغيرات: "مرحباً {customer_name}، تم تأكيد حجزك..."
    // Variables available
    availableVariables: jsonb("available_variables").default([]),
    /*
      ["customer_name", "booking_number", "service_name", "event_date", "total_amount",
       "paid_amount", "balance_due", "payment_link", "tracking_link", "org_name", "org_phone"]
    */
    // WhatsApp specific
    whatsappTemplateName: text("whatsapp_template_name"), // اسم القالب المعتمد من Meta
    whatsappTemplateLanguage: text("whatsapp_template_language").default("ar"),
    // Category
    category: text("category"), // confirmation, reminder, payment, review, promotion
    isActive: boolean("is_active").default(true).notNull(),
    isSystem: boolean("is_system").default(false), // قوالب النظام الافتراضية
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// NOTIFICATION LOG — سجل الإشعارات المرسلة
// ============================================================
export const notificationLogs = pgTable("notification_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    // Template
    templateId: uuid("template_id").references(() => notificationTemplates.id),
    automationRuleId: uuid("automation_rule_id").references(() => automationRules.id),
    // Recipient
    recipientType: text("recipient_type"), // customer, user, vendor
    recipientId: text("recipient_id"),
    recipientContact: text("recipient_contact"), // الرقم/البريد الفعلي
    // Channel
    channel: notificationChannelEnum("channel").notNull(),
    // Content (snapshot)
    subject: text("subject"),
    body: text("body").notNull(),
    // Status
    status: text("status").default("pending").notNull(), // pending, sent, delivered, read, failed
    errorMessage: text("error_message"),
    // Provider response
    providerMessageId: text("provider_message_id"),
    providerResponse: jsonb("provider_response"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// WORKFLOW DEFINITIONS — مسارات العمل المرئية
// ============================================================
export const workflows = pgTable("workflows", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // Visual builder state (nodes + edges)
    definition: jsonb("definition").notNull(),
    /*
      {
        nodes: [
          { id: "1", type: "trigger", data: { event: "booking.created" }, position: { x: 0, y: 0 } },
          { id: "2", type: "condition", data: { field: "totalAmount", op: "gt", value: 5000 }, position: { x: 0, y: 100 } },
          { id: "3", type: "action", data: { type: "send_notification", templateId: "..." }, position: { x: -100, y: 200 } },
          { id: "4", type: "action", data: { type: "create_approval", ... }, position: { x: 100, y: 200 } },
        ],
        edges: [
          { source: "1", target: "2" },
          { source: "2", target: "3", label: "لا" },
          { source: "2", target: "4", label: "نعم" },
        ]
      }
    */
    status: automationStatusEnum("status").default("draft").notNull(),
    timesExecuted: integer("times_executed").default(0),
    lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// SCHEDULED JOBS — الإجراءات المجدولة
// ============================================================
export const scheduledJobs = pgTable("scheduled_jobs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "تقرير مبيعات أسبوعي"
    // Schedule
    cronExpression: text("cron_expression").notNull(), // "0 8 * * 0" = Sunday 8am
    timezone: text("timezone").default("Asia/Riyadh"),
    // Action
    actionType: text("action_type").notNull(), // send_report, auto_cancel, refresh_segments, send_reminders
    actionConfig: jsonb("action_config").default({}),
    // Status
    isActive: boolean("is_active").default(true).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastRunStatus: text("last_run_status"), // success, failed
    lastRunError: text("last_run_error"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=automation.js.map