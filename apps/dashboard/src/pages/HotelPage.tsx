import { useState, useEffect } from "react";
import { hotelApi } from "../lib/api";
import { toast } from "@/hooks/useToast";
import { Button } from "../components/ui";
import { SkeletonRows } from "@/components/ui/Skeleton";

type Tab = "dashboard" | "rooms" | "reservations" | "housekeeping" | "pricing";

const ROOM_STATUS_AR: Record<string, string> = {
  available: "متاحة",
  occupied: "مشغولة",
  reserved: "محجوزة",
  cleaning: "قيد التنظيف",
  maintenance: "صيانة",
  out_of_service: "خارج الخدمة",
};

const RESERVATION_STATUS_AR: Record<string, string> = {
  pending: "انتظار",
  confirmed: "مؤكد",
  checked_in: "تسجيل دخول",
  checked_out: "تسجيل خروج",
  cancelled: "ملغي",
  no_show: "لم يحضر",
  completed: "مكتمل",
};

const ROOM_STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-red-100 text-red-800",
  reserved: "bg-blue-100 text-blue-800",
  cleaning: "bg-yellow-100 text-yellow-800",
  maintenance: "bg-orange-100 text-orange-800",
  out_of_service: "bg-gray-100 text-gray-600",
};

export default function HotelPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [housekeeping, setHousekeeping] = useState<any[]>([]);
  const [seasonalPricing, setSeasonalPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showRoomTypeForm, setShowRoomTypeForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [reservationFilter, setReservationFilter] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, roomsRes, typesRes, resRes, hkRes, spRes] = await Promise.all([
        hotelApi.dashboardStats().catch(() => ({ data: null })),
        hotelApi.rooms().catch(() => ({ data: [] })),
        hotelApi.roomTypes().catch(() => ({ data: [] })),
        hotelApi.reservations().catch(() => ({ data: [], total: 0 })),
        hotelApi.housekeeping().catch(() => ({ data: [] })),
        hotelApi.seasonalPricing().catch(() => ({ data: [] })),
      ]);
      setStats((statsRes as any).data);
      setRooms((roomsRes as any).data ?? []);
      setRoomTypes((typesRes as any).data ?? []);
      setReservations((resRes as any).data ?? []);
      setHousekeeping((hkRes as any).data ?? []);
      setSeasonalPricing((spRes as any).data ?? []);
    } finally {
      setLoading(false);
    }
  }

  const filteredReservations = reservations.filter((r) =>
    reservationFilter
      ? r.status === reservationFilter
      : true
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الفندق</h1>
          <p className="text-sm text-gray-500 mt-1">الغرف والحجوزات والتدبير المنزلي</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(
            [
              { id: "dashboard", label: "لوحة التحكم" },
              { id: "rooms", label: "الغرف" },
              { id: "reservations", label: "الحجوزات" },
              { id: "housekeeping", label: "التدبير المنزلي" },
              { id: "pricing", label: "الأسعار الموسمية" },
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
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="إجمالي الغرف" value={stats.rooms.total} color="blue" />
                <StatCard label="متاحة" value={stats.rooms.available} color="green" />
                <StatCard label="مشغولة" value={stats.rooms.occupied} color="red" />
                <StatCard label="قيد التنظيف" value={stats.rooms.cleaning} color="yellow" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="وصول اليوم" value={stats.today.checkIns} color="blue" />
                <StatCard label="مغادرة اليوم" value={stats.today.checkOuts} color="orange" />
                <StatCard label="تنظيف معلق" value={stats.today.pendingHousekeeping} color="yellow" />
                <StatCard label="حجوزات مؤكدة" value={stats.reservations.confirmed} color="green" />
              </div>

              {/* Room Grid */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">خريطة الغرف</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`p-2 rounded-lg text-center text-xs font-medium ${
                        ROOM_STATUS_COLORS[room.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <div className="font-bold">{room.roomNumber}</div>
                      <div className="truncate">{ROOM_STATUS_AR[room.status] ?? room.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Rooms ── */}
          {tab === "rooms" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">الغرف ({rooms.length})</h2>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowRoomTypeForm(true)}>
                    + نوع غرفة جديد
                  </Button>
                  <Button size="sm" onClick={() => setShowRoomForm(true)}>
                    + غرفة جديدة
                  </Button>
                </div>
              </div>

              {/* Room Types */}
              {roomTypes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {roomTypes.map((rt) => (
                    <div key={rt.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="font-semibold text-gray-900">{rt.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {Number(rt.pricePerNight).toLocaleString("ar-SA")} ريال / ليلة
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        حد أقصى {rt.maxOccupancy} أشخاص
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rooms Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الغرفة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الطابق</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">النوع</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{room.roomNumber}</td>
                        <td className="px-4 py-3 text-gray-500">{room.floor ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {roomTypes.find((t) => t.id === room.roomTypeId)?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              ROOM_STATUS_COLORS[room.status] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {ROOM_STATUS_AR[room.status] ?? room.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="text-xs border border-gray-200 rounded px-2 py-1"
                            value={room.status}
                            onChange={async (e) => {
                              await hotelApi.updateRoomStatus(room.id, { status: e.target.value });
                              loadAll();
                            }}
                          >
                            {Object.entries(ROOM_STATUS_AR).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rooms.length === 0 && (
                  <div className="text-center py-12 text-gray-400">لا توجد غرف بعد</div>
                )}
              </div>

              {/* Room Form Modal */}
              {showRoomForm && (
                <RoomForm
                  roomTypes={roomTypes}
                  onSave={async (data) => {
                    await hotelApi.createRoom(data);
                    setShowRoomForm(false);
                    loadAll();
                  }}
                  onClose={() => setShowRoomForm(false)}
                />
              )}

              {showRoomTypeForm && (
                <RoomTypeForm
                  onSave={async (data) => {
                    await hotelApi.createRoomType(data);
                    setShowRoomTypeForm(false);
                    loadAll();
                  }}
                  onClose={() => setShowRoomTypeForm(false)}
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
                {["", "pending", "confirmed", "checked_in", "checked_out", "cancelled"].map((s) => (
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
                      <th className="px-4 py-3 text-right font-medium text-gray-600">النزيل</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الغرفة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الوصول</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المغادرة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{res.guestName}</div>
                          <div className="text-xs text-gray-400">{res.guestPhone}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {rooms.find((r) => r.id === res.roomUnitId)?.roomNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(res.checkInDate).toLocaleDateString("ar-SA")}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(res.checkOutDate).toLocaleDateString("ar-SA")}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {Number(res.totalAmount).toLocaleString("ar-SA")} ريال
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
                                  await hotelApi.checkIn(res.id);
                                  loadAll();
                                }}
                              >
                                دخول
                              </button>
                            )}
                            {res.status === "checked_in" && (
                              <button
                                className="text-xs text-orange-600 hover:underline"
                                onClick={async () => {
                                  await hotelApi.checkOut(res.id);
                                  loadAll();
                                }}
                              >
                                خروج
                              </button>
                            )}
                            {["pending", "confirmed"].includes(res.status) && (
                              <button
                                className="text-xs text-red-500 hover:underline"
                                onClick={async () => {
                                  if (confirm("تأكيد الإلغاء؟")) {
                                    await hotelApi.cancelReservation(res.id);
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
                <ReservationForm
                  rooms={rooms.filter((r) => r.status === "available")}
                  roomTypes={roomTypes}
                  onSave={async (data) => {
                    await hotelApi.createReservation(data);
                    setShowReservationForm(false);
                    loadAll();
                  }}
                  onClose={() => setShowReservationForm(false)}
                />
              )}
            </div>
          )}

          {/* ── Housekeeping ── */}
          {tab === "housekeeping" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">مهام التدبير المنزلي</h2>
                <Button
                  size="sm"
                  onClick={async () => {
                    const room = rooms.find((r) => r.status === "cleaning");
                    if (!room) { toast.error("لا توجد غرف قيد التنظيف"); return; }
                    await hotelApi.createHousekeeping({
                      roomUnitId: room.id,
                      taskType: "cleaning",
                      priority: "normal",
                    });
                    loadAll();
                  }}
                >
                  + مهمة تنظيف
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {housekeeping.map((task) => (
                  <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          غرفة {rooms.find((r) => r.id === task.roomUnitId)?.roomNumber ?? "—"}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {task.taskType === "cleaning" ? "تنظيف" : task.taskType}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : task.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {task.status === "pending"
                          ? "معلق"
                          : task.status === "in_progress"
                          ? "جاري"
                          : task.status === "completed"
                          ? "مكتمل"
                          : task.status}
                      </span>
                    </div>
                    {task.status !== "completed" && (
                      <div className="mt-3 flex gap-2">
                        {task.status === "pending" && (
                          <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={async () => {
                              await hotelApi.updateHousekeepingStatus(task.id, {
                                status: "in_progress",
                              });
                              loadAll();
                            }}
                          >
                            بدء التنظيف
                          </button>
                        )}
                        {task.status === "in_progress" && (
                          <button
                            className="text-xs text-green-600 hover:underline"
                            onClick={async () => {
                              await hotelApi.updateHousekeepingStatus(task.id, {
                                status: "inspected",
                              });
                              loadAll();
                            }}
                          >
                            اعتماد وإتاحة الغرفة
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {housekeeping.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-400">لا توجد مهام تنظيف</div>
                )}
              </div>
            </div>
          )}

          {/* ── Seasonal Pricing ── */}
          {tab === "pricing" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">الأسعار الموسمية</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seasonalPricing.map((sp) => (
                  <div key={sp.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900">{sp.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(sp.startDate).toLocaleDateString("ar-SA")} ←{" "}
                      {new Date(sp.endDate).toLocaleDateString("ar-SA")}
                    </div>
                    <div className="text-lg font-bold text-blue-600 mt-2">
                      {Number(sp.pricePerNight).toLocaleString("ar-SA")} ريال / ليلة
                    </div>
                    <button
                      className="mt-2 text-xs text-red-500 hover:underline"
                      onClick={async () => {
                        if (confirm("حذف هذا السعر الموسمي؟")) {
                          await hotelApi.deleteSeasonalPricing(sp.id);
                          loadAll();
                        }
                      }}
                    >
                      حذف
                    </button>
                  </div>
                ))}
                {seasonalPricing.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-400">
                    لا توجد أسعار موسمية
                  </div>
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

function RoomTypeForm({ onSave, onClose }: { onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", maxOccupancy: 2, pricePerNight: "", bedType: "" });
  return (
    <Modal title="نوع غرفة جديد" onClose={onClose}>
      <div className="space-y-4">
        <Field label="اسم النوع">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ديلوكس، سويت، استوديو..." />
        </Field>
        <Field label="الحد الأقصى للأشخاص">
          <input type="number" className="input" value={form.maxOccupancy} onChange={(e) => setForm({ ...form, maxOccupancy: +e.target.value })} min={1} />
        </Field>
        <Field label="السعر الأساسي / ليلة (ريال)">
          <input type="number" className="input" value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })} />
        </Field>
        <Field label="نوع السرير (اختياري)">
          <input className="input" value={form.bedType} onChange={(e) => setForm({ ...form, bedType: e.target.value })} placeholder="سرير كبير، سريران..." />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave(form)}>حفظ</Button>
        </div>
      </div>
    </Modal>
  );
}

function RoomForm({ roomTypes, onSave, onClose }: { roomTypes: any[]; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ roomNumber: "", floor: "", building: "", roomTypeId: roomTypes[0]?.id ?? "" });
  return (
    <Modal title="غرفة جديدة" onClose={onClose}>
      <div className="space-y-4">
        <Field label="رقم الغرفة">
          <input className="input" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="101، 202..." />
        </Field>
        <Field label="نوع الغرفة">
          <select className="input" value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}>
            <option value="">اختر النوع</option>
            {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="الطابق (اختياري)">
          <input className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="1، 2..." />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave(form)}>حفظ</Button>
        </div>
      </div>
    </Modal>
  );
}

function ReservationForm({ rooms, roomTypes, onSave, onClose }: { rooms: any[]; roomTypes: any[]; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    checkInDate: "",
    checkOutDate: "",
    nights: 1,
    roomUnitId: "",
    pricePerNight: "",
    totalAmount: "",
    paymentStatus: "pending",
  });

  const calcNights = (ci: string, co: string) => {
    if (!ci || !co) return 1;
    const diff = new Date(co).getTime() - new Date(ci).getTime();
    return Math.max(1, Math.round(diff / 86400000));
  };

  return (
    <Modal title="حجز جديد" onClose={onClose}>
      <div className="space-y-4">
        <Field label="اسم النزيل">
          <input className="input" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} />
        </Field>
        <Field label="الجوال">
          <input className="input" value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="تاريخ الوصول">
            <input type="date" className="input" value={form.checkInDate} onChange={(e) => {
              const n = calcNights(e.target.value, form.checkOutDate);
              setForm({ ...form, checkInDate: e.target.value, nights: n });
            }} />
          </Field>
          <Field label="تاريخ المغادرة">
            <input type="date" className="input" value={form.checkOutDate} onChange={(e) => {
              const n = calcNights(form.checkInDate, e.target.value);
              setForm({ ...form, checkOutDate: e.target.value, nights: n });
            }} />
          </Field>
        </div>
        <Field label="الغرفة">
          <select className="input" value={form.roomUnitId} onChange={(e) => setForm({ ...form, roomUnitId: e.target.value })}>
            <option value="">اختر الغرفة</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>غرفة {r.roomNumber}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="السعر / ليلة">
            <input type="number" className="input" value={form.pricePerNight} onChange={(e) => {
              const total = (parseFloat(e.target.value) * form.nights).toFixed(2);
              setForm({ ...form, pricePerNight: e.target.value, totalAmount: total });
            }} />
          </Field>
          <Field label="المجموع">
            <input type="number" className="input" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
