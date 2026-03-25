import { Hono } from "hono";
import { eq, and, desc, asc, count, sql, ne, inArray, notInArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { sitePages, siteConfig, blogPosts, contactSubmissions, services, categories, reviews, organizations, locations, websiteTemplates, bookings, bookingItems, bookingItemAddons, customers, addons, serviceAddons, serviceQuestions } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination, generateSlug, generateBookingNumber } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { z } from "zod";
import { DEFAULT_VAT_RATE, BOOKING_TRACKING_TOKEN_LENGTH } from "../lib/constants";

// ── In-memory rate limiter for public booking (resets on restart — lightweight, no Redis needed) ──
const _bookingRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX    = 10;                  // max bookings per window per IP
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;     // 10 minutes

function publicBookAllowed(ip: string): boolean {
  const now = Date.now();
  const entry = _bookingRateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    _bookingRateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

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
  builderConfig: z.unknown().optional(),
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
  const result = await db.select().from(sitePages)
    .where(and(eq(sitePages.orgId, orgId), eq(sitePages.isActive, true)))
    .orderBy(asc(sitePages.sortOrder));
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
  const [updated] = await db.update(sitePages)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(sitePages.id, c.req.param("id")), eq(sitePages.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "الصفحة غير موجودة" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "site_page", resourceId: updated.id });
  return c.json({ data: updated });
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
// PUBLISH / UNPUBLISH
// ============================================================

websiteRouter.post("/publish", async (c) => {
  const orgId = getOrgId(c);
  const [existing] = await db.select().from(siteConfig).where(eq(siteConfig.orgId, orgId));
  if (existing) {
    const [updated] = await db.update(siteConfig).set({ isPublished: true, updatedAt: new Date() })
      .where(eq(siteConfig.id, existing.id)).returning();
    return c.json({ data: updated });
  }
  const [created] = await db.insert(siteConfig).values({ orgId, isPublished: true }).returning();
  return c.json({ data: created }, 201);
});

websiteRouter.post("/unpublish", async (c) => {
  const orgId = getOrgId(c);
  const [existing] = await db.select().from(siteConfig).where(eq(siteConfig.orgId, orgId));
  if (!existing) return c.json({ error: "لا يوجد موقع لإلغاء نشره" }, 404);
  const [updated] = await db.update(siteConfig).set({ isPublished: false, updatedAt: new Date() })
    .where(eq(siteConfig.id, existing.id)).returning();
  return c.json({ data: updated });
});

// ============================================================
// TEMPLATES (public registry)
// ============================================================

websiteRouter.get("/templates", async (c) => {
  const templates = await db.select().from(websiteTemplates)
    .where(eq(websiteTemplates.isActive, true))
    .orderBy(asc(websiteTemplates.sortOrder));
  return c.json({ data: templates });
});

// ============================================================
// BLOG
// ============================================================

websiteRouter.get("/blog", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const conditions: any[] = [eq(blogPosts.orgId, orgId), ne(blogPosts.status, "archived")];
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
  const { publishedAt: paBody, scheduledPublishAt, ...blogRest } = body;
  const [post] = await db.insert(blogPosts).values({
    orgId, authorId: userId, ...blogRest, slug,
    publishedAt: body.status === "published" ? new Date() : (paBody ? new Date(paBody) : null),
    ...(scheduledPublishAt !== undefined && { scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null }),
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
  const [updated] = await db.update(blogPosts)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(blogPosts.id, c.req.param("id")), eq(blogPosts.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "المقال غير موجود" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "blog_post", resourceId: updated.id });
  return c.json({ data: updated });
});

// ============================================================
// CONTACT FORM
// ============================================================

websiteRouter.get("/contacts", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(contactSubmissions).where(eq(contactSubmissions.orgId, orgId)).orderBy(desc(contactSubmissions.createdAt));
  return c.json({ data: result });
});

// Public endpoint — mounted under /website/public/ to bypass auth middleware
websiteRouter.post("/public/contacts/submit", async (c) => {
  const body = await c.req.json();
  if (!body.orgId || !body.name || !body.message) return c.json({ error: "البيانات مطلوبة" }, 400);
  // Verify org exists before inserting
  const [org] = await db.select({ id: organizations.id })
    .from(organizations).where(eq(organizations.id, body.orgId));
  if (!org) return c.json({ error: "المنشأة غير موجودة" }, 404);

  const [submission] = await db.insert(contactSubmissions).values({
    orgId: body.orgId,
    name: body.name,
    phone: body.phone ?? null,
    email: body.email ?? null,
    message: body.message,
    source: body.source ?? "website",
    pageSlug: body.pageSlug ?? null,
  }).returning({ id: contactSubmissions.id });
  return c.json({ data: { id: submission.id, message: "تم استلام رسالتك — سنتواصل معك قريباً" } }, 201);
});

