import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, lte, sql, gte, lt, count } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import {
  salonSupplies, salonSupplyAdjustments,
  clientBeautyProfiles, visitNotes, serviceSupplyRecipes,
  bookings, bookingItems, salonMonitoringEvents,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const salonRouter = new Hono<{ Variables: { orgId: string; user: any; requestId: string; locationFilter: string[] | null } }>();

// ============================================================
// SCHEMAS
// ============================================================

const supplySchema = z.object({
  name:         z.string().min(1),
  category:     z.string().default("general"),
  unit:         z.string().default("piece"),
  quantity:     z.string().default("0"),
  minQuantity:  z.string().default("0"),
  costPerUnit:  z.string().optional().nullable(),
  supplierId:   z.string().uuid().optional().nullable(),
  notes:        z.string().optional().nullable(),
});

const adjustSchema = z.object({
  delta:  z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) !== 0, {
    message: "delta must be a non-zero number",
  }),
  reason: z.enum(["restock", "consumed", "manual", "waste", "return"]).default("manual"),
  notes:  z.string().optional(),
});

// ============================================================
// GET /salon/supplies — list all supplies
// ============================================================

salonRouter.get("/supplies", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const category = c.req.query("category");
  const lowStock = c.req.query("lowStock") === "true";

  const conditions = [eq(salonSupplies.orgId, orgId), eq(salonSupplies.isActive, true)];
  if (category) conditions.push(eq(salonSupplies.category, category));
  if (lowStock) conditions.push(lte(salonSupplies.quantity, salonSupplies.minQuantity));

  const rows = await db.select().from(salonSupplies)
    .where(and(...conditions))
    .orderBy(asc(salonSupplies.category), asc(salonSupplies.name))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// ============================================================
// GET /salon/supplies/low-stock — items at or below minimum
// ============================================================

salonRouter.get("/supplies/low-stock", async (c) => {
  const orgId = getOrgId(c);

  const rows = await db.select().from(salonSupplies)
    .where(and(
      eq(salonSupplies.orgId, orgId),
      eq(salonSupplies.isActive, true),
      lte(salonSupplies.quantity, salonSupplies.minQuantity),
    ))
    .orderBy(asc(salonSupplies.quantity))
    .limit(100);

  return c.json({ data: rows, count: rows.length });
});

// ============================================================
// GET /salon/supplies/:id
// ============================================================

salonRouter.get("/supplies/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [row] = await db.select().from(salonSupplies)
    .where(and(eq(salonSupplies.id, id), eq(salonSupplies.orgId, orgId)));
  if (!row) return c.json({ error: "المستلزم غير موجود" }, 404);

  // Last 20 adjustments
  const history = await db.select().from(salonSupplyAdjustments)
    .where(eq(salonSupplyAdjustments.supplyId, id))
    .orderBy(desc(salonSupplyAdjustments.createdAt))
    .limit(20);

  return c.json({ data: { ...row, history } });
});

// ============================================================
// POST /salon/supplies — create supply item
// ============================================================

salonRouter.post("/supplies", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = supplySchema.parse(await c.req.json());

  const [row] = await db.insert(salonSupplies).values({
    orgId,
    name:        body.name,
    category:    body.category,
    unit:        body.unit,
    quantity:    body.quantity,
    minQuantity: body.minQuantity,
    costPerUnit: body.costPerUnit ?? null,
    supplierId:  body.supplierId ?? null,
    notes:       body.notes ?? null,
  }).returning();

  insertAuditLog({ orgId, userId, action: "created", resource: "salon_supply", resourceId: row.id });
  return c.json({ data: row }, 201);
});

// ============================================================
// PATCH /salon/supplies/:id — update metadata
// ============================================================

salonRouter.patch("/supplies/:id", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const id = c.req.param("id");
  const body = supplySchema.partial().parse(await c.req.json());

  const [updated] = await db.update(salonSupplies)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(salonSupplies.id, id), eq(salonSupplies.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "المستلزم غير موجود" }, 404);
  insertAuditLog({ orgId, userId, action: "updated", resource: "salon_supply", resourceId: updated.id });
  return c.json({ data: updated });
});

// ============================================================
// DELETE /salon/supplies/:id — soft delete
// ============================================================

salonRouter.delete("/supplies/:id", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const id = c.req.param("id");

  const [updated] = await db.update(salonSupplies)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(salonSupplies.id, id), eq(salonSupplies.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "المستلزم غير موجود" }, 404);
  insertAuditLog({ orgId, userId, action: "deleted", resource: "salon_supply", resourceId: updated.id });
  return c.json({ success: true });
});

