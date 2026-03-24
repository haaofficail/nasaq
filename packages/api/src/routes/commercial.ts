/**
 * Commercial Engine API — Absolute Flex Super Admin
 * All routes require superAdminMiddleware (re-applied here via import)
 */
import { Hono } from "hono";
import { eq, and, desc, asc, count, sql, inArray, or, isNull, gt } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  organizations, users,
  featuresCatalog, featureGroups, quotasCatalog,
  planFeatures, planQuotas,
  addOns, tenantAddOns,
  tenantFeatureOverrides, tenantQuotaOverrides,
  tenantGrants, discounts, promotions, promotionRedemptions,
  billingOverrides, ruleDefinitions,
  platformAuditLog,
} from "@nasaq/db/schema";
import { superAdminMiddleware } from "../middleware/auth";
import { syncOrgEntitlements, syncPlanEntitlements } from "../lib/entitlements-sync";
import { apiErr } from "../lib/errors";

function audit(adminId: string, action: string, targetType: string, targetId?: string, details?: any, ip?: string) {
  db.insert(platformAuditLog).values({ adminId, action, targetType, targetId, details: details ?? {}, ip }).catch(() => {});
}

type AdminVariables = { adminId: string; adminName: string; requestId: string };
export const commercialRouter = new Hono<{ Variables: AdminVariables }>();
commercialRouter.use("*", superAdminMiddleware);

// ════════════════════════════════════════════════════════════
// FEATURE CATALOG
// ════════════════════════════════════════════════════════════

commercialRouter.get("/features", async (c) => {
  const features = await db.select().from(featuresCatalog).orderBy(asc(featuresCatalog.sortOrder));
  const groups = await db.select().from(featureGroups).orderBy(asc(featureGroups.sortOrder));
  return c.json({ data: features, groups });
});

commercialRouter.post("/features", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  if (!body.id || !body.nameAr) return apiErr(c, "COM_FEAT_REQUIRED", 400);
  const [row] = await db.insert(featuresCatalog).values(body).returning();
  audit(adminId, "create_feature", "feature", row.id, { nameAr: row.nameAr });
  return c.json({ data: row }, 201);
});

commercialRouter.patch("/features/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const allowed = ["nameAr","nameEn","descriptionAr","groupId","type","icon","isCore","isPremium","isEnterprise","isActive","sortOrder"];
  const updates: any = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  const [row] = await db.update(featuresCatalog).set(updates).where(eq(featuresCatalog.id, c.req.param("id"))).returning();
  if (!row) return apiErr(c, "COM_FEAT_NOT_FOUND", 404);
  audit(adminId, "update_feature", "feature", row.id, updates);
  return c.json({ data: row });
});

// ════════════════════════════════════════════════════════════
// FEATURE GROUPS
// ════════════════════════════════════════════════════════════

commercialRouter.get("/feature-groups", async (c) => {
  const rows = await db.select().from(featureGroups).orderBy(asc(featureGroups.sortOrder));
  return c.json({ data: rows });
});

commercialRouter.post("/feature-groups", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  if (!body.id || !body.nameAr) return apiErr(c, "COM_FEAT_REQUIRED", 400);
  const [row] = await db.insert(featureGroups).values(body).returning();
  audit(adminId, "create_feature_group", "feature_group", row.id, {});
  return c.json({ data: row }, 201);
});

// ════════════════════════════════════════════════════════════
// QUOTAS CATALOG
// ════════════════════════════════════════════════════════════

commercialRouter.get("/quotas", async (c) => {
  const rows = await db.select().from(quotasCatalog).orderBy(asc(quotasCatalog.sortOrder));
  return c.json({ data: rows });
});

commercialRouter.post("/quotas", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const [row] = await db.insert(quotasCatalog).values(body).returning();
  audit(adminId, "create_quota", "quota", row.id, {});
  return c.json({ data: row }, 201);
});

commercialRouter.patch("/quotas/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const allowed = ["nameAr","nameEn","unitAr","defaultValue","hardCap","softLimit","overagePolicy","overagePrice","isActive","sortOrder"];
  const updates: any = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  const [row] = await db.update(quotasCatalog).set(updates).where(eq(quotasCatalog.id, c.req.param("id"))).returning();
  if (!row) return apiErr(c, "COM_QUOTA_NOT_FOUND", 404);
  audit(adminId, "update_quota", "quota", row.id, updates);
  return c.json({ data: row });
});

// ════════════════════════════════════════════════════════════
// PLAN FEATURES — visual package builder
// ════════════════════════════════════════════════════════════