websiteRouter.patch("/contacts/:id/read", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db.update(contactSubmissions).set({ isRead: true })
    .where(and(eq(contactSubmissions.id, c.req.param("id")), eq(contactSubmissions.orgId, orgId)))
    .returning({ id: contactSubmissions.id });
  if (!updated) return c.json({ error: "الرسالة غير موجودة" }, 404);
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
    .where(and(eq(services.orgId, org.id), eq(services.status, "active"), eq((services as any).isVisibleOnline, true)))
    .orderBy(asc(services.sortOrder)).limit(24);

  const serviceIds = activeServices.map(s => s.id);

  // Fetch addons for all active services (via junction table)
  const allServiceAddons = serviceIds.length > 0
    ? await db.select({
        serviceId: serviceAddons.serviceId,
        id: addons.id, name: addons.name, nameEn: addons.nameEn,
        price: addons.price, description: addons.description, image: addons.image,
        type: addons.type,
        priceOverride: serviceAddons.priceOverride,
        typeOverride: serviceAddons.typeOverride,
        sortOrder: serviceAddons.sortOrder,
      })
      .from(serviceAddons)
      .innerJoin(addons, eq(serviceAddons.addonId, addons.id))
      .where(and(inArray(serviceAddons.serviceId, serviceIds), eq(addons.isActive, true)))
      .orderBy(asc(serviceAddons.sortOrder))
    : [];
  const addonsByService = allServiceAddons.reduce((acc: Record<string, any[]>, a) => {
    const row = { ...a, price: a.priceOverride ?? a.price }; // service-level override takes priority
    if (!acc[a.serviceId]) acc[a.serviceId] = [];
    acc[a.serviceId].push(row);
    return acc;
  }, {});

  // Fetch questions for all active services
  const allQuestions = serviceIds.length > 0
    ? await db.select().from(serviceQuestions)
        .where(and(inArray(serviceQuestions.serviceId, serviceIds), eq(serviceQuestions.isActive, true)))
        .orderBy(asc(serviceQuestions.sortOrder))
    : [];
  const questionsByService = allQuestions.reduce((acc: Record<string, any[]>, q) => {
    if (!acc[q.serviceId]) acc[q.serviceId] = [];
    acc[q.serviceId].push(q);
    return acc;
  }, {});

  const activeCategories = await db.select().from(categories)
    .where(and(eq(categories.orgId, org.id), eq(categories.isActive, true)))
    .orderBy(asc(categories.sortOrder));

  const branchList = await db.select().from(locations)
    .where(and(eq(locations.orgId, org.id), eq(locations.isActive, true)));

  const recentPosts = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.orgId, org.id), eq(blogPosts.status, "published")))
    .orderBy(desc(blogPosts.publishedAt)).limit(5);

  const latestReviews = await db.select().from(reviews)
    .where(and(eq(reviews.orgId, org.id), eq(reviews.isPublished, true)))
    .orderBy(desc(reviews.createdAt)).limit(6);

  // Compute avg rating
  const [ratingRow] = await db.select({ avg: sql<string>`AVG(${reviews.rating})`, cnt: count(reviews.id) })
    .from(reviews).where(and(eq(reviews.orgId, org.id), eq(reviews.isPublished, true)));

  // Count the view — fire-and-forget, non-critical
  db.execute(sql`
    UPDATE organizations SET settings = jsonb_set(
      COALESCE(settings, '{}'),
      '{storefrontViews}',
      (COALESCE((settings->>'storefrontViews')::int, 0) + 1)::text::jsonb
    ) WHERE id = ${org.id}
  `).catch(() => {});

  return c.json({
    data: {
      org: {
        id: org.id, name: org.name, nameEn: org.nameEn, slug: org.slug,
        phone: org.phone, email: org.email, logo: org.logo,
        city: org.city, address: org.address, description: org.description,
        tagline: org.tagline, coverImage: org.coverImage,
        instagram: org.instagram, twitter: org.twitter,
        tiktok: org.tiktok, snapchat: org.snapchat,
        businessType: org.businessType,
        primaryColor: config?.primaryColor || org.primaryColor || "#1A56DB",
        secondaryColor: config?.secondaryColor || org.secondaryColor,
      },
      config: config ?? null,
      pages,
      services: activeServices,
      addonsByService,
      questionsByService,
      categories: activeCategories,
      branches: branchList,
      blog: recentPosts,
      reviews: latestReviews,
      stats: {
        avgRating: ratingRow?.avg ? Number(ratingRow.avg).toFixed(1) : null,
        reviewCount: Number(ratingRow?.cnt ?? 0),
        serviceCount: activeServices.length,
      },
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

// ============================================================
// POST /website/public/:orgSlug/book — Public booking (no auth)
// يُنشئ حجزاً جديداً من الموقع العام دون الحاجة لتسجيل دخول
// ============================================================

const publicBookSchema = z.object({
  customerName:    z.string().min(1).max(200),
  customerPhone:   z.string().min(7).max(20),
  serviceId:       z.string().uuid(),
  eventDate:       z.string().datetime(),
  selectedAddons:  z.array(z.string().uuid()).max(20).optional().default([]),
  customLocation:  z.string().max(500).optional().nullable(),
  notes:           z.string().max(2000).optional().nullable(),
  questionAnswers: z.array(z.object({
    questionId: z.string().uuid(),
    answer:     z.string().max(1000),
  })).max(50).optional().default([]),
});

websiteRouter.post("/public/:orgSlug/book", async (c) => {
  // 0. Rate limit by client IP
  const clientIp = c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!publicBookAllowed(clientIp)) {
    return c.json({ error: "طلبات كثيرة جداً، حاول مرة أخرى بعد قليل" }, 429);
  }

  const slug = c.req.param("orgSlug");
  const body = publicBookSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "بيانات غير صحيحة", details: body.error.flatten() }, 422);

  const { customerName, customerPhone, serviceId, eventDate, selectedAddons, customLocation, notes, questionAnswers } = body.data;

  // 1. Resolve org
  const [org] = await db.select({ id: organizations.id, name: organizations.name })
    .from(organizations).where(and(eq(organizations.slug, slug), sql`${organizations.subscriptionStatus} IN ('active', 'trialing')`));
  if (!org) return c.json({ error: "المنشأة غير موجودة أو غير نشطة" }, 404);

  const orgId = org.id;

  // 2. Validate service belongs to org and is active
  const [service] = await db.select({
    id: services.id, name: services.name,
    basePrice: services.basePrice, serviceType: services.serviceType,
    depositPercent: services.depositPercent,
  }).from(services).where(and(eq(services.id, serviceId), eq(services.orgId, orgId), eq(services.status, "active")));
  if (!service) return c.json({ error: "الخدمة غير متوفرة" }, 404);

  // 3. Find or create customer by phone
  let [customer] = await db.select({ id: customers.id })
    .from(customers).where(and(eq(customers.orgId, orgId), eq(customers.phone, customerPhone)));
  if (!customer) {
    [customer] = await db.insert(customers).values({
      orgId, name: customerName, phone: customerPhone, source: "website",
    }).returning({ id: customers.id });
  }

  // 3b. Prevent duplicate booking (same customer + service + same calendar day, non-terminal status)
  const bookingDay = new Date(eventDate);
  bookingDay.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(bookingDay);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const [duplicate] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .where(and(
      eq(bookings.orgId, orgId),
      eq(bookings.customerId, customer.id),
      eq(bookingItems.serviceId, serviceId),
      notInArray(bookings.status, ["cancelled", "no_show"]),
      sql`${bookings.eventDate} >= ${bookingDay} AND ${bookings.eventDate} < ${nextDay}`,
    ));
  if (duplicate) {
    return c.json({ error: "يوجد حجز مسبق لك على هذه الخدمة في نفس اليوم" }, 409);
  }

  // 4. Resolve addon prices
  let addonsList: { id: string; name: string; price: string }[] = [];
  if (selectedAddons.length > 0) {
    addonsList = await db.select({ id: addons.id, name: addons.name, price: addons.price })
      .from(addons).where(and(inArray(addons.id, selectedAddons), eq(addons.orgId, orgId)));
  }

  // 4b. Enrich question answers with question text for readable storage
  let enrichedAnswers: { questionId: string; question: string; answer: string }[] = [];
  if (questionAnswers.length > 0) {
    const qIds = questionAnswers.map(q => q.questionId);
    const questionRows = await db.select({ id: serviceQuestions.id, question: serviceQuestions.question })
      .from(serviceQuestions)
      .where(and(inArray(serviceQuestions.id, qIds), eq(serviceQuestions.serviceId, serviceId)));
    const qMap = Object.fromEntries(questionRows.map(q => [q.id, q.question]));
    enrichedAnswers = questionAnswers
      .filter(a => qMap[a.questionId]) // only valid question IDs
      .map(a => ({ questionId: a.questionId, question: qMap[a.questionId], answer: a.answer }));
  }

  // 5. Calculate totals
  const svcPrice       = parseFloat(String(service.basePrice || "0"));
  const addonsSum      = addonsList.reduce((s, a) => s + parseFloat(a.price || "0"), 0);
  const subtotal       = svcPrice + addonsSum;
  const vatAmount      = subtotal * (DEFAULT_VAT_RATE / 100);
  const total          = subtotal + vatAmount;
  const depositPct     = parseFloat(String(service.depositPercent ?? "30")) / 100;
  const depositAmount  = total * depositPct;

  const bookingNumber  = generateBookingNumber("NSQ");
  const trackingToken  = crypto.randomUUID().replace(/-/g, "").substring(0, BOOKING_TRACKING_TOKEN_LENGTH);

  // 6. Insert booking + items in one transaction
  const booking = await db.transaction(async (tx) => {
    const [b] = await tx.insert(bookings).values({
      orgId,
      customerId: customer.id,
      bookingNumber,
      status: "pending",
      paymentStatus: "pending",
      eventDate: new Date(eventDate),
      customLocation: customLocation ?? null,
      subtotal: subtotal.toFixed(2),
      discountAmount: "0",
      vatAmount: vatAmount.toFixed(2),
      totalAmount: total.toFixed(2),
      depositAmount: depositAmount.toFixed(2),
      paidAmount: "0",
      balanceDue: total.toFixed(2),
      source: "website",
      customerNotes: notes ?? null,
      questionAnswers: enrichedAnswers as any,
      trackingToken,
    }).returning();

    const [item] = await tx.insert(bookingItems).values({
      bookingId: b.id,
      serviceId: service.id,
      serviceName: service.name,
      quantity: 1,
      unitPrice: svcPrice.toFixed(2),
      totalPrice: svcPrice.toFixed(2),
    }).returning({ id: bookingItems.id });

    if (addonsList.length > 0) {
      await tx.insert(bookingItemAddons).values(
        addonsList.map((a) => ({
          bookingItemId: item.id,
          addonId: a.id,
          addonName: a.name,
          quantity: 1,
          unitPrice: a.price,
          totalPrice: a.price,
        }))
      );
    }

    return b;
  });

  return c.json({
    data: {
      bookingNumber: booking.bookingNumber,
      trackingToken: booking.trackingToken,
      totalAmount: booking.totalAmount,
      depositAmount: booking.depositAmount,
      status: booking.status,
      serviceName: service.name,
      orgName: org.name,
    },
  }, 201);
});

