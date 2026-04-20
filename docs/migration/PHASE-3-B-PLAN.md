# Phase 3.B Plan — Workflow Engine + Pipeline Stages

> **Status: PLAN ONLY — لا تنفيذ قبل موافقة Bander**

---

## الخلاصة التنفيذية

Phase 3.B مختلفة جوهرياً عن Phase 3.A: **workflow-engine.ts لا يحتاج migration**.
الـ engine نفسه pure functions + DB loader واحد (`getWorkflowStagesForOrg`) يعمل على `booking_pipeline_stages` — هذا الجدول لا علاقة له بـ `bookings.id` ولا `booking_records.id`. هو linked إلى `organizations.id` فقط.

المشكلة الفعلية أصغر مما تبدو: `booking-ops.ts` يستخدم `bookingId` كـ alias لـ `bookingRecordId` — الاسم مضلل لكن الـ field الفعلي هو `bookingTimelineEvents.bookingRecordId` (الجدول الكانونيكي).

---

## 1. Scope Exact

### workflow-engine.ts

**لا يحتاج تغيير وظيفياً.** الملف:
- `canTransition` — pure function، لا DB، لا FK
- `getWorkflowStagesForOrg` — يقرأ `booking_pipeline_stages` حيث `orgId` فقط
- `resolveWorkflowExecutionMode` — pure، لا DB
- `evaluateAutoTransitions` / `getStageEntryTemplate` — يقرأ stages فقط، لا يكتب

**التغيير الوحيد المطلوب:** تنظيف تعليق في السطر 21 من `booking-ops.ts` الذي يقول `// Source of truth للحوادث: booking_events table (bookingId-scoped)` — هذا وصف قديم. المصدر الفعلي الآن هو `bookingTimelineEvents`.

### booking_pipeline_stages (schema)

**لا يحتاج migration.** الجدول:
```
id, orgId (FK → organizations), name, sortOrder,
mappedStatus, isSkippable, isTerminal, autoTransitionCondition,
maxDurationHours, notificationTemplate, isDefault, createdAt
```

لا FK إلى `bookings.id` أو `booking_records.id` — الـ pipeline stages هي config للـ org، لا data للحجوزات. **لا migration مطلوب.**

### booking-ops.ts

الملف يستخدم `bookingId` كاسم parameter في:
- `getBookingTimeline(bookingId)` — يقرأ `bookingTimelineEvents` (canonical)
- `getBookingSlaState(bookingId)` — يقرأ `bookingTimelineEvents` (canonical)
- `runPostTransitionAutomations({ bookingId })` — يكتب `bookingTimelineEvents` (canonical)
- `recordBlockedTransitionEvent({ bookingId })` — يكتب `bookingTimelineEvents` (canonical)

**المشكلة:** اسم `bookingId` في interfaces مضلل — يوحي بـ `bookings.id` لكنه فعلياً `booking_records.id`. لا bug وظيفي، لكن الكود غير واضح.

**التغيير المقترح:** إعادة تسمية `bookingId` → `bookingRecordId` في interfaces + تعليقات `booking-ops.ts`.

### ملفات أخرى تتأثر

| الملف | كيف يتأثر |
|---|---|
| `routes/bookings.ts` | يستدعي `getWorkflowStagesForOrg` + `canTransition` (سطر 967-1000 وسطر 1688) — لا تغيير مطلوب، يعمل صح |
| `routes/settings.ts` (سطر 368) | يُنشئ default pipeline stages عند إنشاء org — لا تغيير مطلوب |
| `routes/auth.ts` (سطر 191) | يُنشئ default pipeline stages عند signup — لا تغيير مطلوب |
| `routes/admin.ts` (سطر 1478) | يُنشئ default pipeline stages — لا تغيير مطلوب |
| `__tests__/workflow-engine.test.ts` | 50 اختبار، جميعها على pure functions — لا تأثير |
| `__tests__/booking-ops.test.ts` | قد يحتاج تحديث أسماء parameters بعد الـ rename |

---

## 2. Dependencies Discovery (نتائج الـ grep)

### من يستخدم bookingPipelineStages؟
```
workflow-engine.ts:242   — getWorkflowStagesForOrg (SELECT)
routes/settings.ts:368   — INSERT default stages عند إنشاء org
routes/auth.ts:192       — INSERT default stages عند signup
routes/admin.ts:1478     — INSERT default stages (admin)
routes/bookings.ts:14    — import فقط (مستخدم عبر workflow-engine)
```

### من يستدعي workflow-engine functions؟
```
routes/bookings.ts:967   — getWorkflowStagesForOrg + resolveWorkflowExecutionMode + canTransition
routes/bookings.ts:1688  — getWorkflowStagesForOrg (reschedule)
booking-ops.ts:515       — getWorkflowStagesForOrg (في listOperationalAlerts)
```

