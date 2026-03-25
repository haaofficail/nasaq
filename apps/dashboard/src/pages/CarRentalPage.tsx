import { useState, useEffect } from "react";
import { carRentalApi } from "../lib/api";
import { Button } from "../components/ui";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

type Tab = "dashboard" | "fleet" | "reservations" | "inspections";

const VEHICLE_STATUS_AR: Record<string, string> = {
  available: "متاحة",
  reserved: "محجوزة",
  rented: "مؤجَّرة",
  maintenance: "صيانة",
  inspection: "فحص",
  out_of_service: "خارج الخدمة",
};

const RESERVATION_STATUS_AR: Record<string, string> = {
  pending: "انتظار",
  confirmed: "مؤكد",
  picked_up: "تم الاستلام",
  returned: "تم الإرجاع",
  cancelled: "ملغي",
  no_show: "لم يحضر",
  completed: "مكتمل",
};

const VEHICLE_STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  reserved: "bg-blue-100 text-blue-800",
  rented: "bg-red-100 text-red-800",
  maintenance: "bg-orange-100 text-orange-800",
  inspection: "bg-yellow-100 text-yellow-800",
  out_of_service: "bg-gray-100 text-gray-600",
};

export default function CarRentalPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservationFilter, setReservationFilter] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, vehiclesRes, catsRes, resRes, inspRes] = await Promise.all([
        carRentalApi.dashboardStats().catch(() => ({ data: null })),
        carRentalApi.vehicles().catch(() => ({ data: [] })),
        carRentalApi.categories().catch(() => ({ data: [] })),
        carRentalApi.reservations().catch(() => ({ data: [], total: 0 })),
        carRentalApi.inspections().catch(() => ({ data: [] })),
      ]);
      setStats((statsRes as any).data);
      setVehicles((vehiclesRes as any).data ?? []);
      setCategories((catsRes as any).data ?? []);
      setReservations((resRes as any).data ?? []);
      setInspections((inspRes as any).data ?? []);
    } finally {
      setLoading(false);
    }
  }

  const filteredReservations = reservations.filter((r) =>
    reservationFilter ? r.status === reservationFilter : true
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تأجير السيارات</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة الأسطول والحجوزات والفحوصات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(
            [
              { id: "dashboard", label: "لوحة التحكم" },
              { id: "fleet", label: "الأسطول" },
              { id: "reservations", label: "الحجوزات" },
              { id: "inspections", label: "الفحوصات" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : (
        <>
          {/* ── Dashboard ── */}
          {tab === "dashboard" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="إجمالي الأسطول" value={stats.fleet.total} color="blue" />
                <StatCard label="متاحة" value={stats.fleet.available} color="green" />
                <StatCard label="مؤجَّرة" value={stats.fleet.rented} color="red" />
                <StatCard label="محجوزة" value={stats.fleet.reserved} color="blue" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="استلام اليوم" value={stats.today.pickups} color="blue" />
                <StatCard label="إرجاع اليوم" value={stats.today.returns} color="orange" />
                <StatCard label="قيد الصيانة" value={stats.fleet.maintenance} color="orange" />
                <StatCard label="قيد الفحص" value={stats.fleet.inspection} color="yellow" />
              </div>

              {/* Fleet Grid */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">الأسطول</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {vehicles.map((v) => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-lg ${
                        VEHICLE_STATUS_COLORS[v.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <div className="font-bold text-sm">
                        {v.make} {v.model}
                      </div>
                      <div className="text-xs mt-0.5">{v.plateNumber || "—"}</div>
                      <div className="text-xs mt-1 font-medium">
                        {VEHICLE_STATUS_AR[v.status] ?? v.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Fleet ── */}
          {tab === "fleet" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">الأسطول ({vehicles.length})</h2>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowCategoryForm(true)}>
                    + فئة جديدة
                  </Button>
                  <Button size="sm" onClick={() => setShowVehicleForm(true)}>
                    + سيارة جديدة
                  </Button>
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="font-semibold text-sm text-gray-900">{cat.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {Number(cat.pricePerDay).toLocaleString("en-US")} ريال / يوم
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">السيارة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">اللوحة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الفئة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الكيلومترات</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">تغيير الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{v.make} {v.model}</div>
                          <div className="text-xs text-gray-400">{v.year} · {v.color}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{v.plateNumber || "—"}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {categories.find((c) => c.id === v.categoryId)?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {(v.mileage || 0).toLocaleString("en-US")} كم
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              VEHICLE_STATUS_COLORS[v.status] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {VEHICLE_STATUS_AR[v.status] ?? v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="text-xs border border-gray-200 rounded px-2 py-1"
                            value={v.status}
                            onChange={async (e) => {
                              await carRentalApi.updateVehicleStatus(v.id, { status: e.target.value });
                              loadAll();
                            }}
                          >
                            {Object.entries(VEHICLE_STATUS_AR).map(([k, val]) => (
                              <option key={k} value={k}>{val}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vehicles.length === 0 && (
                  <div className="text-center py-12 text-gray-400">لا توجد سيارات في الأسطول</div>
                )}
              </div>

              {showCategoryForm && (
                <CategoryForm
                  onSave={async (data) => {
                    await carRentalApi.createCategory(data);
                    setShowCategoryForm(false);
                    loadAll();
                  }}
                  onClose={() => setShowCategoryForm(false)}
                />
              )}

              {showVehicleForm && (
                <VehicleForm
                  categories={categories}
                  onSave={async (data) => {
                    await carRentalApi.createVehicle(data);
                    setShowVehicleForm(false);
                    loadAll();
                  }}
                  onClose={() => setShowVehicleForm(false)}
                />
              )}
            </div>
          )}

          {/* ── Reservations ── */}
          {tab === "reservations" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">الحجوزات ({reservations.length})</h2>
                <Button size="sm" onClick={() => setShowReservationForm(true)}>
                  + حجز جديد
                </Button>
              </div>

              {/* Filter */}
              <div className="flex gap-2 flex-wrap">
                {["", "pending", "confirmed", "picked_up", "returned", "cancelled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setReservationFilter(s)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      reservationFilter === s
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {s ? RESERVATION_STATUS_AR[s] : "الكل"}
                  </button>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">السائق</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">السيارة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الاستلام</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الإرجاع</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{res.driverName}</div>
                          <div className="text-xs text-gray-400">{res.driverPhone}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {(() => {
                            const v = vehicles.find((v) => v.id === res.vehicleUnitId);
                            return v ? `${v.make} ${v.model}` : (categories.find((c) => c.id === res.categoryId)?.name ?? "—");
                          })()}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {fmtDate(res.pickupDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {fmtDate(res.returnDate)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {Number(res.totalAmount).toLocaleString("en-US")} ريال
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {RESERVATION_STATUS_AR[res.status] ?? res.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {res.status === "confirmed" && (
                              <button
                                className="text-xs text-green-600 hover:underline"
                                onClick={async () => {
                                  await carRentalApi.pickup(res.id);
                                  loadAll();
                                }}
                              >
                                استلام
                              </button>
                            )}
                            {res.status === "picked_up" && (
                              <button
                                className="text-xs text-orange-600 hover:underline"
                                onClick={async () => {
                                  await carRentalApi.return(res.id);
                                  loadAll();
                                }}
                              >
                                إرجاع
                              </button>
                            )}
                            {["pending", "confirmed"].includes(res.status) && (
                              <button
                                className="text-xs text-red-500 hover:underline"
                                onClick={async () => {
                                  if (confirm("تأكيد الإلغاء؟")) {
                                    await carRentalApi.cancelReservation(res.id);
                                    loadAll();
                                  }
                                }}
                              >
                                إلغاء
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredReservations.length === 0 && (
                  <div className="text-center py-12 text-gray-400">لا توجد حجوزات</div>
                )}
              </div>

              {showReservationForm && (
                <RentalReservationForm
                  vehicles={vehicles.filter((v) => v.status === "available")}
                  categories={categories}
                  onSave={async (data) => {
                    await carRentalApi.createReservation(data);
                    setShowReservationForm(false);
                    loadAll();
                  }}
                  onClose={() => setShowReservationForm(false)}
                />
              )}
            </div>
          )}

          {/* ── Inspections ── */}
          {tab === "inspections" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">سجل الفحوصات</h2>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">السيارة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">نوع الفحص</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">تلف</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inspections.map((insp) => (
                      <tr key={insp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {(() => {
                            const v = vehicles.find((v) => v.id === insp.vehicleUnitId);
                            return v ? `${v.make} ${v.model} (${v.plateNumber || "—"})` : "—";
                          })()}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {{
                            pre_rental: "قبل التسليم",
                            post_rental: "بعد الإرجاع",
                            routine: "دوري",
                            damage: "تلف",
                          }[insp.inspectionType as string] ?? insp.inspectionType}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {fmtDate(insp.inspectedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {insp.hasDamage ? (
                            <span className="text-red-600 font-medium">نعم</span>
                          ) : (
                            <span className="text-green-600">لا</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                          {insp.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {inspections.length === 0 && (
                  <div className="text-center py-12 text-gray-400">لا توجد فحوصات مسجلة</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ──

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    yellow: "bg-yellow-50 text-yellow-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color] ?? "bg-gray-50 text-gray-700"}`}>
      <div className="text-2xl font-bold">{value ?? 0}</div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
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

function CategoryForm({ onSave, onClose }: { onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", pricePerDay: "", pricePerWeek: "", depositAmount: "", minRentalDays: 1 });
  return (
    <Modal title="فئة سيارة جديدة" onClose={onClose}>
      <div className="space-y-4">
        <Field label="اسم الفئة">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اقتصادي، دفع رباعي، فاخر..." />
        </Field>
        <Field label="السعر اليومي (ريال)">
          <input type="number" className="input" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} />
        </Field>
        <Field label="السعر الأسبوعي (ريال) — اختياري">
          <input type="number" className="input" value={form.pricePerWeek} onChange={(e) => setForm({ ...form, pricePerWeek: e.target.value })} />
        </Field>
        <Field label="مبلغ التأمين (ريال)">
          <input type="number" className="input" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
        </Field>
        <Field label="الحد الأدنى للأيام">
          <input type="number" className="input" value={form.minRentalDays} onChange={(e) => setForm({ ...form, minRentalDays: +e.target.value })} min={1} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave(form)}>حفظ</Button>
        </div>
      </div>
    </Modal>
  );
}

function VehicleForm({ categories, onSave, onClose }: { categories: any[]; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ categoryId: categories[0]?.id ?? "", make: "", model: "", year: new Date().getFullYear(), color: "", plateNumber: "", mileage: 0 });
  return (
    <Modal title="سيارة جديدة" onClose={onClose}>
      <div className="space-y-4">
        <Field label="الفئة">
          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">اختر الفئة</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الماركة">
            <input className="input" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="تويوتا، كيا..." />
          </Field>
          <Field label="الموديل">
            <input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="كامري، سبورتاج..." />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="السنة">
            <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} />
          </Field>
          <Field label="اللون">
            <input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="أبيض، أسود..." />
          </Field>
        </div>
        <Field label="رقم اللوحة">
          <input className="input" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} />
        </Field>
        <Field label="الكيلومترات الحالية">
          <input type="number" className="input" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: +e.target.value })} min={0} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave(form)}>حفظ</Button>
        </div>
      </div>
    </Modal>
  );
}

function RentalReservationForm({ vehicles, categories, onSave, onClose }: { vehicles: any[]; categories: any[]; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    driverName: "",
    driverPhone: "",
    driverIdNumber: "",
    pickupDate: "",
    returnDate: "",
    rentalDays: 1,
    vehicleUnitId: "",
    categoryId: categories[0]?.id ?? "",
    dailyRate: "",
    totalRentalCost: "",
    totalAmount: "",
    paymentStatus: "pending",
  });

  const calcDays = (p: string, r: string) => {
    if (!p || !r) return 1;
    const diff = new Date(r).getTime() - new Date(p).getTime();
    return Math.max(1, Math.round(diff / 86400000));
  };

  return (
    <Modal title="حجز تأجير جديد" onClose={onClose}>
      <div className="space-y-4">
        <Field label="اسم السائق">
          <input className="input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الجوال">
            <input className="input" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} />
          </Field>
          <Field label="رقم الهوية">
            <input className="input" value={form.driverIdNumber} onChange={(e) => setForm({ ...form, driverIdNumber: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="تاريخ الاستلام">
            <input type="date" className="input" value={form.pickupDate} onChange={(e) => {
              const d = calcDays(e.target.value, form.returnDate);
              const total = (parseFloat(form.dailyRate || "0") * d).toFixed(2);
              setForm({ ...form, pickupDate: e.target.value, rentalDays: d, totalRentalCost: total, totalAmount: total });
            }} />
          </Field>
          <Field label="تاريخ الإرجاع">
            <input type="date" className="input" value={form.returnDate} onChange={(e) => {
              const d = calcDays(form.pickupDate, e.target.value);
              const total = (parseFloat(form.dailyRate || "0") * d).toFixed(2);
              setForm({ ...form, returnDate: e.target.value, rentalDays: d, totalRentalCost: total, totalAmount: total });
            }} />
          </Field>
        </div>
        <Field label="السيارة (اختياري)">
          <select className="input" value={form.vehicleUnitId} onChange={(e) => setForm({ ...form, vehicleUnitId: e.target.value })}>
            <option value="">أي سيارة متاحة</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber || "—"})</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="السعر اليومي (ريال)">
            <input type="number" className="input" value={form.dailyRate} onChange={(e) => {
              const total = (parseFloat(e.target.value) * form.rentalDays).toFixed(2);
              setForm({ ...form, dailyRate: e.target.value, totalRentalCost: total, totalAmount: total });
            }} />
          </Field>
          <Field label="المجموع (ريال)">
            <input type="number" className="input" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value, totalRentalCost: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave(form)}>حفظ الحجز</Button>
        </div>
      </div>
    </Modal>
  );
}
