import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { accessLogs, customers, users, locations } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination, validateBody } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const accessControlRouter = new Hono();

// ── POST /access-control/scan — QR / manual scan (public or kiosk) ─────────

accessControlRouter.post("/scan", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const schema = z.object({
    orgId:       z.string().uuid(),
    accessToken: z.string().optional(),
    customerId:  z.string().uuid().optional(),
    customerName: z.string().optional(),
    locationId:  z.string().uuid().optional(),
    method:      z.enum(["qr", "manual", "card"]).default("qr"),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: "بيانات غير صحيحة" }, 400);
  const { orgId, accessToken, customerId, locationId, method } = parsed.data;

  // Resolve customerName if customerId provided
  let resolvedName: string | null = parsed.data.customerName ?? null;
  let granted = true;
  let denyReason: string | null = null;

  if (customerId) {
    const [cust] = await db
      .select({ name: customers.name, id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)));

    if (!cust) {
      granted = false;
      denyReason = "العميل غير موجود";
    } else {
      resolvedName = cust.name;
    }
  }

  const [log] = await db.insert(accessLogs).values({
    orgId,
    locationId:   locationId ?? null,
    customerId:   customerId ?? null,
    customerName: resolvedName,
    method,
    granted,
    denyReason,
    accessToken:  accessToken ?? null,
  }).returning();

  return c.json({ data: { granted, denyReason, log } }, granted ? 200 : 403);
});

// ── GET /access-control — List access logs ──────────────────────────────────

accessControlRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const locationId = c.req.query("locationId");
  const customerId = c.req.query("customerId");
  const granted    = c.req.query("granted");
  const date       = c.req.query("date"); // YYYY-MM-DD

  const conds = [eq(accessLogs.orgId, orgId)];
  if (locationId) conds.push(eq(accessLogs.locationId, locationId));
  if (customerId) conds.push(eq(accessLogs.customerId, customerId));
  if (granted !== undefined) conds.push(eq(accessLogs.granted, granted === "true"));
  if (date) {
    conds.push(sql`DATE(${accessLogs.accessedAt}) = ${date}`);
  }

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        log:      accessLogs,
        location: { id: locations.id, name: locations.name },
      })
      .from(accessLogs)
      .leftJoin(locations, eq(accessLogs.locationId, locations.id))
      .where(and(...conds))
      .orderBy(desc(accessLogs.accessedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(accessLogs).where(and(...conds)),
  ]);

  const data = rows.map(r => ({
    ...r.log,
    locationName: r.location?.name ?? null,
  }));

  return c.json({ data, pagination: { page, limit, total: Number(total) } });
});

// ── GET /access-control/stats — today's counts ─────────────────────────────

accessControlRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const today = new Date().toISOString().slice(0, 10);

  const [todayRows, totalRows] = await Promise.all([
    db
      .select({
        granted: accessLogs.granted,
        cnt: count(),
      })
      .from(accessLogs)
      .where(and(
        eq(accessLogs.orgId, orgId),
        sql`DATE(${accessLogs.accessedAt}) = ${today}`,
      ))
      .groupBy(accessLogs.granted),
    db
      .select({ cnt: count() })
      .from(accessLogs)
      .where(eq(accessLogs.orgId, orgId)),
  ]);

  let todayGranted = 0;
  let todayDenied = 0;
  for (const r of todayRows) {
    if (r.granted) todayGranted = Number(r.cnt);
    else todayDenied = Number(r.cnt);
  }

  return c.json({
    data: {
      todayGranted,
      todayDenied,
      totalLogs: Number(totalRows[0]?.cnt ?? 0),
    },
  });
});

// ── POST /access-control/manual — staff manually grants/denies entry ────────

accessControlRouter.post("/manual", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await validateBody(c, z.object({
    customerId:   z.string().uuid().optional(),
    customerName: z.string().optional(),
    locationId:   z.string().uuid().optional(),
    granted:      z.boolean().default(true),
    denyReason:   z.string().optional(),
  }));
  if (!body) return;

  const [log] = await db.insert(accessLogs).values({
    orgId,
    locationId:   body.locationId ?? null,
    customerId:   body.customerId ?? null,
    customerName: body.customerName ?? null,
    method:       "manual",
    granted:      body.granted,
    denyReason:   body.denyReason ?? null,
    createdById:  userId ?? undefined,
  }).returning();

  insertAuditLog({ orgId, userId, action: "create", resource: "access_log", resourceId: log.id, metadata: { granted: body.granted } });
  return c.json({ data: log }, 201);
});
