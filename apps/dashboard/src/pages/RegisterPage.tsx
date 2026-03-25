import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { BUSINESS_TYPE_LIST } from "@/lib/constants";

const businessTypes = BUSINESS_TYPE_LIST.map(b => ({ value: b.key, label: b.name }));

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    phone: "",
    email: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [regData, setRegData] = useState<any>(null);
  const [devCode, setDevCode] = useState("");

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطأ في التسجيل");
      setRegData(data);
      if (data._devCode) setDevCode(data._devCode);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      // Store token
      localStorage.setItem("nasaq_token", data.token);
      if (data.user) {
        localStorage.setItem("nasaq_user", JSON.stringify(data.user));
        localStorage.setItem("nasaq_org_id", data.user.orgId || "");
        localStorage.setItem("nasaq_user_id", data.user.id || "");
      }
      setStep(4);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-[Tajawal,sans-serif]">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#1A56DB] flex items-center justify-center">
              <span className="text-white font-black">ن</span>
            </div>
            <span className="text-2xl font-black text-gray-900">نسق</span>
          </Link>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s < step ? "bg-green-500 text-white" : s === step ? "bg-[#1A56DB] text-white" : "bg-gray-200 text-gray-400"
                }`}>
                  {s < step ? "✓" : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
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
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-blue-100 transition-colors"
                    placeholder="مثال: شركة الأمجاد للفعاليات"
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
                            ? "border-[#1A56DB] bg-blue-50 text-[#1A56DB]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!form.businessName || !form.businessType) {
                    setError("يرجى تعبئة جميع الحقول المطلوبة");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="w-full mt-6 bg-[#1A56DB] text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                التالي ←
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
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-blue-100 transition-colors"
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-blue-100 transition-colors"
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  → السابق
                </button>
                <button
                  onClick={() => {
                    if (!form.phone) { setError("رقم الجوال مطلوب"); return; }
                    setError("");
                    handleRegister();
                  }}
                  disabled={loading}
                  className="flex-1 bg-[#1A56DB] text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "جاري التسجيل..." : "إنشاء الحساب ←"}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
            </>
          )}

          {/* Step 3: OTP */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-2">تحقق من الجوال</h1>
              <p className="text-gray-500 text-sm mb-6">
                تم إرسال رمز التحقق إلى {regData?.phone || form.phone}
              </p>
              {devCode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-amber-700 font-medium">وضع التطوير — رمز التحقق: <span className="font-black">{devCode}</span></p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رمز التحقق</label>
                <input
                  type="text"
                  value={form.otp}
                  onChange={(e) => update("otp", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl font-black tracking-widest outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-blue-100 transition-colors"
                  placeholder="xxxxxx"
                  maxLength={6}
                  dir="ltr"
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={loading || form.otp.length < 6}
                className="w-full mt-6 bg-[#1A56DB] text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "جاري التحقق..." : "تحقق ودخول ←"}
              </button>
              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
            </>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">أهلاً بك في نسق!</h2>
              <p className="text-gray-500 text-sm mb-2">تم إنشاء حسابك بنجاح.</p>
              <p className="text-gray-400 text-xs">جاري توجيهك للوحة التحكم...</p>
            </div>
          )}
        </div>

        {step < 4 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="text-[#1A56DB] font-semibold hover:underline">
              سجّل دخول
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
