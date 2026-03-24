import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { ClipboardList, AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";

const inspectionsApi = {
  list: (params?: { type?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    return api.get<{ data: any[] }>(`/inspections?${q}`);
  },
};

export function InspectionsPage() {
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, loading } = useApi(() => inspectionsApi.list(typeFilter !== "all" ? { type: typeFilter } : undefined), [typeFilter]);
  const inspections: any[] = data?.data || [];

  const withDamage = inspections.filter(i => i.damage_found).length;
  const clean = inspections.filter(i => !i.damage_found).length;
  const totalDamage = inspections.reduce((s, i) => s + parseFloat(i.damage_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-brand-500" /> سجلات التفتيش
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{inspections.length} تفتيش</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "إجمالي التفتيش", value: inspections.length, icon: ClipboardList, color: "text-brand-500 bg-brand-50" },
          { label: "بدون أضرار", value: clean, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "بها أضرار", value: withDamage, icon: AlertTriangle, color: "text-red-500 bg-red-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {totalDamage > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">إجمالي قيمة الأضرار</p>
            <p className="text-xs text-red-500">{totalDamage.toFixed(0)} ر.س</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([["all","الكل"],["checkin","تسجيل دخول"],["checkout","تسجيل خروج"]] as [string,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setTypeFilter(v)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", typeFilter === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <div className="space-y-2">
          {inspections.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد سجلات تفتيش</p>
            </div>
          ) : (
            inspections.map((ins: any) => (
              <div key={ins.id} className={clsx("bg-white rounded-2xl border px-5 py-4", ins.damage_found ? "border-red-100" : "border-gray-100")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={clsx("px-2 py-0.5 rounded-lg text-xs font-medium", ins.type === "checkin" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700")}>
                        {ins.type === "checkin" ? "دخول" : "خروج"}
                      </span>
                      {ins.damage_found && <span className="flex items-center gap-1 text-xs text-red-500"><AlertTriangle className="w-3 h-3" /> أضرار</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{new Date(ins.created_at).toLocaleDateString("ar-SA")}</p>
                    {ins.damage_notes && <p className="text-xs text-red-500 mt-0.5">{ins.damage_notes}</p>}
                  </div>
                  <div className="text-left">
                    {ins.damage_amount && parseFloat(ins.damage_amount) > 0 && (
                      <p className="font-semibold text-red-600 tabular-nums">{parseFloat(ins.damage_amount).toFixed(0)} ر.س</p>
                    )}
                    <p className={clsx("flex items-center gap-1 text-xs font-medium", ins.damage_found ? "text-red-500" : "text-green-600")}>
                      {ins.damage_found ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {ins.damage_found ? "يوجد ضرر" : "سليم"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
