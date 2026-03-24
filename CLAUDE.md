# نسق — Nasaq Vendor OS
## الخريطة الشاملة للمشروع

---

## 1. معلومات المشروع

- **الاسم:** نسق (Nasaq) — Vendor OS
- **الرؤية:** أكبر منصة إدارة أنشطة تجارية متكاملة في السعودية
- **الموقع:** nasaqpro.tech
- **السيرفر:** 187.124.41.239 (Hostinger VPS — Ubuntu 22.04)
- **DB:** PostgreSQL — nasaq_user / Nasaq_DB_2026@secure
- **API:** PM2 "nasaq-api" port 3000 — tsx runtime
- **Dashboard:** Vite build → /var/www/nasaq/apps/dashboard/dist
- **Admin:** admin@nasaqpro.tech / Admin@Nasaq2026

---

## 2. الـ Stack

| الطبقة | التقنية |
|--------|---------|
| Backend | Hono v4 + TypeScript + tsx |
| Database | PostgreSQL + Drizzle ORM |
| Frontend | React 19 + Vite + TailwindCSS |
| Monorepo | pnpm workspaces |
| Auth | OTP SMS (Baileys WhatsApp مؤقتاً) |
| Icons | lucide-react فقط — بدون emoji |
| Font | IBM Plex Sans Arabic + Tajawal |
| Colors | brand: #5b9bd5 / dark: #1a1a2e / accent: #f59e0b |

---

## 3. أنواع الأنشطة (20 نوع)

### طعام
| النوع | الكود | الخصوصيات |
|-------|-------|----------|
| مطعم | restaurant | قائمة طعام + وصفات + مطبخ KDS + حجز طاولات + طلب أونلاين + توصيل |
| مقهى/كوفي | cafe | أحجام (S/M/L) + إضافات (حليب/صوص) + مشروبات مختصة |
| ضيافة/بوفيه | catering | باقات + عدد أشخاص + موقع الفعالية |
| مخبز/حلويات | bakery | إنتاج + مواد خام + طلبات مسبقة |

### تجميل
| النوع | الكود | الخصوصيات |
|-------|-------|----------|
| صالون نسائي | salon | مختصات + عمولات + جدول مواعيد + مواد تُستهلك جزئياً |
| حلاق رجالي | barber | نفس الصالون بس بمسميات مختلفة |
| سبا/مساج | spa | غرف + أوقات + معالجين |
| صالة رياضية | fitness | اشتراكات + حصص + مدربين |

### تجزئة
| النوع | الكود | الخصوصيات |
|-------|-------|----------|
| متجر عام | store | منتجات + باركود + متغيّرات (لون/حجم) |
| ورود وهدايا | flower_shop | صلاحية بالأيام + تخليص ذكي + إهداء + تغليف |

### خدمات
| النوع | الكود | الخصوصيات |
|-------|-------|----------|
| تأجير | rental | أصول + تفتيش + صيانة + عقود + تأمين |
| فعاليات | events | حجز أصول بالتاريخ + باقات + تذاكر |
| خدمات عامة | services | حجز مواعيد عام |
| عيادات | clinic | مرضى + ملفات طبية + وصفات |
| تعليم/تدريب | education | طلاب + دورات + شهادات |
| تصوير | photography | جلسات + ألبومات + تسليم |
| تقنية | tech | مشاريع + تذاكر دعم |
| مقاولات | contracting | مشاريع + مراحل + عمالة |
| شحن/توصيل | shipping | شحنات + تتبع + مندوبين |
| أخرى | other | حجوزات عامة |

---

## 4. هيكلة المشروع الكاملة

