import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/useToast";
import { Building2, Save, RefreshCw, Phone, Globe, Hash, Palette, Crown, AlertCircle, Briefcase, ImageIcon, Upload, X } from "lucide-react";
import { clsx } from "clsx";
import { settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Input, Select } from "@/components/ui";
import { invalidateOrgContextCache } from "@/hooks/useOrgContext";
import { MediaPickerModal } from "@/components/media/MediaPickerModal";
import { fmtDate } from "@/lib/utils";
import { BUSINESS_TYPE_LIST, PLAN_MAP } from "@/lib/constants";

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  basic:      { label: PLAN_MAP["basic"]?.name      || "أساسي",     color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  advanced:   { label: PLAN_MAP["advanced"]?.name   || "متقدم",     color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
  pro:        { label: PLAN_MAP["pro"]?.name        || "احترافي",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  enterprise: { label: PLAN_MAP["enterprise"]?.name || "مؤسسي",     color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};
const BUSINESS_TYPES = BUSINESS_TYPE_LIST.map(b => ({ value: b.key, label: b.name }));

const STATUS_LABELS: Record<string, string> = {
  trialing:   "فترة تجريبية",
  active:     "نشط",
  past_due:   "متأخر السداد",
  cancelled:  "ملغي",
  suspended:  "موقوف",
};

function Section({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
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
  const navigate = useNavigate();
  const { data: profileRes, loading, refetch } = useApi(() => settingsApi.profile(), []);
  const { data: subRes }                       = useApi(() => settingsApi.subscription(), []);
  const { mutate: updateProfile }              = useMutation((d: any) => settingsApi.updateProfile(d));

  const [form, setForm] = useState({
    name: "", nameEn: "", phone: "", email: "", website: "",
    city: "", address: "", commercialRegister: "", vatNumber: "",
    primaryColor: "#5b9bd5", secondaryColor: "#C8A951",
    businessType: "", logo: "",
  });
  const [dirty, setDirty]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [logoPicker, setLogoPicker] = useState(false);

  const org    = profileRes?.data;
  const sub    = subRes?.data;
  const plan = PLAN_LABELS[sub?.plan || "basic"] || PLAN_LABELS.basic;

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  }, [dirty]);

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [handleBeforeUnload]);

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
        primaryColor: org.primaryColor || "#5b9bd5",
        secondaryColor: org.secondaryColor || "#C8A951",
        businessType: org.businessType || "",
        logo: org.logo || "",
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
      invalidateOrgContextCache();
      toast.success("تم حفظ الإعدادات بنجاح");
      setDirty(false);
      refetch();
    } catch { toast.error("فشل حفظ الإعدادات"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#eef2f6] p-6 animate-pulse space-y-4">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-[#f1f5f9] rounded-xl" />
              <div className="h-10 bg-[#f1f5f9] rounded-xl" />
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
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500 transition-colors">
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
              onChange={e => f("name", e.target.value)} placeholder="مثال: شركة ترميز OS للفعاليات" required />
            <Input label="الاسم بالإنجليزية" name="nameEn" value={form.nameEn}
              onChange={e => f("nameEn", e.target.value)} placeholder="Nasaq Events Co." dir="ltr" />
          </div>
          {org?.slug && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] rounded-xl text-xs text-gray-500">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>رابط الحجز: <span className="font-mono text-brand-600 select-all">nasaq.sa/{org.slug}</span></span>
            </div>
          )}
        </div>
      </Section>

      {/* Logo */}
      <Section title="شعار المنشأة" subtitle="يظهر في الموقع والفواتير وصفحة الحجز" icon={ImageIcon}>
        <div className="flex items-start gap-5">
          {/* Preview */}
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#eef2f6] flex items-center justify-center overflow-hidden bg-[#f8fafc] shrink-0">
            {form.logo
              ? <img src={form.logo} alt="logo" className="w-full h-full object-contain p-1" />
              : <ImageIcon className="w-8 h-8 text-gray-300" />
            }
          </div>
          {/* Actions */}
          <div className="space-y-2.5 flex-1">
            <p className="text-sm text-gray-500">PNG أو SVG أو JPEG — خلفية شفافة مفضّلة</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setLogoPicker(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#eef2f6] text-sm text-gray-700 hover:bg-[#f8fafc] transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> اختر من المكتبة
              </button>
              {form.logo && (
                <button
                  onClick={() => f("logo", "")}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-100 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> إزالة
                </button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Business Type */}
      <Section title="نوع النشاط التجاري" subtitle="يحدد الأدوات والشاشات التي تظهر في لوحة التحكم" icon={Briefcase}>
        <div className="space-y-3">
          <Select
            label="نوع المنشأة"
            name="businessType"
            value={form.businessType}
            onChange={e => f("businessType", e.target.value)}
            options={[{ value: "", label: "— اختر نوع النشاط —" }, ...BUSINESS_TYPES]}
          />
          {form.businessType && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50 border border-brand-100 rounded-xl text-xs text-brand-700">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>
                بعد الحفظ تظهر الأدوات المخصصة لـ <strong>{BUSINESS_TYPES.find(b => b.value === form.businessType)?.label}</strong> في القائمة الجانبية تلقائياً
              </span>
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
                  className="w-9 h-9 rounded-[10px] border border-[#eef2f6] cursor-pointer p-0.5" />
                <Input name="primaryColorHex" value={form.primaryColor}
                  onChange={e => f("primaryColor", e.target.value)} dir="ltr" placeholder="#5b9bd5" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">اللون الثانوي</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.secondaryColor}
                  onChange={e => f("secondaryColor", e.target.value)}
                  className="w-9 h-9 rounded-[10px] border border-[#eef2f6] cursor-pointer p-0.5" />
                <Input name="secondaryColorHex" value={form.secondaryColor}
                  onChange={e => f("secondaryColor", e.target.value)} dir="ltr" placeholder="#C8A951" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#eef2f6]">
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
                  تنتهي التجربة: {fmtDate(sub.trialEndsAt)}
                </p>
              )}
              {sub?.subscriptionEndsAt && sub.status === "active" && (
                <p className="text-xs text-gray-400">
                  تجديد: {fmtDate(sub.subscriptionEndsAt)}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => navigate("/dashboard/subscription")} className="px-4 py-2 rounded-xl border border-brand-300 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors">
            ترقية الخطة
          </button>
        </div>
      </Section>

      {logoPicker && (
        <MediaPickerModal
          accept="logo"
          title="اختر شعار المنشأة"
          onSelect={(asset) => { f("logo", asset.fileUrl); setLogoPicker(false); }}
          onClose={() => setLogoPicker(false)}
        />
      )}    </div>
  );
}
