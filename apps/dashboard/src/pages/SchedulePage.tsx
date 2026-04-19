import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { useBusiness } from "@/hooks/useBusiness";
import { bookingsApi, staffApi } from "@/lib/api";
import { Clock, CalendarDays, CheckCircle2, XCircle, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

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
  return new Date(dateStr).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", month: "long", day: "numeric" });
}

// ─── Staff Column View ────────────────────────────────────────────────────────
// 30-minute slots from 8:00 to 21:00
const SLOTS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? "00" : "30";
  return { label: `${h}:${m}`, hour: h, min: Number(m) };
});

function StaffColumnView({
  bookings,
  staffList,
  onStatusChange,
}: {
  bookings: any[];
  staffList: any[];
  onStatusChange: (id: string, status: string) => void;
}) {
  // Build map: staffId → slot key → booking
  const byStaff: Record<string, Record<string, any>> = {};
  staffList.forEach((s) => { byStaff[s.id] = {}; });

  bookings.forEach((b) => {
    const dateField = b.eventDate ?? b.scheduledAt;
    if (!dateField) return;
    const dt  = new Date(dateField);
    const h   = dt.getHours();
    const m   = dt.getMinutes() < 30 ? 0 : 30;
    const key = `${h}:${String(m).padStart(2, "0")}`;
    const sid = b.assignedUserId ?? b.staffId ?? b.providerId ?? "__unassigned__";
    if (!byStaff[sid]) byStaff[sid] = {};
    byStaff[sid][key] = b;
  });

  const visibleStaff = staffList.filter((s) => s.status === "active" || !s.status);

  if (visibleStaff.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#eef2f6] text-center py-16">
        <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">لا يوجد موظفون نشطون</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[#eef2f6] bg-gray-50/60">
            <th className="w-16 shrink-0 px-3 py-3 text-xs text-gray-400 font-semibold text-center sticky right-0 bg-gray-50/60 border-l border-[#eef2f6]">
              الوقت
            </th>
            {visibleStaff.map((s) => (
              <th key={s.id} className="min-w-[140px] px-3 py-3 text-right">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">
                    {s.name?.[0] || "م"}
                  </div>
                  <span className="text-xs font-semibold text-gray-800 truncate">{s.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map(({ label, hour, min }) => {
            const key = `${hour}:${String(min).padStart(2, "0")}`;
            const hasAny = visibleStaff.some((s) => byStaff[s.id]?.[key]);
            return (
              <tr key={key} className={clsx("border-b border-gray-50 last:border-0", hasAny ? "bg-white" : "bg-gray-50/30")}>
                <td className="w-16 px-3 py-1.5 text-xs text-gray-400 tabular-nums text-center sticky right-0 bg-inherit border-l border-[#eef2f6]">
                  {label}
                </td>
                {visibleStaff.map((s) => {
                  const b = byStaff[s.id]?.[key];
                  if (!b) return <td key={s.id} className="min-w-[140px] px-2 py-1.5" />;
                  const colors: Record<string, string> = {
                    pending:     "bg-amber-50 border-r-amber-400 text-amber-800",
                    confirmed:   "bg-blue-50 border-r-blue-400 text-blue-800",
                    in_progress: "bg-violet-50 border-r-violet-400 text-violet-800",
                    completed:   "bg-emerald-50 border-r-emerald-400 text-emerald-800",
                    cancelled:   "bg-red-50 border-r-red-300 text-red-700 opacity-60",
                  };
                  return (
                    <td key={s.id} className="min-w-[140px] px-2 py-1.5">
                      <div className={clsx("border-r-4 rounded-lg px-2.5 py-1.5", colors[b.status] ?? "bg-gray-50 border-r-gray-300 text-gray-700")}>
                        <p className="text-xs font-semibold truncate">{b.customerName ?? b.customer?.name ?? "عميل"}</p>
                        {b.serviceName && <p className="text-[11px] opacity-70 truncate">{b.serviceName}</p>}
                        <div className="flex gap-1 mt-1">
                          {b.status === "confirmed" && (
                            <button
                              onClick={() => onStatusChange(b.id, "completed")}
                              className="text-[10px] bg-white/60 hover:bg-white rounded px-1.5 py-0.5 text-emerald-700 transition-colors"
                            >
                              مكتمل
                            </button>
                          )}
                          {!["cancelled", "completed"].includes(b.status) && (
                            <button
                              onClick={() => onStatusChange(b.id, "cancelled")}
                              className="text-[10px] bg-white/60 hover:bg-white rounded px-1.5 py-0.5 text-red-600 transition-colors"
                            >
                              إلغاء
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export function SchedulePage() {
  const biz = useBusiness();
  const today = new Date().toISOString().split("T")[0];
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "columns">("list");

  const { data, loading, error, refetch } = useApi(
    () => bookingsApi.list({ dateFrom: currentDate, dateTo: addDays(currentDate, 1), limit: "100" }),
    [currentDate]
  );
  const { data: staffData } = useApi(() => staffApi.list());
  const updateStatus = useMutation(({ id, status }: any) => bookingsApi.updateStatus(id, status));

  const allBookings: any[] = data?.data || [];
  const staffList: any[] = staffData?.data || [];

  // Build staff name map for display
  const staffMap: Record<string, string> = {};
  staffList.forEach((s: any) => { staffMap[s.id] = s.name; });

  const bookings = allBookings.filter((b: any) => {
    if (selectedStaff === "all") return true;
    return (b.assignedUserId ?? b.staffId) === selectedStaff;
  });

  // Group by hour
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8am to 9pm
  const bookingsByHour: Record<number, any[]> = {};
  bookings.forEach((b: any) => {
    const dateField = b.eventDate ?? b.scheduledAt;
    if (!dateField) return;
    const h = new Date(dateField).getHours();
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
            <Clock className="w-5 h-5 text-brand-500" /> {biz.terminology.schedule}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{formatDate(currentDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex gap-0.5 bg-[#f1f5f9] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={clsx("w-8 h-8 flex items-center justify-center rounded-md transition-colors", viewMode === "list" ? "bg-white shadow-sm text-brand-600" : "text-gray-400 hover:text-gray-600")}
              title="عرض القائمة"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("columns")}
              className={clsx("w-8 h-8 flex items-center justify-center rounded-md transition-colors", viewMode === "columns" ? "bg-white shadow-sm text-brand-600" : "text-gray-400 hover:text-gray-600")}
              title="عرض الكراسي"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(today)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", currentDate === today ? "bg-brand-500 text-white border-brand-500" : "border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]")}>
            اليوم
          </button>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `إجمالي ${biz.terminology.bookings}`, value: stats.total, color: "text-brand-500 bg-brand-50" },
          { label: "مؤكدة / جارية", value: stats.confirmed, color: "text-blue-600 bg-blue-50" },
          { label: "مكتملة", value: stats.completed, color: "text-green-600 bg-green-50" },
          { label: "ملغاة", value: stats.cancelled, color: "text-red-500 bg-red-50" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
            <p className={clsx("text-2xl font-bold tabular-nums", color.split(" ")[0])}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-600 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={refetch} className="mr-auto text-xs underline hover:no-underline">إعادة المحاولة</button>
        </div>
      )}

      {/* Staff filter — only in list view */}
      {viewMode === "list" && staffList.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedStaff("all")} className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors", selectedStaff === "all" ? "bg-brand-500 text-white" : "bg-white border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]")}>
            الكل
          </button>
          {staffList.map((s: any) => (
            <button key={s.id} onClick={() => setSelectedStaff(s.id)} className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors", selectedStaff === s.id ? "bg-brand-500 text-white" : "bg-white border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]")}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Staff column view — shows all chairs/staff in parallel */}
      {viewMode === "columns" && (
        loading
          ? <SkeletonRows />
          : <StaffColumnView bookings={allBookings} staffList={staffList} onStatusChange={handleStatus} />
      )}

      {/* List Schedule */}
      {viewMode === "list" && (loading ? (
        <SkeletonRows />
      ) : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">{biz.terminology.bookingEmpty} في هذا اليوم</p>
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
                                {new Date(b.eventDate ?? b.scheduledAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {b.serviceName && <span className="text-xs text-gray-500">{b.serviceName}{b.durationMinutes ? ` (${b.durationMinutes} د)` : ""}</span>}
                              {staffMap[b.assignedUserId ?? b.staffId] && <span className="text-xs text-brand-500">· {staffMap[b.assignedUserId ?? b.staffId]}</span>}
                              <span className="text-xs text-gray-400">{STATUS_LABELS[b.status] || b.status}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {b.status === "confirmed" && (
                              <button onClick={() => handleStatus(b.id, "completed")} className="w-9 h-9 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors" title="مكتمل">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!["cancelled", "completed"].includes(b.status) && (
                              <button onClick={() => handleStatus(b.id, "cancelled")} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="إلغاء">
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
      ))}
    </div>
  );
}