```
/var/www/nasaq/
│
├── CLAUDE.md                              ← هذا الملف
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
│
├── packages/
│   │
│   ├── api/src/
│   │   │
│   │   ├── index.ts                       ← نقطة البداية — تسجيل middleware + routes
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts                     ← التحقق من env vars عند التشغيل
│   │   │   ├── constants.ts               ← كل الثوابت (VAT_RATE, SESSION_DURATION...)
│   │   │   └── database.ts               ← إعدادات الاتصال
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts                    ← فحص JWT + استخراج orgId
│   │   │   ├── org-context.ts             ← يحط businessType في context
│   │   │   ├── request-logger.ts          ← structured logging مع requestId
│   │   │   ├── error-handler.ts           ← global error handler
│   │   │   ├── rate-limiter.ts            ← حماية من الطلبات الكثيرة
│   │   │   └── permissions.ts             ← requirePermission(key)
│   │   │
│   │   ├── modules/
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts         ← OTP request/verify + refresh
│   │   │   │   ├── auth.service.ts        ← منطق OTP + session
│   │   │   │   └── auth.schema.ts         ← Zod: phone, code
│   │   │   │
│   │   │   ├── bookings/
│   │   │   │   ├── bookings.routes.ts     ← CRUD + status + calendar
│   │   │   │   ├── bookings.service.ts    ← إنشاء + تأكيد + إكمال + إلغاء
│   │   │   │   ├── bookings.schema.ts     ← Zod: createBooking, updateStatus
│   │   │   │   ├── booking-engine.ts      ← conflict check + recurring + availability
│   │   │   │   └── reminders.service.ts   ← تذكيرات المواعيد
│   │   │   │
│   │   │   ├── customers/
│   │   │   │   ├── customers.routes.ts    ← CRUD + contacts + interactions + segments
│   │   │   │   ├── customers.service.ts   ← إنشاء + تحديث إحصائيات + ولاء
│   │   │   │   ├── customers.schema.ts    ← Zod: whitelist حقول
│   │   │   │   ├── segments.service.ts    ← شرائح ديناميكية
│   │   │   │   └── loyalty.service.ts     ← نقاط + مستويات + مكافآت
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── services.routes.ts     ← CRUD + categories + addons + bundles
│   │   │   │   ├── services.service.ts    ← إنشاء + تسعير + تفعيل
│   │   │   │   ├── services.schema.ts
│   │   │   │   ├── categories.service.ts
│   │   │   │   ├── addons.service.ts
│   │   │   │   ├── bundles.service.ts     ← باقات مجمّعة
│   │   │   │   ├── components.service.ts  ← مكوّنات الخدمة (مواد)
│   │   │   │   └── pricing-rules.service.ts ← تسعير ديناميكي
│   │   │   │
│   │   │   ├── inventory/
│   │   │   │   ├── inventory.routes.ts    ← CRUD + adjust + movements + alerts + reports
│   │   │   │   ├── inventory.service.ts   ← إدارة الأصناف + الدفعات
│   │   │   │   ├── inventory.schema.ts
│   │   │   │   ├── inventory-engine.ts    ← الخصم + الإرجاع + FIFO
│   │   │   │   ├── stock-take.service.ts  ← الجرد
│   │   │   │   ├── alerts.service.ts      ← تنبيهات المخزون
│   │   │   │   └── transfers.service.ts   ← تحويل بين فروع
│   │   │   │
│   │   │   ├── finance/
│   │   │   │   ├── finance.routes.ts      ← invoices + payments + expenses + reports
│   │   │   │   ├── invoices.service.ts    ← إنشاء + دفع + إلغاء
│   │   │   │   ├── payments.service.ts    ← تسجيل دفعات
│   │   │   │   ├── expenses.service.ts    ← المصروفات
│   │   │   │   ├── reports.service.ts     ← P&L + receivables + tax + cashflow
│   │   │   │   └── closing.service.ts     ← إقفال يومي + شهري
│   │   │   │
│   │   │   ├── pos/
│   │   │   │   ├── pos.routes.ts          ← sale + refund + register + reports
│   │   │   │   ├── pos.service.ts         ← بيع + مرتجع
│   │   │   │   ├── pos.schema.ts
│   │   │   │   ├── cash-register.service.ts ← فتح/إقفال صندوق + X/Z reports
│   │   │   │   └── quick-items.service.ts
│   │   │   │
│   │   │   ├── messaging/
│   │   │   │   ├── messaging.routes.ts    ← connect + templates + logs + settings
│   │   │   │   ├── messaging.service.ts   ← إرسال + قوالب + متغيّرات
│   │   │   │   ├── whatsapp-manager.ts    ← Baileys sessions
│   │   │   │   ├── templates.service.ts   ← CRUD قوالب
│   │   │   │   └── scheduler.ts           ← تذكيرات + رسائل مجدولة
│   │   │   │
│   │   │   ├── team/
│   │   │   │   ├── team.routes.ts         ← members + providers + shifts + time-off
│   │   │   │   ├── staff.service.ts       ← CRUD موظفين
│   │   │   │   ├── providers.service.ts   ← مقدمي الخدمة (مختصات)
│   │   │   │   ├── commissions.service.ts ← حساب العمولات
│   │   │   │   ├── attendance.service.ts  ← الحضور + الانصراف
│   │   │   │   ├── schedule.service.ts    ← جداول العمل
│   │   │   │   └── permissions.service.ts ← صلاحيات الموظفين
│   │   │   │
│   │   │   ├── suppliers/
│   │   │   │   ├── suppliers.routes.ts    ← CRUD + purchase orders + receive + pay
│   │   │   │   ├── suppliers.service.ts
│   │   │   │   └── purchase-orders.service.ts
│   │   │   │
│   │   │   ├── website/
│   │   │   │   ├── website.routes.ts      ← pages + config + gallery
│   │   │   │   ├── page-builder.service.ts ← blocks + themes
│   │   │   │   ├── gallery.service.ts
│   │   │   │   └── seo.service.ts
│   │   │   │
│   │   │   ├── online-orders/
│   │   │   │   ├── orders.routes.ts       ← CRUD + status pipeline + tracking
│   │   │   │   ├── orders.service.ts
│   │   │   │   ├── orders.schema.ts
│   │   │   │   ├── delivery.service.ts    ← مندوبين + تتبع
│   │   │   │   └── coupons.service.ts
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── settings.routes.ts     ← profile + booking + website + notifications
│   │   │   │   ├── settings.service.ts
│   │   │   │   └── onboarding.service.ts  ← إعداد أول مرة
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── admin.routes.ts        ← dashboard + tenants + subscriptions + team
│   │   │   │   ├── admin.service.ts
│   │   │   │   └── admin.middleware.ts    ← requireAdminPermission
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.routes.ts
│   │   │   │   └── notifications.service.ts
│   │   │   │
│   │   │   └── public/
│   │   │       ├── public.routes.ts       ← /site/:slug + /book + /order + /track
│   │   │       └── public.service.ts
│   │   │
│   │   ├── business-types/
│   │   │   ├── _base.config.ts
│   │   │   ├── salon/
│   │   │   ├── barber/
│   │   │   ├── spa/
│   │   │   ├── fitness/
│   │   │   ├── restaurant/
│   │   │   ├── cafe/
│   │   │   ├── catering/
│   │   │   ├── bakery/
│   │   │   ├── flower-shop/
│   │   │   ├── store/
│   │   │   ├── rental/
│   │   │   ├── events/
│   │   │   ├── clinic/
│   │   │   ├── education/
│   │   │   ├── photography/
│   │   │   └── shipping/
│   │   │
│   │   └── shared/
│   │       ├── integrations.ts
│   │       ├── notifications.ts
│   │       ├── audit-log.ts
│   │       ├── file-upload.ts
│   │       ├── pdf-generator.ts
│   │       └── utils.ts
│   │
│   └── db/src/
│       ├── client.ts
│       ├── constants.ts
│       ├── migrate.ts
│       └── schema/
│           ├── auth.ts
│           ├── organizations.ts
│           ├── bookings.ts
│           ├── customers.ts
│           ├── services.ts
│           ├── inventory.ts
│           ├── finance.ts
│           ├── pos.ts
│           ├── messaging.ts
│           ├── team.ts
│           ├── suppliers.ts
│           ├── website.ts
│           ├── online-orders.ts
│           ├── assets.ts
│           ├── flowers.ts
│           ├── events.ts
│           ├── restaurant.ts
│           ├── notifications.ts
│           ├── admin.ts
│           └── activity.ts
│
├── apps/dashboard/src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/ui/
│   ├── components/layout/
│   ├── components/shared/
│   ├── pages/
│   └── lib/
│
├── uploads/
└── whatsapp-sessions/
```

