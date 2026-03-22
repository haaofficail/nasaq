import { Hono } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { bundles, bundleItems, services, customerSubscriptions } from "@nasaq/db/schema";
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

// POST /bundles/:id/sell — بيع الباقة لعميل
bundlesRouter.post("/:id/sell", async (c) => {
  const orgId = getOrgId(c);
  const bundleId = c.req.param("id");
  const body = await c.req.json();
  const { customerId, startDate } = body;

  if (!customerId) return c.json({ error: "customerId مطلوب" }, 400);

  const [bundle] = await db.select().from(bundles)
    .where(and(eq(bundles.id, bundleId), eq(bundles.orgId, orgId)));
  if (!bundle) return c.json({ error: "الباقة غير موجودة" }, 404);

  const items = await db.select({ item: bundleItems, service: services })
    .from(bundleItems)
    .leftJoin(services, eq(bundleItems.serviceId, services.id))
    .where(eq(bundleItems.bundleId, bundleId))
    .orderBy(asc(bundleItems.sortOrder));

  if (items.length === 0) return c.json({ error: "الباقة لا تحتوي على خدمات" }, 400);

  const start = startDate ? new Date(startDate) : new Date();

  const created = await db.insert(customerSubscriptions).values(
    items.map(({ item, service }) => ({
      orgId,
      customerId,
      serviceId: item.serviceId,
      name: `${bundle.name}${service?.name ? " — " + service.name : ""}`,
      price: bundle.finalPrice ?? bundle.totalBasePrice ?? null,
      maxUsage: item.quantity ?? 1,
      currentUsage: 0,
      startDate: start,
      status: "active",
    }))
  ).returning();

  return c.json({ data: created, count: created.length }, 201);
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
