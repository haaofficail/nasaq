import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const rentalRouter = new Hono();

// ─────────────────────────────────────────────────
// CONTRACTS
// ─────────────────────────────────────────────────

const contractSchema = z.object({
  title:        z.string().min(1).max(300),
  customerId:   z.string().uuid().optional().nullable(),
  customerName: z.string().max(200).optional().nullable(),
  customerPhone: z.string().max(50).optional().nullable(),
  notes:        z.string().optional().nullable(),
  value:        z.number().min(0).optional().default(0),
  deposit:      z.number().min(0).optional().default(0),
  startDate:    z.string().optional().nullable(),
  endDate:      z.string().optional().nullable(),
});

// GET /rental/contracts
rentalRouter.get("/contracts", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const search = c.req.query("search") || "";

  const params: any[] = [orgId];
  let where = "rc.org_id = $1";
  if (status && status !== "all") {
    params.push(status);
    where += ` AND rc.status = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (rc.title ILIKE $${params.length} OR rc.customer_name ILIKE $${params.length} OR rc.contract_number ILIKE $${params.length})`;
  }

  const result = await pool.query(
    `SELECT rc.*,
            cu.name AS customer_name_live,
            (SELECT COUNT(*) FROM rental_contract_assets rca WHERE rca.contract_id = rc.id) AS asset_count,
            (SELECT COUNT(*) FROM rental_inspections ri WHERE ri.contract_id = rc.id AND ri.damage_found = true) AS damage_count,
            CASE
              WHEN rc.status = 'active' AND rc.end_date < CURRENT_DATE THEN true
              ELSE false
            END AS is_overdue
     FROM rental_contracts rc
     LEFT JOIN customers cu ON cu.id = rc.customer_id
     WHERE ${where}
     ORDER BY rc.created_at DESC
     LIMIT 200`,
    params
  );
  return c.json({ data: result.rows });
});

// GET /rental/contracts/:id
rentalRouter.get("/contracts/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT rc.*,
            cu.name AS customer_name_live, cu.phone AS customer_phone_live
     FROM rental_contracts rc
     LEFT JOIN customers cu ON cu.id = rc.customer_id
     WHERE rc.id = $1 AND rc.org_id = $2`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);

  const assets = await pool.query(
    `SELECT * FROM rental_contract_assets WHERE contract_id = $1 ORDER BY created_at ASC`,
    [c.req.param("id")]
  );
  const inspections = await pool.query(
    `SELECT * FROM rental_inspections WHERE contract_id = $1 ORDER BY created_at DESC`,
    [c.req.param("id")]
  );

  return c.json({ data: { ...result.rows[0], assets: assets.rows, inspections: inspections.rows } });
});

// POST /rental/contracts
rentalRouter.post("/contracts", async (c) => {
  const orgId = getOrgId(c);
  const body = contractSchema.parse(await c.req.json());

  // Auto contract number
  const seqRes = await pool.query(`SELECT nextval('rental_contract_seq') AS n`);
  const contractNumber = `RC-${seqRes.rows[0].n}`;

  const result = await pool.query(
    `INSERT INTO rental_contracts
       (org_id, contract_number, customer_id, customer_name, customer_phone,
        title, notes, value, deposit, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [orgId, contractNumber, body.customerId || null, body.customerName || null,
     body.customerPhone || null, body.title, body.notes || null,
     body.value || 0, body.deposit || 0, body.startDate || null, body.endDate || null]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "rental_contract", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PATCH /rental/contracts/:id
rentalRouter.patch("/contracts/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE rental_contracts SET
       title              = COALESCE($1, title),
       customer_name      = COALESCE($2, customer_name),
       customer_phone     = COALESCE($3, customer_phone),
       notes              = COALESCE($4, notes),
       value              = COALESCE($5, value),
       deposit            = COALESCE($6, deposit),
       deposit_returned   = COALESCE($7, deposit_returned),
       start_date         = COALESCE($8, start_date),
       end_date           = COALESCE($9, end_date),
       actual_return_date = COALESCE($10, actual_return_date),
       status             = COALESCE($11, status),
       signed_by          = COALESCE($12, signed_by),
       signed_at          = COALESCE($13::timestamptz, signed_at),
       updated_at         = NOW()
     WHERE id = $14 AND org_id = $15 RETURNING *`,
    [body.title || null, body.customerName || null, body.customerPhone || null,
     body.notes ?? null, body.value ?? null, body.deposit ?? null,
     body.depositReturned ?? null, body.startDate || null, body.endDate || null,
     body.actualReturnDate || null, body.status || null,
     body.signedBy || null, body.signedAt || null,
     c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /rental/contracts/:id
rentalRouter.delete("/contracts/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE rental_contracts SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// GET /rental/contracts/stats
rentalRouter.get("/contracts/stats", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT
       COUNT(*)                                           AS total,
       COUNT(*) FILTER (WHERE status = 'draft')          AS draft,
       COUNT(*) FILTER (WHERE status = 'active')         AS active,
       COUNT(*) FILTER (WHERE status = 'completed')      AS completed,
       COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'active' AND end_date < CURRENT_DATE)) AS overdue,
       COALESCE(SUM(value), 0)                           AS total_value,
       COALESCE(SUM(deposit), 0)                         AS total_deposit,
       COALESCE(SUM(deposit_returned), 0)                AS deposit_returned
     FROM rental_contracts WHERE org_id = $1 AND status != 'cancelled'`,
    [orgId]
  );
  return c.json({ data: result.rows[0] });
});

