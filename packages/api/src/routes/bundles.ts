import { Hono } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { bundles, bundleItems, services } from "@nasaq/db/schema";
import { getOrgId, generateSlug } from "../lib/helpers";

export const bundlesRouter = new Hono();

// GET /bundles
bundlesRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(bundles)
    .where(eq(bundles.orgId, orgId))
    .orderBy(asc(bundles.sortOrder));
  return c.json({ data: result, total: result.length });
});

// GET /bundles/:id (with items)
bundlesRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  
  const [bundle] = await db.select().from(bundles)
    .where(and(eq(bundles.id, id), eq(bundles.orgId, orgId)));
  if (!bundle) return c.json({ error: "Bundle not found" }, 404);

  const items = await db.select({
    item: bundleItems,
    service: services,
  }).from(bundleItems)
    .leftJoin(services, eq(bundleItems.serviceId, services.id))
    .where(eq(bundleItems.bundleId, id))
    .orderBy(asc(bundleItems.sortOrder));

  return c.json({ data: { ...bundle, items: items.map(i => ({ ...i.item, service: i.service })) } });
});

// POST /bundles
bundlesRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const slug = body.slug || generateSlug(body.name);
  const [created] = await db.insert(bundles).values({ orgId, ...body, slug }).returning();
  return c.json({ data: created }, 201);
});

// POST /bundles/:id/items — Add service to bundle
bundlesRouter.post("/:id/items", async (c) => {
  const body = await c.req.json();
  const [item] = await db.insert(bundleItems).values({
    bundleId: c.req.param("id"),
    serviceId: body.serviceId,
    quantity: body.quantity || 1,
    includedAddonIds: body.includedAddonIds || [],
    sortOrder: body.sortOrder || 0,
  }).returning();
  return c.json({ data: item }, 201);
});

// DELETE /bundles/:id
bundlesRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(bundles)
    .where(and(eq(bundles.id, c.req.param("id")), eq(bundles.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "Bundle not found" }, 404);
  return c.json({ data: deleted });
});
