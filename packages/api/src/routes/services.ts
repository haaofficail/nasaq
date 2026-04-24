import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, ilike, sql, count, inArray, notInArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { services, serviceMedia, serviceAddons, addons, categories, pricingRules, serviceComponents, serviceCosts, assetTypes, serviceRequirements, serviceStaff, users, assets, serviceQuestions, bookings, orgMembers, organizations } from "@nasaq/db/schema";
import { generateSlug, getOrgId, getUserId, validateBody, getPagination, safeSortField } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { nanoid } from "nanoid";
import { generateBarcodeString, lookupByBarcode, isBarcodeUnique } from "../lib/barcode";
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
  basePrice: z.coerce.string()
    .transform(s => s.trim().replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660)))
    .refine(s => /^\d+(\.\d{1,4})?$/.test(s), { message: "السعر يجب أن يكون رقماً موجباً أو صفراً" }),
  currency: z.string().default("SAR"),
  vatInclusive: z.boolean().default(true),

  // Capacity
  minCapacity: z.number().int().optional(),
  maxCapacity: z.number().int().optional(),
  capacityLabel: z.string().optional(),

  // Duration
  durationMinutes: z.number().int().min(1).optional(),
  setupMinutes: z.number().int().optional(),
  teardownMinutes: z.number().int().optional(),
  bufferMinutes: z.number().int().default(0),
  
  // Booking rules
  minAdvanceHours: z.number().int().optional(),
  maxAdvanceDays:  z.number().int().optional(), // canonical spelling — normalised to maxAdvanceeDays before persist
  maxAdvanceeDays: z.number().int().optional(), // legacy typo — kept for back-compat
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
  serviceType:        z.enum(["appointment","execution","field_service","rental","event_rental","product","product_shipping","food_order","package","add_on","project"]).optional(),
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
  // ── Barcode (migration 050) ──────────────────────────────────────────────
  barcode:            z.string().max(100).optional().nullable(),
  // ── POS price floor (migration 124) ─────────────────────────────────────
  minPrice:           z.coerce.string().optional().nullable(),
  // ── Amenities (migration 054) — for rental, chalet, apartment, hotel ────
  amenities:          z.array(z.string()).default([]),
  // ── Template link (migration 102) — field_service linked to event_package_template ──
  templateId:         z.string().uuid().optional().nullable(),
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
  const serviceType     = c.req.query("serviceType");
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
  if (categoryId)               conditions.push(eq(services.categoryId, categoryId));
  if (featured === "true")      conditions.push(eq(services.isFeatured, true));
  if (search)                   conditions.push(ilike(services.name, `%${search}%`));
  if (visibleInPOS === "true")  conditions.push(eq(services.isVisibleInPOS, true));
  if (visibleOnline === "true") conditions.push(eq(services.isVisibleOnline, true));
  if (bookableOnly === "true")  conditions.push(eq(services.isBookable, true));
  if (serviceType)              conditions.push(eq(services.serviceType, serviceType as any));

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

  // Attach template names + is_deletable in parallel batch queries
  const { pool: rawPool } = await import("@nasaq/db/client");

  let templateMap: Record<string, { id: string; name: string }> = {};
  let blockSet: Set<string> = new Set(); // service ids that cannot be deleted

  const templateIds = rows.map(r => (r as any).templateId).filter(Boolean);

  const [, blockRes] = await Promise.all([
    // Batch template names
    templateIds.length > 0
      ? rawPool.query(
          `SELECT id, name FROM event_package_templates WHERE id = ANY($1)`,
          [templateIds],
        ).then(({ rows: tRows }) => {
          tRows.forEach((t: any) => { templateMap[t.id] = { id: t.id, name: t.name }; });
        })
      : Promise.resolve(),

    // Batch is_deletable:
    //   false إذا كانت الخدمة مستخدمة في:
    //     1. service_order_items (execution items من أي طلب)
    //     2. service_orders نشطة (طلبات غير مغلقة)
    //     3. event_package_templates نشطة (مرتبطة كـ template_id)
    rows.length > 0
      ? rawPool.query<{ service_id: string }>(
          `SELECT DISTINCT s.id AS service_id
           FROM services s
           WHERE s.id = ANY($1)
             AND (
               -- 1. مستخدمة في execution items (service_order_items)
               --    via service_orders.service_id
               EXISTS (
                 SELECT 1 FROM service_order_items soi
                 JOIN service_orders so ON so.id = soi.service_order_id
                 WHERE so.service_id = s.id AND so.org_id = s.org_id
               )
               OR
               -- 2. لها طلبات ميدانية غير مغلقة/ملغاة
               EXISTS (
                 SELECT 1 FROM service_orders so
                 WHERE so.service_id = s.id
                   AND so.org_id = s.org_id
                   AND so.status NOT IN ('closed','cancelled')
               )
               OR
               -- 3. مرتبطة بقالب نشط
               EXISTS (
                 SELECT 1 FROM event_package_templates t
                 WHERE t.id = s.template_id AND t.is_active = TRUE
               )
             )`,
          [rows.map(r => r.id)],
        ).then(res => res.rows)
      : Promise.resolve([] as { service_id: string }[]),
  ]);

  (blockRes as { service_id: string }[]).forEach(r => blockSet.add(r.service_id));

  // Batch executionReady for execution-type services
  const EXEC_TYPES_LIST = new Set(["execution", "field_service", "project"]);
  const execIds = rows.filter(r => EXEC_TYPES_LIST.has(r.serviceType as string)).map(r => r.id);
  const execReadyMap: Record<string, boolean> = {};
  if (execIds.length > 0) {
    execIds.forEach(sid => { execReadyMap[sid] = false; }); // default: not ready
    const { rows: compRows } = await rawPool.query<{ service_id: string; comp_count: string; min_cost: string }>(
      `SELECT service_id,
              COUNT(*)::text            AS comp_count,
              MIN(unit_cost::numeric)::text AS min_cost
       FROM service_components
       WHERE service_id = ANY($1) AND is_active = true
       GROUP BY service_id`,
      [execIds]
    );
    compRows.forEach((r: any) => {
      execReadyMap[r.service_id] = Number(r.comp_count) > 0 && Number(r.min_cost) > 0;
    });
  }

  const result = rows.map(r => ({
    ...r,
    coverImage: coverMap[r.id] || null,
    template: (r as any).templateId ? (templateMap[(r as any).templateId] ?? null) : null,
    // false = يمكن حذفه، true = له تبعيات (طلب نشط أو قالب مرتبط)
    isDeletable: !blockSet.has(r.id),
    // null = لا ينطبق (خدمة حجز)، true/false = يُحدد للخدمات التنفيذية
    executionReady: EXEC_TYPES_LIST.has(r.serviceType as string) ? (execReadyMap[r.id] ?? false) : null,
  }));

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

  if (!service) return c.json({ error: "الخدمة غير موجودة" }, 404);

  // Get all related data in one parallel batch — no extra round trips needed
  const [media, svcAddons, pricing, category, components, requirements, staffRows, questions] = await Promise.all([
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

    db.select().from(serviceComponents)
      .where(and(eq(serviceComponents.serviceId, id), eq(serviceComponents.orgId, orgId), eq(serviceComponents.isActive, true)))
      .orderBy(asc(serviceComponents.sortOrder)),

    db.select().from(serviceRequirements)
      .where(and(eq(serviceRequirements.serviceId, id), eq(serviceRequirements.orgId, orgId), eq(serviceRequirements.isActive, true)))
      .orderBy(asc(serviceRequirements.sortOrder)),

    db.select({
      ss: serviceStaff,
      u: { id: users.id, name: users.name, jobTitle: users.jobTitle, avatar: users.avatar },
    }).from(serviceStaff)
      .leftJoin(users, eq(serviceStaff.userId, users.id))
      .where(and(eq(serviceStaff.serviceId, id), eq(serviceStaff.orgId, orgId), eq(serviceStaff.isActive, true)))
      .orderBy(asc(serviceStaff.createdAt)),

    db.select().from(serviceQuestions)
      .where(and(eq(serviceQuestions.serviceId, id), eq(serviceQuestions.orgId, orgId), eq(serviceQuestions.isActive, true)))
      .orderBy(asc(serviceQuestions.sortOrder)),
  ]);

  // Fetch linked template if exists
  let template = null;
  if ((service as any).templateId) {
    const { pool: p } = await import("@nasaq/db/client");
    const { rows: tRows } = await p.query(
      `SELECT t.*, COUNT(i.id)::int AS item_count,
              COALESCE(SUM(i.unit_cost_estimate * i.quantity), 0) AS estimated_cost
       FROM event_package_templates t
       LEFT JOIN event_package_template_items i ON i.template_id = t.id
       WHERE t.id = $1 AND t.org_id = $2
       GROUP BY t.id`,
      [(service as any).templateId, orgId]
    );
    template = tRows[0] ?? null;
  }

  // Compute executionReady (only for execution-type services)
  const EXEC_TYPES_DETAIL = new Set(["execution", "field_service", "project"]);
  const isExecService = EXEC_TYPES_DETAIL.has(service.serviceType as string);
  const executionReady: boolean | null = isExecService
    ? components.length > 0 && components.every((c: any) => Number(c.unitCost ?? 0) > 0)
    : null;

  return c.json({
    data: {
      ...service,
      executionReady,
      template,
      category,
      media,
      addons: svcAddons.map(sa => ({
        linkId: sa.serviceAddon.id,        // ID العلاقة — مطلوب للتعديل والحذف
        ...sa.addon,
        priceOverride: sa.serviceAddon.priceOverride,
        typeOverride: sa.serviceAddon.typeOverride,
        sortOrder: sa.serviceAddon.sortOrder,
      })),
      pricingRules: pricing,
      components,
      requirements,
      staff: staffRows.map(r => ({ ...r.ss, userName: r.u?.name, userJobTitle: r.u?.jobTitle, userAvatar: r.u?.avatar })),
      questions,
    },
  });
});

