import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, ChevronDown, Eye, EyeOff } from "lucide-react";
import { authApi, schoolApi } from "@/lib/api";

const SCHOOL_TYPES = ["حكومية", "أهلية", "دولية"] as const;
const EDUCATION_LEVELS = ["ابتدائية", "متوسطة", "ثانوية", "شاملة"] as const;
const REGIONS = [
  "الرياض", "مكة المكرمة", "المدينة المنورة", "القصيم", "المنطقة الشرقية",
  "عسير", "تبوك", "حائل", "الحدود الشمالية", "جازان", "نجران", "الباحة", "الجوف",
] as const;

type Step = "form" | "otp";

interface FormData {
  schoolName: string;
  adminName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  schoolType: string;
  educationLevel: string;
  region: string;
  address: string;
  schoolEmail: string;
}

function saveSession(res: { token: string; user: any }) {
  localStorage.setItem("nasaq_token",   res.token);
  localStorage.setItem("nasaq_org_id",  res.user.orgId ?? "");
  localStorage.setItem("nasaq_user_id", res.user.id ?? "");
  localStorage.setItem("nasaq_user",    JSON.stringify(res.user));
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors bg-white pr-10"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

export function SchoolRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormData>({
    schoolName: "",
    adminName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    schoolType: "حكومية",
    educationLevel: "شاملة",
    region: "",
    address: "",
    schoolEmail: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [devCode, setDevCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof FormData) => (val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  };

  const submitForm = async () => {
    if (!form.schoolName.trim()) { setError("اسم المدرسة مطلوب"); return; }
    if (!form.adminName.trim())  { setError("اسم المسؤول مطلوب"); return; }
    if (!form.phone || form.phone.length < 10) { setError("رقم الجوال غير صحيح"); return; }
    if (!form.password || form.password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    if (form.password !== form.confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }

    setLoading(true); setError("");
    try {
      const res: any = await authApi.registerWithPhone(form.schoolName.trim(), form.phone, "school", form.password);
      if (res._devCode) setDevCode(res._devCode);
      setStep("otp");
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("أدخل الرمز كاملاً"); return; }
    setLoading(true); setError("");
    try {
      const res: any = await authApi.verifyOtp(form.phone, code);
      saveSession(res);

      // Save school-specific settings
      await schoolApi.saveSettings({
        schoolName:     form.schoolName.trim(),
        schoolPhone:    form.phone,
        schoolEmail:    form.schoolEmail.trim() || undefined,
        schoolRegion:   form.region || undefined,
        schoolAddress:  form.address.trim() || undefined,
        schoolType:     (form.schoolType as any) || undefined,
        educationLevel: (form.educationLevel as any) || undefined,
      });

      // Update owner's display name to admin name
      if (form.adminName.trim()) {
        await authApi.updateMe({ name: form.adminName.trim() });
        const stored = JSON.parse(localStorage.getItem("nasaq_user") || "{}");
        stored.name = form.adminName.trim();
        localStorage.setItem("nasaq_user", JSON.stringify(stored));
      }

      navigate("/school/dashboard");
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpKey = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`school-reg-otp-${idx + 1}`)?.focus();
    }
  };

  const resendOtp = async () => {
    setOtp(["","","","","",""]);
    setLoading(true); setError("");
    try {
      // Account already created — just request a new OTP for the registered phone
      const res: any = await authApi.requestOtp(form.phone);
      if (res._devCode) setDevCode(res._devCode);
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/school" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gray-900 leading-none">نسق</p>
              <p className="text-sm font-semibold text-emerald-600">للمدارس</p>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {/* ── Step 1: Registration Form ── */}
          {step === "form" && (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-1">تسجيل مدرستك</h1>
              <p className="text-gray-500 text-sm mb-7">أنشئ حساب نسق لمدرستك مجاناً</p>

              <div className="space-y-4">

                {/* School name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    اسم المدرسة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.schoolName}
                    onChange={(e) => set("schoolName")(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="مدرسة الفيصل الابتدائية"
                  />
                </div>

                {/* Admin name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    اسم مدير المدرسة / المسؤول <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.adminName}
                    onChange={(e) => set("adminName")(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="محمد عبدالله"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    رقم الجوال <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => set("phone")(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="05XXXXXXXX"
                  />
                </div>

                {/* Password */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        dir="ltr"
                        value={form.password}
                        onChange={(e) => set("password")(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors pr-10"
                        placeholder="8 أحرف على الأقل"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      تأكيد كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        dir="ltr"
                        value={form.confirmPassword}
                        onChange={(e) => set("confirmPassword")(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors pr-10"
                        placeholder="أعد كتابة كلمة المرور"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* School type + Education level */}
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="نوع المدرسة"
                    value={form.schoolType}
                    onChange={set("schoolType")}
                    options={SCHOOL_TYPES}
                  />
                  <SelectField
                    label="المرحلة الدراسية"
                    value={form.educationLevel}
                    onChange={set("educationLevel")}
                    options={EDUCATION_LEVELS}
                  />
                </div>

                {/* Region */}
                <SelectField
                  label="المنطقة / المدينة"
                  value={form.region}
                  onChange={set("region")}
                  options={REGIONS}
                  placeholder="اختر المنطقة"
                />

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">العنوان التفصيلي</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => set("address")(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="حي النزهة، شارع الأمير..."
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني للمدرسة</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={form.schoolEmail}
                    onChange={(e) => set("schoolEmail")(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="info@school.edu.sa"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

              <button
                onClick={submitForm}
                disabled={loading}
                className="w-full mt-6 bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب"}
              </button>

              <p className="text-center text-sm text-gray-500 mt-5">
                لديك حساب بالفعل؟{" "}
                <Link to="/school/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
                  سجّل دخول
                </Link>
              </p>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => { setStep("form"); setOtp(["","","","","",""]); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl font-black text-gray-900">تأكيد رقم الجوال</h1>
                  <p className="text-sm text-gray-500">أُرسل رمز التحقق إلى {form.phone}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-center mb-4" dir="ltr">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    id={`school-reg-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpKey(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0)
                        document.getElementById(`school-reg-otp-${i - 1}`)?.focus();
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد وإنشاء الحساب"}
              </button>

              <button
                onClick={resendOtp}
                disabled={loading}
                className="w-full mt-3 text-sm text-gray-500 hover:text-emerald-600 transition-colors disabled:opacity-40"
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
