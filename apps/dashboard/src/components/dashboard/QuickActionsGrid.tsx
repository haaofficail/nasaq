import { Link } from "react-router-dom";
import { clsx } from "clsx";
import type { QuickActionConfig, Role } from "@/lib/dashboardProfiles";

interface QuickActionsGridProps {
  actions: QuickActionConfig[];
  currentRole: Role | string;
}

export function QuickActionsGrid({ actions, currentRole }: QuickActionsGridProps) {
  const visible = actions.filter(
    (a) => a.allowedRoles.length === 0 || a.allowedRoles.includes(currentRole as Role)
  );

  if (visible.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 text-sm mb-3">إجراءات سريعة</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {visible.map((action) => (
          <Link
            key={action.id}
            to={action.href}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
          >
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", action.bg)}>
              <action.icon className={clsx("w-4.5 h-4.5", action.text)} />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
