# BOOKINGS MIGRATION MAP
**تاريخ:** 2026-04-20  
**Branch:** `refactor/bookings-canonical-migration`  
**الحالة:** Phase 1 — Discovery (Read-Only)

---

## أ) Feature Parity Matrix

### جداول المقارنة: Legacy vs Canonical

| الجدول القديم | الجدول الجديد | الحالة |
|---|---|---|
| `bookings` | `booking_records` | ✅ كامل — + `bookingType` field جديد |
| `booking_items` | `booking_lines` | ✅ كامل — + `snapshot` JSON لتجميد حالة الخدمة |
| `booking_item_addons` | `booking_line_addons` | ✅ كامل |
| `booking_assignments` | `booking_record_assignments` | ✅ كامل |
| `booking_commissions` | `booking_record_commissions` | ✅ كامل |
| `booking_events` | `booking_timeline_events` | ✅ أفضل — + index على `createdAt` |
| `booking_consumptions` | `booking_consumptions_canonical` | ✅ كامل + `metadata` JSON |
| `payments` | لا يوجد جدول جديد | ⚠️ `payments` محفوظ — `booking_payment_links` يربطه |
| `booking_pipeline_stages` | لا يوجد جدول مكافئ | ⚠️ مفقود في canonical |

### أعمدة موجودة في Legacy غير موجودة في Canonical

| الجدول | العمود | الملاحظة |
|---|---|---|
| `bookings` | `couponCode` / `couponDiscount` | مفقود في `booking_records` |
| `bookings` | `utmSource` / `utmMedium` / `utmCampaign` | مفقود — يمكن تخزينه في `metadata` JSON |
| `bookings` | `isRecurring` / `recurringPattern` / `parentBookingId` | مفقود في `booking_records` |
| `bookings` | `setupDate` / `teardownDate` | في canonical فقط في `event_bookings` |
| `bookings` | `consentMetadata` | مفقود — يمكن تخزينه في `metadata` JSON |
| `bookings` | `refundAmount` | في `event_bookings` فقط، غير موجود في `booking_records` |
| `booking_items` | `serviceType` | مفقود في `booking_lines` — موجود في `snapshot` |
| `booking_items` | `vatInclusive` | موجود ✅ |
| `booking_items` | `pricingBreakdown` | موجود ✅ |

### جداول Canonical جديدة بدون مكافئ في Legacy

| الجدول | الوظيفة |
|---|---|
| `appointment_bookings` | حجوزات Vertical (Salon/Photography/Maintenance) |
| `stay_bookings` | حجوزات إقامة (Hotel/Car Rental) |
| `table_reservations` | حجوزات طاولات (Restaurant) |
| `event_bookings` | حجوزات فعاليات (Events/Weddings) |
| `booking_payment_links` | ربط payments بـ booking_records |

---

## ب) Dependency Graph

### الملفات التي تستورد من bookings.ts (Legacy)

| الملف | الجداول المستخدمة | الغرض |
|---|---|---|
| `routes/bookings.ts` | كل الجداول | Route handler الرئيسي |
| `routes/admin.ts` | `bookings` | قائمة الحجوزات للأدمن |
| `routes/billing.ts` | `bookings`, `payments` | إحصائيات للـ billing |
| `routes/finance.ts` | `bookings`, `bookingItems`, `payments` | تقارير مالية |
| `routes/maintenance.ts` | `bookings` | التحقق من وجود حجز |
| `routes/salon.ts` | `bookings` | التحقق من ملكية الحجز |
| `routes/services.ts` | `bookings` | جلب تاريخ الحجز للخدمة |
| `routes/settings.ts` | `bookings` | عدد الحجوزات (للـ free plan counter) |
| `routes/subscription.ts` | `bookings` | إحصائيات الاشتراك |
| `routes/team.ts` | `bookings` | التحقق من وجود الحجز قبل تعيين مهمة |
| `routes/website.ts` | `bookings`, `bookingItems`, `bookingItemAddons` | التحقق من حجز العميل للخدمة |
| `lib/booking-engine.ts` | `bookings`, `bookingItems`, `services` | محرك الحجز الأصلي |
| `lib/booking-ops.ts` | `bookingEvents`, `bookings`, `bookingPipelineStages` | عمليات الحجز |
| `lib/canonical-shadow.ts` | كل الجداول القديمة | قراءة Legacy → كتابة Canonical |
| `lib/bookings-mapping.ts` | Types من bookings.ts | تحويل legacy → canonical |
| `jobs/auto-book.ts` | `bookings`, `customers` | حجز تلقائي للاشتراكات |

