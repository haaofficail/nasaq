/**
 * POSTING ENGINE — محرك القيود المحاسبية
 *
 * يربط العمليات التشغيلية (حجوزات، مدفوعات، مصروفات، POS) بالقيود المحاسبية.
 * يعمل فقط عند تفعيل enable_full_accounting في إعدادات المنشأة.
 *
 * المبدأ: كل عملية → journal_entry (مدين = دائن دائماً)
 */

import { eq, and, lte, gte, sql, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { chartOfAccounts, journalEntries, journalEntryLines, accountingPeriods } from "@nasaq/db/schema";

// ============================================================
// TYPES
// ============================================================

export type JournalSourceType =
  | "booking"
  | "invoice"
  | "expense"
  | "payment"
  | "pos"
  | "treasury"
  | "transfer"
  | "manual"
  | "closing"
  | "opening";

export interface JournalLineInput {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  branchId?: string;
}

export interface CreateEntryInput {
  orgId: string;
  date: Date;
  description: string;
  reference?: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  periodId?: string;        // إذا لم يُحدَّد يُكتشف تلقائياً
  createdBy?: string;
  lines: JournalLineInput[];
  tx?: any;
}

export interface PostingResult {
  entryId: string;
  entryNumber: string;
  totalDebit: number;
  totalCredit: number;
}

// ============================================================
// SYSTEM KEY LOOKUP
// يجلب معرّف الحساب من دليل الحسابات بالـ system_key
// ============================================================

type SystemKey =
  | "MAIN_CASH"
  | "MAIN_BANK"
  | "AR"
  | "AP"
  | "INVENTORY"
  | "DEFERRED_REVENUE"
  | "VAT_PAYABLE"
  | "SERVICE_REVENUE"
  | "SALES_REVENUE"
  | "SALARIES_EXPENSE"
  | "RENT_EXPENSE"
  | "CAPITAL"
  | "RETAINED_EARNINGS"
  | "INCOME_SUMMARY"
  | "ACCRUED_EXPENSES"
  | "ACCUMULATED_DEPRECIATION"
  | "DEPRECIATION_EXPENSE"
  | "COGS"
  | "INVENTORY_ADJUSTMENT"
  | "SALARY_EXPENSE"
  | "CASH"
  | "GOSI_EXPENSE"
  | "GOSI_PAYABLE"
  | "EMPLOYEE_LOANS"
  | "GRATUITY_PROVISION"
  | "GOV_FEES_EXPENSE";

type DbExecutor = typeof db | any;
const getExecutor = (tx?: DbExecutor) => tx ?? db;

export async function getAccountByKey(orgId: string, key: SystemKey, tx?: DbExecutor): Promise<string | null> {
  const executor = getExecutor(tx);
  const [account] = await executor
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.systemKey, key),
        eq(chartOfAccounts.isActive, true)
      )
    )
    .limit(1);

  return account?.id ?? null;
}

// جلب عدة حسابات دفعة واحدة لتقليل الاستعلامات
export async function getAccountsByKeys(
  orgId: string,
  keys: SystemKey[],
  tx?: DbExecutor,
): Promise<Record<string, string>> {
  const executor = getExecutor(tx);
  const accounts = await executor
    .select({ id: chartOfAccounts.id, systemKey: chartOfAccounts.systemKey })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.orgId, orgId),
        sql`${chartOfAccounts.systemKey} = ANY(${keys})`,
        eq(chartOfAccounts.isActive, true)
      )
    );

  return Object.fromEntries(
    accounts
      .filter((a) => a.systemKey !== null)
      .map((a) => [a.systemKey!, a.id])
  );
}

// ============================================================
// PERIOD LOOKUP
// يجد الفترة المالية المفتوحة التي يقع فيها التاريخ
// ============================================================

