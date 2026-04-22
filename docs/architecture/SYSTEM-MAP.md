# ترميز OS — System Architecture Map
**آخر تحديث:** 2026-04-22

## Stack
```
Client (React + Vite)          ──►  Hono API (Node/tsx)  ──►  PostgreSQL 
apps/dashboard/                     packages/api/               packages/db/
                                     │
                                     ├── pg-boss (jobs)
                                     ├── Baileys (WhatsApp)
                                     ├── Nodemailer (Email/SMTP)
                                     ├── Moyasar (Payments)
                                     └── Twilio (SMS — env only)
```

## الطبقات الرئيسية

### 1. Auth Layer
- OTP via Email (SMTP) / WhatsApp / SMS
- Session tokens (JWT in cookie)
- Multi-tenant: كل request يحمل orgId من السيشن

### 2. API Routes (81 ملف)
- `/auth` — تسجيل دخول، OTP
- `/bookings` — نظام الحجوزات الكامل
- `/payments` — Moyasar integration
- `/marketing` — حملات، كوبونات، abandoned carts
- `/storefront-v2` — Public storefront API
- `/online-orders` — طلبات المتجر
- `/admin` — لوحة الأدمن (super_admin فقط)

### 3. Financial Engine
- journal_entries + journal_entry_lines (double-entry)
- payments → invoice_payments → invoices
- treasury_transactions
- ZATCA compliance: compliance.ts

### 4. Capabilities System
- capability_registry: الميزات المتاحة per-plan
- organization_capability_overrides: تخصيص per-org
- capability-service.ts: الواجهة الوحيدة للكتابة

### 5. Page Builder v2
- packages/page-builder-v2/
- Blocks: Hero, Features, Products, CTA, FAQ, Contact, Footer
- Rollout: 10% عبر capability_registry
- Storefront rendering: storefront-v2.ts

## Verticals المدعومة
1. صالون جمال (salon)
2. مطعم (restaurant)
3. فندق (hotel)
4. تأجير سيارات (car-rental)
5. عقارات (property)
6. مدارس (school)
7. ورش صيانة (work-orders)
8. محلات زهور (flowers)
9. بناء ومقاولات (construction)

## الثغرات الحالية
انظر: `docs/gap-analysis/`
