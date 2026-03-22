import { Hono } from "hono";
import { z } from "zod";
import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { categories } from "@nasaq/db/schema";
import { generateSlug, getOrgId, validateBody } from "../lib/helpers";

export const categoriesRouter = new Hono();

// ============================================================
// SCHEMAS
// ============================================================

const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  nameEn: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  icon: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

// ============================================================
// GET /categories — List all (with tree structure)
// ============================================================

categoriesRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const flat = c.req.query("flat") === "true";
  
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.orgId, orgId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  if (flat) {
    return c.json({ data: result, total: result.length });
  }

  // Build tree
  const tree = buildTree(result, null);
  return c.json({ data: tree, total: result.length });
});

// ============================================================
// GET /categories/:id
// ============================================================

categoriesRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)));

  if (!category) return c.json({ error: "Category not found" }, 404);

  // Get children
  const children = await db
    .select()
    .from(categories)
    .where(and(eq(categories.parentId, id), eq(categories.orgId, orgId)))
    .orderBy(asc(categories.sortOrder));

  return c.json({ data: { ...category, children } });
});

// ============================================================
// POST /categories — Create
// ============================================================

categoriesRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = await validateBody(c, createCategorySchema);
  if (!body) return;

  const slug = body.slug || generateSlug(body.name);

  const [created] = await db
    .insert(categories)
    .values({
      orgId,
      ...body,
      slug,
    })
    .returning();

  return c.json({ data: created }, 201);
});

// ============================================================
// PUT /categories/:id — Update
// ============================================================

categoriesRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await validateBody(c, updateCategorySchema);
  if (!body) return;

  if (body.name && !body.slug) {
    body.slug = generateSlug(body.name);
  }

  const [updated] = await db
    .update(categories)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Category not found" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// DELETE /categories/:id
// ============================================================

categoriesRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  // Check for children
  const children = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.parentId, id), eq(categories.orgId, orgId)));

  if (children.length > 0) {
    return c.json({ error: "Cannot delete category with children. Delete or move children first." }, 400);
  }

  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
    .returning();

  if (!deleted) return c.json({ error: "Category not found" }, 404);
  return c.json({ data: deleted });
});

// ============================================================
// POST /categories/reorder — Bulk reorder
// ============================================================

categoriesRouter.post("/reorder", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json<{ items: { id: string; sortOrder: number; parentId?: string | null }[] }>();

  for (const item of body.items) {
    await db
      .update(categories)
      .set({ sortOrder: item.sortOrder, parentId: item.parentId ?? null, updatedAt: new Date() })
      .where(and(eq(categories.id, item.id), eq(categories.orgId, orgId)));
  }

  return c.json({ success: true });
});

// ============================================================
// HELPERS
// ============================================================

function buildTree(items: any[], parentId: string | null): any[] {
  return items
    .filter((item) => item.parentId === parentId)
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}
