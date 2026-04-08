import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, or, ilike, count, sql } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import { workOrders, customers, users, locations } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination, validateBody } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { getAccountsByKeys, createJournalEntry, reverseJournalEntry } from "../lib/posting-engine";

export const workOrdersRouter = new Hono();

// ── Status enum & state machine ──────────────────────────────────────────────
const WORK_ORDER_STATUSES = [
  "received", "diagnosing", "waiting_parts", "in_progress",
  "ready", "delivered", "cancelled",
  "delivery_failed", "returned",
] as const;

const statusEnum = z.enum(WORK_ORDER_STATUSES);

const VALID_TRANSITIONS: Record<string, string[]> = {
  received:       ["diagnosing", "in_progress", "cancelled"],
  diagnosing:     ["waiting_parts", "in_progress", "cancelled"],
  waiting_parts:  ["in_progress", "cancelled"],
  in_progress:    ["ready", "cancelled"],
  ready:          ["delivered", "cancelled"],
  delivered:      [],                                             // terminal
  cancelled:      [],                                             // terminal
  delivery_failed:["ready", "returned", "cancelled"],
  returned:       [],                                             // terminal
};

// Terminal statuses — no edits allowed
const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "returned"]);

// ── Validation schemas ──────────────────────────────────────────────────────
const categoryEnum = z.enum(["repair", "service", "maintenance", "installation", "other"]);

const createSchema = z.object({
  customerName:       z.string().min(1, "اسم العميل مطلوب"),
  customerPhone:      z.string().optional(),
  customerId:         z.string().uuid().optional(),
  locationId:         z.string().uuid().optional(),
  category:           categoryEnum.default("repair"),
  itemName:           z.string().min(1, "اسم الجهاز/الغرض مطلوب"),
  itemModel:          z.string().optional(),
  itemSerial:         z.string().optional(),
  itemBarcode:        z.string().optional(),
  itemCondition:      z.string().optional(),
  problemDescription: z.string().min(1, "وصف المشكلة مطلوب"),
  diagnosis:          z.string().optional(),
  resolution:         z.string().optional(),
  estimatedCost:      z.coerce.string().optional(),
  finalCost:          z.coerce.string().optional(),
  depositAmount:      z.coerce.string().optional(),
  depositPaid:        z.boolean().optional(),
  isPaid:             z.boolean().optional(),
  warrantyDays:       z.coerce.number().int().min(0).optional(),
  estimatedReadyAt:   z.string().datetime().optional(),
  assignedToId:       z.string().uuid().optional(),
  internalNotes:      z.string().optional(),
});

const updateSchema = createSchema.partial();

// ── Helper: generate order number ──────────────────────────────────────────

async function generateOrderNumber(orgId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const [{ total }] = await db
    .select({ total: count() })
    .from(workOrders)
    .where(and(eq(workOrders.orgId, orgId)));
  const seq = String((Number(total) + 1)).padStart(4, "0");
  return `WO-${today}-${seq}`;
}

// ── GET /work-orders — list ─────────────────────────────────────────────────

workOrdersRouter.get("/", async (c) => {
  const orgId  = getOrgId(c);
  const { limit, offset, page } = getPagination(c);
  const status     = c.req.query("status");
  const search     = c.req.query("search");
  const assignedTo = c.req.query("assignedTo");
  const category   = c.req.query("category");

  const conds = [eq(workOrders.orgId, orgId), eq(workOrders.isActive, true)];
  if (status)     conds.push(eq(workOrders.status, status));
  if (category)   conds.push(eq(workOrders.category, category));
  if (assignedTo) conds.push(eq(workOrders.assignedToId, assignedTo));
  if (search) {
    conds.push(or(
      ilike(workOrders.orderNumber,        `%${search}%`),
      ilike(workOrders.customerName,       `%${search}%`),
      ilike(workOrders.itemName,           `%${search}%`),
      ilike(workOrders.itemSerial,         `%${search}%`),
    )!);
  }

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        order:    workOrders,
        assignee: { id: users.id, name: users.name },
        location: { id: locations.id, name: locations.name },
      })
      .from(workOrders)
      .leftJoin(users,     eq(workOrders.assignedToId, users.id))
      .leftJoin(locations, eq(workOrders.locationId,   locations.id))
      .where(and(...conds))
      .orderBy(desc(workOrders.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(workOrders).where(and(...conds)),
  ]);

  const data = rows.map(r => ({
    ...r.order,
    assigneeName: r.assignee?.name ?? null,
    locationName: r.location?.name ?? null,
  }));

  return c.json({ data, pagination: { page, limit, total: Number(total) } });
});