// ============================================================
// GET /website/analytics — storefront performance metrics
// ============================================================

websiteRouter.get("/analytics", async (c) => {
  const orgId = getOrgId(c);

  const [[orgRow], [contactCount], [reviewStats], [publishedPages], [blogCount]] = await Promise.all([
    db.select({ settings: organizations.settings, slug: organizations.slug })
      .from(organizations).where(eq(organizations.id, orgId)),
    db.select({ count: count() }).from(contactSubmissions).where(eq(contactSubmissions.orgId, orgId)),
    db.select({
      avg: sql<string>`COALESCE(AVG(${reviews.rating}), 0)`,
      total: count(),
    }).from(reviews).where(and(eq(reviews.orgId, orgId), eq(reviews.isPublished, true))),
    db.select({ count: count() }).from(sitePages)
      .where(and(eq(sitePages.orgId, orgId), eq(sitePages.isPublished, true))),
    db.select({ count: count() }).from(blogPosts)
      .where(and(eq(blogPosts.orgId, orgId), eq(blogPosts.status, "published"))),
  ]);

  const settings = (orgRow?.settings as any) ?? {};
  const storefrontViews = parseInt(settings?.storefrontViews ?? "0") || 0;

  return c.json({
    data: {
      storefrontUrl: orgRow?.slug ? `/s/${orgRow.slug}` : null,
      storefrontViews,
      inquiries: Number(contactCount?.count ?? 0),
      avgRating: Number(reviewStats?.avg ?? 0).toFixed(1),
      reviewCount: Number(reviewStats?.total ?? 0),
      publishedPages: Number(publishedPages?.count ?? 0),
      publishedPosts: Number(blogCount?.count ?? 0),
    },
  });
});