export async function findPeriodForDate(orgId: string, date: Date, tx?: DbExecutor): Promise<string | null> {
  const executor = getExecutor(tx);
  const [period] = await executor
    .select({ id: accountingPeriods.id })
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.orgId, orgId),
        eq(accountingPeriods.status, "open"),
        lte(accountingPeriods.startDate, date),
        gte(accountingPeriods.endDate, date)
      )
    )
    .limit(1);

  return period?.id ?? null;
}

// ============================================================
// ENTRY NUMBER GENERATOR
// JE-2026-00001 (sequential per org per year)
// ============================================================

async function generateEntryNumber(orgId: string, date: Date, tx?: DbExecutor): Promise<string> {
  const executor = getExecutor(tx);
  const year = date.getFullYear();
  const prefix = `JE-${year}-`;

  const [{ total }] = await executor
    .select({ total: count() })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.orgId, orgId),
        sql`${journalEntries.entryNumber} LIKE ${prefix + "%"}`
      )
    );

  const seq = (Number(total) + 1).toString().padStart(5, "0");
  return `${prefix}${seq}`;
}

// ============================================================
// VALIDATION
// يتحقق أن مجموع المدين = مجموع الدائن
// ============================================================

function validateBalance(lines: JournalLineInput[]): { valid: boolean; totalDebit: number; totalCredit: number } {
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  // نسمح بفارق 0.01 لتجنب مشاكل الفاصلة العائمة
  const valid = Math.abs(totalDebit - totalCredit) < 0.01;
  return { valid, totalDebit, totalCredit };
}

// ============================================================
// CORE: CREATE JOURNAL ENTRY
// الدالة الجوهرية — تُستدعى من كل posting functions
// ============================================================

export async function createJournalEntry(input: CreateEntryInput): Promise<PostingResult> {
  const { valid, totalDebit, totalCredit } = validateBalance(input.lines);
  if (!valid) {
    throw new Error(
      `القيد غير متوازن: مجموع المدين ${totalDebit.toFixed(2)} ≠ مجموع الدائن ${totalCredit.toFixed(2)}`
    );
  }
  if (input.lines.length < 2) {
    throw new Error("القيد يجب أن يحتوي على سطرين على الأقل");
  }

  // تحديد الفترة المالية
  const executor = getExecutor(input.tx);
  const periodId = input.periodId ?? (await findPeriodForDate(input.orgId, input.date, input.tx));

  // توليد رقم القيد
  const entryNumber = await generateEntryNumber(input.orgId, input.date, input.tx);

  // إنشاء القيد والسطور في transaction واحدة
  const insertEntry = async (tx: DbExecutor) => {
    const [entry] = await tx
      .insert(journalEntries)
      .values({
        orgId: input.orgId,
        entryNumber,
        date: input.date,
        description: input.description,
        reference: input.reference ?? null,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        status: "posted",
        periodId: periodId ?? null,
        postedBy: input.createdBy ?? null,
        postedAt: new Date(),
        createdBy: input.createdBy ?? null,
      })
      .returning({ id: journalEntries.id });

    await tx.insert(journalEntryLines).values(
      input.lines.map((line, i) => ({
        entryId: entry.id,
        accountId: line.accountId,
        debit: String(line.debit ?? 0),
        credit: String(line.credit ?? 0),
        description: line.description ?? null,
        branchId: line.branchId ?? null,
        lineOrder: i,
      }))
    );

    return entry.id;
  };
  const entryId = input.tx ? await insertEntry(executor) : await db.transaction(insertEntry);

  return { entryId, entryNumber, totalDebit, totalCredit };
}

// ============================================================
// REVERSE ENTRY — عكس قيد موجود
// ============================================================

