# Legacy Autonomous Audit — ترميز OS Dashboard
**التاريخ:** 2026-04-23  
**المنهجية:** Autonomous Legacy Cleanup Program — Safe Execution Only  
**النطاق:** `apps/dashboard/src/` (routes, pages, navigation, flows)  

---

## 1. Executive Summary

| المنطقة | الحالة |
|---------|--------|
| إجمالي routes مسجلة | ~180 route |
| إجمالي ملفات pages | 154 ملف .tsx |
| مناطق التلوث الرئيسية | Route duplication · Dead redirects · Orphaned files |
| source of truth غير واضح | `/dashboard/orders` vs `/dashboard/online-orders` |
| أعلى مخاطر صيانة | تعارض routes customization/platform (double-registration) |

**أكثر المناطق تعرضاً للمخاطر:**
- تعارض مزدوج لـ `customization` و`platform` (مسجلان مرتين — مرة كصفحة ومرة كـ redirect — الأولى تفوز دائماً، الثانية لا تُنفَّذ أبداً)
- تقسيم الطلبات بين `/orders` و`/online-orders` في نقاط مختلفة من التطبيق
- ملف `property/ContractDetailPage.tsx` موجود دون أي import أو route

**أكثر المناطق ازدواجية:**
- Landing page: ثلاثة routes لنفس المكون
- Online orders: مسارين لنفس الصفحة، كلاهما مرجَع في أجزاء مختلفة

