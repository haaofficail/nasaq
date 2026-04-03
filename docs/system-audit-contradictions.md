# تقرير التحقيق الشامل — نسق
**التاريخ:** 2026-04-02
**النطاق:** كامل المشروع (Dashboard + API + Shared + DB Schema)
**المدقق:** Claude Code (تحقيق آلي — بدون تعديل أي ملف)

---

## ملخص تنفيذي

| النوع | العدد |
|-------|-------|
| مشاكل حرجة 🔴 | 6 |
| مشاكل متوسطة 🟡 | 9 |
| مشاكل منخفضة 🟢 | 6 |
| **الإجمالي** | **21** |

---

## 1. مصادر القرار — من يتحكم بالـ Sidebar؟

### النتيجة: مصدران متعارضان

| المصدر | الوصف | هل يُستخدم فعلاً؟ |
|--------|--------|-------------------|
| `packages/shared/src/business-type-registry.ts` | يحتوي `sidebar: SidebarItem[]` لكل نوع نشاط (27 نوع) | **لا — غير مستخدم في Layout** |
| `apps/dashboard/src/lib/navigationRegistry.ts` | `NAV_REGISTRY` مبني على مجموعات + قدرات + خطة | **نعم — هو المصدر الفعلي** |
| `apps/dashboard/src/components/layout/Layout.tsx` | يستدعي `buildVisibleNav()` من `navigationRegistry` | — |

**الخلاصة:** `business-type-registry.ts` يعرّف `sidebar` لكل نوع لكن Layout.tsx يتجاهله تماماً ويعتمد حصراً على `navigationRegistry.ts`. هذا يعني أن جميع تعريفات الـ sidebar في الـ registry (1777 سطراً) هي كود ميت بالنسبة للـ sidebar الفعلي.

---

## 2. جدول الازدواجيات

### 2.1 ازدواجية تعريف الـ Sidebar

| العنصر | business-type-registry.ts | navigationRegistry.ts | التعارض |
|--------|--------------------------|----------------------|---------|
| "الحجوزات" | key: bookings, href: /dashboard/bookings | id: operations → bookings | **مكرر، منفصل** |
| "العملاء" | key: customers | العمليات → العملاء | **مكرر** |
| "المالية" | key: finance | الادارة → المالية | **مكرر** |
| "التقارير" | key: reports | النمو → التقارير | **مكرر** |
| "الفريق" | key: team | الادارة → الفريق | **مكرر** |
| "الإعدادات" | SETTINGS_ITEM | BOTTOM_NAV → الإعدادات | **مكرر** |

### 2.2 ازدواجية الـ Route لـ /inspections

في `packages/api/src/index.ts`:
```
app.route("/rental", rentalRouter);   // line 429
app.route("/inspections", rentalRouter); // line 439 — نفس الـ router!
```
/inspections و /rental يشيران لنفس الـ router، مما يعني نفس الـ endpoints مكشوفة تحت مسارين.

---

## المشاكل المرقّمة بالخطورة

---

### 🔴 [M-01] sidebar في business-type-registry مُعرَّف ولا يُستخدم

**الوصف:** `business-type-registry.ts` يحتوي `sidebar: SidebarItem[]` لكل نوع من 27 نوع. لكن `Layout.tsx` يعتمد فقط على `navigationRegistry.ts::buildVisibleNav()`. كل تعريفات sidebar في registry هي كود غير فعّال.

**الملفات المتأثرة:**
- `packages/shared/src/business-type-registry.ts` (lines 293–315, 349–360, 516–527...) — sidebar في كل نوع
- `apps/dashboard/src/components/layout/Layout.tsx:10` — يستورد من navigationRegistry فقط

**التأثير:** أي تعديل على sidebar في business-type-registry لن ينعكس على الواجهة. مطور يعدّل registry معتقداً أنه يغيّر الـ sidebar يُضيّع وقته.

**الحل المقترح:** إما (أ) حذف حقل `sidebar` من `BusinessConfig` وتوثيق أن navigationRegistry هو المصدر الوحيد، أو (ب) ربط Layout بـ registry وإزالة navigationRegistry.

---

### 🔴 [M-02] loyalty_stamps جدول غير موجود في schema

