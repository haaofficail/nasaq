import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Plus, Settings2, CreditCard, Hash, Clock } from "lucide-react";
import type { DashboardProfile, Role, WidgetConfig } from "@/lib/dashboardProfiles";
import { useDashboardPrefs } from "@/hooks/useDashboardPrefs";
import { passesContextGate } from "@/lib/widgetRegistry";
import type { OrgContext } from "@/hooks/useOrgContext";
import { useApi } from "@/hooks/useApi";
import { orgSubscriptionApi } from "@/lib/api";
import { PLAN_MAP } from "@/lib/constants";
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
  context?: OrgContext;
}

export function ProfileDashboard({ profile, user, context }: ProfileDashboardProps) {
  const navigate = useNavigate();
  const currentRole = (user.role || "") as Role;
  const orgId = user.orgId || "default";
  const [showCustomize, setShowCustomize] = useState(false);

  const { data: subRes } = useApi(() => orgSubscriptionApi.get(), []);
  const sub = subRes?.data;

  const { prefs, toggleWidget, toggleKpi, reorderWidgets, pinAction, resetPrefs } = useDashboardPrefs(orgId);

  // Role-filtered KPIs
  const visibleKpis = profile.kpis.filter(
    (k) => k.allowedRoles.length === 0 || k.allowedRoles.includes(currentRole)
  ).filter((k) => !prefs.hiddenKpis.includes(k.id));

  // Role-filtered widgets, then context-gated, then apply prefs order + hide
  const roleFilteredWidgets = profile.widgets
    .filter((w) => w.allowedRoles.length === 0 || w.allowedRoles.includes(currentRole))
    .filter((w) =>
      !context ||
      passesContextGate(w.id, {
        businessType: context.businessType,
        operatingProfile: context.operatingProfile,
        capabilities: context.capabilities,
      })
    );

  const orderedWidgets = (() => {
    if (prefs.widgetOrder.length === 0) return roleFilteredWidgets;
    const byId = Object.fromEntries(roleFilteredWidgets.map((w) => [w.id, w]));
    const ordered = prefs.widgetOrder.map((id) => byId[id]).filter(Boolean) as WidgetConfig[];
    const unordered = roleFilteredWidgets.filter((w) => !prefs.widgetOrder.includes(w.id));
    return [...ordered, ...unordered];
  })();

  const renderedWidgets = orderedWidgets.filter((w) => !prefs.hiddenWidgets.includes(w.id));

  const daysLeft = sub?.daysRemaining ?? null;
  const planName = PLAN_MAP[sub?.plan ?? ""]?.name ?? sub?.plan ?? null;
  const orgCode  = context?.orgCode ?? null;

  return (
    <div className="space-y-5">

      {/* ── Subscription info strip ── */}
      {(planName || orgCode || daysLeft !== null) && (
        <Link
          to="/dashboard/subscription"
          className="flex items-center gap-4 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-200 hover:bg-brand-50/40 transition-colors group"
        >
          {/* Plan */}
          {planName && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 group-hover:text-brand-700">
              <CreditCard className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              {planName}
            </span>
          )}

          {/* Divider */}
          {planName && (orgCode || daysLeft !== null) && (
            <span className="h-3.5 w-px bg-gray-200 shrink-0" />
          )}

          {/* Org code */}
          {orgCode && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 group-hover:text-brand-600 font-mono tracking-wider" dir="ltr">
              <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {orgCode}
            </span>
          )}

          {/* Divider */}
          {orgCode && daysLeft !== null && (
            <span className="h-3.5 w-px bg-gray-200 shrink-0" />
          )}

          {/* Days remaining */}
          {daysLeft !== null && (
            <span className={clsx(
              "flex items-center gap-1.5 text-xs font-medium",
              daysLeft <= 7  ? "text-red-500"    :
              daysLeft <= 30 ? "text-amber-600"  : "text-emerald-600"
            )}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {daysLeft} يوم متبقي
            </span>
          )}

          <span className="mr-auto text-xs text-gray-300 group-hover:text-brand-400 transition-colors">←</span>
        </Link>
      )}

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
