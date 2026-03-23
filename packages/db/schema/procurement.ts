import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { users } from "./auth";

// ============================================================
// ENUMS
// ============================================================

export const supplierStatusEnum = pgEnum("supplier_status", [
  "active",
  "inactive",
  "blacklisted",
]);

export const poStatusEnum = pgEnum("po_status", [
  "draft",          // مسودة
  "submitted",      // مُرسَل للمورد
  "acknowledged",   // المورد استلم وأقرّ
  "partially_received", // استلام جزئي
  "received",       // استلام كامل
  "cancelled",      // ملغي
  "closed",         // مغلق
]);

export const grStatusEnum = pgEnum("gr_status", [
  "pending",        // في انتظار المراجعة
  "approved",       // موافق عليه
  "rejected",       // مرفوض
]);

export const supplierInvoiceStatusEnum = pgEnum("supplier_invoice_status", [
  "draft",
  "received",       // استُلمت من المورد
  "matched",        // مطابقة مع أمر الشراء
  "approved",       // موافق للدفع
  "paid",
  "disputed",       // خلاف
]);

// ============================================================
// SUPPLIERS — الموردون
// ============================================================

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Identity
  name: text("name").notNull(),
  nameEn: text("name_en"),
  code: text("code"),                                 // رمز داخلي للمورد

  // Contact
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),

  // Location
  address: text("address"),
  city: text("city"),
  country: text("country").default("SA"),

  // Financial
  taxNumber: text("tax_number"),                      // الرقم الضريبي
  bankName: text("bank_name"),
  bankIban: text("bank_iban"),
  currency: text("currency").default("SAR"),
  paymentTermsDays: integer("payment_terms_days").default(30), // أيام السداد

  // Performance tracking
  totalOrders: integer("total_orders").default(0),
  totalSpent: numeric("total_spent", { precision: 15, scale: 2 }).default("0"),
  avgDeliveryDays: numeric("avg_delivery_days", { precision: 5, scale: 1 }),
  qualityScore: numeric("quality_score", { precision: 3, scale: 1 }),    // 0-10
  onTimeRate: numeric("on_time_rate", { precision: 5, scale: 2 }),       // نسبة الالتزام بالمواعيد

  // Categories (what does this supplier provide?)
  categories: jsonb("categories").default([]),        // ["flowers", "supplies", "equipment"]
  notes: text("notes"),

  status: supplierStatusEnum("status").default("active").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("suppliers_org_code_uidx").on(table.orgId, table.code),
  index("suppliers_org_status_idx").on(table.orgId, table.status),
]);

// ============================================================
// PURCHASE ORDERS — أوامر الشراء
// ============================================================

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),

  poNumber: text("po_number").notNull(),              // PO-2026-00001
  referenceNumber: text("reference_number"),          // رقم المرجع الخارجي من المورد

  // Dates
  orderDate: timestamp("order_date", { withTimezone: true }).defaultNow().notNull(),
  expectedDelivery: timestamp("expected_delivery", { withTimezone: true }),
  actualDelivery: timestamp("actual_delivery", { withTimezone: true }),

  // Financial
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 15, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("SAR"),

  // Delivery
  deliveryAddress: text("delivery_address"),
  deliveryNotes: text("delivery_notes"),

  notes: text("notes"),
  internalNotes: text("internal_notes"),              // ملاحظات داخلية (لا تُرسل للمورد)
  attachments: jsonb("attachments").default([]),

  status: poStatusEnum("status").default("draft").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("po_org_number_uidx").on(table.orgId, table.poNumber),
  index("po_org_supplier_idx").on(table.orgId, table.supplierId),
  index("po_org_status_idx").on(table.orgId, table.status),
  index("po_org_date_idx").on(table.orgId, table.orderDate),
]);