// ============================================================
// POST /salon/supplies/:id/adjust — adjust quantity
// إضافة مخزون (restock) أو تسجيل استهلاك (consumed)
// ============================================================

salonRouter.post("/supplies/:id/adjust", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const supplyId = c.req.param("id");
  const body = adjustSchema.parse(await c.req.json());

  // First verify the supply exists and belongs to this org
  const [exists] = await db.select({ id: salonSupplies.id })
    .from(salonSupplies)
    .where(and(eq(salonSupplies.id, supplyId), eq(salonSupplies.orgId, orgId)));
  if (!exists) return c.json({ error: "المستلزم غير موجود" }, 404);

  const updated = await db.transaction(async (tx) => {
    // Atomic UPDATE: compute new quantity in SQL to eliminate race condition.
    // The WHERE clause (quantity + delta >= 0) acts as the negative-stock guard.
    // If two concurrent requests arrive simultaneously, the second UPDATE will
    // operate on the row already modified by the first — no double-spend.
    const { rows } = await tx.execute(sql`
      UPDATE salon_supplies
      SET quantity   = (quantity::numeric + ${parseFloat(body.delta)})::text,
          updated_at = NOW()
      WHERE id = ${supplyId}
        AND org_id = ${orgId}
        AND (quantity::numeric + ${parseFloat(body.delta)}) >= 0
      RETURNING *
    `);

    if ((rows as any[]).length === 0)
      throw Object.assign(new Error("NEGATIVE_STOCK"), { status: 422 });

    await tx.insert(salonSupplyAdjustments).values({
      orgId,
      supplyId,
      delta:     body.delta,
      reason:    body.reason,
      notes:     body.notes ?? null,
      createdBy: userId,
    });

    return (rows as any[])[0];
  });

  insertAuditLog({ orgId, userId, action: "adjusted", resource: "salon_supply", resourceId: supplyId, metadata: { delta: body.delta, reason: body.reason } });
  return c.json({ data: updated });
});

// ============================================================
// CLIENT BEAUTY PROFILE
// GET  /salon/beauty-profile/:customerId
// PUT  /salon/beauty-profile/:customerId  (upsert)
// ============================================================

const beautyProfileSchema = z.object({
  hairType:       z.string().optional().nullable(),
  hairTexture:    z.string().optional().nullable(),
  hairCondition:  z.string().optional().nullable(),
  naturalColor:   z.string().optional().nullable(),
  currentColor:   z.string().optional().nullable(),
  skinType:       z.string().optional().nullable(),
  skinConcerns:   z.string().optional().nullable(),
  allergies:      z.string().optional().nullable(),
  sensitivities:  z.string().optional().nullable(),
  medicalNotes:   z.string().optional().nullable(),
  preferredStaffId: z.string().uuid().optional().nullable(),
  preferences:    z.string().optional().nullable(),
  avoidNotes:     z.string().optional().nullable(),
  lastFormula:    z.string().optional().nullable(),
});

salonRouter.get("/beauty-profile/:customerId", async (c) => {
  const orgId = getOrgId(c);
  const customerId = c.req.param("customerId");

  const [profile] = await db.select().from(clientBeautyProfiles)
    .where(and(eq(clientBeautyProfiles.orgId, orgId), eq(clientBeautyProfiles.customerId, customerId)));

  // Also fetch last 5 visit notes for this client
  const history = await db.select().from(visitNotes)
    .where(and(eq(visitNotes.orgId, orgId), eq(visitNotes.customerId, customerId)))
    .orderBy(desc(visitNotes.createdAt))
    .limit(5);

  return c.json({ data: { profile: profile || null, recentVisits: history } });
});

