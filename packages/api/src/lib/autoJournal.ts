/**
 * AUTO JOURNAL HELPER — مساعد القيود التلقائية
 *
 * غلاف خفيف حول محرك الترحيل (posting-engine).
 * يُنشئ قيوداً محاسبية تلقائياً عند الأحداث التشغيلية.
 *
 * المبادئ:
 * - لا يُوقف العملية الأصلية أبداً (try/catch صامت)
 * - يتحقق من تفعيل enable_full_accounting قبل أي شيء
 * - يبحث عن الحسابات بالـ system_key ويتجاهل إذا لم تُكوَّن
 */

import { db } from "@nasaq/db/client";
import { organizations, chartOfAccounts } from "@nasaq/db/schema";
import { eq, and } from "drizzle-orm";
import { getAccountByKey, createJournalEntry } from "./posting-engine";

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

async function isAccountingEnabled(orgId: string): Promise<boolean> {
  try {
    const [org] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(eq(organizations.id, orgId));
    return (org?.settings as any)?.financial?.enable_full_accounting === true;
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────
// AUTO JOURNAL
// ────────────────────────────────────────────────────────────

export const autoJournal = {

  /**
   * bookingConfirmed — تأكيد الحجز
   * مدين: ذمم العملاء (AR) | دائن: إيراد الخدمات (SERVICE_REVENUE)
   */
  async bookingConfirmed(params: {
    orgId: string;
    bookingId: string;
    bookingNumber: string;
    amount: number;
    description?: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;

      const [arId, revenueId] = await Promise.all([
        getAccountByKey(params.orgId, "AR"),
        getAccountByKey(params.orgId, "SERVICE_REVENUE"),
      ]);
      if (!arId || !revenueId) return null;

      await createJournalEntry({
        orgId: params.orgId,
        date: new Date(),
        description: params.description ?? `تأكيد حجز ${params.bookingNumber}`,
        sourceType: "manual",
        sourceId: params.bookingId,
        lines: [
          { accountId: arId,       debit: params.amount },
          { accountId: revenueId,  credit: params.amount },
        ],
      });
    } catch {
      // صامت — لا يُوقف العملية الأصلية
    }
    return null;
  },

  /**
   * bookingCancelled — إلغاء الحجز (قيد عكسي)
   * مدين: إيراد الخدمات (SERVICE_REVENUE) | دائن: ذمم العملاء (AR)
   */
  async bookingCancelled(params: {
    orgId: string;
    bookingId: string;
    bookingNumber: string;
    amount: number;
    description?: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;

      const [arId, revenueId] = await Promise.all([
        getAccountByKey(params.orgId, "AR"),
        getAccountByKey(params.orgId, "SERVICE_REVENUE"),
      ]);
      if (!arId || !revenueId) return null;

      await createJournalEntry({
        orgId: params.orgId,
        date: new Date(),
        description: params.description ?? `إلغاء حجز ${params.bookingNumber}`,
        sourceType: "manual",
        sourceId: params.bookingId,
        lines: [
          { accountId: revenueId,  debit: params.amount },
          { accountId: arId,       credit: params.amount },
        ],
      });
    } catch {
      // صامت
    }
    return null;
  },

  /**
   * invoiceIssued — إصدار فاتورة
   * مدين: ذمم العملاء (AR) | دائن: إيراد المبيعات (SALES_REVENUE)
   */
  async invoiceIssued(params: {
    orgId: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    description?: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;

      const [arId, revenueId] = await Promise.all([
        getAccountByKey(params.orgId, "AR"),
        getAccountByKey(params.orgId, "SALES_REVENUE"),
      ]);
      if (!arId || !revenueId) return null;

      await createJournalEntry({
        orgId: params.orgId,
        date: new Date(),
        description: params.description ?? `إصدار فاتورة ${params.invoiceNumber}`,
        sourceType: "manual",
        sourceId: params.invoiceId,
        lines: [
          { accountId: arId,       debit: params.amount },
          { accountId: revenueId,  credit: params.amount },
        ],
      });
    } catch {
      // صامت
    }
    return null;
  },

  /**
   * invoicePaid — سداد فاتورة
   * مدين: الصندوق أو البنك (MAIN_CASH / MAIN_BANK) | دائن: ذمم العملاء (AR)
   */
  async invoicePaid(params: {
    orgId: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    paymentMethod: string;
    description?: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;

      const cashKey = params.paymentMethod === "bank_transfer" ? "MAIN_BANK" : "MAIN_CASH";

      const [cashId, arId] = await Promise.all([
        getAccountByKey(params.orgId, cashKey),
        getAccountByKey(params.orgId, "AR"),
      ]);
      if (!cashId || !arId) return null;

      await createJournalEntry({
        orgId: params.orgId,
        date: new Date(),
        description: params.description ?? `تحصيل فاتورة ${params.invoiceNumber}`,
        sourceType: "manual",
        sourceId: params.invoiceId,
        lines: [
          { accountId: cashId,  debit: params.amount },
          { accountId: arId,    credit: params.amount },
        ],
      });
    } catch {
      // صامت
    }
    return null;
  },

  /**
   * contractPaymentReceived — استلام دفعة عقد
   * مدين: الصندوق أو البنك (MAIN_CASH / MAIN_BANK) | دائن: إيراد العقود / ذمم العملاء (AR)
   */
  async contractPaymentReceived(params: {
    orgId: string;
    contractId: string;
    contractNumber: string;
    amount: number;
    paymentMethod: string;
    description?: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;

      const cashKey = params.paymentMethod === "bank_transfer" ? "MAIN_BANK" : "MAIN_CASH";

      const [cashId, arId] = await Promise.all([
        getAccountByKey(params.orgId, cashKey),
        getAccountByKey(params.orgId, "AR"),
      ]);
      if (!cashId || !arId) return null;

      await createJournalEntry({
        orgId: params.orgId,
        date: new Date(),
        description: params.description ?? `دفعة عقد ${params.contractNumber}`,
        sourceType: "manual",
        sourceId: params.contractId,
        lines: [
          { accountId: cashId, debit: params.amount },
          { accountId: arId,   credit: params.amount },
        ],
      });
    } catch {
      // صامت
    }
    return null;
  },

  /**
   * expenseRecorded — تسجيل مصروف
   * مدين: حساب المصروف المناسب | دائن: الصندوق (MAIN_CASH)
   */
  async expenseRecorded(params: {
    orgId: string;
    expenseId: string;
    amount: number;
    category: string;
    description?: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;

      // تحديد حساب المصروف حسب الفئة
      let expenseId: string | null = null;

      if (params.category === "rent") {
        expenseId = await getAccountByKey(params.orgId, "RENT_EXPENSE");
      } else if (params.category === "salaries") {
        expenseId = await getAccountByKey(params.orgId, "SALARIES_EXPENSE");
      }

      // fallback: ابحث عن "مصروفات عامة" بالاسم
      if (!expenseId) {
        const [general] = await db
          .select({ id: chartOfAccounts.id })
          .from(chartOfAccounts)
          .where(
            and(
              eq(chartOfAccounts.orgId, params.orgId),
              eq(chartOfAccounts.name, "مصروفات عامة"),
              eq(chartOfAccounts.isActive, true)
            )
          )
          .limit(1);
        expenseId = general?.id ?? null;
      }

      // fallback نهائي: AR
      if (!expenseId) {
        expenseId = await getAccountByKey(params.orgId, "AR");
      }

      if (!expenseId) return null;

      const cashId = await getAccountByKey(params.orgId, "MAIN_CASH");
      if (!cashId) return null;

      await createJournalEntry({
        orgId: params.orgId,
        date: new Date(),
        description: params.description ?? `مصروف — ${params.category}`,
        sourceType: "manual",
        sourceId: params.expenseId,
        lines: [
          { accountId: expenseId,  debit: params.amount },
          { accountId: cashId,     credit: params.amount },
        ],
      });
    } catch {
      // صامت
    }
    return null;
  },

  async salaryPaid(params: {
    orgId: string; payrollId: string; payrollNumber: string;
    netAmount: number; month: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.netAmount || params.netAmount <= 0) return null;
      const [salaryExpId, cashId] = await Promise.all([
        getAccountByKey(params.orgId, "SALARY_EXPENSE"),
        getAccountByKey(params.orgId, "CASH"),
      ]);
      if (!salaryExpId || !cashId) return null;
      await createJournalEntry({
        orgId: params.orgId, date: new Date(),
        description: `صرف رواتب ${params.month} — ${params.payrollNumber}`,
        sourceType: "manual", sourceId: params.payrollId,
        lines: [
          { accountId: salaryExpId, debit: params.netAmount },
          { accountId: cashId,      credit: params.netAmount },
        ],
      });
    } catch {}
    return null;
  },

  async gosiExpense(params: {
    orgId: string; payrollId: string; employerAmount: number; month: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.employerAmount || params.employerAmount <= 0) return null;
      const [gosiExpId, gosiLiabId] = await Promise.all([
        getAccountByKey(params.orgId, "GOSI_EXPENSE"),
        getAccountByKey(params.orgId, "GOSI_PAYABLE"),
      ]);
      if (!gosiExpId || !gosiLiabId) return null;
      await createJournalEntry({
        orgId: params.orgId, date: new Date(),
        description: `مصروف GOSI صاحب العمل ${params.month}`,
        sourceType: "manual", sourceId: params.payrollId,
        lines: [
          { accountId: gosiExpId,  debit: params.employerAmount },
          { accountId: gosiLiabId, credit: params.employerAmount },
        ],
      });
    } catch {}
    return null;
  },

  async loanApproved(params: {
    orgId: string; loanId: string; loanNumber: string; amount: number; employeeName: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;
      const [loanAssetId, cashId] = await Promise.all([
        getAccountByKey(params.orgId, "EMPLOYEE_LOANS"),
        getAccountByKey(params.orgId, "CASH"),
      ]);
      if (!loanAssetId || !cashId) return null;
      await createJournalEntry({
        orgId: params.orgId, date: new Date(),
        description: `سلفة موظف — ${params.employeeName} — ${params.loanNumber}`,
        sourceType: "manual", sourceId: params.loanId,
        lines: [
          { accountId: loanAssetId, debit: params.amount },
          { accountId: cashId,      credit: params.amount },
        ],
      });
    } catch {}
    return null;
  },

  async gratuitySettled(params: {
    orgId: string; employeeId: string; employeeName: string; amount: number;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;
      const [provisionId, cashId] = await Promise.all([
        getAccountByKey(params.orgId, "GRATUITY_PROVISION"),
        getAccountByKey(params.orgId, "CASH"),
      ]);
      if (!provisionId || !cashId) return null;
      await createJournalEntry({
        orgId: params.orgId, date: new Date(),
        description: `صرف مكافأة نهاية الخدمة — ${params.employeeName}`,
        sourceType: "manual", sourceId: params.employeeId,
        lines: [
          { accountId: provisionId, debit: params.amount },
          { accountId: cashId,      credit: params.amount },
        ],
      });
    } catch {}
    return null;
  },

  async govFeesPaid(params: {
    orgId: string; feeId: string; amount: number; description: string;
  }): Promise<null> {
    try {
      if (!(await isAccountingEnabled(params.orgId))) return null;
      if (!params.amount || params.amount <= 0) return null;
      const [govExpId, cashId] = await Promise.all([
        getAccountByKey(params.orgId, "GOV_FEES_EXPENSE"),
        getAccountByKey(params.orgId, "CASH"),
      ]);
      if (!govExpId || !cashId) return null;
      await createJournalEntry({
        orgId: params.orgId, date: new Date(),
        description: `رسوم حكومية — ${params.description}`,
        sourceType: "manual", sourceId: params.feeId,
        lines: [
          { accountId: govExpId, debit: params.amount },
          { accountId: cashId,   credit: params.amount },
        ],
      });
    } catch {}
    return null;
  },
};
