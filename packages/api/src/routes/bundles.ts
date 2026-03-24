import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, ne } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { bundles, bundleItems, services, customerSubscriptions } from "@nasaq/db/schema";
import { getOrgId, generateSlug, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

const createBundleSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  price: z.string().optional(),
  status: z.enum(["active", "paused", "draft", "archived"]).optional(),
  sortOrder: z.number().int().optional(),
});

const addBundleItemSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().int().min(1).optional().default(1),
  includedAddonIds: z.array(z.string().uuid()).optional().default([]),
  sortOrder: z.number().int().min(0).optional().default(0),
});

const sellBundleSchema = z.object({
  customerId: z.string().uuid(),
  startDate: z.string().optional().nullable(),
});

export const bundlesRouter = new Hono();

// GET /bundles
bundlesRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(bundles)
    .where(and(eq(bundles.orgId, orgId), ne(bundles.status, "archived")))
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
  const body = createBundleSchema.parse(await c.req.json());
  const slug = body.slug || generateSlug(body.name);
  const [created] = await db.insert(bundles).values({ orgId, ...body, slug }).returning();
  return c.json({ data: created }, 201);
});

// POST /bundles/:id/items — Add service to bundle
bundlesRouter.post("/:id/items", async (c) => {
  const body = addBundleItemSchema.parse(await c.req.json());
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
  const { customerId, startDate } = sellBundleSchema.parse(await c.req.json());

  const [bundle] = await db.select().from(bundles)
    .where(and(eq(bundles.id, bundleId), eq(bundles.orgId, orgId)));
  if (!bundle) return c.json({ error: "الباقة غير موجودة" }, 404);

  const items = await db.select({ item: bundleItems, service: services })
    .from(bundleItems)
    .leftJoin(services, eq(bundleItems.serviceId, services.id))
    .where(eq(bundleItems.bundleId, bundleId))
    .orderBy(asc(bundleItems.sortOrder));

  if (items.length === 0) return c.json({ error: "الباقة لا تحتوي على خدمات" }, 400);

  const startDateStr = startDate ?? new Date().toISOString().slice(0, 10);

  const created = await db.insert(customerSubscriptions).values(
    items.map(({ item, service }) => ({
      orgId,
      customerId,
      serviceId: item.serviceId,
      name: `${bundle.name}${service?.name ? " — " + service.name : ""}`,
      price: bundle.finalPrice ?? bundle.totalBasePrice ?? null,
      maxUsage: item.quantity ?? 1,
      currentUsage: 0,
      startDate: startDateStr,
      status: "active",
    }))
  ).returning();

  return c.json({ data: created, count: created.length }, 201);
});

// DELETE /bundles/:id
bundlesRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db.update(bundles)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(bundles.id, c.req.param("id")), eq(bundles.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Bundle not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "bundle", resourceId: updated.id });
  return c.json({ data: updated });
});
