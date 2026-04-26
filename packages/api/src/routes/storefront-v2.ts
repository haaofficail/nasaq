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
 *   GET  /storefront/:orgSlug/products      — store-visible inventory products
 *   POST /storefront/:orgSlug/cart          — create/update cart session
 *   GET  /storefront/:orgSlug/cart/:sessionId — get cart
 *   POST /storefront/:orgSlug/cart/:sessionId/checkout — create order + Moyasar payment URL
 *
 * Auth-protected:
 *   GET  /storefront/analytics              — org analytics (requires authMiddleware upstream)
 */

import { Hono } from "hono";
import { eq, and, desc, asc, count, sql, inArray, or } from "drizzle-orm";
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
  messagesInbox,
  paymentSettings,
  customers,
  bookings,
  bookingItems,
  bookingEvents,
  bookingRecords,
  bookingLines,
  bookingTimelineEvents,
} from "@nasaq/db/schema";
import { z } from "zod";
import { getOrgId, generateBookingNumber } from "../lib/helpers";
import { buildMoyasarPaymentUrl, sarToHalala } from "../lib/moyasar";
import { fireOrderEvent, fireBookingEvent } from "../lib/messaging-engine";
import { FREE_BOOKING_LIMIT } from "../lib/constants";

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
    .select({ cnt: count(messagesInbox.id) })
    .from(messagesInbox)
    .where(eq(messagesInbox.orgId, orgId));

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
    .insert(messagesInbox)
    .values({
      orgId:   org.id,
      name,
      phone,
      email:   email ?? null,
      message,
      source:  "storefront_v2",
      pageSlug: pageSlug ?? null,
    })
    .returning({ id: messagesInbox.id });

  return c.json(
    { data: { id: submission.id, message: "تم استلام رسالتك — سنتواصل معك قريباً" } },
    201,
  );
});

// ── POST /api/v2/storefront/:orgSlug/book ────────────────────
// الحجز العام من صفحة المتجر / رابط الحجز
// يحل محل: POST /api/v1/website/public/:orgSlug/book

const publicBookSchema = z.object({
  customerName:   z.string().min(2).max(120),
  customerPhone:  z.string().min(7).max(20),
  // publicBookingPage يرسل serviceId (مفرد)، StorefrontPage يرسل serviceIds (جمع)
  serviceId:      z.string().uuid().optional(),
  serviceIds:     z.array(z.string().uuid()).optional(),
  eventDate:      z.string().datetime().optional(),
  selectedAddons: z.array(z.any()).default([]),
  customLocation: z.string().optional(),
  notes:          z.string().optional(),
  questionAnswers: z.array(z.any()).default([]),
  acceptedTerms:  z.boolean().refine((value) => value === true, { message: "يجب قبول الشروط وسياسة الخصوصية" }),
  policyVersion:  z.string().optional(),
}).refine(d => d.serviceId || (d.serviceIds && d.serviceIds.length > 0), {
  message: "يجب تحديد خدمة واحدة على الأقل",
});

const VAT_RATE = 0.15;

// Rental types cannot be booked through the public storefront — no eventEndDate field in publicBookSchema
const PUBLIC_RENTAL_SERVICE_TYPES = new Set(["rental", "event_rental"]);

function resolvePublicBookingType(serviceTypes: string[]): string {
  const IMMEDIATE = new Set(["product", "product_shipping", "food_order", "package", "add_on"]);
  if (serviceTypes.every(t => IMMEDIATE.has(t))) return serviceTypes[0] ?? "appointment";
  if (serviceTypes.some(t => t === "event_rental" || t === "execution")) return "event";
  if (serviceTypes.some(t => t === "rental")) return "stay";
  return "appointment";
}

