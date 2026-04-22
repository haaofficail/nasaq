# Phase 3.C Final Report — Payments Schema & Moyasar Hardening

**Branch:** `refactor/phase-3-big-switch`
**Period:** 2026-04-20 → 2026-04-22
**Status:** COMPLETE

---

## ما أُنجز

### المشكلة A — Schema comment يكذب على bookingRef

`canonical-bookings.ts:278` كان يقول `// legacy tracking only — no FK` لكن الـ DB يحتوي FK حقيقي:

```
booking_records_booking_ref_bookings_id_fk
  FOREIGN KEY (booking_ref) REFERENCES bookings(id)
```

**الحل:** تصحيح الـ comment فقط — لا migration. الكود الحالي يُسند `bookingRef = NULL` فلا regression. حذف الـ FK مؤجّل لـ Phase 3.D.

### المشكلة B — Webhook signature bugs (4 bugs)

الكود القديم كان:
1. يُعيد serialize الـ JSON عبر `JSON.stringify(await c.req.json())` → signature mismatch
2. يستخدم `!==` للمقارنة → timing attack vulnerability
3. يستورد `createHmac` ديناميكياً عبر `await import("crypto")` → غير ضروري
4. يُعيد `200 OK` عند فشل المعالجة → Moyasar لا يُعيد المحاولة

**الحل:**
- `verifyMoyasarSignature()` في `packages/api/src/lib/moyasar-webhook.ts` — pure function بـ `timingSafeEqual`
- `c.req.text()` أولاً ثم `JSON.parse()` — raw body محفوظ
- Feature flag `MOYASAR_WEBHOOK_VERIFICATION` (log | strict | disabled)
- `500` عند فشل المعالجة → Moyasar يُعيد المحاولة (6 مرات)

### Migration 149 — إصلاح SQL

Migration 149 (من وكيل موازٍ) احتوى على `DELETE FROM capability_registry` و `INSERT INTO capability_audit_log` بأعمدة خاطئة. تم التحقق من الـ DB: مفاتيح `storefront`/`website` لم تكن موجودة قط → حُذف الكود الخاطئ.

---

## قائمة الـ Commits

| Hash | التاريخ | الوصف |
|---|---|---|
| `4d049be` | 2026-04-20 | feat(moyasar): verifyMoyasarSignature — HMAC-SHA256 + timingSafeEqual |
| `f308e89` | 2026-04-20 | fix(migration): correct migration 149 SQL — remove capability_registry logic |
| `2edd9de` | 2026-04-20 | feat: route integration + feature flag + webhook handler rewrite |
| `2bcaa3b` | 2026-04-22 | test(moyasar): webhook route integration tests — 6 scenarios |
| `d40c91d` | 2026-04-22 | docs(schema): fix misleading FK comments — bookingRef still has legacy FK |
| `62a2948` | 2026-04-22 | docs(ops): Moyasar webhook verification rollout plan |

**ملاحظة:** `2edd9de` commit مختلط (Moyasar fix + storefront unification + Phase 3.C docs). مقبول لأن المحتوى صحيح ولأن revert يُعيد عمل ضخم.

---

## Test Coverage

| ملف | عدد الاختبارات |
|---|---|
| `moyasar-webhook.test.ts` | 6 (pure function — TDD) |
| `moyasar-webhook-route.test.ts` | 6 (route integration — 6 scenarios) |

**النتيجة:** 169/169 GREEN

---

## الخطوات المتبقية

### 1. Deployment (فوري)

```bash
# في production env:
MOYASAR_WEBHOOK_SECRET=<shared_secret_from_moyasar_dashboard>
MOYASAR_WEBHOOK_VERIFICATION=log
```

- `MOYASAR_WEBHOOK_SECRET`: نسخ من Moyasar dashboard → Webhooks → shared_secret
- تطبيق migration 149 على production DB (إذا لم يُطبَّق بعد)

### 2. Monitoring — 7 أيام في log mode

