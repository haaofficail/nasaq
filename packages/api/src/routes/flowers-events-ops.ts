// ============================================================
// flowers-events-ops — Flower Reservations + Expiry Alerts
// All other event ops go through /service-orders
// Multi-tenant: every query filters by orgId
// ============================================================

import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import {
  validateFeTransition,
  isFeOrderLocked,
  FE_STATUS_LABELS,
} from "../lib/flowers-events-status-machine";
import { decrementFlowerBatchQuantity } from "../lib/flower-batch-service";

export const flowersEventsOpsRouter = new Hono();

// ─── GET /expiring-flowers — flowers nearing expiry ──────────────────────────
// Definition: qualityStatus IN ('expiring','expired') OR expiryEstimated <= now() + 1 day
flowersEventsOpsRouter.get("/expiring-flowers", async (c) => {
  const orgId  = getOrgId(c);
  const days   = Math.min(Number(c.req.query("days") ?? 2), 30);
  const cutoff = new Date(Date.now() + days * 86400000).toISOString();

  const { rows } = await pool.query(
    `SELECT
       fb.id,
       fb.batch_number,
       fb.quantity_remaining,
       fb.expiry_estimated,
       fb.quality_status,
       fb.received_at,
       COALESCE(fv.display_name_ar, fv.flower_type || ' - ' || fv.color) AS variant_name,
       fv.flower_type,
       fv.color,
       fv.shelf_life_days,
       EXTRACT(EPOCH FROM (fb.expiry_estimated - now())) / 86400 AS days_until_expiry
     FROM flower_batches fb
     JOIN flower_variants fv ON fv.id = fb.variant_id
     WHERE fb.org_id = $1
       AND fb.is_active = true
       AND fb.quantity_remaining > 0
       AND (
         fb.quality_status IN ('expiring','expired')
         OR fb.expiry_estimated <= $2
       )
     ORDER BY fb.expiry_estimated ASC
     LIMIT 100`,
    [orgId, cutoff]
  );

  return c.json({ data: rows, count: rows.length });
});

// ─── GET /reservations — list flower reservations for org ────────────────────
flowersEventsOpsRouter.get("/reservations", async (c) => {
  const orgId          = getOrgId(c);
  const status         = c.req.query("status") ?? "";
  const serviceOrderId = c.req.query("service_order_id") ?? "";

  const conditions: string[] = ["fr.org_id = $1"];
  const params: any[] = [orgId];

  if (status)         { params.push(status);         conditions.push(`fr.status = $${params.length}`); }
  if (serviceOrderId) { params.push(serviceOrderId); conditions.push(`fr.legacy_service_order_id = $${params.length}`); }

  const { rows } = await pool.query(
    `SELECT
       fr.*,
       COALESCE(fv.display_name_ar, fv.flower_type || ' - ' || fv.color) AS variant_name,
       fb.batch_number
     FROM flower_reservations fr
     JOIN flower_variants fv ON fv.id = fr.variant_id
     LEFT JOIN flower_batches fb ON fb.id = fr.batch_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY fr.created_at DESC
     LIMIT 200`,
    params
  );

  return c.json({ data: rows });
});

// ─── POST /reservations — create reservation ─────────────────────────────────
const reserveSchema = z.object({
  serviceOrderId: z.string().uuid(),
  variantId:      z.string().uuid(),
  batchId:        z.string().uuid().optional(),
  quantity:       z.number().int().positive(),
  notes:          z.string().optional(),
});

