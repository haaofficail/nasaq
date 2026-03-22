import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";

// ============================================================
// ENUMS
// ============================================================

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "available",      // متاحة للتأجير
  "reserved",       // محجوزة
  "rented",         // مؤجَّرة حالياً
  "maintenance",    // قيد الصيانة
  "inspection",     // قيد الفحص
  "out_of_service", // خارج الخدمة
]);

export const carRentalStatusEnum = pgEnum("car_rental_status", [
  "pending",        // بانتظار التأكيد
  "confirmed",      // مؤكد
  "picked_up",      // تم الاستلام
  "returned",       // تم الإرجاع
  "cancelled",      // ملغي
  "no_show",        // لم يحضر
  "completed",      // مكتمل
]);

export const inspectionTypeEnum = pgEnum("inspection_type", [
  "pre_rental",     // فحص قبل التسليم
  "post_rental",    // فحص بعد الإرجاع
  "routine",        // فحص دوري
  "damage",         // تقرير تلف
]);

// ============================================================
// VEHICLE CATEGORIES — فئات السيارات
// ============================================================

export const vehicleCategories = pgTable("vehicle_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                      // اقتصادي، دفع رباعي، فاخر، باص
  nameEn: text("name_en"),
  description: text("description"),
  image: text("image"),

  // Base pricing
  pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
  pricePerWeek: numeric("price_per_week", { precision: 10, scale: 2 }),
  pricePerMonth: numeric("price_per_month", { precision: 10, scale: 2 }),
  currency: text("currency").default("SAR").notNull(),

  // Deposit
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),

  // Rules
  minRentalDays: integer("min_rental_days").default(1),
  maxRentalDays: integer("max_rental_days"),
  minDriverAge: integer("min_driver_age").default(21),
  mileageLimit: integer("mileage_limit"),            // كم مسموح يومياً (null = unlimited)
  extraMileageRate: numeric("extra_mileage_rate", { precision: 8, scale: 2 }), // سعر الكم الإضافي

  // Included
  insuranceIncluded: boolean("insurance_included").default(false),
  fuelPolicy: text("fuel_policy").default("full_to_full"), // full_to_full, full_to_empty, pre_purchase

  // Amenities/features
  features: jsonb("features").default([]),           // ["GPS", "مقعد أطفال", "بلوتوث"]

  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("vehicle_categories_org_idx").on(table.orgId),
]);

// ============================================================
// VEHICLE UNITS — السيارات كوحدات فعلية
// ============================================================

export const vehicleUnits = pgTable("vehicle_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => vehicleCategories.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),

  // Vehicle identity
  make: text("make"),                                // تويوتا، كيا، BMW
  model: text("model"),                              // كامري، سبورتاج، X5
  year: integer("year"),
  color: text("color"),
  plateNumber: text("plate_number"),                 // رقم اللوحة — سري/داخلي
  vin: text("vin"),                                  // VIN / رقم الهيكل
  mileage: integer("mileage").default(0),            // الكيلومترات الحالية

  // Status
  status: vehicleStatusEnum("status").default("available").notNull(),

  // Insurance
  insuranceExpiry: timestamp("insurance_expiry", { withTimezone: true }),
  registrationExpiry: timestamp("registration_expiry", { withTimezone: true }),

  // Price override (optional)
  dailyRateOverride: numeric("daily_rate_override", { precision: 10, scale: 2 }),

  // Notes
  internalNotes: text("internal_notes"),
  images: jsonb("images").default([]),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("vehicle_units_org_idx").on(table.orgId),
  index("vehicle_units_category_idx").on(table.categoryId),
]);

// ============================================================
// CAR RENTAL RESERVATIONS — حجوزات التأجير
// ============================================================

