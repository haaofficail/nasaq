import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, ilike, sql, count, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { services, serviceMedia, serviceAddons, addons, categories, pricingRules, serviceComponents, serviceCosts, assetTypes, serviceRequirements, serviceStaff, users, assets, serviceQuestions } from "@nasaq/db/schema";
import { generateSlug, getOrgId, getUserId, validateBody, getPagination, safeSortField } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { nanoid } from "nanoid";
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
  basePrice: z.coerce.string(),
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
  depositPercent: z.coerce.string().default("30"),
  
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

  // ── Service Engine fields (migration 019) ────────────────────────────────
  displayName:        z.string().optional(),
  serviceType:        z.enum(["appointment","execution","field_service","rental","event_rental","product","product_shipping","food_order","package","add_on","project"]).default("appointment"),
  servicePricingMode: z.enum(["fixed","from_price","variable"]).default("fixed"),
  assignmentMode:     z.enum(["open","restricted"]).default("open"),
  isBookable:         z.boolean().default(true),
  isVisibleInPOS:     z.boolean().default(true),
  isVisibleOnline:    z.boolean().default(true),
  bufferBeforeMinutes: z.number().int().default(0),
  bufferAfterMinutes:  z.number().int().default(0),
  // ── Delivery layer (migration 021) ───────────────────────────────────────
  hasDelivery:        z.boolean().default(false),
  allowsPickup:       z.boolean().default(false),
  allowsInVenue:      z.boolean().default(false),
  deliveryCost:       z.coerce.string().default("0"),
});

const updateServiceSchema = createServiceSchema.partial();

// ============================================================
// GET /services — List with filtering, search, pagination
// ============================================================

servicesRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  
  // Filters
  const status       = c.req.query("status");
  const categoryId   = c.req.query("categoryId");
  const search       = c.req.query("search");
  const featured     = c.req.query("featured");
  const visibleInPOS    = c.req.query("visibleInPOS");
  const visibleOnline   = c.req.query("visibleOnline");
  const bookableOnly    = c.req.query("bookable");
  const sortBy = safeSortField<ServiceSortField>(c.req.query("sortBy"), SERVICE_SORT_FIELDS, "sortOrder");
  const sortDir = c.req.query("sortDir") === "desc" ? "desc" : "asc";

  // Build conditions — exclude archived by default; status enum controls visibility
  const conditions = [eq(services.orgId, orgId)];

  if (status) {
    conditions.push(eq(services.status, status as any));
  } else {
    // Don't show archived (soft-deleted) unless explicitly requested
    conditions.push(sql`${services.status} != 'archived'`);
  }
  if (categoryId)            conditions.push(eq(services.categoryId, categoryId));
  if (featured === "true")   conditions.push(eq(services.isFeatured, true));
  if (search)                conditions.push(ilike(services.name, `%${search}%`));
  if (visibleInPOS === "true")  conditions.push(eq((services as any).isVisibleInPOS, true));
  if (visibleOnline === "true") conditions.push(eq((services as any).isVisibleOnline, true));
  if (bookableOnly === "true")  conditions.push(eq((services as any).isBookable, true));

  // Query
  const [rows, [{ total }]] = await Promise.all([
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

  // Attach cover images in a single batch query
  let coverMap: Record<string, string> = {};
  if (rows.length > 0) {
    const ids = rows.map(r => r.id);
    const covers = await db
      .select({ serviceId: serviceMedia.serviceId, url: serviceMedia.url })
      .from(serviceMedia)
      .where(and(inArray(serviceMedia.serviceId, ids), eq(serviceMedia.isActive, true), eq(serviceMedia.isCover, true)));
    covers.forEach(c => { if (c.serviceId && c.url) coverMap[c.serviceId] = c.url; });
  }

  const result = rows.map(r => ({ ...r, coverImage: coverMap[r.id] || null }));

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
      .where(and(eq(serviceMedia.serviceId, id), eq(serviceMedia.isActive, true)))
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

  const slug = body.slug || `${generateSlug(body.name)}-${nanoid(6).toLowerCase()}`;

  const { basePrice, ...bodyRest } = body;
  const [created] = await db
    .insert(services)
    .values({ orgId, ...bodyRest, slug, basePrice: String(basePrice) })
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

  // Don't auto-regenerate slug on update — caller must provide explicit slug to change it
  // (prevents collision when renaming a service)

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

  const [updated] = await db
    .update(services)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(services.id, id), eq(services.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Service not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "service", resourceId: updated.id });
  return c.json({ data: updated });
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

  const [softDeleted] = await db
    .update(serviceMedia)
    .set({ isActive: false })
    .where(eq(serviceMedia.id, mediaId))
    .returning();

  if (!softDeleted) return c.json({ error: "Media not found" }, 404);
  return c.json({ data: softDeleted });
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
      slug: `${generateSlug(original.name)}-copy-${nanoid(6).toLowerCase()}`,
      status: "draft",
      totalBookings: 0,
      avgRating: null,
    })
    .returning();

  // Copy media
  const media = await db.select().from(serviceMedia).where(and(eq(serviceMedia.serviceId, id), eq(serviceMedia.isActive, true)));
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

