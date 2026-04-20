/**
 * /api/v2/storefront — Public Storefront v2 routes
 *
 * Auth: NONE — all endpoints are public (no orgId from session)
 *
 * Replaces: /api/v1/website/public/* (legacy website.ts public routes)
 *
 * Endpoints:
 *   GET  /storefront/:orgSlug               — org info + services + v2 pages
 *   GET  /storefront/:orgSlug/page/:slug    — single published v2 page
 *   POST /storefront/:orgSlug/contact       — save contact form submission
 *   POST /storefront/:orgSlug/book          — public booking (proxied from website.ts)
 *
 * Auth-protected:
 *   GET  /storefront/analytics              — org analytics (requires authMiddleware upstream)
 */

import { Hono } from "hono";
import { eq, and, desc, asc, count, sql, inArray } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import {
  organizations,
  services,
  categories,
  locations,
  reviews,
  addons,
  serviceAddons,
  serviceQuestions,
  pagesV2,
  contactSubmissions,
} from "@nasaq/db/schema";
import { z } from "zod";
import { getOrgId } from "../lib/helpers";

// ── Rate limiter (lightweight in-memory) ──────────────────────

const _contactRateMap = new Map<string, { count: number; resetAt: number }>();
const CONTACT_RATE_MAX    = 5;
const CONTACT_RATE_WINDOW = 10 * 60 * 1000; // 10 min

function contactAllowed(ip: string): boolean {
  const now = Date.now();
  const entry = _contactRateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    _contactRateMap.set(ip, { count: 1, resetAt: now + CONTACT_RATE_WINDOW });
    return true;
  }
  if (entry.count >= CONTACT_RATE_MAX) return false;
  entry.count++;
  return true;
}

// ── Zod ──────────────────────────────────────────────────────

const contactSchema = z.object({
  name:    z.string().min(1).max(120),
  phone:   z.string().min(7).max(20),
  email:   z.string().email().optional().nullable(),
  message: z.string().min(1).max(2000),
  pageSlug: z.string().optional().nullable(),
});

// ── Shared helper: fetch org public data ─────────────────────
// Returns the full org context used by both the public site
// and the public booking page.