export const carRentalReservations = pgTable("car_rental_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Vehicle
  categoryId: uuid("category_id").references(() => vehicleCategories.id, { onDelete: "set null" }),
  vehicleUnitId: uuid("vehicle_unit_id").references(() => vehicleUnits.id, { onDelete: "set null" }),

  // Customer info
  customerId: uuid("customer_id"),                   // optional link to customers table
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone"),
  driverEmail: text("driver_email"),
  driverIdNumber: text("driver_id_number"),          // رقم الهوية/جواز السفر
  driverLicense: text("driver_license"),             // رقم رخصة القيادة
  driverAge: integer("driver_age"),

  // Dates & Location
  pickupDate: timestamp("pickup_date", { withTimezone: true }).notNull(),
  returnDate: timestamp("return_date", { withTimezone: true }).notNull(),
  rentalDays: integer("rental_days").notNull(),
  pickupLocationId: uuid("pickup_location_id"),      // موقع الاستلام
  returnLocationId: uuid("return_location_id"),      // موقع التسليم (قد يختلف)
  pickupLocationNote: text("pickup_location_note"),
  returnLocationNote: text("return_location_note"),

  // Actual timestamps
  actualPickup: timestamp("actual_pickup", { withTimezone: true }),
  actualReturn: timestamp("actual_return", { withTimezone: true }),
  pickupMileage: integer("pickup_mileage"),          // كيلومترات عند الاستلام
  returnMileage: integer("return_mileage"),           // كيلومترات عند الإرجاع

  // Pricing
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  totalRentalCost: numeric("total_rental_cost", { precision: 10, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  depositReturned: boolean("deposit_returned").default(false),
  extraCharges: numeric("extra_charges", { precision: 10, scale: 2 }).default("0"),
  extraChargesNotes: text("extra_charges_notes"),    // سبب الرسوم الإضافية
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),

  // Payment
  paymentStatus: text("payment_status").default("pending"),
  paymentMethod: text("payment_method"),
  depositPaid: boolean("deposit_paid").default(false),

  // Status
  status: carRentalStatusEnum("status").default("pending").notNull(),

  // Add-ons
  addOns: jsonb("add_ons").default([]),             // [{name, price}]

  // Source
  source: text("source").default("direct"),

  // Notes
  specialRequests: text("special_requests"),
  internalNotes: text("internal_notes"),

  // Staff assignment (cross-schema)
  assignedStaffId: uuid("assigned_staff_id"),
  invoiceId: uuid("invoice_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("car_rental_reservations_org_idx").on(table.orgId),
  index("car_rental_reservations_dates_idx").on(table.pickupDate, table.returnDate),
  index("car_rental_reservations_vehicle_idx").on(table.vehicleUnitId),
]);

// ============================================================
// VEHICLE INSPECTIONS — سجلات الفحص
// ============================================================

export const vehicleInspections = pgTable("vehicle_inspections", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  vehicleUnitId: uuid("vehicle_unit_id").notNull().references(() => vehicleUnits.id, { onDelete: "cascade" }),
  reservationId: uuid("reservation_id").references(() => carRentalReservations.id, { onDelete: "set null" }),

  inspectionType: inspectionTypeEnum("inspection_type").notNull(),
  inspectedBy: uuid("inspected_by"),               // موظف الفحص (cross-schema)
  inspectedAt: timestamp("inspected_at", { withTimezone: true }).defaultNow().notNull(),

  mileageAtInspection: integer("mileage_at_inspection"),
  fuelLevel: text("fuel_level"),                   // full, 3/4, 1/2, 1/4, empty

  // Condition checklist
  exteriorCondition: text("exterior_condition").default("good"), // excellent, good, fair, damaged
  interiorCondition: text("interior_condition").default("good"),
  tiresCondition: text("tires_condition").default("good"),

  // Damage reporting
  hasDamage: boolean("has_damage").default(false),
  damageDescription: text("damage_description"),
  damagePhotos: jsonb("damage_photos").default([]),
  damageChargeAmount: numeric("damage_charge_amount", { precision: 10, scale: 2 }),

  notes: text("notes"),
  signature: text("signature"),                    // URL لصورة التوقيع

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("vehicle_inspections_org_idx").on(table.orgId),
  index("vehicle_inspections_vehicle_idx").on(table.vehicleUnitId),
]);
