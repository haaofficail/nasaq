import {
  pgTable, text, timestamp, pgEnum, uuid, jsonb, index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

// ============================================================
// ENUMS
// ============================================================

export const auditActionEnum = pgEnum("audit_action", [
  "create",  // إنشاء
  "update",  // تعديل
  "delete",  // حذف
  "view",    // عرض (للتقارير الحساسة)
  "login",   // تسجيل الدخول
  "logout",  // تسجيل الخروج
  "post",    // ترحيل قيد
  "reverse", // عكس قيد
  "close",   // إغلاق فترة
  "lock",    // قفل فترة
  "export",  // تصدير بيانات
  "approve", // اعتماد
  "reject",  // رفض
]);

// ============================================================
// AUDIT LOG — سجل المراجعة والتدقيق
// ============================================================

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),

  orgId:  uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),

  action: auditActionEnum("action").notNull(),

  // الكيان المتأثر: "journal_entry", "booking", "invoice", "period", etc.
  entity:   text("entity").notNull(),
  entityId: text("entity_id"),

  // لقطات البيانات قبل وبعد التغيير
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),

  // معلومات الطلب
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestId: text("request_id"),

  // وصف بشري مختصر
  description: text("description"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("audit_org_date_idx").on(table.orgId, table.createdAt),
  index("audit_entity_idx").on(table.entity, table.entityId),
  index("audit_user_idx").on(table.userId, table.createdAt),
  index("audit_action_idx").on(table.orgId, table.action),
]);
