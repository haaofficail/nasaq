# الدرس: DB tests ليست اختيارية — هي آخر خط دفاع ضد silent bugs

## ما حدث

Phase 3.B.1 rename: bookingId → bookingRecordId

الـ commit الأصلي (2ff1b55):
- ✅ pnpm typecheck → zero errors
- ✅ 52 non-DB tests GREEN
- ❌ 105 canonical tests SKIPPED (TEST_DATABASE_URL ما كان مُفعّل)

أُعلنت Phase 3.B.1 "مكتملة" بناءً على 52/52.

## ما اكتُشف بعد تفعيل DB

157/157 بعد تشغيل DB كشف:
- log statements كانت تطبع `bookingId: "xxx"` بدل `bookingRecordId`
- typecheck ما رآها لأنها نصوص داخل structured logs
- unit tests ما رآها لأنها ما تتحقق من log output

الاحتاج commit إضافي (a774f0f) لإكمال الـ rename.

## لماذا الـ DB tests مختلفة

typecheck يرى types.
Unit tests ترى function outputs.
DB tests ترى كل السلوك التكاملي:
- ما يُكتب في DB فعلياً
- ما يُطبع في logs
- ما يمر في event queue
- ما يصل لـ downstream systems

## التكرار السابق

Phase 2: 58 tests SKIPPED لغياب TEST_DATABASE_URL → "false safety net"
Phase 2.5: أُصلح → 95/95 → اكتُشفت bugs حقيقية (Bug 1: FK mismatch، Bug 2: migrations).

نفس النمط عاد في Phase 3.B.1.

## القاعدة للمستقبل

قبل إعلان إكمال أي phase تلمس:
- routes
- interfaces
- schema
- logs

نفّذ:
1. تحقق من TEST_DATABASE_URL مُعَد
2. شغّل pnpm test كامل
3. تأكد من total count مطابق للتوقع (157 الآن)
4. أي "skipped" = توقف حتى الفهم

typecheck + non-DB tests = necessary but NOT sufficient.

## المؤشرات التي تستدعي الشك

| المؤشر | الفعل |
|---|---|
| رقم tests أقل من المتوقع | تحقق من skipped |
| "all green" بدون ذكر العدد الكلي | اطلب breakdown |
| commit ينجح بـ typecheck فقط | غير كافٍ للمراحل الحساسة |
| DB غير متصل | لا تُعلن إكمال |

## الربط بالدروس السابقة

- schema-comments-lie.md: "لا تثق بالتعليقات، افحص الـ schema"
- emergency-migration-requires-consultation.md: "الحل واضح ≠ الإذن ممنوح"
- db-tests-are-not-optional.md: "tests خضراء ≠ الكود سليم، إذا ما كانت DB مشغّلة"

ثلاثتها يحمي من نفس العائلة من الأخطاء: **الافتراض بدل التحقق**.
