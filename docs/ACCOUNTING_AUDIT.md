# ACCOUNTING_AUDIT.md
## Nasaq — Accounting Core System Audit
_Audit Date: 2026-03-22_

---

## 1. ما الموجود فعلياً

### 1.1 جداول Drizzle ORM ذات الصلة بالمحاسبة

| الجدول | الملف | الدور المحاسبي المفترض | الحالة الفعلية |
|---|---|---|---|
| `invoices` | `schema/finance.ts` | وثيقة الإيراد | ✅ متكامل — ZATCA Phase 2 (QR TLV, XML) |
| `invoiceItems` | `schema/finance.ts` | بنود الفاتورة مع VAT | ✅ متكامل |
| `expenses` | `schema/finance.ts` | تسجيل المصروفات | ⚠️ موجود لكن لا يولّد أي قيد محاسبي |
| `payments` | `schema/bookings.ts` | تسجيل الدفعات | ⚠️ مرتبط بـ `bookingId NOT NULL` — لا يمثّل حركة محاسبية |
| `vendorPayouts` | `schema/finance.ts` | صرف مستحقات مقدمي الخدمة | ⚠️ بدون قيد — لا يُولِّد journal entry |
| `bookings` | `schema/bookings.ts` | مصدر الإيراد التشغيلي | ⚠️ `vatAmount`, `paidAmount`, `balanceDue` تجميعية فقط |

### 1.2 API Routes المالية الموجودة

| المسار | الوظيفة | الجودة المحاسبية |
|---|---|---|
| `GET /finance/reports/pnl` | الربح والخسارة | ❌ يقرأ من `payments.amount` (المقبوض فعلاً) — ليس إيرادًا معترفًا به محاسبياً |
| `GET /finance/reports/cashflow` | التدفقات النقدية | ❌ يقرأ من `payments` فقط — ليس تدفقاً نقدياً حقيقياً |
| `GET/POST /finance/invoices` | فواتير ZATCA | ✅ جيد كوثيقة — لكن الفاتورة لا ترتبط بأي قيد |
| `GET/POST /finance/expenses` | المصروفات | ⚠️ يُسجِّل فقط — لا يُؤثِّر على أي حساب |

### 1.3 إعدادات المنظمة الحالية (`organizations.settings`)

```json
{
  "timezone": "Asia/Riyadh",
  "currency": "SAR",
  "language": "ar",
  "dateFormat": "YYYY-MM-DD",
  "weekStartsOn": "sunday",
  "vatRate": 15,
  "vatInclusive": true
}
```

لا يوجد أي `financial.*` settings — لا `enable_full_accounting`، لا capability flags.

---

## 2. ما يمكن إعادة استخدامه

| المكوّن | كيفية الاستخدام |
|---|---|
| `invoices` + `invoiceItems` | يبقى كما هو — الفاتورة هي المستند الرسمي؛ يُضاف إليها `journalEntryId` للربط |
| `invoiceTypeEnum` | يبقى — يُضاف إليه حاجة مستقبلاً |
| ZATCA QR generator (`generateZATCAQR`) | يبقى كما هو تماماً |
| `expenses` | يبقى — يُضاف إليه `chartOfAccountId` و`journalEntryId` |
| `vendorPayouts` | يبقى — يُضاف إليه `journalEntryId` |
| `vatRate` في `organizations.settings` | يُبقى وينتقل إلى `financial.tax.vatRate` |
| `payments.method` (paymentMethodEnum) | يبقى — يُستخدم في posting rules لتحديد الحساب المدين |

---

## 3. ما هو ناقص أو مبعثر

### 3.1 ناقص كلياً — لا أثر في الكود

| المكوّن | الأثر الحالي |
|---|---|
| **Chart of Accounts** | لا يوجد دليل حسابات — كل الأرقام بدون backbone محاسبي |
| **Journal Entries** | لا يوجد أي double-entry accounting في النظام |
| **Journal Entry Lines** | لا يوجد مدين/دائن على الإطلاق |
| **General Ledger** | لا أستاذ عام — لا يمكن إنتاج ميزان مراجعة |
| **Accounting Periods** | لا فترات مالية — لا يمكن إقفال شهر أو سنة |
| **Balance Sheet** | لا ميزانية عمومية ممكنة |
| **Trial Balance** | لا ميزان مراجعة ممكن |
| **Posting Engine** | لا يوجد أي ربط بين العمليات التشغيلية والقيود المحاسبية |
| **Financial Settings Flags** | لا `enable_full_accounting`، لا `enable_manual_journal_entries` |
| **Fiscal Year** | لا سنة مالية معرّفة |

