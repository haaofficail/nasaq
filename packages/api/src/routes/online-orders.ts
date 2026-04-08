import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

// ── Status enum & state machine ──────────────────────────────────────────────
const ONLINE_ORDER_STATUSES = [
  "pending", "confirmed", "preparing", "ready",
  "delivered", "cancelled",
  "delivery_failed", "returned",
] as const;

const onlineOrderStatusEnum = z.enum(ONLINE_ORDER_STATUSES);

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:          ["confirmed", "preparing", "cancelled"],
  confirmed:        ["preparing", "cancelled"],
  preparing:        ["ready", "cancelled"],
  ready:            ["delivered", "cancelled"],
  delivered:        [],                                   // terminal
  cancelled:        [],                                   // terminal
  delivery_failed:  ["ready", "returned", "cancelled"],
  returned:         [],                                   // terminal
};

// Terminal statuses — no edits allowed
const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "returned"]);

const createOrderSchema = z.object({
  orderType: z.enum(["delivery", "pickup", "dine_in"]).default("delivery"),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(5).max(20),
  customerEmail: z.string().email().optional().nullable(),
  deliveryAddress: z.record(z.unknown()).optional(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0).optional().default(0),
  deliveryFee: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0),
  paymentMethod: z.string().default("cash_on_delivery"),
});

export const onlineOrdersRouter = new Hono();

// GET /online-orders
onlineOrdersRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");

  const conditions = ["org_id = $1"];
  const params: any[] = [orgId];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT id, order_number, order_type, customer_name, customer_phone, customer_email,
            delivery_address, items, subtotal, tax_amount, delivery_fee, total_amount,
            payment_method, status, notes, created_at, updated_at
     FROM online_orders ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const countResult = await pool.query(`SELECT COUNT(*) FROM online_orders ${where}`, params);
  return c.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
});

// GET /online-orders/stats
onlineOrdersRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'pending') as pending,
       COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
       COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
       COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
       COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled')), 0) as total_revenue
     FROM online_orders WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] });
});

// GET /online-orders/:id
onlineOrdersRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM online_orders WHERE id = $1 AND org_id = $2`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// POST /online-orders
onlineOrdersRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = createOrderSchema.parse(await c.req.json());
  const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;

  const result = await pool.query(
    `INSERT INTO online_orders
       (org_id, order_number, order_type, customer_name, customer_phone, customer_email,
        delivery_address, items, subtotal, tax_amount, delivery_fee, total_amount, payment_method)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [orgId, orderNum, body.orderType,
     body.customerName, body.customerPhone, body.customerEmail || null,
     JSON.stringify(body.deliveryAddress || {}),
     JSON.stringify(body.items),
     body.subtotal, body.taxAmount, body.deliveryFee, body.totalAmount,
     body.paymentMethod]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "online_order", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PATCH /online-orders/:id/status
onlineOrdersRouter.patch("/:id/status", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  // ── Strict Zod validation ─────────────────────────────────────
  const body = z.object({
    status: onlineOrderStatusEnum,
    cancellationReason: z.string().optional(),
  }).safeParse(await c.req.json());

  if (!body.success) {
    return c.json({ error: "حالة غير صالحة", details: body.error.errors }, 400);
  }
  const { status, cancellationReason } = body.data;

  // ── Fetch current order ───────────────────────────────────────
  const { rows: [current] } = await pool.query(
    `SELECT id, status, version, order_number FROM online_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  if (!current) return c.json({ error: "الطلب غير موجود" }, 404);

  // ── State machine validation ──────────────────────────────────
  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(status)) {
    return c.json({
      error: `لا يمكن الانتقال من "${current.status}" إلى "${status}"`,
    }, 422);
  }

  // ── Build timestamp field ─────────────────────────────────────
  const tsField: Record<string, string> = {
    confirmed: "confirmed_at",
    preparing: "preparing_at",
    ready: "ready_at",
    delivered: "delivered_at",
    cancelled: "cancelled_at",
  };
  const tsCol = tsField[status];

  const setClauses = [`status = $3`, `updated_at = NOW()`, `version = version + 1`];
  const params: any[] = [id, orgId, status];

  if (tsCol) {
    params.push(new Date());
    setClauses.push(`${tsCol} = $${params.length}`);
  }

  if (status === "cancelled") {
    params.push(cancellationReason || null);
    setClauses.push(`cancellation_reason = $${params.length}`);
    params.push(userId || null);
    setClauses.push(`cancelled_by = $${params.length}`);
  }

  // Optimistic lock
  params.push(current.version);
  const versionCheck = `AND version = $${params.length}`;

  const { rows: [updated] } = await pool.query(
    `UPDATE online_orders SET ${setClauses.join(", ")}
     WHERE id = $1 AND org_id = $2 ${versionCheck}
     RETURNING *`,
    params
  );

  if (!updated) {
    return c.json({ error: "الطلب تم تعديله بواسطة مستخدم آخر — أعد التحميل" }, 409);
  }

  // ── Audit with old/new status ─────────────────────────────────
  insertAuditLog({
    orgId,
    userId,
    action: "updated",
    resource: "online_order",
    resourceId: id,
    oldValue: { status: current.status },
    newValue: { status },
    metadata: { status, cancellationReason },
  });

  return c.json({ data: updated });
});

// DELETE /online-orders/:id — cancel order (uses state machine)
onlineOrdersRouter.delete("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  // Fetch current status + version for optimistic lock
  const { rows: [current] } = await pool.query(
    `SELECT id, status, version FROM online_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  if (!current) return c.json({ error: "الطلب غير موجود" }, 404);

  // State machine: check if cancellation is allowed
  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes("cancelled")) {
    return c.json({
      error: `لا يمكن إلغاء طلب في حالة "${current.status}"`,
    }, 422);
  }

  // Optimistic lock: version check
  const { rows: [updated] } = await pool.query(
    `UPDATE online_orders SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $3,
            updated_at = NOW(), version = version + 1
     WHERE id = $1 AND org_id = $2 AND version = $4 RETURNING id`,
    [id, orgId, userId || null, current.version]
  );
  if (!updated) {
    return c.json({ error: "الطلب تم تعديله بواسطة مستخدم آخر — أعد التحميل" }, 409);
  }

  insertAuditLog({
    orgId,
    userId,
    action: "updated",
    resource: "online_order",
    resourceId: id,
    oldValue: { status: current.status },
    newValue: { status: "cancelled" },
    metadata: { reason: "DELETE endpoint" },
  });

  return c.json({ success: true });
});
