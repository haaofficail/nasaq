import { Hono } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { addons } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { apiErr } from "../lib/errors";
import { z } from "zod";

const createAddonSchema = z.object({
  name: z.string(),
  nameEn: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  priceMode: z.enum(["fixed", "percentage"]).optional(),
  price: z.string(),
  type: z.enum(["required", "optional"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateAddonSchema = createAddonSchema.partial();

export const addonsRouter = new Hono();

// GET /addons
addonsRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(addons)
    .where(and(eq(addons.orgId, orgId), eq(addons.isActive, true)))
    .orderBy(asc(addons.sortOrder))
    .limit(500);
  return c.json({ data: result, total: result.length });
});

// GET /addons/:id
addonsRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [addon] = await db.select().from(addons)
    .where(and(eq(addons.id, c.req.param("id")), eq(addons.orgId, orgId)));
  if (!addon) return apiErr(c, "ADDON_NOT_FOUND", 404);
  return c.json({ data: addon });
});

// POST /addons
addonsRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const parsed = createAddonSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const [created] = await db.insert(addons).values({ orgId, ...parsed.data }).returning();
  return c.json({ data: created }, 201);
});

// PUT /addons/:id
addonsRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const parsed = updateAddonSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const body = parsed.data;
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
  const [updated] = await db.update(addons)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(addons.id, c.req.param("id")), eq(addons.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Addon not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "addon", resourceId: updated.id });
  return c.json({ data: updated });
});
