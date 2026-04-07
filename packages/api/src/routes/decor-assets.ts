import { Hono } from "hono";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const decorAssetsRouter = new Hono();

// ─── GET / — قائمة الأصول ────────────────────────────────────────────────────

decorAssetsRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status") ?? "";
  const category = c.req.query("category") ?? "";

  const conditions: string[] = ["da.org_id = $1", "da.is_active = TRUE"];
  const params: any[] = [orgId];

  if (status) {
    params.push(status);
    conditions.push(`da.status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`da.category = $${params.length}`);
  }

  const where = conditions.join(" AND ");
  const { rows } = await pool.query(
    `SELECT da.*,
       (SELECT COUNT(*) FROM decor_asset_reservations ar
        WHERE ar.asset_id = da.id AND ar.status IN ('reserved','dispatched'))::int AS active_reservations,
       -- المشروع الحالي المرتبط بهذا الأصل
       (SELECT so.order_number FROM decor_asset_reservations ar
        JOIN service_orders so ON so.id = ar.service_order_id
        WHERE ar.asset_id = da.id AND ar.status IN ('reserved','dispatched')
        ORDER BY ar.created_at DESC LIMIT 1) AS linked_order_number,
       (SELECT ar.service_order_id FROM decor_asset_reservations ar
        WHERE ar.asset_id = da.id AND ar.status IN ('reserved','dispatched')
        ORDER BY ar.created_at DESC LIMIT 1) AS linked_order_id
     FROM decor_assets da
     WHERE ${where}
     ORDER BY da.name ASC`,
    params
  );

  return c.json({ data: rows });
});

// ─── POST / — إضافة أصل جديد ─────────────────────────────────────────────────

decorAssetsRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();

  const { name, category = "other", code, location, location_type = "warehouse",
          purchase_date, purchase_cost, image_url, notes } = body;

  if (!name) return c.json({ error: "اسم الأصل مطلوب" }, 400);

  // Auto-generate code if not provided
  let finalCode = code ?? null;
  if (!finalCode) {
    const PREFIX: Record<string, string> = {
      artificial_flowers: "AF",
      stands:             "ST",
      backdrops:          "BD",
      vases:              "VS",
      holders:            "HL",
      decor:              "DC",
      kiosk_equipment:    "KE",
      other:              "AS",
    };
    const prefix = PREFIX[category as string] ?? "AS";
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)+1 AS next FROM decor_assets WHERE org_id = $1`, [orgId]
    );
    finalCode = `${prefix}-${String(countRows[0].next).padStart(4, "0")}`;
  }

  const { rows } = await pool.query(
    `INSERT INTO decor_assets
       (org_id, name, category, code, location, location_type, purchase_date, purchase_cost, image_url, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [orgId, name, category, finalCode, location ?? null, location_type,
     purchase_date ?? null, purchase_cost ?? null, image_url ?? null, notes ?? null]
  );

  insertAuditLog({ orgId: orgId, userId: userId, action: "create", resource: "decor_asset", resourceId: rows[0].id });
  return c.json({ data: rows[0] }, 201);
});

// ─── PUT /:id — تعديل بيانات الأصل ──────────────────────────────────────────

decorAssetsRouter.put("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body   = await c.req.json();

  const { name, category, code, location, location_type, purchase_date,
          purchase_cost, image_url, notes } = body;

  const { rows } = await pool.query(
    `UPDATE decor_assets SET
       name = COALESCE($3, name),
       category = COALESCE($4, category),
       code = COALESCE($5, code),
       location = COALESCE($6, location),
       location_type = COALESCE($7, location_type),
       purchase_date = COALESCE($8, purchase_date),
       purchase_cost = COALESCE($9, purchase_cost),
       image_url = COALESCE($10, image_url),
       notes = COALESCE($11, notes),
       updated_at = NOW()
     WHERE id = $1 AND org_id = $2 AND is_active = TRUE
     RETURNING *`,
    [id, orgId, name, category, code, location, location_type,
     purchase_date, purchase_cost, image_url, notes]
  );

  if (!rows[0]) return c.json({ error: "الأصل غير موجود" }, 404);
  insertAuditLog({ orgId: orgId, userId: userId, action: "update", resource: "decor_asset", resourceId: id });
  return c.json({ data: rows[0] });
});

// ─── PATCH /:id/status — تغيير حالة الأصل ────────────────────────────────────

decorAssetsRouter.patch("/:id/status", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const { status, notes, reference_id, reference_label } = await c.req.json();

  const VALID = ["available","reserved","in_use","returned","maintenance","damaged","pending_inspection"];
  if (!VALID.includes(status)) return c.json({ error: "حالة غير صحيحة" }, 400);

  const { rows } = await pool.query(
    `UPDATE decor_assets SET status = $3, updated_at = NOW()
     WHERE id = $1 AND org_id = $2 AND is_active = TRUE
     RETURNING *`,
    [id, orgId, status]
  );
  if (!rows[0]) return c.json({ error: "الأصل غير موجود" }, 404);

  // سجّل الحركة
  await pool.query(
    `INSERT INTO decor_asset_movements
       (asset_id, org_id, movement_type, reference_id, reference_label, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, orgId, status, reference_id ?? null, reference_label ?? null,
     notes ?? null, userId]
  );

  insertAuditLog({ orgId: orgId, userId: userId, action: "update", resource: "decor_asset_status", resourceId: id });
  return c.json({ data: rows[0] });
});