salonRouter.put("/beauty-profile/:customerId", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const customerId = c.req.param("customerId");
  const body = beautyProfileSchema.parse(await c.req.json());

  // Role check: staff can only edit profiles of clients they've served
  const user = c.get("user") as { id: string; type?: string; systemRole?: string } | null;
  const isPrivileged = user?.type === "owner" || user?.systemRole === "owner" || user?.type === "manager";
  if (!isPrivileged && userId) {
    const { rows: served } = await db.execute(sql`
      SELECT 1 FROM bookings
      WHERE org_id = ${orgId}
        AND customer_id = ${customerId}
        AND assigned_user_id = ${userId}
        AND status NOT IN ('cancelled', 'no_show')
      LIMIT 1
    `);
    if ((served as any[]).length === 0) {
      return c.json({ error: "غير مصرح — يمكنك تعديل ملف العملاء الذين قدّمت لهم خدمة فقط" }, 403);
    }
  }

  const [existing] = await db.select({ id: clientBeautyProfiles.id }).from(clientBeautyProfiles)
    .where(and(eq(clientBeautyProfiles.orgId, orgId), eq(clientBeautyProfiles.customerId, customerId)));

  let result;
  if (existing) {
    [result] = await db.update(clientBeautyProfiles)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(clientBeautyProfiles.id, existing.id))
      .returning();
  } else {
    [result] = await db.insert(clientBeautyProfiles)
      .values({ orgId, customerId, ...body })
      .returning();
  }

  // Audit log — flag when sensitive medical fields are modified
  const hasMedicalChange = body.allergies !== undefined || body.sensitivities !== undefined || body.medicalNotes !== undefined;
  insertAuditLog({
    orgId, userId, action: "updated", resource: "beauty_profile", resourceId: customerId,
    metadata: hasMedicalChange ? { medicalFieldsModified: true } : {},
  });
  return c.json({ data: result });
});

// ============================================================
// VISIT NOTES
// GET  /salon/visit-notes/:bookingId
// POST /salon/visit-notes/:bookingId     (create / upsert)
// ============================================================

const visitNoteSchema = z.object({
  customerId:     z.string().uuid(),
  staffId:        z.string().uuid().optional().nullable(),
  serviceId:      z.string().uuid().optional().nullable(),
  formula:        z.string().optional().nullable(),
  productsUsed:   z.string().optional().nullable(),
  processingTime: z.number().int().optional().nullable(),
  technique:      z.string().optional().nullable(),
  resultNotes:    z.string().optional().nullable(),
  privateNotes:   z.string().optional().nullable(),
  recommendedProducts: z.string().optional().nullable(),
  nextVisitIn:    z.number().int().optional().nullable(),
  nextVisitDate:  z.string().optional().nullable(),
  beforePhotoUrl: z.string().optional().nullable(),
  afterPhotoUrl:  z.string().optional().nullable(),
});

salonRouter.get("/visit-notes/:bookingId", async (c) => {
  const orgId = getOrgId(c);
  const bookingId = c.req.param("bookingId");

  const notes = await db.select().from(visitNotes)
    .where(and(eq(visitNotes.orgId, orgId), eq(visitNotes.bookingId, bookingId)));

  return c.json({ data: notes });
});

salonRouter.post("/visit-notes/:bookingId", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const bookingId = c.req.param("bookingId");
  const body = visitNoteSchema.parse(await c.req.json());

  // IDOR guard: confirm the booking belongs to this org before writing any note.
  // Without this check a staff member could supply a bookingId from another tenant.
  const [ownerCheck] = await db.select({ id: bookings.id, customerId: bookings.customerId })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.orgId, orgId)));
  if (!ownerCheck) return c.json({ error: "الحجز غير موجود" }, 404);

  // Upsert: one note per booking (overwrite if exists)
  const [existing] = await db.select({ id: visitNotes.id }).from(visitNotes)
    .where(and(eq(visitNotes.orgId, orgId), eq(visitNotes.bookingId, bookingId)));

  let note;
  if (existing) {
    [note] = await db.update(visitNotes)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(visitNotes.id, existing.id))
      .returning();
  } else {
    [note] = await db.insert(visitNotes)
      .values({ orgId, bookingId, ...body })
      .returning();
  }

  // Auto-update lastFormula on beauty profile if formula provided.
  // Apply the same privilege gate as PUT /beauty-profile: staff may only write
  // formula data for customers they have personally served, so they cannot bypass
  // the protected PUT route by submitting a visit-note with a fabricated formula.
  if (body.formula) {
    const user = c.get("user") as { id: string; type?: string; systemRole?: string } | null;
    const isPrivileged =
      user?.type === "owner" || user?.systemRole === "owner" || user?.type === "manager";

    let allowFormulaUpdate = isPrivileged;
    if (!allowFormulaUpdate && userId) {
      const { rows: served } = await db.execute(sql`
        SELECT 1 FROM bookings
        WHERE org_id = ${orgId}
          AND customer_id = ${body.customerId}
          AND assigned_user_id = ${userId}
          AND status NOT IN ('cancelled', 'no_show')
        LIMIT 1
      `);
      allowFormulaUpdate = (served as any[]).length > 0;
    }

    if (allowFormulaUpdate) {
      await db.update(clientBeautyProfiles)
        .set({ lastFormula: body.formula, updatedAt: new Date() })
        .where(and(
          eq(clientBeautyProfiles.orgId, orgId),
          eq(clientBeautyProfiles.customerId, body.customerId),
        ));
    }
  }

  insertAuditLog({ orgId, userId, action: "created", resource: "visit_note", resourceId: bookingId });
  return c.json({ data: note }, 201);
});

