import { pgTable, text, timestamp, pgEnum, uuid, integer } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
// ============================================================
// ENUMS
// ============================================================
export const notificationTypeEnum = pgEnum("notification_type", [
    "auto", "manual", "scheduled", "broadcast",
]);
// ============================================================
// PUSH SUBSCRIPTIONS — اشتراكات الإشعارات
// ============================================================
export const pushSubscriptions = pgTable("push_subscriptions", {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    platform: text("platform").default("web"), // "web" | "ios" | "android"
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
// ============================================================
// NOTIFICATION LOG — سجل الإشعارات
// ============================================================
export const notificationLog = pgTable("notification_log", {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: notificationTypeEnum("type").notNull().default("auto"),
    recipientCount: integer("recipient_count").notNull().default(0),
    createdBy: uuid("created_by"), // nullable — null for auto notifications
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
// ============================================================
// SCHEDULED NOTIFICATIONS — الإشعارات المجدولة
// ============================================================
export const scheduledNotifications = pgTable("scheduled_notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"), // "pending" | "sent" | "cancelled"
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
//# sourceMappingURL=notifications.js.map