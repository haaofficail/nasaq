import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { integrationsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

// ============================================================
// Types
// ============================================================

interface IntegrationLog {
  id: string;
  created_at: string;
  direction: "inbound" | "outbound";
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  error_message: string | null;
}

// ============================================================
// Helpers
// ============================================================

function statusColor(code: number | null): string {
  if (code == null) return "text-gray-400 bg-gray-50";
  if (code >= 200 && code < 300) return "text-emerald-700 bg-emerald-50";
  if (code >= 400) return "text-red-700 bg-red-50";
  return "text-amber-700 bg-amber-50";
}

function directionBadge(dir: "inbound" | "outbound") {
  return dir === "inbound"
    ? "text-blue-700 bg-blue-50"
    : "text-gray-600 bg-gray-100";
}

function directionLabel(dir: "inbound" | "outbound") {
  return dir === "inbound" ? "وارد" : "صادر";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ============================================================
// Skeleton
// ============================================================

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-xl" />
      ))}
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

const PAGE_SIZE = 25;

export default function IntegrationLogsPage() {
  const { id } = useParams<{ id: string }>();

  const [direction, setDirection] = useState<"" | "inbound" | "outbound">("");
  const [status, setStatus] = useState<"" | "success" | "error">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const offset = page * PAGE_SIZE;

  const params: Record<string, string> = {
    limit: String(PAGE_SIZE),
    offset: String(offset),
  };
  if (direction) params.direction = direction;
  if (status) params.status = status;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data: res, loading, error, refetch } = useApi(
    () => integrationsApi.logs(id!, { limit: PAGE_SIZE, offset }),
    [id, direction, status, dateFrom, dateTo, page]
  );

  const logs: IntegrationLog[] = (res as any)?.data ?? [];
  const total: number = (res as any)?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleFilterChange = () => {
    setPage(0);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link
          to="/dashboard/integrations"
          className="hover:text-brand-500 flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4" />
          التكاملات
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">سجل الطلبات</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">سجل التكامل</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            جميع الطلبات الواردة والصادرة لهذا التكامل
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          تصفية
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Direction */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              الاتجاه
            </label>
            <select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value as typeof direction);
                handleFilterChange();
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400 bg-white min-w-[130px]"
            >
              <option value="">الكل</option>
              <option value="inbound">وارد</option>
              <option value="outbound">صادر</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              الحالة
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                handleFilterChange();
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400 bg-white min-w-[130px]"
            >
              <option value="">الكل</option>
              <option value="success">ناجح (2xx)</option>
              <option value="error">خطأ (4xx/5xx)</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              من تاريخ
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                handleFilterChange();
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                handleFilterChange();
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Reset */}
          {(direction || status || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDirection("");
                setStatus("");
                setDateFrom("");
                setDateTo("");
                setPage(0);
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Loading */}
        {loading && (
          <div className="p-5">
            <TableSkeleton />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-500 font-medium">
              {"خطأ في تحميل السجلات"}
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm text-brand-500 hover:underline"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Clock className="w-10 h-10 text-gray-300" />
            <p className="text-sm text-gray-400">لا توجد سجلات بعد</p>
            <p className="text-xs text-gray-300">
              ستظهر هنا جميع الطلبات الواردة والصادرة لهذا التكامل
            </p>
          </div>
        )}

        {/* Data */}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">
                    التاريخ
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">
                    الاتجاه
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">
                    الـ Endpoint
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">
                    الطريقة
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">
                    كود الحالة
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">
                    المدة (ms)
                  </th>
                  <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">
                    رسالة الخطأ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const isSuccess =
                    log.status_code != null &&
                    log.status_code >= 200 &&
                    log.status_code < 300;
                  const isError =
                    log.status_code != null && log.status_code >= 400;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(log.created_at)}
                      </td>

                      {/* Direction */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium",
                            directionBadge(log.direction)
                          )}
                        >
                          {log.direction === "inbound" ? (
                            <ArrowRight className="w-3 h-3" />
                          ) : (
                            <ArrowLeft className="w-3 h-3" />
                          )}
                          {directionLabel(log.direction)}
                        </span>
                      </td>

                      {/* Endpoint */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <span
                          className="text-xs text-gray-600 font-mono truncate block"
                          title={log.endpoint ?? ""}
                        >
                          {log.endpoint ?? "—"}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.method ? (
                          <span className="text-xs font-mono font-semibold text-gray-700 uppercase">
                            {log.method}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Status code */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.status_code != null ? (
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-semibold",
                              statusColor(log.status_code)
                            )}
                          >
                            {isSuccess && (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {isError && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {log.status_code}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.duration_ms != null ? (
                          <span className="text-xs text-gray-500">
                            {log.duration_ms.toLocaleString("en-US")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Error message */}
                      <td className="px-4 py-3 max-w-[220px]">
                        {log.error_message ? (
                          <span
                            className="text-xs text-red-500 truncate block"
                            title={log.error_message}
                          >
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {total.toLocaleString("en-US")} سجل إجمالي — صفحة {page + 1} من{" "}
              {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
                السابق
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                التالي
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
