# SYSTEM CORRECTNESS REVIEW — نسق
**تاريخ المراجعة:** 2026-03-22
**المراجع:** Production Verification Lead

---

## 1. مراجعة القيد المزدوج (Double-Entry Correctness)

### 1.1 آلية التحقق من التوازن

```typescript
// posting-engine.ts: validateBalance()
function validateBalance(lines) {
  const totalDebit  = lines.reduce((s, l) => s + (l.debit  ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  const valid = Math.abs(totalDebit - totalCredit) < 0.01;
  return { valid, totalDebit, totalCredit };
}
```

**الحكم:** ✅ صحيح — التحقق يحدث قبل أي INSERT. القيد المختل يُرفع كـ Error ولا يصل إلى DB.
**ملاحظة:** الحد المسموح به 0.01 مناسب لتجنب floating-point drift. مقبول لعملة الريال السعودي (هللتان).

---

### 1.2 جدول التحقق من كل دالة ترحيل

| الدالة | مدين | دائن | متوازن؟ |
|---|---|---|---|
| `postCashSale` | MAIN_CASH (amount+vat) | SERVICE_REVENUE + VAT_PAYABLE | ✅ |
| `postCreditSale` | AR (amount+vat) | SERVICE_REVENUE + VAT_PAYABLE | ✅ |
| `postDepositReceived` | MAIN_CASH | DEFERRED_REVENUE | ✅ |
| `postDepositRecognition` | DEFERRED_REVENUE (amount+vat) | SERVICE_REVENUE + VAT_PAYABLE | ✅ |
| `postCustomerCollection` | MAIN_CASH/BANK | AR | ✅ |
| `postExpense` | expenseAccountId | MAIN_CASH/BANK | ✅ |
| `postRefund` | SERVICE_REVENUE + VAT_PAYABLE | MAIN_CASH (amount+vat) | ✅ |
| `postTreasuryTransfer` | toAccountId | fromAccountId | ✅ |
| `postPOSSale` | MAIN_CASH (amount+vat) | SALES_REVENUE + VAT_PAYABLE | ✅ |
| `postAccrual` | expenseAccountId | ACCRUED_EXPENSES | ✅ |
| `postAccrualSettlement` | ACCRUED_EXPENSES | MAIN_CASH/BANK | ✅ |
| `postDepreciation` | DEPRECIATION_EXPENSE | ACCUMULATED_DEPRECIATION | ✅ |
| `postDeferralRecognition` | DEFERRED_REVENUE | revenueAccountId | ✅ |
| `postPurchase` | assetAccountId | AP / MAIN_CASH | ✅ |
| `postSupplierPayment` | AP | MAIN_CASH/BANK | ✅ |

**الاكتمال:** 15/15 دالة ترحيل متوازنة — كل عملية في النظام مغطاة بقيد صحيح.

---

### 1.3 دورة الإيراد المؤجل (Deferred Revenue Cycle)

```
عند استلام العربون:
  postDepositReceived: MAIN_CASH ↑ / DEFERRED_REVENUE ↑

عند أداء الخدمة:
  postDepositRecognition: DEFERRED_REVENUE ↓ / SERVICE_REVENUE ↑ + VAT_PAYABLE ↑

الصافي: MAIN_CASH ↑ / SERVICE_REVENUE ↑ + VAT_PAYABLE ↑ (صحيح)
```

**الحكم:** ✅ الدورة مكتملة — لا إيراد يُعترف به قبل أداء الخدمة.

---

### 1.4 دورة المصروف المستحق (Accrual Cycle)

```
عند إثبات المصروف:
  postAccrual: EXPENSE ↑ / ACCRUED_EXPENSES ↑

عند الدفع:
  postAccrualSettlement: ACCRUED_EXPENSES ↓ / MAIN_CASH ↓

الصافي: EXPENSE ↑ / MAIN_CASH ↓ (صحيح)
```

**الحكم:** ✅ يطبق مبدأ الاستحقاق (Accrual Basis) بشكل صحيح.

---

### 1.5 إقفال الفترة (Period Closing Correctness)

