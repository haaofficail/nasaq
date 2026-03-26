import React, { useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";

function AuditTab() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { data, loading } = useApi(
    () => adminApi.auditLog({
      page,
      action: filterAction || undefined,
      targetType: filterType || undefined,
      fromDate: filterFrom || undefined,
      toDate: filterTo || undefined,
    }),
    [page, filterAction, filterType, filterFrom, filterTo]
  );

  const rows: any[] = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  const ACTION_TYPE_OPTIONS = [
    { value: "", label: "كل الأنواع" },
    { value: "org", label: "منشأة" },
    { value: "user", label: "مستخدم" },
    { value: "ticket", label: "تذكرة" },
    { value: "announcement", label: "إعلان" },
    { value: "plan", label: "باقة" },
  ];

  const handleReset = () => {
    setFilterAction(""); setFilterType(""); setFilterFrom(""); setFilterTo(""); setPage(1);
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="سجل المراجعة" sub={`${pagination?.total ?? 0} إجراء موثّق`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          placeholder="بحث بالإجراء..." dir="ltr"
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none flex-1 min-w-40" />
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          {ACTION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
        <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
        {(filterAction || filterType || filterFrom || filterTo) && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={ClipboardList} text="لا يوجد سجل بعد" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">الإجراء</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">النوع</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">الـ ID</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الـ IP</th>
                <th className="text-right px-4 py-3 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.action}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{r.targetType}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-300 hidden lg:table-cell truncate max-w-24">{r.targetId || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 hidden md:table-cell">{r.ip || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleString("ar") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
            السابق
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

export default AuditTab;
