import React, { useState } from "react";
import { Bell, Briefcase } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { StatusBadge, PlanBadge, SectionHeader, Spinner, Empty, BUSINESS_TYPES } from "./shared";

function ClientsTab() {
  const { data: staffData } = useApi(() => adminApi.staff(), []);
  const { data: clientsData, loading } = useApi(() => adminApi.clients(), []);
  const [managerFilter, setManagerFilter] = useState("");

  const staffList: any[] = (staffData?.data || []).filter((s: any) => s.nasaqRole === "account_manager" || s.isSuperAdmin);
  const allClients: any[] = clientsData?.data || [];
  const filtered = managerFilter ? allClients.filter((o: any) => o.accountManagerId === managerFilter) : allClients;

  // Renewals soon (next 30 days)
  const soon = allClients.filter((o: any) => {
    const d = o.trialEndsAt || o.subscriptionEndsAt;
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  return (
    <div className="space-y-5">
      <SectionHeader title="إدارة الحسابات" sub="عملاء معيّن لهم مدراء حسابات" />

      {soon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">{soon.length} منشأة على وشك انتهاء اشتراكها خلال 30 يوماً</p>
          </div>
          <div className="space-y-1.5">
            {soon.map((o: any) => (
              <div key={o.id} className="flex items-center gap-2 text-xs text-amber-700">
                <span className="font-medium">{o.name}</span>
                <span>·</span>
                <span>{new Date(o.trialEndsAt || o.subscriptionEndsAt).toLocaleDateString("ar")}</span>
                <StatusBadge status={o.subscriptionStatus} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل مدراء الحسابات</option>
          {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon={Briefcase} text="لا توجد منشآت معيّنة" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">مدير الحساب</th>
                <th className="text-right px-4 py-3 font-semibold">الباقة</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">انتهاء الاشتراك</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o: any) => {
                const mgr = staffList.find((s: any) => s.id === o.accountManagerId);
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">{o.name[0]}</div>
                        <div>
                          <p className="font-medium text-gray-900">{o.name}</p>
                          <p className="text-[10px] text-gray-400">{BUSINESS_TYPES[o.businessType] || o.businessType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{mgr?.name || "—"}</td>
                    <td className="px-4 py-3"><PlanBadge plan={o.plan} /></td>
                    <td className="px-4 py-3"><StatusBadge status={o.subscriptionStatus} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {o.subscriptionEndsAt ? new Date(o.subscriptionEndsAt).toLocaleDateString("ar") : o.trialEndsAt ? new Date(o.trialEndsAt).toLocaleDateString("ar") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ClientsTab;
