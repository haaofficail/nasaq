import { useState, useEffect, useCallback } from "react";
import { authApi } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────
interface AuthMeData {
  dotPermissions: string[];
  systemRole: string | null;
  type: string;
}

interface UsePermissionResult {
  /** Check if the user has a specific dot-notation permission */
  hasPermission: (perm: string) => boolean;
  /** Check if the user has ALL of the given permissions */
  hasAllPermissions: (perms: string[]) => boolean;
  /** Check if the user has ANY of the given permissions */
  hasAnyPermission: (perms: string[]) => boolean;
  /** True while the permission data is still loading */
  loading: boolean;
  /** The user's system role (owner / manager / provider / employee / reception) */
  systemRole: string | null;
}

// ── Module-level cache (survives re-renders within a session) ────
let _cached: AuthMeData | null = null;
let _fetchPromise: Promise<AuthMeData | null> | null = null;

function fetchMe(): Promise<AuthMeData | null> {
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = authApi
    .me()
    .then((res) => {
      const d = res.data as AuthMeData;
      _cached = d;
      return d;
    })
    .catch(() => null)
    .finally(() => {
      _fetchPromise = null;
    });

  return _fetchPromise;
}

/** Call after role/permission change to force a fresh fetch */
export function invalidatePermissionCache(): void {
  _cached = null;
}

// ── Hook ─────────────────────────────────────────────────────────

export function usePermission(): UsePermissionResult {
  const [data, setData] = useState<AuthMeData | null>(_cached);
  const [loading, setLoading] = useState(_cached === null);

  useEffect(() => {
    if (_cached) {
      setData(_cached);
      setLoading(false);
      return;
    }
    fetchMe().then((d) => {
      if (d) setData(d);
      setLoading(false);
    });
  }, []);

  const isOwner = data?.type === "owner" || data?.systemRole === "owner";

  const hasPermission = useCallback(
    (perm: string) => {
      if (!data) return false;
      if (isOwner) return true;
      return data.dotPermissions.includes(perm);
    },
    [data, isOwner],
  );

  const hasAllPermissions = useCallback(
    (perms: string[]) => perms.every((p) => hasPermission(p)),
    [hasPermission],
  );

  const hasAnyPermission = useCallback(
    (perms: string[]) => perms.length === 0 || perms.some((p) => hasPermission(p)),
    [hasPermission],
  );

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    loading,
    systemRole: data?.systemRole ?? null,
  };
}