// ============================================================
// PURCHASE ORDER ITEMS — بنود أمر الشراء
// ============================================================

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  poId: uuid("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // Item description
  itemName: text("item_name").notNull(),
  itemCode: text("item_code"),                        // رمز المنتج عند المورد
  itemDescription: text("item_description"),
  category: text("category"),                         // flowers, supplies, equipment, ...
  unit: text("unit").default("unit"),                 // piece, kg, meter, ...

  // Quantities
  orderedQuantity: numeric("ordered_quantity", { precision: 10, scale: 3 }).notNull(),
  receivedQuantity: numeric("received_quantity", { precision: 10, scale: 3 }).default("0"),

  // Pricing
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"), // نسبة مئوية
  totalPrice: numeric("total_price", { precision: 15, scale: 2 }).notNull(),

  // Linking to internal inventory/catalog (optional)
  assetTypeId: uuid("asset_type_id"),                 // رابط اختياري لنوع أصل
  flowerVariantId: uuid("flower_variant_id"),         // رابط اختياري لنوع ورد
  supplyItemId: uuid("supply_item_id"),               // رابط اختياري لمستلزم صالون

  notes: text("notes"),
  lineOrder: integer("line_order").default(0),
}, (table) => [
  index("po_items_po_id_idx").on(table.poId),
]);

// ============================================================
// GOODS RECEIPTS — إيصالات الاستلام
// كل PO قد يُستلم على دفعات متعددة
// ============================================================

export const goodsReceipts = pgTable("goods_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  poId: uuid("po_id").notNull().references(() => purchaseOrders.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),

  grNumber: text("gr_number").notNull(),              // GR-2026-00001
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  receivedBy: uuid("received_by").notNull().references(() => users.id),

  notes: text("notes"),
  attachments: jsonb("attachments").default([]),      // صور الفاتورة، ورقة التسليم

  status: grStatusEnum("status").default("pending").notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("gr_org_number_uidx").on(table.orgId, table.grNumber),
  index("gr_po_id_idx").on(table.poId),
  index("gr_org_date_idx").on(table.orgId, table.receivedAt),
]);

// ============================================================
// GOODS RECEIPT ITEMS — بنود إيصال الاستلام
// ============================================================

export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  grId: uuid("gr_id").notNull().references(() => goodsReceipts.id, { onDelete: "cascade" }),
  poItemId: uuid("po_item_id").notNull().references(() => purchaseOrderItems.id),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  receivedQuantity: numeric("received_quantity", { precision: 10, scale: 3 }).notNull(),
  acceptedQuantity: numeric("accepted_quantity", { precision: 10, scale: 3 }).notNull(), // بعد الفرز
  rejectedQuantity: numeric("rejected_quantity", { precision: 10, scale: 3 }).default("0"),
  rejectionReason: text("rejection_reason"),

  // Quality check
  qualityNotes: text("quality_notes"),
  expiryDate: timestamp("expiry_date", { withTimezone: true }), // لمنتجات لها تاريخ انتهاء

  // Inventory update (did this receipt auto-update stock?)
  stockUpdated: boolean("stock_updated").default(false),

  lineOrder: integer("line_order").default(0),
}, (table) => [
  index("gr_items_gr_id_idx").on(table.grId),
  index("gr_items_po_item_idx").on(table.poItemId),
]);

// ============================================================
// SUPPLIER INVOICES — فواتير الموردين
// ============================================================

export const supplierInvoices = pgTable("supplier_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  poId: uuid("po_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  grId: uuid("gr_id").references(() => goodsReceipts.id, { onDelete: "set null" }),

  invoiceNumber: text("invoice_number").notNull(),    // رقم فاتورة المورد
  invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),

  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").default("SAR"),

  notes: text("notes"),
  attachments: jsonb("attachments").default([]),

  status: supplierInvoiceStatusEnum("status").default("received").notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("sup_inv_org_number_uidx").on(table.orgId, table.supplierId, table.invoiceNumber),
  index("sup_inv_org_supplier_idx").on(table.orgId, table.supplierId),
  index("sup_inv_org_status_idx").on(table.orgId, table.status),
  index("sup_inv_due_date_idx").on(table.orgId, table.dueDate),
]);
