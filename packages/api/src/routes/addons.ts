import { Hono } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { addons } from "@nasaq/db/schema";
import { getOrgId } from "../lib/helpers";
import { z } from "zod";

const createAddonSchema = z.object({
  name: z.string(),
  nameEn: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  priceMode: z.string().optional(),
  price: z.string(),
  type: z.string().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateAddonSchema = createAddonSchema.partial();

export const addonsRouter = new Hono();

// GET /addons
addonsRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(addons)
    .where(eq(addons.orgId, orgId))
    .orderBy(asc(addons.sortOrder));
  return c.json({ data: result, total: result.length });
});

// GET /addons/:id
addonsRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [addon] = await db.select().from(addons)
    .where(and(eq(addons.id, c.req.param("id")), eq(addons.orgId, orgId)));
  if (!addon) return c.json({ error: "Addon not found" }, 404);
  return c.json({ data: addon });
});

// POST /addons
addonsRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = createAddonSchema.parse(await c.req.json());
  const [created] = await db.insert(addons).values({ orgId, ...body }).returning();
  return c.json({ data: created }, 201);
});

// PUT /addons/:id
addonsRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateAddonSchema.parse(await c.req.json());
  const [updated] = await db.update(addons)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(addons.id, c.req.param("id")), eq(addons.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Addon not found" }, 404);
  return c.json({ data: updated });
});

// DELETE /addons/:id
addonsRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(addons)
    .where(and(eq(addons.id, c.req.param("id")), eq(addons.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "Addon not found" }, 404);
  return c.json({ data: deleted });
});
