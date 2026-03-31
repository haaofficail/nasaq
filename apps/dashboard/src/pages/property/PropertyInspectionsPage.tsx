import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";

const INSPECTION_TYPE_AR: Record<string, string> = {
  move_in: "دخول", move_out: "خروج", periodic: "دورية", maintenance: "صيانة",
};
const INSPECTION_STATUS_AR: Record<string, string> = {
  pending: "معلق", in_progress: "جاري", completed: "مكتمل", cancelled: "ملغي",
};
const INSPECTION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "kitchen",     label: "المطبخ" },
  { key: "bathrooms",   label: "دورات المياه" },
  { key: "bedrooms",    label: "غرف النوم" },
  { key: "livingRoom",  label: "غرفة المعيشة" },
  { key: "doors",       label: "الأبواب" },
  { key: "windows",     label: "النوافذ" },
  { key: "walls",       label: "الجدران" },
  { key: "floors",      label: "الأرضيات" },
  { key: "ceiling",     label: "السقف" },
  { key: "electrical",  label: "الكهرباء" },
  { key: "plumbing",    label: "السباكة" },
  { key: "ac",          label: "التكييف" },
  { key: "waterHeater", label: "سخان الماء" },
  { key: "exterior",    label: "الواجهة الخارجية" },
  { key: "general",     label: "الحالة العامة" },
];

const CONDITION_OPTIONS = [
  { value: "good",       label: "جيد",          color: "text-emerald-600" },
  { value: "average",    label: "متوسط",         color: "text-yellow-600" },
  { value: "needs_repair", label: "يحتاج إصلاح", color: "text-red-600" },
];

const CONDITION_AR: Record<string, string> = {
  good: "جيد", average: "متوسط", needs_repair: "يحتاج إصلاح",
};

type ChecklistEntry = { condition: string; notes: string };

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={clsx("bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto w-full", wide ? "max-w-3xl" : "max-w-2xl")}>
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";

const EMPTY_CHECKLIST: Record<string, ChecklistEntry> = Object.fromEntries(
  CHECKLIST_ITEMS.map((item) => [item.key, { condition: "good", notes: "" }])
);

