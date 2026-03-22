import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { services } from "./catalog";
import { customers } from "./customers";
import { users } from "./auth";

// ============================================================
// ENUMS
// ============================================================

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",         // طلب جديد
  "confirmed",       // تأكيد أولي
  "deposit_paid",    // عربون مدفوع
  "fully_confirmed", // تأكيد نهائي
  "preparing",       // قيد التجهيز
  "in_progress",     // قيد التنفيذ
  "completed",       // مكتمل
  "reviewed",        // تم التقييم
  "cancelled",       // ملغي
  "no_show",         // لم يحضر
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "partially_paid",
  "overdue",
  "refunded",
  "partially_refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "mada",
  "visa_master",
  "apple_pay",
  "tamara",
  "tabby",
  "bank_transfer",
  "cash",
  "wallet",
  "payment_link",
]);

// ============================================================
// BOOKINGS
// ============================================================

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  
  // Booking number (human-readable)
  bookingNumber: text("booking_number").notNull().unique(), // MHF-2026-0001
  
  // Status
  status: bookingStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  
  // Schedule
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  eventEndDate: timestamp("event_end_date", { withTimezone: true }),
  setupDate: timestamp("setup_date", { withTimezone: true }),
  teardownDate: timestamp("teardown_date", { withTimezone: true }),
  
  // Location
  locationId: uuid("location_id").references(() => locations.id),
  customLocation: text("custom_location"),         // إذا الموقع غير مسجل
  locationNotes: text("location_notes"),
  
  // Pricing
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),      // قبل الضريبة والخصم
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),
  balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).default("0"),
  
  // Coupon
  couponCode: text("coupon_code"),
  couponDiscount: numeric("coupon_discount", { precision: 10, scale: 2 }),
  
  // Assignment
  assignedUserId: uuid("assigned_user_id").references(() => users.id),       // الموظف المسؤول
  vendorId: uuid("vendor_id").references(() => users.id),                    // مقدم الخدمة الخارجي
  
  // Client tracking
  trackingToken: text("tracking_token").unique(),   // رمز تتبع فريد للعميل
  
  // Source
  source: text("source").default("dashboard"),      // dashboard, website, api, marketplace
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  
  // Notes
  customerNotes: text("customer_notes"),            // ملاحظات العميل
  internalNotes: text("internal_notes"),            // ملاحظات داخلية
  
  // Rating
  rating: integer("rating"),                        // 1-5
  reviewText: text("review_text"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  
  // Recurring
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: jsonb("recurring_pattern"),     // { frequency: "weekly", endDate: "..." }
  parentBookingId: uuid("parent_booking_id"),       // الحجز الأصلي للمتكرر

  // Cancellation
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("bookings_customer_id_idx").on(table.customerId),
  index("bookings_event_date_idx").on(table.eventDate),
  index("bookings_org_id_idx").on(table.orgId),
]);

// ============================================================
// BOOKING ITEMS
// بنود الحجز (الخدمات المحجوزة)
// ============================================================

export const bookingItems = pgTable("booking_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id),

  serviceName: text("service_name").notNull(),     // Snapshot — لا يتغير إذا تغيرت الخدمة
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  
  // Pricing details (snapshot of applied rules)
  pricingBreakdown: jsonb("pricing_breakdown").default([]),
  // [{ rule: "seasonal", label: "رمضان +30%", adjustment: 450 }]
  
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("booking_items_booking_id_idx").on(table.bookingId),
]);

// ============================================================
// BOOKING ITEM ADDONS
// الإضافات المحجوزة لكل بند
// ============================================================

export const bookingItemAddons = pgTable("booking_item_addons", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingItemId: uuid("booking_item_id").notNull().references(() => bookingItems.id, { onDelete: "cascade" }),
  addonId: uuid("addon_id"),

  addonName: text("addon_name").notNull(),         // Snapshot
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
});

// ============================================================
// PAYMENTS
// المدفوعات
// ============================================================

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  customerId: uuid("customer_id").references(() => customers.id),

  // Amount
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("SAR").notNull(),
  
  // Method
  method: paymentMethodEnum("method").notNull(),
  
  // Status
  status: text("status").default("pending").notNull(), // pending, completed, failed, refunded
  
  // Gateway
  gatewayProvider: text("gateway_provider"),        // moyasar, tap, tamara
  gatewayTransactionId: text("gateway_transaction_id"),
  gatewayResponse: jsonb("gateway_response"),
  
  // Payment link
  paymentLinkUrl: text("payment_link_url"),
  paymentLinkExpiresAt: timestamp("payment_link_expires_at", { withTimezone: true }),
  
  // Type
  type: text("type").default("payment").notNull(), // payment, deposit, refund
  
  // Reference
  receiptNumber: text("receipt_number"),
  notes: text("notes"),
  
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("payments_booking_id_idx").on(table.bookingId),
  index("payments_org_id_idx").on(table.orgId),
]);

// ============================================================
// BOOKING PIPELINE STAGES (customizable per org)
// مراحل مسار الحجز
// ============================================================

export const bookingPipelineStages = pgTable("booking_pipeline_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                    // تأكيد أولي
  nameEn: text("name_en"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0).notNull(),
  
  // Behavior
  autoTransitionCondition: jsonb("auto_transition_condition"), // شرط الانتقال التلقائي
  maxDurationHours: integer("max_duration_hours"),              // أقصى مدة قبل تنبيه/إلغاء
  notificationTemplate: text("notification_template"),          // قالب الإشعار عند الوصول
  
  isDefault: boolean("is_default").default(false),
  isTerminal: boolean("is_terminal").default(false), // مرحلة نهائية (مكتمل/ملغي)

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
