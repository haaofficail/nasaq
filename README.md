# نسق — Nasaq Vendor OS for Events

> منصة تشغيل الفعاليات الأذكى في السعودية

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20+ |
| **API** | Hono + TypeScript |
| **Database** | PostgreSQL (Neon DB) + Drizzle ORM |
| **Package Manager** | pnpm (monorepo) |
| **Dashboard** | Next.js / Vite + React + Tailwind + ShadCN (TBD) |

## Project Structure

```
nasaq/
├── packages/
│   ├── db/                    # Database layer
│   │   ├── schema/            # Drizzle schema definitions
│   │   │   ├── organizations.ts   # Multi-tenant foundation
│   │   │   ├── auth.ts            # Users, roles, permissions, audit
│   │   │   ├── catalog.ts         # Services, categories, addons, bundles, pricing
│   │   │   ├── customers.ts       # CRM: customers, segments, interactions
│   │   │   ├── bookings.ts        # Bookings, payments, pipeline
│   │   │   └── index.ts           # Export all
│   │   ├── client.ts          # Neon DB connection
│   │   └── drizzle.config.ts  # Drizzle Kit config
│   │
│   └── api/                   # REST API
│       └── src/
│           ├── routes/        # API routes
│           │   ├── categories.ts      # CRUD + tree + reorder
│           │   ├── services.ts        # CRUD + media + addons + duplicate
│           │   ├── addons.ts          # CRUD
│           │   ├── bundles.ts         # CRUD + items
│           │   └── pricing-rules.ts   # CRUD
│           ├── lib/
│           │   └── helpers.ts     # Shared utilities
│           └── index.ts           # Hono server entry
│
├── apps/
│   └── dashboard/             # Admin dashboard (Phase 2)
│
├── .env.example
├── pnpm-workspace.yaml
├── tsconfig.json
└── package.json
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Fill in DATABASE_URL from Neon dashboard

# 3. Push schema to database
pnpm db:push

# 4. Start API server
pnpm dev:api
# → http://localhost:3000

# 5. Test health
curl http://localhost:3000/api/v1/health
```

## API Endpoints (Phase 1: Service Catalog)

### Categories
```
GET    /api/v1/categories          # List (tree or flat)
GET    /api/v1/categories/:id      # Get with children
POST   /api/v1/categories          # Create
PUT    /api/v1/categories/:id      # Update
DELETE /api/v1/categories/:id      # Delete (no children)
POST   /api/v1/categories/reorder  # Bulk reorder
```

### Services
```
GET    /api/v1/services            # List (filter, search, paginate)
GET    /api/v1/services/:id        # Get with media, addons, pricing
POST   /api/v1/services            # Create
PUT    /api/v1/services/:id        # Update
DELETE /api/v1/services/:id        # Delete
POST   /api/v1/services/:id/media  # Add media
DELETE /api/v1/services/:id/media/:mediaId
POST   /api/v1/services/:id/addons      # Link addon
POST   /api/v1/services/:id/duplicate   # Duplicate service
```

### Addons
```
GET    /api/v1/addons              # List all
GET    /api/v1/addons/:id          # Get
POST   /api/v1/addons              # Create
PUT    /api/v1/addons/:id          # Update
DELETE /api/v1/addons/:id          # Delete
```

### Bundles
```
GET    /api/v1/bundles             # List
GET    /api/v1/bundles/:id         # Get with items
POST   /api/v1/bundles             # Create
POST   /api/v1/bundles/:id/items   # Add service to bundle
DELETE /api/v1/bundles/:id         # Delete
```

### Pricing Rules
```
GET    /api/v1/pricing-rules       # List (filter by serviceId)
POST   /api/v1/pricing-rules       # Create
PUT    /api/v1/pricing-rules/:id   # Update
DELETE /api/v1/pricing-rules/:id   # Delete
```

### Authentication (Dev Mode)
All requests require header: `X-Org-Id: <uuid>`

## Database Schema Summary

### Phase 1 Tables (24 tables)

**Multi-tenant Core:**
- `organizations` — المشتركين
- `locations` — مواقع العمل

**Auth & RBAC:**
- `users` — المستخدمين
- `roles` — الأدوار
- `permissions` — الصلاحيات
- `role_permissions` — ربط الأدوار بالصلاحيات
- `sessions` — الجلسات
- `otp_codes` — رموز التحقق
- `audit_logs` — سجل الأحداث

**Service Catalog:**
- `categories` — التصنيفات (شجرة)
- `services` — الخدمات
- `service_media` — صور/فيديو
- `pricing_rules` — قواعد التسعير الذكي
- `addons` — الإضافات
- `service_addons` — ربط الإضافات بالخدمات
- `bundles` — الحزم المركبة
- `bundle_items` — بنود الحزم
- `seasons` — المواسم

**CRM:**
- `customers` — العملاء
- `customer_contacts` — جهات اتصال B2B
- `customer_interactions` — سجل التفاعلات
- `customer_segments` — الشرائح الذكية

**Bookings:**
- `bookings` — الحجوزات
- `booking_items` — بنود الحجز
- `booking_item_addons` — إضافات البنود
- `payments` — المدفوعات
- `booking_pipeline_stages` — مراحل مسار الحجز

---

## ⚠️ Production Migration Strategy

> **Production uses a legacy migrations table called `_migrations` — NOT Drizzle's default `__drizzle_migrations`.**

### Rules

1. **DO NOT** run `pnpm db:migrate` against production. The script is disabled and will exit with an error.
2. Migrations must be applied **manually via SQL** on the production database.
3. After applying a migration, insert a corresponding record into the `_migrations` table:
   ```sql
   INSERT INTO _migrations (name, applied_at)
   VALUES ('NNN_migration_name.sql', NOW());
   ```
4. Running Drizzle's automated migrations will cause conflicts (e.g., `enum already exists`) because the production database was not bootstrapped with `__drizzle_migrations`.

### Deployment

Production deployment is handled by GitHub Actions (`.github/workflows/deploy.yml`).  
The workflow connects to the VPS via SSH and runs:

```
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 restart all
```

**No migration commands are executed during deployment.**
