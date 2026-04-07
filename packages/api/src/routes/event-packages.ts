import { Hono } from "hono";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const eventPackagesRouter = new Hono();

// ═══════════════════════════════════════════════════════════════
// EVENT PACKAGE TEMPLATES — CRUD
// ═══════════════════════════════════════════════════════════════

// GET /event-packages — list templates with item counts + estimated costs
eventPackagesRouter.get("/", async (c) => {
  const orgId = getOrgId(c);

  const { rows } = await pool.query(
    `SELECT
       t.*,
       COUNT(i.id)::int                                        AS item_count,
       COALESCE(SUM(i.unit_cost_estimate * i.quantity), 0)     AS estimated_cost,
       COUNT(i.id) FILTER (WHERE i.item_type = 'asset')::int   AS asset_count,
       COUNT(i.id) FILTER (WHERE i.item_type LIKE 'consumable%')::int AS consumable_count
     FROM event_package_templates t
     LEFT JOIN event_package_template_items i ON i.template_id = t.id
     WHERE t.org_id = $1 AND t.is_active = TRUE
     GROUP BY t.id
     ORDER BY t.type, t.name ASC`,
    [orgId]
  );

  return c.json({ data: rows });
});

// GET /event-packages/:id — template detail with items
eventPackagesRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const { rows: [template] } = await pool.query(
    `SELECT * FROM event_package_templates WHERE id=$1 AND org_id=$2 AND is_active=TRUE`,
    [id, orgId]
  );
  if (!template) return c.json({ error: "الباقة غير موجودة" }, 404);

  const { rows: items } = await pool.query(
    `SELECT
       i.*,
       da.name AS asset_name, da.status AS asset_status, da.category AS asset_category_resolved,
       COALESCE(fv.display_name_ar, fv.flower_type || ' ' || fv.color) AS variant_name
     FROM event_package_template_items i
     LEFT JOIN decor_assets da       ON da.id = i.asset_id
     LEFT JOIN flower_variants fv    ON fv.id = i.variant_id
     WHERE i.template_id = $1
     ORDER BY i.sort_order, i.item_type, i.created_at`,
    [id]
  );

  return c.json({ data: { ...template, items } });
});

// POST /event-packages — create template
eventPackagesRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await c.req.json();

  const { name, type = "custom", description, worker_count = 2, setup_notes } = body;
  if (!name?.trim()) return c.json({ error: "اسم الباقة مطلوب" }, 400);

  const { rows } = await pool.query(
    `INSERT INTO event_package_templates
       (org_id, name, type, description, worker_count, setup_notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [orgId, name.trim(), type, description ?? null, worker_count, setup_notes ?? null]
  );

  insertAuditLog({ orgId, userId, action: "created", resource: "event_package", resourceId: rows[0].id });
  return c.json({ data: rows[0] }, 201);
});

// PUT /event-packages/:id — update template
eventPackagesRouter.put("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();
  const body   = await c.req.json();

  const { rows } = await pool.query(
    `UPDATE event_package_templates
     SET name=$3, type=$4, description=$5, worker_count=$6, setup_notes=$7, updated_at=NOW()
     WHERE id=$1 AND org_id=$2 AND is_active=TRUE
     RETURNING *`,
    [id, orgId, body.name, body.type, body.description ?? null,
     body.worker_count ?? 2, body.setup_notes ?? null]
  );

  if (!rows[0]) return c.json({ error: "الباقة غير موجودة" }, 404);
  insertAuditLog({ orgId, userId, action: "updated", resource: "event_package", resourceId: id });
  return c.json({ data: rows[0] });
});

// DELETE /event-packages/:id — soft delete
eventPackagesRouter.delete("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { id } = c.req.param();

  await pool.query(
    `UPDATE event_package_templates SET is_active=FALSE, updated_at=NOW()
     WHERE id=$1 AND org_id=$2`,
    [id, orgId]
  );

  insertAuditLog({ orgId, userId, action: "deleted", resource: "event_package", resourceId: id });
  return c.json({ data: { deleted: true } });
});

// ═══════════════════════════════════════════════════════════════
// TEMPLATE ITEMS
// ═══════════════════════════════════════════════════════════════

// POST /event-packages/:id/items — add item to template
eventPackagesRouter.post("/:id/items", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();
  const body  = await c.req.json();

  const { rows: [tmpl] } = await pool.query(
    `SELECT id FROM event_package_templates WHERE id=$1 AND org_id=$2 AND is_active=TRUE`,
    [id, orgId]
  );
  if (!tmpl) return c.json({ error: "الباقة غير موجودة" }, 404);

  const { item_type, asset_id, asset_category, variant_id, description,
          quantity = 1, unit = "قطعة", unit_cost_estimate = 0, sort_order = 0 } = body;

  if (!item_type || !description?.trim()) {
    return c.json({ error: "نوع البند والوصف مطلوبان" }, 400);
  }

  const { rows } = await pool.query(
    `INSERT INTO event_package_template_items
       (template_id, org_id, item_type, asset_id, asset_category, variant_id,
        description, quantity, unit, unit_cost_estimate, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, orgId, item_type, asset_id ?? null, asset_category ?? null,
     variant_id ?? null, description.trim(), quantity, unit, unit_cost_estimate, sort_order]
  );

  return c.json({ data: rows[0] }, 201);
});