storefrontV2Router.post("/:orgSlug/book", async (c) => {
  const orgSlug = c.req.param("orgSlug");

  // 1. Org lookup
  const [org] = await db
    .select({ id: organizations.id, plan: organizations.plan, bookingUsed: organizations.bookingUsed })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug));
  if (!org) return c.json({ error: "المنشأة غير موجودة" }, 404);
  const orgId = org.id;

  // Fix 8 — Free plan limit (reuse same logic as dashboard booking)
  if (org.plan === "free" && (org.bookingUsed ?? 0) >= FREE_BOOKING_LIMIT) {
    return c.json({
      error: `لقد استخدمت جميع الحجوزات المجانية (${FREE_BOOKING_LIMIT} حجز). للمتابعة واستقبال حجوزات جديدة، قم بالترقية إلى إحدى الباقات.`,
      code: "FREE_LIMIT_REACHED",
    }, 403);
  }

  // 2. Parse + validate body
  const raw = await c.req.json().catch(() => null);
  const parsed = publicBookSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "بيانات الحجز غير مكتملة", details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  // Fix 7 — selectedAddons not priced server-side; reject non-empty to avoid silent price mismatch
  if (body.selectedAddons.length > 0) {
    return c.json({
      error: "الإضافات غير مدعومة حالياً في الحجز الإلكتروني — تواصل مع المنشأة مباشرةً لإضافتها",
      code: "ADDONS_NOT_SUPPORTED",
    }, 400);
  }

  // Normalise service IDs
  const serviceIdList = body.serviceIds?.length
    ? body.serviceIds
    : body.serviceId ? [body.serviceId] : [];

  // 3. Load services
  const svcRows = await db
    .select()
    .from(services)
    .where(and(inArray(services.id, serviceIdList), eq(services.orgId, orgId)));
  if (svcRows.length !== serviceIdList.length) {
    return c.json({ error: "إحدى الخدمات غير موجودة أو لا تنتمي لهذه المنشأة" }, 400);
  }

  // Fix 2 — validate service visibility and bookability
  const SCHEDULED_TYPES = new Set(["appointment", "field_service", "execution", "rental", "event_rental"]);
  for (const svc of svcRows) {
    if (svc.status !== "active") {
      return c.json({ error: `الخدمة "${svc.name}" غير متاحة حالياً` }, 400);
    }
    if ((svc as any).isVisibleOnline === false) {
      return c.json({ error: `الخدمة "${svc.name}" غير متاحة للحجز الإلكتروني` }, 400);
    }
    if ((svc as any).isBookable === false) {
      return c.json({ error: `الخدمة "${svc.name}" غير قابلة للحجز` }, 400);
    }
  }

  // Fix 3 — require eventDate for scheduled service types
  const requiresScheduling = svcRows.some(s => SCHEDULED_TYPES.has((s as any).serviceType ?? ""));
  if (requiresScheduling && !body.eventDate) {
    return c.json({ error: "يجب تحديد تاريخ ووقت الحجز" }, 400);
  }

  // Stage 3 — reject rental/event_rental: publicBookSchema has no eventEndDate field
  const serviceTypes = svcRows.map(s => (s as any).serviceType ?? "");
  if (serviceTypes.some(t => PUBLIC_RENTAL_SERVICE_TYPES.has(t))) {
    return c.json({
      error: "خدمات التأجير تتطلب تحديد تاريخ بداية ونهاية. يرجى التواصل مع المنشأة لإتمام الحجز حالياً.",
      code: "PUBLIC_RENTAL_BOOKING_REQUIRES_END_DATE",
    }, 400);
  }

  // 4. Pricing (VAT-inclusive — Saudi default)
  const subtotal = svcRows.reduce((sum, s) => sum + parseFloat(String(s.basePrice ?? "0")), 0);
  const vatAmount = parseFloat((subtotal * VAT_RATE).toFixed(2));
  const totalAmount = parseFloat((subtotal + vatAmount).toFixed(2));
  const depositAmount = parseFloat((totalAmount * 0.3).toFixed(2)); // 30% default deposit

  // 5. Upsert customer by phone
  const phone = body.customerPhone.replace(/\s/g, "");
  let [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.orgId, orgId), eq(customers.phone, phone)));

  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({
        orgId,
        name:   body.customerName,
        phone,
        source: "storefront",
      })
      .returning({ id: customers.id });
  }

  // 6. Create booking record
  const bookingNumber  = generateBookingNumber("NSQ");
  const trackingToken  = crypto.randomUUID().replace(/-/g, "").substring(0, 32);
  const resolvedDate   = body.eventDate ? new Date(body.eventDate) : new Date();
  const bookingType    = resolvePublicBookingType(serviceTypes);
  const consentMetadata = {
    acceptedTermsAt:   new Date().toISOString(),
    acceptedPrivacyAt: new Date().toISOString(),
    policyVersion:     body.policyVersion ?? "public-v2",
    source:            "storefront",
  };

  const { legacyBooking } = await db.transaction(async (tx) => {
    const [legacyBooking] = await tx.insert(bookings).values({
      orgId,
      customerId:      customer.id,
      bookingNumber,
      status:          "pending",
      paymentStatus:   "pending",
      eventDate:       resolvedDate,
      subtotal:        subtotal.toFixed(2),
      discountAmount:  "0",
      vatAmount:       vatAmount.toFixed(2),
      totalAmount:     totalAmount.toFixed(2),
      depositAmount:   depositAmount.toFixed(2),
      paidAmount:      "0",
      balanceDue:      totalAmount.toFixed(2),
      trackingToken,
      source:          "storefront",
      customerNotes:   body.notes ?? null,
      customLocation:  body.customLocation ?? null,
      questionAnswers: body.questionAnswers,
      consentMetadata,
      isRecurring:     false,
    } as any).returning();

    const [newRecord] = await tx.insert(bookingRecords).values({
      orgId,
      customerId:      customer.id,
      bookingRef:      legacyBooking.id,
      bookingNumber,
      bookingType:     bookingType,
      status:          "pending",
      paymentStatus:   "pending",
      startsAt:        resolvedDate,
      subtotal:        subtotal.toFixed(2),
      discountAmount:  "0",
      vatAmount:       vatAmount.toFixed(2),
      totalAmount:     totalAmount.toFixed(2),
      depositAmount:   depositAmount.toFixed(2),
      paidAmount:      "0",
      balanceDue:      totalAmount.toFixed(2),
      customerNotes:   body.notes ?? null,
      customLocation:  body.customLocation ?? null,
      questionAnswers: body.questionAnswers,
      consentMetadata,
      source:          "storefront",
      trackingToken,
      isRecurring:     false,
    } as any).returning();

    if (svcRows.length > 0) {
      await tx.insert(bookingItems).values(
        svcRows.map((svc) => ({
          bookingId:       legacyBooking.id,
          serviceId:       svc.id,
          serviceName:     svc.name,
          serviceType:     (svc as any).serviceType ?? null,
          durationMinutes: svc.durationMinutes ?? null,
          vatInclusive:    true,
          quantity:        1,
          unitPrice:       String(svc.basePrice ?? "0"),
          totalPrice:      String(svc.basePrice ?? "0"),
          pricingBreakdown: [],
        })) as any,
      );

      await tx.insert(bookingLines).values(
        svcRows.map((svc) => ({
          bookingRecordId: newRecord.id,
          serviceRefId:    svc.id,
          lineType:        "service",
          itemName:        svc.name,
          quantity:        1,
          unitPrice:       String(svc.basePrice ?? "0"),
          totalPrice:      String(svc.basePrice ?? "0"),
          vatInclusive:    true,
        })),
      );
    }

    await tx.insert(bookingEvents).values({
      orgId,
      bookingId:  legacyBooking.id,
      userId:     null,
      eventType:  "created",
      fromStatus: null,
      toStatus:   "pending",
      metadata:   { bookingNumber, source: "storefront", canonicalBookingRecordId: newRecord.id },
    } as any);

    await tx.insert(bookingTimelineEvents).values({
      orgId,
      bookingRecordId: newRecord.id,
      userId:          null,
      eventType:       "created",
      fromStatus:      null,
      toStatus:        "pending",
      metadata:        { bookingNumber, source: "storefront", legacyBookingId: legacyBooking.id },
    } as any);

    return { newRecord, legacyBooking };
  });

  // Fix 8 — Increment bookingUsed counter for free-plan orgs (same pattern as dashboard booking)
  if (org.plan === "free") {
    await db.update(organizations)
      .set({ bookingUsed: sql`coalesce(${organizations.bookingUsed}, 0) + 1` })
      .where(eq(organizations.id, orgId));
  }

  // 9. Notifications (fire-and-forget)
  fireBookingEvent("booking_confirmed",  { orgId, bookingId: legacyBooking.id });
  fireBookingEvent("owner_new_booking",  { orgId, bookingId: legacyBooking.id });

  return c.json({
    data: {
      bookingNumber,
      totalAmount: totalAmount.toFixed(2),
      trackingUrl: `/track/${trackingToken}`,
    }
  }, 201);
});

