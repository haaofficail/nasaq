import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { adminApi } from "@/lib/api";
import { BarChart3, Loader2 } from "lucide-react";

interface QuotaRow {
  id: string;
  orgId: string;
  orgName: string | null;
  metricKey: string;
  period: string;
  usedCount: number;
  updatedAt: string;
}

const METRIC_LABELS: Record<string, string> = {
  users:           "المستخدمون",
  locations:       "الفروع",
  services:        "الخدمات",
  invoices_month:  "الفواتير/شهر",
  bookings_month:  "الحجوزات/شهر",
  orders_month:    "الطلبات/شهر",
};

export default function QuotaUsageTab() {
  const [orgId,  setOrgId]  = useState("");
  const [metric, setMetric] = useState("");

  const { data, loading, error } = useApi(
    () => adminApi.quotaUsage({ orgId: orgId || undefined, metric: metric || undefined }),
    [orgId, metric],
  );

  const rows: QuotaRow[] = (data as any)?.data ?? [];
  const pagination       = (data as any)?.pagination;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">استخدام الحصص</h3>
        <p className="text-sm text-gray-500 mt-0.5">مراقبة الاستخدام الفعلي لكل منشأة</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={orgId}
          onChange={e => setOrgId(e.target.value)}
          placeholder="تصفية بـ orgId"
          dir="ltr"
          className="flex-1 min-w-48 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 font-mono"
        />
        <select
          value={metric}
          onChange={e => setMetric(e.target.value)}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 bg-white"
        >
          <option value="">كل المقاييس</option>
          {Object.entries(METRIC_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد بيانات استخدام</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-right">
                  <th className="px-4 py-3 font-medium text-gray-600">المنشأة</th>
                  <th className="px-4 py-3 font-medium text-gray-600">المقياس</th>
                  <th className="px-4 py-3 font-medium text-gray-600">الفترة</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-center">الاستخدام</th>
                  <th className="px-4 py-3 font-medium text-gray-600">آخر تحديث</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.orgName ?? "—"}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{row.orgId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {METRIC_LABELS[row.metricKey] ?? row.metricKey}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{row.period}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-brand-600 text-base">{row.usedCount.toLocaleString("ar")}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(row.updatedAt).toLocaleString("ar-SA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && (
            <p className="text-xs text-gray-400 text-center">
              {pagination.total.toLocaleString("ar")} سجل — صفحة {pagination.page} من {pagination.totalPages}
            </p>
          )}
        </>
      )}
    </div>
  );
}
