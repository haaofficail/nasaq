# FINANCIAL_SYSTEM_AUDIT.md
## Nasaq — Financial System Audit
_Audit Date: 2026-03-22_

---

## 1. ما الموجود فعلياً

### 1.1 طبقة قاعدة البيانات (Drizzle ORM)

| الجدول | الملف | الحالة | الملاحظات |
|---|---|---|---|
| `invoices` | `schema/finance.ts` | ✅ قوي | ZATCA-compliant، QR TLV، نوع مبسط/ضريبي |
| `invoice_items` | `schema/finance.ts` | ✅ قوي | بنود تفصيلية مع VAT لكل بند |
| `expenses` | `schema/finance.ts` | ✅ جيد | تصنيفات، ربط بحجز، موافقة، إيصال |
| `vendor_commissions` | `schema/finance.ts` | ✅ موجود | نسبة أو مبلغ ثابت |
| `vendor_payouts` | `schema/finance.ts` | ✅ موجود | فترة + مبالغ + حجوزات |
| `payment_gateway_configs` | `schema/finance.ts` | ✅ موجود | Moyasar، Tap، Tamara |
| `payments` | `schema/bookings.ts` | ⚠️ جزئي | مرتبط بـ bookingId NOT NULL — لا يمكن تسجيل قبض مستقل |
| `bookings` | `schema/bookings.ts` | ✅ موجود | paidAmount، balanceDue، vatAmount، depositAmount |

### 1.2 جداول Raw SQL (غير موجودة في Drizzle)

| الجدول | المسار | الحالة |
|---|---|---|
| `pos_transactions` | `routes/pos.ts` | ⚠️ Raw SQL فقط |
| `pos_settings` | `routes/pos.ts` | ⚠️ Raw SQL فقط |
| `pos_quick_items` | `routes/pos.ts` | ⚠️ Raw SQL فقط |
| `suppliers` | `routes/suppliers.ts` | ⚠️ Raw SQL فقط |
| `purchase_orders` | `routes/suppliers.ts` | ⚠️ Raw SQL فقط |

### 1.3 API Routes الموجودة

| المسار | الوظيفة | الجودة |
|---|---|---|
| `GET/POST /finance/invoices` | فواتير ZATCA | ✅ جيد |
| `GET /finance/invoices/:id` | تفاصيل فاتورة | ✅ جيد |
| `PATCH /finance/invoices/:id/status` | تغيير الحالة | ✅ موجود |
| `GET/POST /finance/expenses` | المصروفات | ✅ جيد |
| `GET /finance/reports/pnl` | الربح والخسارة | ⚠️ أرقام تقريبية فقط |
| `GET /finance/reports/cashflow` | التدفقات النقدية | ⚠️ بناءً على payments فقط |
| `GET/POST /finance/gateways` | بوابات الدفع | ✅ موجود |
| `GET/POST /finance/payouts` | مستحقات الموردين | ✅ موجود |
| `POST /pos/sale` | نقطة البيع | ⚠️ Raw SQL، غير مرتبط بالمحاسبة |
| `GET /pos/stats` | إحصائيات POS | ⚠️ يومي فقط |

### 1.4 واجهة المستخدم الموجودة

| الصفحة | الملف | الحالة |
|---|---|---|
| `FinancePage` | `pages/FinancePage.tsx` | ⚠️ بسيط جداً — 3 تاب فقط |
| `InvoicesPage` | `pages/InvoicesPage.tsx` | ⚠️ موجود |
| `ExpensesPage` | `pages/ExpensesPage.tsx` | ⚠️ موجود |
| `POSPage` | `pages/POSPage.tsx` | ⚠️ موجود لكن معزول |
| `ReportsPage` | `pages/ReportsPage.tsx` | ⚠️ تقارير عامة |

---

## 2. ما يمكن إعادة استخدامه

