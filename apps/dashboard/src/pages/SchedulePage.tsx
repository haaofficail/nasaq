import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { bookingsApi, staffApi } from "@/lib/api";
import { Clock, CalendarDays, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

const STATUS_COLORS: Record<string, string> = {
  pending: "border-r-yellow-400 bg-yellow-50",
  confirmed: "border-r-brand-400 bg-brand-50",
  in_progress: "border-r-blue-400 bg-blue-50",
  completed: "border-r-green-400 bg-green-50",
  cancelled: "border-r-red-300 bg-red-50 opacity-60",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار", confirmed: "مؤكد", in_progress: "جارٍ", completed: "مكتمل", cancelled: "ملغي",
};

function addDays(date: string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric" });
}

export function SchedulePage() {
  const today = new Date().toISOString().split("T")[0];
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedStaff, setSelectedStaff] = useState("all");

  const { data, loading, refetch } = useApi(
    () => bookingsApi.list({ date: currentDate, limit: "100" }),
    [currentDate]
  );
  const { data: staffData } = useApi(() => staffApi.list ? staffApi.list() : Promise.resolve({ data: [] }));
  const updateStatus = useMutation(({ id, status }: any) => bookingsApi.updateStatus(id, status));

  const allBookings: any[] = data?.data || [];
  const staffList: any[] = staffData?.data || [];

  const bookings = allBookings.filter((b: any) => {
    if (selectedStaff === "all") return true;
    return b.staffId === selectedStaff || b.providerId === selectedStaff;
  });

  // Group by hour
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8am to 9pm
  const bookingsByHour: Record<number, any[]> = {};
  bookings.forEach((b: any) => {
    if (!b.scheduledAt) return;
    const h = new Date(b.scheduledAt).getHours();
    if (!bookingsByHour[h]) bookingsByHour[h] = [];
    bookingsByHour[h].push(b);
  });

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b: any) => ["confirmed", "in_progress"].includes(b.status)).length,
    completed: bookings.filter((b: any) => b.status === "completed").length,
    cancelled: bookings.filter((b: any) => b.status === "cancelled").length,
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
            <Clock className="w-5 h-5 text-brand-500" /> جدول المواعيد
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{formatDate(currentDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(today)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", currentDate === today ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
            اليوم
          </button>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي المواعيد", value: stats.total, color: "text-brand-500 bg-brand-50" },
          { label: "مؤكدة / جارية", value: stats.confirmed, color: "text-blue-600 bg-blue-50" },
          { label: "مكتملة", value: stats.completed, color: "text-green-600 bg-green-50" },
          { label: "ملغاة", value: stats.cancelled, color: "text-red-500 bg-red-50" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className={clsx("text-2xl font-bold tabular-nums", color.split(" ")[0])}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Staff filter */}
      {staffList.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedStaff("all")} className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors", selectedStaff === "all" ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
            الكل
          </button>
          {staffList.map((s: any) => (
            <button key={s.id} onClick={() => setSelectedStaff(s.id)} className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors", selectedStaff === s.id ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Schedule */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">لا توجد مواعيد في هذا اليوم</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {hours.map(hour => {
                const hourBookings = bookingsByHour[hour] || [];
                if (hourBookings.length === 0 && Object.keys(bookingsByHour).length > 0) return null;
                return (
                  <div key={hour} className="flex gap-0">
                    <div className="w-16 shrink-0 px-4 py-3 text-xs text-gray-400 tabular-nums text-center border-l border-gray-50">
                      {hour}:00
                    </div>
                    <div className="flex-1 py-2 px-3 space-y-2 min-h-[48px]">
                      {hourBookings.map((b: any) => (
                        <div key={b.id} className={clsx("border-r-4 rounded-xl px-4 py-3 flex items-start justify-between gap-3", STATUS_COLORS[b.status] || "border-r-gray-300 bg-gray-50")}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-sm truncate">{b.customerName || b.customer?.name || "عميل"}</p>
                              <span className="text-xs text-gray-400 tabular-nums shrink-0">
                                {new Date(b.scheduledAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {b.serviceName && <span className="text-xs text-gray-500">{b.serviceName}</span>}
                              {b.staffName && <span className="text-xs text-brand-500">· {b.staffName}</span>}
                              <span className="text-xs text-gray-400">{STATUS_LABELS[b.status] || b.status}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {b.status === "confirmed" && (
                              <button onClick={() => handleStatus(b.id, "completed")} className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors" title="مكتمل">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!["cancelled", "completed"].includes(b.status) && (
                              <button onClick={() => handleStatus(b.id, "cancelled")} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="إلغاء">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
