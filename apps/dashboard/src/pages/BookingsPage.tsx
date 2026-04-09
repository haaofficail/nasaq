import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { Plus, CalendarCheck, Clock, CheckCircle, XCircle, Banknote, Phone, MapPin, Search, AlertTriangle, X } from "lucide-react";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { CreateBookingForm } from "@/components/bookings/CreateBookingForm";
import { StatusBadge, ModernInput, PageHeader, Button, confirmDialog } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { useBusiness } from "@/hooks/useBusiness";

const PIPELINE_TABS = [
  { key: "all",         label: "الكل" },
  { key: "pending",     label: "بانتظار التأكيد" },
  { key: "confirmed",   label: "مؤكد" },
  { key: "in_progress", label: "قيد التنفيذ" },
  { key: "completed",   label: "مكتمل" },
  { key: "cancelled",   label: "ملغي" },
];

const STATUS_ICON: Record<string, any> = {
  pending:     Clock,
  confirmed:   CheckCircle,
  in_progress: CalendarCheck,
  completed:   CheckCircle,
  cancelled:   XCircle,
};

const PAYMENT_CONFIG: Record<string, { label: string; className: string }> = {
  unpaid:   { label: "غير مدفوع", className: "bg-red-50 text-red-600" },
  partial:  { label: "جزئي",      className: "bg-amber-50 text-amber-600" },
  paid:     { label: "مدفوع",     className: "bg-emerald-50 text-emerald-700" },
  refunded: { label: "مسترد",     className: "bg-gray-100 text-gray-500" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

export function BookingsPage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const biz = useBusiness();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [showCreate, setShowCreate] = useState(() => location.pathname.endsWith("/new"));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal]   = useState<string | null>(null);
  const [cancelModal, setCancelModal]     = useState<string | null>(null);
  const [cancelReason, setCancelReason]   = useState("");

  const params: Record<string, string> = {};
  if (activeTab !== "all") params.status = activeTab;
  if (search) params.search = search;

  const { data: bookingsRes, loading, error, refetch } = useApi(() => bookingsApi.list(params), [activeTab, search]);

  const quickConfirm = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal(id);
  };

  const doConfirm = async () => {
    if (!confirmModal) return;
    setActionLoading(confirmModal + "_confirm");
    try {
      await bookingsApi.updateStatus(confirmModal, "confirmed");
      toast.success("تم تأكيد الحجز — سيتم إبلاغ العميل");
      refetch();
    } catch { toast.error("فشل التأكيد"); }
    finally { setActionLoading(null); setConfirmModal(null); }
  };

  const quickCancel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCancelModal(id);
    setCancelReason("");
  };

  const doCancel = async () => {
    if (!cancelModal) return;
    setActionLoading(cancelModal + "_cancel");
    try {
      await bookingsApi.updateStatus(cancelModal, "cancelled", cancelReason || undefined);
      toast.success("تم إلغاء الحجز");
      refetch();
    } catch { toast.error("فشل الإلغاء"); }
    finally { setActionLoading(null); setCancelModal(null); setCancelReason(""); }
  };

  const bookings: any[] = bookingsRes?.data || [];

  // Compute stats from the already-filtered bookings array so they update when tab changes
  const computedTotal    = bookings.length;
  const computedRevenue  = bookings.reduce((sum: number, b: any) => sum + Number(b.totalAmount || 0), 0);
  const computedPending  = activeTab === "all" ? bookings.filter((b: any) => b.status === "pending").length : bookings.length;
  const computedCancelled = bookings.filter((b: any) => b.status === "cancelled").length;
  const computedCancellationRate = computedTotal > 0 ? Math.round((computedCancelled / computedTotal) * 100) : 0;

  const activeTabLabel = PIPELINE_TABS.find(t => t.key === activeTab)?.label ?? "";
  const firstCardLabel = activeTab === "all" ? ("إجمالي " + biz.terminology.bookings) : ("حجوزات " + activeTabLabel);

  return (
    <div dir="rtl" className="space-y-5">

      <PageHeader
        title={biz.terminology.bookings}
        description={"إدارة " + biz.terminology.bookings + " ومتابعتها"}
        actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>{biz.terminology.newBooking}</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: CalendarCheck, label: firstCardLabel,       value: computedTotal,                                          color: "text-brand-600",   bg: "bg-brand-50" },
          { icon: Banknote,      label: "إجمالي المبيعات",    value: `${computedRevenue.toLocaleString()} ر.س`,              color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: Clock,         label: "بانتظار تأكيدك",     value: computedPending,                                        color: "text-amber-600",   bg: "bg-amber-50" },
          { icon: XCircle,       label: "معدل الإلغاء",       value: `${computedCancellationRate}%`,                         color: "text-red-500",     bg: "bg-red-50" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 overflow-x-auto">
        {PIPELINE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "flex-1 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
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
      <ModernInput
        placeholder={biz.terminology.searchBookingPlaceholder}
        value={search}
        onChange={setSearch}
        icon={<Search size={15} />}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-3">
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={refetch} className="text-xs text-red-600 underline">إعادة المحاولة</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[72px]" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">{biz.terminology.bookingEmpty}</h3>
          <p className="text-sm text-gray-400 mb-4">{"أنشئ " + biz.terminology.booking + " لك"}</p>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>{biz.terminology.newBooking}</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {bookings.map((booking: any, idx: number) => {
            const Icon    = STATUS_ICON[booking.status] || Clock;
            const payment = PAYMENT_CONFIG[booking.paymentStatus] || PAYMENT_CONFIG.unpaid;

            return (
              <div
                key={booking.id}
                onClick={() => navigate("/dashboard/bookings/" + booking.id)}
                className={clsx(
                  "flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/70 transition-colors",
                  idx < bookings.length - 1 && "border-b border-gray-50",
                )}
              >
                {/* Status icon */}
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-brand-500" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {booking.customerName || booking.customer?.name || "عميل"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 tabular-nums">
                      #{booking.bookingNumber || booking.id?.substring(0, 8)}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <CalendarCheck className="w-2.5 h-2.5" />
                      {booking.eventDate ? fmtDate(booking.eventDate) : "—"}
                    </span>
                    {booking.locationName && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />{booking.locationName}
                      </span>
                    )}
                    {booking.customerPhone && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        <a href={`tel:${booking.customerPhone}`} className="hover:text-brand-600 transition-colors" onClick={e => e.stopPropagation()}>{booking.customerPhone}</a>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-gray-900 tabular-nums">
                    {Number(booking.totalAmount || 0).toLocaleString()} ر.س
                  </span>
                  <div className="flex gap-1.5 flex-wrap justify-end items-center">
                    <StatusBadge status={booking.status} size="sm" />
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {booking.status === "pending" && (
                        <button
                          onClick={(e) => quickConfirm(e, booking.id)}
                          disabled={actionLoading === booking.id + "_confirm"}
                          className="text-xs px-2 py-1 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === booking.id + "_confirm" ? "..." : "تأكيد"}
                        </button>
                      )}
                      {["pending", "confirmed"].includes(booking.status) && (
                        <button
                          onClick={(e) => quickCancel(e, booking.id)}
                          disabled={actionLoading === booking.id + "_cancel"}
                          className="text-xs px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[11px] font-medium", payment.className)}>
                      {payment.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateBookingForm open={true} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); refetch(); toast.success("تم إنشاء الحجز"); }} />}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-brand-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">تأكيد الحجز</h3>
              <p className="text-sm text-gray-500">سيتم تأكيد هذا الحجز وإبلاغ العميل تلقائياً إذا كانت الرسائل مفعّلة.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">تراجع</button>
              <button onClick={doConfirm} disabled={!!actionLoading} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">نعم، أكّد الحجز</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">إلغاء الحجز</h3>
                    <p className="text-sm text-gray-500 mt-0.5">لا يمكن التراجع عن هذا الإجراء</p>
                  </div>
                </div>
                <button onClick={() => setCancelModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">سبب الإلغاء (اختياري)</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="مثال: طلب العميل إلغاء الحجز"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 transition-all resize-none"
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">تراجع</button>
              <button onClick={doCancel} disabled={!!actionLoading} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">نعم، ألغِ الحجز</button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "ما الفرق بين «معلّق» و«مؤكد»؟", a: "«معلّق» يعني الحجز وصل لكن لم تتحقق منه بعد، أما «مؤكد» فيعني أنك راجعته وأبلغت العميل." },
            { q: "ما معنى حالة «مكتمل»؟", a: "يعني الخدمة نُفّذت فعلياً وانتهى الحجز. هذا يؤثر على إحصاءات العملاء وتقارير الإيرادات." },
            { q: "كيف أحسب «إجمالي المبلغ»؟", a: "هو مجموع أسعار الخدمات المضافة في الحجز بعد تطبيق أي خصم أو إضافات (Add-ons)." },
            { q: "ما الفرق بين حالة الحجز وحالة الدفع؟", a: "حالة الحجز تعكس مرحلة تنفيذ الخدمة (معلّق، مؤكد، مكتمل...)، بينما حالة الدفع تعكس وضع الفاتورة المالي (مدفوع، بانتظار الدفع...)." },
            { q: "هل يصل العميل بإشعار عند تأكيد حجزه؟", a: "نعم، يُرسل إشعار واتساب أو رسالة نصية للعميل تلقائياً عند تأكيد الحجز إذا كانت خدمة الرسائل مُفعّلة." },
          ].map(faq => (
            <details key={faq.q} className="border border-gray-100 rounded-xl">
              <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