// ============================================================
// SERVICE SUPPLY RECIPES — وصفة استهلاك المستلزمات
// GET    /salon/recipes?serviceId=...
// POST   /salon/recipes
// DELETE /salon/recipes/:id
// ============================================================

salonRouter.get("/recipes", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.query("serviceId");

  const conditions = [eq(serviceSupplyRecipes.orgId, orgId)];
  if (serviceId) conditions.push(eq(serviceSupplyRecipes.serviceId, serviceId));

  const rows = await db.select().from(serviceSupplyRecipes)
    .where(and(...conditions))
    .orderBy(asc(serviceSupplyRecipes.serviceId));

  return c.json({ data: rows });
});

salonRouter.post("/recipes", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = z.object({
    serviceId: z.string().uuid(),
    supplyId:  z.string().uuid(),
    quantity:  z.string().default("1"),
    notes:     z.string().optional().nullable(),
  }).parse(await c.req.json());

  const [row] = await db.insert(serviceSupplyRecipes)
    .values({ orgId, ...body })
    .onConflictDoUpdate({
      target: [serviceSupplyRecipes.serviceId, serviceSupplyRecipes.supplyId],
      set: { quantity: body.quantity, notes: body.notes ?? null },
    })
    .returning();

  insertAuditLog({ orgId, userId, action: "created", resource: "service_recipe", resourceId: row.id });
  return c.json({ data: row }, 201);
});

salonRouter.delete("/recipes/:id", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const id = c.req.param("id");

  await db.delete(serviceSupplyRecipes)
    .where(and(eq(serviceSupplyRecipes.id, id), eq(serviceSupplyRecipes.orgId, orgId)));

  insertAuditLog({ orgId, userId, action: "deleted", resource: "service_recipe", resourceId: id });
  return c.json({ success: true });
});

// ============================================================
// STAFF PERFORMANCE ANALYTICS
// GET /salon/staff-performance?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Returns per-staff: revenue, bookings, rebooking_rate, avg_ticket,
// completed_count, cancelled_count, no_show_count, revenue_per_booking
// ============================================================

