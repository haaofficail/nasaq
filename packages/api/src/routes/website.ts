import { Hono } from "hono";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { sitePages, siteConfig, blogPosts, contactSubmissions, services, categories, reviews, organizations } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination, generateSlug } from "../lib/helpers";
import { z } from "zod";

const createPageSchema = z.object({
  title: z.string(),
  slug: z.string().optional(),
  type: z.string().optional(),
  blocks: z.array(z.unknown()).optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  showInNavigation: z.boolean().optional(),
});

const updatePageSchema = createPageSchema.partial();

const upsertSiteConfigSchema = z.object({
  templateId: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional().nullable(),
  fontFamily: z.string().optional(),
  headerConfig: z.unknown().optional(),
  footerConfig: z.unknown().optional(),
  defaultMetaTitle: z.string().optional().nullable(),
  defaultMetaDescription: z.string().optional().nullable(),
  googleVerification: z.string().optional().nullable(),
  sitemapEnabled: z.boolean().optional(),
  googleAnalyticsId: z.string().optional().nullable(),
  gtmContainerId: z.string().optional().nullable(),
  facebookPixelId: z.string().optional().nullable(),
  snapchatPixelId: z.string().optional().nullable(),
  tiktokPixelId: z.string().optional().nullable(),
  customHeadCode: z.string().optional().nullable(),
  customBodyCode: z.string().optional().nullable(),
  customDomain: z.string().optional().nullable(),
  whitelabelEnabled: z.boolean().optional(),
  hidePoweredBy: z.boolean().optional(),
});

const createBlogPostSchema = z.object({
  title: z.string(),
  slug: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string(),
  coverImage: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  relatedServiceIds: z.array(z.string()).optional(),
  status: z.string().optional(),
  publishedAt: z.string().optional().nullable(),
  scheduledPublishAt: z.string().optional().nullable(),
});

const updateBlogPostSchema = createBlogPostSchema.partial();

export const websiteRouter = new Hono();

// ============================================================
// SITE PAGES
// ============================================================

websiteRouter.get("/pages", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(sitePages).where(eq(sitePages.orgId, orgId)).orderBy(asc(sitePages.sortOrder));
  return c.json({ data: result });
});

websiteRouter.get("/pages/:slug", async (c) => {
  const orgId = getOrgId(c);
  const [page] = await db.select().from(sitePages).where(and(eq(sitePages.orgId, orgId), eq(sitePages.slug, c.req.param("slug"))));
  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);
  return c.json({ data: page });
});

websiteRouter.post("/pages", async (c) => {
  const orgId = getOrgId(c);
  const body = createPageSchema.parse(await c.req.json());
  const slug = body.slug || generateSlug(body.title);
  const [page] = await db.insert(sitePages).values({ orgId, ...body, slug }).returning();
  return c.json({ data: page }, 201);
});

