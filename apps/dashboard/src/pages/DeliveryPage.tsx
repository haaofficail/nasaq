import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { Truck, Package, Plus, Loader2, AlertCircle, MapPin, Phone, Check, X, Building2, User, Trash2, Save } from "lucide-react";
import { clsx } from "clsx";
import { deliveryApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Modal, Button, Input } from "@/components/ui";

const DELIVERY_STATUS_LABELS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:    { label: "معلق",      bg: "bg-gray-50",    text: "text-gray-600",   dot: "bg-gray-400" },
  accepted:   { label: "مقبول",     bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500" },
  picked_up:  { label: "تم الاستلام", bg: "bg-amber-50", text: "text-amber-700",  dot: "bg-amber-500" },
  in_transit: { label: "في الطريق", bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-500" },
  delivered:  { label: "تم التسليم", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  failed:     { label: "فشل",       bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500" },
  returned:   { label: "مرتجع",     bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
};

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  percentage:      "نسبة مئوية",
  fixed_per_order: "مبلغ ثابت/طلب",
  flat_monthly:    "اشتراك شهري",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

// ============================================================
// PARTNER MODAL
// ============================================================

function PartnerModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name:            initial?.name || "",
    type:            initial?.type || "company",
    contactPhone:    initial?.contactPhone || "",
    commissionType:  initial?.commissionType || "fixed_per_order",
    commissionValue: initial?.commissionValue || "",
    notes:           initial?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      const payload = { ...form, commissionValue: Number(form.commissionValue) || 0 };
      if (initial) await deliveryApi.updatePartner(initial.id, payload);
      else await deliveryApi.createPartner(payload);
      onSaved();
      onClose();
    } catch {
      setError("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "تعديل شريك التوصيل" : "شريك توصيل جديد"}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">إلغاء</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Input label="الاسم" name="name" value={form.name} onChange={set("name")} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">النوع</label>
          <select value={form.type} onChange={set("type")} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="company">شركة</option>
            <option value="individual">سائق مستقل</option>
          </select>
        </div>
        <Input label="رقم التواصل" name="contactPhone" value={form.contactPhone} onChange={set("contactPhone")} dir="ltr" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع العمولة</label>
            <select value={form.commissionType} onChange={set("commissionType")} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="fixed_per_order">مبلغ ثابت/طلب</option>
              <option value="percentage">نسبة مئوية</option>
              <option value="flat_monthly">اشتراك شهري</option>
            </select>
          </div>
          <Input
            label={form.commissionType === "percentage" ? "النسبة (%)" : "المبلغ (ر.س)"}
            name="commissionValue"
            type="number"
            value={form.commissionValue}
            onChange={set("commissionValue")}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
          <textarea value={form.notes} onChange={set("notes")} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

type TabId = "partners" | "assignments";

export function DeliveryPage() {
  const [tab, setTab] = useState<TabId>("partners");
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editPartner, setEditPartner] = useState<any>(null);

  const { data: statsRes } = useApi(() => deliveryApi.stats(), []);
  const stats = statsRes?.data;

  const { data: partnersRes, loading: partnersLoading, error: partnersError, refetch: refetchPartners } =
    useApi(() => deliveryApi.partners(), []);
  const partners: any[] = partnersRes?.data || [];

  const { data: assignmentsRes, loading: assignmentsLoading } =
    useApi(() => deliveryApi.assignments(), []);
  const assignments: any[] = assignmentsRes?.data || [];

  const handleDeletePartner = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    try {
      await deliveryApi.deletePartner(id);
      toast.success("تم الحذف");
      refetchPartners();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">إدارة التوصيل</h1>
          <p className="text-sm text-gray-400 mt-0.5">شركاء التوصيل وتتبع الطلبات</p>
        </div>
        {tab === "partners" && (
          <Button icon={Plus} onClick={() => setShowPartnerModal(true)}>شريك جديد</Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "معلق",        value: stats.assignments?.pending || 0,    bg: "bg-gray-50",    text: "text-gray-600" },
            { label: "في الطريق",   value: stats.assignments?.in_transit || 0, bg: "bg-violet-50",  text: "text-violet-600" },
            { label: "تم التسليم",  value: stats.assignments?.delivered || 0,  bg: "bg-emerald-50", text: "text-emerald-600" },
            { label: "شركاء نشطون", value: stats.activePartners || 0,          bg: "bg-blue-50",    text: "text-blue-600" },
          ].map((s, i) => (
            <div key={i} className={clsx("rounded-2xl p-4", s.bg)}>
              <p className={clsx("text-2xl font-bold", s.text)}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: "partners" as TabId, label: "شركاء التوصيل", icon: Building2 },
          { id: "assignments" as TabId, label: "تعيينات التوصيل", icon: Package },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Partners Tab */}
      {tab === "partners" && (
        partnersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : partnersError ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-500">{partnersError}</p>
          </div>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-gray-100">
            <Truck className="w-12 h-12 text-gray-200" />
            <p className="text-gray-400">لا يوجد شركاء توصيل بعد</p>
            <Button icon={Plus} onClick={() => setShowPartnerModal(true)}>أضف أول شريك</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((p: any) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      {p.type === "company" ? <Building2 className="w-5 h-5 text-blue-500" /> : <User className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.type === "company" ? "شركة" : "سائق مستقل"}</p>
                    </div>
                  </div>
                  <span className={clsx("shrink-0 px-2 py-0.5 rounded-full text-xs font-medium", p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500")}>
                    {p.isActive ? "نشط" : "غير نشط"}
                  </span>
                </div>

                {p.contactPhone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-gray-300" />
                    {p.contactPhone}
                  </p>
                )}

                <div className="text-sm text-gray-500">
                  <span className="text-gray-400">{COMMISSION_TYPE_LABELS[p.commissionType]}: </span>
                  <span className="font-medium text-gray-700">
                    {p.commissionType === "percentage" ? `${p.commissionValue}%` : `${p.commissionValue} ر.س`}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => setEditPartner(p)}
                    className="flex-1 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeletePartner(p.id, p.name)}
                    className="p-1.5 text-red-300 hover:text-red-500 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Assignments Tab */}
      {tab === "assignments" && (
        assignmentsLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-gray-100">
            <Package className="w-12 h-12 text-gray-200" />
            <p className="text-gray-400">لا توجد تعيينات بعد</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">الطلب</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">المسند إليه</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">الحالة</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">رسوم التوصيل</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assignments.map((a: any) => {
                  const st = DELIVERY_STATUS_LABELS[a.status] || DELIVERY_STATUS_LABELS.pending;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-700 font-mono">{a.orderId.slice(0, 8)}…</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          {a.assignedToType === "partner" ? <Building2 className="w-3.5 h-3.5 text-gray-300" /> : <User className="w-3.5 h-3.5 text-gray-300" />}
                          <span>{a.assignedToType === "partner" ? "شريك" : "موظف"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", st.bg, st.text)}>
                          <span className={clsx("w-1.5 h-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{a.deliveryFee} ر.س</td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {new Date(a.assignedAt).toLocaleDateString("ar-SA")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modals */}
      {showPartnerModal && (
        <PartnerModal onClose={() => setShowPartnerModal(false)} onSaved={refetchPartners} />
      )}
      {editPartner && (
        <PartnerModal initial={editPartner} onClose={() => setEditPartner(null)} onSaved={refetchPartners} />
      )}    </div>
  );
}
