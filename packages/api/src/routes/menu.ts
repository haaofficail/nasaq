import { Hono } from "hono";
import { z } from "zod";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  image: z.string().url().optional().nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const createItemSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().min(0),
  imageUrl: z.string().url().optional().nullable(),
  isAvailable: z.boolean().optional().default(true),
  preparationTime: z.number().int().min(0).optional().default(10),
  isPopular: z.boolean().optional().default(false),
  calories: z.number().int().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const menuRouter = new Hono();

// GET /menu/categories
menuRouter.get("/categories", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT mc.*, COUNT(mi.id) as item_count
     FROM menu_categories mc
     LEFT JOIN menu_items mi ON mi.category_id = mc.id
     WHERE mc.org_id = $1 AND mc.is_active = true
     GROUP BY mc.id ORDER BY mc.sort_order ASC, mc.name ASC`,
    [orgId]
  );
  return c.json({ data: result.rows });
});

// POST /menu/categories
menuRouter.post("/categories", async (c) => {
  const orgId = getOrgId(c);
  const body = createCategorySchema.parse(await c.req.json());
  const result = await pool.query(
    `INSERT INTO menu_categories (org_id, name, name_en, description, image, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [orgId, body.name, body.nameEn || null, body.description || null,
     body.image || null, body.sortOrder || 0, body.isActive !== false]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "menu_category", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PUT /menu/categories/:id
menuRouter.put("/categories/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE menu_categories SET
       name = COALESCE($1, name),
       name_en = COALESCE($2, name_en),
       description = COALESCE($3, description),
       image = COALESCE($4, image),
       sort_order = COALESCE($5, sort_order),
       is_active = COALESCE($6, is_active)
     WHERE id = $7 AND org_id = $8 RETURNING *`,
    [body.name || null, body.nameEn || null, body.description || null,
     body.image || null, body.sortOrder ?? null, body.isActive ?? null,
     c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /menu/categories/:id
menuRouter.delete("/categories/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `UPDATE menu_categories SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// GET /menu/items
menuRouter.get("/items", async (c) => {
  const orgId = getOrgId(c);
  const categoryId = c.req.query("categoryId");

  const conditions = ["mi.org_id = $1", "mi.is_active = true"];
  const params: any[] = [orgId];
  if (categoryId) { params.push(categoryId); conditions.push(`mi.category_id = $${params.length}`); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await pool.query(
    `SELECT mi.*, mc.name as category_name
     FROM menu_items mi
     LEFT JOIN menu_categories mc ON mc.id = mi.category_id
     ${where} ORDER BY mi.sort_order ASC, mi.name ASC`,
    params
  );
  return c.json({ data: result.rows });
});

// POST /menu/items
menuRouter.post("/items", async (c) => {
  const orgId = getOrgId(c);
  const body = createItemSchema.parse(await c.req.json());
  const result = await pool.query(
    `INSERT INTO menu_items
       (org_id, category_id, name, name_en, description, price, image_url, is_available,
        preparation_time, is_popular, calories, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [orgId, body.categoryId || null, body.name, body.nameEn || null,
     body.description || null, body.price || 0, body.imageUrl || null,
     body.isAvailable !== false, body.preparationTime || 10,
     body.isPopular || false, body.calories || null, body.sortOrder || 0]
  );
  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "menu_item", resourceId: result.rows[0]?.id });
  return c.json({ data: result.rows[0] }, 201);
});

// PUT /menu/items/:id
menuRouter.put("/items/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const result = await pool.query(
    `UPDATE menu_items SET
       name = COALESCE($1, name),
       name_en = COALESCE($2, name_en),
       category_id = COALESCE($3, category_id),
       description = COALESCE($4, description),
       price = COALESCE($5, price),
       image_url = COALESCE($6, image_url),
       is_available = COALESCE($7, is_available),
       preparation_time = COALESCE($8, preparation_time),
       is_popular = COALESCE($9, is_popular),
       calories = COALESCE($10, calories),
       sort_order = COALESCE($11, sort_order)
     WHERE id = $12 AND org_id = $13 RETURNING *`,
    [body.name || null, body.nameEn || null, body.categoryId || null, body.description || null,
     body.price ?? null, body.imageUrl || null, body.isAvailable ?? null,
     body.preparationTime ?? null, body.isPopular ?? null, body.calories ?? null,
     body.sortOrder ?? null, c.req.param("id"), orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

// DELETE /menu/items/:id
menuRouter.delete("/items/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const result = await pool.query(
    `UPDATE menu_items SET is_active = false WHERE id = $1 AND org_id = $2 RETURNING id`,
    [id, orgId]
  );
  if (!result.rows[0]) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "menu_item", resourceId: id });
  return c.json({ success: true });
});
