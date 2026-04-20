# Phase 3.C Plan — Payments Schema & Moyasar Hardening

> **Status: PLAN ONLY — لا تنفيذ قبل موافقة Bander**

---

## الخلاصة التنفيذية

Phase 3.C تحتوي على **4 مشاكل مستقلة** مرتبة من الأعلى خطورة للأقل:

1. **Schema comment يكذب** (schema-comments-lie.md تكرار): `booking_records.bookingRef` يحمل FK حقيقي → `bookings.id` في الـ DB الفعلي — رغم أن الـ comment يقول "legacy tracking only — no FK"
2. **Webhook signature bug**: يُعيد serialize الـ JSON قبل التحقق، بدلاً من استخدام الـ raw body الأصلي
3. **payments.booking_id → bookings.id**: الجدول الرئيسي للمدفوعات مرتبط بـ legacy table
4. **booking_payment_links.payment_id**: plain UUID بلا FK — مكتوب في الـ schema comment "FK added in Phase 3"

---

## 1. نتائج Discovery (البيانات الخام من DB)

### FK constraints الفعلية المتعلقة بـ payments

```sql
-- من information_schema (verified على tarmiz_test):

payments_booking_id_bookings_id_fk
  payments.booking_id → bookings.id  (NOT NULL, hard FK)

payment_transactions_booking_id_bookings_id_fk
  payment_transactions.booking_id → bookings.id  (nullable)

booking_payment_links_booking_record_id_booking_records_id_fk
  booking_payment_links.booking_record_id → booking_records.id  ✓ canonical

-- booking_payment_links.payment_id = plain UUID (لا FK في DB)
```

### الاكتشاف الحرج: booking_records.bookingRef

```sql
-- \d booking_records — من DB مباشرة:
"booking_records_booking_ref_bookings_id_fk"
  FOREIGN KEY (booking_ref) REFERENCES bookings(id)
```

**Schema comment في canonical-bookings.ts السطر 278:**
```typescript
bookingRef: uuid("booking_ref"), // legacy tracking only — no FK
```

**هذا كذب.** الـ FK موجود في الـ DB. نفس النمط من `schema-comments-lie.md`.

لماذا لا يكسر هذا الكود الحالي؟ لأن canonical bookings تُسند `bookingRef = NULL`، وNULL لا يُنتهك FK. لكن أي INSERT مع `bookingRef = uuid_غير_موجود_في_bookings` سيفشل.

---

## 2. Discovery Commands المستخدمة

```bash
# payments table definition
grep -n "payments\|moyasar" packages/db/schema/ --include="*.ts"

# payments route: bookingId usage
grep -n "bookingId\|bookingRecordId" packages/api/src/routes/payments.ts

# webhook handler location
grep -n "webhook\|verify\|signature\|hmac" packages/api/src/routes/payments.ts

# FK الفعلية (DB مباشرة)
psql tarmiz_test -c "SELECT tc.constraint_name, tc.table_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND (tc.table_name LIKE '%payment%' OR ccu.table_name LIKE '%payment%')"

# تأكيد booking_records.bookingRef
psql tarmiz_test -c "\d booking_records" | grep -A2 "Foreign"
```

---

## 3. تفاصيل كل مشكلة

### المشكلة A: Schema comment يكذب على bookingRef

| الطبقة | الحالة |
|---|---|
| Schema code (canonical-bookings.ts:278) | يقول "no FK" |
| DB الفعلي | FK موجود: `booking_ref → bookings.id` |

**التأثير الحالي:** لا regression لأن canonical bookings تُسند `bookingRef = NULL`. لكن أي migration يعتمد على هذا الـ comment سيقع في نفس فخ Migration 147.

**القرار المطلوب:** هل نصحح الـ comment فقط، أم نقرر مستقبل هذا الـ FK؟

**خياران:**
- (أ) أصلح الـ comment فقط: "bookingRef → bookings.id — FK حقيقي، NULL لـ canonical"
- (ب) Migration يحذف FK (يتطلب approval — emergency rule)

### المشكلة B: Webhook signature bug

**الكود الحالي (payments.ts:331-344):**
```typescript
const body = await c.req.json();        // ← يُحوّل JSON إلى object
const rawBody = JSON.stringify(body);    // ← يُعيد serialize
const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
```

**المشكلة:** Moyasar يحسب الـ signature على الـ raw bytes الأصلية. إذا كان الـ JSON الوارد يحتوي spaces أو key ordering مختلف عن `JSON.stringify`، الـ signature لن يتطابق → رفض webhooks حقيقية، أو قبول webhooks مزورة.

