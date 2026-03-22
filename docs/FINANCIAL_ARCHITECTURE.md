# FINANCIAL_ARCHITECTURE.md
## Nasaq — Financial System Architecture
_Version: 1.0 — 2026-03-22_

---

## نظرة عامة

يُقسَّم النظام المالي في نسق إلى **5 طبقات** مستقلة ومترابطة:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: Reporting (تقارير)                                │
│  Treasury Reports | Accounting Reports | AR/AP Reports       │
├─────────────────────────────────────────────────────────────┤
│  LAYER 4: Billing & Vouchers (فواتير وسندات)               │
│  invoices | payments (enhanced) | receipt_vouchers           │
│  payment_vouchers | credit_notes                             │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: AR/AP (الذمم)                                     │
│  customer_balances | supplier_balances | aging              │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: Treasury (الصندوق والخزن)                        │
│  treasury_accounts | treasury_transactions                   │
│  treasury_transfers | cashier_shifts                         │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: Accounting Core (المحاسبة الأساسية)              │
│  chart_of_accounts | journal_entries | journal_entry_lines  │
│  accounting_periods | posting_rules                          │
└─────────────────────────────────────────────────────────────┘
```

---

## مستويا التشغيل

### الوضع المبسط (Simple Mode)
المستخدم يتعامل مع:
- صناديق وخزائن
- سندات قبض وصرف
- تقارير يومية وملخصات
- كشف عميل/مورد
- ربح وخسارة تقريبي

المستخدم **لا يرى**: قيود يدوية، دليل حسابات، أستاذ عام

### الوضع المتقدم (Advanced Mode)
يُفعَّل بـ `org.settings.enable_full_accounting = true`:
- دليل حسابات قابل للتخصيص
- قيود يدوية ومراجعة
- أستاذ عام وميزان مراجعة
- فترات مالية وإقفالات
- تسويات بنكية
- مراكز تكلفة (مستقبلاً)

---

## Ownership Map

| المكوّن | الـ Package | الملف |
|---|---|---|
| Chart of Accounts | `@nasaq/db` | `schema/accounting.ts` (جديد) |
| Journal Entries | `@nasaq/db` | `schema/accounting.ts` (جديد) |
| Accounting Periods | `@nasaq/db` | `schema/accounting.ts` (جديد) |
| Treasury Accounts | `@nasaq/db` | `schema/treasury.ts` (جديد) |
| Treasury Transactions | `@nasaq/db` | `schema/treasury.ts` (جديد) |
| Cashier Shifts | `@nasaq/db` | `schema/treasury.ts` (جديد) |
| Invoices (existing) | `@nasaq/db` | `schema/finance.ts` |
| Payments (enhanced) | `@nasaq/db` | `schema/bookings.ts` |
| Posting Engine | `@nasaq/api` | `lib/posting-engine.ts` (جديد) |
| Treasury API | `@nasaq/api` | `routes/treasury.ts` (جديد) |
| Accounting API | `@nasaq/api` | `routes/accounting.ts` (جديد) |
| Treasury UI | `dashboard` | `pages/TreasuryPage.tsx` (جديد) |
| COA UI | `dashboard` | `pages/AccountingPage.tsx` (جديد) |

---

## Schema المستهدف

### Layer 1: Accounting Core

```sql
-- دليل الحسابات
chart_of_accounts (
  id, org_id, code, name, name_en, type,
  parent_id, level, is_posting_allowed, is_system_account,
  system_key, normal_balance, is_active
)

-- القيود
journal_entries (
  id, org_id, entry_number, date, description, reference,
  source_type, source_id, status, period_id,
  posted_by, posted_at, reversed_by, reversed_at,
  created_by, created_at
)

journal_entry_lines (
  id, entry_id, account_id, debit, credit,
  description, cost_center, branch_id, line_order
)

-- الفترات المالية
accounting_periods (
  id, org_id, name, start_date, end_date,
  status, closed_by, closed_at
)
```

### Layer 2: Treasury

```sql
-- أنواع الخزائن
treasury_accounts (
  id, org_id, name, type, -- main_cash|branch_cash|cashier|petty_cash|bank|custody
  branch_id, responsible_user_id, opening_balance,
  current_balance, currency, account_number,
  bank_name, is_active, gl_account_id -- ربط بدليل الحسابات
)

-- حركات الصندوق
treasury_transactions (
  id, org_id, treasury_account_id, transaction_type,
  -- receipt|payment|transfer_in|transfer_out|opening|closing|adjustment
  amount, balance_after, description, reference,
  source_type, source_id, -- booking|invoice|expense|manual
  payment_method, counterparty_type, counterparty_id,
  voucher_number, shift_id, period_id,
  created_by, created_at
)

-- تحويلات الخزينة
treasury_transfers (
  id, org_id, from_account_id, to_account_id,
  amount, description, transfer_date,
  status, approved_by, journal_entry_id,
  created_by, created_at
)

-- وردية الكاشير
cashier_shifts (
  id, org_id, treasury_account_id, cashier_id,
  opening_balance, closing_balance, actual_cash,
  variance, status, -- open|closed|reconciled
  opened_at, closed_at, notes
)
```

---

## Posting Rules (قواعد القيود)

| العملية | مدين | دائن |
|---|---|---|
| بيع نقدي | الصندوق | إيراد المبيعات |
| بيع آجل | ذمم العميل | إيراد المبيعات |
| تحصيل من عميل | الصندوق/البنك | ذمم العملاء |
| صرف مصروف | المصروف | الصندوق |
| عربون مستلم | الصندوق | التزامات العربون |
| استرداد | إيراد المبيعات | الصندوق |
| تحويل بين الصناديق | الصندوق المستقبِل | الصندوق المحوِّل |
| شراء مخزون | المخزون | مورد/صندوق |

---

## Financial Settings Flags

يُضاف إلى `organizations.settings`:

```json
{
  "financial": {
    "enable_full_accounting": false,
    "enable_manual_journal_entries": false,
    "enable_bank_reconciliation": false,
    "enable_cashier_shift_closing": true,
    "enable_tax_management": true,
    "enable_advanced_ar_ap": false,
    "enable_branch_level_treasury": false,
    "auto_post_bookings": false,
    "auto_post_expenses": false
  }
}
```

---

## مسار البيانات

```
عملية تشغيلية (بيع/حجز/مصروف)
       ↓
Posting Engine
       ↓
    [إذا enable_full_accounting]
       ↓
Journal Entry (draft → posted)
       ↓
Ledger Balance Update

في جميع الحالات:
       ↓
Treasury Transaction
       ↓
Treasury Account Balance Update
```
