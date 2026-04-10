import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import {
  Plus, CalendarCheck, Clock, CheckCircle, XCircle, Banknote,
  Phone, Search, AlertTriangle, X, Scissors, ChevronRight,
  CalendarDays, Filter, ArrowUpDown,
} from "lucide-react";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { CreateBookingForm } from "@/components/bookings/CreateBookingForm";
import { Button, confirmDialog } from "@/components/ui";
import { useBusiness } from "@/hooks/useBusiness";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric", month: "short",
  });
}
function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("ar-SA-u-ca-gregory-nu-latn", {
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  pending:     { label: "بانتظار التأكيد", dot: "bg-amber-400",  text: "text-amber-700"  },
  confirmed:   { label: "مؤكد",           dot: "bg-blue-400",   text: "text-blue-700"   },
  in_progress: { label: "قيد التنفيذ",    dot: "bg-violet-400", text: "text-violet-700" },
  completed:   { label: "مكتمل",          dot: "bg-green-400",  text: "text-green-700"  },
  cancelled:   { label: "ملغي",           dot: "bg-red-400",    text: "text-red-600"    },
  no_show:     { label: "لم يحضر",        dot: "bg-gray-400",   text: "text-gray-600"   },
};

const PIPELINE_TABS = [
  { key: "all",         label: "الكل" },
  { key: "pending",     label: "بانتظار" },
  { key: "confirmed",   label: "مؤكد" },
  { key: "in_progress", label: "جاري" },
  { key: "completed",   label: "مكتمل" },
  { key: "cancelled",   label: "ملغي" },
];

// ── Date quick-filters ────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}
function getDateRange(preset: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (preset === "today") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { dateFrom: s.toISOString(), dateTo: e.toISOString() };
  }
  if (preset === "tomorrow") {
    const s = new Date(now); s.setDate(s.getDate() + 1); s.setHours(0, 0, 0, 0);
    const e = new Date(s); e.setHours(23, 59, 59, 999);
    return { dateFrom: s.toISOString(), dateTo: e.toISOString() };
  }
  if (preset === "week") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999);
    return { dateFrom: s.toISOString(), dateTo: e.toISOString() };
  }
  return {};
}

