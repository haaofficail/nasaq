import { Hono } from "hono";
import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { pricingRules } from "@nasaq/db/schema";
import { getOrgId } from "../lib/helpers";
import { z } from "zod";

const createPricingRuleSchema = z.object({
  serviceId: z.string().uuid().optional().nullable(),
  name: z.string(),
  type: z.string(),
  config: z.unknown(),
  adjustmentMode: z.string().optional(),
  adjustmentValue: z.string().optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});

const updatePricingRuleSchema = createPricingRuleSchema.partial();

export const pricingRulesRouter = new Hono();

// GET /pricing-rules — List all (optionally filter by serviceId)
pricingRulesRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const serviceId = c.req.query("serviceId");

  const conditions = [eq(pricingRules.orgId, orgId)];
  if (serviceId) conditions.push(eq(pricingRules.serviceId, serviceId));

  const result = await db.select().from(pricingRules)
    .where(and(...conditions))
    .orderBy(desc(pricingRules.priority));

  return c.json({ data: result, total: result.length });
});

// POST /pricing-rules
pricingRulesRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = createPricingRuleSchema.parse(await c.req.json());
  const [created] = await db.insert(pricingRules).values({ orgId, ...body }).returning();
  return c.json({ data: created }, 201);
});

// PUT /pricing-rules/:id
pricingRulesRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updatePricingRuleSchema.parse(await c.req.json());
  const [updated] = await db.update(pricingRules)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(pricingRules.id, c.req.param("id")), eq(pricingRules.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Pricing rule not found" }, 404);
  return c.json({ data: updated });
});

// DELETE /pricing-rules/:id
pricingRulesRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(pricingRules)
    .where(and(eq(pricingRules.id, c.req.param("id")), eq(pricingRules.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "Pricing rule not found" }, 404);
  return c.json({ data: deleted });
});
