/**
 * useCapability — client-side feature flag check.
 *
 * Fetches /settings/features/me once per session and caches the result.
 * Returns `isEnabled(key)` for any capability key.
 *
 * Usage:
 *   const { isEnabled, loading } = useCapability();
 *   if (!isEnabled("page_builder_v2")) return null;
 */
import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/api";

// Module-level cache — survives re-renders within a session
let _cachedFeatures: Record<string, boolean> | null = null;
let _cacheOrgId: string | null = null;

export interface UseCapabilityResult {
  isEnabled: (key: string) => boolean;
  features: Record<string, boolean>;
  loading: boolean;
}

export function useCapability(): UseCapabilityResult {
  const currentOrgId = localStorage.getItem("nasaq_org_id");

  // Invalidate cache on org switch
  if (_cacheOrgId && currentOrgId && _cacheOrgId !== currentOrgId) {
    _cachedFeatures = null;
    _cacheOrgId = null;
  }

  const [features, setFeatures] = useState<Record<string, boolean>>(
    _cachedFeatures ?? {},
  );
  const [loading, setLoading] = useState(_cachedFeatures === null);

  useEffect(() => {
    if (_cachedFeatures !== null) return;
    settingsApi
      .featuresMe()
      .then((res) => {
        _cachedFeatures = res.data.features;
        _cacheOrgId = currentOrgId;
        setFeatures(res.data.features);
      })
      .catch(() => {
        // On failure return empty — feature checks default to false
        _cachedFeatures = {};
      })
      .finally(() => setLoading(false));
  }, []);

  return {
    features,
    loading,
    isEnabled: (key: string) => features[key] === true,
  };
}

/** Call after capability changes to force a fresh fetch on next render */
export function invalidateCapabilityCache(): void {
  _cachedFeatures = null;
  _cacheOrgId = null;
}
