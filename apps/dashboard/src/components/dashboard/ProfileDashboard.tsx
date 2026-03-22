import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Plus, Settings2 } from "lucide-react";
import type { DashboardProfile, Role, WidgetConfig } from "@/lib/dashboardProfiles";
import { useDashboardPrefs } from "@/hooks/useDashboardPrefs";
import { KPICard } from "./KPICard";
import { QuickActionsGrid } from "./QuickActionsGrid";
import { CustomizePanel } from "./CustomizePanel";

const sizeClass: Record<WidgetConfig["size"], string> = {
  full:       "col-span-1 lg:col-span-6",
  "two-thirds": "col-span-1 lg:col-span-4",
  half:       "col-span-1 lg:col-span-3",
  third:      "col-span-1 lg:col-span-2",
};

interface ProfileDashboardProps {
  profile: DashboardProfile;
  user: { name?: string; role?: string; orgId?: string };
}

export function ProfileDashboard({ profile, user }: ProfileDashboardProps) {
  const navigate = useNavigate();
  const currentRole = (user.role || "") as Role;
  const orgId = user.orgId || "default";
  const [showCustomize, setShowCustomize] = useState(false);

  const { prefs, toggleWidget, toggleKpi, reorderWidgets, pinAction, resetPrefs } = useDashboardPrefs(orgId);

  // Role-filtered KPIs
  const visibleKpis = profile.kpis.filter(
    (k) => k.allowedRoles.length === 0 || k.allowedRoles.includes(currentRole)
  ).filter((k) => !prefs.hiddenKpis.includes(k.id));

  // Role-filtered widgets, apply prefs order then hide
  const roleFilteredWidgets = profile.widgets.filter(
    (w) => w.allowedRoles.length === 0 || w.allowedRoles.includes(currentRole)
  );

  const orderedWidgets = (() => {
    if (prefs.widgetOrder.length === 0) return roleFilteredWidgets;
    const byId = Object.fromEntries(roleFilteredWidgets.map((w) => [w.id, w]));
    const ordered = prefs.widgetOrder.map((id) => byId[id]).filter(Boolean) as WidgetConfig[];
    const unordered = roleFilteredWidgets.filter((w) => !prefs.widgetOrder.includes(w.id));
    return [...ordered, ...unordered];
  })();

  const renderedWidgets = orderedWidgets.filter((w) => !prefs.hiddenWidgets.includes(w.id));

  return (
    <div className="space-y-5">
      {/* Welcome row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            مرحباً{user.name ? ` ${user.name}` : ""} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomize((v) => !v)}
            className={clsx(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              showCustomize
                ? "bg-brand-50 text-brand-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Settings2 className="w-4 h-4" />
            تخصيص
          </button>
          <button
            onClick={() => navigate(profile.primaryAction.href)}
            className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            {profile.primaryAction.label}
          </button>
        </div>
      </div>

      {/* Customize panel */}
      {showCustomize && (
        <CustomizePanel
          profile={profile}
          currentRole={currentRole}
          prefs={prefs}
          toggleKpi={toggleKpi}
          toggleWidget={toggleWidget}
          resetPrefs={resetPrefs}
          onClose={() => setShowCustomize(false)}
        />
      )}

      {/* KPI cards */}
      {visibleKpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleKpis.map((kpi) => (
            <KPICard key={kpi.id} config={kpi} />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <QuickActionsGrid actions={profile.quickActions} currentRole={currentRole} />

      {/* Widgets */}
      {renderedWidgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {renderedWidgets.map((widget) => {
            const Widget = widget.component;
            return (
              <div key={widget.id} className={sizeClass[widget.size]}>
                <Widget />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
