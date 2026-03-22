import { Hono } from "hono";
import { pool } from "@nasaq/db/client";
import { getOrgId, generateSlug } from "../lib/helpers";

export const arrangementsRouter = new Hono();

// GET /arrangements
arrangementsRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const category = c.req.query("category");

  const conditions = ["org_id = $1"];
  const params: any[] = [orgId];
  if (category) { params.push(category); conditions.push(`category_tag = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT * FROM flower_packages ${where} ORDER BY category_tag ASC, name ASC`,
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
  const body = await c.req.json();
  const slug = generateSlug(body.name) + "-" + Date.now().toString(36);

  const result = await pool.query(
    `INSERT INTO flower_packages (org_id, name, slug, description, image, category_tag, base_price, components, linked_to_inventory)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [orgId, body.name, slug, body.description || null, body.image || null,
     body.categoryTag || body.category || "general", body.basePrice || 0,
     JSON.stringify(body.components || []), body.linkedToInventory || false]
  );
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

// DELETE /arrangements/:id
arrangementsRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `DELETE FROM flower_packages WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
