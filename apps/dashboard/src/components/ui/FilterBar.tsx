import { ReactNode } from "react";
import { clsx } from "clsx";

// ── Filter Tab ───────────────────────────────────────────────────

interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

interface FilterBarProps {
  /** List of filter tabs */
  tabs: FilterTab[];
  /** Currently active tab id */
  activeTab: string;
  /** Called when a tab is selected */
  onTabChange: (id: string) => void;
  /** Additional actions (buttons, etc.) rendered at the end */
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared horizontal filter bar with counted tabs.
 *
 * Usage:
 *   <FilterBar
 *     tabs={[
 *       { id: "all", label: "الكل", count: 42 },
 *       { id: "pending", label: "بانتظار", count: 5 },
 *     ]}
 *     activeTab={status}
 *     onTabChange={setStatus}
 *   />
 */
export function FilterBar({ tabs, activeTab, onTabChange, actions, className }: FilterBarProps) {
  return (
    <div className={clsx(
      "flex items-center gap-1.5 flex-wrap bg-white rounded-2xl border border-gray-100 px-3 py-2",
      className,
    )}>
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-colors",
              active
                ? "bg-brand-50 text-brand-600"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  "text-[11px] rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none",
                  active ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-400",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
      {actions && <div className="mr-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
