import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Shield, ArrowLeft, Loader2, Mail, Eye, EyeOff, MessageCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import { clsx } from "clsx";
import { BRAND } from "@/lib/branding";
import { PlatformBrandStatic } from "@/components/branding/PlatformLogo";
import { normalizePhone } from "@/lib/normalize-input";

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

  const [method, setMethod]   = useState<Method>("phone");
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
    if (!phone || phone.length < 10) { setError("رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام"); return; }
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
    if (code.length !== 6) { setError("أدخل رمز التحقق المكون من 6 أرقام"); return; }
    setLoading(true); setError("");
    try {
      const res = await authApi.verifyOtp(phone, code);
      saveSession(res, remember);
      navigate(getRedirectAfterLogin(res.user));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ─── Email: request OTP ───────────────────────────────────
  const requestEmailOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("أدخل بريداً إلكترونياً صحيحاً"); return; }
    setLoading(true); setError("");
    try {
      const res: any = await authApi.requestEmailOtp(email);
      if (res._devCode) setDevCode(res._devCode);
      setStep("otp");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ─── Email: verify OTP ────────────────────────────────────
  const verifyEmailOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("أدخل رمز التحقق المكون من 6 أرقام"); return; }
    setLoading(true); setError("");
    try {
      const res = await authApi.verifyEmailOtp(email, code);
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
    if (value && index === 5 && next.join("").length === 6) setTimeout(method === "email" ? verifyEmailOtp : verifyOtp, 100);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus();
    if (e.key === "Enter") method === "email" ? verifyEmailOtp() : verifyOtp();
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
    <div className="min-h-screen flex overflow-hidden" dir="rtl">

      {/* ── Brand panel (hidden on mobile) ────────────────── */}
      <div className="hidden lg:flex w-[480px] shrink-0 relative flex-col justify-between p-11 overflow-hidden bg-[#0d1117]">
        {/* Layered radial glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            background: [
              "radial-gradient(ellipse 80% 60% at 15% 25%, rgba(91,155,213,0.18) 0%, transparent 70%)",
              "radial-gradient(ellipse 60% 50% at 85% 75%, rgba(155,143,196,0.12) 0%, transparent 65%)",
              "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(127,176,155,0.06) 0%, transparent 60%)",
            ].join(","),
          }} />
          {/* Dot grid */}
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }} />
          {/* Orbit rings */}
          <div className="absolute" style={{ left: -80, top: "50%", transform: "translateY(-50%)", width: 400, height: 400 }}>
            {[
              { size: 400, color: "rgba(91,155,213,0.12)",  dur: "20s", orbColor: "rgba(91,155,213,0.8)",   glow: "rgba(91,155,213,0.5)",   dir: "normal" },
              { size: 320, color: "rgba(155,143,196,0.10)", dur: "14s", orbColor: "rgba(155,143,196,0.8)",  glow: "rgba(155,143,196,0.4)",  dir: "reverse" },
              { size: 240, color: "rgba(127,176,155,0.08)", dur: "9s",  orbColor: "rgba(127,176,155,0.8)",  glow: "rgba(127,176,155,0.4)",  dir: "normal" },
            ].map((r, i) => (
              <div key={i} className="absolute rounded-full flex items-start justify-center" style={{
                inset: (400 - r.size) / 2,
                border: `1px solid ${r.color}`,
                animation: `spin ${r.dur} linear infinite ${r.dir}`,
              }}>
                <div className="w-2 h-2 rounded-full -mt-1" style={{
                  background: r.orbColor,
                  boxShadow: `0 0 10px ${r.glow}`,
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <PlatformBrandStatic logoSize={30} textSize="lg" variant="dark" showText={false} />
            <span className="text-[17px] font-bold text-white/90">{BRAND.nameAr}</span>
            <span className="text-[9px] font-semibold text-[#5b9bd5] bg-[rgba(91,155,213,0.15)] border border-[rgba(91,155,213,0.25)] px-1.5 py-0.5 rounded-md">Vendor OS</span>
          </div>
        </div>

        {/* Headline + feature pills */}
        <div className="relative z-10 space-y-7">
          <div>
            <h2 className="text-[38px] font-bold text-white/95 leading-tight tracking-tight">
              أدِر نشاطك<br />من <span className="text-[#5b9bd5]">مكان واحد</span>
            </h2>
            <p className="text-sm text-white/40 mt-4 leading-relaxed max-w-[300px]">
              منصة SaaS شاملة لإدارة الحجوزات، العملاء، الفواتير والموظفين — مصممة للأعمال السعودية.
            </p>
          </div>
          <div className="space-y-2">
            {[
              { color: "#5b9bd5", bg: "rgba(91,155,213,0.15)",   text: "حجوزات ذكية مع تقويم تشغيلي" },
              { color: "#1a9e72", bg: "rgba(26,158,114,0.15)",   text: "فواتير ضريبية معتمدة — ZATCA" },
              { color: "#9b8fc4", bg: "rgba(155,143,196,0.15)",  text: "إدارة عملاء وولاء متكاملة" },
            ].map((pill, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/7 bg-white/4 hover:bg-[rgba(91,155,213,0.08)] hover:border-[rgba(91,155,213,0.2)] transition-all">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: pill.bg }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: pill.color }} />
                </div>
                <span className="text-[12px] text-white/65 font-medium">{pill.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sector dots */}
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

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>

      {/* ── Form panel ─────────────────────────────────────── */}
      <div className="flex-1 bg-[#f8fafc] flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(91,155,213,0.05) 0%, transparent 60%)",
        }} />

        <div className="w-full max-w-[380px] relative z-10">

          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-8">
            <PlatformBrandStatic logoSize={48} textSize="xl" variant="default" showText={false} />
            <h1 className="text-xl font-bold text-gray-900 mt-3">{BRAND.nameAr}</h1>
            <p className="text-sm text-gray-400 mt-1">نظام تشغيل أعمالك من مكان واحد</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm overflow-hidden">

            {/* Method tabs */}
            <div className="flex border-b border-[#eef2f6]">
              <button
                onClick={() => switchMethod("phone")}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-[6px] text-sm font-medium transition-colors",
                  method === "phone"
                    ? "text-brand-600 border-b-2 border-brand-500 bg-brand-50/50"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <MessageCircle className="w-4 h-4" />
                واتساب
              </button>
              <button
                onClick={() => switchMethod("email")}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-[6px] text-sm font-medium transition-colors",
                  method === "email"
                    ? "text-brand-600 border-b-2 border-brand-500 bg-brand-50/50"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Mail className="w-4 h-4" />
                إيميل
              </button>
            </div>

            <div className="p-6">

              {/* ── Phone flow ── */}
              {method === "phone" && step === "input" && (
                <>
                  <p className="text-sm text-gray-500 mb-5 text-center">أدخل رقم جوالك وسنرسل لك رمز تحقق عبر واتساب</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">رقم الجوال</label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={e => { setPhone(normalizePhone(e.target.value)); setError(""); }}
                        onKeyDown={e => e.key === "Enter" && requestOtp()}
                        placeholder="05XXXXXXXX"
                        dir="ltr"
                        className="w-full h-11 rounded-xl border border-[#e2e8f0] px-4 text-base text-center tracking-widest outline-none focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/10 transition-all"
                        autoFocus
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded accent-brand-500 cursor-pointer" />
                      <span className="text-sm text-gray-500">تذكرني على هذا الجهاز</span>
                    </label>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <button onClick={requestOtp} disabled={loading || !phone}
                      className="w-full h-12 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      style={{ boxShadow: "0 4px 20px rgba(91,155,213,0.35)" }}
                    >
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
                      أُرسل رمز التحقق عبر واتساب إلى <span className="font-mono text-gray-700" dir="ltr">{phone}</span>
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
                          className="w-12 h-14 rounded-xl border border-[#eef2f6] text-center text-xl font-bold outline-none focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/10 transition-all"
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
                    <button onClick={verifyOtp} disabled={loading || otp.join("").length !== 6}
                      className="w-full h-12 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      style={{ boxShadow: "0 4px 20px rgba(91,155,213,0.35)" }}
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      تأكيد الرمز
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

              {/* ── Email OTP: input step ── */}
              {method === "email" && step === "input" && (
                <>
                  <p className="text-sm text-gray-500 mb-5 text-center">أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(""); }}
                        onKeyDown={e => e.key === "Enter" && requestEmailOtp()}
                        placeholder="name@example.com"
                        dir="ltr"
                        className="w-full h-11 rounded-xl border border-[#e2e8f0] px-4 text-sm outline-none focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/10 transition-all"
                        autoFocus
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded accent-brand-500 cursor-pointer" />
                      <span className="text-sm text-gray-500">تذكرني على هذا الجهاز</span>
                    </label>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <button onClick={requestEmailOtp} disabled={loading || !email}
                      className="w-full h-12 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      style={{ boxShadow: "0 4px 20px rgba(91,155,213,0.35)" }}
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      إرسال رمز التحقق
                    </button>
                  </div>
                </>
              )}

              {/* ── Email OTP: verify step ── */}
              {method === "email" && step === "otp" && (
                <>
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                      <Mail className="w-6 h-6 text-brand-600" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900">رمز التحقق</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      أُرسل رمز التحقق إلى <span className="font-medium text-gray-700">{email}</span>
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
                          className="w-12 h-14 rounded-xl border border-[#eef2f6] text-center text-xl font-bold outline-none focus:border-brand-400 focus:ring-[3px] focus:ring-brand-400/10 transition-all"
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
                    <button onClick={verifyEmailOtp} disabled={loading || otp.join("").length !== 6}
                      className="w-full h-12 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      style={{ boxShadow: "0 4px 20px rgba(91,155,213,0.35)" }}
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      تأكيد الرمز
                    </button>
                    <div className="flex items-center justify-between text-sm">
                      <button onClick={() => { setStep("input"); setOtp(["","","","","",""]); setError(""); }} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3 rotate-180" /> تغيير البريد
                      </button>
                      <button onClick={requestEmailOtp} disabled={loading} className="text-brand-500 hover:text-brand-600 font-medium">
                        إعادة الإرسال
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">ترميز OS — نظام إدارة الأعمال</p>
        </div>
      </div>
    </div>
  );
}
