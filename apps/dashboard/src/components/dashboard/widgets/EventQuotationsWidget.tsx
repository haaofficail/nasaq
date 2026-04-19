import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { FileText, CheckCircle2, Clock, Send } from "lucide-react";
import { eventsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const STATUS_LABEL: Record<string, string> = {
  draft:    "مسودة",
  sent:     "مُرسل",
  accepted: "مقبول",
  rejected: "مرفوض",
  expired:  "منتهي",
};

const STATUS_STYLE: Record<string, string> = {
  draft:    "bg-gray-100 text-gray-600",
  sent:     "bg-blue-50 text-blue-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  expired:  "bg-amber-50 text-amber-700",
};

function statusIcon(status: string) {
  if (status === "accepted") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (status === "sent")     return <Send         className="w-3.5 h-3.5 text-blue-500"    />;
  return <Clock className="w-3.5 h-3.5 text-gray-400" />;
}

export function EventQuotationsWidget() {
  const { data, loading } = useApi(() => eventsApi.quotations(), []);
  const quotations: any[] = data?.data ?? [];

  const sentCount     = quotations.filter((q) => q.status === "sent").length;
  const acceptedCount = quotations.filter((q) => q.status === "accepted").length;

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-[6px] border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          عروض الأسعار
        </h3>
        <Link to="/dashboard/event-quotations" className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
          عرض الكل ←
        </Link>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
        <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-lg", sentCount > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500")}>
          {sentCount} مُرسل
        </span>
        <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-lg", acceptedCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
          {acceptedCount} مقبول
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
      ) : quotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="w-8 h-8 text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">لا توجد عروض أسعار بعد</p>
          <Link to="/dashboard/event-quotations" className="mt-2 text-xs text-brand-500 hover:text-brand-700 font-medium">
            إنشاء أول عرض سعر
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {quotations.slice(0, 5).map((q: any) => (
            <div key={q.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#f8fafc]/60 transition-colors">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-blue-50 shrink-0">
                {statusIcon(q.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{q.title || q.clientName || "عرض سعر"}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {q.clientName && q.title ? q.clientName : (q.quotationNumber || "—")}
                  {q.total ? ` · ${Number(q.total).toLocaleString("en-US")} ر.س` : ""}
                </p>
              </div>
              <span className={clsx("text-[10px] font-medium px-2 py-0.5 rounded-lg shrink-0", STATUS_STYLE[q.status] || "bg-gray-100 text-gray-500")}>
                {STATUS_LABEL[q.status] || q.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
