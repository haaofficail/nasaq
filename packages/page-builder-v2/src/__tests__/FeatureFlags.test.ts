/**
 * FeatureFlags — TDD tests (RED phase)
 * Imports from non-existent module — guaranteed failure before implementation.
 *
 * Coverage:
 *   isFeatureEnabledForOrg — 8 cases
 *   hashOrgFeature          — 2 cases (consistency + distribution)
 */

import { describe, test, expect } from "vitest";
import {
  isFeatureEnabledForOrg,
  hashOrgFeature,
} from "../utils/feature-flags";

// ── Types matching the feature-flags module ───────────────────────────────

interface FeatureConfig {
  key: string;
  killSwitch: boolean;
  defaultForNewOrgs: boolean;
  rolloutPercentage: number;
}

interface OrgContext {
  id: string;
  isNew?: boolean;
}

type Override = { enabled: boolean } | null;

// ── hashOrgFeature ─────────────────────────────────────────────────────────

describe("hashOrgFeature", () => {
  test("returns a number in [0, 99]", () => {
    const result = hashOrgFeature("page_builder_v2", "org-abc-123");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(99);
  });

  test("same inputs always return same value (deterministic)", () => {
    const a = hashOrgFeature("page_builder_v2", "org-xyz-999");
    const b = hashOrgFeature("page_builder_v2", "org-xyz-999");
    expect(a).toBe(b);
  });
});

// ── isFeatureEnabledForOrg ─────────────────────────────────────────────────

describe("isFeatureEnabledForOrg", () => {
  const feature: FeatureConfig = {
    key: "page_builder_v2",
    killSwitch: false,
    defaultForNewOrgs: false,
    rolloutPercentage: 0,
  };

  test("kill switch returns false regardless of everything else", () => {
    const result = isFeatureEnabledForOrg(
      { ...feature, killSwitch: true, rolloutPercentage: 100 },
      { id: "org-111" },
      { enabled: true }, // override says enabled
    );
    expect(result).toBe(false);
  });

  test("explicit enabled override wins when kill switch is off", () => {
    const result = isFeatureEnabledForOrg(
      { ...feature, rolloutPercentage: 0 }, // rollout = 0%, would normally be disabled
      { id: "org-222" },
      { enabled: true },
    );
    expect(result).toBe(true);
  });

  test("explicit disabled override wins even when rollout = 100%", () => {
    const result = isFeatureEnabledForOrg(
      { ...feature, rolloutPercentage: 100 },
      { id: "org-333" },
      { enabled: false },
    );
    expect(result).toBe(false);
  });

  test("new org default works when no override and isNew=true", () => {
    const result = isFeatureEnabledForOrg(
      { ...feature, defaultForNewOrgs: true, rolloutPercentage: 0 },
      { id: "org-new-444", isNew: true },
      null, // no override
    );
    expect(result).toBe(true);
  });

  test("new org default does NOT apply when isNew=false", () => {
    const result = isFeatureEnabledForOrg(
      { ...feature, defaultForNewOrgs: true, rolloutPercentage: 0 },
      { id: "org-old-555", isNew: false },
      null,
    );
    expect(result).toBe(false);
  });

  test("rollout 0% returns false for all orgs (no override)", () => {
    // Test many orgs — all should be false at 0%
    const orgIds = Array.from({ length: 20 }, (_, i) => `org-roll-${i}`);
    const results = orgIds.map((id) =>
      isFeatureEnabledForOrg({ ...feature, rolloutPercentage: 0 }, { id }, null),
    );
    expect(results.every((r) => r === false)).toBe(true);
  });

  test("rollout 100% returns true for all orgs (no override)", () => {
    const orgIds = Array.from({ length: 20 }, (_, i) => `org-full-${i}`);
    const results = orgIds.map((id) =>
      isFeatureEnabledForOrg({ ...feature, rolloutPercentage: 100 }, { id }, null),
    );
    expect(results.every((r) => r === true)).toBe(true);
  });

  test("rollout 50% gives approximately half enabled across many orgs", () => {
    // With 100 orgs and 50% rollout, should be between 30-70 enabled
    const orgIds = Array.from({ length: 100 }, (_, i) => `org-half-${i.toString().padStart(3, "0")}`);
    const enabled = orgIds.filter((id) =>
      isFeatureEnabledForOrg({ ...feature, rolloutPercentage: 50 }, { id }, null),
    ).length;
    expect(enabled).toBeGreaterThan(30);
    expect(enabled).toBeLessThan(70);
  });
});
