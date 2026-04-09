import { useState } from "react";
import { Users, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";
import { clsx } from "clsx";

const TIER_COLORS: Record<string, string> = {
  regular: "bg-gray-100 text-gray-600",
  silver: "bg-slate-100 text-slate-700",
  gold: "bg-yellow-100 text-yellow-700",
  platinum: "bg-indigo-100 text-indigo-700",
  vip: "bg-purple-100 text-purple-700",
};

const TIER_LABELS: Record<string, string> = {
  regular: "عادي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
  vip: "VIP",
};

const TIERS = ["regular", "silver", "gold", "platinum", "vip"] as const;

function CustomersAdminTab() {
  const [page, setPage]   = useState(1);
  const [orgId, setOrgId] = useState("");
  const [tier, setTier]   = useState("");
  const [q, setQ]         = useState("");

  const { data, loading } = useApi(
    () => adminApi.customers({ orgId: orgId || undefined, q: q || undefined, tier: tier || undefined, page, limit: 25 }),
    [orgId, tier, q, page]
  );

  const rows: any[]   = data?.data ?? [];
  const pagination    = data?.pagination;
  const totalPages    = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setTier(""); setQ(""); setPage(1); };

  return (
    <div className="space-y-5">
      <SectionHeader title="العملاء" sub={`${pagination?.total ?? 0} عميل عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="بحث بالاسم أو الجوال..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none flex-1 min-w-40" />
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        <select value={tier} onChange={e => { setTier(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الفئات</option>
          {TIERS.map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
        </select>
        {(orgId || tier || q) && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={Users} text="لا يوجد عملاء" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">الاسم</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الجوال</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">البريد</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">النوع</th>
                <th className="text-right px-4 py-3 font-semibold">الفئة</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">الإنفاق</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">الحجوزات</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">نقاط الولاء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell font-mono" dir="ltr">{r.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell" dir="ltr">{r.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{r.type ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg", TIER_COLORS[r.tier] ?? "bg-gray-100 text-gray-600")}>
                      {TIER_LABELS[r.tier] ?? r.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell tabular-nums">
                    {r.totalSpent ? `${Number(r.totalSpent).toLocaleString("en-US")} ر.س` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell tabular-nums">{r.totalBookings ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell tabular-nums">{r.loyaltyPoints ?? 0}</td>
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

export default CustomersAdminTab;