// ─────────────────────────────────────────────────
// CONTRACT ASSETS
// ─────────────────────────────────────────────────

// POST /rental/contracts/:id/assets
rentalRouter.post("/contracts/:id/assets", async (c) => {
  const orgId = getOrgId(c);
  const contractId = c.req.param("id");
  const body = await c.req.json();

  if (!body.assetName?.trim()) return c.json({ error: "Asset name required" }, 400);

  const result = await pool.query(
    `INSERT INTO rental_contract_assets (org_id, contract_id, asset_id, asset_name, quantity, daily_rate, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [orgId, contractId, body.assetId || null, body.assetName.trim(),
     body.quantity || 1, body.dailyRate || 0, body.notes || null]
  );
  return c.json({ data: result.rows[0] }, 201);
});

// DELETE /rental/contracts/:id/assets/:assetRowId
rentalRouter.delete("/contracts/:id/assets/:assetRowId", async (c) => {
  const orgId = getOrgId(c);
  await pool.query(
    `DELETE FROM rental_contract_assets WHERE id = $1 AND org_id = $2`,
    [c.req.param("assetRowId"), orgId]
  );
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────
// INSPECTIONS
// ─────────────────────────────────────────────────

// GET /rental/inspections
rentalRouter.get("/inspections", async (c) => {
  const orgId = getOrgId(c);
  const contractId = c.req.query("contractId");
  const damageOnly = c.req.query("damageOnly") === "true";

  const params: any[] = [orgId];
  let where = "ri.org_id = $1";
  if (contractId) { params.push(contractId); where += ` AND ri.contract_id = $${params.length}`; }
  if (damageOnly) where += " AND ri.damage_found = true";

  const result = await pool.query(
    `SELECT ri.*, rc.title AS contract_title, rc.contract_number
     FROM rental_inspections ri
     LEFT JOIN rental_contracts rc ON rc.id = ri.contract_id
     WHERE ${where}
     ORDER BY ri.created_at DESC
     LIMIT 500`,
    params
  );
  return c.json({ data: result.rows });
});

// POST /rental/inspections
rentalRouter.post("/inspections", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  const result = await pool.query(
    `INSERT INTO rental_inspections
       (org_id, contract_id, asset_id, asset_name, type, condition,
        damage_found, damage_description, damage_cost, inspector_name, notes, photos)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [orgId, body.contractId || null, body.assetId || null, body.assetName || null,
     body.type || "pre_rental", body.condition || "good",
     !!body.damageFound, body.damageDescription || null,
     body.damageCost || null, body.inspectorName || null,
     body.notes || null, JSON.stringify(body.photos || [])]
  );

  // If damage found on post_rental, mark contract accordingly
  if (body.damageFound && body.contractId) {
    await pool.query(
      `UPDATE rental_contracts SET updated_at = NOW() WHERE id = $1 AND org_id = $2`,
      [body.contractId, orgId]
    );
  }

  return c.json({ data: result.rows[0] }, 201);
});

