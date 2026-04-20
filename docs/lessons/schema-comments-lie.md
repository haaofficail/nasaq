# الدرس: التعليقات في الكود قد تكذب

## ما حدث

في Phase 3.A.2 (TODO 5)، كان التعليق على حقل `bookingRef` في `canonical-bookings.ts` يقول:

```typescript
bookingRef: uuid("booking_ref") // legacy tracking only — no FK
```

بناءً على هذا التعليق، خُطّط لاستخدام `bookingRef` كـ soft link بين الجداول.

عند تنفيذ الاختبارات، فشل الـ INSERT بـ:

```
insert or update on table "booking_records" violates foreign key constraint
"booking_records_booking_ref_bookings_id_fk"
Key (booking_ref)=(uuid) is not present in table "bookings"
```

التعليق كان كاذباً. الحقل فعلاً له FK صلب إلى `bookings.id` (أُضيف في migration `0006_typical_lord_tyger.sql`).

## الدرس

**قبل بناء أي migration plan، تحقق من DB الفعلي — مش من التعليقات في الـ schema files.**

```bash
# الأمر الذي كان يجب تشغيله أولاً:
psql tarmiz_test -c "\d booking_records"
psql tarmiz_test -c "\d appointment_bookings"
# والنظر في الـ FOREIGN KEY CONSTRAINTS
```

## القاعدة

```
schema file comment  ≠  DB reality
\d table_name        =  الحقيقة
```

الـ schema files و Drizzle definitions قد تكون قديمة أو غير متزامنة مع الـ DB الفعلي بعد migrations متعاقبة.

## الإجراء الصحيح

قبل أي قرار معماري يعتمد على FK أو soft link:

1. `psql [db] -c "\d [table_name]"` — تحقق من الـ constraints الفعلية
2. `psql [db] -c "SELECT conname, contype FROM pg_constraint WHERE conrelid = '[table]'::regclass"` — للتأكيد
3. فقط بعد التحقق → خطّط للـ migration

## ما كان يجب يحدث إذا اكتُشف الـ FK أثناء التنفيذ

**وقف + إبلاغ Bander** قبل إنشاء migration جديد.
النية الصحيحة ≠ إجراء صحيح.
