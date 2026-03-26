// ============================================================
// CHART OF ACCOUNTS AUTO-SEED
// Seeds standard Saudi Arabic accounts for new organizations
// ============================================================

import { pool } from "@nasaq/db/client";

export async function seedChartOfAccounts(orgId: string): Promise<void> {
  try {
    // Check if already seeded
    const existing = await pool.query(
      "SELECT COUNT(*) as count FROM chart_of_accounts WHERE org_id = $1",
      [orgId]
    );
    if (parseInt(existing.rows[0].count) > 0) return; // already seeded

    const accounts = [
      // ─── الأصول (Assets) ─────────────────────────────────
      { code: "1000", name: "الأصول",                     nameEn: "Assets",               type: "asset",     normalBalance: "debit",  level: 1, parentCode: null,   systemKey: null },
      { code: "1100", name: "الأصول المتداولة",           nameEn: "Current Assets",        type: "asset",     normalBalance: "debit",  level: 2, parentCode: "1000", systemKey: null },
      { code: "1110", name: "الصندوق والبنك",             nameEn: "Cash & Bank",           type: "asset",     normalBalance: "debit",  level: 3, parentCode: "1100", systemKey: null },
      { code: "1111", name: "الصندوق",                   nameEn: "Cash on Hand",          type: "asset",     normalBalance: "debit",  level: 4, parentCode: "1110", systemKey: "MAIN_CASH" },
      { code: "1112", name: "البنك",                     nameEn: "Bank Account",          type: "asset",     normalBalance: "debit",  level: 4, parentCode: "1110", systemKey: "MAIN_BANK" },
      { code: "1120", name: "حسابات القبض",              nameEn: "Accounts Receivable",   type: "asset",     normalBalance: "debit",  level: 3, parentCode: "1100", systemKey: "AR" },
      { code: "1130", name: "المخزون",                   nameEn: "Inventory",             type: "asset",     normalBalance: "debit",  level: 3, parentCode: "1100", systemKey: "INVENTORY" },
      { code: "1140", name: "مصاريف مدفوعة مقدماً",     nameEn: "Prepaid Expenses",      type: "asset",     normalBalance: "debit",  level: 3, parentCode: "1100", systemKey: null },
      { code: "1200", name: "الأصول غير المتداولة",      nameEn: "Non-Current Assets",    type: "asset",     normalBalance: "debit",  level: 2, parentCode: "1000", systemKey: null },
      { code: "1210", name: "الأصول الثابتة",            nameEn: "Fixed Assets",          type: "asset",     normalBalance: "debit",  level: 3, parentCode: "1200", systemKey: null },
      { code: "1211", name: "الأثاث والمعدات",           nameEn: "Furniture & Equipment", type: "asset",     normalBalance: "debit",  level: 4, parentCode: "1210", systemKey: null },
      { code: "1212", name: "مجمع إهلاك الأصول الثابتة", nameEn: "Accumulated Depreciation", type: "asset", normalBalance: "credit", level: 4, parentCode: "1210", systemKey: "ACCUMULATED_DEPRECIATION" },
      // ─── الالتزامات (Liabilities) ─────────────────────────
      { code: "2000", name: "الالتزامات",                 nameEn: "Liabilities",          type: "liability", normalBalance: "credit", level: 1, parentCode: null,   systemKey: null },
      { code: "2100", name: "الالتزامات المتداولة",       nameEn: "Current Liabilities",  type: "liability", normalBalance: "credit", level: 2, parentCode: "2000", systemKey: null },
      { code: "2110", name: "حسابات الدفع",              nameEn: "Accounts Payable",     type: "liability", normalBalance: "credit", level: 3, parentCode: "2100", systemKey: "AP" },
      { code: "2120", name: "ضريبة القيمة المضافة",      nameEn: "VAT Payable",           type: "liability", normalBalance: "credit", level: 3, parentCode: "2100", systemKey: "VAT_PAYABLE" },
      { code: "2130", name: "إيرادات مؤجلة",            nameEn: "Deferred Revenue",      type: "liability", normalBalance: "credit", level: 3, parentCode: "2100", systemKey: "DEFERRED_REVENUE" },
      { code: "2140", name: "رواتب مستحقة",              nameEn: "Accrued Salaries",     type: "liability", normalBalance: "credit", level: 3, parentCode: "2100", systemKey: "ACCRUED_EXPENSES" },
      // ─── حقوق الملكية (Equity) ────────────────────────────
      { code: "3000", name: "حقوق الملكية",               nameEn: "Equity",               type: "equity",    normalBalance: "credit", level: 1, parentCode: null,   systemKey: null },
      { code: "3100", name: "رأس المال",                  nameEn: "Capital",              type: "equity",    normalBalance: "credit", level: 2, parentCode: "3000", systemKey: "CAPITAL" },
      { code: "3200", name: "الأرباح المحتجزة",          nameEn: "Retained Earnings",    type: "equity",    normalBalance: "credit", level: 2, parentCode: "3000", systemKey: "RETAINED_EARNINGS" },
      { code: "3300", name: "ملخص الدخل",                nameEn: "Income Summary",       type: "equity",    normalBalance: "credit", level: 2, parentCode: "3000", systemKey: "INCOME_SUMMARY" },
      // ─── الإيرادات (Revenue) ──────────────────────────────
      { code: "4000", name: "الإيرادات",                  nameEn: "Revenue",              type: "revenue",   normalBalance: "credit", level: 1, parentCode: null,   systemKey: null },
      { code: "4100", name: "إيرادات الخدمات",           nameEn: "Service Revenue",      type: "revenue",   normalBalance: "credit", level: 2, parentCode: "4000", systemKey: "SERVICE_REVENUE" },
      { code: "4110", name: "إيرادات الحجوزات",          nameEn: "Booking Revenue",      type: "revenue",   normalBalance: "credit", level: 3, parentCode: "4100", systemKey: null },
      { code: "4120", name: "إيرادات المبيعات",          nameEn: "Sales Revenue",        type: "revenue",   normalBalance: "credit", level: 3, parentCode: "4100", systemKey: "SALES_REVENUE" },
      { code: "4130", name: "إيرادات الاشتراكات",        nameEn: "Subscription Revenue", type: "revenue",   normalBalance: "credit", level: 3, parentCode: "4100", systemKey: null },
      { code: "4200", name: "إيرادات أخرى",              nameEn: "Other Revenue",        type: "revenue",   normalBalance: "credit", level: 2, parentCode: "4000", systemKey: null },
      // ─── المصاريف (Expenses) ──────────────────────────────
      { code: "5000", name: "المصاريف",                   nameEn: "Expenses",             type: "expense",   normalBalance: "debit",  level: 1, parentCode: null,   systemKey: null },
      { code: "5100", name: "تكلفة المبيعات",            nameEn: "Cost of Sales",        type: "expense",   normalBalance: "debit",  level: 2, parentCode: "5000", systemKey: null },
      { code: "5200", name: "مصاريف التشغيل",            nameEn: "Operating Expenses",   type: "expense",   normalBalance: "debit",  level: 2, parentCode: "5000", systemKey: null },
      { code: "5210", name: "الرواتب والأجور",           nameEn: "Salaries & Wages",     type: "expense",   normalBalance: "debit",  level: 3, parentCode: "5200", systemKey: "SALARIES_EXPENSE" },
      { code: "5220", name: "الإيجار",                   nameEn: "Rent Expense",         type: "expense",   normalBalance: "debit",  level: 3, parentCode: "5200", systemKey: "RENT_EXPENSE" },
      { code: "5230", name: "المرافق والخدمات",          nameEn: "Utilities",            type: "expense",   normalBalance: "debit",  level: 3, parentCode: "5200", systemKey: null },
      { code: "5240", name: "التسويق والإعلان",          nameEn: "Marketing",            type: "expense",   normalBalance: "debit",  level: 3, parentCode: "5200", systemKey: null },
      { code: "5250", name: "العمولات",                  nameEn: "Commissions Expense",  type: "expense",   normalBalance: "debit",  level: 3, parentCode: "5200", systemKey: null },
      { code: "5260", name: "رسوم المعاملات",            nameEn: "Transaction Fees",     type: "expense",   normalBalance: "debit",  level: 3, parentCode: "5200", systemKey: null },
      { code: "5270", name: "مصروف الإهلاك",            nameEn: "Depreciation Expense", type: "expense",   normalBalance: "debit",  level: 3, parentCode: "5200", systemKey: "DEPRECIATION_EXPENSE" },
      { code: "5280", name: "مصاريف إدارية أخرى",       nameEn: "Other Admin",          type: "expense",   normalBalance: "debit",  level: 3, parentCode: "5200", systemKey: null },
    ];

    // Build parent code → UUID map as we insert
    const codeToId: Record<string, string> = {};

    for (const acc of accounts) {
      const parentId = acc.parentCode ? (codeToId[acc.parentCode] ?? null) : null;
      const result = await pool.query<{ id: string }>(
        `INSERT INTO chart_of_accounts (org_id, code, name, name_en, type, normal_balance, level, parent_id, system_key, is_active, is_system_account, is_posting_allowed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11)
         ON CONFLICT (org_id, code) DO NOTHING
         RETURNING id`,
        [
          orgId,
          acc.code,
          acc.name,
          acc.nameEn,
          acc.type,
          acc.normalBalance,
          acc.level,
          parentId,
          acc.systemKey,
          acc.systemKey !== null, // is_system_account = true if it has a system key
          acc.level >= 3,         // is_posting_allowed = true for level 3+ (leaf/detail accounts)
        ]
      );
      if (result.rows[0]) {
        codeToId[acc.code] = result.rows[0].id;
      }
    }
  } catch (err) {
    console.error("[seedChartOfAccounts] failed for org", orgId, err);
  }
}
