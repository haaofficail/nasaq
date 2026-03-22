import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, ilike, sql, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { services, serviceMedia, serviceAddons, addons, categories, pricingRules } from "@nasaq/db/schema";
import { generateSlug, getOrgId, validateBody, getPagination, safeSortField } from "../lib/helpers";
import { SERVICE_SORT_FIELDS, type ServiceSortField } from "../lib/constants";

export const servicesRouter = new Hono();

// ============================================================
// SCHEMAS
// ============================================================

const createServiceSchema = z.object({
  name: z.string().min(1).max(300),
  nameEn: z.string().optional(),
  slug: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).default("draft"),
  
  // Pricing
  basePrice: z.string().or(z.number()).transform(String),
  currency: z.string().default("SAR"),
  vatInclusive: z.boolean().default(true),
  
  // Capacity
  minCapacity: z.number().int().optional(),
  maxCapacity: z.number().int().optional(),
  capacityLabel: z.string().optional(),
  
  // Duration
  durationMinutes: z.number().int().optional(),
  setupMinutes: z.number().int().optional(),
  teardownMinutes: z.number().int().optional(),
  bufferMinutes: z.number().int().default(0),
  
  // Booking rules
  minAdvanceHours: z.number().int().optional(),
  maxAdvanceeDays: z.number().int().optional(),
  depositPercent: z.string().or(z.number()).transform(String).default("30"),
  
  // Cancellation
  cancellationPolicy: z.object({
    freeHours: z.number().default(24),
    refundPercentBefore: z.number().default(50),
    refundDaysBefore: z.number().default(3),
    noRefundDaysBefore: z.number().default(1),
  }).optional(),
  
  // Location
  allowedLocationIds: z.array(z.string().uuid()).default([]),
  
  // Logistics
  requiredAssets: z.array(z.object({
    assetTypeId: z.string(),
    quantity: z.number().int(),
  })).default([]),
  requiredStaff: z.number().int().default(0),
  
  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  
  // Display
  sortOrder: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
});

const updateServiceSchema = createServiceSchema.partial();

// ============================================================
// GET /services — List with filtering, search, pagination
// ============================================================

servicesRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  
  // Filters
  const status = c.req.query("status");
  const categoryId = c.req.query("categoryId");
  const search = c.req.query("search");
  const featured = c.req.query("featured");
  const sortBy = safeSortField<ServiceSortField>(c.req.query("sortBy"), SERVICE_SORT_FIELDS, "sortOrder");
  const sortDir = c.req.query("sortDir") === "desc" ? "desc" : "asc";

  // Build conditions
  const conditions = [eq(services.orgId, orgId)];
  
  if (status) conditions.push(eq(services.status, status as any));
  if (categoryId) conditions.push(eq(services.categoryId, categoryId));
  if (featured === "true") conditions.push(eq(services.isFeatured, true));
  if (search) conditions.push(ilike(services.name, `%${search}%`));

  // Query
  const [result, [{ total }]] = await Promise.all([
    db
      .select()
      .from(services)
      .where(and(...conditions))
      .orderBy(sortDir === "desc" ? desc(services[sortBy] as any) : asc(services[sortBy] as any))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(services)
      .where(and(...conditions)),
  ]);

  return c.json({
    data: result,
    pagination: {
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
    },
  });
});

// ============================================================
// GET /services/:id — Full service with media, addons, pricing
// ============================================================

servicesRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), eq(services.orgId, orgId)));

  if (!service) return c.json({ error: "Service not found" }, 404);

  // Get related data in parallel
  const [media, svcAddons, pricing, category] = await Promise.all([
    db.select().from(serviceMedia)
      .where(eq(serviceMedia.serviceId, id))
      .orderBy(asc(serviceMedia.sortOrder)),
    
    db.select({
      serviceAddon: serviceAddons,
      addon: addons,
    }).from(serviceAddons)
      .leftJoin(addons, eq(serviceAddons.addonId, addons.id))
      .where(eq(serviceAddons.serviceId, id))
      .orderBy(asc(serviceAddons.sortOrder)),
    
    db.select().from(pricingRules)
      .where(and(eq(pricingRules.serviceId, id), eq(pricingRules.isActive, true)))
      .orderBy(desc(pricingRules.priority)),
    
    service.categoryId
      ? db.select().from(categories).where(eq(categories.id, service.categoryId)).then(r => r[0])
      : null,
  ]);

  return c.json({
    data: {
      ...service,
      category,
      media,
      addons: svcAddons.map(sa => ({
        ...sa.addon,
        priceOverride: sa.serviceAddon.priceOverride,
        typeOverride: sa.serviceAddon.typeOverride,
        sortOrder: sa.serviceAddon.sortOrder,
      })),
      pricingRules: pricing,
    },
  });
});

