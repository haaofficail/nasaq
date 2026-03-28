import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { maintenanceTasks, services, bookings, locations, users, assets } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination, validateBody } from "../lib/helpers";

export const maintenanceRouter = new Hono();

// ── Schemas ────────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  title:        z.string().min(1),
  description:  z.string().optional(),
  type:         z.enum(["cleaning", "maintenance", "inspection", "damage_repair"]).default("cleaning"),
  priority:     z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  status:       z.enum(["pending", "in_progress", "completed", "issue_reported"]).default("pending"),
  serviceId:    z.string().uuid().optional(),
  bookingId:    z.string().uuid().optional(),
  locationId:   z.string().uuid().optional(),
  assetId:      z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  scheduledAt:  z.string().datetime().optional(),
  notes:        z.string().optional(),
  costAmount:   z.coerce.string().optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  startedAt:   z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

// ── GET /maintenance — List tasks ──────────────────────────────────────────
maintenanceRouter.get("/", async (c) => {
  const orgId  = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status     = c.req.query("status");
  const type       = c.req.query("type");
  const serviceId  = c.req.query("serviceId");
  const bookingId  = c.req.query("bookingId");
  const assetId    = c.req.query("assetId");
  const assignedTo = c.req.query("assignedTo");

  const conds = [eq(maintenanceTasks.orgId, orgId)];
  if (status)     conds.push(eq(maintenanceTasks.status,       status));
  if (type)       conds.push(eq(maintenanceTasks.type,         type));
  if (serviceId)  conds.push(eq(maintenanceTasks.serviceId,    serviceId));
  if (bookingId)  conds.push(eq(maintenanceTasks.bookingId,    bookingId));
  if (assetId)    conds.push(eq(maintenanceTasks.assetId,      assetId));
  if (assignedTo) conds.push(eq(maintenanceTasks.assignedToId, assignedTo));

  const rows = await db
    .select({
      task:     maintenanceTasks,
      service:  { id: services.id,   name: services.name },
      location: { id: locations.id,  name: locations.name },
      assignee: { id: users.id,      name: users.name },
      asset:    { id: assets.id,     name: assets.name,   serialNumber: assets.serialNumber },
    })
    .from(maintenanceTasks)
    .leftJoin(services,  eq(maintenanceTasks.serviceId,    services.id))
    .leftJoin(locations, eq(maintenanceTasks.locationId,   locations.id))
    .leftJoin(users,     eq(maintenanceTasks.assignedToId, users.id))
    .leftJoin(assets,    eq(maintenanceTasks.assetId,      assets.id))
    .where(and(...conds))
    .orderBy(desc(maintenanceTasks.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows.map(r => ({ ...r.task, service: r.service, location: r.location, assignee: r.assignee, asset: r.asset })) });
});

// ── GET /maintenance/stats — Summary counts ────────────────────────────────
maintenanceRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const all = await db
    .select({ status: maintenanceTasks.status, type: maintenanceTasks.type })
    .from(maintenanceTasks)
    .where(eq(maintenanceTasks.orgId, orgId));

  const byStatus = { pending: 0, in_progress: 0, completed: 0, issue_reported: 0 } as Record<string, number>;
  const byType   = { cleaning: 0, maintenance: 0, inspection: 0, damage_repair: 0 } as Record<string, number>;
  for (const r of all) {
    if (r.status) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.type)   byType[r.type]     = (byType[r.type]     || 0) + 1;
  }

  return c.json({ data: { byStatus, byType, total: all.length } });
});

// ── POST /maintenance — Create task ───────────────────────────────────────
maintenanceRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = createTaskSchema.parse(await c.req.json());

  const [task] = await db.insert(maintenanceTasks).values({
    orgId,
    title:        body.title,
    description:  body.description,
    type:         body.type,
    priority:     body.priority,
    status:       body.status,
    serviceId:    body.serviceId  || null,
    bookingId:    body.bookingId  || null,
    locationId:   body.locationId || null,
    assetId:      body.assetId    || null,
    assignedToId: body.assignedToId || null,
    assignedAt:   body.assignedToId ? new Date() : null,
    scheduledAt:  body.scheduledAt ? new Date(body.scheduledAt) : null,
    notes:        body.notes,
    costAmount:   body.costAmount,
    createdById:  userId,
  }).returning();

  return c.json({ data: task }, 201);
});

// ── PATCH /maintenance/:id — Update task ──────────────────────────────────
maintenanceRouter.patch("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body  = updateTaskSchema.parse(await c.req.json());

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (body.title        !== undefined) updates.title        = body.title;
  if (body.description  !== undefined) updates.description  = body.description;
  if (body.type         !== undefined) updates.type         = body.type;
  if (body.priority     !== undefined) updates.priority     = body.priority;
  if (body.notes        !== undefined) updates.notes        = body.notes;
  if (body.costAmount   !== undefined) updates.costAmount   = body.costAmount;
  if (body.serviceId    !== undefined) updates.serviceId    = body.serviceId;
  if (body.bookingId    !== undefined) updates.bookingId    = body.bookingId;
  if (body.locationId   !== undefined) updates.locationId   = body.locationId;
  if (body.assetId      !== undefined) updates.assetId      = body.assetId || null;
  if (body.scheduledAt  !== undefined) updates.scheduledAt  = body.scheduledAt ? new Date(body.scheduledAt) : null;

  // Status transitions
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "in_progress" && !body.startedAt)   updates.startedAt   = new Date();
    if (body.status === "completed"   && !body.completedAt) updates.completedAt = new Date();
  }
  if (body.startedAt   !== undefined) updates.startedAt   = body.startedAt   ? new Date(body.startedAt)   : null;
  if (body.completedAt !== undefined) updates.completedAt = body.completedAt ? new Date(body.completedAt) : null;
  if (body.assignedToId !== undefined) {
    updates.assignedToId = body.assignedToId || null;
    updates.assignedAt   = body.assignedToId ? new Date() : null;
  }

  const [updated] = await db.update(maintenanceTasks)
    .set(updates)
    .where(and(eq(maintenanceTasks.id, c.req.param("id")), eq(maintenanceTasks.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "المهمة غير موجودة" }, 404);
  return c.json({ data: updated });
});

// ── DELETE /maintenance/:id ────────────────────────────────────────────────
maintenanceRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  await db.delete(maintenanceTasks)
    .where(and(eq(maintenanceTasks.id, c.req.param("id")), eq(maintenanceTasks.orgId, orgId)));
  return c.json({ success: true });
});
