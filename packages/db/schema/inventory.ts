import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { users } from "./auth";

// ============================================================
// ENUMS
// ============================================================

export const assetStatusEnum = pgEnum("asset_status", [
  "available",     // جاهز للاستخدام
  "in_use",        // قيد الاستخدام (محجوز)
  "maintenance",   // في الصيانة
  "damaged",       // تالف
  "lost",          // مفقود
  "retired",       // تم التقاعد/الاستبعاد
]);

export const maintenanceTypeEnum = pgEnum("maintenance_type", [
  "preventive",    // صيانة وقائية (دورية)
  "corrective",    // صيانة تصحيحية (بعد عطل)
  "cleaning",      // تنظيف
  "inspection",    // فحص
]);

export const transferStatusEnum = pgEnum("transfer_status", [
  "pending",       // بانتظار النقل
  "in_transit",    // قيد النقل
  "completed",     // تم التسليم
  "cancelled",
]);

// ============================================================
// ASSET TYPES — أنواع الأصول
// ============================================================

export const assetTypes = pgTable("asset_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                    // خيمة مغربية 12x12
  nameEn: text("name_en"),
  category: text("category"),                      // خيام، طاولات، كراسي، إضاءة، دفايات
  
  // Default values for new assets of this type
  defaultPrice: numeric("default_price", { precision: 10, scale: 2 }),
  defaultLifespanMonths: integer("default_lifespan_months"),
  maintenanceIntervalUses: integer("maintenance_interval_uses"), // صيانة كل X استخدام
  maintenanceIntervalDays: integer("maintenance_interval_days"), // أو كل X يوم
  
  image: text("image"),
  minStock: integer("min_stock").default(0),       // الحد الأدنى للتنبيه
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// ASSETS — الأصول الفردية
// ============================================================

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assetTypeId: uuid("asset_type_id").notNull().references(() => assetTypes.id),

  // Identity
  serialNumber: text("serial_number"),
  barcode: text("barcode"),
  name: text("name"),

  // Status
  status: assetStatusEnum("status").default("available").notNull(),
  condition: text("condition"),                    // excellent, good, fair, poor

  // ── Operational Location Model ──────────────────────────────
  // warehouse → in storage  |  branch → at a branch
  // rented → rented to customer  |  assigned → assigned to employee
  locationType: text("location_type").default("warehouse").notNull(),
  currentLocationId: uuid("current_location_id").references(() => locations.id),

  // Assignment to user/employee (locationType = "assigned")
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),

  // Rental linkage (locationType = "rented")
  rentedToCustomerId: uuid("rented_to_customer_id"),
  rentalBookingId: uuid("rental_booking_id"),

  // ── Flags ───────────────────────────────────────────────────
  isMovable: boolean("is_movable").default(true).notNull(),    // fixed vs movable
  isRentable: boolean("is_rentable").default(false).notNull(), // rentable vs non-rentable

  // Financial
  purchaseDate: timestamp("purchase_date", { withTimezone: true }),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }),

  // Usage tracking
  totalUses: integer("total_uses").default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  lastMaintenanceAt: timestamp("last_maintenance_at", { withTimezone: true }),
  nextMaintenanceAt: timestamp("next_maintenance_at", { withTimezone: true }),

  // Images
  images: jsonb("images").default([]),

  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// ASSET RESERVATIONS — حجز أصول مرتبط بالحجوزات
// ============================================================

export const assetReservations = pgTable("asset_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  bookingId: uuid("booking_id"),                   // ربط بالحجز
  
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  
  status: text("status").default("reserved").notNull(), // reserved, checked_out, returned, cancelled
  
  checkedOutBy: uuid("checked_out_by").references(() => users.id),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
  returnedBy: uuid("returned_by").references(() => users.id),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
  returnCondition: text("return_condition"),        // حالة الأصل عند الإرجاع
  
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("asset_reservations_asset_id_idx").on(table.assetId),
  index("asset_reservations_booking_id_idx").on(table.bookingId),
  index("asset_reservations_org_id_idx").on(table.orgId),
]);

// ============================================================
// MAINTENANCE LOGS — سجل الصيانة
// ============================================================

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").notNull().references(() => assets.id),

  type: maintenanceTypeEnum("type").notNull(),
  description: text("description"),
  
  // Cost
  cost: numeric("cost", { precision: 10, scale: 2 }).default("0"),
  
  // Dates
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  
  // Who
  performedBy: text("performed_by"),               // اسم الفني/الشركة
  assignedTo: uuid("assigned_to").references(() => users.id),
  
  // Before/After
  conditionBefore: text("condition_before"),
  conditionAfter: text("condition_after"),
  images: jsonb("images").default([]),
  
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// ASSET TRANSFERS — نقل الأصول بين المواقع
// ============================================================

// ============================================================
// ASSET MOVEMENTS — تاريخ حركات الأصل الكاملة
// ============================================================

export const assetMovements = pgTable("asset_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),

  // From state (null on first movement)
  fromLocationType: text("from_location_type"),
  fromLocationId: uuid("from_location_id").references(() => locations.id),
  fromAssignedUserId: uuid("from_assigned_user_id").references(() => users.id),
  fromCustomerId: uuid("from_customer_id"),

  // To state
  toLocationType: text("to_location_type").notNull(),
  toLocationId: uuid("to_location_id").references(() => locations.id),
  toAssignedUserId: uuid("to_assigned_user_id").references(() => users.id),
  toCustomerId: uuid("to_customer_id"),
  toBookingId: uuid("to_booking_id"),

  reason: text("reason"),
  notes: text("notes"),
  movedBy: uuid("moved_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("asset_movements_asset_id_idx").on(table.assetId),
  index("asset_movements_org_id_idx").on(table.orgId),
]);

export const assetTransfers = pgTable("asset_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").notNull().references(() => assets.id),

  fromLocationId: uuid("from_location_id").references(() => locations.id),
  toLocationId: uuid("to_location_id").notNull().references(() => locations.id),
  
  status: transferStatusEnum("status").default("pending").notNull(),
  
  requestedBy: uuid("requested_by").references(() => users.id),
  confirmedBy: uuid("confirmed_by").references(() => users.id),
  
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  
  notes: text("notes"),
});