const DATE_PRESETS = [
  { key: "all",      label: "كل الأوقات" },
  { key: "today",    label: "اليوم" },
  { key: "tomorrow", label: "غداً" },
  { key: "week",     label: "هذا الأسبوع" },
];

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", cfg.text, "bg-white border border-current/20")}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-2xl", className)} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function BookingsPage() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const biz          = useBusiness();

  const [activeTab,   setActiveTab]   = useState("all");
  const [datePreset,  setDatePreset]  = useState("all");
  const [search,      setSearch]      = useState("");
  const [showCreate,  setShowCreate]  = useState(() => location.pathname.endsWith("/new"));
  const [showFilters, setShowFilters] = useState(false);

  // Quick-action modals
  const [confirmModal, setConfirmModal] = useState<string | null>(null);
  const [cancelModal,  setCancelModal]  = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Build query params
  const params: Record<string, string> = {};
  if (activeTab !== "all") params.status = activeTab;
  if (search) params.search = search;
  const dateRange = getDateRange(datePreset);
  if (dateRange.dateFrom) params.dateFrom = dateRange.dateFrom;
  if (dateRange.dateTo)   params.dateTo   = dateRange.dateTo;

  const { data: bookingsRes, loading, error, refetch } = useApi(
    () => bookingsApi.list(params),
    [activeTab, search, datePreset]
  );

  const bookings: any[] = bookingsRes?.data || [];
  const today = bookings.filter((b: any) => {
    const d = b.eventDate ?? b.createdAt;
    if (!d) return false;
    const bd = new Date(d).toDateString();
    return bd === new Date().toDateString();
  });

  // ── Actions ──────────────────────────────────────────────────────────────────

  const doConfirm = async () => {
    if (!confirmModal) return;
    setActionLoading(confirmModal);
    try {
      await bookingsApi.updateStatus(confirmModal, "confirmed");
      toast.success("تم تأكيد الموعد");
      refetch();
    } catch { toast.error("فشل التأكيد"); }
    finally { setActionLoading(null); setConfirmModal(null); }
  };

  const doStart = async (id: string) => {
    setActionLoading(id + "_start");
    try {
      await bookingsApi.updateStatus(id, "in_progress");
      toast.success("بدأت الخدمة");
      refetch();
    } catch { toast.error("فشل تحديث الحالة"); }
    finally { setActionLoading(null); }
  };

  const doComplete = async (id: string) => {
    setActionLoading(id + "_complete");
    try {
      await bookingsApi.updateStatus(id, "completed");
      toast.success("اكتملت الخدمة — تم خصم المخزون");
      refetch();
    } catch { toast.error("فشل إكمال الحجز"); }
    finally { setActionLoading(null); }
  };

  const doCancel = async () => {
    if (!cancelModal) return;
    setActionLoading(cancelModal + "_cancel");
    try {
      await bookingsApi.updateStatus(cancelModal, "cancelled", cancelReason || undefined);
      toast.success("تم إلغاء الموعد");
      refetch();
    } catch { toast.error("فشل الإلغاء"); }
    finally { setActionLoading(null); setCancelModal(null); setCancelReason(""); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="space-y-4 pb-24 md:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{biz.terminology.bookings}</h1>
          <p className="text-xs text-gray-400 mt-0.5">إدارة المواعيد والمتابعة</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)} className="shrink-0">
          {biz.terminology.newBooking}
        </Button>
      </div>

      {/* Stats strip — mobile friendly 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "إجمالي المواعيد",    value: bookings.length,                                                          color: "text-brand-600",   bg: "bg-brand-50"   },
          { label: "بانتظار التأكيد",    value: bookings.filter((b: any) => b.status === "pending").length,                color: "text-amber-600",   bg: "bg-amber-50"   },
          { label: "مكتملة",              value: bookings.filter((b: any) => b.status === "completed").length,              color: "text-green-600",   bg: "bg-green-50"   },
          { label: "إجمالي الإيرادات",   value: bookings.reduce((s: number, b: any) => s + Number(b.totalAmount || 0), 0).toLocaleString("en-US") + " ر.س",
                                                                                                                             color: "text-violet-600",  bg: "bg-violet-50"  },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Date preset bar */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 overflow-x-auto scrollbar-hide">
        {DATE_PRESETS.map(dp => (
          <button
            key={dp.key}
            onClick={() => setDatePreset(dp.key)}
            className={clsx(
              "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
              datePreset === dp.key
                ? "bg-brand-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50",
            )}
          >
            {dp.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 overflow-x-auto scrollbar-hide">
        {PIPELINE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
              activeTab === tab.key
                ? "bg-brand-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
        <input
          className="w-full bg-white border border-gray-200 rounded-2xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 placeholder:text-gray-300 transition-all"
          placeholder="بحث بالاسم أو الجوال أو رقم الحجز أو الخدمة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          dir="rtl"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={refetch} className="text-xs text-red-500 underline shrink-0">إعادة المحاولة</button>
        </div>
      )}

      {/* Booking list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد مواعيد</h3>
          <p className="text-sm text-gray-400 mb-4">أضف موعداً جديداً لعميلتك</p>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>{biz.terminology.newBooking}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking: any) => {
            const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
            const isLoading = (k: string) => actionLoading === booking.id + k;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-brand-200 hover:shadow-sm transition-all"
              >
                {/* Main row */}
                <div
                  onClick={() => navigate("/dashboard/bookings/" + booking.id)}
                  className="flex items-start gap-3 p-4 cursor-pointer"
                >
                  {/* Status stripe */}
                  <div className={clsx("w-1 self-stretch rounded-full shrink-0 mt-0.5", cfg.dot)} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + amount */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {booking.customerName || booking.customer?.name || "عميل"}
                      </p>
                      <span className="text-sm font-bold text-brand-600 tabular-nums shrink-0">
                        {Number(booking.totalAmount || 0).toLocaleString("en-US")} ر.س
                      </span>
                    </div>

                    {/* Row 2: service + staff */}
                    {(booking.serviceName || booking.assignedUserName) && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {booking.serviceName && (
                          <span className="text-xs text-gray-600 font-medium bg-gray-50 px-2 py-0.5 rounded-lg">
                            {booking.serviceName}
                            {booking.durationMinutes ? ` · ${booking.durationMinutes} د` : ""}
                          </span>
                        )}
                        {booking.assignedUserName && (
                          <span className="flex items-center gap-1 text-xs text-brand-600">
                            <Scissors className="w-3 h-3" />
                            {booking.assignedUserName}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Row 3: date + phone + status */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {booking.eventDate && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <CalendarCheck className="w-3 h-3" />
                          {fmtDate(booking.eventDate)} · {fmtTime(booking.eventDate)}
                        </span>
                      )}
                      {booking.customerPhone && (
                        <a
                          href={`tel:${booking.customerPhone}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          {booking.customerPhone}
                        </a>
                      )}
                    </div>

                    {/* Row 4: status badge */}
                    <div className="mt-2">
                      <StatusDot status={booking.status} />
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                </div>

                {/* Quick-action strip */}
                {["pending", "confirmed", "in_progress"].includes(booking.status) && (
                  <div className="flex border-t border-gray-50 divide-x divide-gray-50" onClick={e => e.stopPropagation()}>
                    {booking.status === "pending" && (
                      <button
                        disabled={isLoading("_confirm")}
                        onClick={() => setConfirmModal(booking.id)}
                        className="flex-1 py-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
                      >
                        {isLoading("_confirm") ? "..." : "تأكيد الموعد"}
                      </button>
                    )}
                    {booking.status === "confirmed" && (
                      <button
                        disabled={isLoading("_start")}
                        onClick={() => doStart(booking.id)}
                        className="flex-1 py-2.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
                      >
                        {isLoading("_start") ? "..." : "بدء الخدمة"}
                      </button>
                    )}
                    {booking.status === "in_progress" && (
                      <button
                        disabled={isLoading("_complete")}
                        onClick={() => doComplete(booking.id)}
                        className="flex-1 py-2.5 text-xs font-semibold text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                      >
                        {isLoading("_complete") ? "..." : "إكمال الخدمة"}
                      </button>
                    )}
                    <button
                      disabled={isLoading("_cancel")}
                      onClick={() => { setCancelModal(booking.id); setCancelReason(""); }}
                      className="px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create booking form */}
      {showCreate && (
        <CreateBookingForm
          open={true}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refetch(); toast.success("تم إنشاء الموعد"); }}
        />
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-brand-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">تأكيد الموعد</h3>
              <p className="text-sm text-gray-500">سيتم إبلاغ العميلة تلقائياً إذا كانت الرسائل مفعّلة.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">تراجع</button>
              <button onClick={doConfirm} disabled={!!actionLoading} className="flex-1 py-3 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors">تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">إلغاء الموعد</h3>
                  <p className="text-xs text-gray-400 mt-0.5">لا يمكن التراجع عن هذا الإجراء</p>
                </div>
                <button onClick={() => setCancelModal(null)} className="mr-auto text-gray-300 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">سبب الإلغاء (اختياري)</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="مثال: طلب العميلة إلغاء الموعد"
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 transition-all resize-none"
              />
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setCancelModal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">تراجع</button>
              <button onClick={doCancel} disabled={!!actionLoading} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">إلغاء الموعد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