// ============================================================
// POST /services — Create
// ============================================================

servicesRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = await validateBody(c, createServiceSchema);
  if (!body) return;

  const slug = body.slug || generateSlug(body.name);

  const [created] = await db
    .insert(services)
    .values({ orgId, ...body, slug })
    .returning();

  return c.json({ data: created }, 201);
});

// ============================================================
// PUT /services/:id — Update
// ============================================================

servicesRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await validateBody(c, updateServiceSchema);
  if (!body) return;

  if (body.name && !body.slug) {
    body.slug = generateSlug(body.name);
  }

  // Handle status change to active -> set publishedAt
  const updates: any = { ...body, updatedAt: new Date() };
  if (body.status === "active") {
    updates.publishedAt = new Date();
  }

  const [updated] = await db
    .update(services)
    .set(updates)
    .where(and(eq(services.id, id), eq(services.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Service not found" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// DELETE /services/:id
// ============================================================

servicesRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(services)
    .where(and(eq(services.id, id), eq(services.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "Service not found" }, 404);
  return c.json({ data: deleted });
});

// ============================================================
// POST /services/:id/media — Add media
// ============================================================

servicesRouter.post("/:id/media", async (c) => {
  const serviceId = c.req.param("id");
  const body = await c.req.json();

  const [media] = await db
    .insert(serviceMedia)
    .values({
      serviceId,
      type: body.type || "image",
      url: body.url,
      thumbnailUrl: body.thumbnailUrl,
      altText: body.altText,
      sortOrder: body.sortOrder || 0,
      isCover: body.isCover || false,
      width: body.width,
      height: body.height,
      sizeBytes: body.sizeBytes,
    })
    .returning();

  return c.json({ data: media }, 201);
});

// ============================================================
// DELETE /services/:id/media/:mediaId
// ============================================================

servicesRouter.delete("/:id/media/:mediaId", async (c) => {
  const mediaId = c.req.param("mediaId");

  const [deleted] = await db
    .delete(serviceMedia)
    .where(eq(serviceMedia.id, mediaId))
    .returning();

  if (!deleted) return c.json({ error: "Media not found" }, 404);
  return c.json({ data: deleted });
});

// ============================================================
// POST /services/:id/addons — Link addon to service
// ============================================================

servicesRouter.post("/:id/addons", async (c) => {
  const serviceId = c.req.param("id");
  const body = await c.req.json();

  const [linked] = await db
    .insert(serviceAddons)
    .values({
      serviceId,
      addonId: body.addonId,
      priceOverride: body.priceOverride,
      typeOverride: body.typeOverride,
      sortOrder: body.sortOrder || 0,
    })
    .returning();

  return c.json({ data: linked }, 201);
});

// ============================================================
// POST /services/:id/duplicate — Duplicate a service
// ============================================================

servicesRouter.post("/:id/duplicate", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  // Get original
  const [original] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), eq(services.orgId, orgId)));

  if (!original) return c.json({ error: "Service not found" }, 404);

  // Create copy
  const { id: _id, createdAt, updatedAt, publishedAt, slug, totalBookings, avgRating, ...rest } = original;
  
  const [copy] = await db
    .insert(services)
    .values({
      ...rest,
      name: `${original.name} (نسخة)`,
      slug: generateSlug(`${original.name} نسخة`),
      status: "draft",
      totalBookings: 0,
      avgRating: null,
    })
    .returning();

  // Copy media
  const media = await db.select().from(serviceMedia).where(eq(serviceMedia.serviceId, id));
  if (media.length > 0) {
    await db.insert(serviceMedia).values(
      media.map(({ id: _mid, serviceId: _sid, createdAt: _ca, ...m }) => ({
        ...m,
        serviceId: copy.id,
      }))
    );
  }

  return c.json({ data: copy }, 201);
});