**الحل الصحيح:**
```typescript
const rawBody = await c.req.text();     // ← raw bytes أولاً
const body = JSON.parse(rawBody);       // ← ثم parse
const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
```

**ملاحظة:** في Hono، `c.req.json()` و `c.req.text()` يستهلكان الـ stream مرة واحدة. يجب استخدام `text()` أولاً.

**التحقق:** نحتاج test vector من Moyasar docs للتأكد من format الـ signature.

### المشكلة C: payments.booking_id → bookings.id

`payments` جدول قديم مرتبط حصراً بـ `bookings.id` (legacy). الـ routes الحالية:
- `payments.ts:176` — يقبل `bookingId` في schema
- `payments.ts:216` — يُسند `bookingId: data.bookingId ?? null`
- `payments.ts:292` — يقرأ `tx.bookingId`

canonical bookings لا تستخدم `payments` — تستخدم `booking_payment_links` كجسر.

**القرار المطلوب:** هل نضيف `bookingRecordId` كعمود جديد في `payments`، أم نبقى على الوضع الحالي ونستخدم `booking_payment_links` حصراً لـ canonical؟

### المشكلة D: booking_payment_links.payment_id (plain UUID)

Schema comment يقول:
```typescript
paymentId: uuid("payment_id").notNull(), // FK to payments.id added in Phase 3 after payments moves to own schema
```

الـ DB الفعلي: لا FK. هذا intentional حتى الآن لأن `payments` لا يزال في `bookings.ts`.

**القرار المطلوب:** هل Phase 3.C هي وقت إضافة هذا الـ FK؟

---

## 4. Migration Strategy

**الأولوية القصوى: لا migration قبل approval صريح.**

| المشكلة | Migration مطلوب؟ | الحجم |
|---|---|---|
| A: schema comment كاذب | **تصحيح comment فقط** أو migration لحذف FK | صغير / خطير |
| B: webhook signature bug | لا migration — code fix فقط | آمن |
| C: payments.booking_id | migration إضافة عمود جديد | متوسط الخطورة |
| D: booking_payment_links.payment_id FK | migration إضافة FK constraint | متوسط الخطورة |

---

## 5. Approval Gates

| Gate | متى تتوقف | ما تطلبه |
|---|---|---|
| **G1** | قبل أي قرار على booking_records.bookingRef FK | عرض التحليل الكامل |
| **G2** | قبل Step 2 (webhook fix) | مراجعة test vectors من Moyasar docs |
| **G3** | قبل أي migration على payments table | تحليل + approval صريح |
| **G4** | قبل FK على booking_payment_links | تأكيد أن payments table جاهز |
| **G5** | قبل merge | 157+ tests GREEN مع DB |

---

## 6. Risks

### Risk 1: booking_records.bookingRef FK
**احتمال الكسر: عالٍ.** لو حذفنا FK وكان هناك legacy code يعتمد على CASCADE أو constraint enforcement، سيكسر silent.

**التخفيف:** لا تحذف — أصلح الـ comment فقط حتى قرار صريح.

### Risk 2: webhook signature — timing attack
**الكود الحالي يستخدم `!==` للمقارنة.** هذا عُرضة لـ timing attacks. الحل الصحيح: `crypto.timingSafeEqual()`.

### Risk 3: payments migration يكسر canonical flow
**الـ payments.booking_id FK إلى bookings.id.** لو أضفنا `bookingRecordId` كعمود، يجب التأكد أن existing routes لا تُسند الاثنين معاً.

---

## 7. Success Criteria

| Step | المعيار |
|---|---|
| Step 1 (هذا الملف) | approval صريح من Bander |
| Step 2 (webhook) | HMAC test vectors تمر، `timingSafeEqual` مُستخدَم |
| Step 3 (schema) | قرار موثّق، migration أو "no change" جاهز |
| Step 4 (bookingRef FK) | قرار موثّق بعد رؤية البيانات الكاملة |
| Final | 157+ tests GREEN مع DB، صفر skipped |

---

## الأسئلة المفتوحة قبل التنفيذ

1. **booking_records.bookingRef FK**: أصلح comment فقط أم migration لحذف FK؟
2. **payments.booking_id**: هل Phase 3.C هي وقت canonical migration لـ payments، أم نؤجل لـ Phase 3.D؟
3. **booking_payment_links.payment_id FK**: نضيف الآن أم ننتظر نقل payments schema؟
4. **webhook**: هل Moyasar يستخدم `x-moyasar-signature` بالفعل أم اسم header آخر؟

هذه الأسئلة تحتاج قرار قبل Step 2.
