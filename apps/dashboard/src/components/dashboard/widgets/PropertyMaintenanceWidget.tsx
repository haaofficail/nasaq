import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { Wrench, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { propertyApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const STATUS_LABEL: Record<string, string> = {
  pending:     "معلق",
  in_progress: "قيد التنفيذ",
  completed:   "مكتمل",
  cancelled:   "ملغي",
};

const STATUS_STYLE: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed:   "bg-emerald-50 text-emerald-700",
  cancelled:   "bg-gray-100 text-gray-500",
};

function statusIcon(status: string) {
  if (status === "completed")   return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (status === "in_progress") return <Clock        className="w-3.5 h-3.5 text-blue-500"    />;
  return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
}

export function PropertyMaintenanceWidget() {
  const { data, loading } = useApi(
    () => propertyApi.maintenance.list({ limit: "6" }),
    []
  );
  const requests: any[] = data?.data ?? [];
  const pendingCount     = requests.filter((r) => r.status === "pending").length;
  const inProgressCount  = requests.filter((r) => r.status === "in_progress").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-500" />
          طلبات الصيانة
        </h3>
        <Link to="/dashboard/property/maintenance" className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
          عرض الكل ←
        </Link>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
        <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-lg", pendingCount > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500")}>
          {pendingCount} معلق
        </span>
        <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-lg", inProgressCount > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500")}>
          {inProgressCount} قيد التنفيذ
        </span>
      </div>

      {loading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
              <div className="w-7 h-7 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-200 mb-2" />
          <p className="text-sm text-gray-400">لا توجد طلبات صيانة نشطة</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {requests.slice(0, 5).map((req: any) => (
            <div key={req.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-amber-50 shrink-0">
                {statusIcon(req.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{req.title || "طلب صيانة"}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{req.propertyName || req.unitName || "—"}</p>
              </div>
              <span className={clsx("text-[10px] font-medium px-2 py-0.5 rounded-lg shrink-0", STATUS_STYLE[req.status] || "bg-gray-100 text-gray-500")}>
                {STATUS_LABEL[req.status] || req.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