salonRouter.get("/staff-performance", async (c) => {
  const orgId = getOrgId(c);
  const from  = c.req.query("from");
  const to    = c.req.query("to");

  // Validate date strings to prevent Invalid Date in SQL
  const fromDate = from ? new Date(from) : null;
  const toDate   = to   ? new Date(to)   : null;
  if (fromDate && isNaN(fromDate.getTime())) return c.json({ error: "تاريخ البداية غير صحيح" }, 400);
  if (toDate   && isNaN(toDate.getTime()))   return c.json({ error: "تاريخ النهاية غير صحيح" }, 400);

  // P1-1 fix: non-owner staff see only their own performance
  const user = c.get("user") as { id: string; type?: string; systemRole?: string } | null;
  const isPrivileged = user?.type === "owner" || user?.systemRole === "owner" || user?.type === "manager";
  const staffIdFilter = (!isPrivileged && user?.id)
    ? sql`AND b.assigned_user_id = ${user.id}`
    : sql``;

  // Aggregate bookings per assigned staff
  const rows = await db.execute(sql`
    SELECT
      b.assigned_user_id                                                    AS staff_id,
      COUNT(*)                                                              AS total_bookings,
      COUNT(*) FILTER (WHERE b.status = 'completed')                       AS completed,
      COUNT(*) FILTER (WHERE b.status = 'cancelled')                       AS cancelled,
      COUNT(*) FILTER (WHERE b.status = 'no_show')                         AS no_show,
      COALESCE(SUM(CASE WHEN b.status = 'completed' THEN CAST(b.total_amount AS DECIMAL) ELSE 0 END), 0) AS revenue,
      CASE WHEN COUNT(*) FILTER (WHERE b.status = 'completed') > 0
        THEN COALESCE(SUM(CASE WHEN b.status = 'completed' THEN CAST(b.total_amount AS DECIMAL) ELSE 0 END), 0)
             / COUNT(*) FILTER (WHERE b.status = 'completed')
        ELSE 0
      END                                                                   AS avg_ticket
    FROM bookings b
    WHERE b.org_id = ${orgId}
      AND b.assigned_user_id IS NOT NULL
      ${staffIdFilter}
      ${fromDate ? sql`AND b.event_date >= ${fromDate}` : sql``}
      ${toDate   ? sql`AND b.event_date <= ${toDate}`   : sql``}
    GROUP BY b.assigned_user_id
    ORDER BY revenue DESC
  `);

  // Rebooking rate: % of completed clients who booked again within 90 days
  const rebookStaffFilter = (!isPrivileged && user?.id)
    ? sql`AND b1.assigned_user_id = ${user.id}`
    : sql``;

  const rebookRows = await db.execute(sql`
    SELECT
      b1.assigned_user_id AS staff_id,
      COUNT(DISTINCT b1.customer_id)   AS served_clients,
      COUNT(DISTINCT b2.customer_id)   AS rebooked_clients
    FROM bookings b1
    LEFT JOIN bookings b2
      ON b2.customer_id = b1.customer_id
      AND b2.org_id = b1.org_id
      AND b2.id != b1.id
      AND b2.event_date > b1.event_date
      AND b2.event_date <= b1.event_date + INTERVAL '90 days'
      AND b2.status NOT IN ('cancelled', 'no_show')
    WHERE b1.org_id = ${orgId}
      AND b1.status = 'completed'
      AND b1.assigned_user_id IS NOT NULL
      ${rebookStaffFilter}
      ${fromDate ? sql`AND b1.event_date >= ${fromDate}` : sql``}
      ${toDate   ? sql`AND b1.event_date <= ${toDate}`   : sql``}
    GROUP BY b1.assigned_user_id
  `);

  // P2-1 fix: access .rows safely — db.execute returns QueryResult with .rows array
  const rebookMap: Record<string, any> = {};
  for (const r of (rebookRows as any).rows as any[]) {
    rebookMap[(r as any).staff_id] = r;
  }

  const result = ((rows as any).rows as any[]).map((r: any) => {
    const rb = rebookMap[r.staff_id];
    const rebookingRate = rb && Number(rb.served_clients) > 0
      ? Math.round((Number(rb.rebooked_clients) / Number(rb.served_clients)) * 100)
      : 0;
    return {
      staffId:      r.staff_id,
      totalBookings: Number(r.total_bookings),
      completed:    Number(r.completed),
      cancelled:    Number(r.cancelled),
      noShow:       Number(r.no_show),
      revenue:      parseFloat(r.revenue),
      avgTicket:    parseFloat(r.avg_ticket),
      rebookingRate,
      servedClients: rb ? Number(rb.served_clients) : 0,
    };
  });

  return c.json({ data: result });
});

// ============================================================
// RECALL ENGINE — عملاء حان موعدهم للزيارة
// GET /salon/recall?serviceInterval=4  (بالأسابيع)
// Returns customers who haven't visited in serviceInterval+ weeks
// ============================================================

