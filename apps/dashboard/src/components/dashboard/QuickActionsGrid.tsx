import { Link } from "react-router-dom";
import { clsx } from "clsx";
import type { QuickActionConfig, QuickActionModal, Role } from "@/lib/dashboardProfiles";

interface QuickActionsGridProps {
  actions: QuickActionConfig[];
  currentRole: Role | string;
  onModalOpen?: (modal: QuickActionModal) => void;
}

export function QuickActionsGrid({ actions, currentRole, onModalOpen }: QuickActionsGridProps) {
  const visible = actions.filter(
    (a) => a.allowedRoles.length === 0 || a.allowedRoles.includes(currentRole as Role)
  );

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((action) => {
        const inner = (
          <>
            <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", action.bg)}>
              <action.icon className={clsx("w-3.5 h-3.5", action.text)} />
            </div>
            <span className="text-xs font-medium text-gray-700">{action.label}</span>
          </>
        );

        const cls = "flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer shadow-sm";

        if (action.modal && onModalOpen) {
          return (
            <button key={action.id} type="button" onClick={() => onModalOpen(action.modal!)} className={cls}>
              {inner}
            </button>
          );
        }

        return (
          <Link key={action.id} to={action.href} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
