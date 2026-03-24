import { Hono } from "hono";
import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { pricingRules } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { z } from "zod";

const createPricingRuleSchema = z.object({
  serviceId: z.string().uuid().optional().nullable(),
  name: z.string(),
  type: z.enum(["capacity", "customer", "location", "seasonal", "day_of_week", "early_bird"]),
  config: z.unknown(),
  adjustmentMode: z.enum(["fixed", "percentage"]).optional(),
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

  const conditions: any[] = [eq(pricingRules.orgId, orgId), eq(pricingRules.isActive, true)];
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
  const { startsAt, endsAt, ...ruleRest } = body;
  const [created] = await db.insert(pricingRules).values({
    orgId, ...ruleRest,
    config: ruleRest.config ?? {},
    adjustmentValue: ruleRest.adjustmentValue ?? "0",
    ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
    ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
  }).returning();
  return c.json({ data: created }, 201);
});

// PUT /pricing-rules/:id
pricingRulesRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updatePricingRuleSchema.parse(await c.req.json());
  const { startsAt, endsAt, ...ruleRest } = body;
  const [updated] = await db.update(pricingRules)
    .set({
      ...ruleRest,
      ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
      ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
      updatedAt: new Date(),
    })
    .where(and(eq(pricingRules.id, c.req.param("id")), eq(pricingRules.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Pricing rule not found" }, 404);
  return c.json({ data: updated });
});

// DELETE /pricing-rules/:id
pricingRulesRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db.update(pricingRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(pricingRules.id, c.req.param("id")), eq(pricingRules.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Pricing rule not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "pricing_rule", resourceId: updated.id });
  return c.json({ data: updated });
});