**الوصف:** `packages/api/src/routes/restaurant.ts` ينفذ raw SQL على جدول `loyalty_stamps` لكن هذا الجدول **غير موجود في أي ملف schema في packages/db/schema/**.

- `marketing.ts` يحتوي `loyaltyConfig` و `loyaltyTransactions` (بـ Drizzle ORM)
- `restaurant.ts` يستخدم raw SQL على `loyalty_stamps` — جدول مختلف تماماً

**الملفات المتأثرة:**
- `packages/api/src/routes/restaurant.ts:205,220,242,261,272` — raw SQL على loyalty_stamps
- `packages/db/schema/marketing.ts:117,142` — loyaltyConfig + loyaltyTransactions (جداول مختلفة)
- `apps/dashboard/src/pages/LoyaltyPage.tsx:38` — يستدعي restaurantApi.loyalty()

**التأثير:** صفحة الولاء `/dashboard/loyalty` تعتمد على جدول غير موجود في schema — إما أنه أُنشئ بـ raw migration غير موثقة، أو أن الـ API سيفشل في production.

**الحل المقترح:** إنشاء جدول `loyalty_stamps` في Drizzle schema أو توحيد الاستخدام مع `loyaltyTransactions` الموجود.

---

### 🔴 [M-03] LoyaltyPage مخفية من الـ Sidebar بالكامل

**الوصف:** صفحة الولاء `/dashboard/loyalty` موجودة في App.tsx (line 347) لكن لا يوجد أي رابط إليها في `navigationRegistry.ts`. لا يمكن الوصول إليها إلا بكتابة الرابط يدوياً.

**الملفات المتأثرة:**
- `apps/dashboard/src/App.tsx:347` — `<Route path="loyalty" element={<LoyaltyPage />} />`
- `apps/dashboard/src/lib/navigationRegistry.ts` — **غائبة تماماً**

**التأثير:** ميزة مدفوعة (سعر 1,190 ريال كـ addon في constants.ts) غير قابلة للوصول.

**الحل المقترح:** إضافة رابط loyalty في specialty_food أو في النمو مع `allowedBusinessTypes` للمطاعم والمقاهي.

---

### 🔴 [M-04] صفحات property كاملة بدون routes في App.tsx

**الوصف:** يوجد 28 صفحة في `apps/dashboard/src/pages/property/` لكن App.tsx لا يحتوي على أي route لـ `/dashboard/property/*`. navigationRegistry.ts يشير لروابط مثل `/dashboard/property/properties`، `/dashboard/property/units`، `/dashboard/property/tenants` وغيرها — كلها ستُعرض بـ 404 أو تُحوَّل لـ /dashboard.

**الملفات المتأثرة:**
- `apps/dashboard/src/pages/property/` — 28 ملف صفحة
- `apps/dashboard/src/App.tsx` — لا يوجد `<Route path="property/*" ...>`
- `apps/dashboard/src/lib/navigationRegistry.ts:246-258` — 13 رابط في specialty_property

**التأثير:** قطاع العقارات (real_estate) معطوب بالكامل. أي منشأة من نوع real_estate ستجد كل روابط الـ sidebar غير عاملة.

**الحل المقترح:** إضافة route `<Route path="property" ...>` مع sub-routes لجميع صفحات property في App.tsx.

---

### 🔴 [M-05] تناقض أنواع النشاط بين المصادر الثلاثة

**الوصف:** ثلاثة مصادر تعرّف أنواع النشاط بشكل مختلف:

| النوع | business-type-registry (27) | constants.ts (27) | helpers.ts (33) |
|-------|---------------------------|-------------------|-----------------|
| general | ✓ | ✓ | ✗ (لا يوجد default) |
| school | ✓ | ✓ | ✗ (لا يوجد default) |
| agency | ✗ | ✗ | ✓ |
| events_vendor | ✗ | ✗ | ✓ |
| store | ✗ | ✗ | ✓ |
| marketing | ✗ | ✗ | ✓ |
| medical | ✗ | ✗ | ✓ |
| education | ✗ | ✗ | ✓ |
| services | ✗ | ✗ | ✓ |
| other | ✗ | ✗ | ✓ |
| tailoring | ✗ | ✗ | في nav registry فقط |

**الملفات المتأثرة:**
- `packages/shared/src/business-type-registry.ts:12-39` — 27 نوع
- `apps/dashboard/src/lib/constants.ts:60-88` — 27 نوع
- `packages/api/src/lib/helpers.ts:121-155` — 33 نوع
- `apps/dashboard/src/lib/navigationRegistry.ts:102` — يشير لـ "tailoring" غير موجود في أي registry

**التأثير:** منشأة من نوع `agency` أو `medical` تحصل على capabilities افتراضية من helpers.ts لكن لا تحصل على terminology أو sidebar من business-type-registry (يُستخدم fallback إلى "general"). الأنواع المتعارضة تخلق تجربة مستخدم متذبذبة.

**الحل المقترح:** توحيد القوائم — اختر 27 نوعاً في registry وأضف نفسها لـ helpers.ts وأزل أو وثّق الأنواع الإضافية.

---

### 🔴 [M-06] POS يسحب من services بدلاً من menu للمطاعم

**الوصف:** `POSPage.tsx` يستدعي دائماً `servicesApi.list()` — لكن المطاعم والمقاهي تحتفظ ببياناتها في `/menu` (جدول catalog منفصل بتعريف FOOD_ITEM_FIELDS). هذا يعني أن كاشير المطعم لن يرى قائمة الطعام في شاشة POS إلا إذا كانت العناصر مُضافة أيضاً كـ services.

**الملفات المتأثرة:**
- `apps/dashboard/src/pages/POSPage.tsx:748` — `servicesApi.list({ status: "active", visibleInPOS: "true" })`
- `packages/api/src/index.ts:259` — `/menu` يتطلب capability "pos"

**التأثير:** ثغرة وظيفية للمطاعم — POS لا يعرض المنيو.

**الحل المقترح:** تعديل POSPage لاستدعاء `/menu` إذا كان `businessType` في `["restaurant", "cafe", "bakery", "catering"]`، وإلا يستخدم `/services`.

---

### 🟡 [M-07] مسار /inspections يشير لـ rentalRouter (ازدواجية)

**الوصف:** في `packages/api/src/index.ts`:
```
app.route("/rental", rentalRouter);      // line 429
app.route("/inspections", rentalRouter); // line 439
```
نفس الـ router مُسجَّل تحت مسارين مختلفين. هذا يعني أن جميع endpoints الـ rental قابلة للوصول تحت `/inspections/*` أيضاً.

**الملفات المتأثرة:**
- `packages/api/src/index.ts:429,439`

**التأثير:** ثغرة أمنية محتملة — API غير متوقعة مكشوفة. تضليل في الـ documentation.

**الحل المقترح:** إنشاء `inspectionsRouter` منفصل أو التحقق من أن rentalRouter يفلتر based on path.

---

### 🟡 [M-08] school في navigationRegistry لكن Layout.tsx يُحيل school مباشرةً

**الوصف:** `navigationRegistry.ts` يحتوي `specialty_school` مع 14 عنصر sidebar تشير لـ `/dashboard/school/*`. لكن Layout.tsx سطر 87 يُحيل حسابات school مباشرة لـ `/school/dashboard` قبل أن تُعرض أي navigation. النتيجة: الكود في specialty_school لا يُنفَّذ أبداً.

إضافة: بعض `/dashboard/school/behavior` و `/dashboard/school/subjects` و `/dashboard/school/setup` لا توجد لها redirects في App.tsx مما يعني عناصر nav ميتة إذا وصل إليها أحد.

**الملفات المتأثرة:**
- `apps/dashboard/src/lib/navigationRegistry.ts:290-315` — specialty_school items
- `apps/dashboard/src/components/layout/Layout.tsx:87` — redirect for school
- `apps/dashboard/src/App.tsx:384-396` — redirects school routes (ناقصة: behavior, subjects, setup)

**التأثير:** كود ميت + روابط معطوبة محتملة للـ school nav.

**الحل المقترح:** إما حذف specialty_school من navigationRegistry (لأنه لن يُستخدم أبداً من Layout)، أو إضافة الـ redirects الناقصة لـ behavior/subjects/setup في App.tsx.

---

### 🟡 [M-09] VAT_RATE مُعرَّف محلياً في POSPage (hardcoded)

**الوصف:** `POSPage.tsx:74` يعرّف `const VAT_RATE = 15` محلياً، بدلاً من استخدام `VAT_RATE` من `lib/constants.ts` أو من إعدادات المنشأة (`org.settings.vatRate`).

**الملفات المتأثرة:**
- `apps/dashboard/src/pages/POSPage.tsx:74,82,191,490,1206`
- `apps/dashboard/src/lib/constants.ts:5` — `export const VAT_RATE = 0.15`

**التأثير:** إذا تغيرت نسبة الضريبة لمنشأة معينة، POS لن يعكس ذلك. تناقض محاسبي.

**الحل المقترح:** استيراد VAT_RATE من constants.ts أو جلبها من org settings.

---

### 🟡 [M-10] صفحات ميتة — موجودة في src/pages/ بدون route

**الوصف:** أربع صفحات موجودة كملفات لكن لا تُستورد في App.tsx:

| الصفحة | الملف | ملاحظة |
|--------|-------|---------|
| EventQuotationsPage | `pages/EventQuotationsPage.tsx` (743 سطر) | لا route، لا import |
| OnboardingPage | `pages/OnboardingPage.tsx` | لا route (/onboarding يُحيل لـ /dashboard مباشرة) |
| ReportStubPages | `pages/ReportStubPages.tsx` | ملف stub بدون route واضح |
| ServicesPage | `pages/ServicesPage.tsx` | مُستورد داخل InventoryPage كـ embedded فقط |
| StorefrontPage | `pages/StorefrontPage.tsx` (869 سطر) | موجود لكن غير مستورد في App.tsx |

**الملفات المتأثرة:**
- `apps/dashboard/src/pages/EventQuotationsPage.tsx`
- `apps/dashboard/src/pages/OnboardingPage.tsx`
- `apps/dashboard/src/pages/StorefrontPage.tsx`
- `apps/dashboard/src/App.tsx:245` — `/onboarding` يُحيل لـ /dashboard

**التأثير:** كود ميت يزيد حجم الـ bundle ويُسبب تشتتاً للمطورين.

**الحل المقترح:** إما إضافة routes أو حذف الصفحات بعد التحقق من عدم الاستخدام.

---

### 🟡 [M-11] SuppliersPage مستورد كـ lazy import بدون route خاص

**الوصف:** `App.tsx:81` يستورد `SuppliersPage` كـ lazy import لكن لا يوجد `<Route path="suppliers" element={<SuppliersPage />} />`. Route `/suppliers` يُحيل لـ `/dashboard/inventory?tab=suppliers` (line 306). SuppliersPage مُستخدمة كـ embedded component داخل InventoryPage فقط.

**الملفات المتأثرة:**
- `apps/dashboard/src/App.tsx:81,306`

**التأثير:** lazy import غير ضروري يُثقّل الـ bundle parsing.

**الحل المقترح:** إزالة الـ lazy import من App.tsx لأن SuppliersPage تُستورد مباشرة في InventoryPage.

---

### 🟡 [M-12] جداول محاسبية بـ foreign keys بدون onDelete

**الوصف:** عشرات الـ foreign keys في schema/accounting.ts وschema/finance.ts وschema/bookings.ts بدون `{ onDelete: ... }`. هذا يعني حذف سجل مرتبط سيفشل (FK violation) بدون رسالة واضحة.

أبرز الأمثلة:
- `finance.ts:56-57` — bookingId و customerId بدون onDelete
- `finance.ts:162` — createdBy (users.id) بدون onDelete
- `accounting.ts:248` — periodId (accountingPeriods) بدون onDelete
- `bookings.ts:52` — customerId بدون onDelete
- `bookings.ts:134` — serviceId بدون onDelete

**الملفات المتأثرة:**
- `packages/db/schema/finance.ts:56,57,162,190,191,202,206,210`
- `packages/db/schema/accounting.ts:187,248,251,255,259,278,289,314,315,316,364`
- `packages/db/schema/bookings.ts:52,68,86,87,134,162,181,182,183`

**التأثير:** عمليات الحذف تفشل بـ FK violation. بيانات يتيمة عند حذف سجل أصل.

**الحل المقترح:** مراجعة كل FK وتحديد السلوك: `cascade` للأولاد الإلزاميين، `set null` للاختياريين، `restrict` للمحاسبية.

---

### 🟡 [M-13] نصوص ثابتة في صفحات يجب أن تكون من terminology

**الوصف:** 19 صفحة تحتوي نصوصاً عربية ثابتة (`"الخدمات"`, `"الحجوزات"`, `"العملاء"`, `"حجز جديد"`, `"مواعيد اليوم"`) يجب أن تأتي من `biz.terminology` لتدعم التعددية. فقط 9 ملفات تستخدم `useBusiness()` فعلياً.

أبرز الصفحات المتأثرة:
- `pages/BookingsPage.tsx` — يستخدم useBusiness ✓
- `pages/CatalogPage.tsx` — يستخدم useBusiness ✓
- `pages/CustomerDetailPage.tsx` — `"العملاء"` hardcoded
- `pages/MessagingSettingsPage.tsx` — نصوص ثابتة
- `pages/WebsitePage.tsx` — نصوص ثابتة
- `pages/MenuCategoriesPage.tsx` — `"الخدمات"` hardcoded

**الملفات المتأثرة:** 19 صفحة (انظر التفصيل في القسم 5 أعلاه).

**التأثير:** منشأة من نوع "صالون" ترى "الخدمات" لكن منشأة من نوع "مطعم" يجب أن ترى "قائمة الطعام" — هذا لا يعمل في الصفحات غير المحدّثة.

**الحل المقترح:** إضافة `const biz = useBusiness()` لكل صفحة وربط النصوص بـ `biz.terminology`.

---

### 🟡 [M-14] /menu يتطلب capability "pos" — تعارض للمطاعم التي لا تريد POS

**الوصف:** `packages/api/src/index.ts:259` يجعل `/menu/*` يتطلب `requireCapability("pos")`. لكن المطاعم قد تريد إدارة القائمة بدون تفعيل كاشير POS. MenuPage في الواجهة لا تتطلب هذا القيد نفسه.

**الملفات المتأثرة:**
- `packages/api/src/index.ts:259` — `app.use("/menu/*", requireCapability("pos"))`
- `packages/api/src/lib/helpers.ts:123-125` — restaurant/cafe/bakery يحصلون على capability "pos" تلقائياً

**التأثير:** منشأة مطعم تحتاج capability "pos" لمجرد عرض قائمة الطعام، حتى لو لا تستخدم POS.

**الحل المقترح:** تغيير الـ capability gate لـ `/menu` من "pos" إلى capability أنسب مثل "catalog" أو إنشاء capability مخصصة "menu".

---

### 🟢 [M-15] capabilities.ts — الجدول الوحيد بدون org_id

**الوصف:** `packages/db/schema/capabilities.ts` يحتوي جدول `capabilityRegistry` بدون `org_id`. هذا مقصود (بيانات مرجعية عالمية) لكن غير موثق بوضوح.

**الملفات المتأثرة:**
- `packages/db/schema/capabilities.ts:8-20`

**التأثير:** منخفض — مقصود لكن يحتاج تعليقاً.

**الحل المقترح:** إضافة تعليق يوضح أن الجدول global reference data وليس tenant data.

---

### 🟢 [M-16] SchoolRolesPage موجود بدون route

**الوصف:** `pages/school/SchoolRolesPage.tsx` موجود (يُصدّر `SchoolRolesPage`) لكن لا يُستورد في App.tsx ولا يوجد route له في `/school/*`.

**الملفات المتأثرة:**
- `apps/dashboard/src/pages/school/SchoolRolesPage.tsx`
- `apps/dashboard/src/App.tsx` — غير مُدرج

**التأثير:** ميزة RBAC للمدرسة غير قابلة للوصول.

**الحل المقترح:** إضافة route `<Route path="roles" element={<SchoolRolesPage />} />` في قسم `/school`.

---

### 🟢 [M-17] ملفات ضخمة تحتاج تقسيم

| الملف | الحجم | ملاحظة |
|-------|-------|---------|
| `lib/api.ts` | 2490 سطر | كل API calls في ملف واحد |
| `pages/WebsitePage.tsx` | 2484 سطر | صفحة ضخمة جداً |
| `pages/ServiceFormPage.tsx` | 1626 سطر | نموذج طويل جداً |
| `pages/POSPage.tsx` | 1385 سطر | قابل للتقسيم |
| `shared/business-type-registry.ts` | 1777 سطر | كل registry في ملف واحد |

**الملفات المتأثرة:** الملفات المذكورة أعلاه.

**التأثير:** صعوبة الصيانة، بطء في بناء TypeScript.

**الحل المقترح:** تقسيم api.ts لملفات per-domain، تقسيم WebsitePage لـ tabs/components.

---

### 🟢 [M-18] برنامج الولاء: نظامان متوازيان

**الوصف:** الولاء يُنفَّذ بطريقتين:
1. `packages/db/schema/marketing.ts` — `loyaltyConfig` + `loyaltyTransactions` (Drizzle ORM، نقاط رياضية)
2. `packages/api/src/routes/restaurant.ts` — `loyalty_stamps` (raw SQL، طابع/بطاقة)

كلاهما يخدم `LoyaltyPage.tsx` لكن عبر `restaurantApi.loyalty()` فقط.

**الملفات المتأثرة:**
- `packages/db/schema/marketing.ts:117-165`
- `packages/api/src/routes/restaurant.ts:193-280`
- `packages/api/src/routes/marketing.ts:318-341`
- `apps/dashboard/src/pages/LoyaltyPage.tsx`

**التأثير:** ازدواجية تُربك الصيانة. جدول loyalty_stamps خارج Drizzle schema يعني لا type-safety ولا migration tracking.

**الحل المقترح:** توحيد النظامين — إما استخدام loyaltyTransactions أو إضافة loyalty_stamps لـ Drizzle schema. إضافة LoyaltyPage للـ sidebar.

---

### 🟢 [M-19] "tailoring" في navigationRegistry غير موجود في registries الأخرى

**الوصف:** `navigationRegistry.ts:102` يشير لـ `allowedBusinessTypes: [..., "tailoring", ...]` لكن نوع "tailoring" غير موجود في `business-type-registry.ts` ولا في `constants.ts` ولا في DB organizations comment.

**الملفات المتأثرة:**
- `apps/dashboard/src/lib/navigationRegistry.ts:102`

**التأثير:** منشأة من نوع "tailoring" لن تُنشأ أبداً لكن الكود يستعد لها.

**الحل المقترح:** إضافة "tailoring" لكل القوائم أو إزالته من navigationRegistry.

---

### 🟢 [M-20] "general" و "school" بدون getBusinessDefaults في helpers.ts

**الوصف:** `getBusinessDefaults()` في helpers.ts لا يحتوي على مدخل لـ `general` أو `school`. هذا يعني أن منشأة جديدة من نوع "general" ستحصل على الـ fallback الافتراضي بدلاً من تهيئة مخصصة.

**الملفات المتأثرة:**
- `packages/api/src/lib/helpers.ts:121-161`

**التأثير:** منشأة عامة (general) تُنشأ بـ capabilities افتراضية بسيطة فقط.

**الحل المقترح:** إضافة مدخل explicit لـ "general" و "school" في getBusinessDefaults.

---

## توصيات مرتبة بالأولوية

### أولوية 1 — فورية (أسبوع واحد)
1. **[M-04]** إضافة routes لصفحات property في App.tsx (real_estate معطوب بالكامل)
2. **[M-02]** إضافة جدول `loyalty_stamps` لـ Drizzle schema أو توحيده مع loyaltyTransactions
3. **[M-06]** تعديل POSPage لسحب المنيو من `/menu` للمطاعم/المقاهي

### أولوية 2 — قصيرة المدى (أسبوعان)
4. **[M-01]** توثيق أن sidebar في business-type-registry غير مستخدم أو ربطه بـ Layout
5. **[M-03]** إضافة LoyaltyPage للـ sidebar في specialty_food
6. **[M-05]** توحيد قوائم أنواع النشاط في الثلاثة مصادر
7. **[M-07]** فصل inspectionsRouter عن rentalRouter

### أولوية 3 — متوسطة المدى (شهر)
8. **[M-08]** إضافة redirects الناقصة لـ school routes (behavior, subjects, setup)
9. **[M-09]** استخدام VAT_RATE من constants أو org settings في POSPage
10. **[M-12]** مراجعة وإضافة onDelete لـ foreign keys المفقودة
11. **[M-13]** توحيد النصوص العربية لاستخدام biz.terminology في الصفحات المتبقية

### أولوية 4 — صيانة مستمرة
12. **[M-10]** حذف أو توثيق الصفحات الميتة
13. **[M-11]** إزالة lazy import غير الضروري لـ SuppliersPage
14. **[M-14]** مراجعة capability gate لـ /menu
15. **[M-16]** إضافة route لـ SchoolRolesPage
16. **[M-17]** تقسيم الملفات الضخمة
17. **[M-18]** توحيد نظام الولاء
18. **[M-19]** حسم وضع نوع "tailoring"
19. **[M-20]** إضافة "general" و"school" لـ getBusinessDefaults
20. **[M-15]** توثيق capabilityRegistry كـ global reference

---

*تقرير آلي — جميع المسارات نسبية من جذر المشروع `/Users/thwany/Desktop/nasaq/`*
