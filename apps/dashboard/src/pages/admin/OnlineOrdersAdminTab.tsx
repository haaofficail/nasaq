import { useState } from "react";
import { ShoppingCart, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";
import { clsx } from "clsx";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-indigo-100 text-indigo-700",
  ready: "bg-teal-100 text-teal-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  out_for_delivery: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const STATUSES = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"] as const;

function OnlineOrdersAdminTab() {
  const [page, setPage]     = useState(1);
  const [orgId, setOrgId]   = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ]           = useState("");

  const { data, loading } = useApi(
    () => adminApi.onlineOrders({ orgId: orgId || undefined, status: status || undefined, q: q || undefined, page, limit: 25 }),
    [orgId, status, q, page]
  );

  const rows: any[]   = data?.data ?? [];
  const pagination    = data?.pagination;
  const totalPages    = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setStatus(""); setQ(""); setPage(1); };

  return (
    <div className="space-y-5">
      <SectionHeader title="الطلبات الإلكترونية" sub={`${pagination?.total ?? 0} طلب عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="بحث باسم العميل..."
          className="bg-white border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none flex-1 min-w-40" />
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-white border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الحالات</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {(orgId || status || q) && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-[#eef2f6] rounded-xl hover:bg-[#f8fafc]">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={ShoppingCart} text="لا توجد طلبات إلكترونية" /> : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eef2f6] bg-[#f8fafc] text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">رقم الطلب</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">العميل</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">الإجمالي</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">طريقة التوصيل</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-[#f8fafc] last:border-0">
                  <td className="px-[10px] py-[6px] text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                  <td className="px-[10px] py-[6px] text-sm text-gray-900 font-mono" dir="ltr">{r.orderNumber}</td>
                  <td className="px-[10px] py-[6px] text-sm text-gray-700 hidden md:table-cell">{r.customerName ?? "—"}</td>
                  <td className="px-[10px] py-[6px]">
                    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg", STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600")}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-[10px] py-[6px] text-xs text-gray-500 hidden lg:table-cell tabular-nums">
                    {r.totalAmount ? `${Number(r.totalAmount).toLocaleString("en-US")} ر.س` : "—"}
                  </td>
                  <td className="px-[10px] py-[6px] text-xs text-gray-500 hidden md:table-cell">{r.deliveryMethod ?? "—"}</td>
                  <td className="px-[10px] py-[6px] text-xs text-gray-400 hidden md:table-cell">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar") : "—"}
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
            className="px-3 py-1.5 text-sm border border-[#eef2f6] rounded-xl disabled:opacity-40 hover:bg-[#f8fafc]">السابق</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm border border-[#eef2f6] rounded-xl disabled:opacity-40 hover:bg-[#f8fafc]">التالي</button>
        </div>
      )}
    </div>
  );
}

export default OnlineOrdersAdminTab;
