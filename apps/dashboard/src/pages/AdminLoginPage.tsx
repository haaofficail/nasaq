import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Eye, EyeOff, Loader2, Lock, Phone, ChevronRight, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { BRAND } from "@/lib/branding";
import { PlatformBrandStatic } from "@/components/branding/PlatformLogo";
import { normalizePhone } from "@/lib/normalize-input";

type View = "login" | "reset_phone" | "reset_otp" | "reset_password" | "reset_done";

export function AdminLoginPage() {
  const navigate = useNavigate();

  // --- login state ---
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState("");

  // --- reset state ---
  const [view, setView]             = useState<View>("login");
  const [resetPhone, setResetPhone] = useState("");
  const [otp, setOtp]               = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPass, setNewPass]       = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]     = useState("");
  const [resetInfo, setResetInfo]       = useState("");

  // ============================================================
  // Login
  // ============================================================
  const handleLogin = async () => {
    if (!email || !password) { setLoginError("أدخل البريد الإلكتروني وكلمة المرور"); return; }
    setLoginLoading(true);
    setLoginError("");
    try {
      const res: any = await authApi.loginWithEmail(email, password);
      const ALLOWED = ["account_manager", "support_agent", "content_manager", "viewer"];
      if (!res?.user?.isSuperAdmin && !ALLOWED.includes(res?.user?.nasaqRole)) {
        setLoginError("هذا الحساب ليس لديه صلاحية الدخول للوحة الإدارة");
        return;
      }
      localStorage.setItem("nasaq_token",   res.token);
      localStorage.setItem("nasaq_org_id",  res.user.orgId);
      localStorage.setItem("nasaq_user_id", res.user.id);
      localStorage.setItem("nasaq_user",    JSON.stringify(res.user));
      navigate("/admin", { replace: true });
    } catch (err: any) {
      setLoginError(err.message || "بيانات الدخول غير صحيحة");
    } finally {
      setLoginLoading(false);
    }
  };

  // ============================================================
  // Step 1: طلب OTP
  // ============================================================
  const handleResetRequest = async () => {
    const normalized = normalizePhone(resetPhone);
    if (!normalized) { setResetError("أدخل رقم جوال صحيح"); return; }
    setResetLoading(true);
    setResetError("");
    setResetInfo("");
    try {
      const res = await authApi.adminResetRequest(normalized);
      setResetInfo(res.message || "إذا كانت البيانات صحيحة سيتم إرسال رمز التحقق");
      // انتقل لإدخال الرمز بغض النظر عن النتيجة (لا تكشف صحة الرقم)
      if (res._devCode) {
        setOtp(res._devCode); // dev only — auto-fill
      }
      setView("reset_otp");
    } catch (err: any) {
      // حتى عند الخطأ — انتقل (لا تكشف سبب الفشل)
      setView("reset_otp");
    } finally {
      setResetLoading(false);
    }
  };

  // ============================================================
  // Step 2: التحقق من OTP
  // ============================================================
  const handleResetVerify = async () => {
    if (!otp || otp.length < 6) { setResetError("أدخل رمز التحقق المكون من 6 أرقام"); return; }
    setResetLoading(true);
    setResetError("");
    try {
      const normalized = normalizePhone(resetPhone)!;
      const res = await authApi.adminResetVerify(normalized, otp);
      setResetToken(res.resetToken);
      setView("reset_password");
    } catch (err: any) {
      setResetError(err.message || "رمز التحقق غير صحيح أو منتهي الصلاحية");
    } finally {
      setResetLoading(false);
    }
  };

  // ============================================================
  // Step 3: تأكيد كلمة المرور الجديدة
  // ============================================================
  const handleResetConfirm = async () => {
    if (!newPass || newPass.length < 8) { setResetError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    setResetLoading(true);
    setResetError("");
    try {
      const normalized = normalizePhone(resetPhone)!;
      await authApi.adminResetConfirm(normalized, resetToken, newPass);
      setView("reset_done");
    } catch (err: any) {
      setResetError(err.message || "فشل تغيير كلمة المرور — ابدأ من جديد");
    } finally {
      setResetLoading(false);
    }
  };

  const goBack = () => {
    setResetError("");
    setResetInfo("");
    setView("login");
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <PlatformBrandStatic logoSize={56} showText={false} />
          </div>
          <h1 className="text-xl font-bold text-white">لوحة إدارة {BRAND.nameAr}</h1>
          <p className="text-sm text-gray-400 mt-1">للمسؤولين فقط</p>
        </div>

        {/* ==================== LOGIN ==================== */}
        {view === "login" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">البريد الإلكتروني</label>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-brand-500 transition-colors">
                <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="admin@tarmizos.com"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1.5">كلمة المرور</label>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-brand-500 transition-colors">
                <Lock className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••••••"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
                  dir="ltr"
                />
                <button onClick={() => setShowPass(!showPass)} className="text-gray-500 hover:text-gray-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-sm text-red-400">
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              دخول
            </button>

            <div className="text-center pt-1">
              <button
                onClick={() => { setView("reset_phone"); setResetError(""); setResetInfo(""); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 1: PHONE ==================== */}
        {view === "reset_phone" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={goBack} className="text-gray-500 hover:text-gray-300 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-semibold text-white">استعادة كلمة المرور</h2>
            </div>
            <p className="text-xs text-gray-400">
              أدخل رقم الجوال المرتبط بحساب الإدارة. سيُرسل رمز تحقق عبر واتساب.
            </p>

            <div>
              <label className="text-xs text-gray-400 block mb-1.5">رقم الجوال</label>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-brand-500 transition-colors">
                <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={resetPhone}
                  onChange={(e) => { setResetPhone(e.target.value); setResetError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleResetRequest()}
                  placeholder="05xxxxxxxx"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
                  dir="ltr"
                />
              </div>
            </div>

            {resetError && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-sm text-red-400">
                {resetError}
              </div>
            )}

            <button
              onClick={handleResetRequest}
              disabled={resetLoading}
              className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              إرسال رمز التحقق
            </button>
          </div>
        )}

        {/* ==================== STEP 2: OTP ==================== */}
        {view === "reset_otp" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => { setView("reset_phone"); setResetError(""); }} className="text-gray-500 hover:text-gray-300 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-semibold text-white">رمز التحقق</h2>
            </div>
            <p className="text-xs text-gray-400">
              إذا كان الرقم مرتبطاً بحساب إداري، ستصل رسالة واتساب برمز التحقق خلال لحظات.
            </p>

            <div>
              <label className="text-xs text-gray-400 block mb-1.5">رمز التحقق (6 أرقام)</label>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-brand-500 transition-colors">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setResetError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleResetVerify()}
                  placeholder="123456"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600 tracking-widest text-center"
                  dir="ltr"
                />
              </div>
            </div>

            {resetError && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-sm text-red-400">
                {resetError}
              </div>
            )}

            <button
              onClick={handleResetVerify}
              disabled={resetLoading}
              className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              تحقق من الرمز
            </button>

            <div className="text-center">
              <button
                onClick={() => { setView("reset_phone"); setResetError(""); setOtp(""); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                لم يصلني الرمز — أعد الإرسال
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: NEW PASSWORD ==================== */}
        {view === "reset_password" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">كلمة المرور الجديدة</h2>
            <p className="text-xs text-gray-400">
              اختر كلمة مرور قوية — 8 أحرف على الأقل.
            </p>

            <div>
              <label className="text-xs text-gray-400 block mb-1.5">كلمة المرور الجديدة</label>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-brand-500 transition-colors">
                <Lock className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); setResetError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleResetConfirm()}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
                  dir="ltr"
                />
                <button onClick={() => setShowNewPass(!showNewPass)} className="text-gray-500 hover:text-gray-300">
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {resetError && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-sm text-red-400">
                {resetError}
              </div>
            )}

            <button
              onClick={handleResetConfirm}
              disabled={resetLoading}
              className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              تغيير كلمة المرور
            </button>
          </div>
        )}

        {/* ==================== DONE ==================== */}
        {view === "reset_done" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-base font-bold text-white">تم تغيير كلمة المرور</h2>
            <p className="text-sm text-gray-400">سجّل دخولك الآن بكلمة المرور الجديدة.</p>
            <button
              onClick={() => { setView("login"); setPassword(""); setNewPass(""); setResetPhone(""); setOtp(""); setResetToken(""); }}
              className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
            >
              تسجيل الدخول
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          هذه الصفحة محمية — للمسؤولين المعتمدين فقط
        </p>
      </div>
    </div>
  );
}
