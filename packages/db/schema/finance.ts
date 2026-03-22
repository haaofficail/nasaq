import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { bookings } from "./bookings";
import { customers } from "./customers";
import { users } from "./auth";
import { chartOfAccounts } from "./accounting";

// ============================================================
// ENUMS
// ============================================================

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",       // مسودة
  "issued",      // صادرة
  "sent",        // مُرسلة للعميل
  "paid",        // مدفوعة
  "partially_paid",
  "overdue",     // متأخرة
  "cancelled",   // ملغاة
  "refunded",    // مستردة
]);

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "simplified",  // فاتورة مبسطة (B2C)
  "tax",         // فاتورة ضريبية (B2B)
  "credit_note", // إشعار دائن (استرداد)
  "debit_note",  // إشعار مدين
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "rent",        // إيجار
  "salaries",    // رواتب
  "equipment",   // معدات
  "transport",   // نقل
  "maintenance", // صيانة
  "marketing",   // تسويق
  "utilities",   // خدمات
  "supplies",    // مستلزمات
  "other",       // أخرى
]);

export const commissionTypeEnum = pgEnum("commission_type", [
  "fixed",       // مبلغ ثابت لكل حجز
  "percentage",  // نسبة من قيمة الحجز
]);

// ============================================================
// INVOICES — فواتير متوافقة مع ZATCA Phase 2
// ============================================================

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id),
  customerId: uuid("customer_id").references(() => customers.id),

  // ZATCA compliance
  invoiceNumber: text("invoice_number").notNull().unique(), // INV-2026-0001
  invoiceType: invoiceTypeEnum("invoice_type").default("simplified").notNull(),
  uuid: text("uuid").notNull().unique(),                    // UUID v4 — إلزامي ZATCA
  
  // Status
  status: invoiceStatusEnum("status").default("draft").notNull(),
  
  // Dates
  issueDate: timestamp("issue_date", { withTimezone: true }).defaultNow().notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  
  // Seller info (snapshot from org)
  sellerName: text("seller_name").notNull(),
  sellerVatNumber: text("seller_vat_number"),
  sellerAddress: text("seller_address"),
  sellerCR: text("seller_cr"),                              // السجل التجاري
  
  // Buyer info (snapshot from customer)
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone"),
  buyerEmail: text("buyer_email"),
  buyerVatNumber: text("buyer_vat_number"),                 // للفاتورة الضريبية B2B
  buyerAddress: text("buyer_address"),

  // Amounts
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("15"),
  vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),

  // ZATCA QR Code data (Base64 TLV encoded)
  qrCode: text("qr_code"),
  
  // ZATCA XML (signed invoice XML for Phase 2)
  zatcaXml: text("zatca_xml"),
  zatcaStatus: text("zatca_status"),                        // accepted, rejected, pending
  zatcaResponse: jsonb("zatca_response"),

  // Template & branding
  templateId: text("template_id"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  
  // Linked credit note (for refunds)
  relatedInvoiceId: uuid("related_invoice_id"),

  sentAt: timestamp("sent_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// INVOICE LINE ITEMS
// ============================================================

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),

  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  taxableAmount: numeric("taxable_amount", { precision: 10, scale: 2 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("15"),
  vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),

  sortOrder: integer("sort_order").default(0),
});

// ============================================================
// EXPENSES — المصروفات
// ============================================================

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Category
  category: expenseCategoryEnum("category").notNull(),
  subcategory: text("subcategory"),                        // تفصيل أكثر

  // Details
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("SAR"),
  
  // Date
  expenseDate: timestamp("expense_date", { withTimezone: true }).notNull(),
  
  // Links (optional)
  bookingId: uuid("booking_id").references(() => bookings.id), // ربط بحجز لحساب الربحية
  vendorId: uuid("vendor_id").references(() => users.id),      // ربط بمقدم خدمة
  
  // Receipt
  receiptUrl: text("receipt_url"),                           // صورة الإيصال
  receiptNumber: text("receipt_number"),
  
  // Recurring
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: text("recurring_frequency"),           // monthly, quarterly, yearly
  
  // Approval
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  
  // ربط بدليل الحسابات (للترحيل المحاسبي)
  chartOfAccountId: uuid("chart_of_account_id").references(() => chartOfAccounts.id),
  journalEntryId: uuid("journal_entry_id"),

  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// VENDOR COMMISSIONS — عمولات مقدمي الخدمة
// ============================================================

export const vendorCommissions = pgTable("vendor_commissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id").notNull().references(() => users.id),

  // Commission structure
  commissionType: commissionTypeEnum("commission_type").default("percentage").notNull(),
  commissionValue: numeric("commission_value", { precision: 10, scale: 2 }).notNull(), // 15 = 15% or 500 = 500 SAR

  // Scope
  serviceId: uuid("service_id"),                             // null = all services
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// VENDOR PAYOUTS — كشوف حسابات مقدمي الخدمة
// ============================================================

export const vendorPayouts = pgTable("vendor_payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id").notNull().references(() => users.id),

  // Period
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

  // Amounts
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),    // إجمالي الحجوزات
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).notNull(), // العمولة المخصومة
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull(),         // صافي المستحق

  // Bookings included
  bookingIds: jsonb("booking_ids").default([]),
  bookingCount: integer("booking_count").default(0),

  // Status
  status: text("status").default("pending").notNull(),       // pending, approved, paid
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),

  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// PAYMENT GATEWAY CONFIG — إعدادات بوابات الدفع
// ============================================================

export const paymentGatewayConfigs = pgTable("payment_gateway_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  provider: text("provider").notNull(),                     // moyasar, tap, hyperpay, tamara, tabby
  displayName: text("display_name").notNull(),              // الاسم المعروض للعميل
  
  // Credentials (encrypted in production)
  apiKey: text("api_key"),
  publishableKey: text("publishable_key"),
  secretKey: text("secret_key"),
  webhookSecret: text("webhook_secret"),
  
  // Settings
  isActive: boolean("is_active").default(false).notNull(),
  isDefault: boolean("is_default").default(false),
  supportedMethods: jsonb("supported_methods").default([]), // ["mada", "visa", "apple_pay"]
  
  // Fees
  transactionFeePercent: numeric("transaction_fee_percent", { precision: 5, scale: 2 }),
  transactionFeeFixed: numeric("transaction_fee_fixed", { precision: 5, scale: 2 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("gateway_config_org_provider_idx").on(table.orgId, table.provider),
]);
