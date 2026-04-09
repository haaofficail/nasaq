import { useState } from "react";
import { Receipt, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";
import { clsx } from "clsx";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  issued: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  partially_paid: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-600",
  refunded: "bg-purple-100 text-purple-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  issued: "صادرة",
  paid: "مدفوعة",
  partially_paid: "مدفوعة جزئيا",
  overdue: "متأخرة",
  cancelled: "ملغاة",
  refunded: "مستردة",
};

const STATUSES = ["draft", "issued", "paid", "partially_paid", "overdue", "cancelled", "refunded"] as const;

function InvoicesAdminTab() {
  const [page, setPage]     = useState(1);
  const [orgId, setOrgId]   = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ]           = useState("");

  const { data, loading } = useApi(
    () => adminApi.invoices({ orgId: orgId || undefined, status: status || undefined, q: q || undefined, page, limit: 25 }),
    [orgId, status, q, page]
  );

  const rows: any[]   = data?.data ?? [];
  const pagination    = data?.pagination;
  const totalPages    = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setStatus(""); setQ(""); setPage(1); };

  return (
    <div className="space-y-5">
      <SectionHeader title="الفواتير" sub={`${pagination?.total ?? 0} فاتورة عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="بحث برقم الفاتورة أو اسم المشتري..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none flex-1 min-w-40" />
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الحالات</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {(orgId || status || q) && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={Receipt} text="لا توجد فواتير" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">رقم الفاتورة</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">المشتري</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">الإجمالي</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">المدفوع</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">المصدر</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">تاريخ الإصدار</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono" dir="ltr">{r.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{r.buyerName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg", STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600")}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell tabular-nums">
                    {r.totalAmount ? `${Number(r.totalAmount).toLocaleString("en-US")} ر.س` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell tabular-nums">
                    {r.paidAmount ? `${Number(r.paidAmount).toLocaleString("en-US")} ر.س` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{r.sourceType ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {r.issueDate ? new Date(r.issueDate).toLocaleDateString("ar") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">السابق</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">التالي</button>
        </div>
      )}
    </div>
  );
}

export default InvoicesAdminTab;
