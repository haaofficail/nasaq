import { Hono } from "hono";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const kitchenRouter = new Hono();

// ============================================================
// GET /kitchen/orders
// Returns online orders for kitchen display — filtered by date
// ============================================================
kitchenRouter.get("/orders", async (c) => {
  const orgId  = getOrgId(c);
  const status = c.req.query("status");
  const date   = c.req.query("date") || new Date().toISOString().split("T")[0];

  const params: any[] = [orgId, date];
  let statusClause = "";
  if (status && status !== "all") {
    params.push(status);
    statusClause = `AND status = $${params.length}`;
  } else {
    // Exclude cancelled by default unless explicitly requested
    statusClause = "AND status != 'cancelled'";
  }

  const { rows } = await pool.query(
    `SELECT id, order_number, order_type, customer_name, customer_phone,
            items, notes, subtotal, tax_amount, delivery_fee, total_amount,
            payment_method, status, created_at, updated_at
     FROM online_orders
     WHERE org_id = $1
       AND created_at::date = $2::date
       ${statusClause}
     ORDER BY created_at ASC`,
    params,
  );

  return c.json({ data: rows });
});

// ============================================================
// GET /kitchen/stats
// Returns order counts by status for today (or given date)
// ============================================================
kitchenRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const date  = c.req.query("date") || new Date().toISOString().split("T")[0];

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                                 AS total,
       COUNT(*) FILTER (WHERE status = 'pending')::int              AS pending,
       COUNT(*) FILTER (WHERE status = 'preparing')::int            AS preparing,
       COUNT(*) FILTER (WHERE status = 'ready')::int                AS ready,
       COUNT(*) FILTER (WHERE status = 'delivered')::int            AS delivered,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int            AS cancelled,
       COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled')),0) AS revenue
     FROM online_orders
     WHERE org_id = $1 AND created_at::date = $2::date`,
    [orgId, date],
  );

  return c.json({ data: rows[0] || {} });
});

// ============================================================
// PATCH /kitchen/orders/:id/status
// Advance order status from kitchen screen
// ============================================================
const VALID_KITCHEN_TRANSITIONS: Record<string, string> = {
  pending:   "preparing",
  preparing: "ready",
  ready:     "delivered",
};

kitchenRouter.patch("/orders/:id/status", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const { status } = await c.req.json();

  if (!status) return c.json({ error: "status مطلوب" }, 400);

  // Verify order belongs to org
  const { rows: [order] } = await pool.query(
    `SELECT id, status FROM online_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId],
  );
  if (!order) return c.json({ error: "الطلب غير موجود" }, 404);

  // Validate transition
  const allowed = VALID_KITCHEN_TRANSITIONS[order.status];
  if (allowed !== status) {
    return c.json({ error: `لا يمكن الانتقال من "${order.status}" إلى "${status}"` }, 422);
  }

  const { rows: [updated] } = await pool.query(
    `UPDATE online_orders SET status = $1, updated_at = NOW()
     WHERE id = $2 AND org_id = $3
     RETURNING id, order_number, status`,
    [status, id, orgId],
  );

  insertAuditLog({
    orgId,
    userId,
    action: "updated",
    resource: "kitchen_order",
    resourceId: id,
    oldValue: { status: order.status },
    newValue: { status },
    metadata: { orderNumber: updated?.order_number },
  });

  return c.json({ data: updated });
});
