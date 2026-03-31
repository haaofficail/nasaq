import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import { Building } from "lucide-react";

function ComplianceBadge({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? "bg-emerald-100 text-emerald-700" :
    rate >= 50 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-600";
  const barColor =
    rate >= 80 ? "bg-emerald-500" :
    rate >= 50 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">الامتثال التنظيمي</span>
        <span className={clsx("text-xs font-medium rounded-full px-2 py-0.5", color)}>{rate}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", barColor)} style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

const PROPERTY_TYPE_AR: Record<string, string> = {
  residential: "سكني",
  commercial: "تجاري",
  industrial: "صناعي",
  mixed: "مختلط",
  land: "أرض",
  villa: "فيلا",
  apartment_building: "عمارة",
  compound: "مجمع",
};

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  residential: "bg-blue-100 text-blue-700",
  commercial: "bg-purple-100 text-purple-700",
  industrial: "bg-orange-100 text-orange-700",
  mixed: "bg-teal-100 text-teal-700",
  land: "bg-yellow-100 text-yellow-700",
  villa: "bg-emerald-100 text-emerald-700",
  apartment_building: "bg-indigo-100 text-indigo-700",
  compound: "bg-pink-100 text-pink-700",
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function PropertyListPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [showComplianceId, setShowComplianceId] = useState<string | null>(null);
  const [complianceData, setComplianceData] = useState<Record<string, any>>({});
  const { mutate: fetchCompliance } = useMutation((id: string) => propertyApi.getProperty(id));
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", type: "residential", address: "", city: "", district: "",
    totalFloors: "", buildYear: "", deedNumber: "", ownerName: "", notes: "",
  });

  const { data, loading, error, refetch } = useApi(
    () => propertyApi.properties.list({ type: typeFilter, city: cityFilter }),
    [typeFilter, cityFilter]
  );

  const { mutate: saveProperty, loading: saving } = useMutation((d: any) =>
    editingId ? propertyApi.updateProperty(editingId, d) : propertyApi.createProperty(d)
  );

  const properties: any[] = (data as any)?.data ?? [];

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", type: "residential", address: "", city: "", district: "", totalFloors: "", buildYear: "", deedNumber: "", ownerName: "", notes: "" });
    setShowModal(true);
  }

  function openEdit(p: any) {
    setEditingId(p.id);
    setForm({
      name: p.name ?? "", type: p.type ?? "residential", address: p.address ?? "",
      city: p.city ?? "", district: p.district ?? "", totalFloors: p.totalFloors ?? "",
      buildYear: p.buildYear ?? "", deedNumber: p.deedNumber ?? "",
      ownerName: p.ownerName ?? "", notes: p.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    const res = await saveProperty(form);
    if (res) {
      toast.success(editingId ? "تم تحديث العقار" : "تم إضافة العقار");
      setShowModal(false);
      refetch();
    }
  }

  async function handleShowCompliance(id: string) {
    if (showComplianceId === id) {
      setShowComplianceId(null);
      return;
    }
    setShowComplianceId(id);
    if (!complianceData[id]) {
      const res = await fetchCompliance(id);
      if (res) {
        setComplianceData((prev) => ({ ...prev, [id]: (res as any).data }));
      }
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">العقارات</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة محفظتك العقارية</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          إضافة عقار
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">كل الأنواع</option>
          {Object.entries(PROPERTY_TYPE_AR).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          placeholder="البحث بالمدينة..."
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          حدث خطأ: {error}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Building className="mx-auto mb-3 w-10 h-10 opacity-30" />
          <p className="text-base">لا توجد عقارات بعد</p>
          <p className="text-sm mt-1">ابدأ بإضافة أول عقار من الزر أعلاه</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p: any) => {
            const vacancyRate = p.totalUnits > 0
              ? Math.round(((p.totalUnits - (p.occupiedUnits ?? 0)) / p.totalUnits) * 100)
              : 0;
            const occupancyPct = 100 - vacancyRate;
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {p.coverImageUrl ? (
                  <img src={p.coverImageUrl} alt={p.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-emerald-50 flex items-center justify-center">
                    <Building className="w-12 h-12 text-emerald-300" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                    <span className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      PROPERTY_TYPE_COLORS[p.type] ?? "bg-gray-100 text-gray-600"
                    )}>
                      {PROPERTY_TYPE_AR[p.type] ?? p.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{p.city}{p.district ? ` — ${p.district}` : ""}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>إجمالي: {p.totalUnits ?? 0}</span>
                    <span>مشغول: {p.occupiedUnits ?? 0}</span>
                  </div>
                  {/* Vacancy bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>الإشغال</span>
                      <span>{occupancyPct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>
                  {/* Compliance mini panel */}
                  <ComplianceBadge rate={p.complianceRate ?? 0} />

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 text-center text-xs text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded-xl py-1.5 transition-colors"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleShowCompliance(p.id)}
                      className="flex-1 text-center text-xs text-brand-600 hover:text-brand-800 border border-brand-200 rounded-xl py-1.5 transition-colors"
                    >
                      تفاصيل الامتثال
                    </button>
                  </div>

                  {showComplianceId === p.id && (
                    <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-xs space-y-1">
                      {complianceData[p.id] ? (
                        <>
                          <p className="font-medium text-brand-700 mb-2">تفاصيل الامتثال التنظيمي</p>
                          {(complianceData[p.id].complianceDetails ?? []).map((item: any) => (
                            <div key={item.key} className="flex justify-between">
                              <span className="text-gray-600">{item.label}</span>
                              <span className={item.ok ? "text-emerald-600" : "text-red-500"}>
                                {item.ok ? "مكتمل" : "ناقص"}
                              </span>
                            </div>
                          ))}
                          {!(complianceData[p.id].complianceDetails?.length) && (
                            <p className="text-gray-400">لا توجد تفاصيل متاحة</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-400">جارٍ التحميل...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editingId ? "تعديل العقار" : "إضافة عقار جديد"} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="اسم العقار">
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="برج الياسمين..." />
              </Field>
              <Field label="النوع">
                <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(PROPERTY_TYPE_AR).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="المدينة">
                <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="الرياض..." />
              </Field>
              <Field label="الحي">
                <input className={inputCls} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="العليا..." />
              </Field>
              <Field label="العنوان التفصيلي">
                <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label="عدد الأدوار">
                <input type="number" className={inputCls} value={form.totalFloors} onChange={(e) => setForm({ ...form, totalFloors: e.target.value })} min={1} />
              </Field>
              <Field label="سنة البناء">
                <input type="number" className={inputCls} value={form.buildYear} onChange={(e) => setForm({ ...form, buildYear: e.target.value })} placeholder="2020" />
              </Field>
              <Field label="رقم الصك">
                <input className={inputCls} value={form.deedNumber} onChange={(e) => setForm({ ...form, deedNumber: e.target.value })} />
              </Field>
              <Field label="اسم المالك">
                <input className={inputCls} value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
              </Field>
            </div>
            <Field label="ملاحظات">
              <textarea
                className={clsx(inputCls, "h-20 resize-none")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
