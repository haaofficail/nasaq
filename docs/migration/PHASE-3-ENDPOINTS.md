# Phase 3 — Endpoint Migration Inventory

Branch: `refactor/phase-3-big-switch`
Date: 2026-04-20
Status: **AWAITING APPROVAL FOR 3.A.2**

---

## الخريطة المعمارية: Legacy → Canonical

```
Legacy tables              Canonical tables
─────────────────          ────────────────────────────
bookings               →   booking_records
booking_items          →   booking_lines
booking_item_addons    →   booking_line_addons
booking_events         →   booking_timeline_events
payments               →   booking_payment_links  (Phase 3.C)
booking_assignments    →   booking_record_assignments
booking_commissions    →   booking_record_commissions
booking_consumptions   →   booking_record_consumptions (canonical)
```

## حقل mapping (الأهم)

| Legacy (`bookings`) | Canonical (`booking_records`) | ملاحظة |
|---|---|---|
| `event_date` | `starts_at` | renamed |
| `event_end_date` | `ends_at` | renamed |
| `booking_items[]` | `booking_lines[]` | renamed — response key stays `items` |
| `booking_items.service_id` | `booking_lines.service_ref_id` | renamed |
| `booking_items.service_name` | `booking_lines.item_name` | renamed |
| `booking_item_addons` | `booking_line_addons` | renamed |
| `booking_events` | `booking_timeline_events` | booking_events table stays for legacy reads |
| `payments[]` | `booking_payment_links[]` | Phase 3.C |
| `tracking_token` | `tracking_token` | ✓ same |
| `booking_number` | `booking_number` | ✓ same |
| `customer_id` | `customer_id` | ✓ same |
| `location_id` | `location_id` | ✓ same |
| `status` | `status` | ✓ same |
| `payment_status` | `payment_status` | ✓ same |
| `assigned_user_id` | `assigned_user_id` | ✓ same |
| `subtotal` | `subtotal` | ✓ same |
| `total_amount` | `total_amount` | ✓ same |
| `paid_amount` | `paid_amount` | ✓ same |
| `balance_due` | `balance_due` | ✓ same |
| — | `booking_type` | NEW: "appointment" / "stay" / "table" / "event" |
| — | `booking_ref` | NEW: UUID للتتبع (no FK) |

---

## الـ 18 Endpoint — تفصيل كامل

### 1. `GET /bookings` — List with filtering + pagination

**Legacy tables:** `bookings`, `customers`, `locations`
**Canonical equivalent:** `booking_records`, `customers`, `locations`

**تغييرات الـ signature:**
- Filter: `dateFrom` / `dateTo` → تفلتر على `starts_at` بدل `event_date`
- Response: `data[].eventDate` → `data[].startsAt` (يُعاد تسميته في JSON response للـ backward compat)

**تغييرات الـ response:**
```diff
- data[].booking.eventDate
+ data[].booking.startsAt   (or mapped to eventDate for frontend compat)
- data[].booking.eventEndDate
+ data[].booking.endsAt
- data[].firstServiceName   (subquery on booking_items)
+ data[].firstServiceName   (subquery on booking_lines — field: item_name)
```

**تغطية التستات:** ❌ لا يوجد
**تستات مطلوبة قبل الاستبدال:** نعم
**الأولوية:** #1 (أبسط GET)
**التعقيد:** منخفض

---

### 2. `GET /bookings/check-availability`

**Legacy tables:** `bookings`
**Canonical equivalent:** `booking_records`

**تغييرات الـ signature:** لا شيء (query params نفسها)

**تغييرات الـ response:**
```diff
// فلتر الحالة: same logic
- sql`${bookings.status} NOT IN ('cancelled')`
+ sql`${bookingRecords.status} NOT IN ('cancelled')`

// التاريخ
- lte(bookings.eventDate, dayEnd)
+ lte(bookingRecords.startsAt, dayEnd)
```

**تغطية التستات:** ❌ لا يوجد
**تستات مطلوبة:** نعم
**الأولوية:** #2
**التعقيد:** منخفض

---

### 3. `GET /bookings/alerts`

**Legacy tables:** `booking_events` + `bookings` (عبر `booking-ops.ts:listOperationalAlerts`)
**Canonical equivalent:** `booking_timeline_events` + `booking_records`

**ملاحظة معمارية مهمة:**
`listOperationalAlerts` في `booking-ops.ts` تقرأ من `booking_events` (legacy). لاستبدالها يجب تحديث الدالة لتقرأ من `booking_timeline_events`. هذا يمس ملف خارج routes/bookings.ts.

**تغييرات الـ response:** نفس الشكل (OperationalAlert[])

