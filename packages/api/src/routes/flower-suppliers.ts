import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

const supplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  contactPerson: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  flowerSpecialty: z.string().max(200).optional().nullable(),
  flowerOrigin: z.string().max(200).optional().nullable(),
  qualityScore: z.number().min(0).max(10).optional().nullable(),
});

export const flowerSuppliersRouter = new Hono();

// GET /flower-suppliers — list with quality scores
flowerSuppliersRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT
       s.*,
       COUNT(b.id) AS total_batches,
       COALESCE(SUM(b.quantity_received * b.unit_cost::NUMERIC), 0) AS total_purchases_calc,
       -- جودة الورد: نسبة الدفعات التي لم تتلف قبل تاريخ الانتهاء المتوقع
       ROUND(
         CASE
           WHEN COUNT(b.id) > 0 THEN
             (COUNT(b.id) FILTER (WHERE b.quality_status NOT IN ('damaged','expired'))::NUMERIC
              / COUNT(b.id)) * 10
           ELSE NULL
         END,
       1) AS quality_score_calc,
       MAX(b.received_at) AS last_delivery_at_calc
     FROM suppliers s
     LEFT JOIN flower_batches b ON b.supplier_id = s.id AND b.org_id = s.org_id
     WHERE s.org_id = $1
     GROUP BY s.id
     ORDER BY s.name ASC`,
    [orgId]
  );
  return c.json({ data: rows });
});

// GET /flower-suppliers/:id — supplier with history
flowerSuppliersRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const { rows: [supplier] } = await pool.query(
    `SELECT * FROM suppliers WHERE id=$1 AND org_id=$2`,
    [id, orgId]
  );
  if (!supplier) return c.json({ error: "Not found" }, 404);

  const { rows: batches } = await pool.query(
    `SELECT
       b.*,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS variant_name,
       v.shelf_life_days AS expected_shelf_life,
       (b.expiry_estimated::DATE - b.received_at::DATE) AS actual_shelf_life
     FROM flower_batches b
     JOIN flower_variants v ON v.id = b.variant_id
     WHERE b.org_id=$1 AND b.supplier_id=$2
     ORDER BY b.received_at DESC
     LIMIT 50`,
    [orgId, id]
  );

  const qualityScore = batches.length > 0
    ? Math.round(batches.filter((b: any) => b.quality_status !== "damaged" && b.quality_status !== "expired").length / batches.length * 100) / 10
    : null;

  return c.json({ data: { supplier, batches, qualityScore } });
});

// POST /flower-suppliers
flowerSuppliersRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = supplierSchema.parse(await c.req.json());

  const { rows } = await pool.query(
    `INSERT INTO suppliers
       (org_id, name, phone, email, contact_person, notes,
        flower_specialty, flower_origin, quality_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [orgId, body.name, body.phone || null, body.email || null,
     body.contactPerson || null, body.notes || null,
     body.flowerSpecialty || null, body.flowerOrigin || null,
     body.qualityScore || null]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "flower_supplier", resourceId: rows[0]?.id });
  return c.json({ data: rows[0] }, 201);
});

// PUT /flower-suppliers/:id
flowerSuppliersRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = supplierSchema.parse(await c.req.json());

  const { rows } = await pool.query(
    `UPDATE suppliers
     SET name=$3, phone=$4, email=$5, contact_person=$6, notes=$7,
         flower_specialty=$8, flower_origin=$9, updated_at=NOW()
     WHERE id=$1 AND org_id=$2 RETURNING *`,
    [id, orgId, body.name, body.phone || null, body.email || null,
     body.contactPerson || null, body.notes || null,
     body.flowerSpecialty || null, body.flowerOrigin || null]
  );
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: rows[0] });
});

// DELETE /flower-suppliers/:id
flowerSuppliersRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  await pool.query(`DELETE FROM suppliers WHERE id=$1 AND org_id=$2`, [id, orgId]);
  return c.json({ success: true });
});

// GET /flower-suppliers/:id/waste-analysis — هدر منسوب لهذا المورد عبر الدفعات
flowerSuppliersRouter.get("/:id/waste-analysis", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const { rows } = await pool.query(
    `SELECT
       w.reason,
       COUNT(w.id)        AS waste_entries,
       SUM(w.quantity)    AS total_wasted,
       ROUND(
         SUM(w.quantity)::NUMERIC / NULLIF(
           (SELECT SUM(b2.quantity_received) FROM flower_batches b2
            WHERE b2.supplier_id = $2 AND b2.org_id = $1), 0
         ) * 100, 1
       ) AS waste_rate_pct
     FROM flower_waste_logs w
     JOIN flower_batches b ON b.id = w.batch_id
     WHERE w.org_id = $1 AND b.supplier_id = $2
     GROUP BY w.reason
     ORDER BY total_wasted DESC`,
    [orgId, id]
  );

  const { rows: [totals] } = await pool.query(
    `SELECT
       COALESCE(SUM(w.quantity), 0)        AS total_wasted_stems,
       COALESCE(SUM(b.quantity_received), 0) AS total_received_stems,
       ROUND(
         COALESCE(SUM(w.quantity), 0)::NUMERIC /
         NULLIF(SUM(b.quantity_received), 0) * 100, 1
       ) AS overall_waste_rate_pct
     FROM flower_batches b
     LEFT JOIN flower_waste_logs w ON w.batch_id = b.id AND w.org_id = b.org_id
     WHERE b.org_id = $1 AND b.supplier_id = $2`,
    [orgId, id]
  );

  return c.json({ data: { byReason: rows, totals } });
});

// GET /flower-suppliers/quality-ranking
flowerSuppliersRouter.get("/quality/ranking", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT
       s.id, s.name, s.flower_origin,
       COUNT(b.id) AS batch_count,
       ROUND(AVG(CASE WHEN b.quality_status NOT IN ('damaged','expired') THEN 10 ELSE 0 END), 1) AS quality_score,
       ROUND(AVG(b.expiry_estimated::DATE - b.received_at::DATE), 1) AS avg_shelf_life,
       COALESCE(SUM(b.quantity_received * b.unit_cost::NUMERIC), 0) AS total_spent
     FROM suppliers s
     JOIN flower_batches b ON b.supplier_id = s.id AND b.org_id = s.org_id
     WHERE s.org_id = $1
     GROUP BY s.id, s.name, s.flower_origin
     ORDER BY quality_score DESC`,
    [orgId]
  );
  return c.json({ data: rows });
});
