import { useState, useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import type { DashboardCustomization } from "@/lib/dashboardProfiles";

const DEFAULT_PREFS: DashboardCustomization = {
  hiddenKpis: [],
  hiddenWidgets: [],
  widgetOrder: [],
  pinnedActions: [],
};

function loadPrefs(orgId: string): DashboardCustomization {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.DASHBOARD_PREFS_KEY}_${orgId}`);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(orgId: string, prefs: DashboardCustomization): void {
  localStorage.setItem(`${STORAGE_KEYS.DASHBOARD_PREFS_KEY}_${orgId}`, JSON.stringify(prefs));
}

export function useDashboardPrefs(orgId: string) {
  const [prefs, setPrefs] = useState<DashboardCustomization>(() => loadPrefs(orgId));

  const update = useCallback((next: DashboardCustomization) => {
    setPrefs(next);
    savePrefs(orgId, next);
  }, [orgId]);

  const toggleWidget = useCallback((id: string) => {
    setPrefs((prev) => {
      const next = prev.hiddenWidgets.includes(id)
        ? { ...prev, hiddenWidgets: prev.hiddenWidgets.filter((w) => w !== id) }
        : { ...prev, hiddenWidgets: [...prev.hiddenWidgets, id] };
      savePrefs(orgId, next);
      return next;
    });
  }, [orgId]);

  const toggleKpi = useCallback((id: string) => {
    setPrefs((prev) => {
      const next = prev.hiddenKpis.includes(id)
        ? { ...prev, hiddenKpis: prev.hiddenKpis.filter((k) => k !== id) }
        : { ...prev, hiddenKpis: [...prev.hiddenKpis, id] };
      savePrefs(orgId, next);
      return next;
    });
  }, [orgId]);

  const reorderWidgets = useCallback((orderedIds: string[]) => {
    setPrefs((prev) => {
      const next = { ...prev, widgetOrder: orderedIds };
      savePrefs(orgId, next);
      return next;
    });
  }, [orgId]);

  const pinAction = useCallback((id: string) => {
    setPrefs((prev) => {
      const next = prev.pinnedActions.includes(id)
        ? { ...prev, pinnedActions: prev.pinnedActions.filter((a) => a !== id) }
        : { ...prev, pinnedActions: [...prev.pinnedActions, id] };
      savePrefs(orgId, next);
      return next;
    });
  }, [orgId]);

  const resetPrefs = useCallback(() => {
    update(DEFAULT_PREFS);
  }, [update]);

  return { prefs, toggleWidget, toggleKpi, reorderWidgets, pinAction, resetPrefs };
}