commercialRouter.get("/plans/:planId/features", async (c) => {
  const allFeatures = await db.select().from(featuresCatalog).where(eq(featuresCatalog.isActive, true)).orderBy(asc(featuresCatalog.sortOrder));
  const assigned = await db.select().from(planFeatures).where(eq(planFeatures.planId, c.req.param("planId")));
  const assignedMap = Object.fromEntries(assigned.map((a) => [a.featureId, a]));
  return c.json({
    data: allFeatures.map((f) => ({
      ...f,
      enabled: assignedMap[f.id]?.enabled ?? false,
      config: assignedMap[f.id]?.config ?? {},
    })),
  });
});

commercialRouter.put("/plans/:planId/features", async (c) => {
  const adminId = c.get("adminId") as string;
  const planId = c.req.param("planId");
  const { features } = await c.req.json(); // [{ featureId, enabled, config }]
  if (!Array.isArray(features)) return apiErr(c, "COM_INVALID_FEATURES", 400);

  // Upsert each feature
  for (const f of features) {
    const existing = await db.select({ id: planFeatures.id }).from(planFeatures)
      .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureId, f.featureId)));
    if (existing.length > 0) {
      await db.update(planFeatures).set({ enabled: f.enabled, config: f.config ?? {} })
        .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureId, f.featureId)));
    } else {
      await db.insert(planFeatures).values({ planId, featureId: f.featureId, enabled: f.enabled, config: f.config ?? {} });
    }
  }
  audit(adminId, "update_plan_features", "plan", planId, { count: features.length });
  // Sync all orgs on this plan so requireCapability() reflects the change
  syncPlanEntitlements(planId).catch(() => {});
  return c.json({ data: { planId, updated: features.length } });
});

// ════════════════════════════════════════════════════════════
// PLAN QUOTAS
// ════════════════════════════════════════════════════════════

commercialRouter.get("/plans/:planId/quotas", async (c) => {
  const allQuotas = await db.select().from(quotasCatalog).where(eq(quotasCatalog.isActive, true)).orderBy(asc(quotasCatalog.sortOrder));
  const assigned = await db.select().from(planQuotas).where(eq(planQuotas.planId, c.req.param("planId")));
  const assignedMap = Object.fromEntries(assigned.map((a) => [a.quotaId, a.value]));
  return c.json({
    data: allQuotas.map((q) => ({ ...q, value: assignedMap[q.id] ?? q.defaultValue })),
  });
});

commercialRouter.put("/plans/:planId/quotas", async (c) => {
  const adminId = c.get("adminId") as string;
  const planId = c.req.param("planId");
  const { quotas } = await c.req.json(); // [{ quotaId, value }]
  if (!Array.isArray(quotas)) return apiErr(c, "COM_INVALID_QUOTAS", 400);

  for (const q of quotas) {
    const existing = await db.select({ id: planQuotas.id }).from(planQuotas)
      .where(and(eq(planQuotas.planId, planId), eq(planQuotas.quotaId, q.quotaId)));
    if (existing.length > 0) {
      await db.update(planQuotas).set({ value: q.value }).where(and(eq(planQuotas.planId, planId), eq(planQuotas.quotaId, q.quotaId)));
    } else {
      await db.insert(planQuotas).values({ planId, quotaId: q.quotaId, value: q.value });
    }
  }
  audit(adminId, "update_plan_quotas", "plan", planId, { count: quotas.length });
  return c.json({ data: { planId, updated: quotas.length } });
});

// ════════════════════════════════════════════════════════════
// ADD-ONS CATALOG
// ════════════════════════════════════════════════════════════

commercialRouter.get("/addons", async (c) => {
  const rows = await db.select().from(addOns).orderBy(asc(addOns.sortOrder));
  return c.json({ data: rows });
});

commercialRouter.post("/addons", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  if (!body.key || !body.nameAr || !body.type) return apiErr(c, "COM_ADDON_REQUIRED", 400);
  const [row] = await db.insert(addOns).values(body).returning();
  audit(adminId, "create_addon", "addon", row.id, { key: row.key });
  return c.json({ data: row }, 201);
});

commercialRouter.patch("/addons/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const allowed = ["nameAr","nameEn","descriptionAr","type","targetFeature","targetQuota","quotaIncrement","priceMonthly","priceYearly","priceOneTime","billingCycle","isFree","isRecurring","maxQuantity","allowedPlans","isActive","sortOrder"];
  const updates: any = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  const [row] = await db.update(addOns).set(updates).where(eq(addOns.id, c.req.param("id"))).returning();
  if (!row) return apiErr(c, "COM_ADDON_NOT_FOUND", 404);
  audit(adminId, "update_addon", "addon", row.id, updates);
  return c.json({ data: row });
});

