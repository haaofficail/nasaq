import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { clsx } from "clsx";
import {
  Plus, CheckCircle, AlertTriangle, X, CalendarDays,
  ChevronLeft, Pencil, MoreHorizontal, CalendarCheck,
  DollarSign, Clock, TrendingUp,
} from "lucide-react";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { CreateBookingForm } from "@/components/bookings/CreateBookingForm";
import { Button } from "@/components/ui";
import { useBusiness } from "@/hooks/useBusiness";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric", month: "long",
  });
}
function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("ar-SA-u-ca-gregory-nu-latn", {
    hour: "2-digit", minute: "2-digit",
  });
}
function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return words[0][0] + words[words.length - 1][0];
  return name.slice(0, 2);
}
function isoDate(d: Date) { return d.toISOString().split("T")[0]; }
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

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-[#5b9bd5] to-[#3a7bc0]",
  "from-[#34c77b] to-[#22a05e]",
  "from-[#8b6cc1] to-[#6b4fa0]",
  "from-[#f5a623] to-[#d4870a]",
  "from-[#e74c5e] to-[#c4344a]",
  "from-[#7eb5d4] to-[#5a9abf]",
];

const STATUS_CONFIG: Record<string, {
  label: string;
  dotBg: string;
  badgeBg: string;
  badgeText: string;
}> = {
  pending:     { label: "بانتظار التأكيد", dotBg: "bg-[#f5a623]",  badgeBg: "bg-[#fff8ec]",  badgeText: "text-[#c47d0a]"  },
  confirmed:   { label: "مؤكد",            dotBg: "bg-[#5b9bd5]",  badgeBg: "bg-[#e8f1fa]",  badgeText: "text-[#3a7bc0]"  },
  in_progress: { label: "قيد التنفيذ",     dotBg: "bg-[#8b6cc1]",  badgeBg: "bg-[#f3f0fa]",  badgeText: "text-[#8b6cc1]"  },
  completed:   { label: "مكتمل",           dotBg: "bg-[#34c77b]",  badgeBg: "bg-[#edfaf3]",  badgeText: "text-[#1a9e55]"  },
  cancelled:   { label: "ملغي",            dotBg: "bg-[#e74c5e]",  badgeBg: "bg-[#fdf0f2]",  badgeText: "text-[#e74c5e]"  },
  no_show:     { label: "لم يحضر",         dotBg: "bg-gray-400",   badgeBg: "bg-gray-100",   badgeText: "text-gray-600"   },
};

const PIPELINE_TABS = [
  { key: "all",         label: "الكل"     },
  { key: "pending",     label: "بانتظار"  },
  { key: "confirmed",   label: "مؤكد"     },
  { key: "in_progress", label: "جاري"     },
  { key: "completed",   label: "مكتمل"    },
  { key: "cancelled",   label: "ملغي"     },
];

const DATE_PRESETS = [
  { key: "all",      label: "كل الأوقات"    },
  { key: "today",    label: "اليوم"          },
  { key: "tomorrow", label: "غداً"           },
  { key: "week",     label: "هذا الأسبوع"   },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap",
      cfg.badgeBg, cfg.badgeText
    )}>
      <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotBg)} />
      {cfg.label}
    </span>
  );
}

function Skeleton() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-[10px] py-[6px]">
          <div className="h-4 bg-[#f1f5f9] rounded-lg" />
        </td>
      ))}
    </tr>
  );
}

