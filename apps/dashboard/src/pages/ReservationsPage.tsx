import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { bookingsApi, customersApi } from "@/lib/api";
import { Armchair, Plus, Search, X, CalendarDays, Clock, Users } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

const STATUS_LABELS: Record<string, string> = { pending: "قيد الانتظار", confirmed: "مؤكد", cancelled: "ملغي", completed: "مكتمل" };
const STATUS_COLORS: Record<string, string> = { pending: "bg-yellow-50 text-yellow-700", confirmed: "bg-green-50 text-green-700", cancelled: "bg-red-50 text-red-600", completed: "bg-gray-100 text-gray-500" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ReservationsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", date: today, time: "19:00", tableNumber: "", guests: "2", notes: "" });

  const { data, loading, refetch } = useApi(
    () => bookingsApi.list(dateFilter ? { date: dateFilter } : {}),
    [dateFilter]
  );
  const { data: custData } = useApi(() => customersApi.list());
  const createBooking = useMutation((d: any) => bookingsApi.create(d));
  const updateStatus = useMutation(({ id, status }: any) => bookingsApi.updateStatus(id, status));

  const bookings = (data?.data || []).filter((b: any) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchSearch = !search || b.customerName?.includes(search) || b.customerPhone?.includes(search);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b: any) => b.status === "confirmed").length,
    pending: bookings.filter((b: any) => b.status === "pending").length,
    guests: bookings.reduce((sum: number, b: any) => sum + (parseInt(b.guestCount || b.guests || 0)), 0),
  };

  const handleCreate = async () => {
    if (!form.customerName || !form.date || !form.time) return;
    await createBooking.mutate({
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      scheduledAt: `${form.date}T${form.time}:00`,
      notes: `طاولة رقم ${form.tableNumber} - ${form.guests} أشخاص${form.notes ? " - " + form.notes : ""}`,
      source: "walk_in",
    });
    setModalOpen(false);
    refetch();
  };

  const handleStatus = async (id: string, status: string) => {
    await updateStatus.mutate({ id, status });
    refetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Armchair className="w-5 h-5 text-brand-500" /> حجز الطاولات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{bookings.length} حجز اليوم</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" /> حجز جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الحجوزات", value: stats.total, icon: Armchair, color: "text-brand-500 bg-brand-50" },
          { label: "مؤكدة", value: stats.confirmed, icon: CalendarDays, color: "text-green-600 bg-green-50" },
          { label: "قيد الانتظار", value: stats.pending, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
          { label: "إجمالي الضيوف", value: stats.guests, icon: Users, color: "text-purple-600 bg-purple-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300" />
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="bg-transparent outline-none text-sm text-gray-700 w-32" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[["all", "الكل"], ["pending", "انتظار"], ["confirmed", "مؤكد"], ["cancelled", "ملغي"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", statusFilter === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonRows />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <Armchair className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد حجوزات لهذا التاريخ</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-50">
                <tr className="text-right">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">العميل</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">الوقت</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">الملاحظات</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">الحالة</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{b.customerName || b.customer?.name || "—"}</p>
                      <p className="text-xs text-gray-400">{b.customerPhone || b.customer?.phone || ""}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 tabular-nums">
                      {b.scheduledAt ? new Date(b.scheduledAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">{b.notes || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={clsx("px-2 py-1 rounded-lg text-xs font-medium", STATUS_COLORS[b.status] || "bg-gray-100 text-gray-500")}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        {b.status === "pending" && (
                          <button onClick={() => handleStatus(b.id, "confirmed")} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs hover:bg-green-100 transition-colors">تأكيد</button>
                        )}
                        {b.status !== "cancelled" && b.status !== "completed" && (
                          <button onClick={() => handleStatus(b.id, "cancelled")} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors">إلغاء</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modalOpen && (
        <Modal title="حجز طاولة جديد" onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم العميل</label>
                <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="اسم الضيف" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">رقم الهاتف</label>
                <input value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="05x" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">عدد الأشخاص</label>
                <input type="number" value={form.guests} onChange={e => setForm(p => ({ ...p, guests: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" min="1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">التاريخ</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الوقت</label>
                <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">رقم الطاولة</label>
                <input value={form.tableNumber} onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: 5" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 resize-none" placeholder="طلبات خاصة..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={createBooking.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">حجز</button>
              <button onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
