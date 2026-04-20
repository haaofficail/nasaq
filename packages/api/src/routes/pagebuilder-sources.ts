/**
 * /api/v2/pagebuilder/sources — Page Builder v2 dynamic data sources
 *
 * Auth:   authMiddleware (mounted in index.ts)
 * Gate:   requireCapability("page_builder_v2")
 *
 * Endpoints:
 *   GET /sources/products   — products list for ProductsGrid block
 *   GET /sources/categories — categories for external Puck field
 *
 * Security:
 *   - orgId is ALWAYS taken from auth context (never from query params)
 *   - Client cannot override orgId
 */

import { Hono } from "hono";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { services, serviceMedia, categories } from "@nasaq/db/schema";
import { getOrgId } from "../lib/helpers";

export const pagebuildersourcesRouter = new Hono();

// ── Helpers ───────────────────────────────────────────────────

const DEFAULT_LIMIT = 8;
const MAX_LIMIT     = 50;

function parseLimit(raw: string | undefined): number {
  const n = parseInt(raw ?? "", 10);
  if (isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

// ═══════════════════════════════════════════════════════════════
// GET /sources/products
// ═══════════════════════════════════════════════════════════════

pagebuildersourcesRouter.get("/sources/products", async (c) => {
  const orgId = getOrgId(c);       // ← from auth context — never from query

  const rawLimit    = c.req.query("limit");
  const categoryId  = c.req.query("categoryId");
  const featured    = c.req.query("featured");
  const sortBy      = c.req.query("sortBy") ?? "newest";

  const limit = parseLimit(rawLimit);

  // ── Build WHERE conditions ──────────────────────────────────
  const conditions: ReturnType<typeof eq>[] = [
    eq(services.orgId, orgId),
    eq(services.status, "active" as never),
  ];

  if (categoryId) {
    conditions.push(eq(services.categoryId, categoryId) as never);
  }

  if (featured === "true") {
    conditions.push(eq(services.isFeatured, true) as never);
  }

  // ── ORDER BY ────────────────────────────────────────────────
  type OrderFn = typeof desc | typeof asc;
  let orderExpr: ReturnType<OrderFn>;
  switch (sortBy) {
    case "price_asc":   orderExpr = asc(services.basePrice);      break;
    case "price_desc":  orderExpr = desc(services.basePrice);     break;
    case "popular":     orderExpr = desc(services.totalBookings); break;
    case "newest":
    default:            orderExpr = desc(services.createdAt);     break;
  }

  // ── Main products query ─────────────────────────────────────
  const rows = await db
    .select({
      id:         services.id,
      name:       services.name,
      slug:       services.slug,
      price:      services.basePrice,
      currency:   services.currency,
      isFeatured: services.isFeatured,
    })
    .from(services)
    .where(and(...conditions))
    .orderBy(orderExpr)
    .limit(limit);

  if (rows.length === 0) {
    return c.json({ products: [] });
  }

  // ── Attach cover images in a single batch query ─────────────
  const ids = rows.map((r) => r.id);

  const covers = await db
    .select({
      serviceId: serviceMedia.serviceId,
      url:       serviceMedia.url,
      altText:   serviceMedia.altText,
    })
    .from(serviceMedia)
    .where(
      and(
        inArray(serviceMedia.serviceId, ids),
        eq(serviceMedia.isActive as never, true),
        eq(serviceMedia.isCover as never, true),
      )
    )
    .limit(ids.length);

  const coverMap: Record<string, { url: string; altText: string | null }> = {};
  for (const c2 of covers) {
    coverMap[c2.serviceId] = { url: c2.url, altText: c2.altText };
  }

  const products = rows.map((r) => ({
    id:        r.id,
    name:      r.name,
    slug:      r.slug,
    price:     r.price,
    currency:  r.currency,
    imageUrl:  coverMap[r.id]?.url   ?? null,
    imageAlt:  coverMap[r.id]?.altText ?? null,
  }));

  return c.json({ products });
});

// ═══════════════════════════════════════════════════════════════
// GET /sources/categories
// ═══════════════════════════════════════════════════════════════

pagebuildersourcesRouter.get("/sources/categories", async (c) => {
  const orgId = getOrgId(c);       // ← from auth context — never from query

  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.orgId, orgId), eq(categories.isActive, true)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return c.json(rows);
});