### 3.2 موجود لكن مبعثر أو ناقص

| المشكلة | التفاصيل |
|---|---|
| تقرير P&L يقرأ من `payments` | `routes/finance.ts:283` — `SUM(payments.amount)` ≠ الإيراد المعترف به؛ يشمل عرابين غير مكتملة ودفعات مستردة |
| تقرير cashflow يقرأ من `payments` | `routes/finance.ts:322` — يعطي صورة ناقصة لأن POS و expenses غير مدرجة |
| `expenses` بدون chart_of_account_id | المصروف يُصنَّف بـ enum (rent/salaries/etc) لكن لا يُربط بحساب في الدليل |
| `invoices` منفصلة عن القيود | الفاتورة تُولَّد وتُوقَّع ZATCA لكن لا تُولِّد `journal_entry` في الخلفية |
| `vendorPayouts` بدون قيد | صرف مستحقات مقدم الخدمة لا يُولِّد قيد مدين على الذمم ودائن على الصندوق |

---

## 4. ما يجب Refactor له

| الملف | التعديل المطلوب |
|---|---|
| `schema/finance.ts` → `expenses` | إضافة `chartOfAccountId uuid references chart_of_accounts(id)` |
| `schema/finance.ts` → `expenses` | إضافة `journalEntryId uuid references journal_entries(id)` |
| `schema/finance.ts` → `invoices` | إضافة `journalEntryId uuid` للربط بالقيد المحاسبي |
| `schema/finance.ts` → `vendorPayouts` | إضافة `journalEntryId uuid` |
| `schema/bookings.ts` → `payments` | إضافة `journalEntryId uuid` |
| `schema/organizations.ts` | إضافة `financial` block إلى `settings.jsonb` |
| `routes/finance.ts` → `/reports/pnl` | قراءة من `journal_entry_lines` بدل `payments` عند تفعيل full_accounting |
| `routes/finance.ts` → `/reports/cashflow` | قراءة من `treasury_transactions` بدل `payments` |

---

## 5. ما يجب بناؤه من الصفر

### 5.1 قاعدة البيانات — `packages/db/schema/accounting.ts` (جديد)

```sql
-- 1. دليل الحسابات
chart_of_accounts (
  id, org_id, code, name, name_en,
  type, -- asset | liability | equity | revenue | expense
  parent_id, level, normal_balance, -- debit | credit
  is_posting_allowed, is_system_account, is_active,
  system_key, -- للحسابات التلقائية: AR, AP, CASH, REVENUE, etc.
  created_at
)

-- 2. القيود المحاسبية
journal_entries (
  id, org_id, entry_number, date, description, reference,
  source_type, source_id, -- booking | invoice | expense | payment | pos | manual
  status, -- draft | posted | reversed
  period_id,
  posted_by, posted_at,
  reversed_by, reversed_at, reversal_entry_id,
  created_by, created_at
)

-- 3. سطور القيد
journal_entry_lines (
  id, entry_id, account_id,
  debit, credit, -- واحد منهما فقط له قيمة
  description, cost_center, branch_id, line_order
)

-- 4. الفترات المالية
accounting_periods (
  id, org_id, name,
  start_date, end_date,
  status, -- open | closed | locked
  closed_by, closed_at
)
```

### 5.2 قواعد القيود المستهدفة (Posting Rules)

| العملية | مدين | دائن |
|---|---|---|
| بيع نقدي | الصندوق / البنك | إيراد المبيعات |
| بيع آجل (فاتورة) | ذمم العملاء | إيراد المبيعات |
| تحصيل من عميل | الصندوق / البنك | ذمم العملاء |
| صرف مصروف نقدي | حساب المصروف | الصندوق |
| عربون مستلم | الصندوق | التزامات العربون |
| اعتراف إيراد عند اكتمال الخدمة | التزامات العربون | إيراد المبيعات |
| استرداد | إيراد المبيعات / ذمم عميل | الصندوق / البنك |
| تحويل بين الصناديق | الصندوق المستقبِل | الصندوق المحوِّل |
| شراء مخزون نقداً | المخزون | الصندوق |
| شراء مخزون آجل | المخزون | ذمم الموردين |
| سداد مورد | ذمم الموردين | الصندوق / البنك |
| رواتب | مصروف الرواتب | الصندوق / البنك |
| ضريبة مخرجات | إيراد المبيعات | ذمم ZATCA |

