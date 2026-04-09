import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import { ShieldX } from "lucide-react";

interface ProtectedRouteProps {
  /** Single permission required to access this route */
  permission?: string;
  /** All listed permissions are required (AND logic) */
  permissions?: string[];
  /** At least one of these permissions is required (OR logic) */
  anyPermission?: string[];
  /** Redirect to this path when denied (default: show forbidden page) */
  redirectTo?: string;
  children: ReactNode;
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">ليس لديك صلاحية</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        لا تملك الصلاحيات الكافية للوصول لهذه الصفحة. تواصل مع مدير المنشأة لتعديل صلاحياتك.
      </p>
    </div>
  );
}

/**
 * Wrap a route element to enforce permission checks.
 * Shows a loading spinner while permissions load, then either renders children or a forbidden page.
 *
 * Usage (in App.tsx):
 *   <Route path="finance" element={
 *     <ProtectedRoute permission="finance.invoices"><FinancePage /></ProtectedRoute>
 *   } />
 */
export function ProtectedRoute({
  permission,
  permissions,
  anyPermission,
  redirectTo,
  children,
}: ProtectedRouteProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, loading } = usePermission();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-[#5b9bd5] border-t-transparent animate-spin" />
      </div>
    );
  }

  let allowed = true;

  if (permission) {
    allowed = hasPermission(permission);
  }
  if (allowed && permissions && permissions.length > 0) {
    allowed = hasAllPermissions(permissions);
  }
  if (allowed && anyPermission && anyPermission.length > 0) {
    allowed = hasAnyPermission(anyPermission);
  }

  if (!allowed) {
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