// ── GET /work-orders/stats ──────────────────────────────────────────────────

workOrdersRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const conds = [eq(workOrders.orgId, orgId), eq(workOrders.isActive, true)];

  const rows = await db
    .select({
      status: workOrders.status,
      count:  count(),
    })
    .from(workOrders)
    .where(and(...conds))
    .groupBy(workOrders.status);

  const statuses = ["received", "diagnosing", "waiting_parts", "in_progress", "ready", "delivered", "cancelled", "delivery_failed", "returned"];
  const byStatus = Object.fromEntries(statuses.map(s => [s, 0]));
  for (const r of rows) byStatus[r.status] = Number(r.count);

  const totalActive   = statuses
    .filter(s => s !== "delivered" && s !== "cancelled" && s !== "returned")
    .reduce((s, k) => s + byStatus[k], 0);
  const totalRevenue  = await db
    .select({ rev: sql<string>`COALESCE(SUM(final_cost), 0)` })
    .from(workOrders)
    .where(and(eq(workOrders.orgId, orgId), eq(workOrders.status, "delivered"), eq(workOrders.isActive, true)));

  return c.json({
    data: {
      byStatus,
      totalActive,
      totalRevenue: Number(totalRevenue[0]?.rev ?? 0),
    },
  });
});

// ── GET /work-orders/:id ────────────────────────────────────────────────────

workOrdersRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  const [row] = await db
    .select({
      order:    workOrders,
      assignee: { id: users.id, name: users.name, phone: users.phone },
      location: { id: locations.id, name: locations.name },
      customer: { id: customers.id, name: customers.name, phone: customers.phone },
    })
    .from(workOrders)
    .leftJoin(users,     eq(workOrders.assignedToId, users.id))
    .leftJoin(locations, eq(workOrders.locationId,   locations.id))
    .leftJoin(customers, eq(workOrders.customerId,   customers.id))
    .where(and(eq(workOrders.id, id), eq(workOrders.orgId, orgId)));

  if (!row) return c.json({ error: "أمر العمل غير موجود" }, 404);

  return c.json({
    data: {
      ...row.order,
      assignee: row.assignee,
      location: row.location,
      customer: row.customer,
    },
  });
});

// ── POST /work-orders — create ──────────────────────────────────────────────

workOrdersRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await validateBody(c, createSchema);
  if (!body) return;

  const orderNumber = await generateOrderNumber(orgId);

  const [created] = await db.insert(workOrders).values({
    orgId,
    orderNumber,
    customerName:       body.customerName,
    customerPhone:      body.customerPhone,
    customerId:         body.customerId,
    locationId:         body.locationId,
    category:           body.category ?? "repair",
    itemName:           body.itemName,
    itemModel:          body.itemModel,
    itemSerial:         body.itemSerial,
    itemBarcode:        body.itemBarcode,
    itemCondition:      body.itemCondition,
    problemDescription: body.problemDescription,
    diagnosis:          body.diagnosis,
    resolution:         body.resolution,
    estimatedCost:      body.estimatedCost,
    finalCost:          body.finalCost,
    depositAmount:      body.depositAmount ?? "0",
    depositPaid:        body.depositPaid ?? false,
    isPaid:             body.isPaid ?? false,
    warrantyDays:       body.warrantyDays ?? 0,
    estimatedReadyAt:   body.estimatedReadyAt ? new Date(body.estimatedReadyAt) : null,
    assignedToId:       body.assignedToId,
    internalNotes:      body.internalNotes,
    createdById:        userId ?? undefined,
  }).returning();

  insertAuditLog({ orgId, userId, action: "create", resource: "work_order", resourceId: created.id });

  return c.json({ data: created }, 201);
});

