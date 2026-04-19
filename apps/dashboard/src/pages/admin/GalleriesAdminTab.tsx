import { useState } from "react";
import { Images, X, ExternalLink } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";
import { fmtDate } from "@/lib/utils";

function GalleriesAdminTab() {
  const [page, setPage]   = useState(1);
  const [orgId, setOrgId] = useState("");
  const [q, setQ]         = useState("");

  const { data, loading } = useApi(
    () => adminApi.adminGalleries({ orgId: orgId || undefined, q: q || undefined, page, limit: 25 }),
    [orgId, q, page]
  );

  const rows: any[] = data?.data ?? [];
  const pagination  = data?.pagination;
  const totalPages  = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setQ(""); setPage(1); };
  const shareBase   = `${window.location.origin}/gallery/`;

  return (
    <div className="space-y-5">
      <SectionHeader title="معارض الصور" sub={`${pagination?.total ?? 0} معرض عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="بحث باسم المعرض..."
          className="bg-white border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none flex-1 min-w-40" />
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        {(orgId || q) && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-[#eef2f6] rounded-xl hover:bg-[#f8fafc]">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={Images} text="لا توجد معارض" /> : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eef2f6] bg-[#f8fafc] text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">اسم المعرض</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">العميل</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الصور</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">تنتهي</th>
                <th className="text-right px-4 py-3 font-semibold">الرابط</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-[#f8fafc] last:border-0">
                    <td className="px-[10px] py-[6px] text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                    <td className="px-[10px] py-[6px] text-sm text-gray-900">{r.name}</td>
                    <td className="px-[10px] py-[6px] text-xs text-gray-500 hidden md:table-cell">{r.clientName ?? "—"}</td>
                    <td className="px-[10px] py-[6px] text-xs text-gray-500 hidden md:table-cell tabular-nums">{r.assetIds?.length ?? 0}</td>
                    <td className="px-[10px] py-[6px] text-xs hidden lg:table-cell">
                      {r.expiresAt
                        ? <span className={expired ? "text-red-500" : "text-gray-400"}>{fmtDate(r.expiresAt)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-[10px] py-[6px]">
                      <a href={`${shareBase}${r.token}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                        فتح
                      </a>
                    </td>
                  </tr>
                );
              })}
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

export default GalleriesAdminTab;
