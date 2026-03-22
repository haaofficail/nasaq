import { Hono } from "hono";
import { eq, and, desc, asc, sql, count, gte, lte, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { assetTypes, assets, assetReservations, maintenanceLogs, assetTransfers } from "@nasaq/db/schema";
import { getOrgId, getPagination } from "../lib/helpers";
import { z } from "zod";
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

const createAssetSchema = z.object({
  assetTypeId: z.string().uuid(),
  serialNumber: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  status: z.string().optional(),
  condition: z.string().optional().nullable(),
  currentLocationId: z.string().uuid().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.string().optional().nullable(),
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
  type: z.string().min(1),
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
  const types = await db.select().from(assetTypes).where(eq(assetTypes.orgId, orgId)).orderBy(asc(assetTypes.name));
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
  const [deleted] = await db.delete(assetTypes)
    .where(and(eq(assetTypes.id, id), eq(assetTypes.orgId, orgId))).returning();
  if (!deleted) return c.json({ error: "النوع غير موجود" }, 404);
  return c.json({ data: { success: true } });
});

// ============================================================
// ASSETS
// ============================================================

inventoryRouter.get("/assets", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const typeId = c.req.query("typeId");
  const status = c.req.query("status");
  const locationId = c.req.query("locationId");

  const conditions = [eq(assets.orgId, orgId), eq(assets.isActive, true)];
  if (typeId) conditions.push(eq(assets.assetTypeId, typeId));
  if (status) conditions.push(eq(assets.status, status as any));
  if (locationId) conditions.push(eq(assets.currentLocationId, locationId));

  const [result, [{ total }]] = await Promise.all([
    db.select().from(assets).where(and(...conditions)).orderBy(desc(assets.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(assets).where(and(...conditions)),
  ]);

  return c.json({ data: result, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

inventoryRouter.get("/assets/:id", async (c) => {
  const orgId = getOrgId(c);
  const [asset] = await db.select().from(assets).where(and(eq(assets.id, c.req.param("id")), eq(assets.orgId, orgId)));
  if (!asset) return c.json({ error: "الأصل غير موجود" }, 404);
  const [type] = await db.select().from(assetTypes).where(eq(assetTypes.id, asset.assetTypeId));
  const reservations = await db.select().from(assetReservations).where(eq(assetReservations.assetId, asset.id)).orderBy(desc(assetReservations.startDate)).limit(10);
  const maintenance = await db.select().from(maintenanceLogs).where(eq(maintenanceLogs.assetId, asset.id)).orderBy(desc(maintenanceLogs.startDate)).limit(10);
  return c.json({ data: { ...asset, type, reservations, maintenanceHistory: maintenance } });
});

inventoryRouter.post("/assets", async (c) => {
  const orgId = getOrgId(c);
  const body = createAssetSchema.parse(await c.req.json());
  const [asset] = await db.insert(assets).values({ orgId, ...body }).returning();
  return c.json({ data: asset }, 201);
});

inventoryRouter.put("/assets/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateAssetSchema.parse(await c.req.json());
  const [updated] = await db.update(assets).set({ ...body, updatedAt: new Date() })
    .where(and(eq(assets.id, c.req.param("id")), eq(assets.orgId, orgId))).returning();
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
  const [transfer] = await db.insert(assetTransfers).values({ orgId, ...body }).returning();
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