// ════════════════════════════════════════════════════════════
// TENANT ADD-ONS
// ════════════════════════════════════════════════════════════

commercialRouter.get("/orgs/:orgId/addons", async (c) => {
  const rows = await db.select({
    id: tenantAddOns.id, quantity: tenantAddOns.quantity, priceOverride: tenantAddOns.priceOverride,
    isFree: tenantAddOns.isFree, startsAt: tenantAddOns.startsAt, endsAt: tenantAddOns.endsAt,
    isPermanent: tenantAddOns.isPermanent, isActive: tenantAddOns.isActive, notes: tenantAddOns.notes,
    addOn: { id: addOns.id, key: addOns.key, nameAr: addOns.nameAr, type: addOns.type,
             priceMonthly: addOns.priceMonthly, billingCycle: addOns.billingCycle },
  }).from(tenantAddOns)
    .innerJoin(addOns, eq(tenantAddOns.addOnId, addOns.id))
    .where(eq(tenantAddOns.orgId, c.req.param("orgId")))
    .orderBy(desc(tenantAddOns.createdAt));
  return c.json({ data: rows });
});

commercialRouter.post("/orgs/:orgId/addons", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const [row] = await db.insert(tenantAddOns).values({ ...body, orgId: c.req.param("orgId"), grantedBy: adminId }).returning();
  audit(adminId, "grant_tenant_addon", "org", c.req.param("orgId"), { addOnId: body.addOnId, isFree: body.isFree });
  syncOrgEntitlements(c.req.param("orgId")).catch(() => {});
  return c.json({ data: row }, 201);
});

commercialRouter.patch("/orgs/:orgId/addons/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const [row] = await db.update(tenantAddOns).set({ ...body }).where(and(eq(tenantAddOns.id, c.req.param("id")), eq(tenantAddOns.orgId, c.req.param("orgId")))).returning();
  if (!row) return apiErr(c, "COM_ADDON_NOT_FOUND", 404);
  audit(adminId, "update_tenant_addon", "org", c.req.param("orgId"), { id: c.req.param("id") });
  return c.json({ data: row });
});

commercialRouter.delete("/orgs/:orgId/addons/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  await db.update(tenantAddOns).set({ isActive: false }).where(and(eq(tenantAddOns.id, c.req.param("id")), eq(tenantAddOns.orgId, c.req.param("orgId"))));
  audit(adminId, "revoke_tenant_addon", "org", c.req.param("orgId"), { id: c.req.param("id") });
  syncOrgEntitlements(c.req.param("orgId")).catch(() => {});
  return c.json({ data: { success: true } });
});

// ════════════════════════════════════════════════════════════
// TENANT FEATURE OVERRIDES
// ════════════════════════════════════════════════════════════

commercialRouter.get("/orgs/:orgId/feature-overrides", async (c) => {
  const rows = await db.select().from(tenantFeatureOverrides)
    .where(eq(tenantFeatureOverrides.orgId, c.req.param("orgId")))
    .orderBy(desc(tenantFeatureOverrides.createdAt));
  return c.json({ data: rows });
});

commercialRouter.put("/orgs/:orgId/feature-overrides/:featureId", async (c) => {
  const adminId = c.get("adminId") as string;
  const { enabled, reason, endsAt, isPermanent } = await c.req.json();
  const orgId = c.req.param("orgId");
  const featureId = c.req.param("featureId");

  const existing = await db.select({ id: tenantFeatureOverrides.id }).from(tenantFeatureOverrides)
    .where(and(eq(tenantFeatureOverrides.orgId, orgId), eq(tenantFeatureOverrides.featureId, featureId)));

  let row;
  if (existing.length > 0) {
    [row] = await db.update(tenantFeatureOverrides).set({ enabled, reason, endsAt: endsAt ?? null, isPermanent: isPermanent ?? false, grantedBy: adminId })
      .where(and(eq(tenantFeatureOverrides.orgId, orgId), eq(tenantFeatureOverrides.featureId, featureId))).returning();
  } else {
    [row] = await db.insert(tenantFeatureOverrides).values({ orgId, featureId, enabled, reason, endsAt: endsAt ?? null, isPermanent: isPermanent ?? false, grantedBy: adminId }).returning();
  }
  audit(adminId, enabled ? "grant_feature_override" : "revoke_feature_override", "org", orgId, { featureId, reason }, c.req.header("X-Forwarded-For"));
  syncOrgEntitlements(orgId).catch(() => {});
  return c.json({ data: row });
});