// ══════════════════════════════════════════════════════════════
// PRODUCTS — كتالوج المتجر العام
// ══════════════════════════════════════════════════════════════

/** GET /api/v2/storefront/:orgSlug/products */
storefrontV2Router.get("/:orgSlug/products", async (c) => {
  const orgSlug = c.req.param("orgSlug");
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!org) return c.json({ error: "المتجر غير موجود" }, 404);

  const { rows } = await pool.query(
    `SELECT id, name, name_en, category, selling_price, images, description,
            current_stock, sku, image_url, store_sort_order
     FROM inventory_products
     WHERE org_id = $1 AND is_store_visible = true AND is_active = true
     ORDER BY store_sort_order ASC, name ASC`,
    [org.id],
  );
  return c.json({ data: rows });
});

/** GET /api/v2/storefront/:orgSlug/products/:productId */
storefrontV2Router.get("/:orgSlug/products/:productId", async (c) => {
  const orgSlug   = c.req.param("orgSlug");
  const productId = c.req.param("productId");

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!org) return c.json({ error: "المتجر غير موجود" }, 404);

  const { rows } = await pool.query(
    `SELECT id, name, name_en, category, selling_price, images, description,
            current_stock, sku, image_url
     FROM inventory_products
     WHERE id = $1 AND org_id = $2 AND is_store_visible = true AND is_active = true`,
    [productId, org.id],
  );
  if (!rows[0]) return c.json({ error: "المنتج غير موجود" }, 404);
  return c.json({ data: rows[0] });
});

