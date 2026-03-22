import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Phone, Shield, ArrowLeft, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";

type Step = "phone" | "otp";

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  // Step 1: Request OTP
  const requestOtp = async () => {
    if (!phone || phone.length < 10) { setError("أدخل رقم جوال صحيح"); return; }
    setLoading(true); setError("");
    try {
      const res: any = await authApi.requestOtp(phone);
      if (res._devCode) setDevCode(res._devCode);
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // Step 2: Verify OTP
  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("أدخل الرمز كاملاً"); return; }
    setLoading(true); setError("");
    try {
      const res = await authApi.verifyOtp(phone, code);
      localStorage.setItem("nasaq_token", res.token);
      localStorage.setItem("nasaq_org_id", res.user.orgId);
      localStorage.setItem("nasaq_user_id", res.user.id);
      localStorage.setItem("nasaq_user", JSON.stringify(res.user));
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // OTP input handler
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    // Auto-focus next
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
    // Auto-submit when complete
    if (value && index === 5) {
      const code = newOtp.join("");
      if (code.length === 6) {
        setTimeout(() => verifyOtp(), 100);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
    if (e.key === "Enter") verifyOtp();
  };

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      setTimeout(() => verifyOtp(), 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/20">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">نسق</h1>
          <p className="text-sm text-gray-500 mt-1">نظام تشغيل الفعاليات</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {step === "phone" ? (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-6 h-6 text-brand-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">تسجيل الدخول</h2>
                <p className="text-sm text-gray-500 mt-1">أدخل رقم جوالك وسنرسل لك رمز تحقق</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-center tracking-widest outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <button
                  onClick={requestOtp}
                  disabled={loading || !phone}
                  className="w-full bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  إرسال رمز التحقق
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">رمز التحقق</h2>
                <p className="text-sm text-gray-500 mt-1">
                  أدخل الرمز المرسل إلى <span className="font-mono text-gray-700 dir-ltr">{phone}</span>
                </p>
              </div>

              <div className="space-y-4">
                {/* OTP Inputs */}
                <div className="flex gap-2 justify-center" dir="ltr" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 rounded-xl border border-gray-200 text-center text-xl font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* Dev mode: show code */}
                {devCode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                    <p className="text-xs text-amber-600">Dev Mode — الرمز:</p>
                    <p className="text-lg font-bold font-mono text-amber-700 tracking-[0.3em]">{devCode}</p>
                  </div>
                )}

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <button
                  onClick={verifyOtp}
                  disabled={loading || otp.join("").length !== 6}
                  className="w-full bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  تأكيد
                </button>

                {/* Actions */}
                <div className="flex items-center justify-between text-sm">
                  <button onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); }} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3 rotate-180" /> تغيير الرقم
                  </button>
                  <button onClick={requestOtp} disabled={loading} className="text-brand-500 hover:text-brand-600 font-medium">
                    إعادة الإرسال
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">نسق v0.1 — نظام تشغيل الفعاليات</p>
      </div>
    </div>
  );
}
