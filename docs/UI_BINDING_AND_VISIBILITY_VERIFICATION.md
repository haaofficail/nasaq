# UI BINDING AND VISIBILITY VERIFICATION — نسق
**تاريخ المراجعة:** 2026-03-22

---

## 1. ربط الصفحات الجديدة بالواجهة

### TreasuryPage `/dashboard/treasury`

| المعيار | الحالة | التفصيل |
|---|---|---|
| Route في App.tsx | ✅ | `<Route path="treasury" element={<TreasuryPage />} />` |
| Import في App.tsx | ✅ | `import { TreasuryPage } from "./pages/TreasuryPage"` |
| Sidebar link في Layout.tsx | ✅ | `{ name: "الخزينة", href: "/dashboard/treasury", icon: Landmark }` |
| Link في FinancePage | ✅ | Quick-link card |
| API connection | ✅ | `treasuryApi.accounts()`, `treasuryApi.summary()` |
| RequireAuth | ✅ | داخل `/dashboard` nested route |
| Business type restriction | ❌ لا يوجد | مرئي لكل أنواع الأعمال |

### AccountingPage `/dashboard/accounting`

| المعيار | الحالة | التفصيل |
|---|---|---|
| Route في App.tsx | ✅ | موجود |
| Import في App.tsx | ✅ | موجود |
| Sidebar link | ✅ | `{ name: "المحاسبة", href: "/dashboard/accounting", icon: BookOpen }` |
| Link في FinancePage | ✅ | Quick-link card |
| API connection | ✅ | `accountingApi.coa()` |

### JournalEntriesPage `/dashboard/accounting/journal-entries`

| المعيار | الحالة | التفصيل |
|---|---|---|
| Route في App.tsx | ✅ | `<Route path="accounting/journal-entries" element={<JournalEntriesPage />} />` |
| Sidebar link | ❌ لا يوجد مباشر | يُصل إليه من AccountingPage أو FinancePage |
| API connection | ✅ | `accountingApi.entries()`, `accountingApi.postEntry()` |

### FinancialStatementsPage `/dashboard/financial-statements`

| المعيار | الحالة | التفصيل |
|---|---|---|
| Route في App.tsx | ✅ | موجود |
| Sidebar link | ✅ | `{ name: "القوائم المالية", href: "/dashboard/financial-statements", icon: BarChart2 }` |
| Link في FinancePage | ✅ | Quick-link card |
| API methods | ✅ | `accountingApi.incomeStatement()`, `.balanceSheet()`, `.trialBalance()`, `.arAging()`, `.apAging()`, `.cashFlow()` |

### ReconciliationPage `/dashboard/reconciliation`

| المعيار | الحالة | التفصيل |
|---|---|---|
| Route في App.tsx | ✅ | موجود |
| Sidebar link | ✅ | `{ name: "التسويات", href: "/dashboard/reconciliation", icon: GitMerge }` |
| Link في FinancePage | ✅ | Quick-link card |
| API methods | ✅ | `reconciliationApi.list()`, `.create()`, `.complete()` |

---

## 2. حالة الـ Sidebar في الـ Live Bundle

```
Live bundle routes found:
✅ /dashboard/bookings
✅ /dashboard/calendar
✅ /dashboard/customers
✅ /dashboard/finance
✅ /dashboard/invoices
✅ /dashboard/expenses
✅ /dashboard/reports
✅ /dashboard/hotel
✅ /dashboard/car-rental
✅ /dashboard/flower-inventory
✅ /dashboard/flower-master
✅ /dashboard/integrations
❌ /dashboard/treasury          → مفقود من الـ bundle
❌ /dashboard/accounting        → مفقود من الـ bundle
❌ /dashboard/financial-statements → مفقود من الـ bundle
❌ /dashboard/reconciliation    → مفقود من الـ bundle
❌ /dashboard/accounting/journal-entries → مفقود من الـ bundle
```

**السبب:** كل هذه الصفحات غير موجودة في الـ bundle لأن الكود لم يُبنَ بعد التعديلات.

---

## 3. Posting Engine Wiring

| العملية | الربط | الشرط |
|---|---|---|
| إنشاء حجز + دفعة نقدية | ✅ `postCashSale` | `enable_full_accounting = true` |
| إنشاء حجز + عربون | ✅ `postDepositReceived` | `enable_full_accounting = true` |
| إنشاء حجز + استرداد | ✅ `postRefund` | `enable_full_accounting = true` |
| إنشاء فاتورة | ✅ `postCreditSale` | `enable_full_accounting = true` |
| إنشاء مصروف | ✅ `postExpense` | `enable_full_accounting = true` |
| تحويل خزينة | ✅ `postTreasuryTransfer` | `enable_full_accounting = true` |
| مبيعات POS | ✅ `postPOSSale` | `enable_full_accounting = true` |
| مصروف مستحق | ✅ `postAccrual` | يدوي |
| إهلاك | ✅ `postDepreciation` | يدوي |
| إقفال فترة | ✅ `postPeriodClosingEntries` | يدوي |

---

## 4. Business Type Visibility Rules

الصفحات المالية (Treasury, Accounting, Financial Statements, Reconciliation) **مرئية لكل business types** حالياً — لا يوجد `allowedBusinessTypes` check في هذه الصفحات. هذا مقصود (كل أنواع الأعمال تحتاج محاسبة).

الصفحات الخاصة بأنواع أعمال محددة:

| الصفحة | Business Types | مرئي في Sidebar؟ |
|---|---|---|
| HotelPage | `hotel` | ✅ — BUSINESS_GROUPS['hotel'] |
| CarRentalPage | `car_rental` | ✅ — BUSINESS_GROUPS['car_rental'] |
| FlowerInventoryPage | `flower_shop` | ✅ — BUSINESS_GROUPS['flower_shop'] |
| FlowerMasterPage | `flower_shop` | ✅ — BUSINESS_GROUPS['flower_shop'] |
| MenuPage | restaurant/cafe/catering/bakery | ✅ — FOOD_GROUP |
| SchedulePage | salon/barber/spa/fitness | ✅ — BEAUTY_GROUP |

---

## 5. الخلاصة

- كل الصفحات الجديدة **مربوطة صح** في الكود (routes, imports, sidebar, API calls)
- **المشكلة الوحيدة هي النشر** — الكود لم يُبنَ ولم يُرفع
- بمجرد push + build + migrate ستظهر كل الصفحات فوراً
