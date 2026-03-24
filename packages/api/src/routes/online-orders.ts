import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

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
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { status } = await c.req.json();
  const result = await pool.query(
    `UPDATE online_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3 RETURNING *`,
    [status, id, orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "online_order", resourceId: id, metadata: { status } });
  return c.json({ data: result.rows[0] });
});

// DELETE /online-orders/:id
onlineOrdersRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE online_orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