commercialRouter.delete("/orgs/:orgId/feature-overrides/:featureId", async (c) => {
  const adminId = c.get("adminId") as string;
  await db.delete(tenantFeatureOverrides).where(and(eq(tenantFeatureOverrides.orgId, c.req.param("orgId")), eq(tenantFeatureOverrides.featureId, c.req.param("featureId"))));
  audit(adminId, "delete_feature_override", "org", c.req.param("orgId"), { featureId: c.req.param("featureId") });
  syncOrgEntitlements(c.req.param("orgId")).catch(() => {});
  return c.json({ data: { success: true } });
});

// ════════════════════════════════════════════════════════════
// TENANT QUOTA OVERRIDES
// ════════════════════════════════════════════════════════════

commercialRouter.get("/orgs/:orgId/quota-overrides", async (c) => {
  const rows = await db.select().from(tenantQuotaOverrides)
    .where(eq(tenantQuotaOverrides.orgId, c.req.param("orgId")))
    .orderBy(desc(tenantQuotaOverrides.createdAt));
  return c.json({ data: rows });
});

commercialRouter.put("/orgs/:orgId/quota-overrides/:quotaId", async (c) => {
  const adminId = c.get("adminId") as string;
  const { value, reason, endsAt, isPermanent } = await c.req.json();
  const orgId = c.req.param("orgId");
  const quotaId = c.req.param("quotaId");

  const existing = await db.select({ id: tenantQuotaOverrides.id }).from(tenantQuotaOverrides)
    .where(and(eq(tenantQuotaOverrides.orgId, orgId), eq(tenantQuotaOverrides.quotaId, quotaId)));

  let row;
  if (existing.length > 0) {
    [row] = await db.update(tenantQuotaOverrides).set({ value, reason, endsAt: endsAt ?? null, isPermanent: isPermanent ?? false, grantedBy: adminId })
      .where(and(eq(tenantQuotaOverrides.orgId, orgId), eq(tenantQuotaOverrides.quotaId, quotaId))).returning();
  } else {
    [row] = await db.insert(tenantQuotaOverrides).values({ orgId, quotaId, value, reason, endsAt: endsAt ?? null, isPermanent: isPermanent ?? false, grantedBy: adminId }).returning();
  }
  audit(adminId, "set_quota_override", "org", orgId, { quotaId, value, reason }, c.req.header("X-Forwarded-For"));
  return c.json({ data: row });
});

// ════════════════════════════════════════════════════════════
// FREE GRANTS
// ════════════════════════════════════════════════════════════

commercialRouter.get("/orgs/:orgId/grants", async (c) => {
  const rows = await db.select().from(tenantGrants)
    .where(and(eq(tenantGrants.orgId, c.req.param("orgId")), eq(tenantGrants.isActive, true)))
    .orderBy(desc(tenantGrants.createdAt));
  return c.json({ data: rows });
});

commercialRouter.post("/orgs/:orgId/grants", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  if (!body.nameAr || !body.type || !body.reason) return apiErr(c, "COM_GRANT_REQUIRED", 400);
  const [row] = await db.insert(tenantGrants).values({ ...body, orgId: c.req.param("orgId"), grantedBy: adminId }).returning();
  audit(adminId, "create_grant", "org", c.req.param("orgId"), { type: body.type, nameAr: body.nameAr }, c.req.header("X-Forwarded-For"));
  if (body.type === "feature") syncOrgEntitlements(c.req.param("orgId")).catch(() => {});
  return c.json({ data: row }, 201);
});

commercialRouter.delete("/orgs/:orgId/grants/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const { reason } = await c.req.json().catch(() => ({}));
  const [row] = await db.update(tenantGrants).set({ isActive: false, revokedAt: new Date(), revokedBy: adminId, revokeReason: reason ?? null })
    .where(and(eq(tenantGrants.id, c.req.param("id")), eq(tenantGrants.orgId, c.req.param("orgId")))).returning();
  if (!row) return apiErr(c, "COM_GRANT_NOT_FOUND", 404);
  audit(adminId, "revoke_grant", "org", c.req.param("orgId"), { id: c.req.param("id"), reason });
  if (row.type === "feature") syncOrgEntitlements(c.req.param("orgId")).catch(() => {});
  return c.json({ data: row });
});

// ════════════════════════════════════════════════════════════
// DISCOUNTS
// ════════════════════════════════════════════════════════════

