import { useState } from "react";
import { ClipboardList, Search, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { auditLogApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Pagination } from "@/components/ui/Pagination";

const RESOURCES = [
  { value: "", label: "الكل" },
  { value: "booking", label: "حجوزات" },
  { value: "service", label: "خدمات" },
  { value: "customer", label: "عملاء" },
  { value: "invoice", label: "فواتير" },
  { value: "expense", label: "مصروفات" },
  { value: "staff", label: "فريق" },
  { value: "settings", label: "إعدادات" },
];

const ACTION_COLORS: Record<string, string> = {
  created:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  updated:  "bg-blue-50 text-blue-700 border-blue-200",
  deleted:  "bg-red-50 text-red-700 border-red-200",
  approved: "bg-violet-50 text-violet-700 border-violet-200",
  rejected: "bg-amber-50 text-amber-700 border-amber-200",
};
const ACTION_LABELS: Record<string, string> = {
  created: "إنشاء", updated: "تعديل", deleted: "حذف",
  approved: "موافقة", rejected: "رفض",
};

const RESOURCE_LABELS: Record<string, string> = {
  booking: "حجز", service: "خدمة", customer: "عميل",
  invoice: "فاتورة", expense: "مصروف", staff: "موظف", settings: "إعدادات",
};

const PAGE_SIZE = 50;

export function AuditLogPage() {
  const [search, setSearch]     = useState("");
  const [resource, setResource] = useState("");
  const [page, setPage]         = useState(1);

  const { data: res, loading, refetch } = useApi(
    () => auditLogApi.list({ resource: resource || undefined, search: search || undefined, page: String(page), limit: String(PAGE_SIZE) }),
    [resource, page]
  );
  const logs = res?.data || [];

  const filtered = search
    ? logs.filter((l: any) =>
        l.action?.includes(search) || l.resource?.includes(search) ||
        l.userName?.includes(search) || l.resourceId?.includes(search))
    : logs;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleResource = (v: string) => { setResource(v); setPage(1); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-500" /> سجل الأحداث
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">تتبع جميع العمليات والتغييرات في المنصة</p>
        </div>
        <button onClick={refetch}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="بحث بالإجراء أو المورد أو المستخدم..."
            className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {RESOURCES.map(r => (
            <button key={r.value} onClick={() => handleResource(r.value)}
              className={clsx("px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                resource === r.value
                  ? "bg-brand-500 border-brand-500 text-white shadow-sm"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white")}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">لا توجد أحداث مسجّلة</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-right py-3 px-5 text-gray-500 font-medium">الإجراء</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">المورد</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">المعرّف</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">المستخدم</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">IP</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                  <td className="py-3 px-5">
                    <span className={clsx("px-2.5 py-1 rounded-lg border text-xs font-semibold",
                      ACTION_COLORS[log.action] || "bg-gray-50 text-gray-600 border-gray-200")}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 font-medium">
                    {RESOURCE_LABELS[log.resource] || log.resource}
                  </td>
                  <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                    {log.resourceId ? log.resourceId.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{log.userName || <span className="text-gray-300">نظام</span>}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs font-mono">{log.ip || "—"}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString("ar-SA") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={res?.pagination?.total ?? filtered.length}
            onPage={setPage}
            label="سجل"
          />
        )}
      </div>
    </div>
  );
}
