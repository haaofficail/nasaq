import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Phone, Shield, ArrowLeft, Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";
import { clsx } from "clsx";

type Method = "phone" | "email";
type Step   = "input" | "otp";

function saveSession(res: { token: string; user: any }, remember: boolean) {
  const store = remember ? localStorage : sessionStorage;
  if (remember) sessionStorage.clear();
  else          localStorage.removeItem("nasaq_token");
  store.setItem("nasaq_token",   res.token);
  store.setItem("nasaq_org_id",  res.user.orgId ?? "");
  store.setItem("nasaq_user_id", res.user.id ?? "");
  store.setItem("nasaq_user",    JSON.stringify(res.user));
}

function getRedirectAfterLogin(user: any): string {
  if (user?.isSuperAdmin) return "/dashboard/admin";
  return "/dashboard";
}

export function LoginPage() {
  const navigate = useNavigate();

  const [method, setMethod]   = useState<Method>("email");
  const [step, setStep]       = useState<Step>("input");

  // phone flow
  const [phone, setPhone]     = useState("");
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [devCode, setDevCode] = useState("");

  // email flow
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);

  const [remember, setRemember] = useState(true);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // ─── Phone: request OTP ───────────────────────────────────
  const requestOtp = async () => {
    if (!phone || phone.length < 10) { setError("أدخل رقم جوال صحيح"); return; }
    setLoading(true); setError("");
    try {
      const res: any = await authApi.requestOtp(phone);
      if (res._devCode) setDevCode(res._devCode);
      setStep("otp");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ─── Phone: verify OTP ────────────────────────────────────
  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("أدخل الرمز كاملاً"); return; }
    setLoading(true); setError("");
    try {
      const res = await authApi.verifyOtp(phone, code);
      saveSession(res, remember);
      navigate(getRedirectAfterLogin(res.user));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ─── Email: login ─────────────────────────────────────────
  const loginWithEmail = async () => {
    if (!email || !password) { setError("أدخل الإيميل وكلمة المرور"); return; }
    setLoading(true); setError("");
    try {
      const res = await authApi.loginWithEmail(email, password);
      saveSession(res, remember);
      navigate(getRedirectAfterLogin(res.user));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ─── OTP inputs ───────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp]; next[index] = value; setOtp(next); setError("");
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
    if (value && index === 5 && next.join("").length === 6) setTimeout(verifyOtp, 100);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus();
    if (e.key === "Enter") verifyOtp();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split("")); setTimeout(verifyOtp, 100); }
  };

  const switchMethod = (m: Method) => {
    setMethod(m); setStep("input"); setError("");
    setOtp(["","","","","",""]); setDevCode("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/20">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ترميز OS</h1>
          <p className="text-sm text-gray-500 mt-1">نظام تشغيل أعمالك من مكان واحد</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Method tabs — hidden temporarily (email only) */}

          <div className="p-6">

            {/* ── Phone flow ── */}
            {method === "phone" && step === "input" && (
              <>
                <p className="text-sm text-gray-500 mb-5 text-center">أدخل رقم جوالك وسنرسل لك رمز تحقق</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && requestOtp()}
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-center tracking-widest outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                      autoFocus
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded accent-brand-500 cursor-pointer" />
                    <span className="text-sm text-gray-500">البقاء متصلاً</span>
                  </label>
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                  <button onClick={requestOtp} disabled={loading || !phone} className="w-full bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    إرسال رمز التحقق
                  </button>
                </div>
              </>
            )}

            {/* ── Phone OTP step ── */}
            {method === "phone" && step === "otp" && (
              <>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">رمز التحقق</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    أُرسل إلى <span className="font-mono text-gray-700" dir="ltr">{phone}</span>
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center" dir="ltr" onPaste={handlePaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-12 h-14 rounded-xl border border-gray-200 text-center text-xl font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  {devCode && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                      <p className="text-xs text-amber-600">Dev Mode — الرمز:</p>
                      <p className="text-lg font-bold font-mono text-amber-700 tracking-[0.3em]">{devCode}</p>
                    </div>
                  )}
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                  <button onClick={verifyOtp} disabled={loading || otp.join("").length !== 6} className="w-full bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    تأكيد
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button onClick={() => { setStep("input"); setOtp(["","","","","",""]); setError(""); }} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3 rotate-180" /> تغيير الرقم
                    </button>
                    <button onClick={requestOtp} disabled={loading} className="text-brand-500 hover:text-brand-600 font-medium">
                      إعادة الإرسال
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Email flow ── */}
            {method === "email" && step === "input" && (
              <>
                <p className="text-sm text-gray-500 mb-5 text-center">أدخل إيميلك وكلمة المرور</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && loginWithEmail()}
                      placeholder="name@example.com"
                      dir="ltr"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(""); }}
                        onKeyDown={e => e.key === "Enter" && loginWithEmail()}
                        placeholder="••••••••"
                        dir="ltr"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded accent-brand-500 cursor-pointer" />
                    <span className="text-sm text-gray-500">البقاء متصلاً</span>
                  </label>
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                  <button onClick={loginWithEmail} disabled={loading || !email || !password} className="w-full bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    تسجيل الدخول
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Tarmiz OS — نظام إدارة الأعمال</p>
      </div>
    </div>
  );
}
