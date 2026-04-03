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
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
      {visible.map((action) => {
        const inner = (
          <>
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              "group-hover:scale-110 transition-transform duration-200",
              action.bg
            )}>
              <action.icon className={clsx("w-5 h-5", action.text)} />
            </div>
            <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">
              {action.label}
            </span>
          </>
        );

        const cls = clsx(
          "group flex flex-col items-center gap-2.5 py-4 px-3 bg-white rounded-2xl",
          "border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md",
          "hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        );

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
