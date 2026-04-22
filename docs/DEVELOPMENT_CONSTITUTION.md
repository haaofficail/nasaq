# دستور التطوير — ترميز OS

> هذا الملف هو المرجع الإلزامي عند أي قرار معماري أو تطويري.  
> أي شك → ارجع لهذا الملف أولاً.

---

## 1. خريطة الأنظمة الحيّة (Canonical Systems Map)

### واجهة العميل (Storefront)
| الحالة | الملف | المسار |
|--------|-------|--------|
| **حيّ** | `packages/api/src/routes/storefront-v2.ts` | `/api/v2/storefront/:orgSlug/*` |
| **محذوف** | ~~`packages/api/src/routes/website.ts`~~ | ~~`/api/v1/website/*`~~ |

**المنطق:** `storefront-v2` هو النظام الوحيد للمتجر. يشمل: catalog, book, preview.  
**Endpoints الحيّة:**
- `GET /:orgSlug/preview` — بيانات الصفحة التعريفية
- `GET /:orgSlug/services` — قائمة الخدمات
- `POST /:orgSlug/book` — إنشاء حجز جديد

### الصفحات العامة للمنصة (Platform Public)
| الحالة | الملف | المسار |
|--------|-------|--------|
| **حيّ** | `packages/api/src/routes/public.ts` | `/api/v1/public/*` |
| **محذوف** | ~~`packages/api/src/routes/website.ts`~~ | ~~`/api/v1/website/public/*`~~ |

**Endpoints الحيّة:**
- `POST /public/contact` — نموذج التواصل (ContactPage)
- `POST /public/privacy-request` — طلبات PDPL (PrivacyPage)

### نظام الحجوزات
| الجدول | الحالة | الملاحظة |
|--------|--------|---------|
| `booking_records` | **حيّ — canonical** | الجدول الرئيسي |
| `booking_lines` | **حيّ — canonical** | سطور الحجز |
| `booking_timeline_events` | **حيّ — canonical** | timeline |
| `bookings` | **قديم — جاري التخلص منه** | لا تكتب فيه في كود جديد |

**قاعدة:** كل كود جديد يستخدم `booking_records + booking_lines` فقط.

---

## 2. Navigation — مصدر الحقيقة الوحيد

```
apps/dashboard/src/lib/navigationRegistry.ts
```

- هذا هو **المصدر الوحيد** لعناصر sidebar الداشبورد
- لا تضف روابط في أي مكان آخر إلا هنا
- الدالة `buildVisibleNav()` تقرأ من هذا الملف فقط

**أسماء الصفحات الحيّة (ثابتة):**
- `البيع السريع` — POS (ليس "نقطة البيع")
- `المتجر الإلكتروني` — storefront v2
- `الصفحة التعريفية` — profile page

---

## 3. قواعد Endpoints الإلزامية

### الداشبورد (authenticated, org-scoped)
```
/api/v1/{resource}
orgId مأخوذ من session فقط — لا من URL
```

### المتجر العام (public, org-scoped by slug)
```
/api/v2/storefront/:orgSlug/{resource}
```

### صفحات المنصة العامة (public, no org)
```
/api/v1/public/{resource}
لا auth، لا orgId
```

### الأدمن
```
/api/v1/admin/{resource}
role check: super_admin فقط
```

---

## 4. قاعدة Multi-Tenant (غير قابلة للكسر)

كل query على DB لازم يتضمن `eq(table.orgId, orgId)`:

```typescript
// صح
const data = await db.select().from(services)
  .where(eq(services.orgId, orgId));

// خطأ — سيعرض بيانات منشآت أخرى
const data = await db.select().from(services);
```

الاستثناءات الوحيدة:
- Storefront: `orgId` مأخوذ من `slug → org.id` لا من session
- Platform public endpoints: لا orgId بالتعريف
- Admin routes: مع role check صريح

---

## 5. Schema — قواعد الأعمدة

### أسماء الأعمدة الثابتة
| الجدول | العمود الصحيح | الخاطئ |
|--------|--------------|--------|
| `services` | `basePrice` | ~~`price`~~ |
| `organizations` | `slug` | ~~`orgSlug`~~ |
| `booking_records` | `bookingNumber` | ~~`number`~~ |

### العلاقات المحمية (computed-only، لا تُخزَّن)
- bookings ↔ invoices
- customers ↔ booking count
- services ↔ review count

---

## 6. نظام الصلاحيات

| الدور | الصلاحيات |
|------|----------|
| `super_admin` | كل شيء في كل منشأة |
| `owner` | كل شيء في منشأته |
| `manager` | بدون حذف، بدون إعدادات المالية |
| `staff` | العمليات اليومية فقط |

---

## 7. النظام المالي

كل عملية فيها مال → قيد مالي تلقائي.  
إلغاء → قيد عكسي.  
**لا استثناء.**

جدول القيود: `treasury_entries`  
Helper: `packages/api/src/lib/treasury-helpers.ts`

---

## 8. Capabilities

لا تكتب مباشرة في `organization_capability_overrides`.  
استخدم `packages/api/src/lib/capability-service.ts` دائماً.

---

## 9. CI / Deployment

```
github remote  → Tests فقط (كل الـ branches)
main branch    → Tests + Deploy to production
```

**للنشر الفعلي:** يجب أن يكون الـ commit على `main`.  
Push إلى branch آخر = tests فقط، لا يصل للسيرفر.

---

## 10. Design System

- **Framework:** Tailwind CSS فقط — لا inline styles في الداشبورد
- **Inline styles مسموحة:** في الصفحات العامة (Storefront, PublicPages) فقط
- **الخط:** IBM Plex Sans Arabic
- **لون البراند:** `#5b9bd5`
- **لا emoji** في أي كود أو واجهة
- **RTL** في كل مكان

### ألوان الصفحات العامة (ثابتة للمنصة)
```
خلفية:    #F0F6FC
سطح:      #E3EFF9  
حدود:     #C9DDEF
نص رئيسي: #0D2138
نص ثانوي: #2F6190
header:   #5b9bd5 → #3d84c8 (gradient)
```

---

## 11. قبل أي Migration — قف واستشر

> **قبل أي migration جديد — وقف واستشر Bander أولاً.**

- تحقق من DB الفعلي: `psql [db] -c "\d table_name"`
- لا تثق بالتعليقات في ملفات الـ schema
- Reference: `docs/lessons/schema-comments-lie.md`

---

## 12. سجل الأنظمة المستبدَلة

| النظام القديم | النظام الجديد | تاريخ الاستبدال |
|--------------|--------------|----------------|
| `routes/website.ts` | `routes/storefront-v2.ts` + `routes/public.ts` | 2026-04 |
| جدول `bookings` (للكتابة) | `booking_records + booking_lines` | 2026-04 |
| `/api/v1/website/public/*` | `/api/v1/public/*` | 2026-04 |
| "نقطة البيع" (اسم) | "البيع السريع" | 2026-04 |

---

## 13. Checklist قبل "خلصت"

```
[ ] npx tsc --noEmit = صفر أخطاء
[ ] كل الصفحات القديمة تشتغل
[ ] كل ميزة جديدة لها مقابل في الأدمن
[ ] كل عملية مالية منعكسة في treasury_entries
[ ] كل API فيه orgId filter + role check
[ ] لا references للمسارات المحذوفة
[ ] الـ PR merged إلى main للنشر الفعلي
```
