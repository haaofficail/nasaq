# Storefront Audit — نسق

## What Exists

### DB Layer (packages/db/schema/website.ts)
- `sitePages` — block-based page builder with JSONB blocks array ✓
- `siteConfig` — template, branding, SEO, analytics, domain, custom code ✓
- `blogPosts` — full blog with SEO + linked services ✓
- `contactSubmissions` — contact form submissions ✓

### API Layer (packages/api/src/routes/website.ts)
- `GET/POST/PUT/DELETE /website/pages` — CRUD for pages ✓
- `GET/PUT /website/config` — site configuration ✓
- `GET/POST/PUT /website/blog` — blog management ✓
- `GET /website/contacts` — contact submissions ✓
- `GET /website/public/:orgSlug` — public endpoint returns org + config + services + blog + reviews ✓
- `GET /website/public/:orgSlug/page/:pageSlug` — individual page ✓
- `GET /website/public/:orgSlug/blog` — public blog ✓
- **MISSING**: categories and addons not included in public endpoint
- **MISSING**: `DELETE /website/pages/:id` exists in code but not in api.ts client
- **MISSING**: blog CRUD in api.ts (only `createPost`, no update/delete)

### Dashboard Layer — FRAGMENTED
| File | Lines | Problem |
|------|-------|---------|
| `SiteBuilderPage.tsx` | 156 | Basic tabs: pages list, blog list, basic config — no design quality |
| `PageBuilderPage.tsx` | 461 | Good block editor BUT standalone — loads first page, not connected to page selection |
| `WebsiteSettingsPage.tsx` | 380 | Settings: identity + contact + website + business — overlaps with SettingsPage |

### Public Layer — CRITICALLY MISSING
- **`/book/:slug`** — booking flow only (not a real website) ✓ (working)
- **`/flowers/:slug`** — flower shop public page ✓ (working)
- **`/s/:orgSlug`** — actual merchant website — **DOES NOT EXIST**
- `PublicLayout.tsx` — is Nasaq platform layout, NOT merchant storefront layout

---

## What Can Be Reused
- All DB schema — no changes needed
- All API routes — minor additions needed
- `PageBuilderPage.tsx` block editor logic — will be integrated into StorefrontPage
- `websiteApi` client methods — extend, not rewrite
- The public endpoint `/website/public/:orgSlug` — enhance, not rebuild

## What's Disorganized
- 3 separate nav entries for website management (should be 1)
- Route duplication: `/dashboard/website/settings` AND `/dashboard/settings/website`
- Block editor not linked to page selection
- PublicLayout.tsx naming is misleading (it's for Nasaq marketing pages)

## What's Broken/Incomplete
- No public merchant storefront website
- Template selector has no UI (field exists in DB, unused)
- Custom domain has no management UI
- Analytics IDs have no management UI
- PageBuilderPage loads first page hardcoded — broken UX

## What Needs to Be Built
1. **`StorefrontPage.tsx`** — unified dashboard module replacing 3 fragmented pages
2. **`PublicStorefrontPage.tsx`** — the actual merchant website at `/s/:orgSlug`
3. **Enhanced public API** — add categories + addons to public endpoint
4. **Route cleanup** — remove duplicates, update nav

## What Must NOT Be Duplicated
- Service data — public storefront reads from existing services API, never copies
- Category data — same
- Org profile data — StorefrontPage reads from existing profile API