commercialRouter.get("/discounts", async (c) => {
  const rows = await db.select().from(discounts).orderBy(desc(discounts.createdAt));
  return c.json({ data: rows });
});

commercialRouter.post("/discounts", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  if (!body.name || !body.type || body.value === undefined) return apiErr(c, "COM_DISCOUNT_REQUIRED", 400);
  const [row] = await db.insert(discounts).values({ ...body, createdBy: adminId }).returning();
  audit(adminId, "create_discount", "discount", row.id, { name: row.name, type: row.type, value: row.value });
  return c.json({ data: row }, 201);
});

commercialRouter.patch("/discounts/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const allowed = ["name","type","value","targetScope","targetId","billingCycle","startsAt","endsAt","isPermanent","isStackable","isActive","reason"];
  const updates: any = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  const [row] = await db.update(discounts).set(updates).where(eq(discounts.id, c.req.param("id"))).returning();
  if (!row) return apiErr(c, "COM_DISCOUNT_NOT_FOUND", 404);
  audit(adminId, "update_discount", "discount", row.id, updates);
  return c.json({ data: row });
});

commercialRouter.delete("/discounts/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  await db.update(discounts).set({ isActive: false }).where(eq(discounts.id, c.req.param("id")));
  audit(adminId, "deactivate_discount", "discount", c.req.param("id"), {});
  return c.json({ data: { success: true } });
});

// ════════════════════════════════════════════════════════════
// PROMOTIONS
// ════════════════════════════════════════════════════════════

commercialRouter.get("/promotions", async (c) => {
  const rows = await db.select().from(promotions).orderBy(desc(promotions.createdAt));
  return c.json({ data: rows });
});

commercialRouter.post("/promotions", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  if (!body.name || !body.type) return apiErr(c, "COM_PROMO_REQUIRED", 400);
  const [row] = await db.insert(promotions).values({ ...body, createdBy: adminId }).returning();
  audit(adminId, "create_promotion", "promotion", row.id, { name: row.name, type: row.type });
  return c.json({ data: row }, 201);
});

commercialRouter.patch("/promotions/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const allowed = ["name","descriptionAr","type","value","couponCode","isAutomatic","priority","isStackable","targetPlans","billingCycle","usageLimit","startsAt","endsAt","isActive","freeFeatures","freePeriodDays"];
  const updates: any = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  const [row] = await db.update(promotions).set(updates).where(eq(promotions.id, c.req.param("id"))).returning();
  if (!row) return apiErr(c, "COM_PROMO_NOT_FOUND", 404);
  audit(adminId, "update_promotion", "promotion", row.id, updates);
  return c.json({ data: row });
});

commercialRouter.post("/promotions/:id/apply/:orgId", async (c) => {
  const adminId = c.get("adminId") as string;
  const { discountAmount, notes } = await c.req.json().catch(() => ({}));
  const [promo] = await db.select().from(promotions).where(eq(promotions.id, c.req.param("id")));
  if (!promo || !promo.isActive) return apiErr(c, "COM_PROMO_NOT_FOUND", 404);
  const [row] = await db.insert(promotionRedemptions).values({ promotionId: promo.id, orgId: c.req.param("orgId"), appliedBy: adminId, discountAmount: discountAmount ?? 0, notes }).returning();
  await db.update(promotions).set({ usageCount: sql`${promotions.usageCount} + 1` }).where(eq(promotions.id, promo.id));
  audit(adminId, "apply_promotion", "org", c.req.param("orgId"), { promotionId: promo.id, name: promo.name });
  return c.json({ data: row }, 201);
});

// ════════════════════════════════════════════════════════════
// BILLING OVERRIDES
// ════════════════════════════════════════════════════════════

commercialRouter.get("/orgs/:orgId/billing-override", async (c) => {
  const [row] = await db.select().from(billingOverrides).where(eq(billingOverrides.orgId, c.req.param("orgId"))).orderBy(desc(billingOverrides.createdAt)).limit(1);
  return c.json({ data: row || null });
});

commercialRouter.put("/orgs/:orgId/billing-override", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  if (!body.reason) return apiErr(c, "COM_BILLING_REASON", 400);

  // Delete old, insert new
  await db.delete(billingOverrides).where(eq(billingOverrides.orgId, c.req.param("orgId")));
  const [row] = await db.insert(billingOverrides).values({ ...body, orgId: c.req.param("orgId"), createdBy: adminId }).returning();
  audit(adminId, "set_billing_override", "org", c.req.param("orgId"), { billingMode: body.billingMode, reason: body.reason }, c.req.header("X-Forwarded-For"));
  return c.json({ data: row });
});