salonRouter.get("/recall", async (c) => {
  const orgId   = c.get("orgId") as string;
  const weeks   = parseInt(c.req.query("serviceInterval") || "6");
  const limit   = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50")), 200);
  const cutoff  = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (c.id)
      c.id,
      c.name,
      c.phone,
      c.last_booking_at,
      EXTRACT(DAY FROM NOW() - c.last_booking_at)::int AS days_since_last_visit,
      vn.next_visit_date,
      vn.next_visit_in
    FROM customers c
    LEFT JOIN visit_notes vn ON vn.customer_id = c.id
      AND vn.org_id = ${orgId}
    WHERE c.org_id = ${orgId}
      AND c.is_active = true
      AND c.last_booking_at IS NOT NULL
      AND c.last_booking_at <= ${cutoff}
    ORDER BY c.id, c.last_booking_at DESC
    LIMIT ${limit}
  `);

  return c.json({ data: rows.rows ?? rows, weeks });
});

// ============================================================
// GET /salon/health — salon-specific readiness probe
// يفحص: API + DB + booking flow + inventory flow
// ============================================================

salonRouter.get("/health", async (c) => {
  const orgId = getOrgId(c);

  // DB probe
  let dbOk = false;
  try { await pool.query("SELECT 1"); dbOk = true; } catch {}

  // Booking flow probe: can we query the bookings table for this org?
  let bookingFlowOk = false;
  try {
    await db.select({ id: bookings.id }).from(bookings)
      .where(eq(bookings.orgId, orgId)).limit(1);
    bookingFlowOk = true;
  } catch {}

  // Inventory flow probe: can we query salon_supplies for this org?
  let inventoryFlowOk = false;
  try {
    await db.select({ id: salonSupplies.id }).from(salonSupplies)
      .where(eq(salonSupplies.orgId, orgId)).limit(1);
    inventoryFlowOk = true;
  } catch {}

  const allOk = dbOk && bookingFlowOk && inventoryFlowOk;

  return c.json({
    status:        allOk ? "healthy" : "degraded",
    timestamp:     new Date().toISOString(),
    checks: {
      api:           "healthy",
      db:            dbOk ? "healthy" : "unhealthy",
      bookingFlow:   bookingFlowOk ? "healthy" : "unhealthy",
      inventoryFlow: inventoryFlowOk ? "healthy" : "unhealthy",
    },
  }, allOk ? 200 : 503);
});

// ============================================================
// GET /salon/monitoring/summary — operational summary for org owner
// مؤشرات تشغيلية سريعة لليوم: حجوزات، تعارضات، مخزون، أخطاء
// ============================================================

salonRouter.get("/monitoring/summary", async (c) => {
  const orgId = getOrgId(c);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Safe query helper — returns null on failure (table might not exist)
  async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
    try { return await fn(); } catch { return null; }
  }

  const [bookingStatsRes, pendingRes, conflictRes, lowStockRes, invFailRes, lastErrors] = await Promise.all([
    safeQuery(() => db.execute(sql`
      SELECT
        COUNT(*)                                                            AS bookings_today,
        COUNT(*) FILTER (WHERE status = 'pending')                         AS pending_bookings,
        COUNT(*) FILTER (WHERE status = 'completed' AND created_at >= ${todayStart}) AS completed_today,
        COUNT(*) FILTER (WHERE status IN ('cancelled', 'no_show') AND created_at >= ${todayStart}) AS cancelled_today
      FROM bookings
      WHERE org_id = ${orgId} AND created_at >= ${todayStart} AND created_at <= ${todayEnd}
    `)),
    safeQuery(() => db.execute(sql`
      SELECT COUNT(*) AS pending_total FROM bookings WHERE org_id = ${orgId} AND status = 'pending'
    `)),
    safeQuery(() => db.execute(sql`
      SELECT COUNT(*) AS conflict_count FROM salon_monitoring_events
      WHERE org_id = ${orgId} AND event_type = 'booking_conflict_rejected' AND created_at >= ${todayStart}
    `)),
    safeQuery(() => db.execute(sql`
      SELECT COUNT(*) AS low_stock_count FROM salon_supply_adjustments
      WHERE org_id = ${orgId} AND reason = 'manual' AND delta = '0'
        AND notes LIKE 'تحذير مخزون%' AND created_at >= ${todayStart}
    `)),
    safeQuery(() => db.execute(sql`
      SELECT COUNT(*) AS failure_count FROM salon_monitoring_events
      WHERE org_id = ${orgId} AND event_type = 'db_error' AND created_at >= ${todayStart}
    `)),
    safeQuery(() => db.select({
      id: salonMonitoringEvents.id, eventType: salonMonitoringEvents.eventType,
      bookingId: salonMonitoringEvents.bookingId, metadata: salonMonitoringEvents.metadata,
      createdAt: salonMonitoringEvents.createdAt,
    }).from(salonMonitoringEvents)
      .where(and(eq(salonMonitoringEvents.orgId, orgId), sql`${salonMonitoringEvents.eventType} IN ('booking_failed', 'db_error', 'inventory_recipe_missing')`))
      .orderBy(desc(salonMonitoringEvents.createdAt)).limit(5)),
  ]);

  const s = (bookingStatsRes?.rows?.[0] ?? {}) as any;

  return c.json({
    data: {
      bookingsToday:           Number(s?.bookings_today ?? 0),
      completedToday:          Number(s?.completed_today ?? 0),
      cancelledToday:          Number(s?.cancelled_today ?? 0),
      pendingBookings:         Number((pendingRes?.rows?.[0] as any)?.pending_total ?? 0),
      conflictRejectionsToday: Number((conflictRes?.rows?.[0] as any)?.conflict_count ?? 0),
      lowStockWarningsToday:   Number((lowStockRes?.rows?.[0] as any)?.low_stock_count ?? 0),
      inventoryFailuresToday:  Number((invFailRes?.rows?.[0] as any)?.failure_count ?? 0),
      lastCriticalErrors:      lastErrors ?? [],
      generatedAt:             new Date().toISOString(),
    },
  });
});