// ══════════════════════════════════════════════════════════════
// CART — سلة التسوق (جلسة عامة بدون auth)
// ══════════════════════════════════════════════════════════════

const cartSchema = z.object({
  sessionId:  z.string().min(8).max(64),
  phone:      z.string().optional(),
  email:      z.string().email().optional(),
  items:      z.array(z.object({
    productId: z.string().uuid(),
    name:      z.string(),
    qty:       z.number().int().min(1).max(999),
    price:     z.number().min(0),
  })).min(1),
  totalAmount: z.number().min(0),
});

/** POST /api/v2/storefront/:orgSlug/cart */
storefrontV2Router.post("/:orgSlug/cart", async (c) => {
  const orgSlug = c.req.param("orgSlug");
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!org) return c.json({ error: "المتجر غير موجود" }, 404);

  const body = cartSchema.parse(await c.req.json());

  // upsert abandoned_cart as the live cart session
  const { rows } = await pool.query(
    `INSERT INTO abandoned_carts
       (org_id, session_id, phone, email, items, total_amount, recovery_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'abandoned')
     ON CONFLICT (org_id, session_id)
       DO UPDATE SET
         phone        = EXCLUDED.phone,
         email        = EXCLUDED.email,
         items        = EXCLUDED.items,
         total_amount = EXCLUDED.total_amount,
         updated_at   = NOW()
     RETURNING id, session_id, items, total_amount`,
    [org.id, body.sessionId, body.phone ?? null, body.email ?? null,
     JSON.stringify(body.items), body.totalAmount],
  );
  return c.json({ data: rows[0] }, 200);
});

/** GET /api/v2/storefront/:orgSlug/cart/:sessionId */
storefrontV2Router.get("/:orgSlug/cart/:sessionId", async (c) => {
  const orgSlug   = c.req.param("orgSlug");
  const sessionId = c.req.param("sessionId");

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!org) return c.json({ error: "المتجر غير موجود" }, 404);

  const { rows } = await pool.query(
    `SELECT id, session_id, items, total_amount, phone, email
     FROM abandoned_carts
     WHERE org_id = $1 AND session_id = $2 AND recovery_status = 'abandoned'
     ORDER BY created_at DESC LIMIT 1`,
    [org.id, sessionId],
  );
  if (!rows[0]) return c.json({ data: { items: [], totalAmount: 0 } });
  return c.json({ data: rows[0] });
});

// ══════════════════════════════════════════════════════════════
// CHECKOUT — تحويل السلة إلى طلب مدفوع
// ══════════════════════════════════════════════════════════════

const checkoutSchema = z.object({
  sessionId:       z.string().min(8).max(64),
  customerName:    z.string().min(2).max(200),
  customerPhone:   z.string().min(5).max(20),
  customerEmail:   z.string().email().optional(),
  deliveryAddress: z.record(z.unknown()).optional(),
  deliveryFee:     z.number().min(0).default(0),
  callbackUrl:     z.string().url(),
  notes:           z.string().max(500).optional(),
  couponCode:      z.string().max(50).optional(),
});

