/**
 * feature-flags — pure deterministic rollout logic
 *
 * No DB calls. Caller fetches the feature config + override, passes here.
 * This keeps the core algorithm independently testable.
 *
 * Algorithm:
 *   1. Kill switch → false always
 *   2. Explicit override (enabled/disabled) → wins
 *   3. New org default → if isNew && defaultForNewOrgs → true
 *   4. Deterministic hash rollout → SHA-256(key + orgId) % 100 < rolloutPercentage
 */

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── hashOrgFeature ─────────────────────────────────────────────────────────
// Returns a deterministic integer in [0, 99] for a given feature + org pair.
// Uses a simple FNV-1a-inspired hash so it runs without Node crypto.

export function hashOrgFeature(featureKey: string, orgId: string): number {
  const input = featureKey + "|" + orgId;
  let hash = 2166136261; // FNV offset basis (32-bit)
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime for 32-bit: 16777619. Use >>> 0 to keep 32-bit unsigned.
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % 100;
}

// ── isFeatureEnabledForOrg ─────────────────────────────────────────────────

export function isFeatureEnabledForOrg(
  feature: FeatureConfig,
  org: OrgContext,
  override: CapabilityOverride,
): boolean {
  // 1. Kill switch overrides everything
  if (feature.killSwitch) return false;

  // 2. Explicit org override wins over all other rules
  if (override !== null) return override.enabled;

  // 3. New org default
  if (feature.defaultForNewOrgs && org.isNew === true) return true;

  // 4. Deterministic rollout by hash
  const bucket = hashOrgFeature(feature.key, org.id);
  return bucket < feature.rolloutPercentage;
}
