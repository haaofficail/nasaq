import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
// ============================================================
// ENUMS
// ============================================================
export const roomStatusEnum = pgEnum("room_status", [
    "available", // جاهزة للحجز
    "occupied", // مشغولة حالياً
    "reserved", // محجوزة مسبقاً
    "cleaning", // قيد التنظيف
    "maintenance", // قيد الصيانة
    "out_of_service", // خارج الخدمة
]);
export const hotelReservationStatusEnum = pgEnum("hotel_reservation_status", [
    "pending", // انتظار التأكيد
    "confirmed", // مؤكدة
    "checked_in", // سجّل الدخول
    "checked_out", // سجّل الخروج
    "cancelled", // ملغاة
    "no_show", // لم يحضر
    "completed", // مكتملة
]);
export const housekeepingStatusEnum = pgEnum("housekeeping_status", [
    "pending", // بانتظار التنظيف
    "in_progress", // جاري التنظيف
    "completed", // تم التنظيف
    "inspected", // تم الفحص والموافقة
    "issue_reported", // تم الإبلاغ عن مشكلة
]);
// ============================================================
// ROOM TYPES — أنواع الغرف
// ============================================================
export const roomTypes = pgTable("room_types", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // غرفة عادية، جناح فاخر، غرفة عائلية
    nameEn: text("name_en"),
    description: text("description"),
    coverImage: text("cover_image"),
    images: jsonb("images").default([]), // قائمة صور
    // Capacity
    maxOccupancy: integer("max_occupancy").default(2).notNull(), // أقصى عدد ضيوف
    maxAdults: integer("max_adults").default(2),
    maxChildren: integer("max_children").default(0),
    bedConfiguration: text("bed_configuration"), // سرير كبير، سريران منفصلان
    // Size
    areaSqm: numeric("area_sqm", { precision: 6, scale: 2 }),
    // Base pricing
    pricePerNight: numeric("price_per_night", { precision: 10, scale: 2 }).notNull(), // السعر لليلة الواحدة
    currency: text("currency").default("SAR").notNull(),
    weekendPricePerNight: numeric("weekend_price_per_night", { precision: 10, scale: 2 }),
    // Amenities
    amenities: jsonb("amenities").default([]), // ["wifi", "tv", "minibar", "jacuzzi"]
    // Policies
    smokingAllowed: boolean("smoking_allowed").default(false),
    petsAllowed: boolean("pets_allowed").default(false),
    // Meta
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("room_types_org_idx").on(table.orgId),
]);
// ============================================================
// ROOM UNITS — الغرف الفعلية
// ============================================================
export const roomUnits = pgTable("room_units", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }), // فرع/عقار
    // Identity
    roomNumber: text("room_number").notNull(), // 101، 202، Suite-A
    floor: integer("floor"), // الطابق
    building: text("building"), // المبنى (للفنادق المتعددة المباني)
    // Current status
    status: roomStatusEnum("status").default("available").notNull(),
    // Overrides (optional — override room type defaults)
    priceOverride: numeric("price_override", { precision: 10, scale: 2 }), // سعر خاص لهذه الغرفة
    notesForStaff: text("notes_for_staff"), // ملاحظات داخلية
    // Maintenance
    lastCleanedAt: timestamp("last_cleaned_at", { withTimezone: true }),
    lastInspectedAt: timestamp("last_inspected_at", { withTimezone: true }),
    nextMaintenanceAt: timestamp("next_maintenance_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("room_units_org_idx").on(table.orgId),
    index("room_units_type_idx").on(table.roomTypeId),
]);
// ============================================================
// HOTEL RESERVATIONS — حجوزات النزلاء
// ============================================================
export const hotelReservations = pgTable("hotel_reservations", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    // Room
    roomTypeId: uuid("room_type_id").references(() => roomTypes.id, { onDelete: "set null" }),
    roomUnitId: uuid("room_unit_id").references(() => roomUnits.id, { onDelete: "set null" }),
    // Guest info (denormalized — no customer FK required for simple mode)
    customerId: uuid("customer_id"), // رابط اختياري لجدول customers
    guestName: text("guest_name").notNull(),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    guestIdNumber: text("guest_id_number"), // رقم الهوية/الجواز
    guestNationality: text("guest_nationality"),
    adultCount: integer("adult_count").default(1).notNull(),
    childrenCount: integer("children_count").default(0),
    // Dates
    checkInDate: timestamp("check_in_date", { withTimezone: true }).notNull(),
    checkOutDate: timestamp("check_out_date", { withTimezone: true }).notNull(),
    nights: integer("nights").notNull(), // عدد الليالي (محسوب)
    // Actual check-in/out timestamps
    actualCheckIn: timestamp("actual_check_in", { withTimezone: true }),
    actualCheckOut: timestamp("actual_check_out", { withTimezone: true }),
    // Pricing
    pricePerNight: numeric("price_per_night", { precision: 10, scale: 2 }).notNull(),
    totalRoomCost: numeric("total_room_cost", { precision: 10, scale: 2 }).notNull(),
    extraCharges: numeric("extra_charges", { precision: 10, scale: 2 }).default("0"),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    // Payment
    depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
    depositPaid: boolean("deposit_paid").default(false),
    paymentStatus: text("payment_status").default("pending"), // pending, partially_paid, paid, refunded
    paymentMethod: text("payment_method"),
    // Status
    status: hotelReservationStatusEnum("status").default("pending").notNull(),
    // Booking source
    source: text("source").default("direct"), // direct, booking_com, airbnb, phone, walk_in, gatherin
    // Extra services (JSON array of {name, price})
    extraServices: jsonb("extra_services").default([]),
    // Policies
    cancellationPolicy: jsonb("cancellation_policy"),
    specialRequests: text("special_requests"),
    internalNotes: text("internal_notes"),
    // Assigned front desk staff (cross-schema, no FK)
    assignedStaffId: uuid("assigned_staff_id"),
    // Invoice link (cross-schema, no FK)
    invoiceId: uuid("invoice_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("hotel_reservations_org_idx").on(table.orgId),
    index("hotel_reservations_dates_idx").on(table.checkInDate, table.checkOutDate),
    index("hotel_reservations_room_idx").on(table.roomUnitId),
]);
// ============================================================
// HOUSEKEEPING LOGS — سجل التنظيف والصيانة
// ============================================================
export const housekeepingLogs = pgTable("housekeeping_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    roomUnitId: uuid("room_unit_id").notNull().references(() => roomUnits.id, { onDelete: "cascade" }),
    // Task info
    taskType: text("task_type").notNull(), // cleaning, maintenance, inspection, turnover
    priority: text("priority").default("normal"), // low, normal, high, urgent
    status: housekeepingStatusEnum("status").default("pending").notNull(),
    // Assignment (cross-schema)
    assignedToId: uuid("assigned_to_id"), // موظف التنظيف/الصيانة
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    // Timing
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Notes
    notes: text("notes"),
    issues: jsonb("issues").default([]), // قائمة المشاكل المُبلَّغ عنها
    photos: jsonb("photos").default([]), // صور
    // Linked reservation (when it's post-checkout)
    reservationId: uuid("reservation_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("housekeeping_logs_org_idx").on(table.orgId),
    index("housekeeping_logs_room_idx").on(table.roomUnitId),
]);
// ============================================================
// HOTEL SEASONAL PRICING — التسعير الموسمي
// ============================================================
export const hotelSeasonalPricing = pgTable("hotel_seasonal_pricing", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    roomTypeId: uuid("room_type_id").references(() => roomTypes.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // موسم الصيف، رمضان، الأعياد
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    pricePerNight: numeric("price_per_night", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=hotel.js.map