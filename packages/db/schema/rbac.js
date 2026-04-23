import { pgTable, text, timestamp, boolean, pgEnum, uuid, integer, numeric, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
// ============================================================
// SYSTEM ROLES ENUM — ثابتة في الكود، لا تتغير
// ============================================================
export const systemRoleEnum = pgEnum("system_role", [
    "owner", // المالك — كل الصلاحيات
    "manager", // المدير — إدارة العمليات
    "provider", // مقدم الخدمة — جدوله وحجوزاته فقط
    "employee", // الموظف — صلاحيات وظيفية محددة
    "reception", // الاستقبال — حجوزات + عملاء
]);
export const employmentTypeEnum = pgEnum("employment_type", [
    "internal", // موظف داخلي (راتب + عمولة محتملة)
    "freelance", // مستقل (عمولة فقط)
    "outsourced", // جهة خارجية
]);
export const memberStatusEnum = pgEnum("member_status", [
    "active",
    "inactive",
    "suspended",
    "pending",
]);
export const commissionTypeEnum = pgEnum("commission_type_enum", [
    "percentage",
    "fixed_per_order",
    "tiered",
]);
export const deliveryPartnerTypeEnum = pgEnum("delivery_partner_type", [
    "company",
    "individual",
]);
export const deliveryCommissionTypeEnum = pgEnum("delivery_commission_type", [
    "percentage",
    "fixed_per_order",
    "flat_monthly",
]);
export const deliveryAssignedToTypeEnum = pgEnum("delivery_assigned_to_type", [
    "member",
    "partner",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
    "pending",
    "accepted",
    "picked_up",
    "in_transit",
    "delivered",
    "failed",
    "returned",
]);
// ============================================================
// JOB TITLES — المسميات الوظيفية (ديناميكية per org)
// ============================================================
export const jobTitles = pgTable("job_titles", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "حلاق", "شيف", "كاشير"
    nameEn: text("name_en"), // اختياري
    systemRole: systemRoleEnum("system_role").notNull(), // الدور النظامي المرتبط
    description: text("description"),
    color: text("color"), // "#e74c3c" — لون اختياري للعرض
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(), // soft delete
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("job_titles_org_idx").on(table.orgId),
]);
// ============================================================
// JOB TITLE PERMISSIONS — overrides فقط على الافتراضي
// ============================================================
export const jobTitlePermissions = pgTable("job_title_permissions", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    jobTitleId: uuid("job_title_id").notNull().references(() => jobTitles.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key").notNull(), // "bookings.view", "finance.reports"
    allowed: boolean("allowed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("job_title_perms_unique_idx").on(table.orgId, table.jobTitleId, table.permissionKey),
    index("job_title_perms_jt_idx").on(table.jobTitleId),
]);
// ============================================================
// ORG MEMBERS — أعضاء المنشأة مع بيانات التوظيف
// ============================================================
export const orgMembers = pgTable("org_members", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    jobTitleId: uuid("job_title_id").references(() => jobTitles.id, { onDelete: "set null" }),
    branchId: uuid("branch_id"), // null = كل الفروع
    employmentType: employmentTypeEnum("employment_type").default("internal").notNull(),
    // المالية
    salary: numeric("salary", { precision: 10, scale: 2 }),
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }),
    commissionType: commissionTypeEnum("commission_type"),
    // الحالة
    status: memberStatusEnum("status").default("active").notNull(),
    hiredAt: timestamp("hired_at", { withTimezone: true }),
    contractEnd: timestamp("contract_end", { withTimezone: true }),
    phone: text("phone"),
    emergencyContact: text("emergency_contact"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("org_members_unique_idx").on(table.orgId, table.userId),
    index("org_members_org_idx").on(table.orgId),
    index("org_members_jt_idx").on(table.jobTitleId),
]);
// ============================================================
// USER CONSTRAINTS — قيود محددة لكل مستخدم (تجاوز الصلاحية العامة)
// ============================================================
export const userConstraints = pgTable("user_constraints", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // حدود مالية
    maxDiscountPct: numeric("max_discount_pct", { precision: 5, scale: 2 }), // null = لا حد
    maxVoidCount: integer("max_void_count"), // per day; null = لا حد
    requireApprovalAbove: numeric("require_approval_above", { precision: 10, scale: 2 }), // null = لا يوجد
    // بوابات منطقية (null = يرث من الدور)
    canCreateInvoice: boolean("can_create_invoice"),
    canVoidInvoice: boolean("can_void_invoice"),
    canGiveDiscount: boolean("can_give_discount"),
    canAccessReports: boolean("can_access_reports"),
    canExportData: boolean("can_export_data"),
    canManageTeam: boolean("can_manage_team"),
    notes: text("notes"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("user_constraints_unique_idx").on(table.orgId, table.userId),
    index("user_constraints_org_idx").on(table.orgId),
]);
// ============================================================
// DELIVERY PARTNERS — شركات التوصيل الخارجية
// ============================================================
export const deliveryPartners = pgTable("delivery_partners", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: deliveryPartnerTypeEnum("type").default("company").notNull(),
    contactPhone: text("contact_phone"),
    commissionType: deliveryCommissionTypeEnum("commission_type").default("fixed_per_order").notNull(),
    commissionValue: numeric("commission_value", { precision: 10, scale: 2 }).default("0").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("delivery_partners_org_idx").on(table.orgId),
]);
// ============================================================
// DELIVERY ASSIGNMENTS — اسناد طلب لسائق أو شركة
// ============================================================
export const deliveryAssignments = pgTable("delivery_assignments", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull(), // orders.id (no FK — cross-schema compat)
    assignedToType: deliveryAssignedToTypeEnum("assigned_to_type").notNull(),
    assignedToId: uuid("assigned_to_id").notNull(), // orgMembers.id أو deliveryPartners.id
    status: deliveryStatusEnum("status").default("pending").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).default("0"),
    driverShare: numeric("driver_share", { precision: 10, scale: 2 }).default("0"),
    notes: text("notes"),
    proofOfDelivery: text("proof_of_delivery"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("delivery_assignments_order_idx").on(table.orderId),
    index("delivery_assignments_org_idx").on(table.orgId),
]);
//# sourceMappingURL=rbac.js.map