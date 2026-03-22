# Type System Audit — نسق

## الوضع الحالي (قبل الإصلاح)

### 1) Business Type
**الموقع الحالي:** `organizations.business_type` — حقل نص حر بدون enum قاعدة البيانات.

**القيم الموثقة في التعليقات فقط:**
```
restaurant, cafe, catering, bakery, salon, barber, spa, fitness,
events, photography, retail, store, flower_shop, rental,
services, medical, education, technology, construction, logistics,
other, general
```

**المشاكل:**
- لا يوجد enum على مستوى قاعدة البيانات → لا قيد على القيم
- `hotel` و `car_rental` **غائبان تماماً**
- `rental` موجود لكنه مصمم لإيجار المعدات في الفعاليات (events/equipment), ليس لتأجير السيارات
- القيم موزعة على 3 أماكن مختلفة:
  - `packages/db/schema/organizations.ts` (تعليق فقط)
  - `apps/dashboard/src/components/layout/Layout.tsx` (BUSINESS_GROUPS)
  - `apps/dashboard/src/pages/OnboardingPage.tsx` (UI list)

**المصدر الرسمي الحالي:** لا يوجد — مبعثر.

---

### 2) Offering Type (نوع العنصر المباع)
**الوضع:** **لا يوجد أي حقل `offeringType` في النظام.**

جدول `services` يستخدم لكل شيء:
- خدمة تقليدية (مساج، حلاقة)
- منتج مادي (ورد، معدات)
- باقة (bundle)
- تأجير معدات
- حجز غرفة فندقية (مستقبلاً)
- تأجير سيارة (مستقبلاً)

لا يوجد تمييز بين هذه الأنواع في DB أو API أو UI.

**المشاكل الناتجة:**
- لا يمكن تطبيق قواعد مختلفة حسب النوع (مخزون / وحدات / جداول / سياسات)
- فلاتر الكتالوج عمياء
- Reports لا تستطيع تجميع "منتجات" منفصلة عن "خدمات"
- لا يمكن اشتراط ربط الغرفة/السيارة بنوع معين فقط

---

### 3) Category / Domain Context
**الوضع:** موجود جزئياً — جدول `categories` منظم، لكن:
- لا يوجد `domainContext` أو `type` على التصنيف
- لا توجد تصنيفات موثقة لـ hotel أو car_rental
- التصنيفات حرة تماماً بدون تقييد على نوع النشاط

---

## ما يجب إنشاؤه

### Registry موحدة: Business Types
**الملف:** `packages/db/schema/registries.ts` (جديد)

```typescript
export const BUSINESS_TYPES = [
  "general", "restaurant", "cafe", "catering", "bakery",
  "salon", "barber", "spa", "fitness",
  "events", "photography", "retail", "store",
  "flower_shop", "equipment_rental", "hotel", "car_rental",
  "services", "medical", "education", "technology",
  "construction", "logistics", "digital_store", "other"
] as const;
```

**ملاحظة:** `rental` يُعاد تسميته `equipment_rental` لتمييزه عن `car_rental`.

### Registry موحدة: Offering Types
**الحقل:** `services.offeringType` (جديد)

```typescript
export const OFFERING_TYPES = [
  "service",        // خدمة تقليدية (مساج، حلاقة، تصوير)
  "product",        // منتج مادي (ورد، قهوة، معجنات)
  "package",        // باقة مجمعة من خدمات/منتجات
  "rental",         // تأجير معدات (خيام، كراسي، صوتيات)
  "room_booking",   // حجز غرفة فندقية
  "vehicle_rental", // تأجير سيارة
  "subscription",   // اشتراك دوري
  "digital_product",// منتج رقمي (ملف، كورس)
  "add_on",         // إضافة مستقلة
  "reservation",    // حجز طاولة/مقعد/موعد
  "extra_charge",   // رسوم إضافية (خدمة)
] as const;
```

---

## خريطة Business Type → Offering Types المسموح بها

| Business Type | Offering Types المسموحة |
|---------------|------------------------|
| restaurant / cafe / bakery | product, service, add_on, subscription |
| catering | service, package, rental, add_on |
| salon / barber / spa / fitness | service, package, add_on, subscription |
| events / photography | service, package, rental, add_on |
| flower_shop | product, package, add_on |
| equipment_rental | rental, service, add_on, extra_charge |
| hotel | room_booking, service, package, add_on, extra_charge |
| car_rental | vehicle_rental, service, add_on, extra_charge, depositable |
| retail / store | product, subscription, add_on |
| digital_store | digital_product, subscription, add_on |
| general / services | service, product, package, add_on |
| medical / education | service, subscription, add_on |

---

## إصلاحات مطلوبة بالأولوية

| الأولوية | الإصلاح | الملف |
|---------|---------|-------|
| CRITICAL | إضافة `offeringType` لجدول `services` | `catalog.ts` |
| CRITICAL | إضافة `hotel` و `car_rental` لقائمة business types | `organizations.ts`, Layout, Onboarding |
| HIGH | توحيد registry في ملف واحد | `packages/db/schema/registries.ts` (جديد) |
| HIGH | إضافة type على `categories` لتحديد domain context | `catalog.ts` |
| MEDIUM | إصلاح `rental` → `equipment_rental` مع backward compat | جميع الملفات |
| MEDIUM | فلترة offering types بناءً على businessType في UI | `ServicesPage`, `CreateServiceForm` |
| LOW | إضافة index على `services.offeringType` | migration SQL |