flowersEventsOpsRouter.post("/reservations", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = reserveSchema.parse(await c.req.json());

  // Check available stock (batch remaining − already reserved)
  const { rows: stock } = await pool.query(
    `SELECT
       COALESCE(
         (SELECT fb.quantity_remaining FROM flower_batches fb WHERE fb.id = $2),
         (SELECT SUM(fb2.quantity_remaining) FROM flower_batches fb2 WHERE fb2.variant_id = $3 AND fb2.org_id = $1 AND fb2.is_active = true)
       ) AS available_stock,
       COALESCE(
         (SELECT SUM(fr.quantity) FROM flower_reservations fr
          WHERE fr.variant_id = $3 AND fr.org_id = $1 AND fr.status = 'reserved'
            AND ($2::uuid IS NULL OR fr.batch_id = $2)),
         0
       ) AS reserved_qty`,
    [orgId, body.batchId ?? null, body.variantId]
  );

  const availableStock = Number(stock[0]?.available_stock ?? 0);
  const reservedQty    = Number(stock[0]?.reserved_qty    ?? 0);
  const effectiveStock = availableStock - reservedQty;

  if (effectiveStock < body.quantity) {
    return c.json({
      error: `المخزون غير كافٍ — المتاح: ${effectiveStock}، المطلوب: ${body.quantity}`,
    }, 422);
  }

  const { rows } = await pool.query(
     `INSERT INTO flower_reservations
        (org_id, legacy_service_order_id, variant_id, batch_id, quantity, notes)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
    [orgId, body.serviceOrderId, body.variantId, body.batchId ?? null, body.quantity, body.notes ?? null]
  );

  await insertAuditLog({
    orgId, userId, action: "flower_reservation_created",
    resource: "flower_reservation", resourceId: rows[0].id,
    metadata: { serviceOrderId: body.serviceOrderId, variantId: body.variantId, quantity: body.quantity },
  });

  return c.json({ data: rows[0] }, 201);
});

// ─── POST /reservations/:id/release ──────────────────────────────────────────
flowersEventsOpsRouter.post("/reservations/:id/release", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  const { rows } = await pool.query(
    `UPDATE flower_reservations
     SET status = 'released', released_at = now()
     WHERE id = $1 AND org_id = $2 AND status = 'reserved'
     RETURNING *`,
    [id, orgId]
  );

  if (!rows.length) return c.json({ error: "الحجز غير موجود أو تم تحريره مسبقاً" }, 404);

  await insertAuditLog({
    orgId, userId, action: "flower_reservation_released",
    resource: "flower_reservation", resourceId: id, metadata: {},
  });

  return c.json({ data: rows[0] });
});

// ─── POST /reservations/:id/deduct — deduct when IN_PROGRESS ─────────────────
flowersEventsOpsRouter.post("/reservations/:id/deduct", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: resRows } = await client.query(
      `SELECT * FROM flower_reservations WHERE id = $1 AND org_id = $2 AND status = 'reserved' FOR UPDATE`,
      [id, orgId]
    );
    if (!resRows.length) {
      await client.query("ROLLBACK");
      return c.json({ error: "الحجز غير موجود أو ليس في حالة reserved" }, 404);
    }

    const res = resRows[0];

    // Deduct from batch
    if (res.batch_id) {
      const updatedCount = await decrementFlowerBatchQuantity(client, {
        orgId,
        batchId: res.batch_id,
        quantity: Number(res.quantity),
        requireSufficientStock: true,
      });
      if (updatedCount === 0) {
        await client.query("ROLLBACK");
        return c.json({ error: "المخزون غير كافٍ أو الدفعة غير موجودة" }, 422);
      }
    }

    // Mark reservation as deducted
    const { rows: updated } = await client.query(
      `UPDATE flower_reservations
       SET status = 'deducted', deducted_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query("COMMIT");

    await insertAuditLog({
      orgId, userId, action: "flower_reservation_deducted",
      resource: "flower_reservation", resourceId: id,
      metadata: { batchId: res.batch_id, quantity: res.quantity },
    });

    return c.json({ data: updated[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ─── GET /dashboard-metrics — 3 cards for flowers_events dashboard ────────────
flowersEventsOpsRouter.get("/dashboard-metrics", async (c) => {
  const orgId  = getOrgId(c);
  const today  = new Date().toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [upcomingRes, salesRes, alertRes] = await Promise.all([
    // upcoming_events: service_orders with event_date in next 7 days
    pool.query(
      `SELECT id, title, status, event_date, customer_name
       FROM service_orders
       WHERE org_id = $1
         AND event_date >= $2 AND event_date <= $3
         AND status NOT IN ('closed','cancelled')
       ORDER BY event_date ASC
       LIMIT 10`,
      [orgId, today, in7Days]
    ),
    // daily_sales: today's completed POS transactions
    pool.query(
      `SELECT
         COUNT(*)::int AS transaction_count,
         COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
       FROM pos_transactions
       WHERE org_id = $1
         AND DATE(created_at AT TIME ZONE 'Asia/Riyadh') = $2
         AND status = 'completed'`,
      [orgId, today]
    ),
    // flower_alerts: batches expiring within 2 days
    pool.query(
      `SELECT COUNT(*)::int AS expiring_count, COALESCE(SUM(quantity_remaining),0)::int AS total_stems
       FROM flower_batches fb
       WHERE fb.org_id = $1
         AND fb.is_active = true
         AND fb.quantity_remaining > 0
         AND (fb.quality_status IN ('expiring','expired') OR fb.expiry_estimated <= now() + interval '2 days')`,
      [orgId]
    ),
  ]);

  return c.json({
    data: {
      upcoming_events: {
        events:  upcomingRes.rows,
        count:   upcomingRes.rows.length,
      },
      daily_sales: {
        transaction_count: salesRes.rows[0]?.transaction_count ?? 0,
        total_revenue:     Number(salesRes.rows[0]?.total_revenue ?? 0),
      },
      flower_alerts: {
        expiring_count: alertRes.rows[0]?.expiring_count ?? 0,
        total_stems:    alertRes.rows[0]?.total_stems    ?? 0,
      },
    },
  });
});

// ─── POST /service-orders/:id/transition — guarded transition ────────────────
const transitionSchema = z.object({ status: z.string() });

flowersEventsOpsRouter.post("/service-orders/:id/transition", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const body   = transitionSchema.parse(await c.req.json());

  // Load current order
  const { rows: orderRows } = await pool.query(
    `SELECT id, status FROM service_orders WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  if (!orderRows.length) return c.json({ error: "الطلب غير موجود" }, 404);

  const current  = orderRows[0].status as string;
  const next     = body.status;

  // Validate transition
  const result = validateFeTransition(current, next);
  if (!result.ok) return c.json({ error: result.reason }, 422);

  // If transitioning to in_setup (IN_PROGRESS), soft-warn if no team
  let teamWarning: string | null = null;
  if (next === "in_setup") {
    const { rows: staffRows } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM service_order_staff WHERE service_order_id = $1`,
      [id]
    );
    if ((staffRows[0]?.cnt ?? 0) === 0) {
      teamWarning = "لم يتم تعيين فريق تنفيذ — يُنصح بتعيين فريق قبل البدء";
    }
  }

  // If reaching in_setup, deduct all reserved flowers for this order
  if (next === "in_setup") {
    await pool.query(
      `UPDATE flower_reservations
       SET status = 'deducted', deducted_at = now()
       WHERE legacy_service_order_id = $1 AND org_id = $2 AND status = 'reserved'`,
      [id, orgId]
    );
    // Also deduct from batches
    const { rows: resRows } = await pool.query(
      `SELECT batch_id, quantity FROM flower_reservations
       WHERE legacy_service_order_id = $1 AND status = 'deducted' AND batch_id IS NOT NULL`,
      [id]
    );
    for (const r of resRows) {
      await decrementFlowerBatchQuantity(pool, {
        orgId,
        batchId: r.batch_id,
        quantity: Number(r.quantity),
      });
    }
  }

  // If cancelling, release all reservations
  if (next === "cancelled") {
    await pool.query(
      `UPDATE flower_reservations
       SET status = 'released', released_at = now()
       WHERE legacy_service_order_id = $1 AND org_id = $2 AND status = 'reserved'`,
      [id, orgId]
    );
  }

  // Apply transition
  await pool.query(
    `UPDATE service_orders SET status = $1, updated_at = now() WHERE id = $2 AND org_id = $3`,
    [next, id, orgId]
  );

  await insertAuditLog({
    orgId, userId, action: "service_order_status_changed",
    resource: "service_order", resourceId: id,
    metadata: { from: current, to: next, statusLabel: FE_STATUS_LABELS[next] ?? next },
  });

  return c.json({
    data: { id, status: next, statusLabel: FE_STATUS_LABELS[next] ?? next },
    ...(teamWarning ? { warning: teamWarning } : {}),
  });
});
