import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, MapPin, Calendar, CreditCard, Shield, Phone, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { publicApi } from "@/lib/api";
import { fmtDate } from "@/lib/utils";

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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );

  if (error || !b) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 p-6">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-gray-600 font-medium">{error || "الحجز غير موجود"}</p>
    </div>
  );

  const totalAmount = parseFloat(b.totalAmount || 0);
  const paidAmount = parseFloat(b.paidAmount || 0);
  const balanceDue = parseFloat(b.balanceDue || 0);
  const paidPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const primaryColor = b.config?.primaryColor || b.org?.primaryColor || "#5b9bd5";
  const font = b.config?.fontFamily || "IBM Plex Sans Arabic";
  const logo = b.config?.logoUrl || b.org?.logo;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl" style={{ fontFamily: font }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: primaryColor }}>
              {logo ? <img src={logo} className="w-full h-full object-cover rounded-xl" alt="" /> : (b.org?.name?.[0] || "ن")}
            </div>
            <div>
              <span className="font-bold text-gray-900">{b.org?.name}</span>
              <p className="text-xs text-gray-400">تتبع الحجز</p>
            </div>
          </div>
          {b.org?.phone && <a href={`tel:${b.org.phone}`} className="p-2 rounded-lg hover:bg-gray-100"><Phone className="w-5 h-5 text-gray-500" /></a>}
        </div>
      </header>

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Booking number */}
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">رقم الحجز</p>
          <p className="text-lg font-bold font-mono text-gray-900 tracking-wider">{b.bookingNumber}</p>
        </div>

        {/* Service + date */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          {b.serviceName && <h2 className="font-bold text-gray-900">{b.serviceName}</h2>}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {b.eventDate && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />{fmtDate(b.eventDate)}</span>}
            {b.eventDate && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" />{new Date(b.eventDate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>}
            {b.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" />{b.location}</span>}
          </div>
        </div>

        {/* Timeline */}
        {b.timeline?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-4">حالة الحجز</h3>
            <div className="space-y-0">
              {b.timeline.map((step: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2",
                      step.done ? "border-green-500 bg-green-500 text-white" :
                      step.current ? "border-blue-500 bg-blue-500 text-white ring-4 ring-blue-100" :
                      "border-gray-200 bg-white text-gray-300"
                    )}>
                      {step.done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    {i < b.timeline.length - 1 && (
                      <div className={clsx("w-0.5 h-10 my-1", step.done ? "bg-green-400" : "bg-gray-200")} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={clsx("text-sm font-medium", step.done || step.current ? "text-gray-900" : "text-gray-400")}>{step.stage}</p>
                    {step.current && <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">الحالة الحالية</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-gray-900">المدفوعات</h3>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">المدفوع</span>
              <span className="font-medium text-green-600">{paidAmount.toLocaleString("en-US")} ر.س</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="text-gray-400">{paidPct}%</span>
              <span className="text-gray-400">الإجمالي: {totalAmount.toLocaleString("en-US")} ر.س</span>
            </div>
          </div>

          {paymentDone && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> تم استلام الدفع — شكراً لك
            </div>
          )}

          {balanceDue > 0 && !paymentDone && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-amber-700 font-medium">المبلغ المتبقي</span>
                <span className="text-lg font-bold text-amber-700">{balanceDue.toLocaleString("en-US")} ر.س</span>
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
                      alert(res?.error || "تعذر إنشاء رابط الدفع");
                    }
                  } finally {
                    setPaying(false);
                  }
                }}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
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
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-500 mb-3">تحتاج مساعدة؟</p>
            <div className="flex gap-3 justify-center">
              <a href={`https://wa.me/966${b.org.phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer"
                className="px-6 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600">واتساب</a>
              <a href={`tel:${b.org.phone}`}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">اتصال</a>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pb-8 text-xs text-gray-400">
          <Shield className="w-3 h-3" /> مدعوم بواسطة <span className="font-bold text-brand-500">نسق</span>
        </div>
      </div>
    </div>
  );
}