export async function reverseJournalEntry(
  entryId: string,
  reversedBy: string,
  reason?: string
): Promise<PostingResult> {
  // جلب القيد الأصلي
  const [original] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, entryId));

  if (!original) throw new Error("القيد غير موجود");
  if (original.status !== "posted") throw new Error("لا يمكن عكس قيد غير مُرحَّل");

  // جلب السطور وعكسها (مدين → دائن والعكس)
  const originalLines = await db
    .select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.entryId, entryId));

  const reversalLines: JournalLineInput[] = originalLines.map((line) => ({
    accountId: line.accountId,
    debit: parseFloat(line.credit ?? "0"),
    credit: parseFloat(line.debit ?? "0"),
    description: line.description ?? undefined,
    branchId: line.branchId ?? undefined,
  }));

  // إنشاء قيد العكس
  const result = await createJournalEntry({
    orgId: original.orgId,
    date: new Date(),
    description: `عكس: ${original.description}${reason ? ` — ${reason}` : ""}`,
    reference: original.entryNumber,
    sourceType: original.sourceType,
    sourceId: original.sourceId ?? undefined,
    createdBy: reversedBy,
    lines: reversalLines,
  });

  // تحديث القيد الأصلي بحالة معكوس
  await db
    .update(journalEntries)
    .set({
      status: "reversed",
      reversedBy,
      reversedAt: new Date(),
      reversalEntryId: result.entryId,
    })
    .where(eq(journalEntries.id, entryId));

  return result;
}

// ============================================================
// POSTING FUNCTIONS — دوال الترحيل حسب نوع العملية
// ============================================================

/**
 * postCashSale — بيع نقدي
 * مدين: الصندوق  |  دائن: الإيراد + ضريبة القيمة المضافة
 */
export async function postCashSale(params: {
  orgId: string;
  date: Date;
  amount: number;      // المبلغ قبل الضريبة
  vatAmount: number;   // مبلغ الضريبة
  description: string;
  sourceType: JournalSourceType;
  sourceId: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, [
    "MAIN_CASH", "SERVICE_REVENUE", "VAT_PAYABLE"
  ], params.tx);

  if (!accounts.MAIN_CASH || !accounts.SERVICE_REVENUE) return null;

  const lines: JournalLineInput[] = [
    { accountId: accounts.MAIN_CASH,       debit: params.amount + params.vatAmount },
    { accountId: accounts.SERVICE_REVENUE,  credit: params.amount },
  ];
  if (params.vatAmount > 0 && accounts.VAT_PAYABLE) {
    lines.push({ accountId: accounts.VAT_PAYABLE, credit: params.vatAmount });
  }

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines,
    tx: params.tx,
  });
}

/**
 * postCreditSale — بيع آجل (فاتورة)
 * مدين: ذمم العملاء  |  دائن: الإيراد + ضريبة
 */
export async function postCreditSale(params: {
  orgId: string;
  date: Date;
  amount: number;
  vatAmount: number;
  description: string;
  sourceType: JournalSourceType;
  sourceId: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, [
    "AR", "SERVICE_REVENUE", "VAT_PAYABLE"
  ], params.tx);

  if (!accounts.AR || !accounts.SERVICE_REVENUE) return null;

  const lines: JournalLineInput[] = [
    { accountId: accounts.AR,              debit: params.amount + params.vatAmount },
    { accountId: accounts.SERVICE_REVENUE,  credit: params.amount },
  ];
  if (params.vatAmount > 0 && accounts.VAT_PAYABLE) {
    lines.push({ accountId: accounts.VAT_PAYABLE, credit: params.vatAmount });
  }

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines,
    tx: params.tx,
  });
}

/**
 * postDepositReceived — عربون مستلم
 * مدين: الصندوق  |  دائن: التزامات العربون (Deferred Revenue)
 */
