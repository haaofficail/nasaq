# دستور ترميز OS — إلزامي في كل مهمة

ترميز OS = منصة Vendor OS متعددة المستأجرين (multi-tenant SaaS).
كل ميزة تبنيها لازم تتكامل مع النظام ككل — مو قطعة معزولة.

## قبل أي كود

1. اقرأ الملفات المتعلقة كاملة (schema, routes, pages, api.ts)
2. سجّل: ما الموجود؟ ما الناقص؟ ما يتعارض؟
3. ابحث في الويب عن أفضل الممارسات إذا المهمة فيها UX

## كل ميزة لازم تشمل

- **قاعدة البيانات**: جدول/أعمدة مع relations
- **API**: endpoints للداشبورد (orgId من السيشن) + endpoints للأدمن (role check)
- **داشبورد المنشأة**: صفحة/component مع رابط في الـ Sidebar
- **لوحة الأدمن**: الأدمن يقدر يشوف ويعدّل ويتحكم لكل المنشآت
- **النظام المالي**: أي عملية فيها فلوس → قيد مالي تلقائي، إلغاء → قيد عكسي
- **الصلاحيات**: super_admin (كل شي) / owner (منشأته) / manager (بدون حذف) / staff (محدود)

## أمن — بدون استثناء

- كل query فيها WHERE organization_id = orgId (من السيشن فقط)
- لا endpoint بدون فلتر منشأة (إلا الأدمن مع role check)

## لا تكسر الموجود

- لا تحذف جداول أو أعمدة أو routes أو صفحات
- أضف فقط — أو عدّل بعد ما تقرأ وتفهم
- قبل حذف ملف: grep عنه وتأكد ما أحد يستخدمه

## تصميم ترميز OS

- Tailwind فقط — لا inline styles
- IBM Plex Sans Arabic، لون brand: #5b9bd5
- rounded-2xl، border-gray-100، RTL
- لا emoji أبداً
- لا hardcoded arrays — كل dropdown من constants.ts أو API
- كل صفحة فيها: skeleton loading + error + empty state + data
- الفلسفة: "ذكي مرن متطور"
- الاسم دائماً "ترميز OS" — لا "نسق" ولا "ناسق"

## هوية الصفحات العامة — قرار دستوري

الصفحات العامة (PublicStorefrontPage وما شابهها) تحمل هوية ترميز OS بالكامل:

- **لون البراند الوحيد للهيكل**: `#5b9bd5` — يُشتق منه كل شيء
- **الخلفية**: `#F0F6FC` (brand @ 6% على أبيض)
- **السطح الثانوي**: `#E3EFF9` (brand @ 10%)
- **الحدود**: `#C9DDEF` (brand @ 22%)
- **النص الرئيسي**: `#0D2138` (navy عميق مشتق من البراند)
- **النص الثانوي**: `#2F6190` — **النص المبهم**: `#5289BE`
- **الظلال**: `rgba(91,155,213,...)` لا `rgba(0,0,0,...)`
- **شريط الهيدر العلوي**: دائماً `#5b9bd5` → `#3d84c8` (gradient ثابت للمنصة)
- **الـ inline styles مسموحة** في الصفحات العامة فقط (لأنها خارج Tailwind context)
- لون المنشأة `primaryColor` يُستخدم فقط لـ: زر "احجز"، السعر، ظل CTA — لا للهيكل

## Guardrails — قواعد الحماية المعمارية

- **لا كتابة مباشرة لـ DB** للبيانات التشغيلية — كل شيء عبر: API → Service → DB
- **الكابيليتيز**: استخدم `capability-service.ts` فقط — لا تكتب مباشرة في `organization_capability_overrides`
- **الصلاحيات**: استخدم `PUT /team/roles/:id/permissions` أو `permission-service.ts` — لا تكتب مباشرة في `role_permissions`
- **Seeding**: استخدم API simulation layer — لا تكتب مباشرة في جداول الأعمال
- **الاستثناءات المسموحة فقط**: migrations + `packages/db/seeds/reference/` + `scripts/repairs/`
- **Scanner**: `npx tsx scripts/architecture/scan-violations.ts` للكشف عن انتهاكات
- **Reference**: `docs/architecture/guardrails.md`

## قبل ما تقول خلصت

- npx tsc --noEmit = صفر أخطاء
- كل الصفحات القديمة تشتغل
- كل ميزة جديدة لها مقابل في الأدمن
- كل عملية مالية منعكسة في النظام المالي
- كل API فيه orgId filter + role check
