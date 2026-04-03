import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";
import { clsx } from "clsx";

function AccessLogsAdminTab() {
  const [page, setPage]     = useState(1);
  const [orgId, setOrgId]   = useState("");
  const [granted, setGranted] = useState("");
  const [date, setDate]     = useState("");

  const { data, loading } = useApi(
    () => adminApi.accessLogs({
      orgId:   orgId   || undefined,
      granted: granted === "" ? undefined : granted === "true",
      date:    date    || undefined,
      page,
      limit:   25,
    }),
    [orgId, granted, date, page]
  );

  const rows: any[] = data?.data ?? [];
  const pagination  = data?.pagination;
  const totalPages  = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setGranted(""); setDate(""); setPage(1); };

  return (
    <div className="space-y-5">
      <SectionHeader title="سجل التحكم في الدخول" sub={`${pagination?.total ?? 0} دخول عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        <select value={granted} onChange={e => { setGranted(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">مسموح + مرفوض</option>
          <option value="true">مسموح فقط</option>
          <option value="false">مرفوض فقط</option>
        </select>
        <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
        {(orgId || granted || date) && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={ShieldCheck} text="لا يوجد سجل دخول" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">العميل</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الطريقة</th>
                <th className="text-right px-4 py-3 font-semibold">النتيجة</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">السبب</th>
                <th className="text-right px-4 py-3 font-semibold">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.customerName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{r.method}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg",
                      r.granted ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    )}>
                      {r.granted ? "مسموح" : "مرفوض"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">{r.denyReason ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {r.accessedAt ? new Date(r.accessedAt).toLocaleString("ar") : "—"}
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

export default AccessLogsAdminTab;