export async function postDepositReceived(params: {
  orgId: string;
  date: Date;
  amount: number;
  description: string;
  sourceId: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, [
    "MAIN_CASH", "DEFERRED_REVENUE"
  ], params.tx);

  if (!accounts.MAIN_CASH || !accounts.DEFERRED_REVENUE) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "payment",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: accounts.MAIN_CASH,       debit: params.amount },
      { accountId: accounts.DEFERRED_REVENUE, credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postDepositRecognition — الاعتراف بالإيراد عند اكتمال الخدمة
 * مدين: التزامات العربون  |  دائن: إيراد الخدمات
 */
export async function postDepositRecognition(params: {
  orgId: string;
  date: Date;
  amount: number;
  vatAmount: number;
  description: string;
  sourceId: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, [
    "DEFERRED_REVENUE", "SERVICE_REVENUE", "VAT_PAYABLE"
  ], params.tx);

  if (!accounts.DEFERRED_REVENUE || !accounts.SERVICE_REVENUE) return null;

  const lines: JournalLineInput[] = [
    { accountId: accounts.DEFERRED_REVENUE, debit: params.amount + params.vatAmount },
    { accountId: accounts.SERVICE_REVENUE,   credit: params.amount },
  ];
  if (params.vatAmount > 0 && accounts.VAT_PAYABLE) {
    lines.push({ accountId: accounts.VAT_PAYABLE, credit: params.vatAmount });
  }

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "booking",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines,
    tx: params.tx,
  });
}

/**
 * postCustomerCollection — تحصيل من عميل (سداد ذمة)
 * مدين: الصندوق/البنك  |  دائن: ذمم العملاء
 */