/** POST /api/v2/storefront/:orgSlug/cart/:sessionId/checkout */
storefrontV2Router.post("/:orgSlug/cart/:sessionId/checkout", async (c) => {
  const orgSlug   = c.req.param("orgSlug");
  const sessionId = c.req.param("sessionId");

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!org) return c.json({ error: "المتجر غير موجود" }, 404);

  // جلب السلة
  const { rows: cartRows } = await pool.query(
    `SELECT * FROM abandoned_carts WHERE org_id = $1 AND session_id = $2 AND recovery_status = 'abandoned' LIMIT 1`,
    [org.id, sessionId],
  );
  const cart = cartRows[0];
  if (!cart) return c.json({ error: "السلة غير موجودة أو منتهية" }, 404);

  const body = checkoutSchema.parse(await c.req.json());

  // التحقق من إعداد الدفع
  const [paySettings] = await db
    .select()
    .from(paymentSettings)
    .where(eq(paymentSettings.orgId, org.id))
    .limit(1);
  if (!paySettings?.enabled) {
    return c.json({ error: "الدفع الإلكتروني غير مفعّل لهذا المتجر" }, 400);
  }

  const PUBLISHABLE_KEY = process.env.MOYASAR_PUBLISHABLE_KEY ?? "";
  if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === "__FILL__") {
    return c.json({ error: "بوابة الدفع غير مهيأة" }, 503);
  }

  const items: Array<{ productId: string; name: string; qty: number; price: number }> =
    Array.isArray(cart.items) ? cart.items : JSON.parse(cart.items ?? "[]");

  const subtotal    = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
  // Use org's default delivery fee unless client explicitly passes a different value
  const defaultFee  = Number(paySettings.defaultDeliveryFee ?? 0);
  const deliveryFee = body.deliveryFee !== undefined ? body.deliveryFee : defaultFee;
  const totalAmount = subtotal + deliveryFee;

  // إنشاء رقم الطلب
  const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // إنشاء الطلب
  const { rows: orderRows } = await pool.query(
    `INSERT INTO online_orders
       (org_id, order_number, order_type, customer_name, customer_phone, customer_email,
        delivery_address, items, subtotal, delivery_fee, total_amount, payment_method, notes, coupon_code)
     VALUES ($1,$2,'delivery',$3,$4,$5,$6,$7,$8,$9,$10,'online',$11,$12)
     RETURNING id, order_number, total_amount`,
    [
      org.id, orderNum,
      body.customerName, body.customerPhone, body.customerEmail ?? null,
      JSON.stringify(body.deliveryAddress ?? {}),
      JSON.stringify(items),
      subtotal, deliveryFee, totalAmount,
      body.notes ?? null,
      body.couponCode ?? null,
    ],
  );
  const order = orderRows[0];

  // حساب رسوم المنصة
  const feePercent  = Number(paySettings.platformFeePercent ?? 2.5);
  const feeFixed    = Number(paySettings.platformFeeFixed   ?? 0);
  const platformFee = Math.round((totalAmount * feePercent / 100 + feeFixed) * 100) / 100;
  const merchantAmt = Math.round((totalAmount - platformFee) * 100) / 100;

  // إضافة orderNumber للـ callbackUrl لعرضه في صفحة النجاح
  const callbackWithOrder = body.callbackUrl.includes("?")
    ? `${body.callbackUrl}&orderNumber=${encodeURIComponent(orderNum)}`
    : `${body.callbackUrl}?orderNumber=${encodeURIComponent(orderNum)}`;

  // إنشاء معاملة دفع
  const { rows: txRows } = await pool.query(
    `INSERT INTO payment_transactions
       (org_id, order_id, amount, platform_fee, merchant_amount, currency, status, description, success_url, failure_url, metadata)
     VALUES ($1,$2,$3,$4,$5,'SAR','pending',$6,$7,$7,$8)
     RETURNING id`,
    [
      org.id, order.id,
      totalAmount, platformFee, merchantAmt,
      `طلب ${orderNum} — ${org.name}`,
      callbackWithOrder,
      JSON.stringify({ nasaq_order_id: order.id, session_id: sessionId }),
    ],
  );
  const tx = txRows[0];

  // بناء رابط Moyasar
  const payUrl = buildMoyasarPaymentUrl({
    publishableKey: PUBLISHABLE_KEY,
    amount:         sarToHalala(totalAmount),
    currency:       "SAR",
    description:    `طلب ${orderNum}`,
    callbackUrl:    callbackWithOrder,
    metadata: {
      nasaq_tx_id:    tx.id,
      nasaq_order_id: order.id,
      org_id:         org.id,
    },
  });

  // تحديث السلة → recovered
  await pool.query(
    `UPDATE abandoned_carts SET recovery_status = 'recovered', recovered_at = NOW(), recovered_booking_id = $1 WHERE org_id = $2 AND session_id = $3`,
    [order.id, org.id, sessionId],
  );

  // إشعارات — fire-and-forget لا تكسر الاستجابة
  const notifPayload = {
    orgId:         org.id,
    orderNumber:   order.order_number,
    customerName:  body.customerName,
    customerPhone: body.customerPhone,
    totalAmount,
  };
  fireOrderEvent("online_order_received", notifPayload);  // للعميل
  fireOrderEvent("owner_new_online_order", notifPayload); // للمالك

  return c.json({
    data: {
      orderId:        order.id,
      orderNumber:    order.order_number,
      transactionId:  tx.id,
      paymentUrl:     payUrl,
      totalAmount,
    },
  }, 201);
});
