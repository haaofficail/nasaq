# System Audit — Nasaq Platform

Date: 2026-03-22

## System Overview

**Nasaq** is a multi-vertical SaaS platform for SMBs in Saudi Arabia. It provides a unified booking, CRM, finance, and operations platform customized per business type.

- **Stack**: React 19 + Vite + TypeScript (dashboard) / Hono v4 + Drizzle ORM (API) / PostgreSQL (DB)
- **Deployment**: VPS at 187.124.41.239, managed by PM2
- **Architecture**: pnpm monorepo with apps/dashboard + packages/api + packages/db

## Audit Results

### 1. Business Types Coverage

- **Registered in UI**: 20 types + `general`
- **Have specialty sidebar nav**: 11 types
- **Have specialty API routes**: 7 route prefixes
- **In production DB**: 7 distinct types (salon, flower_shop, rental, cafe, restaurant, events, store)

**Gap**: `store` is a legacy value not in the RegisterPage list (treated as `retail`).

### 2. API Routes Status

| Route | Status | Notes |
|-------|--------|-------|
| auth (register, otp, login) | ACTIVE | `/auth/register` was missing — added 2026-03-22 |
| categories, services, addons | ACTIVE | Full CRUD |
| bookings | ACTIVE | Full pipeline + calendar + stats |
| customers | ACTIVE | CRM + interactions + segments |
| finance | ACTIVE | Invoices + expenses + P&L |
| inventory | ACTIVE | Asset types + assets |
| team | ACTIVE | Members + vendors + shifts + attendance + roles |
| automation | ACTIVE | Rules + templates + logs |
| marketing | ACTIVE | Campaigns + coupons + reviews |
| platform | ACTIVE | API keys + webhooks + app store |
| website | ACTIVE | Pages + config + blog |
| settings | ACTIVE | Profile + locations + subscription |
| suppliers | ACTIVE | Added 2026-03-22 (was missing) |
| pos | ACTIVE | Added 2026-03-22 (was missing) |
| online-orders | ACTIVE | Added 2026-03-22 (was missing) |
| menu | ACTIVE | Added 2026-03-22 (was missing) |
| arrangements | ACTIVE | Added 2026-03-22 (was missing) |
| messaging | ACTIVE | Added 2026-03-22 (was missing) |
| flower-builder | ACTIVE | Added 2026-03-22 (was missing) |

### 3. Database Schema vs Production

**Production DB**: 217 tables
**Local Drizzle schema**: ~15 schema files covering core tables

**Tables in production NOT in local schema**:
- Specialty tables: `menu_items`, `menu_categories`, `pos_transactions`, `pos_settings`, `pos_quick_items`, `online_orders`, `suppliers`, `purchase_orders`, `flower_inventory`, `flower_orders`, `flower_packages`, `flower_builder_items`, `flower_page_configs`, `message_templates`, `message_logs`, `message_settings`, `scheduled_messages`, `whatsapp_sessions`, `message_variables`
- Advanced tables: `restaurant_tables`, `restaurant_orders`, `table_reservations`, `rental_units`, `rental_assets`, `contracts`, and 150+ more

**Resolution**: New API routes use raw SQL via `pool` for tables not in Drizzle schema.

### 4. Dashboard Pages

**All routes registered** in App.tsx:
- Core: 30+ dashboard routes
- Business-specific: 13 specialty routes (menu, kitchen, reservations, schedule, commissions, flower-inventory, arrangements, assets, contracts, inspections, events, packages)

**Pages using placeholder UI** (no live API data):
- KitchenPage — API not implemented yet
- ReservationsPage — API not implemented yet
- ContractsPage — API not implemented yet
- InspectionsPage — API not implemented yet

### 5. Authentication Flow

- **Registration**: `POST /auth/register` → creates org + owner + roles + pipeline stages → sends OTP
- **Login**: `POST /auth/otp/request` → `POST /auth/otp/verify` → returns session token + user (with `businessType`)
- **Session**: Bearer token stored in localStorage, validated by `authMiddleware`
- **businessType** returned in login response and cached in `nasaq_user` localStorage key

### 6. Critical Issues Fixed (2026-03-22)

1. **White page bug**: Added ErrorBoundary in `main.tsx` to show errors instead of blank screen
2. **Missing register endpoint**: Added `POST /auth/register` to `auth.ts`
3. **businessType not in schema**: Added `businessType` column to `organizations.ts` Drizzle schema
4. **Missing specialty routes**: Created 7 new API route files (suppliers, pos, online-orders, menu, arrangements, messaging, flower-builder)
5. **rsync --delete incident**: Destroyed server's specialty route files. Recreated from scratch. Server now stable at 67 restarts total.

## Server Health

- **PM2 Status**: online, 0 unstable restarts
- **DB Connection**: healthy (pg pool connected)
- **API**: responds on port 3000, proxied via Nginx
- **Dashboard**: built and deployed at `/var/www/nasaq/apps/dashboard/dist`