// PATCH /rental/inspections/:id/recover
rentalRouter.patch("/inspections/:id/recover", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE rental_inspections SET damage_recovered = true WHERE id = $1 AND org_id = $2 RETURNING *`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// ─────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────

// GET /rental/analytics
rentalRouter.get("/analytics", async (c) => {
  const orgId = getOrgId(c);

  // Revenue by asset type
  const revenueByType = await pool.query(
    `SELECT
       at.name                          AS asset_type,
       COUNT(DISTINCT rc.id)            AS contracts,
       COALESCE(SUM(rc.value), 0)       AS total_revenue,
       COALESCE(AVG(rc.value), 0)       AS avg_contract_value,
       COUNT(*) FILTER (WHERE rc.status = 'active') AS active_contracts
     FROM rental_contracts rc
     JOIN rental_contract_assets rca ON rca.contract_id = rc.id
     JOIN assets a ON a.id = rca.asset_id
     JOIN asset_types at ON at.id = a.asset_type_id
     WHERE rc.org_id = $1 AND rc.status != 'cancelled'
     GROUP BY at.id, at.name
     ORDER BY total_revenue DESC`,
    [orgId]
  );

  // Utilization per asset (days rented / 30)
  const utilization = await pool.query(
    `SELECT
       a.id, a.name, a.serial_number,
       at.name                                             AS asset_type,
       a.status,
       COUNT(DISTINCT rc.id)                               AS rental_count,
       COALESCE(
         SUM(
           COALESCE(rc.actual_return_date, CURRENT_DATE) - rc.start_date
         ), 0
       )                                                   AS days_rented,
       COALESCE(SUM(rc.value), 0)                          AS total_revenue
     FROM assets a
     JOIN asset_types at ON at.id = a.asset_type_id
     LEFT JOIN rental_contract_assets rca ON rca.asset_id = a.id
     LEFT JOIN rental_contracts rc ON rc.id = rca.contract_id
       AND rc.status IN ('active','completed')
     WHERE a.org_id = $1
     GROUP BY a.id, a.name, a.serial_number, at.name, a.status
     ORDER BY total_revenue DESC
     LIMIT 30`,
    [orgId]
  );

  // Overdue contracts
  const overdue = await pool.query(
    `SELECT rc.*, cu.phone AS customer_phone_live,
            (CURRENT_DATE - rc.end_date) AS days_overdue
     FROM rental_contracts rc
     LEFT JOIN customers cu ON cu.id = rc.customer_id
     WHERE rc.org_id = $1
       AND rc.status = 'active'
       AND rc.end_date < CURRENT_DATE
     ORDER BY rc.end_date ASC`,
    [orgId]
  );

  // Damage summary
  const damage = await pool.query(
    `SELECT
       COUNT(*)                                                  AS total_inspections,
       COUNT(*) FILTER (WHERE damage_found)                      AS with_damage,
       COALESCE(SUM(damage_cost) FILTER (WHERE damage_found), 0) AS total_damage_cost,
       COALESCE(SUM(damage_cost) FILTER (WHERE damage_found AND damage_recovered), 0) AS recovered,
       COALESCE(SUM(damage_cost) FILTER (WHERE damage_found AND NOT damage_recovered), 0) AS unrecovered
     FROM rental_inspections WHERE org_id = $1`,
    [orgId]
  );

  // Maintenance cost summary
  const maintenance = await pool.query(
    `SELECT
       at.name                                  AS asset_type,
       COUNT(ml.id)                             AS maintenance_count,
       COALESCE(SUM(ml.cost::numeric), 0)       AS total_cost
     FROM maintenance_logs ml
     JOIN assets a ON a.id = ml.asset_id
     JOIN asset_types at ON at.id = a.asset_type_id
     WHERE ml.org_id = $1
     GROUP BY at.id, at.name
     ORDER BY total_cost DESC`,
    [orgId]
  );

  return c.json({
    data: {
      revenueByType:  revenueByType.rows,
      utilization:    utilization.rows,
      overdue:        overdue.rows,
      damage:         damage.rows[0],
      maintenance:    maintenance.rows,
    },
  });
});
