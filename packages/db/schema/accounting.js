import { pgTable, text, timestamp, boolean, pgEnum, uuid, numeric, integer, index, uniqueIndex, date, jsonb } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { users } from "./auth";
// purchaseOrders is defined in procurement.ts (canonical) — imported here for FK references only
import { purchaseOrders } from "./procurement";
// ============================================================
// ENUMS
// ============================================================
export const accountTypeEnum = pgEnum("account_type", [
    "asset", // أصول
    "liability", // خصوم
    "equity", // حقوق الملكية
    "revenue", // إيرادات
    "expense", // مصروفات
]);
export const normalBalanceEnum = pgEnum("normal_balance", [
    "debit", // مدين (الأصول والمصروفات)
    "credit", // دائن (الخصوم وحقوق الملكية والإيرادات)
]);
export const journalEntryStatusEnum = pgEnum("journal_entry_status", [
    "draft", // مسودة — قابلة للتعديل
    "posted", // مُرحَّل — معتمد ونهائي
    "reversed", // معكوس — تم إنشاء قيد عكسي
]);
export const journalSourceTypeEnum = pgEnum("journal_source_type", [
    "booking", // حجز
    "invoice", // فاتورة
    "expense", // مصروف
    "payment", // دفعة
    "pos", // نقطة بيع
    "treasury", // عملية خزينة
    "transfer", // تحويل بين صناديق
    "manual", // قيد يدوي
    "closing", // قيد إقفال
    "opening", // قيد افتتاح
]);
export const periodStatusEnum = pgEnum("period_status", [
    "open", // مفتوحة — يمكن الترحيل إليها
    "closed", // مُغلقة — لا ترحيل جديد
    "locked", // مقفلة — لا تعديل من أي نوع
]);
export const costCenterTypeEnum = pgEnum("cost_center_type", [
    "branch",
    "department",
    "project",
    "property",
    "vehicle",
    "employee",
]);
export const fixedAssetCategoryEnum = pgEnum("fixed_asset_category", [
    "land",
    "building",
    "vehicle",
    "furniture",
    "equipment",
    "computer",
    "machinery",
    "other",
]);
export const fixedAssetStatusEnum = pgEnum("fixed_asset_status", [
    "active",
    "disposed",
    "sold",
    "fully_depreciated",
    "maintenance",
]);
export const depreciationMethodEnum = pgEnum("depreciation_method", [
    "straight_line",
    "declining_balance",
    "units_of_production",
]);
export const vendorStatusEnum = pgEnum("vendor_status", [
    "active",
    "inactive",
]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
    "draft",
    "sent",
    "confirmed",
    "partial_received",
    "received",
    "cancelled",
]);
export const purchaseInvoiceStatusEnum = pgEnum("purchase_invoice_status", [
    "pending",
    "partial",
    "paid",
    "overdue",
    "cancelled",
]);
export const purchasePaymentMethodEnum = pgEnum("purchase_payment_method", [
    "cash",
    "bank_transfer",
    "cheque",
]);
export const budgetStatusEnum = pgEnum("budget_status", [
    "draft",
    "active",
    "closed",
]);
// ============================================================
// CHART OF ACCOUNTS — دليل الحسابات
// ============================================================
export const chartOfAccounts = pgTable("chart_of_accounts", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    // تعريف الحساب
    code: text("code").notNull(), // 1110، 4100، ...
    name: text("name").notNull(), // الاسم بالعربية
    nameEn: text("name_en"), // الاسم بالإنجليزية
    // نوع الحساب وخصائصه
    type: accountTypeEnum("type").notNull(),
    normalBalance: normalBalanceEnum("normal_balance").notNull(),
    // التسلسل الهرمي
    parentId: uuid("parent_id"), // null = حساب رئيسي
    level: integer("level").default(1).notNull(), // 1 = رئيسي، 2 = فرعي، 3 = تفصيلي
    // التحكم
    isPostingAllowed: boolean("is_posting_allowed").default(true).notNull(),
    // false = حساب إجمالي فقط، لا ترحيل مباشر إليه
    isSystemAccount: boolean("is_system_account").default(false).notNull(),
    // true = يُستخدم تلقائياً في الـ posting engine
    systemKey: text("system_key"),
    // مفتاح للـ posting engine: MAIN_CASH, MAIN_BANK, AR, AP,
    // SERVICE_REVENUE, SALES_REVENUE, SALARIES_EXPENSE,
    // RENT_EXPENSE, DEFERRED_REVENUE, VAT_PAYABLE, INVENTORY, CAPITAL
    isActive: boolean("is_active").default(true).notNull(),
    // Banking & Cash
    currency: text("currency").default("SAR").notNull(),
    isBankAccount: boolean("is_bank_account").default(false).notNull(),
    bankName: text("bank_name"),
    bankIban: text("bank_iban"),
    bankBranch: text("bank_branch"),
    isCashAccount: boolean("is_cash_account").default(false).notNull(),
    // Budget & Notes
    budgetAmount: numeric("budget_amount", { precision: 15, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("coa_org_code_idx").on(table.orgId, table.code),
    index("coa_org_id_idx").on(table.orgId),
    index("coa_parent_id_idx").on(table.parentId),
    index("coa_system_key_idx").on(table.orgId, table.systemKey),
]);
// ============================================================
// ACCOUNTING PERIODS — الفترات المالية
// ============================================================
export const accountingPeriods = pgTable("accounting_periods", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "يناير 2026"، "Q1 2026"، "السنة المالية 2026"
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    status: periodStatusEnum("status").default("open").notNull(),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("periods_org_id_idx").on(table.orgId),
    index("periods_status_idx").on(table.orgId, table.status),
]);
// ============================================================
// COST CENTERS — مراكز التكلفة
// ============================================================
export const costCenters = pgTable("cost_centers", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // CC-001
    name: text("name").notNull(),
    nameEn: text("name_en"),
    parentId: uuid("parent_id").references(() => costCenters.id, { onDelete: "set null" }),
    type: costCenterTypeEnum("type").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("cost_centers_org_code_idx").on(table.orgId, table.code),
    index("cost_centers_org_id_idx").on(table.orgId),
    index("cost_centers_parent_id_idx").on(table.parentId),
]);
// ============================================================
// JOURNAL ENTRIES — القيود المحاسبية
// ============================================================
export const journalEntries = pgTable("journal_entries", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    // الترقيم
    entryNumber: text("entry_number").notNull(), // JE-2026-00001
    // التاريخ والوصف
    date: timestamp("date", { withTimezone: true }).notNull(),
    description: text("description").notNull(),
    reference: text("reference"), // رقم مستند خارجي (فاتورة، إيصال، ...)
    // المصدر
    sourceType: journalSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id"), // id السجل المصدر (bookingId, invoiceId, ...)
    // الحالة
    status: journalEntryStatusEnum("status").default("draft").notNull(),
    // الفترة المالية
    periodId: uuid("period_id").references(() => accountingPeriods.id, { onDelete: "restrict" }),
    // الترحيل
    postedBy: uuid("posted_by").references(() => users.id, { onDelete: "set null" }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    // العكس
    reversedBy: uuid("reversed_by").references(() => users.id, { onDelete: "set null" }),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversalEntryId: uuid("reversal_entry_id"), // id قيد العكس (self-reference)
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("je_org_number_idx").on(table.orgId, table.entryNumber),
    index("je_org_id_idx").on(table.orgId),
    index("je_source_idx").on(table.sourceType, table.sourceId),
    index("je_date_idx").on(table.orgId, table.date),
    index("je_status_idx").on(table.orgId, table.status),
    index("je_period_idx").on(table.periodId),
]);
// ============================================================
// JOURNAL ENTRY LINES — سطور القيد
// ============================================================
export const journalEntryLines = pgTable("journal_entry_lines", {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
    // المبالغ — واحد منهما فقط له قيمة في كل سطر
    debit: numeric("debit", { precision: 15, scale: 2 }).default("0").notNull(),
    credit: numeric("credit", { precision: 15, scale: 2 }).default("0").notNull(),
    description: text("description"), // شرح إضافي للسطر
    // تفاصيل اختيارية
    costCenter: text("cost_center"), // نص قديم — للتوافق العكسي
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => locations.id, { onDelete: "set null" }),
    lineOrder: integer("line_order").default(0).notNull(),
}, (table) => [
    index("jel_entry_id_idx").on(table.entryId),
    index("jel_account_id_idx").on(table.accountId),
    index("jel_cost_center_idx").on(table.costCenterId),
]);
// ============================================================
// FIXED ASSETS — الأصول الثابتة
// ============================================================
export const fixedAssets = pgTable("fixed_assets", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    assetCode: text("asset_code").notNull(), // FA-001
    name: text("name").notNull(),
    nameEn: text("name_en"),
    description: text("description"),
    category: fixedAssetCategoryEnum("category").notNull(),
    // الحسابات المرتبطة
    accountId: uuid("account_id").references(() => chartOfAccounts.id, { onDelete: "set null" }),
    depreciationAccountId: uuid("depreciation_account_id").references(() => chartOfAccounts.id, { onDelete: "set null" }),
    expenseAccountId: uuid("expense_account_id").references(() => chartOfAccounts.id, { onDelete: "set null" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    // تفاصيل الشراء
    purchaseDate: date("purchase_date"),
    purchasePrice: numeric("purchase_price", { precision: 15, scale: 2 }),
    purchaseInvoice: text("purchase_invoice"),
    vendorName: text("vendor_name"),
    warrantyEndDate: date("warranty_end_date"),
    // الاستهلاك
    usefulLifeMonths: integer("useful_life_months"),
    salvageValue: numeric("salvage_value", { precision: 15, scale: 2 }).default("0"),
    depreciationMethod: depreciationMethodEnum("depreciation_method").default("straight_line"),
    monthlyDepreciation: numeric("monthly_depreciation", { precision: 15, scale: 2 }).default("0"),
    accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 15, scale: 2 }).default("0"),
    netBookValue: numeric("net_book_value", { precision: 15, scale: 2 }).default("0"),
    // الحالة
    status: fixedAssetStatusEnum("status").default("active"),
    disposalDate: date("disposal_date"),
    disposalPrice: numeric("disposal_price", { precision: 15, scale: 2 }),
    disposalReason: text("disposal_reason"),
    // تفاصيل إضافية
    location: text("location"),
    assignedTo: text("assigned_to"),
    serialNumber: text("serial_number"),
    barcode: text("barcode"),
    photos: jsonb("photos"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("fa_org_id_idx").on(table.orgId),
    index("fa_org_status_idx").on(table.orgId, table.status),
    uniqueIndex("fa_org_code_idx").on(table.orgId, table.assetCode),
]);
// ============================================================
// ASSET DEPRECIATION ENTRIES — قيود استهلاك الأصول
// ============================================================
export const assetDepreciationEntries = pgTable("asset_depreciation_entries", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").notNull().references(() => fixedAssets.id, { onDelete: "cascade" }),
    journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, { onDelete: "set null" }),
    depreciationDate: date("depreciation_date").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("ade_asset_id_idx").on(table.assetId),
    index("ade_org_date_idx").on(table.orgId, table.depreciationDate),
]);
// ============================================================
// VENDORS — الموردون
// ============================================================
export const vendors = pgTable("vendors", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactPerson: text("contact_person"),
    phone: text("phone"),
    email: text("email"),
    vatNumber: text("vat_number"),
    commercialRegistration: text("commercial_registration"),
    bankName: text("bank_name"),
    iban: text("iban"),
    address: text("address"),
    city: text("city"),
    category: text("category"),
    rating: integer("rating"), // 1-5
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("vendors_org_id_idx").on(table.orgId),
]);
// ============================================================
// PURCHASE INVOICES — فواتير الشراء
// (purchaseOrders defined in procurement.ts — imported above)
// ============================================================
export const purchaseInvoices = pgTable("purchase_invoices", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    poId: uuid("po_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
    invoiceDate: date("invoice_date").notNull(),
    dueDate: date("due_date"),
    subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
    vatAmount: numeric("vat_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    status: purchaseInvoiceStatusEnum("status").default("pending"),
    zatcaQrCode: text("zatca_qr_code"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("pinv_org_id_idx").on(table.orgId),
    index("pinv_org_status_idx").on(table.orgId, table.status),
    index("pinv_vendor_id_idx").on(table.vendorId),
]);
// ============================================================
// PURCHASE PAYMENTS — مدفوعات الموردين
// ============================================================
export const purchasePayments = pgTable("purchase_payments", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => purchaseInvoices.id, { onDelete: "set null" }),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    method: purchasePaymentMethodEnum("method").default("bank_transfer"),
    chequeNumber: text("cheque_number"),
    bankReference: text("bank_reference"),
    paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
    approvedBy: text("approved_by"),
    notes: text("notes"),
    journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("ppay_org_id_idx").on(table.orgId),
    index("ppay_invoice_id_idx").on(table.invoiceId),
]);
// ============================================================
// BANK TRANSACTIONS — حركات البنك للمطابقة
// ============================================================
export const bankTransactions = pgTable("bank_transactions", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bank_account_id").references(() => chartOfAccounts.id, { onDelete: "set null" }), // isBankAccount=true
    transactionDate: date("transaction_date").notNull(),
    valueDate: date("value_date"),
    description: text("description").notNull(),
    reference: text("reference"),
    debitAmount: numeric("debit_amount", { precision: 15, scale: 2 }).default("0"),
    creditAmount: numeric("credit_amount", { precision: 15, scale: 2 }).default("0"),
    balance: numeric("balance", { precision: 15, scale: 2 }),
    isReconciled: boolean("is_reconciled").default(false).notNull(),
    reconciledWithId: uuid("reconciled_with_id"), // FK journal_entry_lines (optional)
    importBatch: text("import_batch"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("bt_org_id_idx").on(table.orgId),
    index("bt_org_account_idx").on(table.orgId, table.bankAccountId),
    index("bt_org_reconciled_idx").on(table.orgId, table.isReconciled),
]);
// ============================================================
// BUDGETS — الموازنات
// ============================================================
export const budgets = pgTable("budgets", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: budgetStatusEnum("status").default("draft"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("budgets_org_id_idx").on(table.orgId),
]);
// ============================================================
// BUDGET LINES — سطور الموازنة
// ============================================================
export const budgetLines = pgTable("budget_lines", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    budgetId: uuid("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => chartOfAccounts.id, { onDelete: "set null" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    month: date("month").notNull(), // أول الشهر: 2026-01-01
    budgetAmount: numeric("budget_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    actualAmount: numeric("actual_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    variancePercent: numeric("variance_percent", { precision: 8, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("bl_budget_id_idx").on(table.budgetId),
    index("bl_org_account_idx").on(table.orgId, table.accountId),
]);
//# sourceMappingURL=accounting.js.map