export function PropertyInspectionsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showCompare, setShowCompare] = useState<any | null>(null);
  const [compareData, setCompareData] = useState<any | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const [form, setForm] = useState({
    propertyId: "",
    unitId: "",
    type: "move_in",
    scheduledDate: "",
    inspectorName: "",
    notes: "",
    checklist: { ...EMPTY_CHECKLIST },
  });

  const { data: propsData } = useApi(() => propertyApi.properties.list(), []);
  const properties: any[] = (propsData as any)?.data ?? [];

  const { data: unitsData } = useApi(
    () => form.propertyId ? propertyApi.units.list({ propertyId: form.propertyId }) : Promise.resolve({ data: [] }),
    [form.propertyId]
  );
  const filteredUnits: any[] = (unitsData as any)?.data ?? [];

  const { data, loading, error, refetch } = useApi(() => propertyApi.inspections.list(), []);
  const inspections: any[] = (data as any)?.data ?? [];

  const { mutate: createInspection, loading: creating } = useMutation((d: any) =>
    propertyApi.createInspection(d)
  );

  function setChecklistField(key: string, field: "condition" | "notes", value: string) {
    setForm((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [key]: { ...prev.checklist[key], [field]: value },
      },
    }));
  }

  async function handleCreate() {
    const res = await createInspection(form);
    if (res) {
      toast.success("تم إنشاء الفحص");
      setShowCreate(false);
      setForm({
        propertyId: "", unitId: "", type: "move_in",
        scheduledDate: "", inspectorName: "", notes: "",
        checklist: { ...EMPTY_CHECKLIST },
      });
      refetch();
    }
  }

  async function handleCompare(inspection: any) {
    setShowCompare(inspection);
    setCompareData(null);
    setCompareLoading(true);
    try {
      const res = await propertyApi.compareInspection(inspection.id);
      setCompareData((res as any)?.data ?? null);
    } catch {
      setCompareData(null);
    } finally {
      setCompareLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">فحوصات الوحدات</h1>
          <p className="text-sm text-gray-400 mt-0.5">تسجيل ومتابعة فحوصات الدخول والخروج</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-brand-500 text-white hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          فحص جديد
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-500">التاريخ</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">النوع</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">العقار</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الوحدة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">المفتش</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الحالة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7}><SkeletonRows /></td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : inspections.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-400">لا توجد فحوصات مسجلة</td></tr>
            ) : (
              inspections.map((insp: any) => (
                <tr key={insp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">
                    {insp.scheduledDate ? new Date(insp.scheduledDate).toLocaleDateString("ar-SA") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-xs font-medium">
                      {INSPECTION_TYPE_AR[insp.type] ?? insp.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{insp.propertyName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{insp.unitName ?? insp.unitNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{insp.inspectorName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", INSPECTION_STATUS_COLORS[insp.status] ?? "bg-gray-100 text-gray-600")}>
                      {INSPECTION_STATUS_AR[insp.status] ?? insp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleCompare(insp)}
                      className="text-xs text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-lg px-2 py-1 transition-colors"
                    >
                      مقارنة
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="فحص جديد" onClose={() => setShowCreate(false)} wide>
          <div className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="العقار">
                <select className={inputCls} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value, unitId: "" })}>
                  <option value="">اختر العقار</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="الوحدة">
                <select className={inputCls} value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                  <option value="">اختر الوحدة</option>
                  {filteredUnits.map((u: any) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
                </select>
              </Field>
              <Field label="نوع الفحص">
                <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(INSPECTION_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="تاريخ الفحص">
                <input type="date" className={inputCls} value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
              </Field>
              <Field label="اسم المفتش">
                <input className={inputCls} value={form.inspectorName} onChange={(e) => setForm({ ...form, inspectorName: e.target.value })} />
              </Field>
            </div>

            {/* Checklist */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">قائمة الفحص (15 بند)</p>
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-32">البند</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">الحالة</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {CHECKLIST_ITEMS.map((item) => {
                      const entry = form.checklist[item.key];
                      return (
                        <tr key={item.key} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700 text-xs">{item.label}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              {CONDITION_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setChecklistField(item.key, "condition", opt.value)}
                                  className={clsx(
                                    "text-xs px-2 py-1 rounded-lg border transition-colors",
                                    entry.condition === opt.value
                                      ? opt.value === "good" ? "bg-emerald-500 text-white border-emerald-500"
                                        : opt.value === "average" ? "bg-yellow-400 text-white border-yellow-400"
                                        : "bg-red-500 text-white border-red-500"
                                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={entry.notes}
                              onChange={(e) => setChecklistField(item.key, "notes", e.target.value)}
                              className="w-full border border-gray-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-300"
                              placeholder="ملاحظة..."
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <Field label="ملاحظات عامة">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50">
                {creating ? "جارٍ الحفظ..." : "حفظ الفحص"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Compare Modal */}
      {showCompare && (
        <Modal title={`مقارنة الفحص: ${INSPECTION_TYPE_AR[showCompare.type] ?? showCompare.type}`} onClose={() => { setShowCompare(null); setCompareData(null); }} wide>
          {compareLoading ? (
            <SkeletonRows rows={6} />
          ) : !compareData ? (
            <div className="py-8 text-center text-gray-400">
              <p className="text-sm">لا توجد بيانات مقارنة متاحة</p>
              <p className="text-xs mt-1 text-gray-300">يجب وجود فحص دخول وفحص خروج لنفس الوحدة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 bg-gray-50 rounded-xl px-4 py-2">
                <span>البند</span>
                <span>عند الدخول</span>
                <span>عند الخروج</span>
              </div>

              {/* Checklist comparison */}
              {CHECKLIST_ITEMS.map((item) => {
                const moveIn = compareData.moveIn?.checklist?.[item.key];
                const moveOut = compareData.moveOut?.checklist?.[item.key];
                const hasDiff = moveIn && moveOut && moveIn.condition !== moveOut.condition;
                return (
                  <div
                    key={item.key}
                    className={clsx(
                      "grid grid-cols-3 text-sm rounded-xl px-4 py-3 gap-2",
                      hasDiff ? "bg-red-50 border border-red-100" : "bg-gray-50"
                    )}
                  >
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <div>
                      <span className={clsx("text-xs font-medium",
                        moveIn?.condition === "good" ? "text-emerald-600" :
                        moveIn?.condition === "average" ? "text-yellow-600" : "text-red-600"
                      )}>
                        {CONDITION_AR[moveIn?.condition ?? ""] ?? "—"}
                      </span>
                      {moveIn?.notes && <p className="text-xs text-gray-400 mt-0.5">{moveIn.notes}</p>}
                    </div>
                    <div>
                      <span className={clsx("text-xs font-medium",
                        moveOut?.condition === "good" ? "text-emerald-600" :
                        moveOut?.condition === "average" ? "text-yellow-600" : "text-red-600"
                      )}>
                        {CONDITION_AR[moveOut?.condition ?? ""] ?? "—"}
                      </span>
                      {moveOut?.notes && <p className="text-xs text-gray-400 mt-0.5">{moveOut.notes}</p>}
                      {hasDiff && <span className="text-xs text-red-600 font-medium mt-0.5 block">تدهور</span>}
                    </div>
                  </div>
                );
              })}

              {/* Suggested deductions */}
              {compareData.suggestedDeductions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">اقتراح الخصومات من الوديعة</p>
                  <div className="space-y-1">
                    {(compareData.suggestedDeductions as any[]).map((d: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600">{d.item}</span>
                        <span className="font-medium text-yellow-700">{Number(d.amount ?? 0).toLocaleString("en-US")} ريال</span>
                      </div>
                    ))}
                    <div className="border-t border-yellow-200 pt-1 flex justify-between text-sm font-bold">
                      <span className="text-gray-700">الإجمالي المقترح</span>
                      <span className="text-yellow-800">
                        {compareData.suggestedDeductions.reduce((s: number, d: any) => s + Number(d.amount ?? 0), 0).toLocaleString("en-US")} ريال
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