async function fetchPublicOrgData(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug));

  if (!org) return null;

  // Published v2 pages (navigation list only — no draft data)
  const navPages = await db
    .select({
      id:               pagesV2.id,
      slug:             pagesV2.slug,
      title:            pagesV2.title,
      pageType:         pagesV2.pageType,
      sortOrder:        pagesV2.sortOrder,
      showInNavigation: pagesV2.showInNavigation,
    })
    .from(pagesV2)
    .where(
      and(
        eq(pagesV2.orgId, org.id),
        eq(pagesV2.status, "published"),
        eq(pagesV2.showInNavigation, true),
      ),
    )
    .orderBy(asc(pagesV2.sortOrder));

  // Services (active + visible online)
  const activeServices = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.orgId, org.id),
        eq(services.status, "active"),
        eq((services as any).isVisibleOnline, true),
      ),
    )
    .orderBy(asc(services.sortOrder))
    .limit(24);

  const serviceIds = activeServices.map(s => s.id);

  const allServiceAddons = serviceIds.length > 0
    ? await db
        .select({
          serviceId:     serviceAddons.serviceId,
          id:            addons.id,
          name:          addons.name,
          nameEn:        addons.nameEn,
          price:         addons.price,
          description:   addons.description,
          image:         addons.image,
          type:          addons.type,
          priceOverride: serviceAddons.priceOverride,
          typeOverride:  serviceAddons.typeOverride,
          sortOrder:     serviceAddons.sortOrder,
        })
        .from(serviceAddons)
        .innerJoin(addons, eq(serviceAddons.addonId, addons.id))
        .where(
          and(
            inArray(serviceAddons.serviceId, serviceIds),
            eq(addons.isActive, true),
          ),
        )
        .orderBy(asc(serviceAddons.sortOrder))
    : [];

  const addonsByService = allServiceAddons.reduce<Record<string, unknown[]>>(
    (acc, a) => {
      const row = { ...a, price: a.priceOverride ?? a.price };
      if (!acc[a.serviceId]) acc[a.serviceId] = [];
      acc[a.serviceId].push(row);
      return acc;
    },
    {},
  );

  const allQuestions = serviceIds.length > 0
    ? await db
        .select()
        .from(serviceQuestions)
        .where(
          and(
            inArray(serviceQuestions.serviceId, serviceIds),
            eq(serviceQuestions.isActive, true),
          ),
        )
        .orderBy(asc(serviceQuestions.sortOrder))
    : [];

  const questionsByService = allQuestions.reduce<Record<string, unknown[]>>(
    (acc, q) => {
      if (!acc[q.serviceId]) acc[q.serviceId] = [];
      acc[q.serviceId].push(q);
      return acc;
    },
    {},
  );

  const activeCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.orgId, org.id), eq(categories.isActive, true)))
    .orderBy(asc(categories.sortOrder));

  const branchList = await db
    .select()
    .from(locations)
    .where(and(eq(locations.orgId, org.id), eq(locations.isActive, true)));

  const latestReviews = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.orgId, org.id), eq(reviews.isPublished, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(6);

  const [ratingRow] = await db
    .select({
      avg: sql<string>`AVG(${reviews.rating})`,
      cnt: count(reviews.id),
    })
    .from(reviews)
    .where(and(eq(reviews.orgId, org.id), eq(reviews.isPublished, true)));

  // Increment storefront view count (fire-and-forget)
  db.execute(sql`
    UPDATE organizations SET settings = jsonb_set(
      COALESCE(settings, '{}'),
      '{storefrontViews}',
      (COALESCE((settings->>'storefrontViews')::int, 0) + 1)::text::jsonb
    ) WHERE id = ${org.id}
  `).catch(() => {});

  // Flower section (raw SQL — schema managed outside drizzle)
  let flowerSection: unknown = null;
  try {
    const fpcRow = await pool.query(
      `SELECT config FROM flower_page_configs WHERE org_id = $1 LIMIT 1`,
      [org.id],
    );
    const fpc = fpcRow.rows[0]?.config;
    if (fpc?.isPublic) {
      const pkgsRow = await pool.query(
        `SELECT id, name, description, base_price AS "basePrice", image, is_active AS "isActive"
         FROM flower_packages WHERE org_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 8`,
        [org.id],
      );
      const invRow = await pool.query(
        `SELECT id, name, color, type, sell_price AS "sellPrice", stock, image_url AS "imageUrl"
         FROM flower_inventory WHERE org_id = $1 AND stock > 0 AND (is_hidden IS NULL OR is_hidden = false)
         ORDER BY name ASC LIMIT 12`,
        [org.id],
      );
      flowerSection = {
        isEnabled:    true,
        heroTitle:    fpc.heroTitle    || "باقات ورود مخصصة",
        heroSubtitle: fpc.heroSubtitle || "اصنع لحظتك بيدك",
        heroImage:    fpc.heroImage    || null,
        accentColor:  fpc.accentColor  || "#e11d48",
        packages:     pkgsRow.rows,
        inventory:    invRow.rows,
        builderUrl:   `/flowers/${org.slug}`,
      };
    }
  } catch { /* non-critical */ }

  return {
    org: {
      id:           org.id,
      name:         org.name,
      nameEn:       org.nameEn,
      slug:         org.slug,
      phone:        org.phone,
      email:        org.email,
      logo:         org.logo,
      city:         org.city,
      address:      org.address,
      description:  org.description,
      tagline:      org.tagline,
      coverImage:   org.coverImage,
      instagram:    org.instagram,
      twitter:      org.twitter,
      tiktok:       org.tiktok,
      snapchat:     org.snapchat,
      businessType: org.businessType,
      // v2: primaryColor comes directly from org (no site_config dual-write)
      primaryColor:   org.primaryColor   || "#5b9bd5",
      secondaryColor: org.secondaryColor || null,
    },
    // config: null — v2 no longer uses site_config
    // Clients already fall back to org.primaryColor, org.logo, etc.
    config: null,
    pages:              navPages,
    blog:               [],          // no blog in v2
    services:           activeServices,
    addonsByService,
    questionsByService,
    categories:         activeCategories,
    branches:           branchList,
    reviews:            latestReviews,
    stats: {
      avgRating:    ratingRow?.avg ? Number(ratingRow.avg).toFixed(1) : null,
      reviewCount:  Number(ratingRow?.cnt ?? 0),
      serviceCount: activeServices.length,
    },
    flowerSection,
  };
}