**تغطية التستات:** ❌ لا يوجد
**تستات مطلوبة:** نعم — لكن يحتاج تحديث `booking-ops.ts` أيضاً
**الأولوية:** #8 (requires booking-ops.ts update)
**التعقيد:** متوسط

---

### 4. `GET /bookings/calendar` + `GET /bookings/calendar/events`

**Legacy tables:** `bookings`, `customers`, `locations`
**Canonical equivalent:** `booking_records`, `customers`, `locations`

**تغييرات:**
- `event_date` → `starts_at` في query
- Response: `eventDate` → `startsAt` (يُعاد تسميته للـ backward compat)

**ملاحظة:** هذان endpoint-ان متطابقان تقريباً — يمكن دمجهما في المستقبل.

**تغطية التستات:** ❌ لا يوجد
**الأولوية:** #3
**التعقيد:** منخفض

---

### 5. `GET /bookings/:id` — Full booking detail

**Legacy tables:** `bookings`, `bookingItems`, `bookingItemAddons`, `payments`, `customers`, `locations`, `invoices`
**Canonical equivalent:** `booking_records`, `booking_lines`, `booking_line_addons`, `booking_payment_links`, `customers`, `locations`, `invoices`

**تغييرات الـ response:**
```diff
// Items
- items: [{ serviceId, serviceName, quantity, unitPrice, addons: [...] }]
+ items: [{ serviceRefId, itemName, quantity, unitPrice, addons: [...] }]
  // ← key "items" يبقى نفسه للـ backward compat

// Payments — Phase 3.C يحددها
- payments: Payment[]
+ payments: BookingPaymentLink[]   // في Phase 3.C
  // في Phase 3.A: نبقي payments من جدول legacy أو نحذفها من الـ response
```

**قرار مهم:** في Phase 3.A يبقى `payments` من legacy table. استبداله في Phase 3.C.

**تغطية التستات:** ❌ لا يوجد
**الأولوية:** #4
**التعقيد:** متوسط

---

### 6. `GET /bookings/:id/events`

**Legacy tables:** `booking_events`, `users`
**Canonical equivalent:** `booking_timeline_events`, `users`

**تغييرات الـ signature:** لا شيء

**تغييرات الـ response:**
- `bookingId` → `bookingRecordId` (داخلياً، response key يبقى نفسه)

**تغطية التستات:** ❌ لا يوجد
**الأولوية:** #5
**التعقيد:** منخفض

---

### 7. `GET /bookings/:id/timeline`

**Legacy tables:** `booking_events` (عبر `booking-ops.ts:getBookingTimeline`) + `bookings` + `booking_pipeline_stages`
**Canonical equivalent:** `booking_timeline_events` + `booking_records` + `booking_pipeline_stages` (unchanged)

**ملاحظة:** `getBookingTimeline` في `booking-ops.ts` قرأ من `booking_events`. يجب تحديثها.
`getWorkflowStagesForOrg` تقرأ من `booking_pipeline_stages` — يبقى كما هو في Phase 3.A.

**تغطية التستات:** ❌ لا يوجد
**الأولوية:** #9 (يحتاج booking-ops.ts update)
**التعقيد:** متوسط

---

### 8. `GET /bookings/track/:token` — Public tracking

**Legacy tables:** `bookings`
**Canonical equivalent:** `booking_records`

**تغييرات الـ response:**
- `eventDate` → `startsAt` (يمكن map للـ backward compat)

**تغطية التستات:** ❌ لا يوجد
**الأولوية:** #6
**التعقيد:** منخفض

---

### 9. `GET /bookings/stats/*` (4 endpoints)

**Legacy tables:** `bookings` (aggregations only)
**Canonical equivalent:** `booking_records`

- `stats/summary` — aggregate: totalBookings, totalRevenue, statusBreakdown
- `stats/trend` — monthly revenue + count (last N months)
- `stats/growth` — current vs previous period comparison
- `stats/overview` — alias لـ `stats/summary`

**تغييرات:**
- `bookings.createdAt` → `booking_records.createdAt` (نفس الاسم ✓)
- `bookings.totalAmount` → `booking_records.totalAmount` (نفس الاسم ✓)
- `bookings.status` → `booking_records.status` (نفس الاسم ✓)

**تغطية التستات:** ❌ لا يوجد
**الأولوية:** #7
**التعقيد:** منخفض (field names نفسها)

---

### 10. `POST /bookings` — Create booking ⚠️ الأكثر تعقيداً

**Legacy tables:** `bookings`, `bookingItems`, `bookingItemAddons`, `customers`, `services`, `addons`, `pricingRules`, `serviceCosts`, `serviceStaff`, `organizations`
**Canonical equivalent:** `booking_records`, `booking_lines`, `booking_line_addons` + engine table

