import { pgTable, text, timestamp, boolean, pgEnum, uuid, numeric, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { users } from "./auth";

// ============================================================
// ENUMS
// ============================================================

export const accountTypeEnum = pgEnum("account_type", [
  "asset",     // أصول
  "liability", // خصوم
  "equity",    // حقوق الملكية
  "revenue",   // إيرادات
  "expense",   // مصروفات
]);

export const normalBalanceEnum = pgEnum("normal_balance", [
  "debit",  // مدين (الأصول والمصروفات)
  "credit", // دائن (الخصوم وحقوق الملكية والإيرادات)
]);

export const journalEntryStatusEnum = pgEnum("journal_entry_status", [
  "draft",    // مسودة — قابلة للتعديل
  "posted",   // مُرحَّل — معتمد ونهائي
  "reversed", // معكوس — تم إنشاء قيد عكسي
]);

export const journalSourceTypeEnum = pgEnum("journal_source_type", [
  "booking",   // حجز
  "invoice",   // فاتورة
  "expense",   // مصروف
  "payment",   // دفعة
  "pos",       // نقطة بيع
  "treasury",  // عملية خزينة
  "transfer",  // تحويل بين صناديق
  "manual",    // قيد يدوي
  "closing",   // قيد إقفال
  "opening",   // قيد افتتاح
]);

export const periodStatusEnum = pgEnum("period_status", [
  "open",   // مفتوحة — يمكن الترحيل إليها
  "closed", // مُغلقة — لا ترحيل جديد
  "locked", // مقفلة — لا تعديل من أي نوع
]);

// ============================================================
// CHART OF ACCOUNTS — دليل الحسابات
// ============================================================

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  // تعريف الحساب
  code: text("code").notNull(),              // 1110، 4100، ...
  name: text("name").notNull(),              // الاسم بالعربية
  nameEn: text("name_en"),                   // الاسم بالإنجليزية

  // نوع الحساب وخصائصه
  type: accountTypeEnum("type").notNull(),
  normalBalance: normalBalanceEnum("normal_balance").notNull(),

  // التسلسل الهرمي
  parentId: uuid("parent_id"),               // null = حساب رئيسي
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

  name: text("name").notNull(),              // "يناير 2026"، "Q1 2026"، "السنة المالية 2026"
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),

  status: periodStatusEnum("status").default("open").notNull(),

  closedBy: uuid("closed_by").references(() => users.id),
  closedAt: timestamp("closed_at", { withTimezone: true }),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("periods_org_id_idx").on(table.orgId),
  index("periods_status_idx").on(table.orgId, table.status),
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
  reference: text("reference"),               // رقم مستند خارجي (فاتورة، إيصال، ...)

  // المصدر
  sourceType: journalSourceTypeEnum("source_type").notNull(),
  sourceId: uuid("source_id"),                // id السجل المصدر (bookingId, invoiceId, ...)

  // الحالة
  status: journalEntryStatusEnum("status").default("draft").notNull(),

  // الفترة المالية
  periodId: uuid("period_id").references(() => accountingPeriods.id),

  // الترحيل
  postedBy: uuid("posted_by").references(() => users.id),
  postedAt: timestamp("posted_at", { withTimezone: true }),

  // العكس
  reversedBy: uuid("reversed_by").references(() => users.id),
  reversedAt: timestamp("reversed_at", { withTimezone: true }),
  reversalEntryId: uuid("reversal_entry_id"), // id قيد العكس (self-reference)

  createdBy: uuid("created_by").references(() => users.id),
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
  accountId: uuid("account_id").notNull().references(() => chartOfAccounts.id),

  // المبالغ — واحد منهما فقط له قيمة في كل سطر
  debit: numeric("debit", { precision: 15, scale: 2 }).default("0").notNull(),
  credit: numeric("credit", { precision: 15, scale: 2 }).default("0").notNull(),

  description: text("description"),          // شرح إضافي للسطر

  // تفاصيل اختيارية
  costCenter: text("cost_center"),           // مركز التكلفة (مستقبلاً)
  branchId: uuid("branch_id").references(() => locations.id),

  lineOrder: integer("line_order").default(0).notNull(),
}, (table) => [
  index("jel_entry_id_idx").on(table.entryId),
  index("jel_account_id_idx").on(table.accountId),
]);
