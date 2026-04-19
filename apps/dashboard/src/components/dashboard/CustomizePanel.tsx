import { clsx } from "clsx";
import { X, Eye, EyeOff, RotateCcw } from "lucide-react";
import type { DashboardProfile, Role } from "@/lib/dashboardProfiles";
import type { useDashboardPrefs } from "@/hooks/useDashboardPrefs";

type Prefs = ReturnType<typeof useDashboardPrefs>;

interface CustomizePanelProps {
  profile: DashboardProfile;
  currentRole: Role | string;
  prefs: Prefs["prefs"];
  toggleKpi: Prefs["toggleKpi"];
  toggleWidget: Prefs["toggleWidget"];
  resetPrefs: Prefs["resetPrefs"];
  onClose: () => void;
}

export function CustomizePanel({
  profile,
  currentRole,
  prefs,
  toggleKpi,
  toggleWidget,
  resetPrefs,
  onClose,
}: CustomizePanelProps) {
  const visibleKpis = profile.kpis.filter(
    (k) => k.allowedRoles.length === 0 || k.allowedRoles.includes(currentRole as Role)
  );
  const visibleWidgets = profile.widgets.filter(
    (w) => w.allowedRoles.length === 0 || w.allowedRoles.includes(currentRole as Role)
  );

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-sm">تخصيص لوحة التحكم</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={resetPrefs}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إعادة تعيين
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* KPI toggles */}
      {visibleKpis.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 mb-2">المؤشرات</p>
          <div className="space-y-1">
            {visibleKpis.map((kpi) => {
              const hidden = prefs.hiddenKpis.includes(kpi.id);
              return (
                <button
                  key={kpi.id}
                  onClick={() => toggleKpi(kpi.id)}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors",
                    hidden ? "text-gray-400 hover:bg-[#f8fafc]" : "text-gray-700 hover:bg-[#f8fafc]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center", hidden ? "bg-gray-100" : kpi.bg)}>
                      <kpi.icon className={clsx("w-3.5 h-3.5", hidden ? "text-gray-400" : kpi.iconColor)} />
                    </div>
                    <span className={hidden ? "line-through opacity-50" : ""}>{kpi.label}</span>
                  </div>
                  {hidden
                    ? <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                    : <Eye className="w-3.5 h-3.5 text-gray-400" />
                  }
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget toggles */}
      {visibleWidgets.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">الأقسام</p>
          <div className="space-y-1">
            {visibleWidgets.map((widget) => {
              const hidden = prefs.hiddenWidgets.includes(widget.id);
              return (
                <button
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id)}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors",
                    hidden ? "text-gray-400 hover:bg-[#f8fafc]" : "text-gray-700 hover:bg-[#f8fafc]"
                  )}
                >
                  <span className={hidden ? "line-through opacity-50" : ""}>{widget.label}</span>
                  {hidden
                    ? <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                    : <Eye className="w-3.5 h-3.5 text-gray-400" />
                  }
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
