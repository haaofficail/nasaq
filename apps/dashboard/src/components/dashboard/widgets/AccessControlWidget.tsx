import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { ShieldCheck, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { accessControlApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fmtDate } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-[#f1f5f9] rounded-lg", className)} />;
}

export function AccessControlWidget() {
  const { data: statsData, loading: loadingStats } = useApi(() => accessControlApi.stats(), []);
  const { data: listData,  loading: loadingList  } = useApi(() => accessControlApi.list({ limit: 5 }), []);

  const stats  = statsData?.data;
  const logs: any[] = listData?.data ?? [];
  const loading = loadingStats || loadingList;

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900 text-sm">دخول الأعضاء اليوم</h2>
        <Link
          to="/dashboard/access-control"
          className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium"
        >
          عرض الكل
          <ArrowLeft className="w-3 h-3 rotate-180" />
        </Link>
      </div>

      {/* Today's stats */}
      {!loading && stats && (
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-gray-50 border-b border-gray-50">
          {[
            { label: "اليوم",     value: (stats.todayGranted ?? 0) + (stats.todayDenied ?? 0) },
            { label: "مسموح",    value: stats.todayGranted  ?? 0 },
            { label: "مرفوض",   value: stats.todayDenied   ?? 0 },
          ].map(s => (
            <div key={s.label} className="py-2 px-3 text-center">
              <p className="text-base font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-6 text-center">
            <ShieldCheck className="w-7 h-7 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">لا يوجد سجل دخول اليوم</p>
            <Link to="/dashboard/access-control" className="text-xs text-brand-500 hover:underline mt-1 inline-block">
              تسجيل دخول يدوي
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.slice(0, 5).map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-xl bg-[#f8fafc] flex items-center justify-center shrink-0">
                  {log.granted
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <XCircle      className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {log.customerName ?? "غير معروف"}
                  </p>
                  <p className="text-xs text-gray-400">{fmtDate(log.accessedAt)}</p>
                </div>
                <span className={clsx(
                  "text-xs font-medium px-2 py-0.5 rounded-lg shrink-0",
                  log.granted ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600",
                )}>
                  {log.granted ? "مسموح" : "مرفوض"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
