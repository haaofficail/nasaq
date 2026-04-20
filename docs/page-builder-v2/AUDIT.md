# Page Builder v2 — Audit Report
**Date:** 2026-04-20
**Status:** Awaiting approval before production code begins

---

## 1. shadcn/ui

**Status: NOT INSTALLED**

- No `@shadcn` or `shadcn-ui` package in any `package.json` across the workspace
- The dashboard uses a custom Tailwind component library at `apps/dashboard/src/components/ui/`
- Components include: `ModernSelect`, `ModernInput`, `FilterBar`, `design-system.tsx`

**Decision required:** Install shadcn/ui as specified, or continue with existing custom components?

---

## 2. Puck (@measured/puck)

**Status: NOT INSTALLED**

- No `@measured/puck` dependency found anywhere in the workspace
- Needs to be installed in a new `packages/page-builder-v2` package

---

## 3. Routing Structure

**File:** `apps/dashboard/src/App.tsx`

All `/dashboard/*` routes are wrapped in `<RequireAuth><Layout />` (line 323).

**Relevant existing routes:**

| Path | Component | Line |
|------|-----------|------|
| `/dashboard/website` | `WebsitePage` | 384 |
| `/dashboard/storefront` | `StorefrontPage` | 383 |
| `/dashboard/settings/website` | `WebsiteSettingsPage` | 404 |
| `/dashboard/media` | `MediaLibraryPage` | 479 |

**No `/dashboard/pages-v2` route exists** — needs to be added.
**v1 stays at `/dashboard/website`** — not touched.

---

## 4. Auth Middleware

**File:** `packages/api/src/middleware/auth.ts`

Full auth pattern is working. Three middleware functions available:

```typescript
authMiddleware()          // Validates token, sets c.get("orgId") + c.get("user")
requireCapability(key)    // Checks org-level feature flag
requirePerm(permissions)  // Checks role-based permissions
```

**Application pattern (from existing routes):**
```typescript
app.use("/api/v2/pages/*", authMiddleware);
app.use("/api/v2/pages/*", requireCapability("page_builder_v2"));
```

**Dev bypass:** Works via `X-Org-Id` + `X-User-Id` headers when `NODE_ENV=development && DEV_AUTH_BYPASS=true`.

---

## 5. Existing Page Builder Tables (v1)

**File:** `packages/db/schema/website.ts`

| Table | Purpose | Key column |
|-------|---------|------------|
| `sitePages` | Per-page content | `blocks` JSONB |
| `siteConfig` | Global site branding/config | `builderConfig` JSONB |
| `blogPosts` | Blog content | `content` text |
| `contactSubmissions` | Contact form data | `isRead` bool |
| `websiteTemplates` | Global template catalog | `templateId` text |

**v1 block types already in use:** `hero`, `services_grid`, `text`, `gallery`, `testimonials`, `contact_form`, `map`, `faq`, `cta`, `embed`

**Rule:** v2 creates new tables (`pages_v2`, `page_versions_v2`). None of these are touched.

---

## 6. Feature Flag / Capability System

**File:** `packages/api/src/lib/org-context.ts` + `packages/db/schema/capabilities.ts`

5-layer resolution: business_type → plan → operating_profile → org_stored → override

To enable page_builder_v2:
1. Insert row into `capabilityRegistry`: `{ key: "page_builder_v2", category: "marketing", labelAr: "منشئ الصفحات v2" }`
2. Insert rows into `plan_capabilities` for desired plans
3. Apply `requireCapability("page_builder_v2")` to all `/api/v2/pages/*` routes

---

## 7. Existing API — Website Routes

**File:** `packages/api/src/routes/website.ts` (894 lines)

**Existing endpoints (v1 — NOT touched):**

```
GET    /website/pages
GET    /website/pages/:slug
POST   /website/pages
PUT    /website/pages/:id
DELETE /website/pages/:id
GET    /website/config
PUT    /website/config
GET    /website/blog
POST   /website/blog
GET    /website/storefront-settings
PUT    /website/storefront-settings
GET    /website/public/:orgSlug
GET    /website/public/:orgSlug/page/:pageSlug
POST   /website/public/:orgSlug/book
```

**v2 routes live in a new namespace: `/api/v2/pages/*`** — zero overlap with v1.

---

## 8. Workspace Structure

```
nasaq/
├── apps/
│   └── dashboard/          @nasaq/dashboard  (React 19 + Vite + Tailwind)
├── packages/
│   ├── api/                @nasaq/api         (Hono + Node.js)
│   ├── db/                 @nasaq/db          (Drizzle ORM + PostgreSQL)
│   └── shared/             @nasaq/shared      (TypeScript types/constants)
└── docs/
    └── page-builder-v2/    (this audit)
```

**New package to create:** `packages/page-builder-v2` — will house Puck config + all 28 blocks.

---

## 9. Blockers & Decisions Needed

### Decision 1 — shadcn/ui
The spec calls for shadcn/ui. The repo has a working custom Tailwind UI library.
- **Option A:** Install shadcn/ui alongside existing components (adds ~40KB gzip)
- **Option B:** Build blocks using only existing custom components + Tailwind
- **Recommendation:** Option B — avoids dependency conflicts, keeps bundle lean, aligns with existing codebase style

### Decision 2 — Puck version pinning
`@measured/puck` is at v0.18.x currently (latest stable). Breaking changes expected in v1.
- Will pin to `0.18.0` and lock in `pnpm-lock.yaml`

### Decision 3 — New package vs co-located
Spec says `packages/page-builder-v2/`. This means:
- A new workspace package with its own `package.json`
- Depends on `@nasaq/db` (for types) and `@measured/puck`
- Imported by `apps/dashboard` as `@nasaq/page-builder-v2`
- **Confirmed: will create this structure**

### Decision 4 — Migration script
v1 `sitePages.blocks` uses 10 basic block types with simple JSON.
v2 Puck blocks will have a richer schema.
- Migration script will be built in Week 5 after v2 is stable
- v1 data is preserved — migration is opt-in per org

---

## 10. Deployment Process

Based on codebase and memory:
1. Push to `github remote main`
2. SSH into server: `cd /var/www/nasaq && git fetch origin main && git reset --hard origin/main && pnpm build && pm2 restart nasaq-api`
3. Dashboard served as static files by nginx — no separate pm2 process

---

## Confirmed Execution Plan — Week 1

| Day | Task |
|-----|------|
| **Day 1** | AUDIT (this file) — awaiting approval |
| **Day 2** | Install Puck, create `packages/page-builder-v2`, setup `puck-config.ts` skeleton |
| **Day 3** | Create Drizzle schema (`pages_v2`, `page_versions_v2`), run migration, seed 1 dev page |
| **Day 4** | Build `/api/v2/pages` CRUD endpoints with full auth + orgId scoping |
| **Day 5** | Wire up editor UI at `/dashboard/pages-v2` with 1 working Hero block end-to-end |

**Verification gate at end of Day 5:**
Create page → Add Hero block → Edit Arabic text → Save → Reload → Page renders on storefront

---

## Status

**Awaiting your approval to proceed to Day 2.**

Confirm or modify any of the 4 decisions above, then say "proceed" to begin.