// ============================================================
// POST /services — Create
// ============================================================

type ServiceType =
  | "appointment" | "execution" | "field_service" | "rental" | "event_rental"
  | "product" | "product_shipping" | "food_order" | "package" | "add_on" | "project";

// أنواع الخدمات التي تتطلب مدة زمنية محددة
const TIMED_SERVICE_TYPES = new Set<ServiceType>(["appointment", "execution", "field_service"]);

// نوع الخدمة الافتراضي حسب نوع البيزنس
const BUSINESS_DEFAULT_SERVICE_TYPE: Record<string, ServiceType> = {
  salon:           "appointment",
  barber:          "appointment",
  spa:             "appointment",
  fitness:         "appointment",
  massage:         "appointment",
  photography:     "appointment",
  cafe:            "food_order",
  restaurant:      "food_order",
  bakery:          "food_order",
  catering:        "food_order",
  rental:          "rental",
  car_rental:      "rental",
  hotel:           "rental",
  real_estate:     "rental",
  events:          "event_rental",
  event_organizer: "event_rental",
  workshop:        "execution",
  maintenance:     "execution",
  logistics:       "field_service",
  construction:    "project",
  retail:          "product",
  flower_shop:     "product",
  school:          "product",
};

servicesRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = await validateBody(c, createServiceSchema);
  if (!body) return;

  // استنتاج نوع الخدمة من businessType إن لم يُحدد
  let resolvedServiceType: ServiceType = body.serviceType ?? "product";
  if (!body.serviceType) {
    const [org] = await db.select({ businessType: organizations.businessType })
      .from(organizations).where(eq(organizations.id, orgId));
    resolvedServiceType = BUSINESS_DEFAULT_SERVICE_TYPE[org?.businessType ?? ""] ?? "product";
  }

  // مدة الخدمة مطلوبة للخدمات المجدولة — افتراضي 60 دقيقة إذا لم تُحدد
  let resolvedDuration = body.durationMinutes;
  if (TIMED_SERVICE_TYPES.has(resolvedServiceType) && !resolvedDuration) {
    resolvedDuration = 60;
  }

  const slug = body.slug || `${generateSlug(body.name)}-${nanoid(6).toLowerCase()}`;

  // Auto-generate barcode if not provided
  let barcode = body.barcode ?? null;
  if (!barcode) {
    let attempts = 0;
    do {
      barcode = generateBarcodeString();
      attempts++;
    } while (!(await isBarcodeUnique(orgId, barcode)) && attempts < 10);
  }

  // Fix 5 — normalise maxAdvanceDays (correct spelling) → maxAdvanceeDays (DB column)
  const { basePrice, maxAdvanceDays: maxAdvanceDaysNorm, ...bodyRest } = body as any;
  const [created] = await db
    .insert(services)
    .values({
      orgId, ...bodyRest, slug, basePrice: String(basePrice), barcode,
      serviceType: resolvedServiceType as any,
      durationMinutes: resolvedDuration ?? null,
      ...(maxAdvanceDaysNorm !== undefined && { maxAdvanceeDays: maxAdvanceDaysNorm }),
    })
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

  // إذا حاول المستخدم تصفير مدة خدمة مجدولة، ارفض التعديل
  if (body.serviceType && TIMED_SERVICE_TYPES.has(body.serviceType) && body.durationMinutes !== undefined && !body.durationMinutes) {
    return c.json({ error: "لا يمكن حذف مدة الخدمة المجدولة — حدّد قيمة بالدقائق", code: "DURATION_REQUIRED" }, 422);
  }

  // Fix 1 — تحقق من التبعيات قبل الأرشفة عبر PUT (نفس فحوصات DELETE)
  if (body.status === "archived") {
    const depError = await checkServiceArchiveDeps(orgId, id);
    if (depError) return c.json({ error: depError }, 409);
  }

  // Don't auto-regenerate slug on update — caller must provide explicit slug to change it

  // Fix 5 — normalise maxAdvanceDays (correct spelling) → maxAdvanceeDays (DB column)
  const { maxAdvanceDays: maxAdvanceDaysNorm, ...bodyForUpdate } = body as any;

  // publishedAt يُضبط مرة واحدة فقط عند أول نشر — لا يُعاد التعيين في كل حفظ
  const updates: any = { ...bodyForUpdate, updatedAt: new Date() };
  if (maxAdvanceDaysNorm !== undefined) {
    updates.maxAdvanceeDays = maxAdvanceDaysNorm;
  }
  if (body.status === "active") {
    const [current] = await db.select({ publishedAt: services.publishedAt })
      .from(services)
      .where(and(eq(services.id, id), eq(services.orgId, orgId)));
    if (current && !current.publishedAt) {
      updates.publishedAt = new Date();
    }
  }

  const [updated] = await db
    .update(services)
    .set(updates)
    .where(and(eq(services.id, id), eq(services.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "الخدمة غير موجودة" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// checkServiceArchiveDeps — shared helper for DELETE + PUT→archived
// Returns an error string if the service has active dependencies,
// or null when it is safe to archive.
// ============================================================

async function checkServiceArchiveDeps(orgId: string, id: string): Promise<string | null> {
  const { pool: rawPool } = await import("@nasaq/db/client");

  // ── فحص 1: حجوزات نشطة (bookings) ─────────────────────────
  const [{ activeCount }] = await db
    .select({ activeCount: count() })
    .from(bookings)
    .where(and(
      eq(bookings.orgId, orgId),
      notInArray(bookings.status, ["cancelled", "no_show", "completed"]),
      sql`EXISTS (
        SELECT 1 FROM booking_items bi
        WHERE bi.booking_id = ${bookings.id} AND bi.service_id = ${id}
      )`,
    ));
  if (Number(activeCount) > 0) {
    return `لا يمكن أرشفة الخدمة — يوجد ${activeCount} حجز نشط عليها. أكمل الحجوزات أو ألغِها أولاً`;
  }

  // ── فحص 2: execution items (service_order_items) ────────────
  const { rows: soiRows } = await rawPool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM service_order_items soi
     JOIN service_orders so ON so.id = soi.service_order_id
     WHERE so.service_id=$1 AND so.org_id=$2`,
    [id, orgId],
  );
  if (soiRows[0]?.cnt > 0) {
    return "لا يمكن أرشفة هذه الخدمة لأنها مستخدمة في طلب — عدِّل الطلب أو أغلقه أولاً";
  }

  // ── فحص 3: مشاريع ميدانية نشطة ─────────────────────────────
  const { rows: soRows } = await rawPool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM service_orders
     WHERE service_id=$1 AND org_id=$2
       AND status NOT IN ('closed','cancelled')`,
    [id, orgId],
  );
  if (soRows[0]?.cnt > 0) {
    return `لا يمكن أرشفة هذه الخدمة لأنها مستخدمة في ${soRows[0].cnt} طلب ميداني نشط`;
  }

  // ── فحص 4: مرتبط بقالب نشط ──────────────────────────────────
  const { rows: tplRows } = await rawPool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM event_package_templates
     WHERE id = (SELECT template_id FROM services WHERE id=$1 AND org_id=$2)
       AND is_active=TRUE`,
    [id, orgId],
  );
  if (tplRows[0]?.cnt > 0) {
    return "لا يمكن أرشفة هذه الخدمة لأنها مرتبطة بقالب نشط — أزل الرابط من إعدادات الخدمة أولاً";
  }

  return null; // safe to archive
}

// ============================================================
// DELETE /services/:id
// ============================================================

servicesRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const depError = await checkServiceArchiveDeps(orgId, id);
  if (depError) return c.json({ error: depError }, 409);

  const [updated] = await db
    .update(services)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(services.id, id), eq(services.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "الخدمة غير موجودة" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "service", resourceId: updated.id });
  return c.json({ data: updated });
});

// ============================================================
// POST /services/:id/media — Add media
// ============================================================

const addMediaSchema = z.object({
  url:          z.string().url(),
  type:         z.enum(["image", "video"]).default("image"),
  thumbnailUrl: z.string().url().optional().nullable(),
  altText:      z.string().max(300).optional().nullable(),
  sortOrder:    z.number().int().default(0),
  isCover:      z.boolean().default(false),
  width:        z.number().int().positive().optional().nullable(),
  height:       z.number().int().positive().optional().nullable(),
  sizeBytes:    z.number().int().positive().optional().nullable(),
});

servicesRouter.post("/:id/media", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");

  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  const parsed = addMediaSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const body = parsed.data;

  const [media] = await db
    .insert(serviceMedia)
    .values({
      serviceId,
      type:         body.type,
      url:          body.url,
      thumbnailUrl: body.thumbnailUrl ?? null,
      altText:      body.altText ?? null,
      sortOrder:    body.sortOrder,
      isCover:      body.isCover,
      width:        body.width ?? null,
      height:       body.height ?? null,
      sizeBytes:    body.sizeBytes ?? null,
    })
    .returning();

  return c.json({ data: media }, 201);
});

// ============================================================
// DELETE /services/:id/media/:mediaId
// ============================================================

servicesRouter.delete("/:id/media/:mediaId", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");
  const mediaId = c.req.param("mediaId");

  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  const [softDeleted] = await db
    .update(serviceMedia)
    .set({ isActive: false })
    .where(and(eq(serviceMedia.id, mediaId), eq(serviceMedia.serviceId, serviceId)))
    .returning();

  if (!softDeleted) return c.json({ error: "الصورة غير موجودة" }, 404);
  return c.json({ data: softDeleted });
});

// ============================================================
// POST /services/:id/addons — Link addon to service
// ============================================================

servicesRouter.post("/:id/addons", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");
  const body = await c.req.json();

  // Verify service belongs to org
  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  // Verify addon belongs to same org
  const [addon] = await db.select({ id: addons.id }).from(addons)
    .where(and(eq(addons.id, body.addonId), eq(addons.orgId, orgId)));
  if (!addon) return c.json({ error: "الإضافة غير موجودة" }, 404);

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
// DELETE /services/:id/addons/:addonId — Unlink addon from service
// ============================================================

servicesRouter.delete("/:id/addons/:addonId", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");
  const addonId = c.req.param("addonId");

  // Verify service belongs to org
  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  await db.delete(serviceAddons)
    .where(and(eq(serviceAddons.serviceId, serviceId), eq(serviceAddons.addonId, addonId)));

  return c.json({ success: true });
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

  if (!original) return c.json({ error: "الخدمة غير موجودة" }, 404);

  // جلب كل البيانات المرتبطة قبل النسخ
  const [media, linkedAddons, rules, comps, reqs, questions] = await Promise.all([
    db.select().from(serviceMedia).where(and(eq(serviceMedia.serviceId, id), eq(serviceMedia.isActive, true))),
    db.select().from(serviceAddons).where(eq(serviceAddons.serviceId, id)),
    db.select().from(pricingRules).where(and(eq(pricingRules.serviceId, id), eq(pricingRules.isActive, true))),
    db.select().from(serviceComponents).where(and(eq(serviceComponents.serviceId, id), eq(serviceComponents.isActive, true))),
    db.select().from(serviceRequirements).where(and(eq(serviceRequirements.serviceId, id), eq(serviceRequirements.isActive, true))),
    db.select().from(serviceQuestions).where(and(eq(serviceQuestions.serviceId, id), eq(serviceQuestions.orgId, orgId), eq(serviceQuestions.isActive, true))),
  ]);

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

  // نسخ الصور
  if (media.length > 0) {
    await db.insert(serviceMedia).values(
      media.map(({ id: _mid, serviceId: _sid, createdAt: _ca, ...m }) => ({ ...m, serviceId: copy.id }))
    );
  }

  // نسخ الإضافات المربوطة
  if (linkedAddons.length > 0) {
    await db.insert(serviceAddons).values(
      linkedAddons.map(({ id: _lid, serviceId: _sid, ...a }) => ({ ...a, serviceId: copy.id }))
    );
  }

  // نسخ قواعد التسعير
  if (rules.length > 0) {
    await db.insert(pricingRules).values(
      rules.map(({ id: _rid, serviceId: _sid, createdAt: _ca, updatedAt: _ua, ...r }) => ({ ...r, serviceId: copy.id }))
    );
  }

  // نسخ المكونات
  if (comps.length > 0) {
    await db.insert(serviceComponents).values(
      comps.map(({ id: _cid, serviceId: _sid, createdAt: _ca, ...comp }) => ({ ...comp, serviceId: copy.id }))
    );
  }

  // نسخ المتطلبات
  if (reqs.length > 0) {
    await db.insert(serviceRequirements).values(
      reqs.map(({ id: _rid, serviceId: _sid, createdAt: _ca, ...req }) => ({ ...req, serviceId: copy.id }))
    );
  }

  // نسخ الأسئلة
  if (questions.length > 0) {
    await db.insert(serviceQuestions).values(
      questions.map(({ id: _qid, serviceId: _sid, createdAt: _ca, updatedAt: _ua, ...q }) => ({ ...q, serviceId: copy.id }))
    );
  }

  return c.json({ data: copy }, 201);
});

// ============================================================
// SERVICE COMPONENTS — مكونات الخدمة
// ============================================================

const createComponentSchema = z.object({
  sourceType: z.enum(["inventory", "manual", "flower", "asset"]).default("manual"),
  inventoryItemId: z.string().uuid().optional().nullable(),
  flowerInventoryId: z.string().uuid().optional().nullable(),
  assetId: z.string().uuid().optional().nullable(),
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
      .where(inArray(assetTypes.id, assetTypeIds));
    assetTypeMap = new Map(types.map(t => [t.id, t.name]));
  }

  // Enrich with asset data for asset components
  const assetIds = components
    .filter(c => c.sourceType === "asset" && c.assetId)
    .map(c => c.assetId!);

  let assetMap = new Map<string, { name: string | null; status: string; category: string | null; condition: string | null }>();
  if (assetIds.length > 0) {
    const assetRows = await db.select({
      id: assets.id,
      name: assets.name,
      status: assets.status,
      condition: assets.condition,
      assetTypeId: assets.assetTypeId,
    }).from(assets).where(inArray(assets.id, assetIds));

    // Get asset type categories for these assets
    const typeIds = assetRows.map(a => a.assetTypeId).filter(Boolean);
    let typeMap = new Map<string, string | null>();
    if (typeIds.length > 0) {
      const atRows = await db.select({ id: assetTypes.id, category: assetTypes.category, name: assetTypes.name })
        .from(assetTypes)
        .where(inArray(assetTypes.id, typeIds));
      typeMap = new Map(atRows.map(t => [t.id, t.category || t.name]));
    }

    for (const a of assetRows) {
      assetMap.set(a.id, {
        name: a.name,
        status: a.status,
        category: typeMap.get(a.assetTypeId) ?? null,
        condition: a.condition,
      });
    }
  }

  const enriched = components.map(comp => ({
    ...comp,
    assetTypeName: comp.inventoryItemId ? (assetTypeMap.get(comp.inventoryItemId) ?? null) : null,
    assetInfo: comp.assetId ? (assetMap.get(comp.assetId) ?? null) : null,
    totalCost: Number(comp.quantity ?? 1) * Number(comp.unitCost ?? 0),
  }));

  const totalCost = enriched.reduce((s, c) => s + c.totalCost, 0);
  return c.json({ data: enriched, totalCost });
});

servicesRouter.post("/:id/components", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");

  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  const body = createComponentSchema.parse(await c.req.json());

  // Fix 6b — تحقق من انتماء الأصل والمنتج لنفس المنشأة
  if (body.sourceType === "asset" && body.assetId) {
    const [asset] = await db.select({ id: assets.id }).from(assets)
      .where(and(eq(assets.id, body.assetId), eq(assets.orgId, orgId)));
    if (!asset) return c.json({ error: "الأصل غير موجود في هذه المنشأة" }, 404);
  }
  if (body.sourceType === "inventory" && body.inventoryItemId) {
    const { pool: rawPool } = await import("@nasaq/db/client");
    const { rows: invRows } = await rawPool.query(
      `SELECT id FROM inventory_products WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [body.inventoryItemId, orgId],
    );
    if (!invRows.length) return c.json({ error: "المنتج غير موجود في هذه المنشأة" }, 404);
  }

  const [comp] = await db.insert(serviceComponents).values({
    orgId, serviceId,
    sourceType: body.sourceType,
    inventoryItemId: body.sourceType === "inventory" ? (body.inventoryItemId ?? null) : null,
    flowerInventoryId: body.sourceType === "flower" ? (body.flowerInventoryId ?? null) : null,
    assetId: body.sourceType === "asset" ? (body.assetId ?? null) : null,
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
  const serviceId = c.req.param("id");
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
  if (body.assetId !== undefined) updates.assetId = body.assetId;
  if (body.sourceType !== undefined) {
    updates.sourceType = body.sourceType;
    // Clear unrelated IDs when source type changes
    if (body.sourceType === "manual") {
      updates.inventoryItemId = null;
      updates.assetId = null;
      updates.flowerInventoryId = null;
    } else if (body.sourceType === "inventory") {
      updates.assetId = null;
      updates.flowerInventoryId = null;
    } else if (body.sourceType === "asset") {
      updates.inventoryItemId = null;
      updates.flowerInventoryId = null;
    } else if (body.sourceType === "flower") {
      updates.inventoryItemId = null;
      updates.assetId = null;
    }
  }

  const [updated] = await db.update(serviceComponents).set(updates)
    .where(and(eq(serviceComponents.id, compId), eq(serviceComponents.serviceId, serviceId), eq(serviceComponents.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "المكون غير موجود" }, 404);
  return c.json({ data: updated });
});

servicesRouter.delete("/:id/components/:compId", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");
  const compId = c.req.param("compId");

  const [deleted] = await db.update(serviceComponents)
    .set({ isActive: false })
    .where(and(eq(serviceComponents.id, compId), eq(serviceComponents.serviceId, serviceId), eq(serviceComponents.orgId, orgId)))
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

const costsSchema = z.object({
  materialCost:       z.number().min(0).default(0),
  laborMinutes:       z.number().int().min(0).default(0),
  laborCostPerMinute: z.number().min(0).default(0),
  overheadPercent:    z.number().min(0).max(100).default(0),
  commissionPercent:  z.number().min(0).max(100).default(0),
  notes:              z.string().max(1000).optional().nullable(),
});

servicesRouter.put("/:id/costs", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");

  const parsed = costsSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const body = parsed.data;

  // تحقق من ملكية الخدمة
  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  const [existing] = await db.select({ id: serviceCosts.id }).from(serviceCosts)
    .where(and(eq(serviceCosts.serviceId, serviceId), eq(serviceCosts.orgId, orgId)));

  const vals = {
    materialCost:       String(body.materialCost),
    laborMinutes:       body.laborMinutes,
    laborCostPerMinute: String(body.laborCostPerMinute),
    overheadPercent:    String(body.overheadPercent),
    commissionPercent:  String(body.commissionPercent),
    notes:              body.notes ?? null,
    updatedAt:          new Date(),
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

  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  const body = requirementSchema.parse(await c.req.json());

  // Fix 6a — تحقق من انتماء الموظف والأصل لنفس المنشأة
  if (body.userId) {
    const [member] = await db.select({ id: orgMembers.id }).from(orgMembers)
      .where(and(eq(orgMembers.userId, body.userId), eq(orgMembers.orgId, orgId), eq(orgMembers.status, "active")));
    if (!member) return c.json({ error: "الموظف غير موجود في هذه المنشأة" }, 404);
  }
  if (body.assetId) {
    const [asset] = await db.select({ id: assets.id }).from(assets)
      .where(and(eq(assets.id, body.assetId), eq(assets.orgId, orgId)));
    if (!asset) return c.json({ error: "الأصل غير موجود في هذه المنشأة" }, 404);
  }

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
  const serviceId = c.req.param("id");
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
    .where(and(eq(serviceRequirements.id, reqId), eq(serviceRequirements.serviceId, serviceId), eq(serviceRequirements.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "المتطلب غير موجود" }, 404);
  return c.json({ data: updated });
});

servicesRouter.delete("/:id/requirements/:reqId", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.param("id");
  const reqId = c.req.param("reqId");

  const [deleted] = await db.update(serviceRequirements)
    .set({ isActive: false })
    .where(and(eq(serviceRequirements.id, reqId), eq(serviceRequirements.serviceId, serviceId), eq(serviceRequirements.orgId, orgId)))
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

  // تحقق من ملكية الخدمة
  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  // تحقق من أن الموظف ينتمي إلى نفس المنشأة
  const [member] = await db.select({ id: orgMembers.id }).from(orgMembers)
    .where(and(eq(orgMembers.userId, body.userId), eq(orgMembers.orgId, orgId), eq(orgMembers.status, "active")));
  if (!member) return c.json({ error: "الموظف غير موجود في هذه المنشأة" }, 404);

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

  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.orgId, orgId)));
  if (!svc) return c.json({ error: "الخدمة غير موجودة" }, 404);

  const parsed = createQuestionSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { options, ...rest } = parsed.data;
  const [created] = await db
    .insert(serviceQuestions)
    .values({ orgId, serviceId, ...rest, options: options as any })
    .returning();
  return c.json({ data: created }, 201);
});