| المكوّن | كيفية الاستخدام |
|---|---|
| `invoices` + `invoiceItems` | يبقى كما هو — يصبح المصدر الأساسي للوثائق المالية |
| `expenses` | يبقى لكن يُربط بالقيود المحاسبية لاحقاً |
| `payments` | يُعاد هيكلته: `bookingId` يصبح nullable، ويُضاف `treasuryAccountId` |
| `vendor_commissions/payouts` | يبقى كما هو |
| `payment_gateway_configs` | يبقى كما هو |
| `financeApi.pnl` | يُحسَّن ليقرأ من الـ ledger مستقبلاً |
| ZATCA QR generator | يبقى كما هو |

---

## 3. ما هو ناقص أو مبعثر

### 3.1 ناقص كلياً — لا يوجد أثر في الكود

| المكوّن | الأثر |
|---|---|
| **Chart of Accounts** | لا يوجد دليل حسابات — كل التقارير تعمل بدون backbone محاسبي |
| **Journal Entries** | لا يوجد أي double-entry accounting |
| **Ledger** | لا يوجد أستاذ عام |
| **Treasury / Cashbox** | لا يوجد صندوق رئيسي، لا خزينة فرع، لا بنك، لا عهدة |
| **Treasury Transfers** | لا يوجد |
| **Accounting Periods** | لا يوجد فترات مالية أو إقفالات |
| **AR/AP Ledger** | الذمم غير موجودة كحسابات منفصلة — مرتبطة بالحجوزات فقط |
| **Customer Balance** | لا يوجد رصيد عميل مستقل |
| **Supplier Balance** | موجود في raw SQL لكن بدون posting |
| **Cashier Shift** | لا يوجد وردية كاشير أو إقفال يومي رسمي |
| **Reconciliation** | لا يوجد تسوية من أي نوع |
| **Financial Settings** | لا يوجد enable_full_accounting أو أي capability flags |
| **Posting Engine** | لا يوجد أي ربط بين العمليات التشغيلية والمحاسبة |

### 3.2 موجود لكن مبعثر أو ناقص

| المشكلة | التفاصيل |
|---|---|
| `payments.bookingId NOT NULL` | يمنع تسجيل قبض مستقل من عميل أو تحويل صندوق |
| POS بدون Drizzle schema | `pos_transactions` غير موجود في Drizzle — لا يمكن join أو relate |
| Suppliers بدون Drizzle schema | `suppliers`, `purchase_orders` في raw SQL — لا يمكن typing |
| FinancePage بسيط جداً | لا treasury، لا صناديق، لا ذمم، لا قيود |
| `expenses` غير مربوطة بمحاسبة | لا يوجد posting rule — المصروف يُسجَّل لكن لا يُولِّد قيد |
| تقارير P&L تعتمد على payments | وليس على إيرادات معترف بها محاسبياً |

---

## 4. ما يجب بناؤه من الصفر

1. `chart_of_accounts` — دليل الحسابات
2. `journal_entries` + `journal_entry_lines` — محرك القيود
3. `treasury_accounts` — صناديق وبنوك وعهد
4. `treasury_transactions` — حركات الصندوق
5. `treasury_transfers` — تحويلات بين الصناديق
6. `accounting_periods` — الفترات المالية
7. `cashier_shifts` — وردية الكاشير
8. `financial_settings` في organizations.settings — capability flags
9. Posting Engine (`lib/posting-engine.ts`)
10. Treasury API routes (`/treasury/*`)
11. Chart of Accounts API routes (`/accounting/chart-of-accounts`)
12. Journal Entries API routes (`/accounting/journal-entries`)
13. واجهة Treasury Dashboard
14. واجهة سندات القبض والصرف
15. واجهة دليل الحسابات
16. تقارير حركة الصندوق

---

## 5. ما يجب Refactor له

| الملف | التعديل المطلوب |
|---|---|
| `schema/bookings.ts` → `payments` | `bookingId` يصبح nullable، إضافة `treasuryAccountId`, `voucherType` |
| `schema/finance.ts` | إضافة `chartOfAccountId` للـ expenses |
| `routes/pos.ts` | ترحيل لـ Drizzle ORM |
| `routes/suppliers.ts` | ترحيل لـ Drizzle ORM أو على الأقل إضافة Drizzle schema |
| `FinancePage.tsx` | إعادة بناء كاملة كـ Financial Hub متكامل |
