import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { BUSINESS_TYPE_LIST } from "@/lib/constants";
import { normalizePhone } from "@/lib/normalize-input";
import { BRAND } from "@/lib/branding";
import { PlatformBrandStatic } from "@/components/branding/PlatformLogo";

const businessTypes = BUSINESS_TYPE_LIST.map(b => ({ value: b.key, label: b.name }));

function isValidSaudiPhone(phone: string) {
  const clean = phone.replace(/\D/g, "");
  return clean.length === 10 && clean.startsWith("05");
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") ?? "";
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    phone: "",
    email: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [regData, setRegData] = useState<any>(null);

  const update = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }));

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          phone: form.phone,
          email: form.email,
          businessType: form.businessType,
          ...(referralCode ? { referralCode } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطأ في التسجيل");
      setRegData(data);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError("");
    try {
      const endpoint = form.email ? "/api/v1/auth/otp/request-email" : "/api/v1/auth/otp/request";
      const body = form.email ? { email: form.email } : { phone: regData?.phone || form.phone };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "تعذّر إعادة الإرسال");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: regData?.phone || form.phone, code: form.otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "رمز غير صحيح");
      localStorage.setItem("nasaq_token", data.token);
      if (data.user) {
        localStorage.setItem("nasaq_user", JSON.stringify(data.user));
        localStorage.setItem("nasaq_org_id", data.user.orgId || "");
        localStorage.setItem("nasaq_user_id", data.user.id || "");
      }
      setStep(4);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToStep2 = () => {
    if (!form.businessName || !form.businessType) {
      setError("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setError("");
    setStep(2);
  };

  const goToStep3 = () => {
    if (!form.phone) { setError("رقم الجوال مطلوب"); return; }
    if (!isValidSaudiPhone(form.phone)) { setError("رقم الجوال غير صحيح — تأكد أنه يبدأ بـ 05 ومكوّن من 10 أرقام"); return; }
    setError("");
    handleRegister();
  };

  const otpTarget = form.email || regData?.phone || form.phone;

  return (
    <div dir="rtl" className="min-h-screen flex overflow-hidden">

      {/* ── Brand panel (hidden on mobile) ────────────────── */}
      <div className="hidden lg:flex w-[480px] shrink-0 relative flex-col justify-between p-11 overflow-hidden bg-[#0d1117]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: [
              "radial-gradient(ellipse 80% 60% at 15% 25%, rgba(91,155,213,0.18) 0%, transparent 70%)",
              "radial-gradient(ellipse 60% 50% at 85% 75%, rgba(155,143,196,0.12) 0%, transparent 65%)",
            ].join(","),
          }} />
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }} />
        </div>
        <div className="relative z-10 flex items-center gap-2.5">
          <PlatformBrandStatic logoSize={30} textSize="lg" variant="dark" showText={false} />
          <span className="text-[17px] font-bold text-white/90">{BRAND.nameAr}</span>
          <span className="text-[9px] font-semibold text-[#5b9bd5] bg-[rgba(91,155,213,0.15)] border border-[rgba(91,155,213,0.25)] px-1.5 py-0.5 rounded-md">Vendor OS</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-[38px] font-bold text-white/95 leading-tight tracking-tight mb-4">
            ابدأ مجاناً<br /><span className="text-[#5b9bd5]">لا تحتاج بطاقة</span>
          </h2>
          <p className="text-sm text-white/40 leading-relaxed max-w-[300px] mb-8">
            أنشئ حسابك في دقيقتين وابدأ باستقبال الحجوزات فوراً — 15 حجز مجاني بدون قيود.
          </p>
          <div className="space-y-2">
            {[
              { color: "#5b9bd5", bg: "rgba(91,155,213,0.15)",  text: "إعداد سريع — أقل من دقيقتين" },
              { color: "#1a9e72", bg: "rgba(26,158,114,0.15)",  text: "لا بطاقة ائتمانية مطلوبة" },
              { color: "#d4b06a", bg: "rgba(212,176,106,0.15)", text: "يدعم 8 قطاعات مختلفة" },
            ].map((pill, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/7 bg-white/4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: pill.bg }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: pill.color }} />
                </div>
                <span className="text-[12px] text-white/65 font-medium">{pill.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">يدعم القطاعات</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "مطعم", color: "#7eb5d4" }, { label: "صالون", color: "#d4917e" },
              { label: "فعاليات", color: "#9b8fc4" }, { label: "زهور", color: "#7fb09b" },
              { label: "متجر", color: "#d4b06a" }, { label: "فندق", color: "#c98b8b" },
            ].map(s => (
              <span key={s.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: `${s.color}b3` }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form panel ─────────────────────────────────────── */}
      <div className="flex-1 bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-y-auto">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(91,155,213,0.05) 0%, transparent 60%)",
        }} />

      <div className="w-full max-w-lg relative z-10">
        {/* Mobile-only logo */}
        <div className="lg:hidden text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-brand-500 flex items-center justify-center">
              <span className="text-white font-black">ت</span>
            </div>
            <span className="text-2xl font-black text-gray-900">ترميز OS</span>
          </Link>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s < step ? "bg-green-500 text-white" : s === step ? "bg-brand-500 text-white" : "bg-[#eef2f6] text-[#94a3b8]"
                }`}>
                  {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-green-500" : "bg-[#eef2f6]"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#eef2f6] p-8 shadow-sm">
          {/* Step 1: Business info */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-2">معلومات نشاطك التجاري</h1>
              <p className="text-gray-500 text-sm mb-6">أخبرنا عن عملك لنخصص تجربتك</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم النشاط التجاري <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goToStep2()}
                    className="w-full rounded-xl border border-[#eef2f6] px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-blue-100 transition-colors"
                    placeholder="مثال: شركة الأمجاد للفعاليات"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع النشاط <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {businessTypes.map((bt) => (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => update("businessType", bt.value)}
                        className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all text-right ${
                          form.businessType === bt.value
                            ? "border-brand-500 bg-blue-50 text-brand-500"
                            : "border-[#eef2f6] text-gray-600 hover:border-[#eef2f6]"
                        }`}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={goToStep2}
                className="w-full mt-6 bg-brand-500 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                التالي
              </button>
              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
            </>
          )}

          {/* Step 2: Account setup */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-2">إعداد الحساب</h1>
              <p className="text-gray-500 text-sm mb-6">أدخل بيانات التواصل الخاصة بك</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال <span className="text-red-400">*</span></label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", normalizePhone(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && goToStep3()}
                    className="w-full rounded-xl border border-[#eef2f6] px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-blue-100 transition-colors"
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goToStep3()}
                    className="w-full rounded-xl border border-[#eef2f6] px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-blue-100 transition-colors"
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setError(""); setStep(1); }} className="px-6 py-4 rounded-xl border border-[#eef2f6] text-sm font-medium text-gray-600 hover:bg-[#f8fafc] transition-colors">
                  السابق
                </button>
                <button
                  onClick={goToStep3}
                  disabled={loading}
                  className="flex-1 bg-brand-500 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "جاري التسجيل..." : "إنشاء الحساب"}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
            </>
          )}

          {/* Step 3: OTP */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-2">تحقق من هويتك</h1>
              <p className="text-gray-500 text-sm mb-6">
                تم إرسال رمز التحقق إلى <span className="font-semibold text-gray-700">{otpTarget}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رمز التحقق</label>
                <input
                  type="text"
                  value={form.otp}
                  onChange={(e) => update("otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && form.otp.length === 6 && handleVerify()}
                  className="w-full rounded-xl border border-[#eef2f6] px-4 py-3 text-center text-2xl font-black tracking-widest outline-none focus:border-brand-500 focus:ring-1 focus:ring-blue-100 transition-colors"
                  placeholder="000000"
                  maxLength={6}
                  dir="ltr"
                  autoFocus
                  inputMode="numeric"
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={loading || form.otp.length < 6}
                className="w-full mt-4 bg-brand-500 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "جاري التحقق..." : "تحقق ودخول"}
              </button>
              <button
                onClick={handleResendOtp}
                disabled={resending}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-brand-500 transition-colors disabled:opacity-50"
              >
                {resending ? "جاري الإرسال..." : "لم يصلك الرمز؟ إعادة الإرسال"}
              </button>
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">أهلاً بك في ترميز OS!</h2>
              <p className="text-gray-500 text-sm mb-2">تم إنشاء حسابك بنجاح.</p>
              <p className="text-gray-400 text-xs">جاري توجيهك للوحة التحكم...</p>
            </div>
          )}
        </div>

        {step < 4 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="text-brand-500 font-semibold hover:underline">
              سجّل دخول
            </Link>
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
