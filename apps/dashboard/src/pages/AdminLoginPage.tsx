import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { authApi } from "@/lib/api";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("أدخل البريد الإلكتروني وكلمة المرور"); return; }
    setLoading(true);
    setError("");
    try {
      const res: any = await authApi.loginWithEmail(email, password);
      const ALLOWED = ["account_manager", "support_agent", "content_manager", "viewer"];
      if (!res?.user?.isSuperAdmin && !ALLOWED.includes(res?.user?.nasaqRole)) {
        setError("هذا الحساب ليس لديه صلاحية الدخول للوحة الإدارة");
        return;
      }
      localStorage.setItem("nasaq_token",   res.token);
      localStorage.setItem("nasaq_org_id",  res.user.orgId);
      localStorage.setItem("nasaq_user_id", res.user.id);
      localStorage.setItem("nasaq_user",    JSON.stringify(res.user));
      navigate("/admin", { replace: true });
    } catch (err: any) {
      setError(err.message || "بيانات الدخول غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">لوحة إدارة نسق</h1>
          <p className="text-sm text-gray-400 mt-1">للمسؤولين فقط</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">البريد الإلكتروني</label>
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 focus-within:border-brand-500 transition-colors">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="admin@nasaqpro.tech"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
                dir="ltr"
              />
            </div>
          </div>

          {/* Password */}
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

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            دخول
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          هذه الصفحة محمية — للمسؤولين المعتمدين فقط
        </p>
      </div>
    </div>
  );
}
