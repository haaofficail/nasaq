# Phase 0 — تقرير التدقيق الشامل
**تاريخ التنفيذ:** 2026-04-22  
**المنصة:** ترميز OS  
**الحالة:** مكتمل

---

## 0.1 قاعدة البيانات

### إحصائيات عامة
| المقياس | القيمة |
|---------|--------|
| إجمالي الجداول | 353 جدول |
| إجمالي الـ indexes | 1,015 |
| حجم قاعدة البيانات | 67 MB |
| آخر migration مطبّق | `151_create_org_code_seq.sql` (2026-04-22) |
| إجمالي المنشآت (orgs) | 37 |
| إجمالي المستخدمين | 139 |
| الحجوزات في آخر 30 يوم | 1,230 |

### أكبر الجداول (حجماً)
| الجدول | الحجم الكلي | عدد الصفوف |
|--------|------------|------------|
| bookings | 4.1 MB | 1,230 |
| journal_entry_lines | 1.8 MB | 4,737 |
| journal_entries | 1.7 MB | 1,579 |
| pos_transactions | 1.1 MB | 650 |
| invoices | 968 KB | 929 |
| hr_attendance | 960 KB | 1,360 |
| service_orders | 712 KB | 425 |
| job_common (pg_boss) | — | 49,656 |

### ملاحظات
- `job_common` هو جدول pg-boss للمهام المجدولة — طبيعي أن يكون الأكبر بالعدد
- جدولا `_migrations` (159 صف) و`_nasaq_migrations` (153 صف) يشيران لمسارين مختلفين (Drizzle + custom)
- لا توجد جداول ضخمة استثنائية تدل على تسرب بيانات

---

## 0.2 جودة الكود

### TypeScript
| الحزمة | أخطاء TS | الحالة |
|--------|---------|--------|
| `@nasaq/api` | 0 | ✅ |
| `dashboard` | 0 | ✅ |

### حجم الكود
| المجال | القيمة |
|--------|--------|
| ملفات Route (API) | 81 ملف |
| ملفات صفحات (Dashboard) | 242 صفحة TSX |
| إجمالي ملفات TSX | 322 ملف |
| ملفات اختبار (.test.ts/.spec.ts) | 218 ملف |
| TODOs في API | 42 |
| TODOs في Dashboard | 38 |

### ملاحظات
- TypeScript نظيف بدون أخطاء على كلا الحزمتين
- 218 ملف اختبار — تغطية جيدة

---

## 0.3 الميزات المبنية مسبقاً (اكتشافات Phase 0)

> **تحذير مهم:** الخطة الأصلية افترضت أن هذه الميزات غير موجودة. الواقع مختلف.

### ✅ Phase 1 — Moyasar: موجود بالكامل
- `payment_transactions` — 24 عمود بما فيها `moyasar_id`, `moyasar_status`, `moyasar_data`
- `payment_gateway_configs` — جدول كامل بـ 15 عمود
- `packages/api/src/routes/payments.ts` — 579 سطر يشمل:
  - `POST /payments/initiate` — إنشاء معاملة + رابط Moyasar
  - `GET /payments/callback` — معالجة العودة من بوابة الدفع
  - `POST /payments/webhook` — استقبال أحداث Moyasar بتوقيع مُحقَّق
  - `POST /payments/transactions/:id/refund` — استرداد
  - `GET /payments/transactions` + `/stats` — تقارير
- `packages/api/src/lib/moyasar.ts` + `moyasar-webhook.ts` — طبقة العميل
- `apps/dashboard/src/pages/PaymentsPage.tsx` — 464 سطر واجهة كاملة
- `apps/dashboard/src/pages/PublicPaymentPage.tsx` — صفحة callback عامة

### ✅ Phase 5 — Coupons: موجود بالكامل
- جدول `coupons` — 18 عمود (types: percentage/fixed, max_uses, expires_at, service_ids)
- `packages/api/src/routes/marketing.ts` — CRUD كامل:
  - `GET/POST /marketing/coupons`
  - `PATCH/DELETE /marketing/coupons/:id`
  - `POST /marketing/coupons/validate`
- `MarketingPage.tsx` — تبويب "الكوبونات" موجود في الواجهة

