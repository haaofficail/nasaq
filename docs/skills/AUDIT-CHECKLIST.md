# قائمة فحص نسق للتسليم

## المشاكل الحرجة (Audit 4.8/10):
- [x] C1: Treasury TOCTOU — SELECT FOR UPDATE على كل عملية مالية
- [x] C2: Stay double-booking — unique constraint + transaction
- [x] C3: property.ts — 6 routes دفع بدون GL entry
- [x] C4: أرقام حجوزات مكررة — prefix حسب النوع (BK-SAL-, BK-HTL-, BK-RST-)
- [x] C5: Emoji في الكود — استبدال بأيقونات lucide
- [x] xlsx → exceljs (CVE ثغرات أمنية)
- [x] Moyasar webhook — التحقق من التوقيع

## فحص الترابط:
- [ ] حجز جديد → فاتورة تلقائية
- [ ] حجز بخدمة فيها مكونات → المخزون ينقص
- [ ] دفعة → GL يتحدّث
- [ ] OTP login يشتغل
- [ ] tenant isolation — ما أحد يشوف بيانات غيره

## فحص الصفحات:
- [ ] كل route في App.tsx يفتح صفحة فعلية
- [ ] كل زر فيه onClick يشتغل
- [ ] كل فورم يرسل للـ API صح
- [ ] "نسق" مو "ناسق" في كل مكان
- [ ] ما فيه أسماء فريق وهمية
- [ ] /s/:slug يحمّل ويعرض بيانات التاجر

## البناء:
- [ ] tsc --noEmit = 0 errors
- [ ] pnpm build = success
- [ ] pm2 restart = running
