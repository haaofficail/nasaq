# CASHBOX_AND_TREASURY_AUDIT.md
## Nasaq — Cashbox & Treasury System Audit
_Audit Date: 2026-03-22_

---

## 1. ما الموجود فعلياً

### 1.1 جداول Drizzle ORM ذات الصلة

| الجدول | الملف | صلته بالخزينة | الملاحظات |
|---|---|---|---|
| `payments` | `schema/bookings.ts` | جزئي | يسجل المدفوعات لكن مرتبط إجباريًا بـ `bookingId NOT NULL` |
| `bookings` | `schema/bookings.ts` | جزئي | `paidAmount`, `balanceDue`, `depositAmount` — أرقام تجميعية فقط |
| `expenses` | `schema/finance.ts` | جزئي | يسجل المصروفات لكن لا يربطها بصندوق محدد |
| `vendorPayouts` | `schema/finance.ts` | جزئي | كشف صرف لمقدمي الخدمة — بدون ربط بصندوق |
| `paymentGatewayConfigs` | `schema/finance.ts` | جزئي | إعدادات البوابات — لا حركات فعلية |

### 1.2 جداول Raw SQL فقط (غير موجودة في Drizzle)

| الجدول | المسار | الحالة | الخطورة |
|---|---|---|---|
| `pos_transactions` | `routes/pos.ts` | Raw SQL — بدون schema | عالية — لا يمكن join أو type-safe |
| `pos_settings` | `routes/pos.ts` | Raw SQL — بدون schema | متوسطة |
| `pos_quick_items` | `routes/pos.ts` | Raw SQL — بدون schema | منخفضة |
| `suppliers` | `routes/suppliers.ts` | Raw SQL — بدون schema | عالية — يحمل `balance` بدون tracking |
| `purchase_orders` | `routes/suppliers.ts` | Raw SQL — بدون schema | عالية — لا يولّد أي حركة خزينة |

### 1.3 API Routes الموجودة

| المسار | الوظيفة | الملاحظات |
|---|---|---|
| `GET/POST /pos/transactions` | عمليات نقطة البيع | Raw SQL — معزول تماماً عن باقي النظام |
| `POST /pos/sale` | بيع POS | لا يولّد قيد، لا يحدّث صندوقًا |
| `POST /pos/refund/:id` | استرداد POS | يعكس السجل فقط — لا أثر مالي حقيقي |
| `GET /pos/stats` | إحصائيات اليومية | يومي فقط — لا تراكمي |
| `GET /suppliers/stats` | ملخص الموردين | `total_balance` من raw SQL — غير موثوق |
| `GET/POST /finance/expenses` | تسجيل المصروفات | لا يخصم من صندوق |

### 1.4 طرق الدفع المدعومة حالياً (`paymentMethodEnum`)

```
mada | visa_master | apple_pay | tamara | tabby | bank_transfer | cash | wallet | payment_link
```

موجودة كـ enum لكن لا يوجد تتبع لأي منها: لا يُعرف أين ذهبت النقدية، ولا في أي بنك أُودع التحويل.

---

## 2. ما يمكن إعادة استخدامه

| المكوّن | كيفية الاستخدام |
|---|---|
| `payments` (مع تعديل) | بعد جعل `bookingId` nullable وإضافة `treasuryAccountId` — يصبح سجل الحركة الأساسي |
| `paymentMethodEnum` | يُبقى كما هو ويُضاف إليه |
| `expenses` (مع تعديل) | يُضاف إليه `treasuryAccountId` ليعرف من أي صندوق صُرف المصروف |
| `vendorPayouts` | يُربط بـ `treasury_transactions` مستقبلاً |
| `pos_transactions` (بعد ترحيل) | يُدمج مع treasury_transactions أو يُربط بها |

---

## 3. ما هو ناقص أو مبعثر

### 3.1 ناقص كلياً

| المكوّن | الأثر الحالي |
|---|---|
| **treasury_accounts** | لا يوجد تعريف للصناديق: لا صندوق رئيسي، لا صندوق فرع، لا حساب بنكي، لا عهدة موظف |
| **treasury_transactions** | كل حركة نقدية (قبض/صرف/تحويل) غير مسجّلة في مكان واحد مترابط |
| **treasury_transfers** | لا يمكن تسجيل تحويل من الصندوق إلى البنك أو بين الفروع |
| **cashier_shifts** | لا يوجد فتح/إغلاق وردية — الكاشير لا "يمسك" أي صندوق رسمياً |
| **رصيد جاري للصندوق** | `current_balance` غير موجودة — لا يعرف أحد كم في الصندوق الآن |
| **سندات القبض** | لا receipt_voucher رسمي مرتبط بصندوق |
| **سندات الصرف** | لا payment_voucher رسمي مرتبط بصندوق |

### 3.2 موجود لكن مبعثر أو معطوب

