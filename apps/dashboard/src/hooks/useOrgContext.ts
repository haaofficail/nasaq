import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/api";

export interface OrgContext {
  orgId: string;
  businessType: string;
  operatingProfile: string;
  serviceDeliveryModes: string[];
  capabilities: string[];
  dashboardProfile: string;
  vocabulary: Record<string, string>;
  plan: string;
}

interface UseOrgContextResult {
  context: OrgContext | null;
  loading: boolean;
}

// Module-level cache — survives re-renders within a session
let _cachedContext: OrgContext | null = null;

export function useOrgContext(): UseOrgContextResult {
  const [context, setContext] = useState<OrgContext | null>(_cachedContext);
  const [loading, setLoading] = useState(_cachedContext === null);

  useEffect(() => {
    // Invalidate cache if it belongs to a different org than the current session
    const currentOrgId = localStorage.getItem("nasaq_org_id");
    if (_cachedContext && currentOrgId && _cachedContext.orgId !== currentOrgId) {
      _cachedContext = null;
    }
    if (_cachedContext) return; // already fetched this session
    settingsApi
      .context()
      .then((res) => {
        _cachedContext = res.data;
        setContext(res.data);
      })
      .catch(() => {
        // On failure keep null — homepage will use generic_dashboard safely
      })
      .finally(() => setLoading(false));
  }, []);

  return { context, loading };
}

/** Call after org profile update to force a fresh fetch on next render */
export function invalidateOrgContextCache(): void {
  _cachedContext = null;
}