// ── PATCH /work-orders/:id — update ────────────────────────────────────────

workOrdersRouter.patch("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const body   = await validateBody(c, updateSchema);
  if (!body) return;

  const [existing] = await db
    .select({ id: workOrders.id, status: workOrders.status })
    .from(workOrders)
    .where(and(eq(workOrders.id, id), eq(workOrders.orgId, orgId)));
  if (!existing) return c.json({ error: "أمر العمل غير موجود" }, 404);

  // Prevent modification of terminal orders
  if (TERMINAL_STATUSES.has(existing.status)) {
    return c.json({ error: `لا يمكن تعديل أمر عمل في حالة "${existing.status}"` }, 422);
  }

  const updates: Partial<typeof workOrders.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.customerName       !== undefined) updates.customerName       = body.customerName;
  if (body.customerPhone      !== undefined) updates.customerPhone      = body.customerPhone;
  if (body.customerId         !== undefined) updates.customerId         = body.customerId;
  if (body.locationId         !== undefined) updates.locationId         = body.locationId;
  if (body.category           !== undefined) updates.category           = body.category;
  if (body.itemName           !== undefined) updates.itemName           = body.itemName;
  if (body.itemModel          !== undefined) updates.itemModel          = body.itemModel;
  if (body.itemSerial         !== undefined) updates.itemSerial         = body.itemSerial;
  if (body.itemBarcode        !== undefined) updates.itemBarcode        = body.itemBarcode;
  if (body.itemCondition      !== undefined) updates.itemCondition      = body.itemCondition;
  if (body.problemDescription !== undefined) updates.problemDescription = body.problemDescription;
  if (body.diagnosis          !== undefined) updates.diagnosis          = body.diagnosis;
  if (body.resolution         !== undefined) updates.resolution         = body.resolution;
  if (body.estimatedCost      !== undefined) updates.estimatedCost      = body.estimatedCost;
  if (body.finalCost          !== undefined) updates.finalCost          = body.finalCost;
  if (body.depositAmount      !== undefined) updates.depositAmount      = body.depositAmount;
  if (body.depositPaid        !== undefined) updates.depositPaid        = body.depositPaid;
  if (body.isPaid             !== undefined) updates.isPaid             = body.isPaid;
  if (body.warrantyDays       !== undefined) updates.warrantyDays       = body.warrantyDays;
  if (body.estimatedReadyAt   !== undefined) updates.estimatedReadyAt   = body.estimatedReadyAt ? new Date(body.estimatedReadyAt) : null;
  if (body.assignedToId       !== undefined) updates.assignedToId       = body.assignedToId;
  if (body.internalNotes      !== undefined) updates.internalNotes      = body.internalNotes;

  const [updated] = await db.update(workOrders).set(updates)
    .where(and(eq(workOrders.id, id), eq(workOrders.orgId, orgId)))
    .returning();

  insertAuditLog({ orgId, userId, action: "update", resource: "work_order", resourceId: id });
  return c.json({ data: updated });
});

// ── PATCH /work-orders/:id/status — change status ──────────────────────────

