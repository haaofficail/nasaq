/**
 * feature-flags — deterministic rollout logic for the API layer.
 *
 * Pure functions, no DB calls. Caller fetches config + override, passes here.
 * Identical algorithm to packages/page-builder-v2/src/utils/feature-flags.ts
 * (kept separate to avoid circular workspace dependency).
 */

export interface FeatureConfig {
  key: string;
  killSwitch: boolean;
  defaultForNewOrgs: boolean;
  rolloutPercentage: number; // 0-100
}

export interface OrgContext {
  id: string;
  isNew?: boolean;
}

export type CapabilityOverride = { enabled: boolean } | null;

/**
 * Deterministic integer in [0, 99] for a feature + org pair.
 * Uses FNV-1a 32-bit — same org always gets same bucket.
 */
export function hashOrgFeature(featureKey: string, orgId: string): number {
  const input = featureKey + "|" + orgId;
  let hash = 2166136261; // FNV offset basis (32-bit)
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % 100;
}

export function isFeatureEnabledForOrg(
  feature: FeatureConfig,
  org: OrgContext,
  override: CapabilityOverride,
): boolean {
  if (feature.killSwitch) return false;
  if (override !== null) return override.enabled;
  if (feature.defaultForNewOrgs && org.isNew === true) return true;
  return hashOrgFeature(feature.key, org.id) < feature.rolloutPercentage;
}
