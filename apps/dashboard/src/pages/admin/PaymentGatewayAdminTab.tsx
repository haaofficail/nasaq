import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { adminApi } from "@/lib/api";
import { CreditCard, CheckCircle2, XCircle, Search, Percent } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Button, Modal } from "@/components/ui";

export default function PaymentGatewayAdminTab() {
  const [filterEnabled, setFilterEnabled] = useState<boolean | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [editOrg, setEditOrg] = useState<any | null>(null);
  const [feePercent, setFeePercent] = useState("");
  const [feeFixed, setFeeFixed] = useState("");

  const { data, loading, refetch } = useApi(
    () => adminApi.paymentSettings({ enabled: filterEnabled, limit: 100 }),
    [filterEnabled]
  );
  const update = useMutation(({ orgId, body }: any) => adminApi.updatePaymentSettings(orgId, body));

  const allRows: any[] = data?.data || [];
  const rows = allRows.filter(r =>
    !search || (r.orgName || "").includes(search) || (r.orgSlug || "").includes(search)
  );

  const enabledCount   = allRows.filter(r => r.enabled).length;
  const disabledCount  = allRows.filter(r => !r.enabled).length;

  const openEdit = (row: any) => {
    setEditOrg(row);
    setFeePercent(String(row.platformFeePercent ?? "2.5"));
    setFeeFixed(String(row.platformFeeFixed ?? "0"));
  };

  const handleSave = async () => {
    if (!editOrg) return;
    await update.mutate({ orgId: editOrg.orgId, body: { platformFeePercent: parseFloat(feePercent), platformFeeFixed: parseFloat(feeFixed) } });
    setEditOrg(null);
    refetch();
  };

  const toggleEnabled = async (row: any) => {
    await update.mutate({ orgId: row.orgId, body: { enabled: !row.enabled } });
    refetch();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-brand-500" /> بوابة الدفع الإلكتروني
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">المنشآت التي تملك إعداد دفع في النظام</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "مفعّل", value: enabledCount, color: "text-green-600 bg-green-50" },
          { label: "غير مفعّل", value: disabledCount, color: "text-gray-500 bg-gray-50" },
          { label: "الإجمالي", value: allRows.length, color: "text-brand-600 bg-brand-50" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#eef2f6] p-4 text-center">
            <p className={clsx("text-2xl font-bold tabular-nums", color.split(" ")[0])}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-[#eef2f6] rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الـ slug..." className="bg-transparent outline-none text-sm text-gray-700 w-40" />
        </div>
        <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1">
          {[["all", "الكل", undefined], ["enabled", "مفعّل", true], ["disabled", "غير مفعّل", false]].map(([key, label, val]) => (
            <button key={String(key)} onClick={() => setFilterEnabled(val as boolean | undefined)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors", filterEnabled === val ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              {label as string}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? <SkeletonRows /> : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          {rows.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">لا توجد نتائج</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eef2f6] bg-[#f8fafc]">
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">المنشأة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">رسوم المنصة %</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">رسوم ثابتة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">IBAN</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className={clsx("border-b border-[#eef2f6] last:border-0", i % 2 === 0 ? "" : "bg-[#fafafa]")}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{row.orgName}</p>
                      <p className="text-xs text-gray-400">{row.orgSlug}</p>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleEnabled(row)} className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors", row.enabled ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-gray-50 text-gray-500 border-[#eef2f6] hover:bg-gray-100")}>
                        {row.enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {row.enabled ? "مفعّل" : "معطّل"}
                      </button>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-gray-700">{row.platformFeePercent ?? "2.5"}%</td>
                    <td className="px-5 py-3 tabular-nums text-gray-700">{row.platformFeeFixed ?? "0"} ر.س</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{row.ibanNumber ? `SA••••${row.ibanNumber.slice(-4)}` : "—"}</td>
                    <td className="px-5 py-3 text-left">
                      <button onClick={() => openEdit(row)} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                        <Percent className="w-3 h-3" /> تعديل الرسوم
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!editOrg} onClose={() => setEditOrg(null)} title={`رسوم المنصة — ${editOrg?.orgName}`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setEditOrg(null)}>إلغاء</Button><Button onClick={handleSave} disabled={update.loading}>حفظ</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">رسوم نسبية (%)</label>
            <input type="number" min="0" max="100" step="0.1" value={feePercent} onChange={e => setFeePercent(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm outline-none focus:border-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">رسوم ثابتة (ر.س)</label>
            <input type="number" min="0" step="0.01" value={feeFixed} onChange={e => setFeeFixed(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm outline-none focus:border-brand-300" />
          </div>
          <p className="text-xs text-gray-400">التغيير يؤثر على الطلبات الجديدة فقط.</p>
        </div>
      </Modal>
    </div>
  );
}
