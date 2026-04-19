import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";

const UNIT_STATUS_AR: Record<string, string> = {
  occupied: "مشغولة",
  vacant: "شاغرة",
  maintenance: "صيانة",
  reserved: "محجوزة",
  under_renovation: "تجديد",
  sold: "مُباعة",
};

const UNIT_STATUS_COLORS: Record<string, string> = {
  occupied: "bg-emerald-100 text-emerald-700",
  vacant: "bg-gray-100 text-gray-600",
  maintenance: "bg-yellow-100 text-yellow-700",
  reserved: "bg-blue-100 text-blue-700",
  under_renovation: "bg-purple-100 text-purple-700",
  sold: "bg-red-100 text-red-600",
};

const UNIT_TYPE_AR: Record<string, string> = {
  apartment: "شقة", studio: "استوديو", villa: "فيلا", office: "مكتب",
  shop: "محل", warehouse: "مستودع", room: "غرفة", floor: "طابق",
};

const FURNISHING_AR: Record<string, string> = {
  furnished: "مفروشة", semi_furnished: "نصف مفروشة", unfurnished: "غير مفروشة",
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-[#eef2f6]">
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

const inputCls = "w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

const EMPTY_FORM = {
  propertyId: "", unitNumber: "", floor: "", type: "apartment", areaSqm: "",
  bedrooms: "", bathrooms: "", monthlyRent: "", yearlyRent: "", depositAmount: "",
  status: "vacant", furnishing: "unfurnished", electricityMeter: "", waterMeter: "",
};

export function PropertyUnitsPage() {
  const [propFilter, setPropFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [bulkPropertyId, setBulkPropertyId] = useState("");
  const [bulkCsv, setBulkCsv] = useState("");

  const { data: propsData } = useApi(() => propertyApi.properties.list(), []);
  const properties: any[] = (propsData as any)?.data ?? [];

  const params: Record<string, string> = {};
  if (propFilter) params.propertyId = propFilter;
  if (statusFilter) params.status = statusFilter;
  if (typeFilter) params.type = typeFilter;
  if (minRent) params.minRent = minRent;
  if (maxRent) params.maxRent = maxRent;

  const { data, loading, error, refetch } = useApi(
    () => propertyApi.units.list(params),
    [propFilter, statusFilter, typeFilter, minRent, maxRent]
  );

  const { mutate: saveUnit, loading: saving } = useMutation((d: any) =>
    editingId ? propertyApi.updateUnit(editingId, d) : propertyApi.createUnit(d)
  );
  const { mutate: bulkCreate, loading: bulking } = useMutation((d: any) => propertyApi.bulkCreateUnits(d));
  const { mutate: patchStatus } = useMutation(({ id, status }: { id: string; status: string }) =>
    propertyApi.updateUnitStatus(id, status)
  );

  const units: any[] = (data as any)?.data ?? [];

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(u: any) {
    setEditingId(u.id);
    setForm({
      propertyId: u.propertyId ?? "", unitNumber: u.unitNumber ?? "", floor: u.floor ?? "",
      type: u.type ?? "apartment", areaSqm: u.areaSqm ?? "", bedrooms: u.bedrooms ?? "",
      bathrooms: u.bathrooms ?? "", monthlyRent: u.monthlyRent ?? "", yearlyRent: u.yearlyRent ?? "",
      depositAmount: u.depositAmount ?? "", status: u.status ?? "vacant",
      furnishing: u.furnishing ?? "unfurnished", electricityMeter: u.electricityMeter ?? "",
      waterMeter: u.waterMeter ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    const res = await saveUnit(form);
    if (res) {
      toast.success(editingId ? "تم تحديث الوحدة" : "تم إضافة الوحدة");
      setShowModal(false);
      refetch();
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const res = await patchStatus({ id, status: newStatus });
    if (res) {
      toast.success("تم تحديث الحالة");
      refetch();
    }
  }

  async function handleBulk() {
    const lines = bulkCsv.trim().split("\n").filter(Boolean);
    const units_data = lines.map((line) => {
      const [unit_number, floor, type, area, monthly_rent] = line.split(",");
      return { propertyId: bulkPropertyId, unitNumber: unit_number?.trim(), floor: floor?.trim(), type: type?.trim() || "apartment", areaSqm: area?.trim(), monthlyRent: monthly_rent?.trim() };
    });
    const res = await bulkCreate({ propertyId: bulkPropertyId, units: units_data });
    if (res) {
      toast.success("تم إضافة الوحدات");
      setShowBulkModal(false);
      refetch();
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الوحدات</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة وحدات العقارات</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            إضافة بالجملة
          </button>
          <button
            onClick={openAdd}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            إضافة وحدة
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={propFilter} onChange={(e) => setPropFilter(e.target.value)} className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">كل العقارات</option>
          {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">كل الحالات</option>
          {Object.entries(UNIT_STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">كل الأنواع</option>
          {Object.entries(UNIT_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input value={minRent} onChange={(e) => setMinRent(e.target.value)} placeholder="الإيجار الأدنى" type="number" className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input value={maxRent} onChange={(e) => setMaxRent(e.target.value)} placeholder="الإيجار الأعلى" type="number" className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#f8fafc]">
            <tr>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">رقم الوحدة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">العقار</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">النوع</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الطابق</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">المساحة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الإيجار الشهري</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الحالة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8}><SkeletonRows /></td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : units.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">لا توجد وحدات مطابقة</td></tr>
            ) : (
              units.map((u: any) => (
                <tr key={u.id} className="hover:bg-[#f8fafc]">
                  <td className="px-[10px] py-[6px] font-medium text-gray-900">{u.unitNumber}</td>
                  <td className="px-[10px] py-[6px] text-gray-500">{u.propertyName ?? "—"}</td>
                  <td className="px-[10px] py-[6px] text-gray-500">{UNIT_TYPE_AR[u.type] ?? u.type}</td>
                  <td className="px-[10px] py-[6px] text-gray-500">{u.floor ?? "—"}</td>
                  <td className="px-[10px] py-[6px] text-gray-500">{u.areaSqm ? `${u.areaSqm} م²` : "—"}</td>
                  <td className="px-[10px] py-[6px] font-medium text-gray-900">
                    {u.monthlyRent ? `${Number(u.monthlyRent).toLocaleString("en-US")} ريال` : "—"}
                  </td>
                  <td className="px-[10px] py-[6px]">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", UNIT_STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600")}>
                      {UNIT_STATUS_AR[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-[10px] py-[6px]">
                    <div className="flex gap-2 items-center flex-wrap">
                      <button onClick={() => openEdit(u)} className="text-xs text-emerald-700 hover:underline">تعديل</button>
                      <div className="relative group">
                        <button className="text-xs text-brand-600 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-50 transition-colors">
                          تغيير الحالة
                        </button>
                        <div className="absolute left-0 mt-1 w-32 bg-white border border-[#eef2f6] rounded-xl shadow-lg z-10 hidden group-hover:block">
                          {Object.entries(UNIT_STATUS_AR).map(([k, v]) => (
                            k !== u.status && (
                              <button
                                key={k}
                                onClick={() => handleStatusChange(u.id, k)}
                                className="block w-full text-right px-3 py-2 text-xs text-gray-700 hover:bg-[#f8fafc]"
                              >
                                {v}
                              </button>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editingId ? "تعديل الوحدة" : "إضافة وحدة جديدة"} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="العقار">
                <select className={inputCls} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
                  <option value="">اختر العقار</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="رقم الوحدة">
                <input className={inputCls} value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} placeholder="101، A-2..." />
              </Field>
              <Field label="النوع">
                <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(UNIT_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="الطابق">
                <input className={inputCls} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="1" />
              </Field>
              <Field label="المساحة (م²)">
                <input type="number" className={inputCls} value={form.areaSqm} onChange={(e) => setForm({ ...form, areaSqm: e.target.value })} />
              </Field>
              <Field label="غرف النوم">
                <input type="number" className={inputCls} value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} min={0} />
              </Field>
              <Field label="دورات المياه">
                <input type="number" className={inputCls} value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} min={0} />
              </Field>
              <Field label="الإيجار الشهري (ريال)">
                <input type="number" className={inputCls} value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} />
              </Field>
              <Field label="الإيجار السنوي (ريال)">
                <input type="number" className={inputCls} value={form.yearlyRent} onChange={(e) => setForm({ ...form, yearlyRent: e.target.value })} />
              </Field>
              <Field label="مبلغ الوديعة (ريال)">
                <input type="number" className={inputCls} value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
              </Field>
              <Field label="الحالة">
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(UNIT_STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="التأثيث">
                <select className={inputCls} value={form.furnishing} onChange={(e) => setForm({ ...form, furnishing: e.target.value })}>
                  {Object.entries(FURNISHING_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="عداد الكهرباء">
                <input className={inputCls} value={form.electricityMeter} onChange={(e) => setForm({ ...form, electricityMeter: e.target.value })} />
              </Field>
              <Field label="عداد الماء">
                <input className={inputCls} value={form.waterMeter} onChange={(e) => setForm({ ...form, waterMeter: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <Modal title="إضافة وحدات بالجملة" onClose={() => setShowBulkModal(false)}>
          <div className="space-y-4">
            <Field label="العقار">
              <select className={inputCls} value={bulkPropertyId} onChange={(e) => setBulkPropertyId(e.target.value)}>
                <option value="">اختر العقار</option>
                {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="البيانات (CSV)">
              <p className="text-xs text-gray-400 mb-2">الصيغة: unit_number,floor,type,area,monthly_rent</p>
              <textarea
                className={clsx(inputCls, "h-36 resize-none font-mono text-xs")}
                value={bulkCsv}
                onChange={(e) => setBulkCsv(e.target.value)}
                placeholder={"101,1,apartment,85,3000\n102,1,apartment,90,3200"}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleBulk} disabled={bulking || !bulkPropertyId} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {bulking ? "جارٍ الإضافة..." : "إضافة"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