### ✅ Phase 6 — SMS/Twilio: موجود بالكامل
- `packages/api/src/lib/sms.ts` — 81 سطر، ينفّذ Twilio مباشرةً
- يحتاج فقط: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` في `.env`

### ✅ Abandoned Carts: موجود جزئياً
- جدول `abandoned_carts` — 16 عمود (recovery_status, reminders_sent, recovered_at)
- `AbandonedCartsPage.tsx` — واجهة إدارة متاحة

---

## 0.4 الثغرات الفعلية (ما يحتاج بناء فعلاً)

### ثغرة 1 — سلة التسوق العامة (Cart API للـ Storefront)
**الحالة:** جدول `abandoned_carts` موجود لكن لا توجد endpoints عامة للـ storefront
- `storefront-v2.ts` يحتوي فقط: analytics, page display, contact form
- لا يوجد: `POST /:orgSlug/cart`, `GET /:orgSlug/cart/:sessionId`, `POST /:orgSlug/order`
- **الأثر:** العميل لا يستطيع إضافة منتجات إلى سلة وإتمام طلب مدفوع
- **الحل:** إضافة cart endpoints في storefront-v2.ts

### ثغرة 2 — Checkout Flow للمتجر العام
**الحالة:** `PublicPaymentPage.tsx` مخصصة للحجوزات — ليست للمنتجات
- لا توجد صفحة checkout مستقلة للمتجر الإلكتروني
- لا يوجد ربط: cart → order → Moyasar payment → callback للمتجر
- **الأثر:** لا يمكن بيع منتجات عبر الـ storefront
- **الحل:** إضافة checkout flow في PublicStorefrontPage.tsx أو صفحة منفصلة

### ثغرة 3 — إدارة منتجات المتجر (Dashboard)
**الحالة:** `InventoryPage.tsx` موجود لكن للـ assets والمخزون الداخلي
- لا توجد واجهة منفصلة لـ "منتجات المتجر" المعروضة للعملاء عبر الـ storefront
- `inventory_products` لا يحتوي على: وصف طويل, gallery صور, خيارات التوصيل, ترتيب العرض
- **الأثر:** التاجر لا يستطيع إدارة كتالوج المتجر بشكل مستقل
- **الحل:** CatalogPage أو تبويب في InventoryPage للمنتجات العامة

### ثغرة 4 — Page Builder v2 لا يعرض منتجات حقيقية
**الحالة:** `ProductsGrid.tsx` و`ProductsFeatured.tsx` موجودان في blocks لكن تعرض static data
- لا يجلبان من `inventory_products` أو API
- **الأثر:** صفحات Page Builder لا تعرض كتالوج حقيقي
- **الحل:** ربط blocks بـ `GET /storefront-v2/:orgSlug/products`

### ثغرة 5 — Moyasar في storefront غير مُفعَّل
**الحالة:** Moyasar مبني للـ booking payments فقط
- `payments/initiate` يحتاج `invoiceId` أو `bookingId` — لا يدعم product orders
- **الأثر:** لا يمكن استخدام Moyasar لدفع طلبات المنتجات
- **الحل:** تعديل `initiate` ليقبل `orderId` أيضاً

### ثغرة 6 — لا يوجد Admin visibility للـ Payments Gateway
**الحالة:** AdminPage لا يحتوي تبويب لمراجعة إعدادات payment_gateway لكل منشأة
- **الأثر:** الأدمن لا يرى أي منشأة فعّلت Moyasar وبأي مفاتيح
- **الحل:** إضافة تبويب في AdminPage

---

## 0.5 رسم المعمارية

انظر: `docs/architecture/SYSTEM-MAP.md`

---

## 0.6 الأمن

### ما تم فحصه
- ✅ جميع routes تتطلب `requireAuth` أو `requirePermission`
- ✅ `_devCode` في OTP محمي بـ `NODE_ENV !== "production"`
- ✅ SMTP credentials في `.env` غير مُتتبَّعة في git
- ✅ Moyasar webhook يتحقق من التوقيع (`verifyMoyasarSignature`)

### TODOs تحتاج مراجعة
- 42 TODO في API و38 في Dashboard — بعضها قد يكون ثغرات وظيفية

---

## 0.7 المقاييس الأساسية (Baseline)

انظر: `docs/metrics/baseline-2026-04-22.md`

---

## الخلاصة التنفيذية

| Phase | الوصف | الحالة الفعلية |
|-------|-------|---------------|
| Phase 1 | Moyasar Payments | ✅ مبني بالكامل |
| Phase 2 | Cart System | ⚠️ جدول موجود، API ناقص |
| Phase 3 | Checkout Flow | ❌ غير موجود للمنتجات |
| Phase 4 | Products UI | ⚠️ موجود للمخزون، ناقص للـ storefront |
| Phase 5 | Coupons | ✅ مبني بالكامل |
| Phase 6 | SMS/Twilio | ✅ مبني، ينتظر env vars |
| Phase 7 | Rollout | ⏳ تالياً |

### الأولوية الفعلية للبناء
1. **Cart + Checkout API** في storefront-v2.ts (Phase 2+3 مدمجان)
2. **Products UI** للمتجر (Phase 4)
3. **Moyasar order payment** دعم orderId (Phase 1 extension)
4. **Page Builder products block** ربط بـ API (Phase 4 extension)
5. **Admin payment gateway visibility** (Phase 1 admin)
