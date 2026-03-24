import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Building2, User, Settings, ArrowLeft, Check, Loader2, Zap } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";

const steps = ["معلومات الشركة", "بيانات المالك", "الإعداد"];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const INDUSTRY_LABELS: Record<string, string> = {
    events: "تجهيزات فعاليات", catering: "ضيافة", photography: "تصوير",
    decoration: "ديكور", entertainment: "ترفيه", hotel: "فندق وإقامة",
    car_rental: "تأجير سيارات", other: "أخرى",
  };

  const [form, setForm] = useState({
    orgName: "", city: "الرياض", industry: "events",
    ownerName: "", ownerPhone: "", ownerEmail: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value })); setError("");
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, steps.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const validate = () => {
    if (step === 0 && !form.orgName.trim()) { setError("اسم الشركة مطلوب"); return false; }
    if (step === 1 && (!form.ownerName.trim() || !form.ownerPhone.trim())) { setError("الاسم والجوال مطلوبان"); return false; }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true); setError("");
    try {
      const res = await api.post<any>("/settings/onboard", form);
      localStorage.setItem("nasaq_org_id", res.data.org.id);
      localStorage.setItem("nasaq_user_id", res.data.owner.id);
      setDone(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6"><Check className="w-8 h-8 text-green-600" /></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">مبروك! حسابك جاهز</h1>
        <p className="text-sm text-gray-500 mb-6">لديك 14 يوم تجربة مجانية — ابدأ بإضافة خدماتك</p>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 text-right space-y-2">
          <p className="text-sm text-gray-500">الخطوات القادمة:</p>
          {["أضف خدماتك الأولى", "أضف مواقعك المعتمدة", "ابدأ باستقبال الحجوزات"].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm"><Zap className="w-4 h-4 text-brand-500" /><span>{s}</span></div>
          ))}
        </div>
        <button onClick={() => navigate("/login")} className="w-full bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600">
          دخول لوحة التحكم
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">إنشاء حساب في نسق</h1>
          <p className="text-sm text-gray-500 mt-1">14 يوم تجربة مجانية — لا يحتاج بطاقة</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-3 mb-6 px-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                i < step ? "bg-green-500 text-white" : i === step ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-400"
              )}>{i < step ? <Check className="w-4 h-4" /> : i + 1}</div>
              <span className={clsx("text-xs hidden sm:inline", i <= step ? "text-gray-900 font-medium" : "text-gray-400")}>{s}</span>
              {i < steps.length - 1 && <div className={clsx("flex-1 h-px", i < step ? "bg-green-500" : "bg-gray-200")} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

          {step === 0 && (
            <div className="space-y-4">
              <div className="text-center mb-2"><Building2 className="w-8 h-8 text-brand-500 mx-auto mb-2" /><h2 className="font-bold text-gray-900">معلومات الشركة</h2></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">اسم الشركة <span className="text-red-400">*</span></label>
                <input value={form.orgName} onChange={set("orgName")} placeholder="مثال: محفل" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">المدينة</label>
                <select value={form.city} onChange={set("city")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none">
                  <option value="الرياض">الرياض</option><option value="جدة">جدة</option><option value="مكة">مكة</option>
                  <option value="المدينة">المدينة</option><option value="الدمام">الدمام</option><option value="أخرى">أخرى</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">المجال</label>
                <select value={form.industry} onChange={set("industry")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none">
                  <option value="events">تجهيزات فعاليات</option><option value="catering">ضيافة</option><option value="photography">تصوير</option>
                  <option value="decoration">ديكور</option><option value="entertainment">ترفيه</option>
                  <option value="hotel">فندق وإقامة</option><option value="car_rental">تأجير سيارات</option>
                  <option value="other">أخرى</option>
                </select></div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-2"><User className="w-8 h-8 text-brand-500 mx-auto mb-2" /><h2 className="font-bold text-gray-900">بيانات المالك</h2></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم <span className="text-red-400">*</span></label>
                <input value={form.ownerName} onChange={set("ownerName")} placeholder="الاسم الكامل" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال <span className="text-red-400">*</span></label>
                <input value={form.ownerPhone} onChange={set("ownerPhone")} placeholder="05XXXXXXXX" dir="ltr"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500 text-center tracking-widest" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">البريد (اختياري)</label>
                <input value={form.ownerEmail} onChange={set("ownerEmail")} placeholder="email@example.com" dir="ltr"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500" /></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4"><Settings className="w-8 h-8 text-brand-500 mx-auto mb-2" /><h2 className="font-bold text-gray-900">ملخص الحساب</h2></div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">الشركة</span><span className="font-medium">{form.orgName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">المدينة</span><span className="font-medium">{form.city}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">المجال</span><span className="font-medium">{INDUSTRY_LABELS[form.industry] ?? form.industry}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">المالك</span><span className="font-medium">{form.ownerName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الجوال</span><span className="font-medium" dir="ltr">{form.ownerPhone}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الباقة</span><span className="font-medium text-green-600">تجربة مجانية 14 يوم</span></div>
              </div>
              <p className="text-xs text-gray-400 text-center">بالضغط على "إنشاء الحساب" أنت توافق على شروط الاستخدام وسياسة الخصوصية</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {step > 0 && <button onClick={prev} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4 rotate-180" />السابق</button>}
            {step < steps.length - 1 ? (
              <button onClick={next} className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600">التالي</button>
            ) : (
              <button onClick={submit} disabled={loading} className="flex-1 bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}إنشاء الحساب
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">عندك حساب؟ <a href="/login" className="text-brand-500 font-medium">سجل دخول</a></p>
      </div>
    </div>
  );
}