// ── Router ────────────────────────────────────────────────────

export const storefrontV2Router = new Hono();

// ── Auth-protected analytics (must be BEFORE /:orgSlug to avoid param capture) ──

storefrontV2Router.get("/analytics", async (c) => {
  const orgId = getOrgId(c);

  const [org] = await db
    .select({ slug: organizations.slug, settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const [publishedPages] = await db
    .select({ cnt: count(pagesV2.id) })
    .from(pagesV2)
    .where(and(eq(pagesV2.orgId, orgId), eq(pagesV2.status, "published")));

  const [inquiries] = await db
    .select({ cnt: count(contactSubmissions.id) })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.orgId, orgId));

  const [ratingRow] = await db
    .select({
      avg: sql<string>`AVG(${reviews.rating})`,
      cnt: count(reviews.id),
    })
    .from(reviews)
    .where(and(eq(reviews.orgId, orgId), eq(reviews.isPublished, true)));

  const settings = (org?.settings ?? {}) as Record<string, unknown>;

  return c.json({
    data: {
      storefrontViews: Number(settings.storefrontViews ?? 0),
      inquiries:       Number(inquiries?.cnt ?? 0),
      publishedPages:  Number(publishedPages?.cnt ?? 0),
      publishedPosts:  0,  // no blog in v2
      reviewCount:     Number(ratingRow?.cnt ?? 0),
      avgRating:       ratingRow?.avg ? Number(ratingRow.avg).toFixed(1) : null,
      storefrontUrl:   org?.slug ? `/s/${org.slug}` : null,
    },
  });
});

// ── GET /api/v2/storefront/:orgSlug ──────────────────────────

storefrontV2Router.get("/:orgSlug", async (c) => {
  const slug = c.req.param("orgSlug");
  const data = await fetchPublicOrgData(slug);
  if (!data) return c.json({ error: "الموقع غير موجود" }, 404);
  return c.json({ data });
});

// ── GET /api/v2/storefront/:orgSlug/page/:slug ───────────────

storefrontV2Router.get("/:orgSlug/page/:pageSlug", async (c) => {
  const orgSlug  = c.req.param("orgSlug");
  const pageSlug = c.req.param("pageSlug");

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, primaryColor: organizations.primaryColor })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug));

  if (!org) return c.json({ error: "الموقع غير موجود" }, 404);

  const [page] = await db
    .select({
      id:              pagesV2.id,
      slug:            pagesV2.slug,
      title:           pagesV2.title,
      pageType:        pagesV2.pageType,
      publishedData:   pagesV2.publishedData,
      publishedAt:     pagesV2.publishedAt,
      metaTitle:       pagesV2.metaTitle,
      metaDescription: pagesV2.metaDescription,
      ogImage:         pagesV2.ogImage,
    })
    .from(pagesV2)
    .where(
      and(
        eq(pagesV2.orgId, org.id),
        eq(pagesV2.slug, pageSlug),
        eq(pagesV2.status, "published"),
      ),
    );

  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);

  return c.json({ data: { ...page, org } });
});

// ── POST /api/v2/storefront/:orgSlug/contact ─────────────────

storefrontV2Router.post("/:orgSlug/contact", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
  if (!contactAllowed(ip)) return c.json({ error: "تم تجاوز الحد المسموح به. حاول مجدداً بعد قليل." }, 429);

  const orgSlug = c.req.param("orgSlug");
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug));
  if (!org) return c.json({ error: "المنشأة غير موجودة" }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "بيانات غير صحيحة", details: parsed.error.flatten() }, 400);
  }

  const { name, phone, email, message, pageSlug } = parsed.data;

  const [submission] = await db
    .insert(contactSubmissions)
    .values({
      orgId:   org.id,
      name,
      phone,
      email:   email ?? null,
      message,
      source:  "storefront_v2",
      pageSlug: pageSlug ?? null,
    })
    .returning({ id: contactSubmissions.id });

  return c.json(
    { data: { id: submission.id, message: "تم استلام رسالتك — سنتواصل معك قريباً" } },
    201,
  );
});