### هل أي منها له FK إلى bookings.id؟
**لا.** `booking_pipeline_stages` له FK واحد فقط: `org_id → organizations.id`. لا يوجد أي ربط بـ `bookings.id` أو `booking_records.id`.

---

## 3. Migration Strategy

**لا migration مطلوب.**

`booking_pipeline_stages` لا يحتوي على أي مرجع لـ legacy `bookings` table. الـ schema حالياً سليم تماماً للـ canonical path.

إذا ظهر أثناء التنفيذ سبب لـ migration → **STOP وأبلغ Bander** (درس `emergency-migration-requires-consultation.md`).

---

## 4. Test Strategy

### الاختبارات الموجودة التي ستتأثر

| Suite | Tests | التأثير المتوقع |
|---|---|---|
| `workflow-engine.test.ts` | 50 | لا تأثير — pure functions |
| `booking-ops.test.ts` | موجود | قد يحتاج تحديث أسماء params بعد rename |

### الاختبارات الجديدة المطلوبة

**التغيير الوحيد الفعلي هو rename `bookingId` → `bookingRecordId` في `booking-ops.ts` interfaces.**

اختبارات جديدة:
1. `getBookingTimeline(bookingRecordId)` — يعيد events مرتبة بـ canonical booking_record
2. `getBookingSlaState(bookingRecordId)` — يحسب SLA صح من bookingTimelineEvents
3. تأكيد: `listOperationalAlerts` يستدعي workflow stages بـ orgId الصحيح

**Coverage target:** الـ 50 اختبار الموجودة + 3 جديدة = **53 minimum**، كلها GREEN قبل merge.

---

## 5. Risks

### Risk 1: rename يكسر استدعاءات hidden
**احتمال: متوسط.** إذا كان هناك كود خارج `booking-ops.ts` يمرر `bookingId` by name (destructuring)، سيكسر بعد الـ rename.

**التخفيف:** `grep -rn "bookingId:" packages/api/src` قبل أي تغيير — نتحقق من كل استدعاء.

### Risk 2: workflow-engine.test.ts يفشل بعد تغيير تعليق
**احتمال: منخفض جداً.** التعليقات لا تؤثر على runtime. لكن إذا كان أي test يعتمد على string matching لرسائل error → يتأثر.

**التخفيف:** اقرأ الـ 50 test قبل تغيير أي رسالة.

### Risk 3: الـ rename يظهر inconsistency في `booking-ops.ts` external API
**احتمال: متوسط.** `booking-ops.ts` يُصدِّر functions — أي caller خارجي يمرر `{ bookingId: x }` سيحتاج تحديث.

**التخفيف:** الـ rename يكون في TypeScript interface فقط. الاستراتيجية الآمنة: إضافة `bookingRecordId` كـ alias أولاً، deprecate `bookingId`، ثم حذفه في خطوة منفصلة.

---

## 6. Approval Gates

| نقطة | متى تتوقف | ما تطلبه |
|---|---|---|
| **G1** | قبل أي rename في `booking-ops.ts` | عرض grep كامل لكل استخدام `bookingId` في الـ codebase |
| **G2** | إذا ظهرت حاجة لـ migration جديد | تحليل كامل + approval صريح (emergency-migration rule) |
| **G3** | إذا فشل أي test من الـ 50 الموجودة | عرض الفشل وسببه قبل أي fix |
| **G4** | قبل merge | عرض نتيجة `pnpm test` كاملة |

---

## 7. Success Criteria

Phase 3.B مكتملة إذا:

1. `npx tsc --noEmit` — صفر أخطاء جديدة
2. 53+ tests GREEN (50 موجودة + 3 جديدة)
3. `booking-ops.ts` لا يحتوي `bookingId` بالمعنى الـ legacy في أي interface exported
4. تعليق `// Source of truth: booking_events` محذوف أو مصحح
5. لا migration جديد أُضيف (أو إذا أُضيف: بعد approval صريح من Bander)

**الاختبار الحاسم:** `getWorkflowStagesForOrg` تُستدعى في `PATCH /:id/status` وتُرجع stages صحيحة لـ canonical booking → status transition يعمل → `booking_timeline_events` تُكتب → لا regression في 142 test الموجودة.

---

## ملخص

| جانب | التقييم |
|---|---|
| حجم التغيير | صغير جداً — rename + تنظيف تعليقات |
| migration مطلوب | لا |
| خطر كسر production | منخفض |
| tests جديدة | 3 |
| وقت متوقع | 30-45 دقيقة |

**السؤال قبل التنفيذ:** هل تريد rename `bookingId` → `bookingRecordId` في `booking-ops.ts`، أم تكتفي بتصحيح التعليقات فقط؟ هذا يحدد نطاق Phase 3.B بدقة.
