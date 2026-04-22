import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { invoices } from "./finance";
import { bookings } from "./bookings";
import { customers } from "./customers";
import { users } from "./auth";

// ============================================================
// ENUMS
// ============================================================

export const paymentTxStatusEnum = pgEnum("payment_tx_status", [
  "pending",    // انتظار إتمام الدفع
  "paid",       // مدفوع
  "failed",     // فشل
  "refunded",   // مسترد
  "cancelled",  // ملغي
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "pending",    // بانتظار التسوية
  "processing", // قيد المعالجة
  "completed",  // مكتملة
  "failed",     // فشلت
]);

// ============================================================
// PAYMENT TRANSACTIONS — معاملات الدفع عبر بوابة نسق
// ============================================================

export const paymentTransactions = pgTable("payment_transactions", {
  id:           uuid("id").defaultRandom().primaryKey(),
  orgId:        uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  invoiceId:    uuid("invoice_id").references(() => invoices.id),
  bookingId:    uuid("booking_id").references(() => bookings.id),
  orderId:      uuid("order_id"),  // online_orders.id — FK enforced by migration
  customerId:   uuid("customer_id").references(() => customers.id),

  // المبالغ
  amount:         numeric("amount", { precision: 12, scale: 2 }).notNull(),
  platformFee:    numeric("platform_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  merchantAmount: numeric("merchant_amount", { precision: 12, scale: 2 }).notNull(),
  currency:       text("currency").default("SAR").notNull(),

  // الحالة
  status: paymentTxStatusEnum("status").default("pending").notNull(),

  // Moyasar
  moyasarId:     text("moyasar_id").unique(),
  moyasarStatus: text("moyasar_status"),
  paymentMethod: text("payment_method"),           // mada, visa, mastercard, apple_pay, stc_pay
  cardInfo:      jsonb("card_info"),               // { brand, last4, country }
  moyasarFee:    numeric("moyasar_fee", { precision: 10, scale: 2 }),
  moyasarData:   jsonb("moyasar_data"),            // raw response

  // مرجع وبيانات
  description:    text("description"),
  successUrl:     text("success_url"),
  failureUrl:     text("failure_url"),
  metadata:       jsonb("metadata"),               // { bookingNumber, invoiceNumber, ... }

  // التسوية
  settlementId: uuid("settlement_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  paidAt:    timestamp("paid_at",    { withTimezone: true }),
}, (t) => [
  index("payment_tx_org_idx").on(t.orgId),
  index("payment_tx_invoice_idx").on(t.invoiceId),
  index("payment_tx_booking_idx").on(t.bookingId),
  index("payment_tx_order_idx").on(t.orderId),
  index("payment_tx_moyasar_idx").on(t.moyasarId),
]);

// ============================================================
// MERCHANT SETTLEMENTS — تسويات نسق للمنشآت
// ============================================================

export const merchantSettlements = pgTable("merchant_settlements", {
  id:    uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // المبالغ
  totalAmount:    numeric("total_amount",    { precision: 12, scale: 2 }).notNull(),
  totalPlatformFee: numeric("total_platform_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount:      numeric("net_amount",      { precision: 12, scale: 2 }).notNull(),
  currency:       text("currency").default("SAR").notNull(),

  status: settlementStatusEnum("status").default("pending").notNull(),

  // الفترة
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd:   timestamp("period_end",   { withTimezone: true }).notNull(),

  // التحويل
  ibanNumber:      text("iban_number"),
  accountName:     text("account_name"),
  payoutReference: text("payout_reference"),
  payoutMethod:    text("payout_method").default("bank_transfer"),

  // إدارة
  adminNote:   text("admin_note"),
  completedBy: uuid("completed_by").references(() => users.id),

  createdAt:   timestamp("created_at",   { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [
  index("settlement_org_idx").on(t.orgId),
  index("settlement_status_idx").on(t.status),
]);

// ============================================================
// PAYMENT SETTINGS — إعدادات بوابة الدفع لكل منشأة
// ============================================================

export const paymentSettings = pgTable("payment_settings", {
  id:    uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),

  // التفعيل
  enabled: boolean("enabled").default(false).notNull(),

  // رسوم المنصة (يُحدد من الأدمن)
  platformFeePercent: numeric("platform_fee_percent", { precision: 5, scale: 2 }).default("2.5"),
  platformFeeFixed:   numeric("platform_fee_fixed",   { precision: 5, scale: 2 }).default("0"),

  // بيانات التحويل للمنشأة
  ibanNumber:  text("iban_number"),
  accountName: text("account_name"),
  bankName:    text("bank_name"),

  // رسوم التوصيل الافتراضية
  defaultDeliveryFee: numeric("default_delivery_fee", { precision: 10, scale: 2 }).default("0").notNull(),

  // إشعارات
  notifyOnPayment: boolean("notify_on_payment").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
