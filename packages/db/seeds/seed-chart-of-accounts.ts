/**
 * Seed default Chart of Accounts for an organization.
 * يُستدعى عند إنشاء منظمة جديدة أو من migration.
 *
 * Usage:
 *   import { seedChartOfAccounts } from "./seed-chart-of-accounts";
 *   await seedChartOfAccounts(db, orgId);
 */

import { db } from "../client";
import { chartOfAccounts } from "../schema/accounting";

// ============================================================
// هيكل دليل الحسابات الافتراضي
// ============================================================

interface AccountSeed {
  code: string;
  name: string;
  nameEn: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  normalBalance: "debit" | "credit";
  level: number;
  parentCode?: string;
  isPostingAllowed: boolean;
  isSystemAccount: boolean;
  systemKey?: string;
}

const DEFAULT_ACCOUNTS: AccountSeed[] = [
  // ============================================================
  // 1000 — الأصول
  // ============================================================
  { code: "1000", name: "الأصول", nameEn: "Assets",
    type: "asset", normalBalance: "debit", level: 1, isPostingAllowed: false, isSystemAccount: false },

  { code: "1100", name: "الأصول المتداولة", nameEn: "Current Assets",
    type: "asset", normalBalance: "debit", level: 2, parentCode: "1000", isPostingAllowed: false, isSystemAccount: false },

  { code: "1110", name: "النقدية والصناديق", nameEn: "Cash & Cash Equivalents",
    type: "asset", normalBalance: "debit", level: 3, parentCode: "1100", isPostingAllowed: false, isSystemAccount: false },

  { code: "1111", name: "الصندوق الرئيسي", nameEn: "Main Cash",
    type: "asset", normalBalance: "debit", level: 4, parentCode: "1110",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "MAIN_CASH" },

  { code: "1112", name: "الحساب البنكي الرئيسي", nameEn: "Main Bank Account",
    type: "asset", normalBalance: "debit", level: 4, parentCode: "1110",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "MAIN_BANK" },

  { code: "1120", name: "ذمم العملاء", nameEn: "Accounts Receivable",
    type: "asset", normalBalance: "debit", level: 3, parentCode: "1100",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "AR" },

  { code: "1130", name: "المخزون", nameEn: "Inventory",
    type: "asset", normalBalance: "debit", level: 3, parentCode: "1100",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "INVENTORY" },

  { code: "1140", name: "مصروفات مدفوعة مقدماً", nameEn: "Prepaid Expenses",
    type: "asset", normalBalance: "debit", level: 3, parentCode: "1100",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "1200", name: "الأصول الثابتة", nameEn: "Fixed Assets",
    type: "asset", normalBalance: "debit", level: 2, parentCode: "1000", isPostingAllowed: false, isSystemAccount: false },

  { code: "1210", name: "الأثاث والمعدات", nameEn: "Furniture & Equipment",
    type: "asset", normalBalance: "debit", level: 3, parentCode: "1200",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "1220", name: "مجمع الإهلاك", nameEn: "Accumulated Depreciation",
    type: "asset", normalBalance: "credit", level: 3, parentCode: "1200",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "ACCUMULATED_DEPRECIATION" },

  // ============================================================
  // 2000 — الخصوم
  // ============================================================
  { code: "2000", name: "الخصوم", nameEn: "Liabilities",
    type: "liability", normalBalance: "credit", level: 1, isPostingAllowed: false, isSystemAccount: false },

  { code: "2100", name: "الخصوم المتداولة", nameEn: "Current Liabilities",
    type: "liability", normalBalance: "credit", level: 2, parentCode: "2000", isPostingAllowed: false, isSystemAccount: false },

  { code: "2110", name: "ذمم الموردين", nameEn: "Accounts Payable",
    type: "liability", normalBalance: "credit", level: 3, parentCode: "2100",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "AP" },

  { code: "2120", name: "التزامات العربون", nameEn: "Deferred Revenue (Deposits)",
    type: "liability", normalBalance: "credit", level: 3, parentCode: "2100",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "DEFERRED_REVENUE" },

  { code: "2130", name: "ضريبة القيمة المضافة — المخرجات", nameEn: "VAT Payable",
    type: "liability", normalBalance: "credit", level: 3, parentCode: "2100",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "VAT_PAYABLE" },

  { code: "2140", name: "رواتب مستحقة الدفع", nameEn: "Accrued Salaries",
    type: "liability", normalBalance: "credit", level: 3, parentCode: "2100",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "2150", name: "مصروفات مستحقة الدفع", nameEn: "Accrued Expenses",
    type: "liability", normalBalance: "credit", level: 3, parentCode: "2100",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "ACCRUED_EXPENSES" },

  { code: "2200", name: "الخصوم طويلة الأجل", nameEn: "Long-term Liabilities",
    type: "liability", normalBalance: "credit", level: 2, parentCode: "2000", isPostingAllowed: false, isSystemAccount: false },

  { code: "2210", name: "قروض بنكية طويلة الأجل", nameEn: "Long-term Bank Loans",
    type: "liability", normalBalance: "credit", level: 3, parentCode: "2200",
    isPostingAllowed: true, isSystemAccount: false },

  // ============================================================
  // 3000 — حقوق الملكية
  // ============================================================
  { code: "3000", name: "حقوق الملكية", nameEn: "Equity",
    type: "equity", normalBalance: "credit", level: 1, isPostingAllowed: false, isSystemAccount: false },

  { code: "3100", name: "رأس المال", nameEn: "Capital",
    type: "equity", normalBalance: "credit", level: 2, parentCode: "3000",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "CAPITAL" },

  { code: "3200", name: "الأرباح المبقاة", nameEn: "Retained Earnings",
    type: "equity", normalBalance: "credit", level: 2, parentCode: "3000",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "RETAINED_EARNINGS" },

  { code: "3300", name: "ملخص الدخل", nameEn: "Income Summary",
    type: "equity", normalBalance: "credit", level: 2, parentCode: "3000",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "INCOME_SUMMARY" },

  // ============================================================
  // 4000 — الإيرادات
  // ============================================================
  { code: "4000", name: "الإيرادات", nameEn: "Revenue",
    type: "revenue", normalBalance: "credit", level: 1, isPostingAllowed: false, isSystemAccount: false },

  { code: "4100", name: "إيراد الخدمات", nameEn: "Service Revenue",
    type: "revenue", normalBalance: "credit", level: 2, parentCode: "4000",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "SERVICE_REVENUE" },

  { code: "4200", name: "إيراد المبيعات", nameEn: "Sales Revenue",
    type: "revenue", normalBalance: "credit", level: 2, parentCode: "4000",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "SALES_REVENUE" },

  { code: "4300", name: "إيرادات أخرى", nameEn: "Other Revenue",
    type: "revenue", normalBalance: "credit", level: 2, parentCode: "4000",
    isPostingAllowed: true, isSystemAccount: false },

  // ============================================================
  // 5000 — المصروفات
  // ============================================================
  { code: "5000", name: "المصروفات", nameEn: "Expenses",
    type: "expense", normalBalance: "debit", level: 1, isPostingAllowed: false, isSystemAccount: false },

  { code: "5100", name: "رواتب وأجور", nameEn: "Salaries & Wages",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "SALARIES_EXPENSE" },

  { code: "5200", name: "إيجار", nameEn: "Rent Expense",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "RENT_EXPENSE" },

  { code: "5300", name: "تسويق ودعاية", nameEn: "Marketing & Advertising",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "5400", name: "نقل ومواصلات", nameEn: "Transport & Logistics",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "5500", name: "صيانة وإصلاح", nameEn: "Maintenance & Repairs",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "5600", name: "مصروفات خدمات", nameEn: "Utilities",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "5700", name: "مستلزمات وإمدادات", nameEn: "Supplies",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "5800", name: "مصروفات متنوعة", nameEn: "Miscellaneous Expenses",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: false },

  { code: "5900", name: "إهلاك", nameEn: "Depreciation Expense",
    type: "expense", normalBalance: "debit", level: 2, parentCode: "5000",
    isPostingAllowed: true, isSystemAccount: true, systemKey: "DEPRECIATION_EXPENSE" },
];

