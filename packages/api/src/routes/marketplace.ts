import { Hono } from "hono";
import { eq, and, ilike, or, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { marketplaceListings, rfpRequests, rfpProposals } from "@nasaq/db/schema";
import { services } from "@nasaq/db/schema";
import { organizations } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { apiErr } from "../lib/errors";
import { log } from "../lib/logger";

// ============================================================
// MARKETPLACE ROUTER
// سوق نسق — عرض خدمات الموردين للعموم
//
// GET  /marketplace                — تصفح الإعلانات (عام)
// GET  /marketplace/categories     — الفئات المتاحة (عام)
// POST /marketplace/rfp            — إرسال طلب عروض أسعار (عام)
// GET  /marketplace/my-listings    — إعلانات المنشأة (مصادق)
// POST /marketplace/listings       — نشر خدمة في السوق (مصادق)
// DELETE /marketplace/listings/:id — حذف إعلان (مصادق)
// ============================================================

export const marketplaceRouter = new Hono();

// Business type → Arabic label mapping (used for category filter)
const BIZ_LABEL: Record<string, string> = {
  events:           "فعاليات",
  event_organizer:  "فعاليات",
  events_vendor:    "فعاليات",
  flower_shop:      "ورد وتنسيق",
  flowers:          "ورد وتنسيق",
  catering:         "ضيافة",
  restaurant:       "مطاعم",
  cafe:             "مقهى",
  bakery:           "مخبز ومعجنات",
  photography:      "تصوير",
  salon:            "تجميل وعناية",
  barber:           "حلاقة",
  spa:              "سبا",
  fitness:          "لياقة بدنية",
  hotel:            "فنادق وإقامة",
  car_rental:       "تأجير سيارات",
  rental:           "تأجير معدات",
  retail:           "تجزئة",
  decoration:       "ديكور",
  entertainment:    "ترفيه",
};

function getBizLabel(biz: string | null): string {
  return BIZ_LABEL[biz ?? ""] ?? "خدمات عامة";
}

// ── GET /marketplace — public browse ──────────────────────
marketplaceRouter.get("/", async (c) => {
  const search   = c.req.query("search")   ?? "";
  const city     = c.req.query("city")     ?? "";
  const category = c.req.query("category") ?? "";  // Arabic label
  const sort     = c.req.query("sort")     ?? "popular"; // popular | rating | price_low | price_high
  const limit    = Math.min(parseInt(c.req.query("limit") ?? "48"), 100);
  const offset   = parseInt(c.req.query("offset") ?? "0");

  // Resolve category back to one or more businessTypes
  const matchingBizTypes = category
    ? Object.entries(BIZ_LABEL).filter(([, label]) => label === category).map(([biz]) => biz)
    : [];

  // Build conditions
  const conditions = [
    eq(marketplaceListings.isActive, true),
    eq(organizations.isActive, true),
    eq(services.status, "active"),
  ];

  if (search) {
    conditions.push(or(
      ilike(services.name, `%${search}%`),
      ilike(organizations.name, `%${search}%`),
    )!);
  }

  if (city) {
    conditions.push(ilike(organizations.city, `%${city}%`));
  }

  if (matchingBizTypes.length > 0) {
    conditions.push(
      or(...matchingBizTypes.map(biz => eq(organizations.businessType, biz)))!
    );
  }

  // Order
  const orderBy =
    sort === "price_low"  ? asc(sql`COALESCE(${marketplaceListings.marketplacePrice}, ${services.basePrice})`) :
    sort === "price_high" ? desc(sql`COALESCE(${marketplaceListings.marketplacePrice}, ${services.basePrice})`) :
    sort === "rating"     ? desc(sql`(SELECT ROUND(AVG(r.rating)::numeric,1) FROM reviews r WHERE r.org_id = ${organizations.id} AND r.is_published = true)`) :
    /* popular */           desc(marketplaceListings.bookings);

  const rows = await db
    .select({
      id:          marketplaceListings.id,
      serviceId:   services.id,
      service:     services.name,
      vendorSlug:  organizations.slug,
      vendor:      organizations.name,
      vendorLogo:  organizations.logo,
      city:        organizations.city,
      businessType: organizations.businessType,
      price:       sql<number>`COALESCE(${marketplaceListings.marketplacePrice}, ${services.basePrice})`,
      bookings:    marketplaceListings.bookings,
      views:       marketplaceListings.views,
      featuredUntil: marketplaceListings.featuredUntil,
      avgRating:   sql<number>`(SELECT ROUND(AVG(r.rating)::numeric,1) FROM reviews r WHERE r.org_id = ${organizations.id} AND r.is_published = true)`,
      reviewCount: sql<number>`(SELECT COUNT(*) FROM reviews r WHERE r.org_id = ${organizations.id} AND r.is_published = true)`,
    })
    .from(marketplaceListings)
    .innerJoin(services,       eq(services.id,       marketplaceListings.serviceId))
    .innerJoin(organizations,  eq(organizations.id,  marketplaceListings.orgId))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const listings = rows.map(r => ({
    ...r,
    category:  getBizLabel(r.businessType),
    rating:    r.avgRating   ? Number(r.avgRating) : null,
    reviews:   r.reviewCount ? Number(r.reviewCount) : 0,
    price:     Number(r.price),
    bookings:  r.bookings ?? 0,
    isFeatured: r.featuredUntil ? new Date(r.featuredUntil) > new Date() : false,
  }));

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(marketplaceListings)
    .innerJoin(services,      eq(services.id,      marketplaceListings.serviceId))
    .innerJoin(organizations, eq(organizations.id, marketplaceListings.orgId))
    .where(and(...conditions));

  return c.json({ data: listings, total: Number(total), limit, offset });
});

// ── GET /marketplace/categories — distinct available categories ──
marketplaceRouter.get("/categories", async (c) => {
  const rows = await db
    .selectDistinct({ businessType: organizations.businessType })
    .from(marketplaceListings)
    .innerJoin(organizations, eq(organizations.id, marketplaceListings.orgId))
    .where(and(eq(marketplaceListings.isActive, true), eq(organizations.isActive, true)));

  const seen = new Set<string>();
  const categories: string[] = [];
  for (const row of rows) {
    const label = getBizLabel(row.businessType);
    if (!seen.has(label)) { seen.add(label); categories.push(label); }
  }

  return c.json({ data: categories });
});

// ── POST /marketplace/rfp — public RFP submission ──────────
marketplaceRouter.post("/rfp", async (c) => {
  const body = await c.req.json();
  const { clientName, clientPhone, clientEmail, clientCity, eventType, guestCount, eventDate, budget, description } = body;

  if (!clientName || !clientPhone || !description) {
    return c.json({ error: "الاسم والجوال والوصف مطلوبة" }, 400);
  }

  const [rfp] = await db.insert(rfpRequests).values({
    clientName,
    clientPhone,
    clientEmail:  clientEmail  ?? null,
    clientCity:   clientCity   ?? null,
    eventType:    eventType    ?? null,
    guestCount:   guestCount   ? parseInt(guestCount) : null,
    eventDate:    eventDate    ? new Date(eventDate) : null,
    budget:       budget       ? String(budget) : null,
    description,
    status:       "open",
  }).returning();

  log.info({ rfpId: rfp.id, clientPhone }, "[marketplace] new RFP submitted");
  return c.json({ data: { id: rfp.id, status: "open" } }, 201);
});

// ── GET /marketplace/rfp — list open RFPs for orgs to browse/respond ──
marketplaceRouter.get("/rfp", async (c) => {
  const orgId = getOrgId(c);
  const limit  = Math.min(parseInt(c.req.query("limit")  || "20"), 100);
  const offset = parseInt(c.req.query("offset") || "0");
  const status = c.req.query("status") || "open";

  const rows = await db
    .select({
      id:          rfpRequests.id,
      clientName:  rfpRequests.clientName,
      // Mask phone — show first 3 digits + *** + last 2 for privacy
      clientCity:  rfpRequests.clientCity,
      eventType:   rfpRequests.eventType,
      guestCount:  rfpRequests.guestCount,
      eventDate:   rfpRequests.eventDate,
      budget:      rfpRequests.budget,
      description: rfpRequests.description,
      status:      rfpRequests.status,
      createdAt:   rfpRequests.createdAt,
    })
    .from(rfpRequests)
    .where(eq(rfpRequests.status, status as any))
    .orderBy(desc(rfpRequests.createdAt))
    .limit(limit)
    .offset(offset);

  // Check which ones this org already proposed on
  const rfpIds = rows.map(r => r.id);
  const myProposals = rfpIds.length
    ? await db.select({ rfpId: rfpProposals.rfpId })
        .from(rfpProposals)
        .where(and(inArray(rfpProposals.rfpId, rfpIds), eq(rfpProposals.orgId, orgId)))
    : [];
  const proposedSet = new Set(myProposals.map(p => p.rfpId));

  return c.json({
    data: rows.map(r => ({
      ...r,
      // Mask phone after proposal submission only — raw phone never returned
      alreadyProposed: proposedSet.has(r.id),
    })),
    limit,
    offset,
  });
});

// ── POST /marketplace/rfp/:id/propose — submit a proposal ──
marketplaceRouter.post("/rfp/:id/propose", async (c) => {
  const orgId  = getOrgId(c);
  const rfpId  = c.req.param("id");
  const body   = await c.req.json();
  const { proposalText, proposedPrice, estimatedDuration, includedServices } = body;

  if (!proposalText || !proposedPrice) {
    return c.json({ error: "نص العرض والسعر المقترح مطلوبان" }, 400);
  }

  const [rfp] = await db.select({ id: rfpRequests.id, status: rfpRequests.status })
    .from(rfpRequests).where(eq(rfpRequests.id, rfpId));

  if (!rfp || rfp.status !== "open") return apiErr(c, "MKT_RFP_NOT_FOUND", 404);

  // Prevent duplicate proposals from same org
  const [existing] = await db.select({ id: rfpProposals.id })
    .from(rfpProposals)
    .where(and(eq(rfpProposals.rfpId, rfpId), eq(rfpProposals.orgId, orgId)));

  if (existing) return apiErr(c, "MKT_ALREADY_PROPOSED", 409);

  const [proposal] = await db.insert(rfpProposals).values({
    rfpId,
    orgId,
    proposalText,
    proposedPrice: String(proposedPrice),
    estimatedDuration: estimatedDuration ?? null,
    includedServices:  includedServices  ?? [],
    status: "submitted",
  }).returning();

  // Update RFP status to in_review (fire-and-forget)
  db.update(rfpRequests)
    .set({ status: "in_review" })
    .where(and(eq(rfpRequests.id, rfpId), eq(rfpRequests.status, "open")))
    .catch(() => {});

  return c.json({ data: proposal }, 201);
});

// ── GET /marketplace/rfp/my-proposals — org's own proposals ──
marketplaceRouter.get("/rfp/my-proposals", async (c) => {
  const orgId = getOrgId(c);

  const rows = await db
    .select({
      id:               rfpProposals.id,
      rfpId:            rfpProposals.rfpId,
      proposalText:     rfpProposals.proposalText,
      proposedPrice:    rfpProposals.proposedPrice,
      estimatedDuration: rfpProposals.estimatedDuration,
      status:           rfpProposals.status,
      createdAt:        rfpProposals.createdAt,
      eventType:        rfpRequests.eventType,
      guestCount:       rfpRequests.guestCount,
      eventDate:        rfpRequests.eventDate,
      budget:           rfpRequests.budget,
      description:      rfpRequests.description,
      rfpStatus:        rfpRequests.status,
    })
    .from(rfpProposals)
    .innerJoin(rfpRequests, eq(rfpRequests.id, rfpProposals.rfpId))
    .where(eq(rfpProposals.orgId, orgId))
    .orderBy(desc(rfpProposals.createdAt));

  return c.json({ data: rows });
});

// ── GET /marketplace/my-listings — authenticated ───────────
marketplaceRouter.get("/my-listings", async (c) => {
  const orgId = getOrgId(c);

  const rows = await db
    .select({
      id:       marketplaceListings.id,
      isActive: marketplaceListings.isActive,
      marketplacePrice: marketplaceListings.marketplacePrice,
      bookings: marketplaceListings.bookings,
      views:    marketplaceListings.views,
      featuredUntil: marketplaceListings.featuredUntil,
      sortScore: marketplaceListings.sortScore,
      createdAt: marketplaceListings.createdAt,
      service:   services.name,
      serviceId: services.id,
      basePrice: services.basePrice,
      status:    services.status,
    })
    .from(marketplaceListings)
    .innerJoin(services, eq(services.id, marketplaceListings.serviceId))
    .where(eq(marketplaceListings.orgId, orgId));

  return c.json({ data: rows });
});

// ── POST /marketplace/listings — list a service ────────────
marketplaceRouter.post("/listings", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { serviceId, marketplacePrice } = await c.req.json() as { serviceId: string; marketplacePrice?: number };

  if (!serviceId) return c.json({ error: "serviceId مطلوب" }, 400);

  // Verify service belongs to this org
  const [svc] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));

  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  const [listing] = await db
    .insert(marketplaceListings)
    .values({
      orgId,
      serviceId,
      isActive:         true,
      marketplacePrice: marketplacePrice ? String(marketplacePrice) : null,
    })
    .onConflictDoNothing()
    .returning();

  insertAuditLog({ orgId, userId, action: "created", resource: "marketplace_listing", resourceId: listing?.id ?? serviceId });

  return c.json({ data: listing }, 201);
});

// ── DELETE /marketplace/listings/:id ──────────────────────
marketplaceRouter.delete("/listings/:id", async (c) => {
  const orgId     = getOrgId(c);
  const userId    = getUserId(c);
  const listingId = c.req.param("id");

  const [deleted] = await db
    .delete(marketplaceListings)
    .where(and(eq(marketplaceListings.id, listingId), eq(marketplaceListings.orgId, orgId)))
    .returning({ id: marketplaceListings.id });

  if (!deleted) return apiErr(c, "MKT_LISTING_NOT_FOUND", 404);

  insertAuditLog({ orgId, userId, action: "deleted", resource: "marketplace_listing", resourceId: listingId });
  return c.json({ data: { deleted: true } });
});
