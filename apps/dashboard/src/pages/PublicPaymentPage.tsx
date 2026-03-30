import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { paymentsApi } from "@/lib/api";

export function PublicPaymentPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [searchParams] = useSearchParams();

  const invoiceId  = searchParams.get("invoiceId") ?? undefined;
  const bookingId  = searchParams.get("bookingId") ?? undefined;
  const customerId = searchParams.get("customerId") ?? undefined;
  const amountStr  = searchParams.get("amount") ?? "";
  const desc       = searchParams.get("description") ?? "دفع إلكتروني";
  const moyasarId  = searchParams.get("id");          // callback from Moyasar
  const callbackStatus = searchParams.get("status");  // callback from Moyasar

  const amount = parseFloat(amountStr) || 0;
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [paid, setPaid]         = useState(false);
  const [payFailed, setPayFailed] = useState(false);

  // إذا عاد العميل من Moyasar
  useEffect(() => {
    if (moyasarId && callbackStatus === "paid") setPaid(true);
    else if (moyasarId && callbackStatus) setPayFailed(true);
  }, [moyasarId, callbackStatus]);

  async function handlePay() {
    if (!orgSlug || !amount) return;
    setLoading(true);
    setError(null);
    try {
      const callbackUrl = window.location.href.split("?")[0]
        + `?invoiceId=${invoiceId ?? ""}&bookingId=${bookingId ?? ""}&amount=${amount}&description=${encodeURIComponent(desc)}`;

      const res: any = await paymentsApi.initiate({
        orgSlug,
        invoiceId,
        bookingId,
        customerId,
        amount,
        description: desc,
        callbackUrl,
        metadata: {
          ...(invoiceId ? { invoiceId } : {}),
          ...(bookingId ? { bookingId } : {}),
        },
      });

      if (res?.error) { setError(res.error); return; }

      const payUrl = res?.data?.paymentUrl;
      if (payUrl) window.location.href = payUrl;
      else setError("لم يتم إنشاء رابط الدفع");
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  if (paid) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-6" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm w-full">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">تم الدفع بنجاح</h1>
        <p className="text-gray-500 text-sm">شكراً لك. تمت معالجة دفعتك.</p>
      </div>
    </div>
  );

  if (payFailed) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-6" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm w-full">
        <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">فشلت عملية الدفع</h1>
        <p className="text-gray-500 text-sm mb-6">يرجى المحاولة مرة أخرى أو التواصل مع المنشأة.</p>
        <button
          onClick={() => { setPayFailed(false); }}
          className="px-6 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-medium"
        >
          المحاولة مجدداً
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#5b9bd5]/10 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[#5b9bd5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-800">إتمام الدفع</h1>
            <p className="text-xs text-gray-400">بوابة نسق الآمنة</p>
          </div>
        </div>

        {desc && (
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <span className="text-sm text-gray-500">المبلغ المستحق</span>
          <span className="text-xl font-bold text-gray-800">
            {amount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!amount && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            المبلغ غير محدد
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading || !amount}
          className="w-full py-3 bg-[#5b9bd5] text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          {loading ? "جاري التحويل..." : "ادفع الآن"}
        </button>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>مدفوعات آمنة عبر Moyasar</span>
        </div>
      </div>
    </div>
  );
}