// ════════════════════════════════════════════════════════════
// RULE ENGINE
// ════════════════════════════════════════════════════════════

commercialRouter.get("/rules", async (c) => {
  const rows = await db.select().from(ruleDefinitions).orderBy(asc(ruleDefinitions.priority));
  return c.json({ data: rows });
});

commercialRouter.post("/rules", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  if (!body.name || !body.trigger) return apiErr(c, "COM_RULE_REQUIRED", 400);
  const [row] = await db.insert(ruleDefinitions).values({ ...body, createdBy: adminId }).returning();
  audit(adminId, "create_rule", "rule", row.id, { name: row.name, trigger: row.trigger });
  return c.json({ data: row }, 201);
});

commercialRouter.patch("/rules/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const allowed = ["name","description","trigger","conditions","actions","priority","scope","targetId","isActive"];
  const updates: any = {};
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
  const [row] = await db.update(ruleDefinitions).set(updates).where(eq(ruleDefinitions.id, c.req.param("id"))).returning();
  if (!row) return apiErr(c, "COM_RULE_NOT_FOUND", 404);
  audit(adminId, "update_rule", "rule", row.id, updates);
  return c.json({ data: row });
});

// ════════════════════════════════════════════════════════════
// ENTITLEMENTS ENGINE — effective access calculator
// ════════════════════════════════════════════════════════════

