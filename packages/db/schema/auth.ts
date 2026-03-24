import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";

// ============================================================
// ENUMS
// ============================================================

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "suspended",
  "invited", // تم الدعوة ولم يقبل بعد
]);

export const userTypeEnum = pgEnum("user_type", [
  "owner",             // مالك
  "employee",          // موظف داخلي
  "vendor",            // مقدم خدمة خارجي
]);

// ============================================================
// USERS
// كل مستخدم تابع لـ organization
// ============================================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Identity
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  avatar: text("avatar"),
  
  // Auth
  passwordHash: text("password_hash"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  
  // Type & Status
  type: userTypeEnum("type").default("employee").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  
  // Role
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "set null" }),
  
  // Employment info (for employees)
  jobTitle: text("job_title"),
  skills: jsonb("skills").default([]),              // ["تركيب خيام", "طاولات", "إضاءة"]
  salary: text("salary"),
  startDate: timestamp("start_date", { withTimezone: true }),
  
  // Location restriction (data-level RBAC)
  allowedLocationIds: jsonb("allowed_location_ids").default([]), // [] = all locations
  
  // Schedule
  workingHours: jsonb("working_hours").default({
    sunday: { start: "08:00", end: "22:00", active: true },
    monday: { start: "08:00", end: "22:00", active: true },
    tuesday: { start: "08:00", end: "22:00", active: true },
    wednesday: { start: "08:00", end: "22:00", active: true },
    thursday: { start: "08:00", end: "22:00", active: true },
    friday: { start: null, end: null, active: false },
    saturday: { start: "08:00", end: "22:00", active: true },
  }),
  
  // Access control
  accessStartTime: text("access_start_time"),       // "08:00" — وقت بداية الوصول
  accessEndTime: text("access_end_time"),            // "22:00" — وقت نهاية الوصول

  // Super Admin & Nasaq Staff
  isSuperAdmin: boolean("is_super_admin").default(false),
  nasaqRole: text("nasaq_role"),   // 'account_manager' | 'support_agent' | 'content_manager' | 'viewer'
  lastLoginIp: text("last_login_ip"),
  loginCount: integer("login_count").default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// ROLES
// أدوار وظيفية لكل organization
// ============================================================

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                    // مدير عمليات، مشرف حجوزات
  nameEn: text("name_en"),                         // Operations Manager
  description: text("description"),
  isSystem: boolean("is_system").default(false),   // أدوار النظام الافتراضية
  isActive: boolean("is_active").default(true).notNull(), // soft delete

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// PERMISSIONS
// صلاحيات محددة — resource + action
// ============================================================

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  resource: text("resource").notNull(),            // services, bookings, customers, finance, settings
  action: text("action").notNull(),                // view, create, edit, delete, approve, export
  description: text("description"),                // وصف عربي للصلاحية
  descriptionEn: text("description_en"),
}, (table) => [
  uniqueIndex("permissions_resource_action_idx").on(table.resource, table.action),
]);

// ============================================================
// ROLE_PERMISSIONS
// ربط الأدوار بالصلاحيات
// ============================================================

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("role_permissions_unique_idx").on(table.roleId, table.permissionId),
]);

// ============================================================
// SESSIONS
// جلسات المستخدمين
// ============================================================

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  token: text("token").notNull().unique(),
  device: text("device"),                          // iPhone 15, Chrome on Mac
  ip: text("ip"),
  
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
]);

// ============================================================
// OTP CODES
// رموز التحقق
// ============================================================

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").default("login"),       // login, verify, reset
  attempts: integer("attempts").default(0),
  
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("otp_codes_phone_idx").on(table.phone),
]);

// ============================================================
// AUDIT LOG — سجل الأحداث العامة (لا يُحذف أبداً)
//
// هذا الجدول للأحداث العامة للنظام:
//   تسجيل الدخول/الخروج، الحجوزات، العملاء، الإعدادات، الفواتير،
//   أي action يكتبها insertAuditLog() في lib/audit.ts
//
// للأحداث المحاسبية (قيود، إغلاق فترات) → استخدم جدول audit_log في audit-log.ts
// ============================================================

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  
  action: text("action").notNull(),                // created, updated, deleted, approved, rejected
  resource: text("resource").notNull(),            // service, booking, customer, payment
  resourceId: text("resource_id"),                 // ID of the affected record
  
  oldValue: jsonb("old_value"),                    // القيمة القديمة
  newValue: jsonb("new_value"),                    // القيمة الجديدة

  metadata: jsonb("metadata"),                     // بيانات سياقية إضافية (حالة جديدة، سبب، إلخ)

  ip: text("ip"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("audit_logs_org_resource_idx").on(table.orgId, table.resource, table.resourceId),
]);