// DELETE /event-packages/:id/items/:itemId — remove item
eventPackagesRouter.delete("/:id/items/:itemId", async (c) => {
  const orgId = getOrgId(c);
  const { id, itemId } = c.req.param();

  await pool.query(
    `DELETE FROM event_package_template_items
     WHERE id=$1 AND template_id=$2 AND org_id=$3`,
    [itemId, id, orgId]
  );

  return c.json({ data: { deleted: true } });
});

// ═══════════════════════════════════════════════════════════════
// APPLY TEMPLATE TO SERVICE ORDER
// POST /event-packages/:id/apply — returns preview without mutating
// The actual reservation happens via POST /service-orders/:id/apply-package
// ═══════════════════════════════════════════════════════════════

// GET /event-packages/:id/preview — dry-run: check availability before apply
eventPackagesRouter.get("/:id/preview", async (c) => {
  const orgId = getOrgId(c);
  const { id } = c.req.param();

  const { rows: items } = await pool.query(
    `SELECT
       i.*,
       da.name AS asset_name, da.status AS asset_status,
       COALESCE(fv.display_name_ar, fv.flower_type || ' ' || fv.color) AS variant_name,
       -- available stock for consumable_natural
       (SELECT COALESCE(SUM(fb.quantity_remaining),0)
        FROM flower_batches fb
        WHERE fb.variant_id = i.variant_id AND fb.org_id = $1
          AND fb.quality_status NOT IN ('damaged','expired')
          AND fb.quantity_remaining > 0) AS variant_available_stems
     FROM event_package_template_items i
     LEFT JOIN decor_assets da    ON da.id = i.asset_id
     LEFT JOIN flower_variants fv ON fv.id = i.variant_id
     WHERE i.template_id = $2
     ORDER BY i.sort_order, i.item_type`,
    [orgId, id]
  );

  const warnings: string[] = [];
  const preview = items.map((item: any) => {
    let available = true;
    let note = "";

    if (item.item_type === "asset") {
      if (item.asset_id) {
        available = item.asset_status === "available";
        if (!available) note = `${item.asset_name} — ${item.asset_status === "reserved" ? "محجوز" : "غير متاح"}`;
      } else if (item.asset_category) {
        note = `بحث عن أصل متاح من فئة: ${item.asset_category}`;
      }
    } else if (item.item_type === "consumable_natural") {
      const needed = Number(item.quantity);
      const inStock = Number(item.variant_available_stems);
      available = inStock >= needed;
      if (!available) {
        note = `${item.variant_name}: متوفر ${inStock} من أصل ${needed} ساق`;
        warnings.push(note);
      }
    }

    return { ...item, available, note };
  });

  return c.json({ data: { items: preview, warnings } });
});
