import { clsx } from "clsx";
import { Users, CheckCircle2, XCircle, Clock } from "lucide-react";
import { attendanceEngineApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export function StaffAvailabilityWidget() {
  const { data, loading } = useApi(() => attendanceEngineApi.summary(), []);
  const summary = data?.data || {};

  const present = summary.present ?? 0;
  const absent  = summary.absent  ?? 0;
  const late    = summary.late    ?? 0;
  const total   = summary.total   ?? ((present + absent + late) || 1);

  const rows = [
    { label: "حاضر",   value: present, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-400" },
    { label: "غائب",   value: absent,  icon: XCircle,      color: "text-red-500",     bg: "bg-red-50",     bar: "bg-red-400" },
    { label: "متأخر",  value: late,    icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50",   bar: "bg-amber-400" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
          <Users className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">حضور الموظفين</h2>
          <p className="text-xs text-gray-400">اليوم · {loading ? "—" : total} موظف</p>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <row.icon className={clsx("w-3.5 h-3.5", row.color)} />
                  <span className="text-xs text-gray-600">{row.label}</span>
                </div>
                <span className="text-xs font-medium text-gray-700">{loading ? "—" : row.value}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx("h-full rounded-full transition-all duration-500", row.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