### الملفات التي تستورد من canonical-bookings.ts

| الملف | الجداول المستخدمة |
|---|---|
| `routes/bookings.ts` | `bookingRecords`, `bookingLines`, `bookingTimelineEvents` (خلف feature flags) |
| `engines/appointment/index.ts` | `appointmentBookings` فقط |
| `engines/stay/index.ts` | `stayBookings` فقط |
| `engines/table/index.ts` | `tableReservations` فقط |
| `engines/event/index.ts` | `eventBookings` فقط |
| `lib/canonical-shadow.ts` | كل جداول canonical (للكتابة) |

### الـ Frontend

الفرونت يتكلم مع `/api/v1/bookings/*` فقط — لا يعرف بوجود engines.  
`bookingsApi` في `apps/dashboard/src/lib/api.ts` يستدعي:
- `GET /bookings` — list
- `GET /bookings/:id` — detail
- `POST /bookings` — create
- `PATCH /bookings/:id/status` — status change
- `PATCH /bookings/:id/reschedule` — reschedule
- `POST /bookings/:id/payments` — add payment
- `GET /bookings/calendar/events` — calendar
- `GET /bookings/check-availability` — conflict check
- `GET /bookings/stats/*` — stats

---

## ج) Shadow Write Analysis

### الوضع الحالي

```
ENABLE_CANONICAL_SHADOW_WRITE = process.env.ENABLE_CANONICAL_SHADOW_WRITE === "true"
ENABLE_CANONICAL_READ_DETAIL  = process.env.ENABLE_CANONICAL_READ_DETAIL === "true"
ENABLE_CANONICAL_READ_LIST    = process.env.ENABLE_CANONICAL_READ_LIST === "true"
```

- **Shadow Write مُفعَّل:**  عند `ENABLE_CANONICAL_SHADOW_WRITE=true` فقط  
- **الافتراضي:** `false` — أي canonical tables فارغة حالياً

### متى تحدث Shadow Write؟

| Event | Trigger | الجداول المكتوبة |
|---|---|---|
| POST /bookings (create) | shadowWriteBookingOnCreate() | booking_records + lines + addons + timeline + assignments + commissions + consumptions + payment_links |
| PATCH /bookings/:id/status | shadowWriteBookingStatus() | booking_records (status) + booking_timeline_events (event) |

### ما لا تغطيه Shadow Write

| العملية | الحالة |
|---|---|
| POST /bookings/:id/payments | ❌ لا shadow write — payment link لا يُكتب |
| PATCH /bookings/:id/reschedule | ❌ لا shadow write للموعد الجديد |
| تعديل الخدمات في الحجز | ❌ لا shadow write |
| إضافة/حذف assignments | ❌ لا shadow write بعد الإنشاء |
| تعديل العمولات | ❌ لا shadow write |

### الخلاصة

Shadow Write **ليست كاملة** — تغطي فقط CREATE + STATUS CHANGE.  
بما أن لا مستخدمين حقيقيين → نتجاهل Shadow Write ونكتب مباشرة للـ canonical.

---

## د) Schema Diff

### جداول مرشحة للحذف بعد المايغريشن

| الجدول | الحجم | الاعتماديات الخارجية |
|---|---|---|
| `bookings` | الجدول الرئيسي | مُستورَد في 15+ ملف |
| `booking_items` | child of bookings | مُستورَد في 5+ ملفات |
| `booking_item_addons` | child of booking_items | 2 ملفات |
| `booking_assignments` | child of bookings | routes/bookings.ts |
| `booking_commissions` | child of bookings | routes/bookings.ts + salary |
| `booking_events` | child of bookings | lib/booking-ops.ts + routes/bookings.ts |
| `booking_consumptions` | child of bookings | routes/bookings.ts |
| `booking_pipeline_stages` | child of org | lib/booking-ops.ts + lib/workflow-engine.ts |

### مشكلة حرجة: Circular Import

`canonical-bookings.ts` يستورد من `bookings.ts`:

```typescript
import { bookings, payments } from "./bookings"; // line 22
```

وذلك بسبب `bookingRef` FK في canonical tables:
```typescript
bookingRef: uuid("booking_ref").references(() => bookings.id)
```

**قبل حذف `bookings` يجب إزالة هذا الـ FK وعمود `bookingRef`.**