```bash
grep "moyasar_webhook_received" <production-logs> | jq '{isValid, mode, hasSignature}'
```

**Gate للانتقال لـ strict:**
- 7 أيام متتالية بـ `isValid: true` على كل webhook موقّع
- صفر أخطاء `moyasar_webhook_processing_failed`

الخطة الكاملة: `docs/operations/MOYASAR-WEBHOOK-ROLLOUT.md`

### 3. Switch to strict (بعد 7 أيام)

```
MOYASAR_WEBHOOK_VERIFICATION=strict
```

---

## Phase 3.D — Dependencies & Gotchas

### المهام المؤجّلة

| المهمة | السبب |
|---|---|
| حذف `booking_records.bookingRef` FK | requires migration + verification أن لا كود يُسند non-NULL |
| إضافة `payments.bookingRecordId` عمود | canonical payments يحتاج ربط بـ `booking_records` لا `bookings` |
| إضافة `booking_payment_links.payment_id` FK | يتطلب أن `payments` ينتقل لـ schema منفصل أولاً |

### Gotchas حرجة

**1. `booking_records.bookingRef` — FK لا يزال موجوداً**

```sql
-- DB الفعلي:
FOREIGN KEY (booking_ref) REFERENCES bookings(id)
```

الكود الحالي يُسند `bookingRef = NULL` فلا regression. لكن أي migration يحاول INSERT بـ `bookingRef = uuid_عشوائي` سيفشل بـ FK violation. تحقق من DB قبل أي تعديل:

```bash
psql tarmiz_test -c "\d booking_records"
```

**2. `payments.booking_id` — hard FK إلى `bookings.id`**

```
payments_booking_id_bookings_id_fk
  payments.booking_id → bookings.id  (NOT NULL)
```

Canonical bookings تستخدم `booking_payment_links` كجسر — لا تكتب مباشرة في `payments.bookingId`. لكن إضافة `bookingRecordId` كعمود جديد في `payments` يتطلب:
- migration `ADD COLUMN booking_record_id UUID REFERENCES booking_records(id)` — nullable
- تحديث `processMoyasarPayment()` لتُسند `bookingRecordId` من `booking_payment_links`

**3. `payment_transactions.booking_id` → `bookings.id` — nullable**

```
payment_transactions_booking_id_bookings_id_fk
  payment_transactions.booking_id → bookings.id  (nullable)
```

لا يكسر شيئاً الآن لأنه nullable، لكن يُشير لنفس المشكلة: تحتاج لاحقاً ربط بـ `booking_records` لا `bookings`.

**4. لا test vectors من Moyasar**

Moyasar لا تُوفّر test vectors رسمية لـ HMAC-SHA256. تم اختيار log mode كـ default لهذا السبب — للتحقق من الـ format قبل enforcement. إذا ظهرت `isValid: false` في production على webhooks حقيقية، راجع:
- هل Moyasar يُرسل الـ raw bytes أم encoded format؟
- هل الـ header اسمه `x-moyasar-signature` بالضبط؟ (تحقق من logs: `hasSignature: false` = header مختلف)

**5. Emergency migration rule**

أي migration في Phase 3.D يتطلب approval صريح قبل التنفيذ — بغض النظر عن بساطته.
Reference: `docs/lessons/emergency-migration-requires-consultation.md`

---

## ملفات مرجعية

| الملف | الوصف |
|---|---|
| `packages/api/src/lib/moyasar-webhook.ts` | pure function للتحقق من signature |
| `packages/api/src/routes/payments.ts:332` | webhook handler مع feature flag |
| `docs/operations/MOYASAR-WEBHOOK-ROLLOUT.md` | خطة الـ rollout |
| `docs/migration/PHASE-3-C-PLAN.md` | الخطة الأصلية مع discovery results |
| `docs/lessons/emergency-migration-requires-consultation.md` | قاعدة الـ migrations |
| `docs/lessons/schema-comments-lie.md` | قاعدة التحقق من DB قبل الاعتماد على comments |
