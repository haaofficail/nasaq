import React from "react";
import { Building2, CheckCircle, RefreshCw, ShieldAlert, Users, Ticket, Plus, Megaphone, Headphones, Activity } from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, PlanBadge } from "./shared";

function OverviewTab({ onNav }: { onNav: (section: string) => void }) {
  const { data, loading, refetch } = useApi(() => adminApi.stats(), []);
  const stats = data?.data;

  const kpis = [
    { label: "إجمالي المنشآت", value: stats?.totalOrgs ?? 0, icon: Building2, bg: "bg-blue-50", color: "text-blue-500" },
    { label: "منشآت نشطة", value: stats?.activeOrgs ?? 0, icon: CheckCircle, bg: "bg-emerald-50", color: "text-emerald-600" },
    { label: "في التجربة", value: stats?.trialOrgs ?? 0, icon: RefreshCw, bg: "bg-purple-50", color: "text-purple-600" },
    { label: "موقوفة", value: stats?.suspendedOrgs ?? 0, icon: ShieldAlert, bg: "bg-red-50", color: "text-red-500" },
    { label: "إجمالي المستخدمين", value: stats?.totalUsers ?? 0, icon: Users, bg: "bg-orange-50", color: "text-orange-500" },
    { label: "تذاكر دعم مفتوحة", value: stats?.openTickets ?? 0, icon: Ticket, bg: "bg-amber-50", color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="نظرة عامة" sub="ملخص المنصة في الوقت الفعلي"
        action={
          <button onClick={refetch} className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", k.bg)}>
              <k.icon className={clsx("w-5 h-5", k.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{loading ? "—" : k.value.toLocaleString("ar")}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      {!loading && (stats?.planDistribution?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">توزيع الباقات</h3>
          <div className="space-y-4">
            {stats!.planDistribution.map((p: any) => {
              const pct = Math.round((p.count / (stats!.totalOrgs || 1)) * 100);
              const barColors: Record<string, string> = { enterprise: "#b45309", pro: "#7c3aed", advanced: "#2563eb", basic: "#94a3b8" };
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <PlanBadge plan={p.plan} />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColors[p.plan] || "#94a3b8" }} />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-6 text-left tabular-nums">{p.count}</span>
                  <span className="text-xs text-gray-400 w-9 text-left">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إضافة منشأة", icon: Plus, section: "orgs", cls: "bg-brand-500 text-white hover:bg-brand-600" },
          { label: "إعلان جديد", icon: Megaphone, section: "announce", cls: "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50" },
          { label: "تذاكر الدعم", icon: Headphones, section: "support", cls: "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50" },
          { label: "صحة النظام", icon: Activity, section: "system", cls: "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50" },
        ].map((a) => (
          <button key={a.label} onClick={() => onNav(a.section)}
            className={clsx("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors", a.cls)}>
            <a.icon className="w-4 h-4 shrink-0" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default OverviewTab;