### 5.3 Posting Engine — `packages/api/src/lib/posting-engine.ts` (جديد)

```ts
// Interface المطلوب
async function createJournalEntry(input: {
  orgId: string;
  sourceType: "booking" | "invoice" | "expense" | "payment" | "pos" | "manual";
  sourceId: string;
  date: Date;
  description: string;
  lines: Array<{
    accountId: string;  // من chart_of_accounts
    debit?: number;
    credit?: number;
    description?: string;
  }>;
}): Promise<JournalEntry>

// Helper: تحقق من توازن القيد (مجموع المدين = مجموع الدائن)
function validateEntryBalance(lines: JournalEntryLine[]): boolean
```

### 5.4 API Routes المطلوبة

```
GET    /accounting/chart-of-accounts         -- دليل الحسابات (شجرة)
POST   /accounting/chart-of-accounts         -- إضافة حساب
PATCH  /accounting/chart-of-accounts/:id     -- تعديل حساب
GET    /accounting/journal-entries           -- قائمة القيود
GET    /accounting/journal-entries/:id       -- تفاصيل قيد
POST   /accounting/journal-entries           -- قيد يدوي
POST   /accounting/journal-entries/:id/post  -- ترحيل قيد
POST   /accounting/journal-entries/:id/reverse -- عكس قيد
GET    /accounting/periods                   -- الفترات المالية
POST   /accounting/periods                   -- إنشاء فترة
POST   /accounting/periods/:id/close         -- إغلاق فترة
GET    /accounting/reports/trial-balance     -- ميزان المراجعة
GET    /accounting/reports/ledger/:accountId -- حركة حساب
GET    /accounting/reports/balance-sheet     -- الميزانية العمومية
GET    /accounting/reports/income-statement  -- قائمة الدخل
```

### 5.5 Capability Flags المطلوبة في `organizations.settings`

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
    "auto_post_expenses": false,
    "fiscal_year_start": "01-01",
    "tax": {
      "vatRate": 15,
      "vatInclusive": true,
      "vatRegistered": false,
      "vatNumber": null
    }
  }
}
```

### 5.6 Chart of Accounts الافتراضي (Seed)

```
1000 — الأصول
  1100 — الأصول المتداولة
    1110 — النقدية والصناديق
      1111 — الصندوق الرئيسي        [system_key: MAIN_CASH]
      1112 — الحساب البنكي الرئيسي  [system_key: MAIN_BANK]
    1120 — ذمم العملاء              [system_key: AR]
    1130 — المخزون                  [system_key: INVENTORY]
  1200 — الأصول الثابتة

2000 — الخصوم
  2100 — الخصوم المتداولة
    2110 — ذمم الموردين             [system_key: AP]
    2120 — التزامات العربون         [system_key: DEFERRED_REVENUE]
    2130 — ضريبة القيمة المضافة     [system_key: VAT_PAYABLE]
  2200 — القروض طويلة الأجل

3000 — حقوق الملكية
  3100 — رأس المال                  [system_key: CAPITAL]
  3200 — الأرباح المبقاة

4000 — الإيرادات
  4100 — إيراد الخدمات              [system_key: SERVICE_REVENUE]
  4200 — إيراد المبيعات             [system_key: SALES_REVENUE]
  4300 — إيرادات أخرى

5000 — المصروفات
  5100 — رواتب وأجور               [system_key: SALARIES_EXPENSE]
  5200 — إيجار                     [system_key: RENT_EXPENSE]
  5300 — تسويق ودعاية
  5400 — مصروفات تشغيل
  5500 — مصروفات متنوعة
```

---

## 6. خلاصة الحالة المحاسبية

```
دليل الحسابات:    غير موجود
قيود محاسبية:    صفر قيد في النظام
أستاذ عام:       غير موجود
ميزان مراجعة:    مستحيل الآن
ميزانية عمومية:  مستحيلة الآن
قائمة الدخل:     تقريبية (من payments) — غير موثوقة
فترات مالية:     غير موجودة
محرك القيود:     غير موجود
```

النظام حالياً يعمل كـ **نظام تشغيلي** يتتبع الحجوزات والمدفوعات، لكنه **لا يمتلك أي backbone محاسبي**. كل الأرقام المالية الحالية هي مجاميع تشغيلية وليست قيودًا معتمدة.