websiteRouter.put("/pages/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updatePageSchema.parse(await c.req.json());
  const [updated] = await db.update(sitePages).set({ ...body, updatedAt: new Date() })
    .where(and(eq(sitePages.id, c.req.param("id")), eq(sitePages.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الصفحة غير موجودة" }, 404);
  return c.json({ data: updated });
});

websiteRouter.delete("/pages/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(sitePages)
    .where(and(eq(sitePages.id, c.req.param("id")), eq(sitePages.orgId, orgId))).returning();
  if (!deleted) return c.json({ error: "الصفحة غير موجودة" }, 404);
  return c.json({ data: deleted });
});

// ============================================================
// SITE CONFIG
// ============================================================

websiteRouter.get("/config", async (c) => {
  const orgId = getOrgId(c);
  const [config] = await db.select().from(siteConfig).where(eq(siteConfig.orgId, orgId));
  return c.json({ data: config || null });
});

websiteRouter.put("/config", async (c) => {
  const orgId = getOrgId(c);
  const body = upsertSiteConfigSchema.parse(await c.req.json());
  const [existing] = await db.select().from(siteConfig).where(eq(siteConfig.orgId, orgId));
  if (existing) {
    const [updated] = await db.update(siteConfig).set({ ...body, updatedAt: new Date() })
      .where(eq(siteConfig.id, existing.id)).returning();
    return c.json({ data: updated });
  }
  const [created] = await db.insert(siteConfig).values({ orgId, ...body }).returning();
  return c.json({ data: created }, 201);
});

// ============================================================
// BLOG
// ============================================================

websiteRouter.get("/blog", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const conditions = [eq(blogPosts.orgId, orgId)];
  if (status) conditions.push(eq(blogPosts.status, status));
  const [result, [{ total }]] = await Promise.all([
    db.select().from(blogPosts).where(and(...conditions)).orderBy(desc(blogPosts.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(blogPosts).where(and(...conditions)),
  ]);
  return c.json({ data: result, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

websiteRouter.post("/blog", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createBlogPostSchema.parse(await c.req.json());
  const slug = body.slug || generateSlug(body.title);
  const [post] = await db.insert(blogPosts).values({
    orgId, authorId: userId, ...body, slug,
    publishedAt: body.status === "published" ? new Date() : null,
  }).returning();
  return c.json({ data: post }, 201);
});

websiteRouter.put("/blog/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateBlogPostSchema.parse(await c.req.json());
  const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
  if (body.status === "published" && !body.publishedAt) updates.publishedAt = new Date();
  const [updated] = await db.update(blogPosts).set(updates)
    .where(and(eq(blogPosts.id, c.req.param("id")), eq(blogPosts.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "المقال غير موجود" }, 404);
  return c.json({ data: updated });
});

websiteRouter.delete("/blog/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(blogPosts)
    .where(and(eq(blogPosts.id, c.req.param("id")), eq(blogPosts.orgId, orgId))).returning();
  if (!deleted) return c.json({ error: "المقال غير موجود" }, 404);
  return c.json({ data: deleted });
});

// ============================================================
// CONTACT FORM
// ============================================================

websiteRouter.get("/contacts", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(contactSubmissions).where(eq(contactSubmissions.orgId, orgId)).orderBy(desc(contactSubmissions.createdAt));
  return c.json({ data: result });
});

// Public endpoint — no auth
websiteRouter.post("/contacts/submit", async (c) => {
  const body = await c.req.json();
  if (!body.orgId || !body.name || !body.message) return c.json({ error: "البيانات مطلوبة" }, 400);
  const [submission] = await db.insert(contactSubmissions).values(body).returning();
  return c.json({ data: { id: submission.id, message: "تم استلام رسالتك — سنتواصل معك قريباً" } }, 201);
});

websiteRouter.patch("/contacts/:id/read", async (c) => {
  const [updated] = await db.update(contactSubmissions).set({ isRead: true })
    .where(eq(contactSubmissions.id, c.req.param("id"))).returning();
  return c.json({ data: updated });
});

// ============================================================
// PUBLIC SITE RENDERING — endpoints for the public website (SSR/SSG)
// ============================================================

websiteRouter.get("/public/:orgSlug", async (c) => {
  const slug = c.req.param("orgSlug");
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
  if (!org) return c.json({ error: "الموقع غير موجود" }, 404);

  const [config] = await db.select().from(siteConfig).where(eq(siteConfig.orgId, org.id));
  const pages = await db.select().from(sitePages)
    .where(and(eq(sitePages.orgId, org.id), eq(sitePages.isPublished, true), eq(sitePages.showInNavigation, true)))
    .orderBy(asc(sitePages.sortOrder));

  const activeServices = await db.select().from(services)
    .where(and(eq(services.orgId, org.id), eq(services.status, "active")))
    .orderBy(asc(services.sortOrder)).limit(20);

  const recentPosts = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.orgId, org.id), eq(blogPosts.status, "published")))
    .orderBy(desc(blogPosts.publishedAt)).limit(5);

  const latestReviews = await db.select().from(reviews)
    .where(and(eq(reviews.orgId, org.id), eq(reviews.isPublished, true)))
    .orderBy(desc(reviews.createdAt)).limit(6);

  return c.json({
    data: {
      org: { id: org.id, name: org.name, slug: org.slug, phone: org.phone, logo: org.logo, city: org.city, primaryColor: config?.primaryColor || org.primaryColor },
      config,
      pages,
      services: activeServices,
      blog: recentPosts,
      reviews: latestReviews,
    },
  });
});

websiteRouter.get("/public/:orgSlug/page/:pageSlug", async (c) => {
  const orgSlug = c.req.param("orgSlug");
  const pageSlug = c.req.param("pageSlug");
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, orgSlug));
  if (!org) return c.json({ error: "الموقع غير موجود" }, 404);
  const [page] = await db.select().from(sitePages)
    .where(and(eq(sitePages.orgId, org.id), eq(sitePages.slug, pageSlug), eq(sitePages.isPublished, true)));
  if (!page) return c.json({ error: "الصفحة غير موجودة" }, 404);
  return c.json({ data: page });
});

websiteRouter.get("/public/:orgSlug/blog", async (c) => {
  const orgSlug = c.req.param("orgSlug");
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, orgSlug));
  if (!org) return c.json({ error: "الموقع غير موجود" }, 404);
  const { page, limit, offset } = getPagination(c);
  const result = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.orgId, org.id), eq(blogPosts.status, "published")))
    .orderBy(desc(blogPosts.publishedAt)).limit(limit).offset(offset);
  return c.json({ data: result });
});