// PUT /services/questions/reorder  — يجب أن يكون قبل /questions/:qid حتى لا تلتقطه Hono كـ param
servicesRouter.put("/questions/reorder", async (c) => {
  const orgId = getOrgId(c);
  const { items } = await c.req.json() as { items: { id: string; sortOrder: number }[] };
  if (!Array.isArray(items)) return c.json({ error: "items مطلوب" }, 400);
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      db.update(serviceQuestions)
        .set({ sortOrder, updatedAt: new Date() })
        .where(and(eq(serviceQuestions.id, id), eq(serviceQuestions.orgId, orgId)))
    )
  );
  return c.json({ success: true });
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
  if (!updated) return c.json({ error: "السؤال غير موجود" }, 404);
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
  if (!deleted) return c.json({ error: "السؤال غير موجود" }, 404);
  return c.json({ data: { success: true } });
});

// ============================================================
// BARCODE ENDPOINTS
// ============================================================

// GET /services/lookup/barcode/:code — Lookup service or product by barcode
servicesRouter.get("/lookup/barcode/:code", async (c) => {
  const orgId   = getOrgId(c);
  const barcode = c.req.param("code");
  const match   = await lookupByBarcode(orgId, barcode);
  if (!match) return c.json({ error: "لا يوجد منتج أو خدمة بهذا الباركود" }, 404);
  return c.json({ data: match });
});

// POST /services/:id/generate-barcode — Regenerate barcode for a service
servicesRouter.post("/:id/generate-barcode", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  let barcode: string;
  let attempts = 0;
  do {
    barcode = generateBarcodeString();
    attempts++;
  } while (!(await isBarcodeUnique(orgId, barcode, id)) && attempts < 10);

  const [updated] = await db
    .update(services)
    .set({ barcode, updatedAt: new Date() })
    .where(and(eq(services.id, id), eq(services.orgId, orgId)))
    .returning({ id: services.id, barcode: services.barcode });

  if (!updated) return c.json({ error: "الخدمة غير موجودة" }, 404);
  return c.json({ data: updated });
});
