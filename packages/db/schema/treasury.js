import { pgTable, text, timestamp, boolean, pgEnum, uuid, numeric, index } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { users } from "./auth";
import { chartOfAccounts, accountingPeriods } from "./accounting";
// ============================================================
// ENUMS
// ============================================================
export const treasuryAccountTypeEnum = pgEnum("treasury_account_type", [
    "main_cash", // الصندوق الرئيسي للمنشأة
    "branch_cash", // صندوق فرع
    "cashier_drawer", // درج كاشير (يُقفَل بالوردية)
    "petty_cash", // صندوق عهدة / مصروفات صغيرة
    "bank_account", // حساب بنكي
    "employee_custody", // عهدة موظف
]);
export const treasuryTransactionTypeEnum = pgEnum("treasury_transaction_type", [
    "receipt", // قبض — نقدية داخلة
    "payment", // صرف — نقدية خارجة
    "transfer_in", // تحويل وارد من صندوق آخر
    "transfer_out", // تحويل صادر إلى صندوق آخر
    "opening", // رصيد افتتاحي
    "closing", // رصيد ختامي
    "adjustment", // تسوية (عجز/زيادة)
]);
export const treasuryTransferStatusEnum = pgEnum("treasury_transfer_status", [
    "pending", // بانتظار الموافقة
    "completed", // مكتمل
    "cancelled", // ملغي
]);
export const cashierShiftStatusEnum = pgEnum("cashier_shift_status", [
    "open", // الوردية مفتوحة
    "closed", // مُغلقة (لم تُراجَع)
    "reconciled", // تمت المطابقة
]);
export const treasurySourceTypeEnum = pgEnum("treasury_source_type", [
    "booking", // حجز
    "invoice", // فاتورة
    "expense", // مصروف
    "pos", // نقطة بيع
    "transfer", // تحويل داخلي
    "payroll", // رواتب
    "manual", // يدوي
]);
// ============================================================
// TREASURY ACCOUNTS — الصناديق والخزائن والبنوك
// ============================================================
export const treasuryAccounts = pgTable("treasury_accounts", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "الصندوق الرئيسي"، "بنك الراجحي"، ...
    type: treasuryAccountTypeEnum("type").notNull(),
    // الفرع المرتبط (للصناديق الفرعية)
    branchId: uuid("branch_id").references(() => locations.id),
    // المسؤول عن الصندوق
    responsibleUserId: uuid("responsible_user_id").references(() => users.id),
    // الأرصدة
    openingBalance: numeric("opening_balance", { precision: 15, scale: 2 }).default("0").notNull(),
    currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).default("0").notNull(),
    currency: text("currency").default("SAR").notNull(),
    // بيانات الحساب البنكي (للنوع bank_account)
    accountNumber: text("account_number"),
    bankName: text("bank_name"),
    iban: text("iban"),
    // ربط بدليل الحسابات (للترحيل المحاسبي)
    glAccountId: uuid("gl_account_id").references(() => chartOfAccounts.id),
    isActive: boolean("is_active").default(true).notNull(),
    isDefault: boolean("is_default").default(false).notNull(), // الصندوق الافتراضي للعمليات
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("ta_org_id_idx").on(table.orgId),
    index("ta_type_idx").on(table.orgId, table.type),
    index("ta_branch_idx").on(table.branchId),
]);
// ============================================================
// TREASURY TRANSACTIONS — حركات الصندوق
// ============================================================
export const treasuryTransactions = pgTable("treasury_transactions", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    treasuryAccountId: uuid("treasury_account_id").notNull().references(() => treasuryAccounts.id),
    transactionType: treasuryTransactionTypeEnum("transaction_type").notNull(),
    // المبلغ والرصيد بعد الحركة
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }).notNull(),
    // الوصف والمرجع
    description: text("description").notNull(),
    reference: text("reference"), // رقم السند، رقم الفاتورة، ...
    voucherNumber: text("voucher_number"), // رقم سند القبض/الصرف
    // مصدر الحركة
    sourceType: treasurySourceTypeEnum("source_type"),
    sourceId: uuid("source_id"), // bookingId، invoiceId، expenseId، ...
    // طريقة الدفع
    paymentMethod: text("payment_method"), // cash | mada | bank_transfer | ...
    // الطرف الآخر (العميل أو المورد)
    counterpartyType: text("counterparty_type"), // customer | supplier | employee | other
    counterpartyId: uuid("counterparty_id"),
    counterpartyName: text("counterparty_name"), // snapshot للأرشفة
    // الوردية والفترة المالية
    shiftId: uuid("shift_id").references(() => cashierShifts.id),
    periodId: uuid("period_id").references(() => accountingPeriods.id),
    // القيد المحاسبي المرتبط (عند تفعيل full_accounting)
    journalEntryId: uuid("journal_entry_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("tt_account_idx").on(table.treasuryAccountId),
    index("tt_org_date_idx").on(table.orgId, table.createdAt),
    index("tt_source_idx").on(table.sourceType, table.sourceId),
    index("tt_shift_idx").on(table.shiftId),
    index("tt_voucher_idx").on(table.orgId, table.voucherNumber),
]);
// ============================================================
// TREASURY TRANSFERS — تحويلات بين الصناديق
// ============================================================
export const treasuryTransfers = pgTable("treasury_transfers", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    fromAccountId: uuid("from_account_id").notNull().references(() => treasuryAccounts.id),
    toAccountId: uuid("to_account_id").notNull().references(() => treasuryAccounts.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    description: text("description"),
    transferDate: timestamp("transfer_date", { withTimezone: true }).notNull(),
    status: treasuryTransferStatusEnum("status").default("pending").notNull(),
    // سجلات الحركتين المرتبطتين
    fromTransactionId: uuid("from_transaction_id").references(() => treasuryTransactions.id),
    toTransactionId: uuid("to_transaction_id").references(() => treasuryTransactions.id),
    // الموافقة
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    // القيد المحاسبي
    journalEntryId: uuid("journal_entry_id"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("ttr_org_idx").on(table.orgId),
    index("ttr_from_idx").on(table.fromAccountId),
    index("ttr_to_idx").on(table.toAccountId),
    index("ttr_status_idx").on(table.orgId, table.status),
]);
// ============================================================
// CASHIER SHIFTS — وردية الكاشير
// ============================================================
export const cashierShifts = pgTable("cashier_shifts", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    treasuryAccountId: uuid("treasury_account_id").notNull().references(() => treasuryAccounts.id),
    cashierId: uuid("cashier_id").notNull().references(() => users.id),
    // الأرصدة
    openingBalance: numeric("opening_balance", { precision: 15, scale: 2 }).notNull(),
    closingBalance: numeric("closing_balance", { precision: 15, scale: 2 }), // محسوب = افتتاحي + حركات
    actualCash: numeric("actual_cash", { precision: 15, scale: 2 }), // المعدود فعلاً عند الإغلاق
    variance: numeric("variance", { precision: 15, scale: 2 }), // الفرق (عجز/زيادة)
    status: cashierShiftStatusEnum("status").default("open").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    notes: text("notes"),
    closedBy: uuid("closed_by").references(() => users.id),
}, (table) => [
    index("cs_account_idx").on(table.treasuryAccountId),
    index("cs_cashier_idx").on(table.cashierId),
    index("cs_org_status_idx").on(table.orgId, table.status),
    index("cs_opened_at_idx").on(table.orgId, table.openedAt),
]);
//# sourceMappingURL=treasury.js.map