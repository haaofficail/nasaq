import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Check, Clock, MapPin, Calendar, CreditCard, Shield,
  Loader2, AlertCircle, Download, Mail, CalendarPlus, X,
} from "lucide-react";
import { clsx } from "clsx";
import { publicApi } from "@/lib/api";
import { usePublicTheme } from "@/context/ThemeProvider";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

export function PublicTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [b, setB] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const paymentDone = searchParams.get("payment") === "done";

  useEffect(() => {
    if (!token) return;
    publicApi.track(token)
      .then((res: any) => {
        if (res?.error) setError(res.error);
        else setB(res?.data || null);
      })
      .catch(() => setError("تعذّر تحميل بيانات الحجز"))
      .finally(() => setLoading(false));
  }, [token]);

  // يجب استدعاء الـ hook قبل أي early return (قواعد الـ hooks)
  usePublicTheme(b);

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#5b9bd5]" />
    </div>
  );

  if (error || !b) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3 p-6">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-gray-600 font-medium">{error || "الحجز غير موجود"}</p>
    </div>
  );

  const totalAmount = parseFloat(b.totalAmount || 0);
  const paidAmount  = parseFloat(b.paidAmount  || 0);
  const balanceDue  = parseFloat(b.balanceDue  || 0);
  const paidPct     = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const primaryColor = b.config?.primaryColor || b.org?.primaryColor || "#5b9bd5";
  const font  = b.config?.fontFamily || "IBM Plex Sans Arabic";
  const logo  = b.config?.logoUrl || b.org?.logo;

  const statusLabel =
    b.status === "completed"  ? "مكتمل"    :
    b.status === "cancelled"  ? "ملغي"     :
    b.status === "confirmed"  ? "مؤكد ومضمون" :
    b.status === "pending"    ? "قيد المراجعة" :
    "مؤكد";

  const statusStyle =
    b.status === "completed" ? { bg: "rgba(26,158,114,0.15)",  color: "#34d399",  border: "rgba(26,158,114,0.3)"  } :
    b.status === "cancelled" ? { bg: "rgba(220,38,38,0.15)",   color: "#f87171",  border: "rgba(220,38,38,0.3)"   } :
    b.status === "confirmed" ? { bg: "rgba(26,158,114,0.15)",  color: "#34d399",  border: "rgba(26,158,114,0.3)"  } :
                               { bg: "rgba(212,176,106,0.15)", color: "#fbbf24",  border: "rgba(212,176,106,0.3)" };

  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl" style={{ fontFamily: font }}>

      {/* ── Navbar ── */}
      <nav className="bg-white border-b border-[#eef2f6] h-14 flex items-center px-6">
        <div className="max-w-[600px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden"
              style={{ background: primaryColor }}
            >
              {logo
                ? <img src={logo} className="w-full h-full object-cover" alt="" />
                : (b.org?.name?.[0] || "ن")}
            </div>
            <span className="font-bold text-[14px] text-gray-900">{b.org?.name}</span>
          </div>
          {b.org?.phone && (
            <a
              href={`tel:${b.org.phone}`}
              className="text-[12px] font-semibold"
              style={{ color: primaryColor }}
            >
              تواصل معنا
            </a>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: "#0d1117", padding: "48px 24px" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(91,155,213,0.12) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            رقم الحجز
          </p>
          <p className="text-[36px] font-bold text-white leading-none tracking-tight mb-1.5">
            {b.bookingNumber}
          </p>
          {b.customerName && (
            <p className="text-[16px]" style={{ color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
              {b.customerName}
            </p>
          )}
          {/* Status pill */}
          <div className="flex justify-center mt-5">
            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-bold"
              style={{
                background: statusStyle.bg,
                color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: "currentColor",
                  animation: b.status !== "cancelled" ? "blink 1.5s ease-in-out infinite" : "none",
                }}
              />
              {statusLabel}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-[600px] mx-auto px-4 py-6 flex flex-col gap-4">

        {/* Service + date card */}
        {(b.serviceName || b.eventDate || b.location) && (
          <div className="bg-white border border-[#eef2f6] rounded-2xl p-5 flex flex-col gap-3">
            {b.serviceName && <h2 className="font-bold text-[14px] text-gray-900">{b.serviceName}</h2>}
            <div className="flex flex-wrap gap-4 text-[12px] text-gray-500">
              {b.eventDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {fmtDate(b.eventDate)}
                </span>
              )}
              {b.eventDate && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(b.eventDate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {b.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {b.location}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        {b.timeline?.length > 0 && (
          <div className="bg-white border border-[#eef2f6] rounded-2xl p-5">
            <h3 className="font-bold text-[13px] text-gray-900 mb-4">مسار الحجز</h3>
            <div className="flex flex-col gap-0">
              {b.timeline.map((step: any, i: number) => (
                <div key={i} className="flex gap-3.5 items-start pb-5 relative last:pb-0">
                  {/* Connector line */}
                  {i < b.timeline.length - 1 && (
                    <div
                      className="absolute top-7 bottom-0 w-0.5"
                      style={{
                        right: "13px",
                        background: step.done
                          ? "#1a9e72"
                          : step.current
                          ? "linear-gradient(#1a9e72, #f1f5f9)"
                          : "#f1f5f9",
                      }}
                    />
                  )}
                  {/* Step icon */}
                  <div
                    className={clsx(
                      "w-7 h-7 rounded-full shrink-0 flex items-center justify-center z-10 border-2 text-[11px] font-bold",
                      step.done    && "border-[#1a9e72] bg-[#1a9e72] text-white",
                      step.current && "border-[#5b9bd5] bg-white text-[#5b9bd5]",
                      !step.done && !step.current && "border-[#e2e8f0] bg-[#f8fafc] text-gray-300"
                    )}
                    style={step.current ? { animation: "ringPulse 2s ease-in-out infinite" } : undefined}
                  >
                    {step.done ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                  </div>
                  {/* Step body */}
                  <div className="flex-1 pt-0.5">
                    <p className={clsx(
                      "text-[13px] font-bold",
                      !step.done && !step.current && "text-gray-400 font-medium"
                    )}>
                      {step.stage}
                    </p>
                    {step.description && (
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{step.description}</p>
                    )}
                    {step.time && (
                      <p className="text-[10px] font-semibold mt-1" style={{ color: "#5b9bd5" }}>{step.time}</p>
                    )}
                    {step.current && !step.time && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3FB] text-[#5b9bd5] font-semibold">
                        الحالة الحالية
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="bg-white border border-[#eef2f6] rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="font-bold text-[13px] text-gray-900">المدفوعات</h3>
          <div>
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="text-gray-500">المدفوع</span>
              <span className="font-semibold text-[#1a9e72]">{paidAmount.toLocaleString("en-US")} ر.س</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${paidPct}%`, background: "#1a9e72" }}
              />
            </div>
            <div className="flex justify-between text-[11px] mt-1.5 text-gray-400">
              <span>{paidPct}%</span>
              <span>الإجمالي: {totalAmount.toLocaleString("en-US")} ر.س</span>
            </div>
          </div>

          {paymentDone && (
            <div className="p-3 rounded-xl bg-[#d1fae5] border border-[#6ee7b7] flex items-center gap-2 text-[13px] text-[#065f46] font-medium">
              <Check className="w-4 h-4 shrink-0" /> تم استلام الدفع — شكراً لك
            </div>
          )}

          {balanceDue > 0 && !paymentDone && (
            <div className="p-4 rounded-xl bg-[#fef3c7] border border-[#fde68a]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-[#92400e] font-medium">المبلغ المتبقي</span>
                <span className="text-[18px] font-bold text-[#92400e]">{balanceDue.toLocaleString("en-US")} ر.س</span>
              </div>
              <button
                disabled={paying}
                onClick={async () => {
                  if (!token) return;
                  setPaying(true);
                  try {
                    const res: any = await publicApi.createPaymentLink(token);
                    if (res?.data?.transactionUrl) {
                      window.location.href = res.data.transactionUrl;
                    } else {
                      toast.error("فشل إنشاء رابط الدفع. حاول مرة أخرى.");
                    }
                  } finally {
                    setPaying(false);
                  }
                }}
                className="w-full h-12 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                style={{ background: primaryColor }}
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {paying ? "جاري التحويل..." : "ادفع الآن"}
              </button>
            </div>
          )}
        </div>

        {/* Contact */}
        {b.org?.phone && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3.5"
            style={{
              background: "linear-gradient(135deg, rgba(91,155,213,0.06), rgba(91,155,213,0.02))",
              border: "1px solid rgba(91,155,213,0.15)",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(91,155,213,0.1)", color: "#5b9bd5" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.12 6.12l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[13px] text-gray-900">هل تحتاج مساعدة؟</p>
              <p className="text-[11px] text-gray-400 mt-0.5">فريقنا متاح 7 أيام من 8 ص حتى 10 م</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {b.org?.whatsapp || b.org?.phone ? (
                <a
                  href={`https://wa.me/966${(b.org?.whatsapp || b.org?.phone).replace(/^0/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-4 rounded-lg text-white text-[12px] font-bold flex items-center justify-center"
                  style={{ background: "#25d366" }}
                >
                  واتساب
                </a>
              ) : null}
              <a
                href={`tel:${b.org.phone}`}
                className="h-9 px-4 rounded-lg bg-[#5b9bd5] text-white text-[12px] font-bold flex items-center justify-center"
              >
                اتصال
              </a>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white border border-[#eef2f6] rounded-2xl p-5">
          <h3 className="font-bold text-[13px] text-gray-900 mb-3">إجراءات</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="h-9 px-3.5 rounded-lg border border-[#eef2f6] bg-white text-[11px] font-semibold text-gray-600 flex items-center gap-1.5 hover:bg-[#f8fafc] hover:border-[#d1d9e2] transition-all"
              onClick={() => window.print()}
            >
              <Download className="w-3 h-3" />
              تحميل التأكيد
            </button>
            {b.customerEmail && (
              <button
                className="h-9 px-3.5 rounded-lg border border-[#eef2f6] bg-white text-[11px] font-semibold text-gray-600 flex items-center gap-1.5 hover:bg-[#f8fafc] hover:border-[#d1d9e2] transition-all"
                onClick={() => toast.info("سيصلك التأكيد على بريدك الإلكتروني")}
              >
                <Mail className="w-3 h-3" />
                إرسال للبريد
              </button>
            )}
            {b.eventDate && (
              <a
                href={`data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ASUMMARY:${encodeURIComponent(b.serviceName || "حجز")}%0ADTSTART:${new Date(b.eventDate).toISOString().replace(/[-:]/g, "").split(".")[0]}Z%0AEND:VEVENT%0AEND:VCALENDAR`}
                download="booking.ics"
                className="h-9 px-3.5 rounded-lg border border-[#eef2f6] bg-white text-[11px] font-semibold text-gray-600 flex items-center gap-1.5 hover:bg-[#f8fafc] hover:border-[#d1d9e2] transition-all"
              >
                <CalendarPlus className="w-3 h-3" />
                إضافة للتقويم
              </a>
            )}
            {b.status !== "cancelled" && b.status !== "completed" && (
              <button
                className="h-9 px-3.5 rounded-lg border border-[#fee2e2] bg-white text-[11px] font-semibold text-red-500 flex items-center gap-1.5 hover:bg-[#fee2e2] transition-all"
                onClick={() => toast.info("للإلغاء يرجى التواصل مباشرة مع المنشأة")}
              >
                <X className="w-3 h-3" />
                طلب الإلغاء
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 pb-8 text-[11px] text-gray-400">
          <Shield className="w-3 h-3" />
          <span>مُشغَّل بواسطة</span>
          <span className="font-bold" style={{ color: "#5b9bd5" }}>ترميز OS</span>
        </div>
      </div>

      {/* CSS animations for status pill dot and step ring */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ringPulse { 0%,100%{box-shadow:0 0 0 0 rgba(91,155,213,0.3)} 50%{box-shadow:0 0 0 6px rgba(91,155,213,0)} }
      `}</style>
    </div>
  );
}
