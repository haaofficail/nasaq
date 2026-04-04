import { db } from "@nasaq/db/client";
import { organizationCapabilityOverrides, planCapabilities } from "@nasaq/db/schema";
import { eq, and } from "drizzle-orm";
import { invalidateOrgContext } from "./org-context";
import { insertAuditLog } from "./audit";

// ============================================================
// CAPABILITY SERVICE
// Single source of truth for capability management.
// All writes to org_capability_overrides MUST go through here.
// ============================================================

export interface EffectiveCapability {
  key: string;
  enabled: boolean;
  source: "plan" | "business_type" | "profile" | "override" | "stored";
  overrideReason?: string;
}

/**
 * Get capabilities included in a plan from plan_capabilities table
 */
export async function getPlanCapabilities(planCode: string): Promise<string[]> {
  const rows = await db
    .select({ capabilityKey: planCapabilities.capabilityKey })
    .from(planCapabilities)
    .where(
      and(
        eq(planCapabilities.planCode, planCode),
        eq(planCapabilities.enabled, true)
      )
    );
  return rows.map((r) => r.capabilityKey);
}

/**
 * Enable a capability for an org via org_capability_overrides
 */
export async function enableCapability(params: {
  orgId: string;
  capabilityKey: string;
  reason?: string;
  setBy?: string;
}): Promise<void> {
  const { orgId, capabilityKey, reason, setBy } = params;

  await db
    .insert(organizationCapabilityOverrides)
    .values({
      orgId,
      capabilityKey,
      enabled: true,
      reason: reason ?? null,
      setBy: setBy ?? null,
    })
    .onConflictDoUpdate({
      target: [organizationCapabilityOverrides.orgId, organizationCapabilityOverrides.capabilityKey],
      set: {
        enabled: true,
        reason: reason ?? null,
        setBy: setBy ?? null,
      },
    });

  invalidateOrgContext(orgId);

  insertAuditLog({
    orgId,
    userId: setBy ?? null,
    action: "capability_enabled",
    resource: "organization_capability_overrides",
    resourceId: orgId,
    newValue: { capabilityKey, enabled: true },
    metadata: { reason },
  });
}

/**
 * Disable a capability for an org via org_capability_overrides
 */
export async function disableCapability(params: {
  orgId: string;
  capabilityKey: string;
  reason?: string;
  setBy?: string;
}): Promise<void> {
  const { orgId, capabilityKey, reason, setBy } = params;

  await db
    .insert(organizationCapabilityOverrides)
    .values({
      orgId,
      capabilityKey,
      enabled: false,
      reason: reason ?? null,
      setBy: setBy ?? null,
    })
    .onConflictDoUpdate({
      target: [organizationCapabilityOverrides.orgId, organizationCapabilityOverrides.capabilityKey],
      set: {
        enabled: false,
        reason: reason ?? null,
        setBy: setBy ?? null,
      },
    });

  invalidateOrgContext(orgId);

  insertAuditLog({
    orgId,
    userId: setBy ?? null,
    action: "capability_disabled",
    resource: "organization_capability_overrides",
    resourceId: orgId,
    newValue: { capabilityKey, enabled: false },
    metadata: { reason },
  });
}

/**
 * Remove override (revert to plan/businessType default)
 */
export async function removeCapabilityOverride(params: {
  orgId: string;
  capabilityKey: string;
}): Promise<void> {
  const { orgId, capabilityKey } = params;

  await db
    .delete(organizationCapabilityOverrides)
    .where(
      and(
        eq(organizationCapabilityOverrides.orgId, orgId),
        eq(organizationCapabilityOverrides.capabilityKey, capabilityKey)
      )
    );

  invalidateOrgContext(orgId);
}

/**
 * Get all overrides for an org
 */
export async function getCapabilityOverrides(orgId: string): Promise<
  Array<{
    capabilityKey: string;
    enabled: boolean;
    reason: string | null;
    setBy: string | null;
    createdAt: Date;
  }>
> {
  const rows = await db
    .select({
      capabilityKey: organizationCapabilityOverrides.capabilityKey,
      enabled: organizationCapabilityOverrides.enabled,
      reason: organizationCapabilityOverrides.reason,
      setBy: organizationCapabilityOverrides.setBy,
      createdAt: organizationCapabilityOverrides.createdAt,
    })
    .from(organizationCapabilityOverrides)
    .where(eq(organizationCapabilityOverrides.orgId, orgId));

  return rows;
}
