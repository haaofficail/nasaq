import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";

type Mode = "password" | "otp";
type OtpStep = "phone" | "otp";

function saveSession(res: { token: string; user: any }, persist: boolean) {
  const store = persist ? localStorage : sessionStorage;
  // Clear the other storage to avoid stale tokens
  if (persist) sessionStorage.removeItem("nasaq_token");
  else localStorage.removeItem("nasaq_token");

  store.setItem("nasaq_token",   res.token);
  store.setItem("nasaq_org_id",  res.user.orgId ?? "");
  store.setItem("nasaq_user_id", res.user.id ?? "");
  store.setItem("nasaq_user",    JSON.stringify(res.user));
}

export function SchoolLoginPage() {
  const navigate = useNavigate();

  // Mode toggle
  const [mode, setMode] = useState<Mode>("password");

  // Shared
  const [phone, setPhone]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [remember, setRemember] = useState(true);

  // Password mode
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP mode
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [devCode, setDevCode] = useState("");

  const clearError = () => setError("");

  // ── Password login ──────────────────────────────────────────
  const loginWithPassword = async () => {
    if (!phone || phone.length < 10) { setError("أدخل رقم جوال صحيح"); return; }
    if (!password)                   { setError("أدخل كلمة المرور"); return; }
    setLoading(true); setError("");
    try {
      const res: any = await authApi.loginWithPhone(phone, password);
      saveSession(res, remember);
      navigate("/school/dashboard");
    } catch (err: any) {
      setError(err.message ?? "رقم الجوال أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP request ─────────────────────────────────────────────
  const requestOtp = async () => {
    if (!phone || phone.length < 10) { setError("أدخل رقم جوال صحيح"); return; }
    setLoading(true); setError("");
    try {
      const res: any = await authApi.requestOtp(phone);
      if (res._devCode) setDevCode(res._devCode);
      setOtpStep("otp");
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP verify ──────────────────────────────────────────────
  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("أدخل الرمز كاملاً"); return; }
    setLoading(true); setError("");
    try {
      const res: any = await authApi.verifyOtp(phone, code);
      saveSession(res, remember);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "رمز غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpKey = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) document.getElementById(`school-otp-${idx + 1}`)?.focus();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setOtpStep("phone");
    setOtp(["", "", "", "", "", ""]);
    setDevCode("");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/school" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gray-900 leading-none">ترميز OS</p>
              <p className="text-sm font-semibold text-emerald-600">للمدارس</p>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {/* Mode tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => switchMode("password")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "password"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              كلمة المرور
            </button>
            <button
              onClick={() => switchMode("otp")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "otp"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              رمز التحقق
            </button>
          </div>

          {/* ── Password mode ── */}
          {mode === "password" && (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-1">تسجيل الدخول</h1>
              <p className="text-gray-500 text-sm mb-6">أدخل رقم الجوال وكلمة المرور</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearError(); }}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("school-password")?.focus()}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="05XXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
                  <div className="relative">
                    <input
                      id="school-password"
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      onKeyDown={(e) => e.key === "Enter" && loginWithPassword()}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 mt-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600">تذكرني وابقَ متصلاً</span>
              </label>

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

              <button
                onClick={loginWithPassword}
                disabled={loading}
                className="w-full mt-5 bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "دخول"}
              </button>

              <p className="text-center text-sm text-gray-500 mt-5">
                ليس لديك حساب؟{" "}
                <Link to="/school/register" className="text-emerald-600 font-semibold hover:text-emerald-700">
                  سجّل مدرستك
                </Link>
              </p>
            </>
          )}

          {/* ── OTP mode ── */}
          {mode === "otp" && otpStep === "phone" && (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-1">تسجيل الدخول</h1>
              <p className="text-gray-500 text-sm mb-6">أدخل رقم الجوال لاستقبال رمز التحقق</p>

              <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال</label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); clearError(); }}
                onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                placeholder="05XXXXXXXX"
              />

              {/* Remember me */}
              <label className="flex items-center gap-2.5 mt-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600">تذكرني وابقَ متصلاً</span>
              </label>

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

              <button
                onClick={requestOtp}
                disabled={loading}
                className="w-full mt-5 bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال رمز التحقق"}
              </button>
            </>
          )}

          {mode === "otp" && otpStep === "otp" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => { setOtpStep("phone"); setOtp(["","","","","",""]); clearError(); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-black text-gray-900">رمز التحقق</h1>
                  <p className="text-sm text-gray-500">أُرسل إلى {phone}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-center mb-4" dir="ltr">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    id={`school-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpKey(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0)
                        document.getElementById(`school-otp-${i - 1}`)?.focus();
                    }}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-colors"
                  />
                ))}
              </div>

              {devCode && (
                <p dir="ltr" className="text-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
                  <span dir="rtl">رمز التطوير:</span> <strong>{devCode}</strong>
                </p>
              )}

              {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}

              <button
                onClick={verifyOtp}
                disabled={loading || otp.join("").length < 6}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "دخول"}
              </button>

              <button
                onClick={() => { setOtp(["","","","","",""]); requestOtp(); }}
                className="w-full mt-3 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
              >
                إعادة إرسال الرمز
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/" className="hover:text-gray-600 transition-colors">العودة للصفحة الرئيسية</Link>
          {" · "}
          <Link to="/school" className="hover:text-gray-600 transition-colors">صفحة المدارس</Link>
        </p>
      </div>
    </div>
  );
}
