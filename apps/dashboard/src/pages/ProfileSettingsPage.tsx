import { useState, useEffect } from "react";
import { Building2, Save, RefreshCw, MapPin, Phone, Mail, Globe, Hash, Palette, Crown, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Input, Toast } from "@/components/ui";

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  basic:      { label: "أساسي",     color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  advanced:   { label: "متقدم",     color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
  pro:        { label: "احترافي",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  enterprise: { label: "مؤسسي",     color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};
const STATUS_LABELS: Record<string, string> = {
  trialing:   "فترة تجريبية",
  active:     "نشط",
  past_due:   "متأخر السداد",
  cancelled:  "ملغي",
  suspended:  "موقوف",
};

function Section({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-brand-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function ProfileSettingsPage() {
  const { data: profileRes, loading, refetch } = useApi(() => settingsApi.profile(), []);
  const { data: subRes }                       = useApi(() => settingsApi.subscription(), []);
  const { mutate: updateProfile }              = useMutation((d: any) => settingsApi.updateProfile(d));

  const [form, setForm] = useState({
    name: "", nameEn: "", phone: "", email: "", website: "",
    city: "", address: "", commercialRegister: "", vatNumber: "",
    primaryColor: "#1A56DB", secondaryColor: "#C8A951",
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const org  = profileRes?.data;
  const sub  = subRes?.data;
  const plan = PLAN_LABELS[sub?.plan || "basic"] || PLAN_LABELS.basic;

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || "",
        nameEn: org.nameEn || "",
        phone: org.phone || "",
        email: org.email || "",
        website: org.website || "",
        city: org.city || "",
        address: org.address || "",
        commercialRegister: org.commercialRegister || "",
        vatNumber: org.vatNumber || "",
        primaryColor: org.primaryColor || "#1A56DB",
        secondaryColor: org.secondaryColor || "#C8A951",
      });
      setDirty(false);
    }
  }, [org]);

  const f = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await updateProfile(form);
      setToast({ msg: "تم حفظ الإعدادات بنجاح", type: "success" });
      setDirty(false);
      refetch();
    } catch { setToast({ msg: "فشل حفظ الإعدادات", type: "error" }); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse space-y-4">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-gray-100 rounded-xl" />
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-500" /> الملف التعريفي
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">معلومات منشأتك وبياناتها الرسمية</p>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={() => { refetch(); setDirty(false); }}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <Button icon={Save} onClick={handleSave} loading={saving} disabled={!dirty}>
            حفظ التغييرات
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>لديك تغييرات غير محفوظة</span>
        </div>
      )}

      {/* Basic Info */}
      <Section title="المعلومات الأساسية" subtitle="اسم المنشأة وبياناتها العامة" icon={Building2}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="اسم المنشأة *" name="name" value={form.name}
              onChange={e => f("name", e.target.value)} placeholder="مثال: شركة نسق للفعاليات" required />
            <Input label="الاسم بالإنجليزية" name="nameEn" value={form.nameEn}
              onChange={e => f("nameEn", e.target.value)} placeholder="Nasaq Events Co." dir="ltr" />
          </div>
          {org?.slug && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-500">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>رابط الحجز: <span className="font-mono text-brand-600 select-all">nasaq.sa/{org.slug}</span></span>
            </div>
          )}
        </div>
      </Section>

      {/* Contact */}
      <Section title="معلومات التواصل" subtitle="رقم الجوال والبريد والموقع" icon={Phone}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="رقم الجوال" name="phone" value={form.phone}
              onChange={e => f("phone", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" />
            <Input label="البريد الإلكتروني" name="email" value={form.email}
              onChange={e => f("email", e.target.value)} placeholder="info@company.com" dir="ltr" />
          </div>
          <Input label="الموقع الإلكتروني" name="website" value={form.website}
            onChange={e => f("website", e.target.value)} placeholder="https://www.company.com" dir="ltr" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="المدينة" name="city" value={form.city}
              onChange={e => f("city", e.target.value)} placeholder="الرياض" />
            <Input label="العنوان التفصيلي" name="address" value={form.address}
              onChange={e => f("address", e.target.value)} placeholder="حي، شارع، مبنى..." />
          </div>
        </div>
      </Section>

      {/* Business Info */}
      <Section title="البيانات التجارية والضريبية" subtitle="السجل التجاري والرقم الضريبي — مطلوبة للفواتير" icon={Hash}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="السجل التجاري" name="commercialRegister" value={form.commercialRegister}
            onChange={e => f("commercialRegister", e.target.value)} placeholder="XXXXXXXXXX" dir="ltr" />
          <Input label="الرقم الضريبي (VAT)" name="vatNumber" value={form.vatNumber}
            onChange={e => f("vatNumber", e.target.value)} placeholder="3XXXXXXXXXX" dir="ltr" />
        </div>
      </Section>

      {/* Branding */}
      <Section title="الهوية البصرية" subtitle="ألوان المنشأة المستخدمة في الموقع والفواتير" icon={Palette}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">اللون الرئيسي</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor}
                  onChange={e => f("primaryColor", e.target.value)}
                  className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
                <Input name="primaryColorHex" value={form.primaryColor}
                  onChange={e => f("primaryColor", e.target.value)} dir="ltr" placeholder="#1A56DB" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">اللون الثانوي</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.secondaryColor}
                  onChange={e => f("secondaryColor", e.target.value)}
                  className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
                <Input name="secondaryColorHex" value={form.secondaryColor}
                  onChange={e => f("secondaryColor", e.target.value)} dir="ltr" placeholder="#C8A951" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
            <div className="w-8 h-8 rounded-xl" style={{ background: form.primaryColor }} />
            <div className="w-8 h-8 rounded-xl" style={{ background: form.secondaryColor }} />
            <span className="text-xs text-gray-500">معاينة الألوان</span>
          </div>
        </div>
      </Section>

      {/* Subscription */}
      <Section title="الاشتراك" subtitle="تفاصيل خطة الاشتراك الحالية" icon={Crown}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={clsx("px-3 py-1.5 rounded-xl border text-sm font-semibold", plan.bg, plan.color)}>
              {plan.label}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">{STATUS_LABELS[sub?.status || "trialing"]}</p>
              {sub?.trialEndsAt && sub.status === "trialing" && (
                <p className="text-xs text-amber-600">
                  تنتهي التجربة: {new Date(sub.trialEndsAt).toLocaleDateString("ar-SA")}
                </p>
              )}
              {sub?.subscriptionEndsAt && sub.status === "active" && (
                <p className="text-xs text-gray-400">
                  تجديد: {new Date(sub.subscriptionEndsAt).toLocaleDateString("ar-SA")}
                </p>
              )}
            </div>
          </div>
          <button className="px-4 py-2 rounded-xl border border-brand-300 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors">
            ترقية الخطة
          </button>
        </div>
      </Section>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
