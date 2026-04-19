# قواعد ترميز OS المعمارية — غير قابلة للتفاوض

## 1. قواعد الـ Schema

### لا تُضف أعمدة حالة يمكن اشتقاقها
قبل إضافة أي عمود `_status` أو `_id` يشير لعلاقة، اسأل:
- هل يمكن حسابه من جدول مرتبط عبر JOIN + helper؟
- إذا نعم → استخدم helper في `packages/api/src/lib/*-helpers.ts`
- إذا لا → اشرح السبب في وصف الـ PR قبل التنفيذ

### العلاقات المحمية (computed-only)
هذه العلاقات **ممنوع** تخزين حالتها في الجدول الأصل:
- bookings ↔ invoices (via invoices.bookingId)
- orders ↔ shipments (via shipments.orderId)
- employees ↔ attendance (via attendance.employeeId)
- customers ↔ bookings (via bookings.customerId)
- services ↔ reviews (via reviews.serviceId)

اشتق الحالة عند القراءة. لا تضف `invoice_id` أو `last_attendance_date` أو مشابه.

## 2. منع الكتابة المزدوجة

لا تكتب نفس المعلومة المنطقية في جدولين.
إذا احتجت sync بين جدولين → غالباً التصميم خطأ، أعد النظر.

## 3. Multi-tenant (حتمي)

كل query على DB **لازم** يتضمن `eq(table.orgId, orgId)`:
- في SELECT
- في JOINs (فلتر orgId على كل جدول)
- في UPDATE و DELETE
- لا استثناءات، حتى للـ admin queries

## 4. قبل اقتراح Migration

اسأل نفسك بالترتيب:
1. هل هذا عمود مشتق؟ → استخدم helper
2. هل هناك جدول مشابه فيه نفس الحاجة؟ → راجع قبل التكرار
3. هل الـ column ضروري للأداء فقط؟ → استخدم index، لا عمود مكرر

## 5. عند تنفيذ أمر بصيغة "STEP A, STEP B, STEP C..."

اتبع الخطوات بالترتيب الحرفي. إذا خطوة قالت "تحقق ولا تعدّل" — **لا تعدّل**.
لا تُفسّر "check database state" على أنها "apply migration".
لا تقترح أوامر ALTER TABLE للتنفيذ في rollback context.

## 6. Forbidden patterns (من ذاكرة المستخدم)

- Fake completion: "TypeScript passes ✓" ليست دليل نجاح
- Mock UIs delivered as final
- Scope creep: حل المشكلة المطلوبة فقط
- Undisclosed hacks: أي حل مختلف عن المطلوب لازم يُعلَن صراحة قبل التنفيذ

## 7. Verification Gates

بعد أي تغيير في DB أو route أو schema:
- `pnpm typecheck` ليس كافياً
- تحقق يدوي من المسار كاملاً: frontend → API → DB → response
- تحقق من orgId في DB مباشرة
- تحقق من سلوك الفشل (TOCTOU): ماذا لو فشل الاستدعاء الثاني؟

## 8. Payment Zone — منطقة الدفع (bookings, invoices, treasury, payments)

قواعد إضافية صارمة لكل ملف في هذه المنطقة:
- كل تعديل على ملف يتطلب **ACK صريح من المستخدم قبل str_replace**
- كل ادعاء اكتمال يتطلب عرض **diff فعلي + ناتج integration test**
- "typecheck passes" ليست verification — شغّل integration test
- إذا احتاج التغيير ملفين أو أكثر → قسّمه إلى commits متسلسلة منفصلة
