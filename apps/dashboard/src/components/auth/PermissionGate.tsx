import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";

interface PermissionGateProps {
  /** Single permission or array of permissions */
  permission?: string;
  /** All listed permissions are required (AND logic) */
  permissions?: string[];
  /** At least one of these permissions is required (OR logic) */
  anyPermission?: string[];
  /** Content to show when permission is denied (default: nothing) */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally render children based on the current user's permissions.
 *
 * Usage:
 *   <PermissionGate permission="bookings.create">
 *     <Button>إضافة حجز</Button>
 *   </PermissionGate>
 *
 *   <PermissionGate anyPermission={["finance.invoices", "finance.reports"]}>
 *     <FinanceWidget />
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  anyPermission,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, loading } = usePermission();

  // While loading, hide the content to prevent flash-of-forbidden
  if (loading) return null;

  // Single permission check
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // All permissions required
  if (permissions && permissions.length > 0 && !hasAllPermissions(permissions)) {
    return <>{fallback}</>;
  }

  // Any permission required
  if (anyPermission && anyPermission.length > 0 && !hasAnyPermission(anyPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
