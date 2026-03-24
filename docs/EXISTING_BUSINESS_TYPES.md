# Existing Business Types — Nasaq SaaS Platform

Last updated: 2026-03-22

## Source of Truth

Business types are defined in three canonical locations that must stay in sync:

| File | Role |
|------|------|
| `packages/api/src/routes/auth.ts` | Stored in `organizations.business_type` on registration |
| `packages/db/schema/organizations.ts` | DB column `business_type TEXT DEFAULT 'general'` |
| `apps/dashboard/src/pages/RegisterPage.tsx` | Registration UI picker (20 types shown) |
| `apps/dashboard/src/components/layout/Layout.tsx` | Sidebar navigation per type |

## Canonical Type List (20 + general)

### Food & Beverage
| Type | Label (AR) | Specialty Nav Group |
|------|-----------|---------------------|
| `restaurant` | مطعم | المطعم (menu, kitchen, reservations) |
| `cafe` | مقهى وكوفي شوب | المقهى (menu, kitchen, reservations) |
| `catering` | ضيافة وتقديم طعام | الضيافة (menu, kitchen, reservations) |
| `bakery` | مخبز وحلويات | المخبز (menu, kitchen, reservations) |

### Beauty & Wellness
| Type | Label (AR) | Specialty Nav Group |
|------|-----------|---------------------|
| `salon` | صالون تجميل نسائي | الصالون (schedule, commissions) |
| `barber` | حلاقة وتصفيف رجالي | الحلاقة (schedule, commissions) |
| `spa` | سبا ومساج | السبا (schedule, commissions) |
| `fitness` | صالة رياضية ولياقة | الصالة الرياضية (schedule, commissions) |

### Events & Entertainment
| Type | Label (AR) | Specialty Nav Group |
|------|-----------|---------------------|
| `events` | تنظيم فعاليات وأفراح | الفعاليات (events, packages) |
| `photography` | تصوير وإنتاج إعلامي | Core only |

### Retail & Specialty
| Type | Label (AR) | Specialty Nav Group |
|------|-----------|---------------------|
| `retail` | متجر تجزئة عام | Core only |
| `flower_shop` | متجر ورود وهدايا | متجر الورود (flower-inventory, arrangements) |

### Rental
| Type | Label (AR) | Specialty Nav Group |
|------|-----------|---------------------|
| `rental` | تأجير معدات وأصول | التأجير (assets, contracts, inspections) |

### Professional Services
| Type | Label (AR) | Specialty Nav Group |
|------|-----------|---------------------|
| `services` | خدمات مهنية وحرة | Core only |
| `medical` | عيادات ورعاية صحية | Core only |
| `education` | تعليم وتدريب | Core only |
| `technology` | تقنية معلومات وبرمجة | Core only |
| `construction` | مقاولات وبناء | Core only |
| `logistics` | شحن ونقل ولوجستيات | Core only |
| `other` | أخرى | Core only |

### Default
| Type | Label (AR) | Notes |
|------|-----------|-------|
| `general` | عام | Default when not set. Used by older accounts. |

## Specialty API Routes (Business-Type Specific)

| Route Prefix | Business Types | Route File |
|-------------|----------------|------------|
| `/api/v1/menu` | restaurant, cafe, catering, bakery | `routes/menu.ts` |
| `/api/v1/arrangements` | flower_shop | `routes/arrangements.ts` |
| `/api/v1/flower-builder` | flower_shop | `routes/flower-builder.ts` |
| `/api/v1/pos` | all types | `routes/pos.ts` |
| `/api/v1/online-orders` | restaurant, cafe, retail | `routes/online-orders.ts` |
| `/api/v1/suppliers` | all types | `routes/suppliers.ts` |
| `/api/v1/messaging` | all types | `routes/messaging.ts` |

## Production DB Business Types (actual data)

From `SELECT DISTINCT business_type FROM organizations`:
- `salon`, `flower_shop`, `rental`, `cafe`, `restaurant`, `events`, `store`

Note: `store` is a legacy alias for `retail`. No specialty nav group assigned for `store`.