workOrdersRouter.patch("/:id/status", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const body   = await validateBody(c, z.object({
    status: statusEnum,
    cancellationReason: z.string().optional(),
  }));
  if (!body) return;

  // ── Fetch current order (with version for optimistic lock) ────
  const [existing] = await db
    .select()
    .from(workOrders)
    .where(and(eq(workOrders.id, id), eq(workOrders.orgId, orgId)));
  if (!existing) return c.json({ error: "أمر العمل غير موجود" }, 404);

  // ── State machine validation ──────────────────────────────────
  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(body.status)) {
    return c.json({
      error: `لا يمكن الانتقال من "${existing.status}" إلى "${body.status}"`,
    }, 422);
  }

  // ── Atomic: status change + version bump + financial posting ──
  // Use raw pool for transaction because Drizzle + financial posting spans multiple queries
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Build SET clause dynamically
    const setFields: string[] = [`status = $3`, `updated_at = NOW()`, `version = version + 1`];
    const queryParams: any[] = [id, orgId, body.status];

    if (body.status === "diagnosing")    { queryParams.push(new Date()); setFields.push(`diagnosing_at = $${queryParams.length}`); }
    if (body.status === "waiting_parts") { queryParams.push(new Date()); setFields.push(`waiting_parts_at = $${queryParams.length}`); }
    if (body.status === "in_progress")   { queryParams.push(new Date()); setFields.push(`in_progress_at = $${queryParams.length}`); }
    if (body.status === "ready")         { queryParams.push(new Date()); setFields.push(`ready_at = $${queryParams.length}`); }
    if (body.status === "delivered")     { queryParams.push(new Date()); setFields.push(`delivered_at = $${queryParams.length}`); }
    if (body.status === "cancelled") {
      queryParams.push(new Date()); setFields.push(`cancelled_at = $${queryParams.length}`);
      queryParams.push(body.cancellationReason || null); setFields.push(`cancellation_reason = $${queryParams.length}`);
      queryParams.push(userId || null); setFields.push(`cancelled_by = $${queryParams.length}`);
    }

    queryParams.push(existing.version);
    const versionCheck = `AND version = $${queryParams.length}`;

    const { rows: [updated] } = await client.query(
      `UPDATE work_orders SET ${setFields.join(", ")}
       WHERE id = $1 AND org_id = $2 ${versionCheck}
       RETURNING *`,
      queryParams
    );

    if (!updated) {
      await client.query("ROLLBACK");
      return c.json({ error: "أمر العمل تم تعديله بواسطة مستخدم آخر — أعد التحميل" }, 409);
    }

    // ── Financial posting when delivered (with duplicate protection) ──
    if (body.status === "delivered" && !existing.journalEntryId && updated.final_cost && Number(updated.final_cost) > 0) {
      try {
        const accounts = await getAccountsByKeys(orgId, ["AR", "SERVICE_REVENUE"]);
        if (accounts.AR && accounts.SERVICE_REVENUE) {
          const postResult = await createJournalEntry({
            orgId,
            date: new Date(),
            description: `إيراد أمر عمل — ${updated.customer_name} (${updated.item_name})`,
            sourceType: "invoice",
            sourceId: updated.id,
            createdBy: userId ?? undefined,
            lines: [
              { accountId: accounts.AR, debit: Number(updated.final_cost) },
              { accountId: accounts.SERVICE_REVENUE, credit: Number(updated.final_cost) },
            ],
          });
          if (postResult?.entryId) {
            await client.query(
              `UPDATE work_orders SET journal_entry_id = $1, payment_status = 'paid' WHERE id = $2`,
              [postResult.entryId, id]
            );
          }
        }
      } catch { /* accounting not configured — skip silently */ }
    }

    // ── Reverse financial entry on cancellation ─────────────────
    if (body.status === "cancelled" && existing.journalEntryId) {
      try {
        await reverseJournalEntry(
          existing.journalEntryId,
          userId ?? "system",
          `إلغاء أمر عمل #${existing.orderNumber}`
        );
        await client.query(
          `UPDATE work_orders SET payment_status = 'refunded' WHERE id = $1`,
          [id]
        );
      } catch { /* تجاهل أخطاء المحاسبة */ }
    }

    await client.query("COMMIT");

    // ── Audit with old/new status ───────────────────────────────
    insertAuditLog({
      orgId,
      userId,
      action: "update",
      resource: "work_order",
      resourceId: id,
      oldValue: { status: existing.status },
      newValue: { status: body.status },
      metadata: { status: body.status, cancellationReason: body.cancellationReason },
    });

    return c.json({ data: updated });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ── DELETE /work-orders/:id — soft delete ──────────────────────────────────

workOrdersRouter.delete("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  const [existing] = await db.select({ id: workOrders.id })
    .from(workOrders)
    .where(and(eq(workOrders.id, id), eq(workOrders.orgId, orgId)));
  if (!existing) return c.json({ error: "أمر العمل غير موجود" }, 404);

  await db.update(workOrders)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(workOrders.id, id));

  insertAuditLog({ orgId, userId, action: "delete", resource: "work_order", resourceId: id });
  return c.json({ data: { success: true } });
});