```
الخطوة 1: إقفال الإيرادات
  مدين: كل حسابات الإيرادات (بأرصدتها)
  دائن: INCOME_SUMMARY (الإجمالي)
  → يُصفِّر حسابات الإيرادات ✅

الخطوة 2: إقفال المصروفات
  مدين: INCOME_SUMMARY (الإجمالي)
  دائن: كل حسابات المصروفات (بأرصدتها)
  → يُصفِّر حسابات المصروفات ✅

الخطوة 3: إقفال INCOME_SUMMARY
  إذا ربح: مدين INCOME_SUMMARY / دائن RETAINED_EARNINGS ✅
  إذا خسارة: مدين RETAINED_EARNINGS / دائن INCOME_SUMMARY ✅
  → يُصفِّر ملخص الدخل ويحوّل الصافي للميزانية
```

**شرط الجودة:** الاستعلام يستثني قيود الإقفال (`source_type != 'closing'`) — يمنع التكرار عند إعادة الإقفال. ✅
**شرط الجودة:** `HAVING ABS(...) > 0.005` — يتجاهل الأرصدة الصفرية فعلاً. ✅

---

## 2. مراجعة Schema المحاسبي

### 2.1 chart_of_accounts

| الخاصية | الحكم | التفصيل |
|---|---|---|
| `uniqueIndex("coa_org_code_idx")` | ✅ | كود الحساب فريد per-org — يمنع التكرار |
| `systemKey` index مع orgId | ✅ | lookup سريع من posting engine |
| `isPostingAllowed` | ✅ | يمنع الترحيل على الحسابات الإجمالية |
| `parentId` self-reference | ✅ | يدعم شجرة الحسابات اللانهائية العمق |
| `normalBalance` enum | ✅ | ضروري لحساب الأرصدة الصحيحة في التقارير |
| FK إلى organizations | ✅ | عزل كامل بين المنشآت |

### 2.2 journal_entries

| الخاصية | الحكم | التفصيل |
|---|---|---|
| `uniqueIndex("je_org_number_idx")` | ✅ | رقم القيد فريد per-org |
| `reversalEntryId` self-reference | ✅ | يربط القيد بعكسه دون كسر المحفوظات |
| `status` enum (draft/posted/reversed) | ✅ | يمنع تعديل القيد المُرحَّل |
| `periodId` FK | ✅ | ربط القيد بالفترة لتقارير دقيقة |
| `sourceType + sourceId` | ✅ | traceability كاملة — من أي سجل جاء القيد |
| transaction في createJournalEntry | ✅ | header + lines في transaction واحدة — لا يمكن وجود قيد بدون سطور |

### 2.3 journal_entry_lines

| الخاصية | الحكم | التفصيل |
|---|---|---|
| `numeric(15,2)` لـ debit/credit | ✅ | دقة عشرية ثابتة — لا floating-point في DB |
| سطر واحد فيه debit والآخر credit | ✅ | لا يُمنع وجود قيمتين، لكن validateBalance يضمن التوازن |
| `lineOrder` | ✅ | يحفظ ترتيب العرض |

**ملاحظة تصميمية:** يسمح النظام بأن يحمل السطر الواحد debit وcredit معاً (القيمتان غير صفر). هذا غير خطير — الـ validateBalance يضمن أن مجموع الجانبين متساوٍ. لكن من أفضل الممارسات فرض: لكل سطر إما debit > 0 وcredit = 0 أو العكس. **درجة الخطورة: منخفضة** — لا يؤثر على صحة التقارير.

---

## 3. مراجعة API Routes

### 3.1 accounting.ts — التغطية الوظيفية

| الفئة | Endpoints | الحكم |
|---|---|---|
| Chart of Accounts | GET /coa, POST, PATCH, DELETE | ✅ CRUD كامل |
| Periods | GET, POST, PATCH /periods/:id/status | ✅ إدارة الفترات |
| Journal Entries | GET, POST /entries, GET /:id, POST /:id/reverse | ✅ |
| Closing | POST /periods/:id/closing-entries | ✅ |
| Reports | GET /reports/trial-balance, income-statement, balance-sheet | ✅ |
| Reports | GET /reports/ar-aging, ap-aging, cash-flow | ✅ |

**التغطية:** 14 endpoint — يغطي دورة المحاسبة كاملة من الإنشاء حتى الإقفال.

### 3.2 صحة حسابات AR/AP Aging

```
AR Aging:
  rصيد AR = debit - credit (طبيعة مدينة)
  التجميع بـ MIN(date) per sourceId → صحيح (أقدم تاريخ للمعاملة)

AP Aging:
  رصيد AP = credit - debit (طبيعة دائنة) ✅ الكود يعكس هذا صراحة

التجميع: 0-30, 31-60, 61-90, 91-120, 120+ يوم ✅ معيار صناعي
```