### جداول مشتركة (تبقى)

| الجدول | السبب |
|---|---|
| `payments` | مستخدم من `payment-gateway.ts`، `finance.ts`، `billing.ts` — خارج نطاق المايغريشن |
| `booking_pipeline_stages` | لا مكافئ في canonical — يحتاج قرار معماري |

---

## هـ) Test Coverage

### التستات الموجودة

| الملف | ما يغطيه | تغطية الـ DB |
|---|---|---|
| `__tests__/booking-ops.test.ts` | `getBookingSlaState` + timeline helpers | لا DB (pure unit) |
| `__tests__/workflow-engine.test.ts` | `canTransition` logic | لا DB (pure unit) |
| `__tests__/dashboard-selection.test.ts` | dashboard selection logic | لا DB (pure unit) |

### تغطية Booking Flows الحرجة

| Flow | تست موجود؟ |
|---|---|
| إنشاء حجز جديد (POST /bookings) | ❌ لا يوجد |
| تغيير حالة الحجز | ❌ لا يوجد (يُغطى جزئياً بـ workflow-engine.test.ts لكن بدون DB) |
| إلغاء حجز + refund | ❌ لا يوجد |
| Conflict detection | ❌ لا يوجد |
| Multi-tenant isolation (orgId) | ❌ لا يوجد |
| Payment linkage | ❌ لا يوجد |

### **التغطية: ~5% على الـ flows الحرجة**

التستات الموجودة تختبر pure logic فقط (بدون DB). لا تستات integration لأي booking flow.

---

## ملخص تقييم المايغريشن

### المستوى الحقيقي للـ Canonical

النظام يحتوي على **طبقتين canonical**:

```
طبقة 1: Vertical Tables (مكتملة، مستخدمة من engines)
  - appointment_bookings ← appointmentEngine
  - stay_bookings        ← stayEngine
  - table_reservations   ← tableEngine
  - event_bookings       ← eventEngine

طبقة 2: Generic Aggregate (مكتملة لكن خلف feature flags)
  - booking_records + booking_lines + ... ← routes/bookings.ts (مع ENABLE_CANONICAL_*)
```

الـ Frontend يتكلم مع `/bookings` route (يستخدم legacy) — ولا يتكلم مع `/engines/*` بعد.

### الحجم الفعلي للعمل

| المهمة | العمل المطلوب |
|---|---|
| إزالة bookingRef FK من canonical | سهل — migration + تعديل schema |
| توجيه `routes/bookings.ts` للكتابة في canonical | 2116 سطر — الجزء الأكبر |
| تحديث 14 ملف خارجي (admin/salon/finance...) | متوسط — queries بسيطة |
| إضافة `couponCode`/`utmSource`/`recurringPattern` لـ booking_records | migration + schema تعديل |
| `booking_pipeline_stages` — لا مكافئ | قرار معماري مطلوب |
| كتابة integration tests | يجب قبل أي حذف |

---

## قرارات مطلوبة قبل Phase 2

### القرار 1: bookingPipelineStages
هل نضيف جدول مكافئ في canonical؟ أم نتركه يشير لـ `booking_records`؟

### القرار 2: الحقول الناقصة في booking_records
هل نضيف: `couponCode`, `utmSource/Medium/Campaign`, `isRecurring/recurringPattern/parentBookingId`, `consentMetadata`?

**التوصية:** نعم — كلها مهمة عملياً.

### القرار 3: نهج المايغريشن
**الخيار المقترح (نظام بلا مستخدمين):**
1. أضف الحقول الناقصة لـ `booking_records` (migration)
2. أزل `bookingRef` FK من canonical tables (migration)  
3. أعد كتابة `routes/bookings.ts` ليكتب على canonical مباشرة
4. حدّث الـ 14 ملف الخارجي
5. احذف legacy tables من schema
6. احذف legacy tables من DB (DROP TABLE)

### القرار 4: الـ Vertical Tables (appointmentBookings, stayBookings...)
بعد المايغريشن، هل تصبح الـ engines هي الـ interface للـ frontend؟ أم تبقى `/bookings` كـ unified endpoint؟

**التوصية:** إبقاء `/bookings` كـ unified endpoint — يكتب في `booking_records` + يطغّل engine مناسب حسب نوع الخدمة. لا تغيير في الـ frontend API.

---

*Phase 1 مكتملة. التقرير جاهز للمراجعة.*  
*ينتظر: "APPROVED - START PHASE 2"*