function MobileSkeleton() {
  return <div className="h-28 bg-[#f1f5f9] rounded-xl animate-pulse" />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function BookingsPage() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const [searchParams] = useSearchParams();
  const biz            = useBusiness();

  const [activeTab,   setActiveTab]   = useState("all");
  const [datePreset,  setDatePreset]  = useState("all");
  const [search,      setSearch]      = useState("");
  const [showCreate,  setShowCreate]  = useState(() => location.pathname.endsWith("/new"));
  const defaultCustomerId = searchParams.get("customerId") || "";

  const [confirmModal,  setConfirmModal]  = useState<string | null>(null);
  const [cancelModal,   setCancelModal]   = useState<string | null>(null);
  const [cancelReason,  setCancelReason]  = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalRevenue = bookings.reduce((s: number, b: any) => s + Number(b.totalAmount || 0), 0);
  const pendingCount = bookings.filter((b: any) => b.status === "pending").length;
  const completedCount = bookings.filter((b: any) => b.status === "completed").length;

  const STATS = [
    {
      value: bookings.length,
      label: "إجمالي المواعيد",
      iconBg: "bg-[#e8f1fa]",
      iconColor: "text-[#5b9bd5]",
      icon: <CalendarCheck className="w-5 h-5" />,
    },
    {
      value: pendingCount,
      label: "بانتظار التأكيد",
      iconBg: "bg-[#fff8ec]",
      iconColor: "text-[#f5a623]",
      icon: <Clock className="w-5 h-5" />,
    },
    {
      value: completedCount,
      label: "مكتملة",
      iconBg: "bg-[#edfaf3]",
      iconColor: "text-[#34c77b]",
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      value: totalRevenue.toLocaleString("en-US", { minimumFractionDigits: totalRevenue % 1 ? 2 : 0, maximumFractionDigits: 2 }),
      suffix: "ر.س",
      label: "إجمالي الإيرادات",
      iconBg: "bg-[#f3f0fa]",
      iconColor: "text-[#8b6cc1]",
      icon: <DollarSign className="w-5 h-5" />,
    },
  ];

  // ── Actions ───────────────────────────────────────────────────────────────

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
      toast.success("اكتملت الخدمة");
      refetch();
    } catch { toast.error("فشل إكمال الحجز"); }
    finally { setActionLoading(null); }
  };

  const doCancel = async () => {
    if (!cancelModal) return;
    setActionLoading(cancelModal + "_cancel");
    try {
      await bookingsApi.updateStatus(cancelModal, "cancelled", cancelReason ? { reason: cancelReason } : undefined);
      toast.success("تم إلغاء الموعد");
      refetch();
    } catch { toast.error("فشل الإلغاء"); }
    finally { setActionLoading(null); setCancelModal(null); setCancelReason(""); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="pb-10">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-[#1a2332]">{biz.terminology.bookings}</h1>
          <p className="text-[13px] text-[#6b7a8d] mt-0.5">إدارة المواعيد والمتابعة</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-[#5b9bd5] hover:bg-[#3a7bc0] text-white text-[13px] font-semibold px-5 py-2.5 rounded-[10px] transition-all shadow-[0_2px_8px_rgba(91,155,213,0.3)] hover:shadow-[0_4px_14px_rgba(91,155,213,0.4)] hover:-translate-y-px"
        >
          <Plus className="w-4 h-4" />
          {biz.terminology.newBooking}
        </button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {STATS.map((s, i) => (
          <div
            key={i}
            className="bg-white border border-[#eef2f6] rounded-2xl p-4 flex items-start gap-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all"
          >
            <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0", s.iconBg, s.iconColor)}>
              {s.icon}
            </div>
            <div>
              <p className="text-[22px] font-bold text-[#0f172a] leading-none tabular-nums">
                {s.value}
                {s.suffix && <span className="text-sm font-medium text-[#475569] mr-1">{s.suffix}</span>}
              </p>
              <p className="text-[11px] text-[#94a3b8] mt-1 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white border border-[#eef2f6] rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Status pills */}
          {PIPELINE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all border border-transparent",
                activeTab === tab.key
                  ? "bg-[#5b9bd5] text-white shadow-[0_2px_6px_rgba(91,155,213,0.25)]"
                  : "text-[#6b7a8d] hover:bg-[#f8f9fb] hover:text-[#1a2332]"
              )}
            >
              {tab.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-[#e8ecf1] mx-1" />

          {/* Date presets */}
          {DATE_PRESETS.map(dp => (
            <button
              key={dp.key}
              onClick={() => setDatePreset(dp.key)}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all border border-transparent",
                datePreset === dp.key
                  ? "bg-[#1a2332] text-white"
                  : "text-[#6b7a8d] hover:bg-[#f8f9fb] hover:text-[#1a2332]"
              )}
            >
              {dp.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#f8f9fb] border border-[#e8ecf1] rounded-lg px-3 py-2 min-w-[200px]">
          <svg className="w-3.5 h-3.5 text-[#9aa5b4] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="bg-transparent border-none outline-none text-[12px] text-[#1a2332] placeholder:text-[#9aa5b4] w-full"
            placeholder="بحث بالاسم أو رقم الحجز..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            dir="rtl"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#9aa5b4] hover:text-[#6b7a8d]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={refetch} className="text-xs text-red-500 underline">إعادة المحاولة</button>
        </div>
      )}

      {/* ── Desktop Table ── */}
      <div className="hidden md:block bg-white border border-[#eef2f6] rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#eef2f6]">
              {["العميل", "الخدمة", "التاريخ والوقت", "المبلغ", "الحالة", "إجراءات"].map(h => (
                <th key={h} className="px-[10px] py-[6px] text-right text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} />)
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <CalendarDays className="w-12 h-12 text-[#9aa5b4] opacity-30 mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#6b7a8d] mb-1">لا توجد مواعيد</p>
                  <p className="text-[12px] text-[#9aa5b4]">أضف موعداً جديداً لبدء التتبع</p>
                </td>
              </tr>
            ) : bookings.map((b: any, idx: number) => {
              const customerName = b.customerName || b.customer?.name || "عميل";
              const initials = getInitials(customerName);
              const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const isLoading = (k: string) => actionLoading === b.id + k || actionLoading === b.id;

              return (
                <tr
                  key={b.id}
                  className="border-b border-[#eef2f6] last:border-0 hover:bg-[#f8fafc] transition-colors"
                >
                  {/* العميل */}
                  <td className="px-[10px] py-[6px]">
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        "w-7 h-7 rounded-[8px] flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br shrink-0",
                        avatarGrad
                      )}>
                        {initials}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1a2332]">{customerName}</p>
                        {b.customerPhone && (
                          <p className="text-[11px] text-[#9aa5b4] mt-0.5 direction-ltr" dir="ltr">{b.customerPhone}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* الخدمة */}
                  <td className="px-[10px] py-[6px]">
                    <p className="text-[13px] font-medium text-[#1a2332]">
                      {b.serviceName || "—"}
                    </p>
                    {(b.assignedUserName || b.durationMinutes) && (
                      <p className="text-[11px] text-[#9aa5b4] mt-0.5">
                        {[b.assignedUserName, b.durationMinutes ? `${b.durationMinutes} د` : null].filter(Boolean).join(" — ")}
                      </p>
                    )}
                  </td>

                  {/* التاريخ والوقت */}
                  <td className="px-[10px] py-[6px] whitespace-nowrap">
                    {b.startsAt ? (
                      <>
                        <p className="text-[13px] font-medium text-[#1a2332]">{fmtDate(b.startsAt)}</p>
                        <p className="text-[11px] text-[#9aa5b4] mt-0.5">{fmtTime(b.startsAt)}</p>
                      </>
                    ) : <span className="text-[#9aa5b4]">—</span>}
                  </td>

                  {/* المبلغ */}
                  <td className="px-[10px] py-[6px] whitespace-nowrap">
                    <span className="text-[14px] font-bold text-[#1a2332] tabular-nums">
                      {Number(b.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] font-medium text-[#6b7a8d] mr-1">ر.س</span>
                  </td>

                  {/* الحالة */}
                  <td className="px-[10px] py-[6px]">
                    <StatusBadge status={b.status} />
                  </td>

                  {/* إجراءات */}
                  <td className="px-[10px] py-[6px]">
                    <div className="flex items-center gap-1">
                      {b.status === "pending" && (
                        <button
                          onClick={() => setConfirmModal(b.id)}
                          disabled={isLoading("")}
                          title="تأكيد"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa5b4] hover:bg-[#f8f9fb] hover:text-[#34c77b] transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {b.status === "confirmed" && (
                        <button
                          onClick={() => doStart(b.id)}
                          disabled={isLoading("_start")}
                          title="بدء الخدمة"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa5b4] hover:bg-[#f3f0fa] hover:text-[#8b6cc1] transition-all disabled:opacity-50"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                      )}
                      {b.status === "in_progress" && (
                        <button
                          onClick={() => doComplete(b.id)}
                          disabled={isLoading("_complete")}
                          title="إكمال الخدمة"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa5b4] hover:bg-[#edfaf3] hover:text-[#34c77b] transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate("/dashboard/bookings/" + b.id)}
                        title="تعديل"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa5b4] hover:bg-[#f8f9fb] hover:text-[#1a2332] transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {["pending", "confirmed", "in_progress"].includes(b.status) && (
                        <button
                          onClick={() => { setCancelModal(b.id); setCancelReason(""); }}
                          title="إلغاء"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa5b4] hover:bg-[#fdf0f2] hover:text-[#e74c5e] transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Table footer */}
        {!loading && bookings.length > 0 && (
          <div className="px-[10px] py-[6px] border-t border-[#eef2f6] bg-[#f8fafc] flex items-center justify-between">
            <p className="text-[11px] text-[#94a3b8]">عرض {bookings.length} موعد</p>
          </div>
        )}
      </div>

      {/* ── Mobile Cards ── */}
      <div className="md:hidden">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <MobileSkeleton key={i} />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-[#e8ecf1] rounded-xl p-12 text-center">
            <CalendarDays className="w-10 h-10 text-[#9aa5b4] opacity-30 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-[#6b7a8d] mb-1">لا توجد مواعيد</p>
            <p className="text-[12px] text-[#9aa5b4] mb-4">أضف موعداً جديداً لبدء التتبع</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-[#5b9bd5] text-white text-[13px] font-semibold px-4 py-2.5 rounded-[10px] mx-auto"
            >
              <Plus className="w-4 h-4" />
              {biz.terminology.newBooking}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b: any, idx: number) => {
              const customerName = b.customerName || b.customer?.name || "عميل";
              const initials = getInitials(customerName);
              const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const isLoading = (k: string) => actionLoading === b.id + k || actionLoading === b.id;

              return (
                <div
                  key={b.id}
                  className="bg-white border border-[#e8ecf1] rounded-xl overflow-hidden hover:border-[#5b9bd5]/30 transition-all"
                >
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={() => navigate("/dashboard/bookings/" + b.id)}
                  >
                    {/* Avatar */}
                    <div className={clsx(
                      "w-10 h-10 rounded-[10px] flex items-center justify-center text-[13px] font-bold text-white bg-gradient-to-br shrink-0",
                      avatarGrad
                    )}>
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-bold text-[#1a2332] truncate">{customerName}</p>
                        <span className="text-[13px] font-bold text-[#5b9bd5] tabular-nums shrink-0">
                          {Number(b.totalAmount || 0).toLocaleString("en-US")} ر.س
                        </span>
                      </div>
                      {b.serviceName && (
                        <p className="text-[12px] text-[#6b7a8d] mt-0.5 font-medium">{b.serviceName}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {b.startsAt && (
                          <span className="text-[11px] text-[#9aa5b4]">
                            {fmtDate(b.startsAt)} · {fmtTime(b.startsAt)}
                          </span>
                        )}
                        <StatusBadge status={b.status} />
                      </div>
                    </div>

                    <ChevronLeft className="w-4 h-4 text-[#9aa5b4] shrink-0 mt-1" />
                  </div>

                  {/* Quick actions */}
                  {["pending", "confirmed", "in_progress"].includes(b.status) && (
                    <div className="flex border-t border-[#f0f2f5] divide-x divide-[#f0f2f5]" onClick={e => e.stopPropagation()}>
                      {b.status === "pending" && (
                        <button
                          disabled={isLoading("")}
                          onClick={() => setConfirmModal(b.id)}
                          className="flex-1 py-2.5 text-[12px] font-semibold text-[#3a7bc0] hover:bg-[#e8f1fa] transition-colors disabled:opacity-50"
                        >
                          تأكيد الموعد
                        </button>
                      )}
                      {b.status === "confirmed" && (
                        <button
                          disabled={isLoading("_start")}
                          onClick={() => doStart(b.id)}
                          className="flex-1 py-2.5 text-[12px] font-semibold text-[#8b6cc1] hover:bg-[#f3f0fa] transition-colors disabled:opacity-50"
                        >
                          بدء الخدمة
                        </button>
                      )}
                      {b.status === "in_progress" && (
                        <button
                          disabled={isLoading("_complete")}
                          onClick={() => doComplete(b.id)}
                          className="flex-1 py-2.5 text-[12px] font-semibold text-[#1a9e55] hover:bg-[#edfaf3] transition-colors disabled:opacity-50"
                        >
                          إكمال الخدمة
                        </button>
                      )}
                      <button
                        disabled={isLoading("_cancel")}
                        onClick={() => { setCancelModal(b.id); setCancelReason(""); }}
                        className="px-5 py-2.5 text-[12px] font-medium text-[#e74c5e] hover:bg-[#fdf0f2] transition-colors disabled:opacity-50"
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
      </div>

      {/* ── Create Form ── */}
      {showCreate && (
        <CreateBookingForm
          open={true}
          onClose={() => {
            setShowCreate(false);
            if (location.pathname.endsWith("/new")) navigate("/dashboard/bookings");
          }}
          onSuccess={() => {
            setShowCreate(false);
            refetch();
            toast.success("تم إنشاء الموعد");
            if (location.pathname.endsWith("/new")) navigate("/dashboard/bookings");
          }}
          defaultCustomerId={defaultCustomerId}
        />
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#e8f1fa] flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-[#5b9bd5]" />
              </div>
              <h3 className="text-[15px] font-bold text-[#1a2332] mb-1">تأكيد الموعد</h3>
              <p className="text-[13px] text-[#6b7a8d]">سيتم إبلاغ العميل تلقائياً إذا كانت الرسائل مفعّلة.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 rounded-xl border border-[#e8ecf1] text-[13px] font-medium text-[#6b7a8d] hover:bg-[#f8f9fb] transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={doConfirm}
                disabled={!!actionLoading}
                className="flex-1 py-3 rounded-xl bg-[#5b9bd5] text-white text-[13px] font-bold hover:bg-[#3a7bc0] disabled:opacity-50 transition-colors"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      {cancelModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#fdf0f2] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#e74c5e]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1a2332]">إلغاء الموعد</h3>
                  <p className="text-[11px] text-[#9aa5b4] mt-0.5">لا يمكن التراجع عن هذا الإجراء</p>
                </div>
                <button onClick={() => setCancelModal(null)} className="mr-auto text-[#9aa5b4] hover:text-[#6b7a8d]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <label className="block text-[13px] font-medium text-[#1a2332] mb-1.5">سبب الإلغاء (اختياري)</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="مثال: طلب العميل إلغاء الموعد"
                rows={2}
                className="w-full rounded-xl border border-[#e8ecf1] px-3 py-2.5 text-[13px] outline-none focus:border-[#5b9bd5] focus:ring-2 focus:ring-[#5b9bd5]/10 transition-all resize-none"
              />
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 py-3 rounded-xl border border-[#e8ecf1] text-[13px] font-medium text-[#6b7a8d] hover:bg-[#f8f9fb] transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={doCancel}
                disabled={!!actionLoading}
                className="flex-1 py-3 rounded-xl bg-[#e74c5e] text-white text-[13px] font-bold hover:bg-[#c4344a] disabled:opacity-50 transition-colors"
              >
                إلغاء الموعد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