---

## 5. الترابط بين الأنظمة (Integration Map)

### حجز جديد (booking_created)
- فاتورة تلقائية → invoices.service → createInvoice
- إشعار للتاجر → notifications.service → create
- واتساب للعميل → messaging.service → sendEventMessage: booking_created
- واتساب للمالك → messaging.service → sendEventMessage: owner_new_booking
- واتساب للمختص → messaging.service → sendEventMessage: staff_assigned
- تايم لاين → audit-log → logTimeline

### حجز مكتمل (booking_completed)
- فاتورة → paid → invoices.service → markPaid
- خصم مخزون → inventory-engine → deductServiceMaterials
- نقاط ولاء → loyalty.service → earnPoints
- إحصائيات عميل → customers.service → updateStats
- عمولة مختص → commissions.service → calculate (صالون فقط)
- واتساب → booking_completed + review request
- تايم لاين

### حجز ملغى (booking_cancelled)
- فاتورة → cancelled
- إرجاع مخزون → inventory-engine → restoreServiceMaterials
- واتساب → booking_cancelled
- تايم لاين

### بيع POS (pos_sale)
- فاتورة → invoices.service → createPosInvoice
- خصم مخزون → inventory-engine → deductServiceMaterials
- تحديث صندوق → cash-register.service → addMovement
- نقاط ولاء
- إحصائيات عميل
- تايم لاين