### 3.3 Cash Flow (Indirect Method)

```
صافي الدخل
+ إضافة الإهلاك (non-cash charge) ✅
+ التغيير في رأس المال العامل:
  - تغيير AR ✅
  - تغيير AP ✅
  - تغيير المخزون ✅
```

**الحكم:** ✅ الطريقة غير المباشرة مطبقة بشكل صحيح للعمليات التشغيلية.
**ملاحظة:** Investing/Financing activities غير مطبقة بعد — ستظهر الخانات كصفر. مقبول للمرحلة الحالية.

---

## 4. مراجعة Reconciliation System

### 4.1 منطق اكتمال التسوية

```typescript
// reconciliation.ts: POST /:id/complete
const adjustedBook     = bookBalance     + itemsOnBookSide.sum
const adjustedExternal = externalBalance + itemsOnExternalSide.sum
const finalDifference  = adjustedBook - adjustedExternal

// شرط الإكمال:
if (Math.abs(finalDifference) >= 0.01) → رفض
```

**الحكم:** ✅ صحيح — لا يمكن إغلاق تسوية بفارق أكبر من هللة.
**الحكم:** ✅ `adjustsSide` ("book"/"external") يحدد بدقة أي الجانبين يُعدَّل — تصميم صحيح.

### 4.2 أنواع بنود التسوية مقارنة بالمعيار المحاسبي

| النوع | الجانب | المعيار | التطبيق |
|---|---|---|---|
| outstanding_check | external | يُخصم من رصيد البنك | ✅ adjustsSide="external" |
| deposit_in_transit | external | يُضاف لرصيد البنك | ✅ adjustsSide="external" |
| bank_charge | book | يُخصم من دفاتر المنشأة | ✅ adjustsSide="book" |
| interest_earned | book | يُضاف لدفاتر المنشأة | ✅ adjustsSide="book" |
| error | book/external | يُعدَّل الجانب المُخطئ | ✅ قابل للتحديد |

---

## 5. مراجعة Chart of Accounts الافتراضي

### 5.1 نتائج seed-chart-of-accounts.ts

| التصنيف | عدد الحسابات | system keys |
|---|---|---|
| الأصول (Assets) | 9 | MAIN_CASH, MAIN_BANK, AR, INVENTORY, ACCUMULATED_DEPRECIATION |
| الخصوم (Liabilities) | 5 | AP, DEFERRED_REVENUE, VAT_PAYABLE, ACCRUED_EXPENSES |
| حقوق الملكية (Equity) | 4 | CAPITAL, RETAINED_EARNINGS, INCOME_SUMMARY |
| الإيرادات (Revenue) | 4 | SERVICE_REVENUE, SALES_REVENUE |
| المصروفات (Expenses) | 14 | SALARIES_EXPENSE, RENT_EXPENSE, DEPRECIATION_EXPENSE |
| **الإجمالي** | **36** | **17 system key** |

### 5.2 تحقق التغطية — هل كل دالة ترحيل ستجد حساباتها؟

| دالة الترحيل | System Keys المطلوبة | موجودة في Seed؟ |
|---|---|---|
| postCashSale | MAIN_CASH, SERVICE_REVENUE, VAT_PAYABLE | ✅ |
| postCreditSale | AR, SERVICE_REVENUE, VAT_PAYABLE | ✅ |
| postDepositReceived | MAIN_CASH, DEFERRED_REVENUE | ✅ |
| postDepositRecognition | DEFERRED_REVENUE, SERVICE_REVENUE, VAT_PAYABLE | ✅ |
| postExpense | MAIN_CASH/MAIN_BANK | ✅ |
| postRefund | SERVICE_REVENUE, MAIN_CASH, VAT_PAYABLE | ✅ |
| postTreasuryTransfer | (يُمرَّر مباشرة) | ✅ |
| postPOSSale | MAIN_CASH, SALES_REVENUE, VAT_PAYABLE | ✅ |
| postAccrual | ACCRUED_EXPENSES | ✅ |
| postAccrualSettlement | ACCRUED_EXPENSES, MAIN_CASH/BANK | ✅ |
| postDepreciation | DEPRECIATION_EXPENSE, ACCUMULATED_DEPRECIATION | ✅ |
| postDeferralRecognition | DEFERRED_REVENUE | ✅ |
| postPurchase | AP/MAIN_CASH | ✅ |
| postSupplierPayment | AP, MAIN_CASH/BANK | ✅ |
| postPeriodClosingEntries | INCOME_SUMMARY, RETAINED_EARNINGS | ✅ |