// ============================================================
// SERVICE COMPONENTS — مكونات الخدمة
// ============================================================

const createComponentSchema = z.object({
  sourceType: z.enum(["inventory", "manual", "flower"]).default("manual"),
  inventoryItemId: z.string().uuid().optional().nullable(),
  flowerInventoryId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0).default(1),
  unit: z.string().default("حبة"),
  unitCost: z.number().min(0).default(0),
  isOptional: z.boolean().default(false),
  isUpgradeable: z.boolean().default(false),
  showToCustomer: z.boolean().default(true),
  customerLabel: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

servicesRouter.get("/:id/components", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");

  const components = await db
    .select()
    .from(serviceComponents)
    .where(and(
      eq(serviceComponents.serviceId, serviceId),
      eq(serviceComponents.orgId, orgId),
      eq(serviceComponents.isActive, true),
    ))
    .orderBy(asc(serviceComponents.sortOrder));

  // Enrich with asset type name for inventory components
  const assetTypeIds = components
    .filter(c => c.sourceType === "inventory" && c.inventoryItemId)
    .map(c => c.inventoryItemId!);

  let assetTypeMap = new Map<string, string>();
  if (assetTypeIds.length > 0) {
    const types = await db.select({ id: assetTypes.id, name: assetTypes.name })
      .from(assetTypes)
      .where(sql`${assetTypes.id} = ANY(${assetTypeIds})`);
    assetTypeMap = new Map(types.map(t => [t.id, t.name]));
  }

  const enriched = components.map(comp => ({
    ...comp,
    assetTypeName: comp.inventoryItemId ? (assetTypeMap.get(comp.inventoryItemId) ?? null) : null,
    totalCost: Number(comp.quantity ?? 1) * Number(comp.unitCost ?? 0),
  }));

  const totalCost = enriched.reduce((s, c) => s + c.totalCost, 0);
  return c.json({ data: enriched, totalCost });
});

servicesRouter.post("/:id/components", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");
  const body = createComponentSchema.parse(await c.req.json());

  const [comp] = await db.insert(serviceComponents).values({
    orgId, serviceId,
    sourceType: body.sourceType,
    inventoryItemId: body.inventoryItemId ?? null,
    flowerInventoryId: body.flowerInventoryId ?? null,
    name: body.name,
    description: body.description ?? null,
    quantity: String(body.quantity),
    unit: body.unit,
    unitCost: String(body.unitCost),
    isOptional: body.isOptional,
    isUpgradeable: body.isUpgradeable,
    showToCustomer: body.showToCustomer,
    customerLabel: body.customerLabel ?? null,
    sortOrder: body.sortOrder,
  }).returning();

  return c.json({ data: comp }, 201);
});

servicesRouter.put("/:id/components/:compId", async (c) => {
  const orgId = getOrgId(c);
  const compId = c.req.param("compId");
  const body = createComponentSchema.partial().parse(await c.req.json());

  const updates: any = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.quantity !== undefined) updates.quantity = String(body.quantity);
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.unitCost !== undefined) updates.unitCost = String(body.unitCost);
  if (body.isOptional !== undefined) updates.isOptional = body.isOptional;
  if (body.isUpgradeable !== undefined) updates.isUpgradeable = body.isUpgradeable;
  if (body.showToCustomer !== undefined) updates.showToCustomer = body.showToCustomer;
  if (body.customerLabel !== undefined) updates.customerLabel = body.customerLabel;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  if (body.inventoryItemId !== undefined) updates.inventoryItemId = body.inventoryItemId;
  if (body.sourceType !== undefined) updates.sourceType = body.sourceType;

  const [updated] = await db.update(serviceComponents).set(updates)
    .where(and(eq(serviceComponents.id, compId), eq(serviceComponents.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "المكون غير موجود" }, 404);
  return c.json({ data: updated });
});