### طلب أونلاين (order_created)
- فاتورة
- واتساب → order_created + owner_new_order
- إشعار + صوت في الداشبورد
- تايم لاين

### تدفق الطلب الأونلاين
- طلب مؤكد → خصم مخزون
- طلب جاهز → واتساب: order_ready
- طلب في الطريق → واتساب: order_out_for_delivery
- طلب تم توصيله → واتساب: order_delivered + ولاء

### مخزون منخفض (low_stock)
- إشعار داخلي
- واتساب للمالك → low_stock_alert
- اقتراح أمر شراء → purchase-orders.service → suggestReorder

### تذكير مواعيد (scheduler — كل ساعة)
- جلب حجوزات الغد
- واتساب → booking_reminder

### ملخص يومي (scheduler — كل يوم 10 مساءً)
- واتساب للمالك → daily_summary

---

## 6. حالات الحجز

```
pending → confirmed → in_progress → completed
                  ↘ cancelled
                  ↘ no_show
```

## 7. حالات الطلب الأونلاين

```
pending → confirmed → preparing → ready → out_for_delivery → delivered
                                        ↘ picked_up
              ↘ cancelled
```

## 8. حالات الأصول

```
available → reserved → rented → available
                             ↘ maintenance → available
                             ↘ retired
```

---

## 9. قواعد التطوير

- كل route يفحص org_id — ما أحد يوصل لبيانات غيره
- كل input يمر على Zod validation — بدون spread مباشر
- كل عملية كتابة متعددة → db.transaction()
- كل ملف route < 200 سطر — إذا أكثر → قسّمه
- الأيقونات: lucide-react فقط — بدون emoji في أي مكان
- الألوان: brand.DEFAULT (#5b9bd5) / brand.dark (#1a1a2e) / brand.accent (#f59e0b)
- الخط: IBM Plex Sans Arabic
- الاتجاه: RTL دايماً
- كل صفحة: PageHeader + EmptyState + Skeleton + responsive
- كل حدث: يمر على integrations → الأنظمة تتحدّث تلقائي