**ما يبقى بدون تغيير (Phase 3.A):**
- كل منطق حساب السعر (pricing rules, VAT, Decimal.js)
- فحص الـ conflict detection (يصبح على `booking_records`)
- free plan limit check
- Working hours enforcement
- الـ fire-and-forget: loyalty points, messaging, audit logs

**ما يتغير:**
```diff
// الكتابة
- INSERT INTO bookings(...)
+ INSERT INTO booking_records(startsAt, endsAt, ...)
- INSERT INTO booking_items(bookingId, ...)
+ INSERT INTO booking_lines(bookingRecordId, serviceRefId, itemName, ...)
- INSERT INTO booking_item_addons(bookingItemId, ...)
+ INSERT INTO booking_line_addons(bookingLineId, ...)

// Engine table (NEW in Phase 3.A)
+ INSERT INTO appointment_bookings(...) IF bookingType = 'appointment'
  // استخدام engine لتحديد نوع الحجز من business_type

// Organization booking counter
- UPDATE organizations SET booking_used = booking_used + 1
  // يبقى كما هو
```

**تعقيد إضافي:**
- `resolvedEventDate` → `resolvedStartsAt`
- Conflict detection query تتغير من `bookings.eventDate` → `booking_records.starts_at`
- `booking_events` insert لـ "created" → `booking_timeline_events`

**تغطية التستات:** ❌ لا يوجد (HTTP level)
**إذا تحدثنا عن DB ops:** ✅ `createTestBookingRecord` يغطي بعض المنطق
**الأولوية:** #10
**التعقيد:** عالٍ جداً

---

### 11. `PATCH /bookings/:id/status` — Workflow status update

**Legacy tables:** `bookings` + `bookingEvents` + `salonSupplies` + `bookingConsumptions`
**Canonical equivalent:** `booking_records` + `booking_timeline_events` + (supplies يبقى في Phase 3.A)

**ما يبقى بدون تغيير (Phase 3.A):**
- كل workflow engine logic (`canTransition`, `resolveWorkflowExecutionMode`)
- Supply deduction (يظل على legacy tables في Phase 3.A — 3.B يقرر)
- posting engine (accounting)
- Messaging + audit + loyalty

**ما يتغير:**
```diff
- SELECT ... FROM bookings WHERE id = ... FOR UPDATE
+ SELECT ... FROM booking_records WHERE id = ... FOR UPDATE
- UPDATE bookings SET status = ...
+ UPDATE booking_records SET status = ..., cancelled_at, cancellation_reason, ...
- INSERT INTO booking_events(bookingId, ...)
+ INSERT INTO booking_timeline_events(bookingRecordId, ...)
```

**ملاحظة Phase 3.B:** قرار `bookingPipelineStages` يؤثر على هذا الـ endpoint لاحقاً.

**تغطية التستات:** ❌ لا يوجد
**الأولوية:** #11 (بعد GET كلها + create)
**التعقيد:** عالٍ

---

### 12. `PATCH /bookings/:id/reschedule`

**Legacy tables:** `bookings`
**Canonical equivalent:** `booking_records`

**تغييرات:**
```diff
- UPDATE bookings SET event_date = ...
+ UPDATE booking_records SET starts_at = ..., ends_at = ...
  // event_end_date → ends_at
```

**تغطية التستات:** ❌ لا يوجد
**الأولوية:** #12
**التعقيد:** منخفض–متوسط

---

### 13. `POST /bookings/:id/payments` — Record payment ⚠️ Phase 3.C

**Legacy tables:** `payments`, `bookings`, `customers`, `organizations`
**Canonical equivalent:** `booking_payment_links`, `booking_records`

**قرار:** هذا الـ endpoint يُؤجَّل لـ **Phase 3.C** (Payments Schema Migration).
في Phase 3.A: يُترك يقرأ ويكتب على legacy `payments` + `bookings`.
الـ recording لا يتأثر بالـ GET/PATCH الأخرى بما أن كل entity مستقلة.

**الأولوية:** Phase 3.C فقط
**التعقيد:** عالٍ

---

### 14. `POST /bookings/track/:token/payment` — Moyasar

**OUT OF SCOPE للـ Phase 3** (يُحدد في Day 10 Security)
يبقى يقرأ من `bookings` table.

---

## جدول الأولويات الكامل (تنفيذياً)

