import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, CalendarCheck, Clock, CheckCircle, XCircle, Banknote, Loader2, AlertCircle, Phone, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { CreateBookingForm } from "@/components/bookings/CreateBookingForm";

const pipelineTabs = [
  { key: "all", label: "الكل", color: "gray" },
  { key: "pending", label: "بانتظار التأكيد", color: "amber" },
  { key: "confirmed", label: "مؤكد", color: "blue" },
  { key: "in_progress", label: "قيد التنفيذ", color: "purple" },
  { key: "completed", label: "مكتمل", color: "green" },
  { key: "cancelled", label: "ملغي", color: "red" },
];

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  pending: { label: "بانتظار التأكيد", class: "bg-amber-50 text-amber-600", icon: Clock },
  confirmed: { label: "مؤكد", class: "bg-blue-50 text-blue-600", icon: CheckCircle },
  in_progress: { label: "قيد التنفيذ", class: "bg-purple-50 text-purple-600", icon: CalendarCheck },
  completed: { label: "مكتمل", class: "bg-green-50 text-green-600", icon: CheckCircle },
  cancelled: { label: "ملغي", class: "bg-red-50 text-red-500", icon: XCircle },
};

const paymentConfig: Record<string, { label: string; class: string }> = {
  unpaid: { label: "غير مدفوع", class: "bg-red-50 text-red-500" },
  partial: { label: "دفع جزئي", class: "bg-amber-50 text-amber-600" },
  paid: { label: "مدفوع بالكامل", class: "bg-green-50 text-green-600" },
  refunded: { label: "مسترد", class: "bg-gray-100 text-gray-500" },
};

export function BookingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const params: Record<string, string> = {};
  if (activeTab !== "all") params.status = activeTab;
  if (search) params.search = search;

  const { data: bookingsRes, loading, error, refetch } = useApi(() => bookingsApi.list(params), [activeTab, search]);
  const { data: statsRes } = useApi(() => bookingsApi.stats(), []);

  const bookings = bookingsRes?.data || [];
  const stats = statsRes?.data || {};

  const handleCreated = () => { setShowCreate(false); refetch(); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
      <span className="mr-3 text-sm text-gray-400">جاري التحميل...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الحجوزات</h1>
          <p className="text-sm text-gray-400 mt-0.5">{bookings.length} حجز</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" /> حجز جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الحجوزات", value: stats.total || bookings.length, color: "text-brand-600" },
          { label: "الإيرادات", value: `${Number(stats.revenue || 0).toLocaleString()} ر.س`, color: "text-emerald-600" },
          { label: "بانتظار التأكيد", value: stats.pending || 0, color: "text-amber-600" },
          { label: "معدل الإلغاء", value: `${stats.cancellationRate || 0}%`, color: "text-red-500" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1 overflow-x-auto">
        {pipelineTabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "flex-1 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap px-3 min-w-fit",
              activeTab === tab.key ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}>{tab.label}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث برقم الحجز أو اسم العميل..."
          className="w-full bg-white border border-gray-100 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all" />
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد حجوزات</h3>
          <p className="text-sm text-gray-400 mb-4">أنشئ أول حجز لك</p>
          <button onClick={() => setShowCreate(true)}
            className="bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-4 h-4 inline ml-1" /> حجز جديد
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {bookings.map((booking: any, idx: number) => {
            const sc = statusConfig[booking.status] || statusConfig.pending;
            const pc = paymentConfig[booking.paymentStatus] || paymentConfig.unpaid;
            return (
              <div
                key={booking.id}
                onClick={() => navigate("/dashboard/bookings/" + booking.id)}
                className={clsx(
                  "flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/80 transition-colors",
                  idx < bookings.length - 1 && "border-b border-gray-50"
                )}
              >
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", sc.class)}>
                  <sc.icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{booking.customerName || booking.customer?.name || "عميل"}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>#{booking.bookingNumber || booking.id?.substring(0, 8)}</span>
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="w-3 h-3" />
                      {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString("ar-SA") : "—"}
                    </span>
                    {booking.locationName && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.locationName}</span>
                    )}
                    {booking.customerPhone && (
                      <span className="hidden md:flex items-center gap-1"><Phone className="w-3 h-3" />{booking.customerPhone}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-gray-900 tabular-nums">
                    {Number(booking.totalAmount || 0).toLocaleString()} ر.س
                  </span>
                  <div className="flex gap-1.5">
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-medium", sc.class)}>{sc.label}</span>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-medium", pc.class)}>{pc.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateBookingForm open={true} onClose={() => setShowCreate(false)} onSuccess={handleCreated} />}
    </div>
  );
}