// ─── DELETE /:id — حذف ناعم ──────────────────────────────────────────────────

decorAssetsRouter.delete("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();

  const { rows } = await pool.query(
    `UPDATE decor_assets SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 AND org_id = $2
     RETURNING id`,
    [id, orgId]
  );
  if (!rows[0]) return c.json({ error: "الأصل غير موجود" }, 404);
  insertAuditLog({ orgId: orgId, userId: userId, action: "delete", resource: "decor_asset", resourceId: id });
  return c.json({ data: { deleted: true } });
});

// ─── GET /:id/movements — سجل الحركات ────────────────────────────────────────

decorAssetsRouter.get("/:id/movements", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const { rows } = await pool.query(
    `SELECT * FROM decor_asset_movements
     WHERE asset_id = $1 AND org_id = $2
     ORDER BY created_at DESC LIMIT 100`,
    [id, orgId]
  );
  return c.json({ data: rows });
});

// ─── POST /:id/maintenance — تسجيل صيانة ─────────────────────────────────────

decorAssetsRouter.post("/:id/maintenance", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const { description, cost, performed_by, next_maintenance_date } = await c.req.json();

  const { rows } = await pool.query(
    `INSERT INTO decor_asset_maintenance_logs
       (asset_id, org_id, description, cost, performed_by, next_maintenance_date)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [id, orgId, description ?? null, cost ?? null,
     performed_by ?? null, next_maintenance_date ?? null]
  );

  // غيّر الحالة لـ maintenance وسجّل الحركة
  await pool.query(
    `UPDATE decor_assets SET status = 'maintenance', updated_at = NOW()
     WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );
  await pool.query(
    `INSERT INTO decor_asset_movements (asset_id, org_id, movement_type, notes, created_by)
     VALUES ($1,$2,'maintenance',$3,$4)`,
    [id, orgId, description ?? null, userId]
  );

  return c.json({ data: rows[0] }, 201);
});

// ─── GET /stats — إحصائيات الأصول ────────────────────────────────────────────

decorAssetsRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE is_active)::int AS total,
       COUNT(*) FILTER (WHERE status='available' AND is_active)::int AS available,
       COUNT(*) FILTER (WHERE status='reserved' AND is_active)::int AS reserved,
       COUNT(*) FILTER (WHERE status='in_use' AND is_active)::int AS in_use,
       COUNT(*) FILTER (WHERE status='maintenance' AND is_active)::int AS maintenance,
       COUNT(*) FILTER (WHERE status='damaged' AND is_active)::int AS damaged,
       COUNT(*) FILTER (WHERE status='pending_inspection' AND is_active)::int AS pending_inspection
     FROM decor_assets WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ data: rows[0] });
});
