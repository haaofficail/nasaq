import { Hono } from "hono";
import { eq, and, desc, asc, sql, count, gte, lte, inArray } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import { assetTypes, assets, assetReservations, maintenanceLogs, assetTransfers, assetMovements, maintenanceTasks, users } from "@nasaq/db/schema";
import { getOrgId, getPagination, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { apiErr } from "../lib/errors";
import { z } from "zod";
import { postInventoryMovement, isAccountingEnabled } from "../lib/posting-engine";
import { ONE_DAY_MS } from "../lib/constants";

const createAssetTypeSchema = z.object({
  name: z.string(),
  nameEn: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  defaultPrice: z.string().optional().nullable(),
  defaultLifespanMonths: z.number().int().optional().nullable(),
  maintenanceIntervalUses: z.number().int().optional().nullable(),
  maintenanceIntervalDays: z.number().int().optional().nullable(),
  image: z.string().optional().nullable(),
  minStock: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const LOCATION_TYPES = ["warehouse", "branch", "rented", "assigned"] as const;

const createAssetSchema = z.object({
  assetTypeId: z.string().uuid(),
  serialNumber: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  status: z.enum(["available", "in_use", "maintenance", "damaged", "lost", "retired"]).optional(),
  condition: z.string().optional().nullable(),
  locationType: z.enum(LOCATION_TYPES).optional(),
  currentLocationId: z.string().uuid().optional().nullable(),
  isMovable: z.boolean().optional(),
  isRentable: z.boolean().optional(),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const moveAssetSchema = z.object({
  toLocationType: z.enum(LOCATION_TYPES),
  toLocationId: z.string().uuid().optional().nullable(),
  toAssignedUserId: z.string().uuid().optional().nullable(),
  toCustomerId: z.string().uuid().optional().nullable(),
  toBookingId: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateAssetSchema = createAssetSchema.partial();

const createTransferSchema = z.object({
  assetId: z.string().uuid(),
  fromLocationId: z.string().uuid().optional().nullable(),
  toLocationId: z.string().uuid(),
  quantity: z.number().int().optional(),
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createMaintenanceSchema = z.object({
  assetId: z.string().uuid(),
  type: z.enum(["preventive", "corrective", "cleaning", "inspection"]),
  description: z.string().optional().nullable(),
  cost: z.string().optional().nullable(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  performedBy: z.string().optional().nullable(),
  conditionBefore: z.string().optional().nullable(),
  conditionAfter: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const inventoryRouter = new Hono();

// ============================================================
// ASSET TYPES
// ============================================================

inventoryRouter.get("/types", async (c) => {
  const orgId = getOrgId(c);
  const types = await db.select().from(assetTypes).where(and(eq(assetTypes.orgId, orgId), eq(assetTypes.isActive, true))).orderBy(asc(assetTypes.name));
  if (types.length === 0) return c.json({ data: [] });

  // Single GROUP BY query instead of N per-type queries (QE2)
  const counts = await db.select({
    assetTypeId: assets.assetTypeId,
    total: count(),
    available: sql<number>`COUNT(*) FILTER (WHERE ${assets.status} = 'available')`,
  }).from(assets)
    .where(and(inArray(assets.assetTypeId, types.map((t) => t.id)), eq(assets.isActive, true)))
    .groupBy(assets.assetTypeId);

  const countMap = new Map(counts.map((c) => [c.assetTypeId, c]));
  const withCounts = types.map((t) => {
    const c = countMap.get(t.id);
    return { ...t, totalAssets: Number(c?.total ?? 0), availableAssets: Number(c?.available ?? 0) };
  });
  return c.json({ data: withCounts });
});

inventoryRouter.post("/types", async (c) => {
  const orgId = getOrgId(c);
  const body = createAssetTypeSchema.parse(await c.req.json());
  const [type] = await db.insert(assetTypes).values({ orgId, ...body }).returning();
  return c.json({ data: type }, 201);
});

inventoryRouter.put("/types/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createAssetTypeSchema.partial().parse(await c.req.json());
  const [updated] = await db.update(assetTypes).set(body)
    .where(and(eq(assetTypes.id, c.req.param("id")), eq(assetTypes.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "النوع غير موجود" }, 404);
  return c.json({ data: updated });
});

inventoryRouter.delete("/types/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const [{ cnt }] = await db.select({ cnt: count() }).from(assets)
    .where(and(eq(assets.assetTypeId, id), eq(assets.orgId, orgId), eq(assets.isActive, true)));
  if (Number(cnt) > 0) return c.json({ error: "لا يمكن حذف النوع لوجود أصول مرتبطة به" }, 400);
  const [updated] = await db.update(assetTypes)
    .set({ isActive: false })
    .where(and(eq(assetTypes.id, id), eq(assetTypes.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "النوع غير موجود" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "asset_type", resourceId: updated.id });
  return c.json({ data: { success: true } });
});

// ============================================================
// ASSETS
// ============================================================

inventoryRouter.get("/assets", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const typeId     = c.req.query("typeId");
  const status     = c.req.query("status");
  const locationId = c.req.query("locationId");
  const search     = c.req.query("search");

  const conditions = [eq(assets.orgId, orgId), eq(assets.isActive, true)];
  if (typeId)     conditions.push(eq(assets.assetTypeId, typeId));
  if (status)     conditions.push(eq(assets.status, status as any));
  if (locationId) conditions.push(eq(assets.currentLocationId, locationId));
  if (search)     conditions.push(sql`(${assets.name} ILIKE ${`%${search}%`} OR ${assets.serialNumber} ILIKE ${`%${search}%`} OR ${assets.barcode} ILIKE ${`%${search}%`})`);

  const [result, [{ total }]] = await Promise.all([
    db.select().from(assets).where(and(...conditions)).orderBy(desc(assets.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(assets).where(and(...conditions)),
  ]);

  return c.json({ data: result, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

inventoryRouter.get("/assets/:id", async (c) => {
  const orgId   = getOrgId(c);
  const assetId = c.req.param("id");

  // Single parallel round: asset+type (LEFT JOIN) + reservations + maintenance + movements
  const [[assetRow], reservations, maintenance, movements] = await Promise.all([
    db.select({ asset: assets, type: assetTypes })
      .from(assets)
      .leftJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .where(and(eq(assets.id, assetId), eq(assets.orgId, orgId))),
    db.select().from(assetReservations).where(eq(assetReservations.assetId, assetId)).orderBy(desc(assetReservations.startDate)).limit(10),
    db.select().from(maintenanceLogs).where(eq(maintenanceLogs.assetId, assetId)).orderBy(desc(maintenanceLogs.startDate)).limit(20),
    db.select().from(assetMovements).where(eq(assetMovements.assetId, assetId)).orderBy(desc(assetMovements.createdAt)).limit(20),
  ]);

  if (!assetRow) return apiErr(c, "INV_ASSET_NOT_FOUND", 404);
  const { asset, type: typeRow } = assetRow;
  // LEFT JOIN قد يُعيد object بكل حقوله null عند عدم التطابق
  const type = typeRow?.id ? typeRow : null;

  return c.json({ data: { ...asset, type, reservations, maintenanceHistory: maintenance, movementHistory: movements } });
});

inventoryRouter.post("/assets", async (c) => {
  const orgId = getOrgId(c);
  const body = createAssetSchema.parse(await c.req.json());

  // Auto-generate serial number if not provided
  if (!body.serialNumber) {
    const [{ cnt }] = await db.select({ cnt: count() }).from(assets).where(eq(assets.orgId, orgId));
    body.serialNumber = `AST-${new Date().getFullYear()}-${String(Number(cnt) + 1).padStart(4, "0")}`;
  }

  const { purchaseDate, ...rest } = body;
  const [asset] = await db.insert(assets).values({
    orgId,
    ...rest,
    ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
  }).returning();
  return c.json({ data: asset }, 201);
});

inventoryRouter.put("/assets/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateAssetSchema.parse(await c.req.json());
  const { purchaseDate, ...rest } = body;
  const [updated] = await db.update(assets).set({
    ...rest,
    ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
    updatedAt: new Date(),
  }).where(and(eq(assets.id, c.req.param("id")), eq(assets.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الأصل غير موجود" }, 404);
  return c.json({ data: updated });
});

inventoryRouter.patch("/assets/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status, notes } = await c.req.json();
  const updates: any = { status, updatedAt: new Date() };
  if (status === "maintenance") updates.lastMaintenanceAt = new Date();
  const [updated] = await db.update(assets).set(updates)
    .where(and(eq(assets.id, c.req.param("id")), eq(assets.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الأصل غير موجود" }, 404);
  return c.json({ data: updated });
});

inventoryRouter.delete("/assets/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.update(assets).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(assets.id, c.req.param("id")), eq(assets.orgId, orgId))).returning();
  if (!deleted) return c.json({ error: "الأصل غير موجود" }, 404);
  return c.json({ data: { success: true } });
});

// ============================================================
// ASSET MOVE — نقل الأصل مع تسجيل الحركة
// ============================================================

inventoryRouter.post("/assets/:id/move", async (c) => {
  const orgId   = getOrgId(c);
  const userId  = getUserId(c);
  const assetId = c.req.param("id");
  const body    = moveAssetSchema.parse(await c.req.json());

  const result = await db.transaction(async (tx) => {
    const [asset] = await tx.select().from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.orgId, orgId)));
    if (!asset) throw Object.assign(new Error("NOT_FOUND"), { status: 404 });

    // State machine validations
    if (!asset.isMovable) throw Object.assign(new Error("FIXED_ASSET"), { status: 400, msg: "الأصل ثابت ولا يمكن نقله" });
    if (asset.locationType === "rented") throw Object.assign(new Error("RENTED"), { status: 400, msg: "الأصل مؤجر حالياً، أعد الأصل أولاً" });
    if (asset.status === "maintenance") throw Object.assign(new Error("IN_MAINTENANCE"), { status: 400, msg: "الأصل في الصيانة، أنهِ الصيانة أولاً" });

    // If moving to "branch" or "warehouse", toLocationId is required
    if (["branch", "warehouse"].includes(body.toLocationType) && !body.toLocationId) {
      throw Object.assign(new Error("LOCATION_REQUIRED"), { status: 400, msg: "يجب تحديد الموقع/الفرع" });
    }
    // If moving to "assigned", toAssignedUserId is required
    if (body.toLocationType === "assigned" && !body.toAssignedUserId) {
      throw Object.assign(new Error("USER_REQUIRED"), { status: 400, msg: "يجب تحديد الموظف المُعيَّن له" });
    }
    // If moving to "rented", customer is required
    if (body.toLocationType === "rented" && !body.toCustomerId) {
      throw Object.assign(new Error("CUSTOMER_REQUIRED"), { status: 400, msg: "يجب تحديد العميل" });
    }

    // Log movement
    await tx.insert(assetMovements).values({
      orgId,
      assetId,
      fromLocationType: asset.locationType,
      fromLocationId: asset.currentLocationId,
      fromAssignedUserId: asset.assignedToUserId,
      fromCustomerId: asset.rentedToCustomerId,
      toLocationType: body.toLocationType,
      toLocationId: body.toLocationId ?? null,
      toAssignedUserId: body.toAssignedUserId ?? null,
      toCustomerId: body.toCustomerId ?? null,
      toBookingId: body.toBookingId ?? null,
      reason: body.reason,
      notes: body.notes,
      movedBy: userId ?? null,
    });

    // Derive new status
    let newStatus = asset.status;
    if (body.toLocationType === "rented") newStatus = "in_use";
    else if (body.toLocationType === "assigned") newStatus = "in_use";
    else if (asset.status === "in_use" && ["warehouse", "branch"].includes(body.toLocationType)) newStatus = "available";

    // Update asset
    const [updated] = await tx.update(assets).set({
      locationType: body.toLocationType,
      currentLocationId: body.toLocationId ?? null,
      assignedToUserId: body.toAssignedUserId ?? null,
      rentedToCustomerId: body.toCustomerId ?? null,
      rentalBookingId: body.toBookingId ?? null,
      status: newStatus,
      totalUses: body.toLocationType === "rented" ? (asset.totalUses ?? 0) + 1 : asset.totalUses,
      lastUsedAt: body.toLocationType === "rented" ? new Date() : asset.lastUsedAt,
      updatedAt: new Date(),
    }).where(eq(assets.id, assetId)).returning();

    return updated;
  }).catch(err => {
    if (err?.status) throw err;
    throw err;
  });

  insertAuditLog({ orgId, userId, action: "moved", resource: "asset", resourceId: assetId });
  return c.json({ data: result });
});

// POST /inventory/assets/:id/return — إرجاع الأصل (من أي حالة إلى warehouse/branch)
inventoryRouter.post("/assets/:id/return", async (c) => {
  const orgId   = getOrgId(c);
  const userId  = getUserId(c);
  const assetId = c.req.param("id");
  const body    = await c.req.json().catch(() => ({}));
  const toLocationId = body.toLocationId ?? null;
  const notes        = body.notes ?? null;
  const condition    = body.condition ?? null;

  const result = await db.transaction(async (tx) => {
    const [asset] = await tx.select().from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.orgId, orgId)));
    if (!asset) throw Object.assign(new Error("NOT_FOUND"), { status: 404 });

    const toLocationType = toLocationId ? "branch" : "warehouse";

    await tx.insert(assetMovements).values({
      orgId, assetId,
      fromLocationType: asset.locationType,
      fromLocationId: asset.currentLocationId,
      fromAssignedUserId: asset.assignedToUserId,
      fromCustomerId: asset.rentedToCustomerId,
      toLocationType,
      toLocationId: toLocationId ?? null,
      toAssignedUserId: null,
      toCustomerId: null,
      toBookingId: null,
      reason: "return",
      notes,
      movedBy: userId ?? null,
    });

    const [updated] = await tx.update(assets).set({
      locationType: toLocationType,
      currentLocationId: toLocationId ?? null,
      assignedToUserId: null,
      rentedToCustomerId: null,
      rentalBookingId: null,
      status: "available",
      condition: condition ?? asset.condition,
      updatedAt: new Date(),
    }).where(eq(assets.id, assetId)).returning();

    return updated;
  });

  insertAuditLog({ orgId, userId, action: "returned", resource: "asset", resourceId: assetId });
  return c.json({ data: result });
});

// GET /inventory/assets/:id/movements — سجل حركات الأصل
inventoryRouter.get("/assets/:id/movements", async (c) => {
  const orgId   = getOrgId(c);
  const assetId = c.req.param("id");
  const { limit, offset } = getPagination(c);

  const [movements, [{ total }]] = await Promise.all([
    db.select().from(assetMovements)
      .where(and(eq(assetMovements.assetId, assetId), eq(assetMovements.orgId, orgId)))
      .orderBy(desc(assetMovements.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(assetMovements)
      .where(and(eq(assetMovements.assetId, assetId), eq(assetMovements.orgId, orgId))),
  ]);

  return c.json({ data: movements, total: Number(total) });
});

// ============================================================
// ASSET JOURNEY — رحلة الأصل: أين هو الآن؟ ومن يملكه؟
// ============================================================

inventoryRouter.get("/assets/:id/journey", async (c) => {
  const orgId   = getOrgId(c);
  const assetId = c.req.param("id");

  // Round 1: parallel fetches
  const [[asset], maintenanceHistory, movementHistory, taskRows] = await Promise.all([
    db.select().from(assets).where(and(eq(assets.id, assetId), eq(assets.orgId, orgId))),
    db.select().from(maintenanceLogs)
      .where(eq(maintenanceLogs.assetId, assetId))
      .orderBy(desc(maintenanceLogs.startDate)).limit(20),
    db.select().from(assetMovements)
      .where(and(eq(assetMovements.assetId, assetId), eq(assetMovements.orgId, orgId)))
      .orderBy(desc(assetMovements.createdAt)).limit(30),
    db.select({ task: maintenanceTasks, assignee: { id: users.id, name: users.name } })
      .from(maintenanceTasks)
      .leftJoin(users, eq(maintenanceTasks.assignedToId, users.id))
      .where(and(eq(maintenanceTasks.assetId, assetId), eq(maintenanceTasks.orgId, orgId)))
      .orderBy(desc(maintenanceTasks.createdAt)).limit(20),
  ]);

  if (!asset) return apiErr(c, "INV_ASSET_NOT_FOUND", 404);

  // Round 2: parallel — type + name enrichment + rental contracts + inspections
  const [type, enrichRows, rcRows, inspRows] = await Promise.all([
    asset.assetTypeId
      ? db.select().from(assetTypes).where(eq(assetTypes.id, asset.assetTypeId)).then(r => r[0] ?? null)
      : Promise.resolve(null),

    // Customer, location, assignee names via raw SQL
    pool.query<{ customer_name: string | null; customer_phone: string | null; location_name: string | null; assignee_name: string | null }>(`
      SELECT
        c.name  AS customer_name,
        c.phone AS customer_phone,
        l.name  AS location_name,
        u.name  AS assignee_name
      FROM (SELECT 1) base
      LEFT JOIN customers c  ON ($1::uuid IS NOT NULL AND c.id = $1::uuid)
      LEFT JOIN locations  l ON ($2::uuid IS NOT NULL AND l.id = $2::uuid)
      LEFT JOIN users      u ON ($3::uuid IS NOT NULL AND u.id = $3::uuid)
      LIMIT 1
    `, [asset.rentedToCustomerId ?? null, asset.currentLocationId ?? null, asset.assignedToUserId ?? null]),

    // Active/recent rental contracts that include this asset
    pool.query(`
      SELECT
        rc.id, rc.contract_number, rc.title, rc.status,
        rc.start_date, rc.end_date, rc.actual_return_date,
        rc.value, rc.deposit, rc.customer_name, rc.customer_phone,
        rca.daily_rate, rca.quantity
      FROM rental_contract_assets rca
      JOIN rental_contracts rc ON rc.id = rca.contract_id
      WHERE rca.asset_id = $1
        AND rc.org_id    = $2
        AND rc.status NOT IN ('cancelled')
      ORDER BY rc.created_at DESC
      LIMIT 5
    `, [assetId, orgId]),

    // Rental inspections for this asset
    pool.query(`
      SELECT ri.id, ri.type, ri.condition, ri.damage_found, ri.damage_description,
             ri.damage_cost, ri.inspector_name, ri.notes, ri.created_at,
             rc.contract_number
      FROM rental_inspections ri
      LEFT JOIN rental_contracts rc ON rc.id = ri.contract_id
      WHERE ri.asset_id = $1
        AND ri.org_id   = $2
      ORDER BY ri.created_at DESC
      LIMIT 10
    `, [assetId, orgId]),
  ]);

  const names = enrichRows.rows[0] ?? {};

  // Active (non-completed) maintenance tasks
  const activeTasks = taskRows
    .filter(r => r.task.status !== "completed")
    .map(r => ({ ...r.task, assigneeName: r.assignee?.name ?? null }));

  // All tasks (for timeline)
  const allTasks = taskRows.map(r => ({ ...r.task, assigneeName: r.assignee?.name ?? null }));

  // Build unified timeline — sorted newest first
  type TimelineItem = { type: string; date: Date | string | null; [k: string]: any };
  const timeline: TimelineItem[] = [
    ...movementHistory.map(m => ({
      type: "movement",
      date: m.createdAt,
      fromType: m.fromLocationType,
      toType:   m.toLocationType,
      reason:   m.reason,
      notes:    m.notes,
    })),
    ...maintenanceHistory.map(m => ({
      type:            "maintenance_log",
      date:            m.startDate,
      maintenanceType: m.type,
      description:     m.description,
      cost:            m.cost,
      conditionBefore: m.conditionBefore,
      conditionAfter:  m.conditionAfter,
      performedBy:     m.performedBy,
      endDate:         m.endDate,
    })),
    ...inspRows.rows.map((i: any) => ({
      type:               "inspection",
      date:               i.created_at,
      inspType:           i.type,
      condition:          i.condition,
      damageFound:        i.damage_found,
      damageDescription:  i.damage_description,
      damageCost:         i.damage_cost,
      inspectorName:      i.inspector_name,
      contractNumber:     i.contract_number,
      notes:              i.notes,
    })),
    ...allTasks.map(t => ({
      type:         "task",
      date:         t.createdAt,
      taskType:     t.type,
      title:        t.title,
      status:       t.status,
      priority:     t.priority,
      assigneeName: t.assigneeName,
      scheduledAt:  t.scheduledAt,
    })),
  ]
    .filter(i => i.date)
    .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
    .slice(0, 50);

  const activeContract = rcRows.rows.find((r: any) => r.status === "active") ?? rcRows.rows[0] ?? null;

  return c.json({
    data: {
      asset: { ...asset, type },
      currentPosition: {
        status:         asset.status,
        locationType:   asset.locationType,
        locationName:   names.location_name   ?? null,
        assigneeName:   names.assignee_name   ?? null,
        customerName:   names.customer_name   ?? null,
        customerPhone:  names.customer_phone  ?? null,
        rentalBookingId: asset.rentalBookingId ?? null,
        condition:      asset.condition,
        lastMaintenanceAt: asset.lastMaintenanceAt,
        nextMaintenanceAt: asset.nextMaintenanceAt,
        totalUses: asset.totalUses,
      },
      activeTasks,
      activeContract,
      allContracts: rcRows.rows,
      timeline,
    },
  });
});

// ============================================================
// AVAILABILITY CHECK — فحص توفر الأصول لتاريخ معين
// ============================================================

inventoryRouter.post("/availability", async (c) => {
  const orgId = getOrgId(c);
  const { assetTypeId, date, endDate } = await c.req.json();
  const startD = new Date(date);
  const endD = endDate ? new Date(endDate) : new Date(startD.getTime() + ONE_DAY_MS);

  // Total assets of this type
  const [{ total }] = await db.select({ total: count() }).from(assets)
    .where(and(eq(assets.orgId, orgId), eq(assets.assetTypeId, assetTypeId), eq(assets.status, "available"), eq(assets.isActive, true)));

  // Reserved assets on this date
  const [{ reserved }] = await db.select({ reserved: count() }).from(assetReservations)
    .where(and(
      eq(assetReservations.orgId, orgId),
      sql`${assetReservations.assetId} IN (SELECT id FROM assets WHERE asset_type_id = ${assetTypeId})`,
      sql`${assetReservations.status} NOT IN ('cancelled', 'returned')`,
      lte(assetReservations.startDate, endD), gte(assetReservations.endDate, startD),
    ));

  return c.json({ data: { assetTypeId, date, totalAvailable: Number(total), reserved: Number(reserved), netAvailable: Number(total) - Number(reserved) } });
});

// ============================================================
// MAINTENANCE
// ============================================================

inventoryRouter.post("/maintenance", async (c) => {
  const orgId = getOrgId(c);
  const body = createMaintenanceSchema.parse(await c.req.json());

  const log = await db.transaction(async (tx) => {
    const [entry] = await tx.insert(maintenanceLogs).values({
      orgId, assetId: body.assetId, type: body.type, description: body.description,
      cost: body.cost || "0", startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null, performedBy: body.performedBy,
      conditionBefore: body.conditionBefore, conditionAfter: body.conditionAfter, notes: body.notes,
    }).returning();

    await tx.update(assets).set({
      status: body.endDate ? "available" : "maintenance",
      lastMaintenanceAt: new Date(),
      condition: body.conditionAfter || undefined,
      updatedAt: new Date(),
    }).where(eq(assets.id, body.assetId));

    return entry;
  });

  return c.json({ data: log }, 201);
});

// ============================================================
// TRANSFERS
// ============================================================

inventoryRouter.post("/transfers", async (c) => {
  const orgId = getOrgId(c);
  const body = createTransferSchema.parse(await c.req.json());
  const { scheduledDate, ...rest } = body;
  const [transfer] = await db.insert(assetTransfers).values({
    orgId,
    ...rest,
    ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
  }).returning();
  return c.json({ data: transfer }, 201);
});

inventoryRouter.patch("/transfers/:id/complete", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const transfer = await db.transaction(async (tx) => {
    const [t] = await tx.update(assetTransfers).set({ status: "completed", completedAt: new Date() })
      .where(and(eq(assetTransfers.id, id), eq(assetTransfers.orgId, orgId))).returning();
    if (!t) throw Object.assign(new Error("NOT_FOUND"), { status: 404 });

    await tx.update(assets).set({ currentLocationId: t.toLocationId, updatedAt: new Date() })
      .where(eq(assets.id, t.assetId));

    return t;
  }).catch(err => {
    if (err?.status === 404) return null;
    throw err;
  });

  if (!transfer) return c.json({ error: "النقل غير موجود" }, 404);
  return c.json({ data: transfer });
});

// ============================================================
// REPORTS
// ============================================================

inventoryRouter.get("/reports/summary", async (c) => {
  const orgId = getOrgId(c);

  const statusBreakdown = await db.select({
    status: assets.status, count: count(),
  }).from(assets).where(and(eq(assets.orgId, orgId), eq(assets.isActive, true))).groupBy(assets.status);

  const [maintenanceDue] = await db.select({ count: count() }).from(assets)
    .where(and(eq(assets.orgId, orgId), eq(assets.isActive, true), lte(assets.nextMaintenanceAt, new Date())));

  const [{ totalValue }] = await db.select({
    totalValue: sql<string>`COALESCE(SUM(CAST(${assets.currentValue} AS DECIMAL)), 0)`,
  }).from(assets).where(and(eq(assets.orgId, orgId), eq(assets.isActive, true)));

  return c.json({ data: { statusBreakdown, maintenanceDue: Number(maintenanceDue.count), totalAssetValue: parseFloat(totalValue) } });
});

// ============================================================
// INVENTORY PRODUCTS (consumables / materials)
// ============================================================

inventoryRouter.get("/products", async (c) => {
  const orgId    = getOrgId(c);
  const search   = c.req.query("search") || "";
  const category = c.req.query("category") || "";
  const lowStock = c.req.query("low_stock") === "1";

  // Build query safely — لا dynamic parameter numbering
  const clauses: string[] = ["p.org_id = $1", "p.is_active = true"];
  const params: unknown[] = [orgId];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    clauses.push(`p.category = $${params.length}`);
  }
  if (lowStock) {
    clauses.push("p.current_stock <= p.min_stock");
  }

  const { rows } = await pool.query(
    `SELECT p.*,
       CASE WHEN p.current_stock <= p.min_stock THEN true ELSE false END AS is_low_stock
     FROM inventory_products p
     WHERE ${clauses.join(" AND ")}
     ORDER BY p.category ASC, p.name ASC`,
    params,
  );
  return c.json({ data: rows });
});

inventoryRouter.post("/products", async (c) => {
  const orgId  = getOrgId(c);
  const body   = await c.req.json();
  const { name, nameEn, sku, category, unit, unitCost, sellingPrice, currentStock,
          minStock, maxStock, notes, imageUrl, description, images,
          isStoreVisible, storeSortOrder } = body;
  if (!name?.trim()) return c.json({ error: "الاسم مطلوب" }, 400);
  const { rows } = await pool.query(
    `INSERT INTO inventory_products
       (org_id, name, name_en, sku, category, unit, unit_cost, selling_price,
        current_stock, min_stock, max_stock, notes, image_url,
        description, images, is_store_visible, store_sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [orgId, name, nameEn||null, sku||null, category||null, unit||"قطعة",
     unitCost||0, sellingPrice||0, currentStock||0, minStock||0, maxStock||null,
     notes||null, imageUrl||null,
     description||null, JSON.stringify(images||[]),
     isStoreVisible||false, storeSortOrder||0],
  );
  return c.json({ data: rows[0] }, 201);
});

inventoryRouter.put("/products/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const body  = await c.req.json();
  const { name, nameEn, sku, category, unit, unitCost, sellingPrice, minStock, maxStock,
          notes, imageUrl, description, images, isStoreVisible, storeSortOrder } = body;
  const { rows } = await pool.query(
    `UPDATE inventory_products
     SET name=$1, name_en=$2, sku=$3, category=$4, unit=$5, unit_cost=$6, selling_price=$7,
         min_stock=$8, max_stock=$9, notes=$10, image_url=$11,
         description=$12, images=$13, is_store_visible=$14, store_sort_order=$15,
         updated_at=NOW()
     WHERE id=$16 AND org_id=$17 RETURNING *`,
    [name, nameEn||null, sku||null, category||null, unit||"قطعة",
     unitCost||0, sellingPrice||0, minStock||0, maxStock||null,
     notes||null, imageUrl||null,
     description||null, JSON.stringify(images||[]),
     isStoreVisible||false, storeSortOrder||0,
     id, orgId],
  );
  if (!rows.length) return c.json({ error: "المنتج غير موجود" }, 404);
  return c.json({ data: rows[0] });
});

inventoryRouter.delete("/products/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  await pool.query("UPDATE inventory_products SET is_active=false, updated_at=NOW() WHERE id=$1 AND org_id=$2", [id, orgId]);
  return c.json({ success: true });
});

// POST /inventory/products/:id/adjust — stock adjustment
inventoryRouter.post("/products/:id/adjust", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const { type, quantity, notes, referenceId, referenceType } = await c.req.json();
  // type: in | out | adjustment | waste | return
  if (!type || quantity == null) return c.json({ error: "type وquantity مطلوبان" }, 400);
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty === 0) return c.json({ error: "كمية غير صحيحة" }, 400);

  const delta = ["in", "return"].includes(type) ? qty : (["out", "waste"].includes(type) ? -qty : qty);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [product] } = await client.query(
      "SELECT id, current_stock FROM inventory_products WHERE id=$1 AND org_id=$2 FOR UPDATE",
      [id, orgId],
    );
    if (!product) { await client.query("ROLLBACK"); return c.json({ error: "المنتج غير موجود" }, 404); }
    const newStock = parseFloat(product.current_stock) + delta;
    if (newStock < 0) { await client.query("ROLLBACK"); return c.json({ error: "المخزون غير كافٍ" }, 400); }
    await client.query("UPDATE inventory_products SET current_stock=$1, updated_at=NOW() WHERE id=$2", [newStock, id]);
    const { rows: [movement] } = await client.query(
      `INSERT INTO stock_movements (org_id, product_id, type, quantity, reference_id, reference_type, notes, performed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [orgId, id, type, Math.abs(qty), referenceId||null, referenceType||null, notes||null, userId||null],
    );
    await client.query("COMMIT");

    // ── Auto-posting إن كانت المحاسبة مفعّلة ──
    try {
      const { rows: [settings] } = await pool.query(
        "SELECT settings FROM organizations WHERE id=$1", [orgId]
      );
      if (isAccountingEnabled(settings?.settings ?? {})) {
        const { rows: [prod] } = await pool.query(
          "SELECT name, cost_price FROM inventory_products WHERE id=$1", [id]
        );
        if (prod && prod.cost_price) {
          await postInventoryMovement({
            orgId, productId: id,
            productName: prod.name,
            movementType: type as any,
            quantity: Math.abs(qty),
            unitCost: parseFloat(prod.cost_price),
          });
        }
      }
    } catch { /* لا نفشل الحركة إذا فشل الترحيل */ }

    return c.json({ data: { movement, newStock } }, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// GET /inventory/products/movements — recent stock movements
inventoryRouter.get("/products/movements", async (c) => {
  const orgId     = getOrgId(c);
  const productId = c.req.query("productId") || "";
  const params: unknown[] = [orgId];
  let productFilter = "";
  if (productId) {
    params.push(productId);
    productFilter = `AND m.product_id = $${params.length}`;
  }
  const { rows }  = await pool.query(
    `SELECT m.*, p.name AS product_name, p.unit
     FROM stock_movements m
     JOIN inventory_products p ON p.id = m.product_id
     WHERE m.org_id = $1 ${productFilter}
     ORDER BY m.created_at DESC LIMIT 100`,
    params,
  );
  return c.json({ data: rows });
});
