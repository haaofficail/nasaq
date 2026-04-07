import { Hono } from "hono";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const flowerWasteRouter = new Hono();

// ─── GET / — سجل الهدر ───────────────────────────────────────────────────────

flowerWasteRouter.get("/", async (c) => {
  const orgId   = getOrgId(c);
  const limit   = Number(c.req.query("limit") ?? 50);
  const offset  = Number(c.req.query("offset") ?? 0);

  const { rows } = await pool.query(
    `SELECT
       wl.*,
       COALESCE(fv.display_name_ar, fv.flower_type || ' - ' || fv.color) AS variant_name,
       fb.batch_number
     FROM flower_waste_logs wl
     LEFT JOIN flower_variants fv ON fv.id = wl.variant_id
     LEFT JOIN flower_batches fb ON fb.id = wl.batch_id
     WHERE wl.org_id = $1
     ORDER BY wl.created_at DESC
     LIMIT $2 OFFSET $3`,
    [orgId, limit, offset]
  );

  const { rows: total } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM flower_waste_logs WHERE org_id=$1`, [orgId]
  );

  return c.json({ data: rows, total: total[0].total });
});

// ─── POST / — تسجيل هدر ──────────────────────────────────────────────────────

flowerWasteRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();

  const {
    variant_id, batch_id, quantity_type = "stems",
    quantity, reason = "natural_expiry", notes,
  } = body;

  if (!variant_id || !quantity || quantity <= 0) {
    return c.json({ error: "نوع الورد والكمية مطلوبان" }, 400);
  }

  // تحويل البنشات إلى سيقان للخصم
  let stemsToDeduct = Number(quantity);
  if (quantity_type === "bunches" && batch_id) {
    const { rows: batchInfo } = await pool.query(
      `SELECT stems_per_bunch FROM flower_batches WHERE id=$1 AND org_id=$2`,
      [batch_id, orgId]
    );
    const stemsPerBunch = batchInfo[0]?.stems_per_bunch ?? 10;
    stemsToDeduct = Number(quantity) * stemsPerBunch;
  }

  // خصم من الدفعة إن حُدِّدت
  if (batch_id) {
    await pool.query(
      `UPDATE flower_batches
       SET quantity_remaining = GREATEST(0, quantity_remaining - $1),
           updated_at = NOW()
       WHERE id = $2 AND org_id = $3`,
      [stemsToDeduct, batch_id, orgId]
    );
  }

  // سجّل الهدر
  const { rows } = await pool.query(
    `INSERT INTO flower_waste_logs
       (org_id, variant_id, batch_id, quantity_type, quantity, reason, notes, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [orgId, variant_id, batch_id ?? null, quantity_type,
     quantity, reason, notes ?? null, userId]
  );

  insertAuditLog({ orgId: orgId, userId: userId, action: "create", resource: "flower_waste_log", resourceId: rows[0].id });
  return c.json({ data: rows[0] }, 201);
});

// ─── GET /summary — ملخص الهدر ────────────────────────────────────────────────

flowerWasteRouter.get("/summary", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT
       reason,
       COUNT(*)::int AS entries,
       SUM(CASE WHEN quantity_type='stems' THEN quantity ELSE quantity*10 END)::int AS total_stems_estimate
     FROM flower_waste_logs
     WHERE org_id=$1 AND created_at >= NOW() - INTERVAL '30 days'
     GROUP BY reason
     ORDER BY total_stems_estimate DESC`,
    [orgId]
  );
  return c.json({ data: rows });
});