| # | Priority | Endpoint | Table Change | 3.A Sub-step | Complexity |
|---|---|---|---|---|---|
| 1 | أول | `GET /` | bookings → booking_records | 3.A.2-step1 | منخفض |
| 2 | | `GET /check-availability` | bookings → booking_records | 3.A.2-step2 | منخفض |
| 3 | | `GET /calendar` + `/calendar/events` | bookings → booking_records | 3.A.2-step3 | منخفض |
| 4 | | `GET /:id` | bookings+items → records+lines | 3.A.2-step4 | متوسط |
| 5 | | `GET /:id/events` | booking_events → timeline_events | 3.A.2-step5 | منخفض |
| 6 | | `GET /track/:token` | bookings → booking_records | 3.A.2-step6 | منخفض |
| 7 | | `GET /stats/*` (4) | bookings → booking_records | 3.A.2-step7 | منخفض |
| 8 | | `GET /alerts` | booking-ops update | 3.A.2-step8 | متوسط |
| 9 | | `GET /:id/timeline` | booking-ops update | 3.A.2-step9 | متوسط |
| 10 | | `POST /` (create) | bookings+items → records+lines | 3.A.2-step10 | عالٍ جداً |
| 11 | | `PATCH /:id/status` | bookings+events → records+timeline | 3.A.2-step11 | عالٍ |
| 12 | آخر | `PATCH /:id/reschedule` | bookings → booking_records | 3.A.2-step12 | متوسط |
| — | Phase 3.C | `POST /:id/payments` | payments → payment_links | Phase 3.C | عالٍ |
| — | Out of scope | `POST /track/:token/payment` | يبقى legacy | — | — |

---

## تأثير على booking-ops.ts

الملف يحتاج تحديث موازٍ مع Phase 3.A لـ endpoints #8 و #9:

| دالة | التغيير |
|---|---|
| `getBookingTimeline(bookingId, orgId)` | تقرأ من `booking_timeline_events` بدل `booking_events` |
| `listOperationalAlerts(orgId, limit)` | تقرأ من `booking_timeline_events` + `booking_records` |
| `getBookingSlaState(...)` | لا تغيير (pure function) |
| `runPostTransitionAutomations(...)` | يُحدَّث في Phase 3.B |
| `recordBlockedTransitionEvent(...)` | يكتب على `booking_timeline_events` بدل `booking_events` |

---

## تأثير على الـ Frontend

الـ frontend يستدعي كل هذه الـ endpoints عبر `bookingsApi` في `apps/dashboard/src/lib/api.ts`.
**لا يتغير أي شيء في الـ frontend** — الـ HTTP contract محفوظ 100%.

التغيير الوحيد المرئي للـ frontend هو:
- `data[].eventDate` → الـ response يُعيد تسمية `startsAt` إلى `eventDate` في JSON ليبقى متوافقاً
- أو: نغير api.ts في الـ frontend ليستخدم `startsAt` (أنظف ولكن يتطلب frontend change)

**القرار المقترح:** نحتفظ بـ backward compat في response JSON (`eventDate` key) في Phase 3.A.
Phase 4 منفصل لتحديث الـ frontend.

---

## تغطية التستات الحالية (vs المطلوبة)

| نوع التست | الحالة | المطلوب |
|---|---|---|
| DB ops على `booking_records` | ✅ 43 تست | كافٍ للـ foundation |
| DB ops على engine tables | ✅ 15 تست | كافٍ |
| HTTP route handlers (GET) | ❌ 0 تست | مطلوب قبل 3.A.2 |
| HTTP route handlers (POST/PATCH) | ❌ 0 تست | مطلوب قبل 3.A.2 |
| booking-ops.ts functions على canonical | ❌ 0 تست | مطلوب قبل #8, #9 |

**ملاحظة:** بما أن Phase 3 تشترط TDD، سنكتب failing tests أولاً لكل endpoint.
الـ test strategy: inject test DB client في route handler (أو استخدام Hono's test client).

---

## مخاطر Phase 3.A

| الخطر | التقييم | التخفيف |
|---|---|---|
| Frontend breaks لو تغيير response shape | عالٍ | نحافظ على backward compat في JSON keys |
| `booking_records` يفتقد data من `bookings` | لا ينطبق | clean slate (لا مستخدمين) |
| Stats endpoints تعطي 0 بعد الـ switch | متوقع | طبيعي في clean slate |
| `booking-ops.ts` تكسر timeline/alerts | متوسط | نحدث في نفس الـ commit (step 8, 9) |
| Supply deduction تكسر في status update | منخفض | يبقى يقرأ من legacy `booking_consumptions` |

---

> **الحالة الحالية:** هذا المستند يغطي الجرد الكامل لـ STEP 3.A.1
> **الخطوة التالية:** انتظار موافقة `APPROVED - START 3.A.2`