servicesRouter.delete("/:id/components/:compId", async (c) => {
  const orgId = getOrgId(c);
  const compId = c.req.param("compId");

  const [deleted] = await db.update(serviceComponents)
    .set({ isActive: false })
    .where(and(eq(serviceComponents.id, compId), eq(serviceComponents.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "المكون غير موجود" }, 404);
  return c.json({ data: { success: true } });
});

// ============================================================
// SERVICE COSTS — تكلفة الخدمة
// ============================================================

servicesRouter.get("/:id/costs", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");

  const [costs] = await db.select().from(serviceCosts)
    .where(and(eq(serviceCosts.serviceId, serviceId), eq(serviceCosts.orgId, orgId)));

  return c.json({ data: costs ?? null });
});

servicesRouter.put("/:id/costs", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");
  const body = await c.req.json();

  const [existing] = await db.select({ id: serviceCosts.id }).from(serviceCosts)
    .where(and(eq(serviceCosts.serviceId, serviceId), eq(serviceCosts.orgId, orgId)));

  const vals = {
    materialCost: String(body.materialCost ?? 0),
    laborMinutes: body.laborMinutes ?? 0,
    laborCostPerMinute: String(body.laborCostPerMinute ?? 0),
    overheadPercent: String(body.overheadPercent ?? 0),
    commissionPercent: String(body.commissionPercent ?? 0),
    notes: body.notes ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db.update(serviceCosts).set(vals)
      .where(eq(serviceCosts.id, existing.id)).returning();
    return c.json({ data: updated });
  } else {
    const [created] = await db.insert(serviceCosts)
      .values({ orgId, serviceId, ...vals }).returning();
    return c.json({ data: created }, 201);
  }
});

// ============================================================
// SERVICE REQUIREMENTS — متطلبات الخدمة
// ============================================================

const requirementSchema = z.object({
  requirementType: z.enum(["employee", "asset", "text"]),
  userId: z.string().uuid().optional().nullable(),
  employeeRole: z.string().optional().nullable(),
  assetId: z.string().uuid().optional().nullable(),
  assetTypeId: z.string().uuid().optional().nullable(),
  label: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().optional().nullable(),
  isRequired: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

servicesRouter.get("/:id/requirements", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");

  const reqs = await db.select().from(serviceRequirements)
    .where(and(
      eq(serviceRequirements.serviceId, serviceId),
      eq(serviceRequirements.orgId, orgId),
      eq(serviceRequirements.isActive, true)
    ))
    .orderBy(asc(serviceRequirements.sortOrder), asc(serviceRequirements.createdAt));

  // Batch-load related data to avoid N+1
  const userIds    = [...new Set(reqs.filter(r => r.requirementType === "employee" && r.userId).map(r => r.userId!))];
  const assetIds   = [...new Set(reqs.filter(r => r.requirementType === "asset" && r.assetId).map(r => r.assetId!))];
  const typeIds    = [...new Set(reqs.filter(r => r.requirementType === "asset" && r.assetTypeId && !r.assetId).map(r => r.assetTypeId!))];

  const [userRows, assetRows, typeRows] = await Promise.all([
    userIds.length  ? db.select({ id: users.id, name: users.name, jobTitle: users.jobTitle, avatar: users.avatar }).from(users).where(inArray(users.id, userIds)) : [],
    assetIds.length ? db.select({ id: assets.id, name: assets.name, serialNumber: assets.serialNumber, status: assets.status }).from(assets).where(inArray(assets.id, assetIds)) : [],
    typeIds.length  ? db.select({ id: assetTypes.id, name: assetTypes.name }).from(assetTypes).where(inArray(assetTypes.id, typeIds)) : [],
  ]);

  const userMap  = new Map(userRows.map(u  => [u.id,  u]));
  const assetMap = new Map(assetRows.map(a => [a.id, a]));
  const typeMap  = new Map(typeRows.map(t  => [t.id,  t]));

  const enriched = reqs.map((req) => {
    if (req.requirementType === "employee" && req.userId) {
      const u = userMap.get(req.userId);
      return { ...req, userName: u?.name, userJobTitle: u?.jobTitle, userAvatar: u?.avatar };
    }
    if (req.requirementType === "asset" && req.assetId) {
      const a = assetMap.get(req.assetId);
      return { ...req, assetName: a?.name, assetSerial: a?.serialNumber, assetStatus: a?.status };
    }
    if (req.requirementType === "asset" && req.assetTypeId) {
      const at = typeMap.get(req.assetTypeId);
      return { ...req, assetTypeName: at?.name };
    }
    return req;
  });

  return c.json({ data: enriched });
});

servicesRouter.post("/:id/requirements", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");
  const body = requirementSchema.parse(await c.req.json());

  const [created] = await db.insert(serviceRequirements).values({
    orgId, serviceId,
    requirementType: body.requirementType,
    userId: body.userId ?? null,
    employeeRole: body.employeeRole ?? null,
    assetId: body.assetId ?? null,
    assetTypeId: body.assetTypeId ?? null,
    label: body.label,
    quantity: body.quantity,
    notes: body.notes ?? null,
    isRequired: body.isRequired,
    sortOrder: body.sortOrder,
  }).returning();

  return c.json({ data: created }, 201);
});