commercialRouter.get("/orgs/:orgId/entitlements", async (c) => {
  const orgId = c.req.param("orgId");
  const now = new Date();

  // 1. Get org + plan
  const [org] = await db.select({
    id: organizations.id, plan: organizations.plan,
    subscriptionStatus: organizations.subscriptionStatus,
    trialEndsAt: organizations.trialEndsAt,
    subscriptionEndsAt: organizations.subscriptionEndsAt,
    enabledCapabilities: organizations.enabledCapabilities,
  }).from(organizations).where(eq(organizations.id, orgId));
  if (!org) return apiErr(c, "ORG_NOT_FOUND", 404);

  // 2. Plan features (defaults)
  const planFeatureRows = await db.select({ featureId: planFeatures.featureId, enabled: planFeatures.enabled })
    .from(planFeatures).where(eq(planFeatures.planId, org.plan));

  // 3. Plan quotas (defaults)
  const planQuotaRows = await db.select({ quotaId: planQuotas.quotaId, value: planQuotas.value })
    .from(planQuotas).where(eq(planQuotas.planId, org.plan));

  // 4. Active feature overrides
  const featureOverrides = await db.select().from(tenantFeatureOverrides)
    .where(and(
      eq(tenantFeatureOverrides.orgId, orgId),
      or(isNull(tenantFeatureOverrides.endsAt), gt(tenantFeatureOverrides.endsAt, now))
    ));

  // 5. Active quota overrides
  const quotaOverrides = await db.select().from(tenantQuotaOverrides)
    .where(and(
      eq(tenantQuotaOverrides.orgId, orgId),
      or(isNull(tenantQuotaOverrides.endsAt), gt(tenantQuotaOverrides.endsAt, now))
    ));

  // 6. Active add-ons (quota boosts)
  const activeAddOns = await db.select({
    quantity: tenantAddOns.quantity, isFree: tenantAddOns.isFree,
    addon: { type: addOns.type, targetFeature: addOns.targetFeature, targetQuota: addOns.targetQuota, quotaIncrement: addOns.quotaIncrement, nameAr: addOns.nameAr, key: addOns.key },
  }).from(tenantAddOns)
    .innerJoin(addOns, eq(tenantAddOns.addOnId, addOns.id))
    .where(and(
      eq(tenantAddOns.orgId, orgId),
      eq(tenantAddOns.isActive, true),
      or(isNull(tenantAddOns.endsAt), gt(tenantAddOns.endsAt, now))
    ));

  // 7. Active grants
  const activeGrants = await db.select().from(tenantGrants)
    .where(and(
      eq(tenantGrants.orgId, orgId),
      eq(tenantGrants.isActive, true),
      or(isNull(tenantGrants.endsAt), gt(tenantGrants.endsAt, now))
    ));

  // 8. Billing override
  const [billingOverride] = await db.select().from(billingOverrides)
    .where(eq(billingOverrides.orgId, orgId)).orderBy(desc(billingOverrides.createdAt)).limit(1);

  // 9. Active promotions applied
  const appliedPromos = await db.select({ promo: promotions })
    .from(promotionRedemptions)
    .innerJoin(promotions, eq(promotionRedemptions.promotionId, promotions.id))
    .where(eq(promotionRedemptions.orgId, orgId));

  // ─── COMPUTE EFFECTIVE FEATURES ──────────────────────────
  const featureMap: Record<string, { enabled: boolean; source: string }> = {};

  // Layer 1: Plan defaults
  for (const f of planFeatureRows) {
    featureMap[f.featureId] = { enabled: f.enabled ?? false, source: "plan" };
  }

  // Layer 2: Add-on features
  for (const a of activeAddOns) {
    if (a.addon.type === "feature" && a.addon.targetFeature) {
      featureMap[a.addon.targetFeature] = { enabled: true, source: "addon" };
    }
  }

  // Layer 3: Grant features
  for (const g of activeGrants) {
    if (g.type === "feature" && g.targetId) {
      featureMap[g.targetId] = { enabled: true, source: "grant" };
    }
  }

  // Layer 4: Promotion free features
  for (const { promo } of appliedPromos) {
    if (Array.isArray(promo.freeFeatures)) {
      for (const fId of promo.freeFeatures as string[]) {
        featureMap[fId] = { enabled: true, source: "promotion" };
      }
    }
  }

  // Layer 5 (highest priority): Tenant overrides
  for (const o of featureOverrides) {
    featureMap[o.featureId] = { enabled: o.enabled, source: "override" };
  }

  // ─── COMPUTE EFFECTIVE QUOTAS ─────────────────────────────
  const quotaMap: Record<string, { value: number; source: string }> = {};

  // Layer 1: Plan quotas
  for (const q of planQuotaRows) {
    quotaMap[q.quotaId] = { value: q.value, source: "plan" };
  }

  // Layer 2: Add-on quota boosts
  for (const a of activeAddOns) {
    if (a.addon.type === "quota" && a.addon.targetQuota && a.addon.quotaIncrement) {
      const current = quotaMap[a.addon.targetQuota]?.value ?? 0;
      if (current !== -1) {
        quotaMap[a.addon.targetQuota] = { value: current + (a.addon.quotaIncrement * (a.quantity ?? 1)), source: "addon" };
      }
    }
  }

  // Layer 3: Grant quotas
  for (const g of activeGrants) {
    if (g.type === "quota" && g.targetId && (g.value as any)?.amount !== undefined) {
      const current = quotaMap[g.targetId]?.value ?? 0;
      if (current !== -1) {
        quotaMap[g.targetId] = { value: current + (g.value as any).amount, source: "grant" };
      }
    }
  }

  // Layer 4 (highest priority): Tenant quota overrides
  for (const o of quotaOverrides) {
    quotaMap[o.quotaId] = { value: o.value, source: "override" };
  }

  // ─── ACCESS STATE ────────────────────────────────────────
  const isExpired = org.subscriptionEndsAt && new Date(org.subscriptionEndsAt) < now;
  const isTrial = org.subscriptionStatus === "trialing";
  const isActive = org.subscriptionStatus === "active";
  const accessState = billingOverride?.billingMode === "free" ? "free_tier"
    : billingOverride?.isBillingPaused ? "billing_paused"
    : isExpired ? "expired"
    : isActive ? "active"
    : isTrial ? "trial"
    : org.subscriptionStatus;

  return c.json({
    data: {
      orgId,
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      accessState,
      enabledFeatures: Object.entries(featureMap).filter(([, v]) => v.enabled).map(([k, v]) => ({ featureId: k, source: v.source })),
      disabledFeatures: Object.entries(featureMap).filter(([, v]) => !v.enabled).map(([k]) => k),
      effectiveQuotas: Object.entries(quotaMap).map(([k, v]) => ({ quotaId: k, value: v.value, unlimited: v.value === -1, source: v.source })),
      activeAddOns: activeAddOns.map((a) => ({ key: a.addon.key, nameAr: a.addon.nameAr, isFree: a.isFree, quantity: a.quantity })),
      activeGrants: activeGrants.map((g) => ({ id: g.id, type: g.type, nameAr: g.nameAr, targetId: g.targetId, isPermanent: g.isPermanent, endsAt: g.endsAt })),
      appliedPromotions: appliedPromos.map((p) => ({ id: p.promo.id, name: p.promo.name, type: p.promo.type })),
      billingOverride: billingOverride ? { billingMode: billingOverride.billingMode, customPriceMonthly: billingOverride.customPriceMonthly, isBillingPaused: billingOverride.isBillingPaused } : null,
      trialEndsAt: org.trialEndsAt,
      subscriptionEndsAt: org.subscriptionEndsAt,
      computedAt: now.toISOString(),
    },
  });
});

