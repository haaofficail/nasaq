import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, generateSlug } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

const createArrangementSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  image: z.string().url().optional().nullable(),
  categoryTag: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  basePrice: z.number().min(0).optional().default(0),
  components: z.array(z.unknown()).optional().default([]),
  linkedToInventory: z.boolean().optional().default(false),
});

export const arrangementsRouter = new Hono();

// GET /arrangements
arrangementsRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const category = c.req.query("category");

  const conditions = ["org_id = $1", "is_active = true"];
  const params: any[] = [orgId];
  if (category) { params.push(category); conditions.push(`category_tag = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT * FROM flower_packages ${where} ORDER BY category_tag ASC, name ASC LIMIT 200`,
    params
  );
  return c.json({ data: result.rows });
});

// GET /arrangements/stats
arrangementsRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE is_active) as active,
       COALESCE(SUM(total_orders), 0) as total_orders,
       array_agg(DISTINCT category_tag) as categories
     FROM flower_packages WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] });
});

// POST /arrangements
arrangementsRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = createArrangementSchema.parse(await c.req.json());
  const slug = generateSlug(body.name) + "-" + Date.now().toString(36);

  const result = await pool.query(
    `INSERT INTO flower_packages (org_id, name, slug, description, image, category_tag, base_price, components, linked_to_inventory)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [orgId, body.name, slug, body.description || null, body.image || null,
     body.categoryTag || body.category || "general", body.basePrice || 0,
     JSON.stringify(body.components || []), body.linkedToInventory || false]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "arrangement", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PUT /arrangements/:id
arrangementsRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE flower_packages SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       image = COALESCE($3, image),
       category_tag = COALESCE($4, category_tag),
       base_price = COALESCE($5, base_price),
       components = COALESCE($6, components),
       updated_at = NOW()
     WHERE id = $7 AND org_id = $8 RETURNING *`,
    [body.name || null, body.description || null, body.image || null,
     body.categoryTag || body.category || null, body.basePrice ?? null,
     body.components ? JSON.stringify(body.components) : null,
     c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "arrangement", resourceId: c.req.param("id") });
  return c.json({ data: result.rows[0] });
});

// PATCH /arrangements/:id/toggle
arrangementsRouter.patch("/:id/toggle", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE flower_packages SET is_active = NOT is_active, updated_at = NOW()
     WHERE id = $1 AND org_id = $2 RETURNING *`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// POST /arrangements/:id/duplicate
arrangementsRouter.post("/:id/duplicate", async (c) => {
  const orgId = getOrgId(c);
  const { rows: [src] } = await pool.query(
    `SELECT * FROM flower_packages WHERE id = $1 AND org_id = $2`,
    [c.req.param("id"), orgId]
  );
  if (!src) return c.json({ error: "Not found" }, 404);

  const slug = generateSlug(src.name) + "-copy-" + Date.now().toString(36);
  const { rows: [created] } = await pool.query(
    `INSERT INTO flower_packages
       (org_id, name, slug, description, image, category_tag, base_price, components, linked_to_inventory)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [orgId, `${src.name} — نسخة`, slug, src.description, src.image,
     src.category_tag, src.base_price, src.components, src.linked_to_inventory]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "arrangement", resourceId: created.id });
  return c.json({ data: created }, 201);
});

// DELETE /arrangements/:id
arrangementsRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const result = await pool.query(
    `UPDATE flower_packages SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [id, orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "arrangement", resourceId: id });
  return c.json({ success: true });
});
