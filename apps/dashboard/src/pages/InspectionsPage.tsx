import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { rentalApi } from "@/lib/api";
import { ClipboardList, AlertTriangle, CheckCircle2, Plus, X, Check, Filter } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

const TYPE_LABELS: Record<string, string> = {
  pre_rental: "قبل التأجير", post_rental: "بعد الاستلام", maintenance_check: "فحص صيانة",
};
const CONDITION_LABELS: Record<string, string> = {
  excellent: "ممتاز", good: "جيد", fair: "مقبول", poor: "يحتاج صيانة",
};
const CONDITION_COLORS: Record<string, string> = {
  excellent: "text-emerald-600 bg-emerald-50", good: "text-blue-600 bg-blue-50",
  fair: "text-amber-600 bg-amber-50", poor: "text-red-500 bg-red-50",
};

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
    {children}
  </div>
);

export function InspectionsPage() {
  const [damageOnly, setDamageOnly] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({
    assetName: "", type: "pre_rental", condition: "good",
    damageFound: false, damageDescription: "", damageCost: "",
    inspectorName: "", notes: "",
  });

  const { data, loading, refetch } = useApi(
    () => rentalApi.inspections({ damageOnly: damageOnly || undefined }),
    [damageOnly]
  );
  const createMut  = useMutation((d: any) => rentalApi.createInspection(d));
  const recoverMut = useMutation((id: string) => rentalApi.recoverDamage(id));

  const inspections: any[] = data?.data || [];
  const withDamage    = inspections.filter(i => i.damage_found).length;
  const clean         = inspections.filter(i => !i.damage_found).length;
  const totalDamage   = inspections.reduce((s, i) => s + parseFloat(i.damage_cost || 0), 0);
  const unrecovered   = inspections.filter(i => i.damage_found && !i.damage_recovered).length;

  const save = async () => {
    if (!form.assetName.trim()) return;
    await createMut.mutate({
      assetName: form.assetName, type: form.type, condition: form.condition,
      damageFound: form.damageFound,
      damageDescription: form.damageFound ? form.damageDescription : null,
      damageCost: form.damageFound && form.damageCost ? parseFloat(form.damageCost) : null,
      inspectorName: form.inspectorName || null, notes: form.notes || null,
    });
    setCreateModal(false);
    setForm({ assetName: "", type: "pre_rental", condition: "good", damageFound: false, damageDescription: "", damageCost: "", inspectorName: "", notes: "" });
    refetch();
  };

  const handleRecover = async (id: string) => {
    await recoverMut.mutate(id);
    refetch();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-500" /> سجلات التفتيش
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{inspections.length} تفتيش</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDamageOnly(d => !d)}
            className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
              damageOnly ? "bg-red-500 text-white border-red-500" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            <Filter className="w-3.5 h-3.5" /> الأضرار فقط
          </button>
          <button onClick={() => setCreateModal(true)} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">
            <Plus className="w-4 h-4" /> تفتيش جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي التفتيش",   value: inspections.length, icon: ClipboardList, color: "text-brand-500 bg-brand-50" },
          { label: "بدون أضرار",       value: clean,              icon: CheckCircle2,  color: "text-green-600 bg-green-50" },
          { label: "بها أضرار",        value: withDamage,         icon: AlertTriangle, color: "text-red-500 bg-red-50" },
          { label: "أضرار غير مستردة", value: unrecovered,        icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {totalDamage > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">إجمالي قيمة الأضرار</p>
            <p className="text-xs text-red-500">{totalDamage.toFixed(0)} ر.س · {unrecovered} غير مسترد</p>
          </div>
        </div>
      )}

      {/* Inspections list */}
      {loading ? (
        <SkeletonRows />
      ) : inspections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
          <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">لا توجد سجلات تفتيش</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inspections.map(i => (
            <div
              key={i.id}
              className={clsx("bg-white rounded-2xl border px-5 py-4",
                i.damage_found && !i.damage_recovered ? "border-red-200" : i.damage_found ? "border-orange-100" : "border-gray-100"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{i.asset_name || "أصل"}</p>
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", CONDITION_COLORS[i.condition] || "bg-gray-100 text-gray-600")}>
                      {CONDITION_LABELS[i.condition] || i.condition}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{TYPE_LABELS[i.type] || i.type}</span>
                  </div>
                  {i.contract_title && (
                    <p className="text-xs text-gray-400 mt-0.5">{i.contract_number} · {i.contract_title}</p>
                  )}
                  {i.damage_found && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {i.damage_description} — {parseFloat(i.damage_cost || 0).toFixed(0)} ر.س
                    </p>
                  )}
                  {i.inspector_name && <p className="text-xs text-gray-400 mt-0.5">مفتش: {i.inspector_name}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {i.damage_found && !i.damage_recovered && (
                    <button
                      onClick={() => handleRecover(i.id)}
                      disabled={recoverMut.loading}
                      className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" /> تم الاسترداد
                    </button>
                  )}
                  {i.damage_found && i.damage_recovered && (
                    <span className="text-xs text-emerald-600 font-medium">مسترد</span>
                  )}
                  {!i.damage_found && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                  <span className="text-xs text-gray-400">{new Date(i.created_at).toLocaleDateString("ar-SA")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900">تفتيش جديد</h3>
              <button onClick={() => setCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="اسم الأصل *">
                <input value={form.assetName} onChange={e => setForm(p => ({ ...p, assetName: e.target.value }))} className={inputCls} placeholder="مثال: كاميرا Sony A7" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="نوع التفتيش">
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                    <option value="pre_rental">قبل التأجير</option>
                    <option value="post_rental">بعد الاستلام</option>
                    <option value="maintenance_check">فحص صيانة</option>
                  </select>
                </Field>
                <Field label="الحالة">
                  <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))} className={inputCls}>
                    <option value="excellent">ممتاز</option>
                    <option value="good">جيد</option>
                    <option value="fair">مقبول</option>
                    <option value="poor">يحتاج صيانة</option>
                  </select>
                </Field>
              </div>
              <Field label="اسم المفتش">
                <input value={form.inspectorName} onChange={e => setForm(p => ({ ...p, inspectorName: e.target.value }))} className={inputCls} />
              </Field>
              <div className="flex items-center gap-2">
                <button onClick={() => setForm(p => ({ ...p, damageFound: !p.damageFound }))} className={clsx("w-10 h-6 rounded-full transition-colors relative shrink-0", form.damageFound ? "bg-red-500" : "bg-gray-200")}>
                  <span className={clsx("absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all", form.damageFound ? "right-1" : "left-1")} />
                </button>
                <span className="text-sm text-gray-700">يوجد ضرر</span>
              </div>
              {form.damageFound && (
                <>
                  <Field label="وصف الضرر">
                    <textarea value={form.damageDescription} onChange={e => setForm(p => ({ ...p, damageDescription: e.target.value }))} className={clsx(inputCls, "resize-none")} rows={3} />
                  </Field>
                  <Field label="تكلفة الإصلاح (ر.س)">
                    <input type="number" value={form.damageCost} onChange={e => setForm(p => ({ ...p, damageCost: e.target.value }))} className={inputCls} placeholder="0" />
                  </Field>
                </>
              )}
              <Field label="ملاحظات">
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={clsx(inputCls, "resize-none")} rows={2} />
              </Field>
              <div className="flex gap-2">
                <button onClick={save} disabled={createMut.loading || !form.assetName.trim()} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">حفظ</button>
                <button onClick={() => setCreateModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
