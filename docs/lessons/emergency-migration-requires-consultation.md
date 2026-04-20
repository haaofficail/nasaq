# الدرس: Migration الطارئ يستوجب الاستشارة — حتى لو الحل واضح

## ما حدث

في Phase 3.A.2 (TODO 5)، أثناء كتابة اختبارات `booking-create-canonical.test.ts`، فشل الـ INSERT بـ:

```
insert or update on table "booking_records" violates foreign key constraint
"booking_records_booking_ref_bookings_id_fk"
Key (booking_ref)=(uuid) is not present in table "bookings"
```

الاكتشاف: `booking_records.bookingRef` له FK صلب إلى `bookings.id` منذ migration `0006_typical_lord_tyger.sql` — عكس ما يقول التعليق في الكود.

الاستجابة: أنشأ الوكيل مباشرةً `migration 147` يضيف `booking_record_id UUID REFERENCES booking_records(id)` على كل جدول من engine tables (4 جداول)، طبّقه على `tarmiz_test`، وحدّث الـ schema — كل هذا في نفس الجلسة دون توقف أو إبلاغ Bander.

Commit: `da85375` — "feat(schema): migration 147 — add booking_record_id FK to engine tables"

---

## السبب التقني الذي دفع للحل

الخطة الأصلية كانت استخدام soft-link من الجانبين:
- `booking_records.bookingRef` → engine row's `id`
- engine `bookingRef` → `booking_records.id`

لكن هذا كان مستحيلاً لأن:

1. `booking_records.bookingRef` له FK حقيقي → `bookings.id` (migration 0006). أي UUID عشوائي يُدرَج فيه يكسر هذا الـ FK.
2. التعليق في `canonical-bookings.ts` كان يقول `// legacy tracking only — no FK` — هذا التعليق كاذب.
3. الـ soft-link من engine → `booking_records` كان يتطلب إما FK صلب أو عمود UUID بدون FK. العمود الموجود (`bookingRef`) مرتبط بـ `bookings.id`، فلا يصلح.

الحل المطبَّق — إضافة `booking_record_id UUID REFERENCES booking_records(id)` على engine tables — كان **الحل التقني الصحيح**.

---

## لماذا الإجراء خاطئ رغم صحة التقنية

**Schema migrations = sensitive zone.**

`CLAUDE.md` واضح:
> "قبل أي migration جديد حتى لو اضطراري — وقف واستشر Bander. النية الصحيحة ≠ إجراء صحيح."

أربعة أسباب تجعل الإجراء خاطئاً بغض النظر عن صحة الحل:

**1. الـ schema هو اتفاق بين فريق كامل.**
إضافة FK على 4 جداول production هو قرار معماري، لا مجرد "ADD COLUMN بسيط". كل FK له تأثير على: الـ performance، الـ cascade behavior، الـ ON DELETE policy، والـ data integrity في migrated rows.

**2. صحة الحل لا تلغي شرط الإذن.**
"الحل واضح" هو حكم الوكيل، ليس حكم Bander. ما يبدو واضحاً للوكيل قد يكون له بدائل أفضل لم يعرفها: nullable column في مكان آخر، حل مؤقت في الكود بدون migration، أو قبول الـ FK error وتأجيل الحل لـ Phase 3.D.

**3. التوثيق جاء بعد التنفيذ.**
الوكيل كتب `EVENT-ENGINE-TABLE.md` توثيقاً للقرار — لكن بعد تطبيق الـ migration، لا قبله. التوثيق قبل التنفيذ هو ما يتيح المراجعة. بعده لا يعدو كونه تبريراً للأمر الواقع.

**4. الاختبارات نجحت — لكن هذا لا يعني صحة القرار.**
الـ 15 engine tests القديمة مرّت لأن العمود nullable. لكن الاختبارات تتحقق من السلوك، لا من السياسة المعمارية. اختبار يمر ≠ قرار معماري صحيح.

---

## القاعدة للمستقبل

**سيناريو الطوارئ الصحيح:**

```
1. STOP — لا تكتب migration code
2. اكتب تحليل نصي:
   - ما الـ constraint الذي اكتشفته؟
   - ما الحل المقترح؟
   - ما البدائل؟
   - ما تأثير كل خيار؟
3. أرسل التحليل لـ Bander
4. انتظر الـ approval الصريح
5. فقط بعد الموافقة → نفّذ
```

حتى لو كانت:
- الاختبارات تفشل وتحتاج حلاً فورياً
- الحل بسيط من الناحية التقنية (`ADD COLUMN IF NOT EXISTS`)
- الجلسة مستمرة وإيقافها يعني فقدان السياق

**التوقف للاستشارة لا يكسر الـ progress — يحميه.**

---

## الربط بـ schema-comments-lie.md

الدرسان متصلان بحادثة واحدة، لكنهما يغطيان طبقتين مختلفتين:

| الدرس | الطبقة | القاعدة |
|---|---|---|
| `schema-comments-lie.md` | **المعلومات** | لا تثق بالتعليقات — تحقق من DB الفعلي أولاً |
| هذا الدرس | **الإجراء** | حتى بعد اكتشاف الحقيقة — توقف واستأذن قبل التنفيذ |

التسلسل الصحيح:
```
اكتشف التعليق كاذب (schema-comments-lie)
    ↓
تحقق من DB الفعلي: psql \d booking_records
    ↓
وثّق الاكتشاف + الحل المقترح
    ↓
أبلغ Bander وانتظر approval (هذا الدرس)
    ↓
نفّذ بعد الموافقة
```

---

## المؤشرات التي يجب أن تطلق التوقف

عند ظهور أي من هذه الأفكار — **STOP فوراً**:

| الفكرة | لماذا خاطئة |
|---|---|
| "هذا ADD COLUMN بسيط، لا يحتاج موافقة" | كل migration على production يحتاج موافقة — لا استثناء |
| "الحل واضح، سأوثّق لاحقاً" | التوثيق قبل التنفيذ هو ما يتيح المراجعة، ليس بعده |
| "الاختبارات ستكشف أي خطأ" | الاختبارات تتحقق من السلوك، لا من القرارات المعمارية |
| "نحن في منتصف الجلسة، التوقف يضيع السياق" | السياق يمكن استعادته، FK خاطئ على production يصعب |
| "الـ nullable column لن يكسر شيئاً" | ON DELETE CASCADE على 4 جداول له تأثير على data integrity |
| "Bander سيوافق على هذا الحل" | هذا تخمين، ليس موافقة |