export async function postCustomerCollection(params: {
  orgId: string;
  date: Date;
  amount: number;
  description: string;
  sourceId: string;
  useBankAccount?: boolean;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const cashKey = params.useBankAccount ? "MAIN_BANK" : "MAIN_CASH";
  const accounts = await getAccountsByKeys(params.orgId, [cashKey, "AR"], params.tx);

  if (!accounts[cashKey] || !accounts.AR) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "payment",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: accounts[cashKey], debit: params.amount },
      { accountId: accounts.AR,       credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postExpense — تسجيل مصروف نقدي
 * مدين: حساب المصروف  |  دائن: الصندوق
 */
export async function postExpense(params: {
  orgId: string;
  date: Date;
  amount: number;
  expenseAccountId: string;   // account id من chart_of_accounts
  description: string;
  sourceId: string;
  useBankAccount?: boolean;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const cashKey = params.useBankAccount ? "MAIN_BANK" : "MAIN_CASH";
  const accounts = await getAccountsByKeys(params.orgId, [cashKey], params.tx);

  if (!accounts[cashKey]) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "expense",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: params.expenseAccountId, debit: params.amount },
      { accountId: accounts[cashKey],        credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postRefund — استرداد لعميل
 * مدين: إيراد الخدمات  |  دائن: الصندوق
 */
export async function postRefund(params: {
  orgId: string;
  date: Date;
  amount: number;
  vatAmount: number;
  description: string;
  sourceId: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, [
    "MAIN_CASH", "SERVICE_REVENUE", "VAT_PAYABLE"
  ], params.tx);

  if (!accounts.MAIN_CASH || !accounts.SERVICE_REVENUE) return null;

  const lines: JournalLineInput[] = [
    { accountId: accounts.SERVICE_REVENUE, debit: params.amount },
    { accountId: accounts.MAIN_CASH,        credit: params.amount + params.vatAmount },
  ];
  if (params.vatAmount > 0 && accounts.VAT_PAYABLE) {
    lines.push({ accountId: accounts.VAT_PAYABLE, debit: params.vatAmount });
  }

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "payment",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines,
    tx: params.tx,
  });
}

/**
 * postTreasuryTransfer — تحويل بين صناديق
 * مدين: الصندوق المستقبِل  |  دائن: الصندوق المحوِّل
 */
export async function postTreasuryTransfer(params: {
  orgId: string;
  date: Date;
  amount: number;
  fromAccountId: string;  // gl_account_id للصندوق المحوِّل
  toAccountId: string;    // gl_account_id للصندوق المستقبِل
  description: string;
  sourceId: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  if (!params.fromAccountId || !params.toAccountId) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "transfer",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: params.toAccountId,   debit: params.amount },
      { accountId: params.fromAccountId, credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postPOSSale — بيع نقطة البيع
 * مدين: الصندوق  |  دائن: إيراد المبيعات + ضريبة
 */
export async function postPOSSale(params: {
  orgId: string;
  date: Date;
  amount: number;
  vatAmount: number;
  description: string;
  sourceId: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, [
    "MAIN_CASH", "SALES_REVENUE", "VAT_PAYABLE"
  ], params.tx);

  if (!accounts.MAIN_CASH || !accounts.SALES_REVENUE) return null;

  const lines: JournalLineInput[] = [
    { accountId: accounts.MAIN_CASH,     debit: params.amount + params.vatAmount },
    { accountId: accounts.SALES_REVENUE,  credit: params.amount },
  ];
  if (params.vatAmount > 0 && accounts.VAT_PAYABLE) {
    lines.push({ accountId: accounts.VAT_PAYABLE, credit: params.vatAmount });
  }

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "pos",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines,
    tx: params.tx,
  });
}

/**
 * postAccrual — مصروف مستحق (Accrued Expense)
 * يُستخدم عند إثبات مصروف قبل دفعه نقداً
 * مدين: حساب المصروف  |  دائن: مصروفات مستحقة الدفع
 */
export async function postAccrual(params: {
  orgId: string;
  date: Date;
  amount: number;
  expenseAccountId: string;  // account id من chart_of_accounts
  description: string;
  sourceId?: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, ["ACCRUED_EXPENSES"], params.tx);
  if (!accounts.ACCRUED_EXPENSES) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "manual",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: params.expenseAccountId,    debit: params.amount },
      { accountId: accounts.ACCRUED_EXPENSES,  credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postAccrualSettlement — سداد مصروف مستحق
 * مدين: مصروفات مستحقة الدفع  |  دائن: الصندوق/البنك
 */
export async function postAccrualSettlement(params: {
  orgId: string;
  date: Date;
  amount: number;
  description: string;
  sourceId?: string;
  useBankAccount?: boolean;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const cashKey = params.useBankAccount ? "MAIN_BANK" : "MAIN_CASH";
  const accounts = await getAccountsByKeys(params.orgId, ["ACCRUED_EXPENSES", cashKey], params.tx);
  if (!accounts.ACCRUED_EXPENSES || !accounts[cashKey]) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "payment",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: accounts.ACCRUED_EXPENSES, debit: params.amount },
      { accountId: accounts[cashKey],          credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postDepreciation — قيد الإهلاك الدوري
 * مدين: مصروف الإهلاك  |  دائن: مجمع الإهلاك
 */
export async function postDepreciation(params: {
  orgId: string;
  date: Date;
  amount: number;
  description: string;
  assetAccountId?: string; // اختياري: إذا أُريد تحديد مجمع إهلاك أصل معين
  sourceId?: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, [
    "DEPRECIATION_EXPENSE", "ACCUMULATED_DEPRECIATION"
  ], params.tx);
  if (!accounts.DEPRECIATION_EXPENSE || !accounts.ACCUMULATED_DEPRECIATION) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "manual",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: accounts.DEPRECIATION_EXPENSE,    debit: params.amount },
      { accountId: accounts.ACCUMULATED_DEPRECIATION, credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postDeferralRecognition — الاعتراف بإيراد مؤجل
 * مدين: الإيرادات المؤجلة  |  دائن: حساب الإيراد
 * (مختلف عن postDepositRecognition الذي خاص بالعربون)
 */
export async function postDeferralRecognition(params: {
  orgId: string;
  date: Date;
  amount: number;
  revenueAccountId: string; // الحساب المحدد للإيراد
  description: string;
  sourceId?: string;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const accounts = await getAccountsByKeys(params.orgId, ["DEFERRED_REVENUE"], params.tx);
  if (!accounts.DEFERRED_REVENUE) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "manual",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: accounts.DEFERRED_REVENUE,   debit: params.amount },
      { accountId: params.revenueAccountId,      credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postPurchase — شراء مخزون أو أصول بالآجل أو النقد
 * مدين: المخزون/الأصل  |  دائن: ذمم الموردين أو الصندوق
 */
export async function postPurchase(params: {
  orgId: string;
  date: Date;
  amount: number;
  assetAccountId: string;  // حساب المخزون أو الأصل المشترى
  description: string;
  sourceId?: string;
  payOnCredit?: boolean;   // true = آجل (AP), false = نقدي (MAIN_CASH)
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const creditKey = params.payOnCredit ? "AP" : "MAIN_CASH";
  const accounts = await getAccountsByKeys(params.orgId, [creditKey], params.tx);
  if (!accounts[creditKey]) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "payment",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: params.assetAccountId, debit: params.amount },
      { accountId: accounts[creditKey],   credit: params.amount },
    ],
    tx: params.tx,
  });
}

/**
 * postSupplierPayment — سداد ذمة لمورد
 * مدين: ذمم الموردين  |  دائن: الصندوق/البنك
 */
export async function postSupplierPayment(params: {
  orgId: string;
  date: Date;
  amount: number;
  description: string;
  sourceId?: string;
  useBankAccount?: boolean;
  createdBy?: string;
  tx?: DbExecutor;
}): Promise<PostingResult | null> {
  const cashKey = params.useBankAccount ? "MAIN_BANK" : "MAIN_CASH";
  const accounts = await getAccountsByKeys(params.orgId, ["AP", cashKey], params.tx);
  if (!accounts.AP || !accounts[cashKey]) return null;

  return createJournalEntry({
    orgId: params.orgId,
    date: params.date,
    description: params.description,
    sourceType: "payment",
    sourceId: params.sourceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: accounts.AP,       debit: params.amount },
      { accountId: accounts[cashKey], credit: params.amount },
    ],
    tx: params.tx,
  });
}

// ============================================================
// PERIOD CLOSING — إقفال الفترة المالية
// يُولِّد قيود الإقفال لجميع حسابات الإيرادات والمصروفات
// الخطوات:
//   1. أقفل الإيرادات → ملخص الدخل
//   2. أقفل المصروفات → ملخص الدخل
//   3. أقفل ملخص الدخل → الأرباح المبقاة
// ============================================================

export interface PeriodClosingResult {
  revenueEntry: PostingResult | null;
  expenseEntry: PostingResult | null;
  incomeSummaryEntry: PostingResult | null;
  netIncome: number;
}

export async function postPeriodClosingEntries(
  orgId: string,
  periodId: string,
  closedBy: string
): Promise<PeriodClosingResult> {
  // جلب جميع حسابات الإيرادات والمصروفات التي لها رصيد في هذه الفترة
  const rows = await db.execute(sql`
    SELECT
      coa.id,
      coa.type,
      coa.normal_balance,
      COALESCE(SUM(jel.debit::numeric), 0)  AS total_debit,
      COALESCE(SUM(jel.credit::numeric), 0) AS total_credit,
      CASE
        WHEN coa.normal_balance = 'credit'
          THEN COALESCE(SUM(jel.credit::numeric), 0) - COALESCE(SUM(jel.debit::numeric), 0)
        ELSE
          COALESCE(SUM(jel.debit::numeric), 0) - COALESCE(SUM(jel.credit::numeric), 0)
      END AS net_balance
    FROM chart_of_accounts coa
    JOIN journal_entry_lines jel ON jel.account_id = coa.id
    JOIN journal_entries je ON je.id = jel.entry_id
    WHERE coa.org_id = ${orgId}
      AND coa.type IN ('revenue', 'expense')
      AND coa.is_posting_allowed = true
      AND je.org_id = ${orgId}
      AND je.period_id = ${periodId}
      AND je.status = 'posted'
      AND je.source_type != 'closing'
    GROUP BY coa.id, coa.type, coa.normal_balance
    HAVING
      ABS(CASE
        WHEN coa.normal_balance = 'credit'
          THEN COALESCE(SUM(jel.credit::numeric), 0) - COALESCE(SUM(jel.debit::numeric), 0)
        ELSE
          COALESCE(SUM(jel.debit::numeric), 0) - COALESCE(SUM(jel.credit::numeric), 0)
      END) > 0.005
  `);

  const accounts = rows.rows as any[];
  const revenues = accounts.filter((a) => a.type === "revenue");
  const expenses = accounts.filter((a) => a.type === "expense");

  const systemAccounts = await getAccountsByKeys(orgId, ["INCOME_SUMMARY", "RETAINED_EARNINGS"]);
  if (!systemAccounts.INCOME_SUMMARY || !systemAccounts.RETAINED_EARNINGS) {
    throw new Error("حسابات النظام (ملخص الدخل / الأرباح المبقاة) غير موجودة");
  }

  const closingDate = new Date();
  let revenueEntry: PostingResult | null = null;
  let expenseEntry: PostingResult | null = null;
  let incomeSummaryEntry: PostingResult | null = null;

  // ── الخطوة 1: إقفال الإيرادات إلى ملخص الدخل ──────────────
  // الإيرادات طبيعتها دائنة — لإقفالها نُعكسها: مدين إيراد / دائن ملخص الدخل
  if (revenues.length > 0) {
    const totalRevenue = revenues.reduce((s: number, r: { id: string; net_balance: string }) => s + parseFloat(r.net_balance), 0);
    const revenueLines: JournalLineInput[] = [
      ...revenues.map((r: { id: string; net_balance: string }) => ({
        accountId: r.id,
        debit: parseFloat(r.net_balance),
        description: "إقفال إيراد",
      })),
      {
        accountId: systemAccounts.INCOME_SUMMARY,
        credit: totalRevenue,
        description: "إجمالي الإيرادات المُقفلة",
      },
    ];

    revenueEntry = await createJournalEntry({
      orgId,
      date: closingDate,
      description: `إقفال الإيرادات — ${periodId}`,
      sourceType: "closing",
      periodId,
      createdBy: closedBy,
      lines: revenueLines,
    });
  }

  // ── الخطوة 2: إقفال المصروفات إلى ملخص الدخل ───────────────
  // المصروفات طبيعتها مدينة — لإقفالها نُعكسها: دائن مصروف / مدين ملخص الدخل
  if (expenses.length > 0) {
    const totalExpense = expenses.reduce((s: number, r: { id: string; net_balance: string }) => s + parseFloat(r.net_balance), 0);
    const expenseLines: JournalLineInput[] = [
      {
        accountId: systemAccounts.INCOME_SUMMARY,
        debit: totalExpense,
        description: "إجمالي المصروفات المُقفلة",
      },
      ...expenses.map((r: { id: string; net_balance: string }) => ({
        accountId: r.id,
        credit: parseFloat(r.net_balance),
        description: "إقفال مصروف",
      })),
    ];

    expenseEntry = await createJournalEntry({
      orgId,
      date: closingDate,
      description: `إقفال المصروفات — ${periodId}`,
      sourceType: "closing",
      periodId,
      createdBy: closedBy,
      lines: expenseLines,
    });
  }

  // ── الخطوة 3: إقفال ملخص الدخل إلى الأرباح المبقاة ─────────
  const totalRevenue = revenues.reduce((s: number, r: { id: string; net_balance: string }) => s + parseFloat(r.net_balance), 0);
  const totalExpense = expenses.reduce((s: number, r: { id: string; net_balance: string }) => s + parseFloat(r.net_balance), 0);
  const netIncome = totalRevenue - totalExpense;

  if (Math.abs(netIncome) > 0.005) {
    const isProfit = netIncome > 0;
    incomeSummaryEntry = await createJournalEntry({
      orgId,
      date: closingDate,
      description: `إقفال ملخص الدخل (${isProfit ? "ربح" : "خسارة"}: ${Math.abs(netIncome).toFixed(2)})`,
      sourceType: "closing",
      periodId,
      createdBy: closedBy,
      lines: isProfit
        ? [
            { accountId: systemAccounts.INCOME_SUMMARY,   debit: netIncome },
            { accountId: systemAccounts.RETAINED_EARNINGS, credit: netIncome },
          ]
        : [
            { accountId: systemAccounts.RETAINED_EARNINGS, debit: Math.abs(netIncome) },
            { accountId: systemAccounts.INCOME_SUMMARY,    credit: Math.abs(netIncome) },
          ],
    });
  }

  return { revenueEntry, expenseEntry, incomeSummaryEntry, netIncome };
}

// ============================================================
// CAPABILITY CHECK
// يتحقق أن المنشأة فعّلت enable_full_accounting قبل الترحيل
// ============================================================

export function isAccountingEnabled(orgSettings: Record<string, any>): boolean {
  return orgSettings?.financial?.enable_full_accounting === true;
}

// ============================================================
// INVENTORY MOVEMENT — حركة المخزون
// ============================================================

export async function postInventoryMovement(params: {
  orgId: string;
  productId: string;
  productName: string;
  movementType: "in" | "out" | "adjustment" | "waste" | "return";
  quantity: number;
  unitCost: number;
  date?: Date;
  description?: string;
}): Promise<PostingResult | null> {
  const { orgId, productName, movementType, quantity, unitCost, date, description } = params;
  const amount = Math.abs(quantity * unitCost);
  if (amount <= 0) return null;

  const [inventoryAcc, cogsAcc, adjustAcc] = await Promise.all([
    getAccountByKey(orgId, "INVENTORY"),
    getAccountByKey(orgId, "COGS"),
    getAccountByKey(orgId, "INVENTORY_ADJUSTMENT"),
  ]);

  const refDate = date ?? new Date();
  const desc = description ?? `حركة مخزون — ${productName} — ${quantity} وحدة`;

  // out / waste: DR COGS (or adjustment) CR Inventory
  if (movementType === "out" || movementType === "waste") {
    const drAccount = movementType === "waste" ? (adjustAcc ?? cogsAcc) : cogsAcc;
    if (!drAccount || !inventoryAcc) return null;
    return createJournalEntry({
      orgId, description: desc, date: refDate,
      sourceType: "manual",
      lines: [
        { accountId: drAccount,    debit: amount, credit: 0,      description: desc },
        { accountId: inventoryAcc, debit: 0,      credit: amount, description: desc },
      ],
    });
  }

  // in / return: DR Inventory CR Adjustment
  if (movementType === "in" || movementType === "return") {
    const crAccount = adjustAcc;
    if (!inventoryAcc || !crAccount) return null;
    return createJournalEntry({
      orgId, description: desc, date: refDate,
      sourceType: "manual",
      lines: [
        { accountId: inventoryAcc, debit: amount, credit: 0,      description: desc },
        { accountId: crAccount,    debit: 0,      credit: amount, description: desc },
      ],
    });
  }

  // adjustment: DR/CR based on sign
  if (!inventoryAcc || !adjustAcc) return null;
  const isPositive = quantity >= 0;
  return createJournalEntry({
    orgId, description: desc, date: refDate,
    sourceType: "manual",
    lines: isPositive
      ? [
          { accountId: inventoryAcc, debit: amount, credit: 0,      description: desc },
          { accountId: adjustAcc,    debit: 0,      credit: amount, description: desc },
        ]
      : [
          { accountId: adjustAcc,    debit: amount, credit: 0,      description: desc },
          { accountId: inventoryAcc, debit: 0,      credit: amount, description: desc },
        ],
  });
}