// ============================================================
// الدالة الرئيسية
// ============================================================

export async function seedChartOfAccounts(orgId: string): Promise<void> {
  // نبني خريطة code → id لربط parentId
  const codeToId = new Map<string, string>();

  for (const acc of DEFAULT_ACCOUNTS) {
    const parentId = acc.parentCode ? codeToId.get(acc.parentCode) ?? null : null;

    const [inserted] = await db
      .insert(chartOfAccounts)
      .values({
        orgId,
        code: acc.code,
        name: acc.name,
        nameEn: acc.nameEn,
        type: acc.type,
        normalBalance: acc.normalBalance,
        level: acc.level,
        parentId: parentId ?? undefined,
        isPostingAllowed: acc.isPostingAllowed,
        isSystemAccount: acc.isSystemAccount,
        systemKey: acc.systemKey ?? null,
        isActive: true,
      })
      .onConflictDoNothing() // org_id + code unique — تجاهل إذا موجود
      .returning({ id: chartOfAccounts.id });

    if (inserted) {
      codeToId.set(acc.code, inserted.id);
    }
  }
}

// تشغيل مباشر: pnpm tsx packages/db/seeds/seed-chart-of-accounts.ts <orgId>
if (process.argv[2]) {
  seedChartOfAccounts(process.argv[2])
    .then(() => { console.log("Chart of accounts seeded."); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
