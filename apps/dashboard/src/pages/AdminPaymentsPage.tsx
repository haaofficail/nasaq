import { useState } from "react";
import {
  CreditCard, TrendingUp, DollarSign, Clock, CheckCircle2,
  Plus, RefreshCw, ShieldCheck, Plug, Lock, Search,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { paymentsApi, adminApi } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  pending:    "بانتظار التسوية",
  processing: "قيد المعالجة",
  completed:  "مكتملة",
  failed:     "فاشلة",
};
const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  completed:  "bg-green-50 text-green-700",
  failed:     "bg-red-50 text-red-600",
};
const TX_STATUS_LABELS: Record<string, string> = {
  pending: "معلقة", paid: "مدفوعة", failed: "فاشلة", refunded: "مستردة", cancelled: "ملغاة",
};
const TX_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700", paid: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-600", refunded: "bg-blue-50 text-blue-700", cancelled: "bg-gray-100 text-gray-500",
};

export function AdminPaymentsPage() {
  const [activeTab, setActiveTab]       = useState<"transactions" | "settlements" | "org_control">("transactions");
  const [newSettlement, setNewSettlement] = useState(false);
  const [settlementForm, setSettlementForm] = useState({ orgId: "", periodStart: "", periodEnd: "", adminNote: "" });
  const [creating, setCreating]         = useState(false);
  const [createMsg, setCreateMsg]       = useState("");
  const [updatingId, setUpdatingId]     = useState<string | null>(null);

  // Org Gateway Control state
  const [orgSearchId, setOrgSearchId]   = useState("");
  const [orgCaps, setOrgCaps]           = useState<any>(null);
  const [loadingOrgCaps, setLoadingOrgCaps] = useState(false);
  const [orgCapsMsg, setOrgCapsMsg]     = useState("");
  const [togglingCap, setTogglingCap]   = useState<string | null>(null);

  const { data: statsRes,       loading: statsLoading }       = useApi(() => paymentsApi.adminStats(), []);
  const { data: txRes,          loading: txLoading }          = useApi(() => paymentsApi.adminTransactions(), []);
  const { data: settlementsRes, loading: settlementsLoading, refetch: refetchSettlements } =
    useApi(() => paymentsApi.adminSettlements(), []);

  const stats       = statsRes?.data;
  const txList      = txRes?.data ?? [];
  const settlements = settlementsRes?.data ?? [];

  const sf = (f: keyof typeof settlementForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSettlementForm(p => ({ ...p, [f]: e.target.value }));

  async function handleCreateSettlement() {
    if (!settlementForm.orgId || !settlementForm.periodStart || !settlementForm.periodEnd) return;
    setCreating(true); setCreateMsg("");
    try {
      await paymentsApi.createSettlement({
        orgId:       settlementForm.orgId,
        periodStart: new Date(settlementForm.periodStart).toISOString(),
        periodEnd:   new Date(settlementForm.periodEnd).toISOString(),
        adminNote:   settlementForm.adminNote || undefined,
      });
      setNewSettlement(false);
      setSettlementForm({ orgId: "", periodStart: "", periodEnd: "", adminNote: "" });
      refetchSettlements();
      setCreateMsg("تم إنشاء التسوية");
    } catch (e: any) { setCreateMsg(e.message || "حدث خطأ"); }
    finally { setCreating(false); }
  }

  async function handleUpdateSettlement(id: string, status: string) {
    setUpdatingId(id);
    try { await paymentsApi.updateSettlement(id, { status }); refetchSettlements(); }
    catch { } finally { setUpdatingId(null); }
  }

  // Load org capabilities
  async function handleLoadOrgCaps() {
    if (!orgSearchId.trim()) return;
    setLoadingOrgCaps(true); setOrgCapsMsg(""); setOrgCaps(null);
    try {
      const res: any = await adminApi.getOrgCapabilities(orgSearchId.trim());
      setOrgCaps(res?.data ?? null);
      if (!res?.data) setOrgCapsMsg("المنشأة غير موجودة");
    } catch (e: any) { setOrgCapsMsg(e.message || "حدث خطأ"); }
    finally { setLoadingOrgCaps(false); }
  }

  async function handleToggleCap(cap: string) {
    if (!orgCaps) return;
    setTogglingCap(cap);
    const current: string[] = orgCaps.enabledCapabilities ?? [];
    const updated = current.includes(cap)
      ? current.filter((c: string) => c !== cap)
      : [...current, cap];
    try {
      const res: any = await adminApi.setOrgCapabilities(orgSearchId.trim(), updated);
      setOrgCaps((p: any) => ({ ...p, enabledCapabilities: res?.data?.enabledCapabilities ?? updated }));
      setOrgCapsMsg("تم الحفظ");
      setTimeout(() => setOrgCapsMsg(""), 2000);
    } catch (e: any) { setOrgCapsMsg(e.message || "حدث خطأ"); }
    finally { setTogglingCap(null); }
  }

  const GATEWAY_CAPS = [
    {
      key: "payment_gateway_nasaq",
      title: "بوابة ترميز OS المركزية",
      desc: "يسمح للمنشأة باستخدام بوابة ترميز OS — ترميز OS يستقبل المال ويسوّي دورياً",
      icon: <ShieldCheck className="w-5 h-5 text-brand-500" />,
      bg: "bg-blue-50",
    },
    {
      key: "payment_gateway_own",
      title: "بوابة دفع خاصة",
      desc: "يسمح للمنشأة بربط بوابتها الخاصة (Moyasar, Tap, HyperPay...)",
      icon: <Plug className="w-5 h-5 text-purple-500" />,
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">إدارة المدفوعات</h1>
        <p className="text-sm text-gray-500 mt-0.5">مراقبة معاملات بوابة ترميز OS وتسوية المنشآت والتحكم في خيارات الدفع</p>
      </div>

      {/* KPIs */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<TrendingUp   className="w-5 h-5 text-green-600" />} bg="bg-green-50"  label="حجم المعاملات"   value={`${Number(stats?.totalVolume  ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`} />
          <KpiCard icon={<DollarSign   className="w-5 h-5 text-brand-500" />} bg="bg-blue-50"   label="رسوم المنصة"     value={`${Number(stats?.totalFees    ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`} />
          <KpiCard icon={<Clock        className="w-5 h-5 text-amber-600" />} bg="bg-amber-50"  label="بانتظار التسوية" value={`${Number(stats?.unsettled    ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`} />
          <KpiCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} bg="bg-green-50"  label="معاملات مدفوعة"  value={String(stats?.totalPaid ?? 0)} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {([
          { id: "transactions", label: "المعاملات" },
          { id: "settlements",  label: "التسويات" },
          { id: "org_control",  label: "التحكم بالمنشآت" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === t.id ? "border-b-2 border-brand-500 text-brand-500" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Transactions ── */}
      {activeTab === "transactions" && (
        txLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : txList.length === 0 ? (
          <EmptyState icon={<CreditCard />} label="لا توجد معاملات" />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">المنشأة</th>
                  <th className="text-right px-4 py-3 font-medium">المبلغ</th>
                  <th className="text-right px-4 py-3 font-medium">رسوم ترميز OS</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium">وسيلة الدفع</th>
                  <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {txList.map((row: any) => {
                  const tx = row.tx ?? row; const org = row.org ?? {};
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{org.name ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{Number(tx.amount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</td>
                      <td className="px-4 py-3 text-brand-500 font-medium">{Number(tx.platformFee).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TX_STATUS_COLORS[tx.status] ?? "bg-gray-100"}`}>
                          {TX_STATUS_LABELS[tx.status] ?? tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{tx.paymentMethod || "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Settlements ── */}
      {activeTab === "settlements" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{settlements.length} تسوية</p>
            <button onClick={() => setNewSettlement(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium">
              <Plus className="w-4 h-4" /> إنشاء تسوية
            </button>
          </div>

          {newSettlement && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">تسوية جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">معرّف المنشأة (orgId)</label>
                  <input value={settlementForm.orgId} onChange={sf("orgId")} placeholder="UUID المنشأة" dir="ltr"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">بداية الفترة</label>
                  <input type="date" value={settlementForm.periodStart} onChange={sf("periodStart")}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">نهاية الفترة</label>
                  <input type="date" value={settlementForm.periodEnd} onChange={sf("periodEnd")}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
              </div>
              <input value={settlementForm.adminNote} onChange={sf("adminNote")} placeholder="ملاحظة (اختياري)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              <div className="flex items-center gap-3">
                <button onClick={handleCreateSettlement} disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} إنشاء
                </button>
                <button onClick={() => setNewSettlement(false)} className="px-4 py-2.5 text-gray-500 text-sm">إلغاء</button>
                {createMsg && <p className="text-sm text-green-600">{createMsg}</p>}
              </div>
            </div>
          )}

          {settlementsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
          ) : settlements.length === 0 ? (
            <EmptyState icon={<DollarSign />} label="لا توجد تسويات بعد" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">المنشأة</th>
                    <th className="text-right px-4 py-3 font-medium">المبلغ الصافي</th>
                    <th className="text-right px-4 py-3 font-medium">رسوم ترميز OS</th>
                    <th className="text-right px-4 py-3 font-medium">الفترة</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {settlements.map((row: any) => {
                    const s = row.settlement ?? row; const org = row.org ?? {};
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{org.name ?? "—"}</td>
                        <td className="px-4 py-3 font-bold text-green-700">{Number(s.netAmount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</td>
                        <td className="px-4 py-3 text-brand-500">{Number(s.totalPlatformFee).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(s.periodStart).toLocaleDateString("ar-SA")} — {new Date(s.periodEnd).toLocaleDateString("ar-SA")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] ?? "bg-gray-100"}`}>
                            {STATUS_LABELS[s.status] ?? s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {s.status === "pending"    && <ActionBtn id={s.id} label="بدء المعالجة"  nextStatus="processing" onUpdate={handleUpdateSettlement} updatingId={updatingId} color="text-brand-500" />}
                          {s.status === "processing" && <ActionBtn id={s.id} label="تأكيد الإتمام" nextStatus="completed"  onUpdate={handleUpdateSettlement} updatingId={updatingId} color="text-green-600" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Org Control ── */}
      {activeTab === "org_control" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">تحكم في بوابات الدفع لمنشأة</h2>
              <p className="text-sm text-gray-400">ابحث بمعرّف المنشأة (orgId) لتفعيل أو تعطيل خيارات الدفع.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                value={orgSearchId}
                onChange={e => setOrgSearchId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLoadOrgCaps()}
                placeholder="أدخل orgId للمنشأة..."
                dir="ltr"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button
                onClick={handleLoadOrgCaps}
                disabled={loadingOrgCaps || !orgSearchId.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {loadingOrgCaps ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                بحث
              </button>
            </div>

            {orgCapsMsg && !orgCaps && (
              <p className="text-sm text-red-500">{orgCapsMsg}</p>
            )}
          </div>

          {orgCaps && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">خيارات الدفع</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{orgSearchId}</p>
                </div>
                {orgCapsMsg === "تم الحفظ" && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> تم الحفظ
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {GATEWAY_CAPS.map(cap => {
                  const isEnabled = (orgCaps.enabledCapabilities ?? []).includes(cap.key);
                  const isToggling = togglingCap === cap.key;
                  return (
                    <div key={cap.key} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <div className={`w-10 h-10 ${cap.bg} rounded-xl flex items-center justify-center shrink-0`}>
                        {cap.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{cap.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{cap.desc}</p>
                      </div>
                      <button
                        onClick={() => handleToggleCap(cap.key)}
                        disabled={isToggling}
                        className={`shrink-0 transition-colors disabled:opacity-50 ${isEnabled ? "text-brand-500" : "text-gray-300"}`}
                        title={isEnabled ? "تعطيل" : "تفعيل"}
                      >
                        {isToggling ? (
                          <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : isEnabled ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-2">كل الصلاحيات الممنوحة</p>
                <div className="flex flex-wrap gap-1.5">
                  {(orgCaps.enabledCapabilities ?? []).map((c: string) => (
                    <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-lg">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ id, label, nextStatus, onUpdate, updatingId, color }: {
  id: string; label: string; nextStatus: string; updatingId: string | null;
  onUpdate: (id: string, s: string) => void; color: string;
}) {
  return (
    <button onClick={() => onUpdate(id, nextStatus)} disabled={updatingId === id}
      className={`text-xs ${color} hover:underline disabled:opacity-50`}>
      {updatingId === id ? "..." : label}
    </button>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="w-12 h-12 mb-3 opacity-30">{icon}</div>
      <p className="text-sm">{label}</p>
    </div>
  );
}

function KpiCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
  );
}
