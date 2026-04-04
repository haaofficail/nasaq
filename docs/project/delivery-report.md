# تقرير التسليم — إصلاح المشاكل الحرجة
**التاريخ:** 2026-04-04 | **الحالة:** مكتمل

---

## ملخص ما تم

تم إصلاح جميع المشاكل الـ 7 الحرجة المحددة في تقرير الفحص (Audit 4.8/10). tsc = 0 أخطاء، pnpm build ناجح، pm2 online.

---

## C1 — Treasury TOCTOU (إصلاح سباق الخزينة)

**الملف:** `packages/api/src/routes/treasury.ts`

**المشكلة:** قراءة الرصيد كانت **خارج** المعاملة. طلبان متزامنان يقرآن نفس الرصيد القديم فيسجل أحدهما خسارة صامتة. في `POST /payment`، كان ممكن يطلع الرصيد سالباً رغم اجتياز الفحص.

**الإصلاح:**
- نقل `SELECT current_balance` داخل `db.transaction()` مع `FOR UPDATE`
- الحساب والتحديث والإدراج كلهم في نفس المعاملة المقفولة
- متغيرات `notFound` و `insufficientBalance` تُقرأ بعد انتهاء المعاملة لإرجاع الخطأ الصحيح

---

## C2 — Stay Double-Booking (الحجز المزدوج)

**الملف:** `packages/api/src/engines/stay/index.ts`

**المشكلة:** فحص التوفر والـ INSERT كانا جملتين منفصلتين. طلبان متزامنان لنفس الوحدة يجتازان الفحص معاً فيحجزانها مزدوجاً.

**الإصلاح:**
- `pg_advisory_xact_lock(hashtext(unitId))` يقفل الوحدة في بداية المعاملة
- فحص التعارض والـ INSERT ضمن `db.transaction()` واحدة
- مستحيل حجز مزدوج لنفس الوحدة في نفس اللحظة

---

## C3 — Property GL Entries (القيود المحاسبية المفقودة)

**الملف:** `packages/api/src/routes/property.ts`

**المشكلة:** 6 routes مالية تسجّل مدفوعات وفواتير دون قيود في دفتر الأستاذ العام، بينما كل وحدات أخرى (bookings, finance, HR, POS) تستخدم المحرك المحاسبي.

**الإصلاح:** إضافة `autoJournal.*` بعد كل عملية مالية:

| Route | القيد المضاف |
|-------|-------------|
| `PATCH /invoices/:id/pay` | `autoJournal.invoicePaid()` |
| `POST /payments` | `autoJournal.contractPaymentReceived()` |
| `POST /payments/quick` | `autoJournal.contractPaymentReceived()` |
| `POST /construction/:id/payments` | `autoJournal.contractPaymentReceived()` |
| `POST /invoices/generate-for-contract/:id` | `autoJournal.invoiceIssued()` لكل فاتورة |
| `POST /invoices/generate` | `autoJournal.invoiceIssued()` لكل فاتورة |

جميع القيود fire-and-forget (لا توقف العملية الأصلية إذا فشلت).

---

## C4 — Booking Number Race (تكرار أرقام الحجوزات)

**الملفات:** `engines/shared/booking-number.ts` + 4 engines

**المشكلة:** `SELECT COUNT(*) + 1` خارج أي معاملة — طلبان متزامنان يحصلان على نفس الرقم.

**الإصلاح:** استبدال بـ `crypto.getRandomValues()` مطابقاً لما يستخدمه `bookings.ts`:
- `generateBookingNumber("stay")` → مثال: `STY-2026-K3X9Q1`
- `generateBookingNumber("appointment")` → `APT-2026-W7M2P4`
- `generateBookingNumber("table")` → `TBL-2026-A5B8C2`
- `generateBookingNumber("event")` → `EVT-2026-Z1N6R0`
- ~2.17 مليار تركيبة — احتمال التكرار شبه صفر

---

## C5 — Emoji Removal (إزالة الإيموجي)

**الملفات:** `pages/ServicesPage.tsx` + `pages/PublicFlowerPage.tsx`

**المشكلة:** `SERVICE_TYPES` يحتوي emoji مباشرة في الكود (مخالف للدستور: لا emoji أبداً).

**الإصلاح:**
- `ServicesPage.tsx`: استبدال كل emoji بأيقونات Lucide (`Calendar`, `Wrench`, `MapPin`, `Home`, `Package`, `Truck`, `UtensilsCrossed`, `Gift`, `Plus`, `ClipboardList`, `Star`)
- `PublicFlowerPage.tsx`: استبدال fallback `"🎁"` بـ `<Gift className="w-5 h-5 text-gray-400" />`

---

## H1 — xlsx → exceljs (CVE-2023-30533)

**الملف:** `pages/school/SchoolImportPage.tsx`

**المشكلة:** `xlsx@0.18.5` — Prototype Pollution + ReDoS، لا يوجد patch من المطوّر.

**الإصلاح:**
- تثبيت `exceljs@4.4.0`
- إعادة كتابة `parseFile()` لتصبح async مع ExcelJS Workbook API
- إعادة كتابة `downloadTemplate()` مع `workbook.xlsx.writeBuffer()` + Blob download
- حذف `xlsx` من `package.json`

---

## H5 — Moyasar Webhook Secret Required

**الملف:** `packages/api/src/routes/payments.ts:319`

**المشكلة:** إذا `MOYASAR_WEBHOOK_SECRET` غير مضبوط، يُقبل الـ webhook بدون تحقق من التوقيع.

**الإصلاح:**
```ts
if (!secret) return c.json({ error: "webhook غير مفعّل — MOYASAR_WEBHOOK_SECRET غير مضبوط" }, 503);
```
الآن غياب المتغير يرجع 503 مباشرة بدلاً من قبول كل الطلبات.

---

## ملفات docs/skills المُنشأة

| الملف | المحتوى |
|-------|---------|
| `AUDIT-CHECKLIST.md` | قائمة فحص كاملة — C1-C7 مكتملة |
| `BUSINESS-TYPES.md` | مواصفات كل نوع بيزنس + المخزون |
| `UX-SIMPLICITY.md` | 7 قواعد للتبسيط والذكاء |
| `PRODUCT-ENGINEERING.md` | هندسة فورم المنتج الذكي + حذف التكرار |

---

## حالة البناء

```
tsc --noEmit (dashboard) = 0 errors
tsc --noEmit (api)       = 0 errors
pnpm build (dashboard)   = ✓ built in 10.58s
pnpm build (api)         = ✓
pm2 nasaq-api            = online (pid 285861)
```

---

## الملاحظات

- **docs/skills**: جاهزة كمرجع لكل جلسة تطوير قادمة
- **خطوات P1 المتبقية** (recharts v3، tailwind v4، N+1 fix، requestId): موثّقة في `codebase_audit.md`
- **engines/**: الأربعة engines مُصلحة الآن لكنها غير موصولة في `index.ts` — هذا بند منفصل في Backlog (H19)
