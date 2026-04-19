import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GraduationCap, Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { schoolInviteApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export function SchoolInvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate       = useNavigate();

  const { data, loading, error } = useApi(() => schoolInviteApi.getInfo(token), [token]);
  const info = data?.data;

  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [done,       setDone]       = useState(false);
  const [formError,  setFormError]  = useState("");

  const handleAccept = async () => {
    if (password.length < 6)         { setFormError("كلمة المرور 6 أحرف على الأقل"); return; }
    if (password !== confirm)         { setFormError("كلمتا المرور غير متطابقتين");   return; }
    setSaving(true);
    setFormError("");
    try {
      const res = await schoolInviteApi.accept(token, password);
      // Save session
      localStorage.setItem("nasaq_token",   res.data.token);
      localStorage.setItem("nasaq_org_id",  res.data.user.orgId);
      localStorage.setItem("nasaq_user_id", res.data.user.id);
      localStorage.setItem("nasaq_user",    JSON.stringify({ ...res.data.user, isSchool: true }));
      setDone(true);
      setTimeout(() => navigate("/school/dashboard", { replace: true }), 2000);
    } catch (e: any) {
      setFormError(e.message ?? "حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !info) {
    const msg = (error as any)?.message ?? "رابط الدعوة غير صحيح أو منتهي";
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">رابط غير صالح</h2>
          <p className="text-sm text-gray-500">{msg}</p>
          <p className="text-xs text-gray-400">تواصل مع إدارة المدرسة لإعادة إرسال رابط الدعوة.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">تم تفعيل حسابك</h2>
          <p className="text-sm text-gray-500">جاري تحويلك إلى لوحة التحكم...</p>
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 px-6 py-8 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-black">مرحباً، {info.teacherName}</h1>
          <p className="text-sm text-emerald-200 mt-1">{info.orgName}</p>
          <p className="text-xs text-emerald-300 mt-3">عيّن كلمة مرورك للدخول إلى منصة ترميز OS</p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className="w-full border border-[#eef2f6] rounded-xl px-3 h-10 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAccept(); }}
              placeholder="أعد كتابة كلمة المرور"
              className="w-full border border-[#eef2f6] rounded-xl px-3 h-10 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{formError}
            </p>
          )}

          <button
            onClick={handleAccept}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11 rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-emerald-600/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            تفعيل الحساب والدخول
          </button>

          <p className="text-[11px] text-gray-400 text-center">
            بعد التفعيل يمكنك الدخول بنفس رقم الجوال وكلمة المرور
          </p>
        </div>
      </div>
    </div>
  );
}