// ════════════════════════════════════════════════════════════
// PRICING CALCULATOR — effective price for a tenant
// ════════════════════════════════════════════════════════════

commercialRouter.get("/orgs/:orgId/pricing", async (c) => {
  const orgId = c.req.param("orgId");
  const billingCycle = (c.req.query("cycle") as "monthly" | "yearly") || "monthly";

  const [org] = await db.select({ plan: organizations.plan }).from(organizations).where(eq(organizations.id, orgId));
  if (!org) return apiErr(c, "ORG_NOT_FOUND", 404);

  // Base plan price
  const { platformPlans } = await import("@nasaq/db/schema");
  const [plan] = await db.select({ priceMonthly: platformPlans.priceMonthly, priceYearly: platformPlans.priceYearly, nameAr: platformPlans.nameAr })
    .from(platformPlans).where(eq(platformPlans.id, org.plan));

  let basePrice = billingCycle === "yearly" ? Number(plan?.priceYearly ?? 0) : Number(plan?.priceMonthly ?? 0);

  // Billing override
  const [billingOverride] = await db.select().from(billingOverrides).where(eq(billingOverrides.orgId, orgId)).orderBy(desc(billingOverrides.updatedAt)).limit(1);
  let effectivePrice = basePrice;
  let billingMode = billingOverride?.billingMode || "standard";

  if (billingOverride?.billingMode === "free") { effectivePrice = 0; billingMode = "free"; }
  else if (billingOverride?.customPriceMonthly && billingCycle === "monthly") effectivePrice = Number(billingOverride.customPriceMonthly);
  else if (billingOverride?.customPriceYearly && billingCycle === "yearly") effectivePrice = Number(billingOverride.customPriceYearly);

  // Add-ons cost
  const pricingNow = new Date();
  const activeAddOns = await db.select({ quantity: tenantAddOns.quantity, priceOverride: tenantAddOns.priceOverride, isFree: tenantAddOns.isFree, addon: { priceMonthly: addOns.priceMonthly, priceYearly: addOns.priceYearly, nameAr: addOns.nameAr, key: addOns.key } })
    .from(tenantAddOns).innerJoin(addOns, eq(tenantAddOns.addOnId, addOns.id))
    .where(and(eq(tenantAddOns.orgId, orgId), eq(tenantAddOns.isActive, true), or(isNull(tenantAddOns.endsAt), gt(tenantAddOns.endsAt, pricingNow))));

  const addonBreakdown = activeAddOns.map((a) => {
    if (a.isFree) return { nameAr: a.addon.nameAr, key: a.addon.key, quantity: a.quantity, unitPrice: 0, total: 0, isFree: true };
    const unitPrice = a.priceOverride ? Number(a.priceOverride) : billingCycle === "yearly" ? Number(a.addon.priceYearly) : Number(a.addon.priceMonthly);
    return { nameAr: a.addon.nameAr, key: a.addon.key, quantity: a.quantity, unitPrice, total: unitPrice * (a.quantity ?? 1), isFree: false };
  });
  const addonsTotal = addonBreakdown.reduce((s, a) => s + a.total, 0);

  // Active discounts
  const activeDiscounts = await db.select().from(discounts).where(and(
    eq(discounts.isActive, true),
    or(eq(discounts.targetScope, "global"), and(eq(discounts.targetScope, "tenant"), eq(discounts.targetId, orgId)), and(eq(discounts.targetScope, "plan"), eq(discounts.targetId, org.plan))),
    or(isNull(discounts.endsAt), gt(discounts.endsAt, pricingNow))
  ));

  let discountTotal = 0;
  const discountBreakdown = activeDiscounts.map((d) => {
    let amount = 0;
    if (d.type === "percentage") amount = Math.round((effectivePrice + addonsTotal) * Number(d.value) / 100 * 100) / 100;
    else if (d.type === "fixed") amount = Number(d.value);
    discountTotal += amount;
    return { name: d.name, type: d.type, value: d.value, amount };
  });

  const finalPrice = Math.max(0, effectivePrice + addonsTotal - discountTotal);

  return c.json({
    data: {
      orgId, plan: org.plan, billingCycle, billingMode,
      basePrice, effectiveBasePrice: effectivePrice,
      addonsTotal, addonBreakdown,
      discountTotal, discountBreakdown,
      finalPrice,
      currency: "SAR",
      computedAt: new Date().toISOString(),
    },
  });
});