**الحكم:** ✅ الـ seed يوفر كل الحسابات المطلوبة — لن تفشل أي دالة ترحيل بسبب حساب مفقود.

---

## 6. مراجعة Feature Flags

```typescript
// posting-engine.ts
export function isAccountingEnabled(orgSettings): boolean {
  return orgSettings?.financial?.enable_full_accounting === true;
}
```

**الحكم:** ✅ الفحص صارم — `=== true` لا `== true` أو truthy check.
**الحكم:** ✅ النظام يُعيد `null` بصمت عند إيقاف الفلاغ بدلاً من رمي Error — يمنع كسر العمليات التشغيلية.
**الحكم:** ✅ الواجهة ستظهر بصرف النظر عن قيمة الفلاغ — الفلاغ يتحكم فقط في الـ posting engine.

---

## 7. مراجعة Audit Log

### 7.1 حالات الـ logAuditEvent

| الحدث | مُسجَّل؟ | الملف |
|---|---|---|
| POST /accounting/entries | ✅ | accounting.ts |
| POST /accounting/entries/:id/reverse | ✅ | accounting.ts |
| POST /accounting/periods/:id/closing-entries | ✅ | accounting.ts |
| GET /audit-log | ✅ | audit-log.ts |
| Login/Logout | ❌ | لم يُضف بعد |
| إنشاء/تعديل حجز | ❌ | لم يُضف بعد |

**الحكم:** ⚠️ جزئي — المحاسبة مسجَّلة، العمليات التشغيلية لم تُسجَّل بعد.
**التأثير:** الـ audit trail صالح لأغراض المراجعة المالية — كافٍ للمرحلة الأولى.

### 7.2 fire-and-forget pattern

```typescript
export async function logAuditEvent(params): Promise<void> {
  await db.insert(auditLog).values({ ... }).catch(() => {});
}
```

**الحكم:** ✅ `.catch(() => {})` يمنع فشل الـ audit من كسر العملية الأصلية — صواب لأن المحاسبة أهم من السجل.

---

## 8. مراجعة التسلسل الهرمي للمنشآت (Multi-Tenant Isolation)

| النقطة | الحكم | التفصيل |
|---|---|---|
| كل جدول جديد فيه `orgId` | ✅ | chart_of_accounts, journal_entries, accounting_periods, reconciliation_statements, audit_log |
| كل استعلام يُقيَّد بـ `orgId` | ✅ | `where(eq(table.orgId, orgId))` في كل route |
| authMiddleware يُحدِّد orgId من JWT | ✅ | لا يمكن للمستخدم تمرير orgId مختلف |
| Cascade delete على organizations | ✅ | حذف المنشأة يحذف كل بياناتها المحاسبية |

**الحكم:** ✅ عزل البيانات بين المنشآت سليم بالكامل.

---

## 9. إجمالي نتائج المراجعة

| المحور | الحكم | ملاحظات |
|---|---|---|
| Double-entry correctness | ✅ سليم | 15/15 دالة متوازنة |
| Schema design | ✅ سليم | indexes مناسبة، FKs صحيحة، transactions مستخدمة |
| Deferred revenue cycle | ✅ سليم | دورة كاملة عربون → اعتراف بإيراد |
| Period closing | ✅ سليم | 3 خطوات بالترتيب الصحيح |
| Reconciliation logic | ✅ سليم | شرط التوازن 0.01 مناسب |
| Chart of accounts seed | ✅ سليم | 36 حساب + 17 system key تغطي كل الدوال |
| Multi-tenant isolation | ✅ سليم | orgId في كل جدول + كل استعلام |
| Audit logging | ⚠️ جزئي | المالية مسجَّلة، التشغيلية لاحقاً |
| Cash flow statement | ⚠️ جزئي | تشغيلي فقط — استثمار/تمويل لاحقاً |
| Posting on single line | ⚠️ ملاحظة | يمكن لسطر واحد أن يحمل debit وcredit — منخفض الخطورة |

**الخلاصة:** النظام المحاسبي صحيح معمارياً وتشغيلياً. النقاط الثلاث المُعلَّمة بـ ⚠️ لا تؤثر على صحة الأرقام — هي تحسينات مستقبلية.
