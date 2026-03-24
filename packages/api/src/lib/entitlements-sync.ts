/**
 * Entitlements Sync — bridges the commercial engine to org.enabledCapabilities
 *
 * The commercial engine computes features per org from a 5-layer cascade:
 *   plan_features → addon features → grant features → promo features → tenant_feature_overrides
 *
 * This module writes the result into org.enabledCapabilities so that
 * requireCapability() middleware actually enforces commercial decisions.
 *
 * Call syncOrgEntitlements(orgId) after every commercial write.
 * Call syncPlanEntitlements(planId) after plan_features are modified.
 */

import { eq, and, or, isNull, gt } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  organizations,
  featuresCatalog,
  planFeatures,
  tenantFeatureOverrides,
  tenantAddOns,
  addOns,
  tenantGrants,
  promotions,
  promotionRedemptions,
  organizationCapabilityOverrides,
} from "@nasaq/db/schema";
import { invalidateOrgContext } from "./org-context";

/**
 * Recompute enabled features for one org and write into org.enabledCapabilities.
 * Preserves capabilities that are NOT in the features catalog
 * (those come from businessType defaults and operatingProfile additions).
 */
export async function syncOrgEntitlements(orgId: string): Promise<void> {
  // 1. Get org plan + current stored capabilities
  const [org] = await db
    .select({ plan: organizations.plan, enabledCapabilities: organizations.enabledCapabilities })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  if (!org) return;

  // 2. Get all catalog feature IDs (these are the ones the commercial engine owns)
  const catalogFeatures = await db
    .select({ id: featuresCatalog.id })
    .from(featuresCatalog);
  const catalogIds = new Set(catalogFeatures.map((f) => f.id));

  // 3. Compute enabled feature IDs via the 5-layer cascade
  const featureMap = new Map<string, boolean>();

  // Layer 1: plan defaults
  const planFeatureRows = await db
    .select({ featureId: planFeatures.featureId, enabled: planFeatures.enabled })
    .from(planFeatures)
    .where(eq(planFeatures.planId, org.plan));
  for (const f of planFeatureRows) featureMap.set(f.featureId, f.enabled ?? false);

  // Layer 2: add-on features (active, not expired)
  const addonFeatures = await db
    .select({ targetFeature: addOns.targetFeature })
    .from(tenantAddOns)
    .innerJoin(addOns, eq(tenantAddOns.addOnId, addOns.id))
    .where(
      and(
        eq(tenantAddOns.orgId, orgId),
        eq(tenantAddOns.isActive, true),
        eq(addOns.type, "feature"),
        or(isNull(tenantAddOns.endsAt), gt(tenantAddOns.endsAt, new Date()))
      )
    );
  for (const a of addonFeatures) {
    if (a.targetFeature) featureMap.set(a.targetFeature, true);
  }

  // Layer 3: grant features (active, not expired)
  const grantFeatures = await db
    .select({ targetId: tenantGrants.targetId })
    .from(tenantGrants)
    .where(
      and(
        eq(tenantGrants.orgId, orgId),
        eq(tenantGrants.isActive, true),
        eq(tenantGrants.type, "feature"),
        or(isNull(tenantGrants.endsAt), gt(tenantGrants.endsAt, new Date()))
      )
    );
  for (const g of grantFeatures) {
    if (g.targetId) featureMap.set(g.targetId, true);
  }

  // Layer 4: promotion free features
  const promoFeatures = await db
    .select({ freeFeatures: promotions.freeFeatures })
    .from(promotionRedemptions)
    .innerJoin(promotions, eq(promotionRedemptions.promotionId, promotions.id))
    .where(eq(promotionRedemptions.orgId, orgId));
  for (const p of promoFeatures) {
    if (Array.isArray(p.freeFeatures)) {
      for (const fId of p.freeFeatures as string[]) featureMap.set(fId, true);
    }
  }

  // Layer 5 (highest priority): tenant feature overrides (active, not expired)
  const overrides = await db
    .select({ featureId: tenantFeatureOverrides.featureId, enabled: tenantFeatureOverrides.enabled })
    .from(tenantFeatureOverrides)
    .where(
      and(
        eq(tenantFeatureOverrides.orgId, orgId),
        or(isNull(tenantFeatureOverrides.endsAt), gt(tenantFeatureOverrides.endsAt, new Date()))
      )
    );
  for (const o of overrides) featureMap.set(o.featureId, o.enabled);

  // 4. Compute enabled/disabled catalog feature sets
  const enabledByCommercial = new Set(
    Array.from(featureMap.entries()).filter(([, e]) => e).map(([id]) => id)
  );
  const disabledByCommercial = new Set(
    Array.from(featureMap.entries()).filter(([, e]) => !e).map(([id]) => id)
  );

  // 5. Update org.enabledCapabilities:
  //    Keep non-catalog caps intact + add enabled catalog caps
  const currentCaps = ((org.enabledCapabilities as string[]) ?? []).filter(
    (cap) => !catalogIds.has(cap)
  );
  const merged = Array.from(new Set([...currentCaps, ...enabledByCommercial]));

  await db
    .update(organizations)
    .set({ enabledCapabilities: merged })
    .where(eq(organizations.id, orgId));

  // 6. Manage organizationCapabilityOverrides to force-disable features
  //    that businessType defaults would otherwise enable.
  //    - For disabled catalog features: upsert override enabled=false
  //    - For enabled catalog features: remove any force-disable override
  for (const featureId of disabledByCommercial) {
    const existing = await db
      .select({ id: organizationCapabilityOverrides.id })
      .from(organizationCapabilityOverrides)
      .where(
        and(
          eq(organizationCapabilityOverrides.orgId, orgId),
          eq(organizationCapabilityOverrides.capabilityKey, featureId)
        )
      );
    if (existing.length > 0) {
      await db
        .update(organizationCapabilityOverrides)
        .set({ enabled: false })
        .where(
          and(
            eq(organizationCapabilityOverrides.orgId, orgId),
            eq(organizationCapabilityOverrides.capabilityKey, featureId)
          )
        );
    } else {
      await db.insert(organizationCapabilityOverrides).values({
        orgId,
        capabilityKey: featureId,
        enabled: false,
        reason: "commercial_engine",
      });
    }
  }

  // Remove force-disable overrides for features now enabled by commercial engine
  if (enabledByCommercial.size > 0) {
    for (const featureId of enabledByCommercial) {
      await db
        .delete(organizationCapabilityOverrides)
        .where(
          and(
            eq(organizationCapabilityOverrides.orgId, orgId),
            eq(organizationCapabilityOverrides.capabilityKey, featureId),
            eq(organizationCapabilityOverrides.enabled, false)
          )
        );
    }
  }

  invalidateOrgContext(orgId);
}

/**
 * When plan features change, sync all orgs currently on that plan.
 */
export async function syncPlanEntitlements(planId: string): Promise<void> {
  const orgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.plan, planId as "enterprise" | "basic" | "advanced" | "pro"));

  await Promise.all(orgs.map((o) => syncOrgEntitlements(o.id)));
}