| المشكلة | التفاصيل | الملف |
|---|---|---|
| `payments.bookingId NOT NULL` | يمنع تسجيل قبض مستقل عن حجز (عربون نقدي خارج النظام، استرداد جزئي، إيداع بنكي) | `schema/bookings.ts:175` |
| POS معزول كلياً | `pos_transactions` لا علاقة له بـ `payments` ولا بأي صندوق — بيع POS لا يُضاف لرصيد الصندوق | `routes/pos.ts` |
| `expenses` بلا صندوق | المصروف يُسجَّل لكن لا يُعرف من أي صندوق دُفع — ولا يخصم من أي رصيد | `schema/finance.ts:136` |
| `suppliers.balance` بدون tracking | رصيد المورد موجود كحقل ثابت في raw SQL — لا حركات AP حقيقية | `routes/suppliers.ts` |
| `purchase_orders` بلا أثر مالي | أمر الشراء يُسجَّل لكن لا يولّد ذمة مورد ولا يخصم من خزينة | `routes/suppliers.ts` |

---

## 4. ما يجب Refactor له

| الملف | التعديل المطلوب |
|---|---|
| `schema/bookings.ts` → `payments` | `bookingId` يصبح **nullable**؛ إضافة `treasuryAccountId uuid references treasury_accounts(id)`؛ إضافة `voucherType text` (receipt/payment/transfer) |
| `schema/finance.ts` → `expenses` | إضافة `treasuryAccountId uuid` للربط بالصندوق الذي صُرف منه |
| `routes/pos.ts` | ترحيل `pos_transactions`, `pos_settings`, `pos_quick_items` إلى Drizzle ORM؛ ربط عمليات البيع بـ `treasury_transactions` |
| `routes/suppliers.ts` | ترحيل `suppliers`, `purchase_orders` إلى Drizzle ORM؛ ربط أوامر الشراء بذمم الموردين |

---

## 5. ما يجب بناؤه من الصفر

### 5.1 قاعدة البيانات (Drizzle Schema)

```sql
-- 1. أنواع الخزائن
treasury_accounts (
  id, org_id, name, type,
  -- main_cash | branch_cash | cashier_drawer | petty_cash | bank_account | employee_custody
  branch_id, responsible_user_id,
  opening_balance, current_balance, currency,
  account_number, bank_name, -- للحسابات البنكية
  gl_account_id, -- ربط بدليل الحسابات (مستقبلاً)
  is_active, created_at
)

-- 2. حركات الخزينة
treasury_transactions (
  id, org_id, treasury_account_id,
  transaction_type,
  -- receipt | payment | transfer_in | transfer_out | opening | closing | adjustment
  amount, balance_after, description, reference,
  source_type, source_id, -- booking | invoice | expense | pos | manual
  payment_method, counterparty_type, counterparty_id,
  voucher_number, shift_id, journal_entry_id,
  created_by, created_at
)

-- 3. تحويلات بين الصناديق
treasury_transfers (
  id, org_id, from_account_id, to_account_id,
  amount, description, transfer_date,
  status, -- pending | completed | cancelled
  approved_by, journal_entry_id,
  created_by, created_at
)

-- 4. وردية الكاشير
cashier_shifts (
  id, org_id, treasury_account_id, cashier_id,
  opening_balance, closing_balance, actual_cash,
  variance, status, -- open | closed | reconciled
  opened_at, closed_at, notes
)
```

### 5.2 API Routes المطلوبة

```
GET    /treasury/accounts           -- قائمة الصناديق
POST   /treasury/accounts           -- إنشاء صندوق جديد
GET    /treasury/accounts/:id       -- تفاصيل صندوق مع الرصيد
GET    /treasury/accounts/:id/transactions -- حركات صندوق محدد
POST   /treasury/receipt            -- سند قبض
POST   /treasury/payment            -- سند صرف
POST   /treasury/transfer           -- تحويل بين صناديق
GET    /treasury/transfers          -- قائمة التحويلات
POST   /treasury/shifts/open        -- فتح وردية
POST   /treasury/shifts/close       -- إغلاق وردية
GET    /treasury/shifts             -- وردية اليوم
GET    /treasury/summary            -- ملخص خزيني (كل الصناديق)
GET    /treasury/reports/daily      -- تقرير يومي
GET    /treasury/reports/cashflow   -- تدفق نقدي حقيقي
```

### 5.3 واجهة المستخدم المطلوبة

```
TreasuryPage.tsx           -- نظرة عامة: كل الصناديق + أرصدة
TreasuryAccountPage.tsx    -- تفاصيل صندوق + حركاته
ReceiptVoucherPage.tsx     -- سند قبض
PaymentVoucherPage.tsx     -- سند صرف
TransferPage.tsx           -- تحويل بين صناديق
CashierShiftPage.tsx       -- فتح/إغلاق وردية
```

---

## 6. خلاصة الحالة

```
الصناديق الموجودة حالياً: 0
حركات الخزينة المتتبعة: 0
وردية الكاشير: لا توجد
سندات القبض الرسمية: لا توجد
سندات الصرف الرسمية: لا توجد
تحويلات بين الصناديق: لا توجد
رصيد الصندوق الحالي: مجهول
```

النظام يعرف **كم دُفع** عبر جدول `payments`، لكنه لا يعرف **أين ذهبت النقدية** ولا **كم في الصندوق الآن**.
