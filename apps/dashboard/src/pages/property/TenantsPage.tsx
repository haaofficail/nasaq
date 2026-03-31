import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import { Users } from "lucide-react";

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

const EMPTY_FORM = {
  customerId: "", nationalId: "", iqamaNumber: "", nationality: "",
  emergencyContactName: "", emergencyContactPhone: "",
  bankName: "", iban: "", notes: "",
};

export function TenantsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [tenantTab, setTenantTab] = useState<"contracts" | "payments" | "maintenance">("contracts");

  const { data, loading, error, refetch } = useApi(
    () => propertyApi.tenants.list({ search }),
    [search]
  );

  const { data: tenantDetail, loading: detailLoading } = useApi(
    () => selectedTenant ? propertyApi.getTenant(selectedTenant.id) : Promise.resolve(null),
    [selectedTenant?.id]
  );

  const { mutate: saveTenant, loading: saving } = useMutation((d: any) =>
    editingId ? propertyApi.updateTenant(editingId, d) : propertyApi.createTenant(d)
  );

  const tenants: any[] = (data as any)?.data ?? [];

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(t: any) {
    setEditingId(t.id);
    setForm({
      customerId: t.customerId ?? "",
      nationalId: t.nationalId ?? "", iqamaNumber: t.iqamaNumber ?? "",
      nationality: t.nationality ?? "",
      emergencyContactName: t.emergencyContactName ?? "",
      emergencyContactPhone: t.emergencyContactPhone ?? "",
      bankName: t.bankName ?? "", iban: t.iban ?? "", notes: t.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    const res = await saveTenant(form);
    if (res) {
      toast.success(editingId ? "تم تحديث بيانات المستأجر" : "تم إضافة المستأجر");
      setShowModal(false);
      refetch();
    }
  }

  const detail: any = (tenantDetail as any)?.data ?? null;
  const detailContracts: any[] = detail?.contracts ?? [];
  const detailPayments: any[] = detail?.payments ?? [];
  const detailMaintenance: any[] = detail?.maintenance ?? [];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المستأجرون</h1>
          <p className="text-sm text-gray-500 mt-0.5">سجل المستأجرين وعقودهم</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          إضافة مستأجر
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="البحث بالاسم أو رقم الهوية..."
        className="w-full max-w-md border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الاسم</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الهوية / الإقامة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الجوال</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">عدد العقود</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">آخر نشاط</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6}><SkeletonRows /></td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <Users className="mx-auto mb-2 w-8 h-8 text-gray-300" />
                  <p className="text-gray-400">لا يوجد مستأجرون</p>
                </td>
              </tr>
            ) : (
              tenants.map((t: any) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTenant(t)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name ?? t.fullName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{t.nationalId ?? t.iqamaNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{t.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{t.contractsCount ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.lastActivity ? new Date(t.lastActivity).toLocaleDateString("ar-SA") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Side panel */}
      {selectedTenant && (
        <div className="fixed inset-y-0 left-0 w-full md:w-96 bg-white shadow-2xl z-40 flex flex-col overflow-hidden" dir="rtl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{selectedTenant.name ?? selectedTenant.fullName}</h3>
            <button onClick={() => setSelectedTenant(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {detailLoading ? (
              <SkeletonRows />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">رقم الهوية</p>
                    <p className="font-medium text-gray-800 mt-0.5">{detail?.nationalId ?? "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">الإقامة</p>
                    <p className="font-medium text-gray-800 mt-0.5">{detail?.iqamaNumber ?? "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">جهة الاتصال للطوارئ</p>
                    <p className="font-medium text-gray-800 mt-0.5">{detail?.emergencyContactName ?? "—"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{detail?.emergencyContactPhone ?? ""}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">الآيبان</p>
                    <p className="font-medium text-gray-800 mt-0.5 text-xs break-all">{detail?.iban ?? "—"}</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-100">
                  <nav className="flex gap-4">
                    {([
                      { id: "contracts", label: "العقود" },
                      { id: "payments", label: "المدفوعات" },
                      { id: "maintenance", label: "الصيانة" },
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setTenantTab(tab.id)}
                        className={clsx(
                          "py-2 text-xs font-medium border-b-2 transition-colors",
                          tenantTab === tab.id
                            ? "border-emerald-500 text-emerald-600"
                            : "border-transparent text-gray-400 hover:text-gray-600"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {tenantTab === "contracts" && (
                  <div className="space-y-2">
                    {detailContracts.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">لا توجد عقود</p>
                    ) : detailContracts.map((c: any) => (
                      <div key={c.id} className="bg-gray-50 rounded-xl p-3 text-xs">
                        <p className="font-medium text-gray-700">{c.contractNumber}</p>
                        <p className="text-gray-500 mt-0.5">{c.unitName} — {c.status}</p>
                      </div>
                    ))}
                  </div>
                )}
                {tenantTab === "payments" && (
                  <div className="space-y-2">
                    {detailPayments.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">لا توجد مدفوعات</p>
                    ) : detailPayments.map((p: any) => (
                      <div key={p.id} className="bg-gray-50 rounded-xl p-3 text-xs flex justify-between">
                        <span className="text-gray-600">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("ar-SA") : "—"}</span>
                        <span className="font-medium text-emerald-700">{Number(p.amount ?? 0).toLocaleString("en-US")} ريال</span>
                      </div>
                    ))}
                  </div>
                )}
                {tenantTab === "maintenance" && (
                  <div className="space-y-2">
                    {detailMaintenance.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">لا توجد طلبات صيانة</p>
                    ) : detailMaintenance.map((m: any) => (
                      <div key={m.id} className="bg-gray-50 rounded-xl p-3 text-xs">
                        <p className="font-medium text-gray-700">{m.title}</p>
                        <p className="text-gray-500 mt-0.5">{m.status}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editingId ? "تعديل بيانات المستأجر" : "إضافة مستأجر جديد"} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <Field label="ربط بعميل موجود (اختياري)">
              <input className={inputCls} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} placeholder="معرف العميل..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="رقم الهوية الوطنية">
                <input className={inputCls} value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
              </Field>
              <Field label="رقم الإقامة">
                <input className={inputCls} value={form.iqamaNumber} onChange={(e) => setForm({ ...form, iqamaNumber: e.target.value })} />
              </Field>
              <Field label="الجنسية">
                <input className={inputCls} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} placeholder="سعودي، مقيم..." />
              </Field>
              <Field label="اسم جهة الاتصال للطوارئ">
                <input className={inputCls} value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
              </Field>
              <Field label="جوال الطوارئ">
                <input className={inputCls} value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
              </Field>
              <Field label="اسم البنك">
                <input className={inputCls} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </Field>
              <Field label="رقم الآيبان">
                <input className={inputCls} value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="SA..." />
              </Field>
            </div>
            <Field label="ملاحظات">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