**source of truth واضح:**
- Service creation → `ServiceCreateWizard` (/services/wizard) هو الـ canonical
- Service editing → `ServiceFormPage` (/services/:id/edit) مقصود وليس تكراراً
- Page builder → `PagesV2Page` (/pages-v2) هو الـ canonical
- School system → `/school/*` هو الـ canonical (القديم /dashboard/school/* يُعيد التوجيه)

**source of truth غير واضح:**
- `/dashboard/orders` vs `/dashboard/online-orders` — كلاهما مُرجَع في أماكن مختلفة

---

## 2. Canonical Ownership Map

| Business Capability | Canonical Flow | Alternatives / Legacy | Confidence | Recommendation |
|--------------------|---------------|----------------------|------------|----------------|
| Service creation | `/services/wizard` → ServiceCreateWizard | ~~`/services/new`~~ (محذوف) | عالية | مكتمل |
| Service editing | `/services/:id/edit` → ServiceFormPage | لا يوجد تكرار | عالية | لا إجراء |
| Page builder | `/pages-v2` → PagesV2Page | `/storefront`, `/website`, `/settings/website` (redirects) | عالية | الـ redirects ضرورية (مُرجَعة) |
| Online orders | `/online-orders` + `/orders` | كلاهما نشط | منخفضة | قرار منتج مطلوب |
| School system | `/school/*` | `/dashboard/school/*` (redirects) | عالية | الـ redirects ضرورية |
| Customization settings | `/customization` → CustomizationPage | redirect في السطر 511 (ميت) | متوسطة | حذف السطر 511 |
| Platform/integrations | `/platform` → PlatformPage | redirect في السطر 512 (ميت) | متوسطة | حذف السطر 512 |
| QR flow | modal في DashboardPage | ~~link إلى pages-v2~~ (مُصلَح) | عالية | مكتمل |

---

## 3. Route Inventory (المختصر — البنود المثيرة للقلق فقط)

| Route/Path | Component | Status | Notes |
|-----------|-----------|--------|-------|
| `/` | LandingPage | canonical | ✓ |
| `/home` | LandingPage | **VERIFIED_DEAD** | لا مرجع في الكود |
| `/landing` | LandingPage | **VERIFIED_DEAD** | لا مرجع في الكود |
| `/dashboard/online-orders` | OnlineOrdersPage | transitional | مُرجَع في widget + dashboardProfiles |
| `/dashboard/orders` | OnlineOrdersPage | transitional | مُرجَع في navigation + Layout + SetupChecklist |
| `/dashboard/customization` (line 409) | CustomizationPage | canonical (يفوز) | يُعالَج قبل السطر 511 |
| `/dashboard/customization` (line 511) | Navigate→/settings | **VERIFIED_DEAD** | لا يُنفَّذ أبداً — السطر 409 يسبقه |
| `/dashboard/platform` (line 410) | PlatformPage | canonical (يفوز) | يُعالَج قبل السطر 512 |
| `/dashboard/platform` (line 512) | Navigate→/settings | **VERIFIED_DEAD** | لا يُنفَّذ أبداً — السطر 410 يسبقه |
| `/dashboard/storefront` | Navigate→/pages-v2 | compatibility | مُرجَع في GuidePage |
| `/dashboard/website` | Navigate→/pages-v2 | compatibility | مُرجَع في LandingPage |
| `/dashboard/settings/website` | Navigate→/pages-v2 | compatibility | احتياطي |
| `/dashboard/employees` | Navigate→/team | compatibility | قد تكون محفوظة في bookmarks |
| `/dashboard/revenue` | Navigate→/finance | compatibility | قد تكون محفوظة في bookmarks |
| `/dashboard/suppliers` | Navigate→/inventory?tab=suppliers | compatibility | قد تكون محفوظة في bookmarks |
| `/dashboard/school/*` (15 routes) | Navigate→/school/* | compatibility | قد تكون مُرسَلة في روابط |
| `/school/academic-calendar` | SchoolAcademicCalendarPage | canonical | ✓ |
| `/school/schedule` | SchoolAcademicCalendarPage | uncertain | alias مقصود؟ لا مرجع خارجي |
| `/bookings/*` | BookingPathRedirect | compatibility | redirect للقديم |
| `/terms` | Navigate→/legal/terms | compatibility | محتمل في إيميلات قديمة |
| `/privacy` | Navigate→/legal/privacy | compatibility | محتمل في إيميلات قديمة |

---

## 4. Orphan / Dead Candidates

| File Path | Evidence | Confidence | Classification | Action |
|-----------|----------|------------|---------------|--------|
| `pages/property/ContractDetailPage.tsx` | لا import في App.tsx · لا import في أي pages/property/ · Route `/property/contracts/:id` غير موجود | عالية جداً | VERIFIED_DEAD | **حذف في Batch 1** |
| Route `/home` (App.tsx) | grep شامل: صفر مراجع في الكود | عالية جداً | VERIFIED_DEAD | **حذف في Batch 1** |
| Route `/landing` (App.tsx) | grep شامل: صفر مراجع في الكود | عالية جداً | VERIFIED_DEAD | **حذف في Batch 1** |
| Route `customization` (line 511) | السطر 409 يحجبه — لا يُنفَّذ أبداً | عالية جداً | VERIFIED_DEAD | **حذف في Batch 1** |
| Route `platform` (line 512) | السطر 410 يحجبه — لا يُنفَّذ أبداً | عالية جداً | VERIFIED_DEAD | **حذف في Batch 1** |

---

## 5. Duplicate Flow Candidates

| Business Action | Old Flow | New Flow | Source of Truth | Migration Note | Safe Now? |
|----------------|---------|---------|----------------|---------------|-----------|
| إنشاء خدمة | ~~`/services/new` → ServiceFormPage~~ | `/services/wizard` → ServiceCreateWizard | الـ Wizard | محذوف بالفعل | ✓ مكتمل |
| طلبات إلكترونية | `/online-orders` | `/orders` | **غير محدد** | كلاهما مُرجَع في أماكن مختلفة | ✗ يحتاج قرار |
| صفحة المتجر | `/storefront`, `/website` | `/pages-v2` | `/pages-v2` | redirects موجودة | لا تلمس — compatibility |
| صفحة هبوط | `/`, `/home`, `/landing` | `/` | `/` | `/home` و`/landing` بلا مرجع | `/home` و`/landing` آمنان للحذف |

---

## 6. Compatibility Paths (لا تلمس)

| Path or Module | Why It Exists | Who May Depend | Remove When? | Risk Level |
|---------------|--------------|---------------|-------------|------------|
| `/dashboard/storefront` redirect | مُرجَع في GuidePage.tsx (السطر 323) | مستخدمو flower_shop | بعد تحديث GuidePage | منخفض |
| `/dashboard/website` redirect | مُرجَع في LandingPage.tsx (السطر 2885) | الزوار العامون | بعد تحديث LandingPage | منخفض |
| `/dashboard/school/*` (15 redirects) | migration من layout قديم | روابط محفوظة، إيميلات | بعد 6+ أشهر من الاستقرار | متوسط |
| `/bookings/*` redirect | legacy URL من نظام قديم | روابط خارجية قديمة | غير محدد | متوسط |
| `/terms`, `/privacy` redirects | قد تكون في سياسات أو إيميلات | مستخدمون عامون | غير محدد | منخفض |
| `/dashboard/employees` redirect | اسم قديم لـ team | bookmarks | غير محدد | منخفض |
| `/dashboard/revenue` redirect | اسم قديم لـ finance | bookmarks | غير محدد | منخفض |
| `/dashboard/suppliers` redirect | تم دمجه في inventory | bookmarks | غير محدد | منخفض |

---

## 7. Hidden Dependency Risks

- **`CustomizationPage` + `PlatformPage`**: يبدوان مقصودَي الإلغاء (وُجد redirect تالٍ لهما في السطرين 511-512)، لكن الصفحتين تحتويان على وظائف حقيقية (قوائم مخصصة، مفاتيح API، webhooks). إذا تم إلغاؤهما، يجب ضمان وجود هذه الوظائف في SettingsPage أولاً. **لا تحذف الصفحات — فقط أزل الـ dead redirects.**

- **`/school/schedule`**: alias لـ `SchoolAcademicCalendarPage`. لا يوجد مرجع خارجي مؤكد، لكنه قد يكون في navigation داخل School. لم يُبحث في SchoolLayout/SchoolSidebar. **مصنف UNCERTAIN.**

- **`/dashboard/orders` vs `/dashboard/online-orders`**: التقسيم موزع: `navigationRegistry.ts` يشير لـ `/orders`، `dashboardProfiles.ts` يشير لكليهما في profiles مختلفة، `OnlineOrdersWidget.tsx` يشير لـ `/online-orders`. دمجهما يحتاج تحديث 4+ ملفات. **مصنف TRANSITIONAL.**

- **`property/ContractDetailPage.tsx`**: يستخدم `propertyApi` — يعني كان مخصصاً لعقود الإيجار (lease contracts). Route `/property/contracts` يذهب لـ `LeaseContractsPage` وليس detail. ربما كان مرحلة تطوير لم تكتمل. **لا يوجد ضرر من حذفه.**

---

## 8. Proposed Cleanup Batches

### Batch 1: Safe Now ✅
*VERIFIED_DEAD — صفر تأثير وظيفي*

| Action | Location | Impact |
|--------|----------|--------|
| حذف route `/home` | App.tsx | صفر — لا مرجع |
| حذف route `/landing` | App.tsx | صفر — لا مرجع |
| حذف dead redirect `customization` (line 511) | App.tsx | صفر — محجوب بسطر 409 |
| حذف dead redirect `platform` (line 512) | App.tsx | صفر — محجوب بسطر 410 |
| حذف ملف `property/ContractDetailPage.tsx` | pages/property/ | صفر — لا import أو route |

### Batch 2: Safe After Verification 🔍
*يحتاج تأكيد أن canonical flow مكتمل أولاً*

| Action | Requires |
|--------|---------|
| توحيد `/orders` كـ canonical وإضافة redirect من `/online-orders` | تحديث dashboardProfiles.ts + OnlineOrdersWidget.tsx |
| دمج `/school/schedule` في `/school/academic-calendar` (إذا ثبت أنه alias بلا قصد) | فحص SchoolLayout navigation |

### Batch 3: Needs Product Decision 🏢
*يؤثر على تجربة المستخدم أو هيكل الميزات*

| Action | Decision Needed |
|--------|----------------|
| هل يُدمج `CustomizationPage` في `SettingsPage`؟ | قرار منتج: هل Settings يغطي expense categories + payment methods؟ |
| هل يُدمج `PlatformPage` في `SettingsPage`؟ | قرار منتج: هل API keys + webhooks تنتمي لـ Settings؟ |
| توحيد `/landing` شكلياً (إبقاء redirect بدلاً من حذف) | قرار: هل هناك حملات تسويقية تستخدم `/landing`؟ |

### Batch 4: Deferred / Do Not Touch 🔒
| Item | Reason |
|------|--------|
| `/dashboard/storefront` redirect | مُرجَع في GuidePage |
| `/dashboard/website` redirect | مُرجَع في LandingPage |
| `/dashboard/school/*` 15 redirects | compatibility طويل المدى |
| `/bookings/*` BookingPathRedirect | legacy URL protection |
| `/terms`, `/privacy` redirects | قد تكون في وثائق قانونية |

---

## 9. Rollback Notes

| Batch | Rollback Method | Time Needed |
|-------|----------------|-------------|
| Batch 1 — App.tsx routes | `git revert` للـ commit | < 2 دقيقة |
| Batch 1 — property file | `git checkout HEAD~1 -- path` | < 2 دقيقة |
| Batch 2 — orders consolidation | `git revert` + إعادة الـ route المحذوف | 5-10 دقائق |
| Batch 3 — page merges | إعادة الـ routes + استرجاع الصفحات | 15+ دقيقة |

---

*تم إنشاء هذا التقرير تلقائياً بناءً على تحليل الكود المباشر — لا تفسير، لا افتراضات.*