servicesRouter.put("/:id/requirements/:reqId", async (c) => {
  const orgId = getOrgId(c);
  const reqId = c.req.param("reqId");
  const body = requirementSchema.partial().parse(await c.req.json());

  const updates: any = {};
  if (body.label !== undefined) updates.label = body.label;
  if (body.requirementType !== undefined) updates.requirementType = body.requirementType;
  if (body.userId !== undefined) updates.userId = body.userId;
  if (body.employeeRole !== undefined) updates.employeeRole = body.employeeRole;
  if (body.assetId !== undefined) updates.assetId = body.assetId;
  if (body.assetTypeId !== undefined) updates.assetTypeId = body.assetTypeId;
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.isRequired !== undefined) updates.isRequired = body.isRequired;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  const [updated] = await db.update(serviceRequirements).set(updates)
    .where(and(eq(serviceRequirements.id, reqId), eq(serviceRequirements.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "المتطلب غير موجود" }, 404);
  return c.json({ data: updated });
});

servicesRouter.delete("/:id/requirements/:reqId", async (c) => {
  const orgId = getOrgId(c);
  const reqId = c.req.param("reqId");

  const [deleted] = await db.update(serviceRequirements)
    .set({ isActive: false })
    .where(and(eq(serviceRequirements.id, reqId), eq(serviceRequirements.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "المتطلب غير موجود" }, 404);
  return c.json({ data: { success: true } });
});

// ============================================================
// SERVICE STAFF — ربط الموظفين بالخدمة
// GET  /services/:id/staff
// POST /services/:id/staff
// PUT  /services/:id/staff/:userId
// DELETE /services/:id/staff/:userId
// ============================================================

const serviceStaffSchema = z.object({
  userId:                z.string().uuid(),
  commissionMode:        z.enum(["inherit","none","percentage","fixed"]).default("inherit"),
  commissionValue:       z.number().min(0).default(0),
  customDurationMinutes: z.number().int().optional().nullable(),
  customPrice:           z.number().min(0).optional().nullable(),
});

servicesRouter.get("/:id/staff", async (c) => {
  const orgId    = getOrgId(c);
  const serviceId = c.req.param("id");

  const rows = await db
    .select({
      ss: serviceStaff,
      u:  { id: users.id, name: users.name, jobTitle: users.jobTitle, avatar: users.avatar },
    })
    .from(serviceStaff)
    .leftJoin(users, eq(serviceStaff.userId, users.id))
    .where(and(
      eq(serviceStaff.serviceId, serviceId),
      eq(serviceStaff.orgId, orgId),
      eq(serviceStaff.isActive, true),
    ))
    .orderBy(asc(serviceStaff.createdAt));

  return c.json({ data: rows.map(r => ({ ...r.ss, userName: r.u?.name, userJobTitle: r.u?.jobTitle, userAvatar: r.u?.avatar })) });
});

servicesRouter.post("/:id/staff", async (c) => {
  const orgId     = getOrgId(c);
  const serviceId = c.req.param("id");
  const body      = serviceStaffSchema.parse(await c.req.json());

  const [created] = await db
    .insert(serviceStaff)
    .values({
      orgId, serviceId,
      userId:                body.userId,
      commissionMode:        body.commissionMode,
      commissionValue:       String(body.commissionValue),
      customDurationMinutes: body.customDurationMinutes ?? null,
      customPrice:           body.customPrice != null ? String(body.customPrice) : null,
    })
    .onConflictDoUpdate({
      target: [serviceStaff.serviceId, serviceStaff.userId],
      set: {
        commissionMode:        body.commissionMode,
        commissionValue:       String(body.commissionValue),
        customDurationMinutes: body.customDurationMinutes ?? null,
        customPrice:           body.customPrice != null ? String(body.customPrice) : null,
        isActive:              true,
      },
    })
    .returning();

  return c.json({ data: created }, 201);
});

servicesRouter.put("/:id/staff/:userId", async (c) => {
  const orgId    = getOrgId(c);
  const serviceId = c.req.param("id");
  const userId   = c.req.param("userId");
  const body     = serviceStaffSchema.partial().parse(await c.req.json());

  const updates: any = {};
  if (body.commissionMode  !== undefined) updates.commissionMode  = body.commissionMode;
  if (body.commissionValue !== undefined) updates.commissionValue = String(body.commissionValue);
  if (body.customDurationMinutes !== undefined) updates.customDurationMinutes = body.customDurationMinutes;
  if (body.customPrice !== undefined) updates.customPrice = body.customPrice != null ? String(body.customPrice) : null;

  const [updated] = await db
    .update(serviceStaff)
    .set(updates)
    .where(and(
      eq(serviceStaff.serviceId, serviceId),
      eq(serviceStaff.userId, userId),
      eq(serviceStaff.orgId, orgId),
    ))
    .returning();

  if (!updated) return c.json({ error: "الموظف غير مرتبط بهذه الخدمة" }, 404);
  return c.json({ data: updated });
});

servicesRouter.delete("/:id/staff/:userId", async (c) => {
  const orgId    = getOrgId(c);
  const serviceId = c.req.param("id");
  const userId   = c.req.param("userId");

  const [deleted] = await db
    .update(serviceStaff)
    .set({ isActive: false })
    .where(and(
      eq(serviceStaff.serviceId, serviceId),
      eq(serviceStaff.userId, userId),
      eq(serviceStaff.orgId, orgId),
    ))
    .returning();

  if (!deleted) return c.json({ error: "الموظف غير مرتبط بهذه الخدمة" }, 404);
  return c.json({ data: { success: true } });
});

// ============================================================
// SERVICE QUESTIONS — أسئلة مخصصة للحجز
// ============================================================

const createQuestionSchema = z.object({
  question:   z.string().min(1),
  type:       z.enum(["text","textarea","select","multi","checkbox","number","date","location","file","image"]).default("text"),
  isRequired: z.boolean().default(false),
  options:    z.array(z.string()).default([]),
  isPaid:     z.boolean().default(false),
  price:      z.coerce.string().default("0"),
  sortOrder:  z.number().int().default(0),
});

// GET /services/:id/questions
servicesRouter.get("/:id/questions", async (c) => {
  const orgId    = getOrgId(c);
  const serviceId = c.req.param("id");
  const rows = await db
    .select()
    .from(serviceQuestions)
    .where(and(
      eq(serviceQuestions.serviceId, serviceId),
      eq(serviceQuestions.orgId, orgId),
      eq(serviceQuestions.isActive, true),
    ))
    .orderBy(asc(serviceQuestions.sortOrder));
  return c.json({ data: rows });
});

// POST /services/:id/questions
servicesRouter.post("/:id/questions", async (c) => {
  const orgId    = getOrgId(c);
  const serviceId = c.req.param("id");
  const parsed = createQuestionSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { options, ...rest } = parsed.data;
  const [created] = await db
    .insert(serviceQuestions)
    .values({ orgId, serviceId, ...rest, options: options as any })
    .returning();
  return c.json({ data: created }, 201);
});

// PUT /services/questions/:qid
servicesRouter.put("/questions/:qid", async (c) => {
  const orgId = getOrgId(c);
  const qid   = c.req.param("qid");
  const parsed = createQuestionSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { options, ...rest } = parsed.data;
  const updates: any = { ...rest, updatedAt: new Date() };
  if (options !== undefined) updates.options = options;
  const [updated] = await db
    .update(serviceQuestions)
    .set(updates)
    .where(and(eq(serviceQuestions.id, qid), eq(serviceQuestions.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Question not found" }, 404);
  return c.json({ data: updated });
});

// DELETE /services/questions/:qid
servicesRouter.delete("/questions/:qid", async (c) => {
  const orgId = getOrgId(c);
  const qid   = c.req.param("qid");
  const [deleted] = await db
    .update(serviceQuestions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(serviceQuestions.id, qid), eq(serviceQuestions.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "Question not found" }, 404);
  return c.json({ data: { success: true } });
});

// PUT /services/questions/reorder
servicesRouter.put("/questions/reorder", async (c) => {
  const orgId = getOrgId(c);
  const { items } = await c.req.json() as { items: { id: string; sortOrder: number }[] };
  if (!Array.isArray(items)) return c.json({ error: "items required" }, 400);
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      db.update(serviceQuestions)
        .set({ sortOrder, updatedAt: new Date() })
        .where(and(eq(serviceQuestions.id, id), eq(serviceQuestions.orgId, orgId)))
    )
  );
  return c.json({ success: true });
});
