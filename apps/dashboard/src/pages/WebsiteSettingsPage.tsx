import { useState, useEffect } from "react";
import { DurationInput } from "@/components/ui/DurationInput";
import {
  Loader2, Save, Check, Globe, Building2, Phone, Paintbrush, Upload, X,
} from "lucide-react";
import { clsx } from "clsx";
import { settingsApi, websiteApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button } from "@/components/ui";
import { MediaPickerModal } from "@/components/media/MediaPickerModal";

const TABS = [
  { key: "identity", label: "الهوية البصرية", icon: Building2 },
  { key: "contact",  label: "التواصل",        icon: Phone },
  { key: "website",  label: "الموقع العام",   icon: Globe },
  { key: "business", label: "إعدادات النشاط", icon: Paintbrush },
];

const FONTS = [
  "IBM Plex Sans Arabic",
  "Tajawal",
  "Cairo",
  "Almarai",
  "Noto Sans Arabic",
];

const DAYS = [
  { key: "sunday",    label: "الأحد" },
  { key: "monday",    label: "الاثنين" },
  { key: "tuesday",   label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday",  label: "الخميس" },
  { key: "friday",    label: "الجمعة" },
  { key: "saturday",  label: "السبت" },
];

const BUSINESS_LABELS: Record<string, string> = {
  // الجمال والصحة
  salon: "الصالون", barber: "الحلاقة", spa: "السبا", fitness: "اللياقة",
  // الطعام والمشروبات
  restaurant: "المطعم", cafe: "المقهى", bakery: "المخبز", catering: "الضيافة",
  // التأجير والأصول
  rental: "التأجير", hotel: "الفندق", car_rental: "تأجير السيارات",
  // الفعاليات
  events: "الفعاليات", event_organizer: "تنظيم الفعاليات",
  // الزهور
  flower_shop: "متجر الورود",
  // الخدمات الميدانية
  maintenance: "الصيانة", workshop: "الورشة", laundry: "المغسلة", construction: "الإنشاء", logistics: "اللوجستيات",
  // الخدمات الرقمية
  digital_services: "الخدمات الرقمية", photography: "التصوير",
  // التجزئة
  retail: "التجزئة", printing: "المطبعة",
  // العقارات
  real_estate: "العقارات",
  // عام
  general: "عام",
};

const cls = "w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6 first:mt-0">{children}</h3>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">{label}</label>{children}</div>;
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={() => onChange(!value)} className={clsx("relative w-10 h-5 rounded-full transition-colors", value ? "bg-brand-500" : "bg-gray-200")}>
        <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", value ? "right-0.5" : "left-0.5")} />
      </button>
    </div>
  );
}

export function WebsiteSettingsPage() {
  const [activeTab,    setActiveTab]    = useState(0);
  const [logoPicker,   setLogoPicker]   = useState(false);
  const [coverPicker,  setCoverPicker]  = useState(false);
  const { data: profileRes, loading: pLoading } = useApi(() => settingsApi.profile(), []);
  const { data: configRes,  loading: cLoading  } = useApi(() => websiteApi.config(),  []);
  const [profile, setProfile] = useState<any>(null);
  const [config,  setConfig]  = useState<any>(null);
  const [saved,   setSaved]   = useState(false);
  const { mutate: saveProfile, loading: savingProfile } = useMutation((d: any) => settingsApi.updateProfile(d));
  const { mutate: saveConfig,  loading: savingConfig  } = useMutation((d: any) => websiteApi.updateConfig(d));

  useEffect(() => { if (profileRes?.data) setProfile(profileRes.data); }, [profileRes]);
  useEffect(() => { if (configRes?.data)  setConfig(configRes.data);   }, [configRes]);

  if (pLoading || cLoading || !profile) return (
    <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
  );

  const handleSave = async () => {
    await saveProfile(profile);
    await saveConfig(config || {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const sp  = (k: string, v: any) => setProfile((p: any) => ({ ...p, [k]: v }));
  const sc  = (k: string, v: any) => setConfig((c: any) => ({ ...(c || {}), [k]: v }));
  const ss  = (k: string, v: any) => setProfile((p: any) => ({ ...p, settings: { ...(p.settings || {}), [k]: v } }));
  const sbs = (k: string, v: any) => setProfile((p: any) => ({
    ...p, settings: { ...(p.settings || {}), businessSettings: { ...((p.settings || {}).businessSettings || {}), [k]: v } },
  }));

  const bs    = profile.settings?.businessSettings || {};
  const bType = profile.businessType || profile.business_type || "general";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">إعدادات الموقع</h1>
          <p className="text-sm text-gray-400 mt-0.5">{BUSINESS_LABELS[bType] || "عام"} — {profile.name}</p>
        </div>
        <Button onClick={handleSave} loading={savingProfile || savingConfig} icon={saved ? Check : Save} variant={saved ? "secondary" : "primary"}>
          {saved ? "تم الحفظ" : "حفظ التغييرات"}
        </Button>
      </div>

      <div className="flex gap-1 bg-white rounded-2xl border border-[#eef2f6] p-1 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button key={tab.key} onClick={() => setActiveTab(i)}
            className={clsx("flex-1 min-w-max flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === i ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-[#f8fafc]"
            )}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── الهوية البصرية ── */}
      {activeTab === 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="اسم النشاط"><input className={cls} value={profile.name || ""} onChange={(e) => sp("name", e.target.value)} /></Field>
            <Field label="الشعار النصي (Tagline)"><input className={cls} value={profile.tagline || ""} onChange={(e) => sp("tagline", e.target.value)} placeholder="شعار قصير..." /></Field>
          </div>
          <Field label="وصف النشاط"><textarea rows={3} className={cls + " resize-none"} value={profile.description || ""} onChange={(e) => sp("description", e.target.value)} placeholder="وصف مختصر..." dir="rtl" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="اللون الرئيسي">
              <div className="flex items-center gap-2">
                <input type="color"
                  value={config?.primaryColor || profile.primaryColor || "#5b9bd5"}
                  onChange={(e) => { sp("primaryColor", e.target.value); sc("primaryColor", e.target.value); }}
                  className="w-9 h-9 rounded-[10px] border border-[#eef2f6] cursor-pointer p-1" />
                <input className={cls + " font-mono"}
                  value={config?.primaryColor || profile.primaryColor || "#5b9bd5"}
                  onChange={(e) => { sp("primaryColor", e.target.value); sc("primaryColor", e.target.value); }}
                  dir="ltr" />
              </div>
            </Field>
            <Field label="اللون الثانوي">
              <div className="flex items-center gap-2">
                <input type="color"
                  value={config?.secondaryColor || profile.secondaryColor || "#C8A951"}
                  onChange={(e) => { sp("secondaryColor", e.target.value); sc("secondaryColor", e.target.value); }}
                  className="w-9 h-9 rounded-[10px] border border-[#eef2f6] cursor-pointer p-1" />
                <input className={cls + " font-mono"}
                  value={config?.secondaryColor || profile.secondaryColor || "#C8A951"}
                  onChange={(e) => { sp("secondaryColor", e.target.value); sc("secondaryColor", e.target.value); }}
                  dir="ltr" />
              </div>
            </Field>
            <Field label="الخط">
              <select className={cls} value={config?.fontFamily || "IBM Plex Sans Arabic"} onChange={(e) => sc("fontFamily", e.target.value)}>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="القالب">
              <select className={cls} value={config?.templateId || "default"} onChange={(e) => sc("templateId", e.target.value)}>
                {["default","modern","minimal","elegant"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="شعار المنشأة">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-[#eef2f6] bg-[#f8fafc] flex items-center justify-center overflow-hidden shrink-0">
                  {(profile.logo || config?.logoUrl)
                    ? <img src={profile.logo || config?.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                    : <Upload className="w-5 h-5 text-gray-300" />
                  }
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLogoPicker(true)} className="px-3 py-2 rounded-xl border border-[#eef2f6] text-xs text-gray-600 hover:bg-[#f8fafc] transition-colors">اختر من المكتبة</button>
                  {(profile.logo || config?.logoUrl) && (
                    <button onClick={() => sp("logo", "")} className="px-2.5 py-2 rounded-xl border border-red-100 text-xs text-red-400 hover:bg-red-50 transition-colors"><X className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            </Field>
            <Field label="صورة الغلاف">
              <div className="space-y-2">
                {(profile.coverImage || profile.cover_image) && (
                  <img src={profile.coverImage || profile.cover_image} alt="cover" className="w-full h-20 rounded-xl object-cover border border-[#eef2f6]" />
                )}
                <div className="flex gap-2">
                  <button onClick={() => setCoverPicker(true)} className="px-3 py-2 rounded-xl border border-[#eef2f6] text-xs text-gray-600 hover:bg-[#f8fafc] transition-colors">اختر من المكتبة</button>
                  {(profile.coverImage || profile.cover_image) && (
                    <button onClick={() => sp("coverImage", "")} className="px-2.5 py-2 rounded-xl border border-red-100 text-xs text-red-400 hover:bg-red-50 transition-colors"><X className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            </Field>
          </div>
        </div>
      )}

      {/* ── التواصل ── */}
      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-5">
          <SectionTitle>معلومات الاتصال</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="رقم الجوال"><input className={cls} value={profile.phone || ""} onChange={(e) => sp("phone", e.target.value)} placeholder="05xxxxxxxx" dir="ltr" /></Field>
            <Field label="البريد الإلكتروني"><input className={cls} value={profile.email || ""} onChange={(e) => sp("email", e.target.value)} placeholder="info@example.com" dir="ltr" /></Field>
            <Field label="المدينة"><input className={cls} value={profile.city || ""} onChange={(e) => sp("city", e.target.value)} placeholder="الرياض" /></Field>
            <Field label="العنوان"><input className={cls} value={profile.address || ""} onChange={(e) => sp("address", e.target.value)} placeholder="الحي، الشارع..." /></Field>
          </div>
          <Field label="رابط قوقل ماب">
            <input className={cls} value={profile.googleMapsEmbed || profile.google_maps_embed || ""} onChange={(e) => sp("googleMapsEmbed", e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" />
          </Field>
          <SectionTitle>وسائل التواصل الاجتماعي</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "whatsapp",  label: "WhatsApp",  color: "text-green-500", ph: "05xxxxxxxx" },
              { key: "instagram", label: "Instagram", color: "text-pink-500",  ph: "@username" },
              { key: "twitter",   label: "Twitter/X", color: "text-gray-800",  ph: "@username" },
              { key: "tiktok",    label: "TikTok",    color: "text-gray-800",  ph: "@username" },
              { key: "snapchat",  label: "Snapchat",  color: "text-yellow-500",ph: "username" },
            ].map((s) => (
              <Field key={s.key} label={s.label}>
                <div className="flex items-center gap-2">
                  <span className={clsx("text-xs font-semibold w-20 shrink-0", s.color)}>{s.label}</span>
                  <input className={cls} value={profile[s.key] || ""} onChange={(e) => sp(s.key, e.target.value)} placeholder={s.ph} dir="ltr" />
                </div>
              </Field>
            ))}
          </div>
        </div>
      )}

      {/* ── الموقع العام ── */}
      {activeTab === 2 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-4">
          <SectionTitle>إعدادات الموقع</SectionTitle>
          <Toggle value={!!(profile.isActive ?? profile.is_active ?? true)} onChange={(v) => sp("isActive", v)} label="تفعيل الموقع العام" />
          <Toggle value={!!(profile.settings?.showPrices ?? true)} onChange={(v) => ss("showPrices", v)} label="إظهار الأسعار" />
          <Toggle value={!!(profile.settings?.showBookingButton ?? true)} onChange={(v) => ss("showBookingButton", v)} label="إظهار زر الحجز" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <Field label="الرابط المختصر (slug)">
              <div className="flex items-center gap-0 border border-[#eef2f6] rounded-xl overflow-hidden">
                <span className="px-3 py-2 bg-[#f8fafc] text-xs text-gray-400 border-l border-[#eef2f6]">nasaq.app/</span>
                <input className="flex-1 px-3 py-2 text-sm outline-none" value={profile.slug || ""} onChange={(e) => sp("slug", e.target.value)} dir="ltr" />
              </div>
            </Field>
            <Field label="نص زر الحجز">
              <input className={cls} value={profile.settings?.bookingButtonText || "احجز الآن"} onChange={(e) => ss("bookingButtonText", e.target.value)} />
            </Field>
          </div>
          <Field label="رسالة الترحيب">
            <textarea rows={2} className={cls + " resize-none"} value={profile.settings?.welcomeMessage || ""} onChange={(e) => ss("welcomeMessage", e.target.value)} placeholder="مرحباً بكم..." dir="rtl" />
          </Field>
          <SectionTitle>SEO</SectionTitle>
          <div className="space-y-4">
            <Field label="Meta Title"><input className={cls} value={config?.defaultMetaTitle || ""} onChange={(e) => sc("defaultMetaTitle", e.target.value)} /></Field>
            <Field label="Meta Description"><textarea rows={2} className={cls + " resize-none"} value={config?.defaultMetaDescription || ""} onChange={(e) => sc("defaultMetaDescription", e.target.value)} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Google Analytics"><input className={cls} value={config?.googleAnalyticsId || ""} onChange={(e) => sc("googleAnalyticsId", e.target.value)} placeholder="G-XXXXXXXXXX" dir="ltr" /></Field>
              <Field label="GTM Container"><input className={cls} value={config?.gtmContainerId || ""} onChange={(e) => sc("gtmContainerId", e.target.value)} placeholder="GTM-XXXXXXX" dir="ltr" /></Field>
              <Field label="Facebook Pixel"><input className={cls} value={config?.facebookPixelId || ""} onChange={(e) => sc("facebookPixelId", e.target.value)} dir="ltr" /></Field>
              <Field label="Google Verification"><input className={cls} value={config?.googleVerification || ""} onChange={(e) => sc("googleVerification", e.target.value)} dir="ltr" /></Field>
            </div>
          </div>
        </div>
      )}

      {/* ── إعدادات النشاط ── */}
      {activeTab === 3 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-6">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            {BUSINESS_LABELS[bType] || bType}
          </div>

          {/* Salon / Beauty */}
          {(bType === "salon" || bType === "spa" || bType === "barber" || bType === "fitness") && (
            <>
              <SectionTitle>إعدادات الصالون</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="مدة الحجز الافتراضية"><DurationInput valueMinutes={bs.defaultBookingDuration || 60} onChange={m => sbs("defaultBookingDuration", m)} units={["minute","hour"]} /></Field>
                <Field label="الحجز المسبق (أيام كحد أقصى)"><input type="number" className={cls} value={bs.maxAdvanceBookingDays || 30} onChange={(e) => sbs("maxAdvanceBookingDays", +e.target.value)} dir="ltr" /></Field>
              </div>
              <Field label="سياسة الإلغاء"><textarea rows={3} className={cls + " resize-none"} value={bs.cancellationPolicy || ""} onChange={(e) => sbs("cancellationPolicy", e.target.value)} dir="rtl" /></Field>
              <Toggle value={!!bs.showProvidersOnWebsite} onChange={(v) => sbs("showProvidersOnWebsite", v)} label="إظهار المختصات في الموقع" />
              <Toggle value={!!bs.requireDepositForBooking} onChange={(v) => sbs("requireDepositForBooking", v)} label="مطلوب دفع عربون عند الحجز" />
              <SectionTitle>ساعات العمل</SectionTitle>
              <div className="space-y-2">
                {DAYS.map((d) => {
                  const wh = bs.workingHours || {};
                  const day = wh[d.key] || { open: false, from: "09:00", to: "22:00" };
                  return (
                    <div key={d.key} className="flex items-center gap-3 py-2 border-b border-gray-50 flex-wrap">
                      <button onClick={() => sbs("workingHours", { ...wh, [d.key]: { ...day, open: !day.open } })}
                        className={clsx("relative w-8 h-4 rounded-full transition-colors", day.open ? "bg-brand-500" : "bg-gray-200")}>
                        <span className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all", day.open ? "right-0.5" : "left-0.5")} />
                      </button>
                      <span className="text-sm text-gray-700 w-16">{d.label}</span>
                      {day.open ? (
                        <>
                          <input type="time" value={day.from} onChange={(e) => sbs("workingHours", { ...wh, [d.key]: { ...day, from: e.target.value } })} className="border border-[#eef2f6] rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-300" dir="ltr" />
                          <span className="text-gray-400 text-xs">—</span>
                          <input type="time" value={day.to} onChange={(e) => sbs("workingHours", { ...wh, [d.key]: { ...day, to: e.target.value } })} className="border border-[#eef2f6] rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-300" dir="ltr" />
                        </>
                      ) : <span className="text-xs text-gray-400">مغلق</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Restaurant / Cafe */}
          {(bType === "restaurant" || bType === "cafe") && (
            <>
              <SectionTitle>إعدادات {bType === "cafe" ? "المقهى" : "المطعم"}</SectionTitle>
              <Toggle value={!!bs.enableTableReservations} onChange={(v) => sbs("enableTableReservations", v)} label="تفعيل حجز الطاولات" />
              <Toggle value={!!bs.enableOnlineOrdering}   onChange={(v) => sbs("enableOnlineOrdering", v)}   label="تفعيل الطلب الأونلاين" />
              <Toggle value={!!bs.enableDelivery}         onChange={(v) => sbs("enableDelivery", v)}         label="تفعيل التوصيل" />
              {bs.enableDelivery && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <Field label="رسوم التوصيل (ر.س)"><input type="number" className={cls} value={bs.deliveryFee || 0} onChange={(e) => sbs("deliveryFee", +e.target.value)} dir="ltr" /></Field>
                  <Field label="توصيل مجاني فوق (ر.س)"><input type="number" className={cls} value={bs.freeDeliveryOver || 0} onChange={(e) => sbs("freeDeliveryOver", +e.target.value)} dir="ltr" /></Field>
                  <Field label="الحد الأدنى للطلب (ر.س)"><input type="number" className={cls} value={bs.minimumOrderAmount || 0} onChange={(e) => sbs("minimumOrderAmount", +e.target.value)} dir="ltr" /></Field>
                  <Field label="وقت التحضير"><DurationInput valueMinutes={bs.preparationTime || 20} onChange={m => sbs("preparationTime", m)} units={["minute","hour"]} /></Field>
                  <Field label="وقت التوصيل"><DurationInput valueMinutes={bs.deliveryTime || 45} onChange={m => sbs("deliveryTime", m)} units={["minute","hour"]} /></Field>
                </div>
              )}
              <Field label="أقسام المطعم (مفصولة بفاصلة)">
                <input className={cls} value={(bs.sections || []).join(", ")} onChange={(e) => sbs("sections", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} placeholder="داخلي، خارجي، VIP" />
              </Field>
            </>
          )}

          {/* Flower shop */}
          {bType === "flower_shop" && (
            <>
              <SectionTitle>إعدادات متجر الورود</SectionTitle>
              <Toggle value={!!bs.enableDelivery}      onChange={(v) => sbs("enableDelivery", v)}      label="تفعيل التوصيل" />
              <Toggle value={!!bs.enableGiftWrapping}  onChange={(v) => sbs("enableGiftWrapping", v)}  label="تغليف هدية" />
              <Toggle value={!!bs.freeWrapping}        onChange={(v) => sbs("freeWrapping", v)}        label="تغليف مجاني" />
              <Toggle value={!!bs.enableGiftMessages}  onChange={(v) => sbs("enableGiftMessages", v)}  label="رسائل الإهداء" />
              {bs.enableGiftMessages && <Field label="رسالة الإهداء الافتراضية"><textarea rows={2} className={cls + " resize-none"} value={bs.defaultGiftMessage || ""} onChange={(e) => sbs("defaultGiftMessage", e.target.value)} dir="rtl" /></Field>}
              <Field label="مناطق التوصيل (بفاصلة)"><input className={cls} value={(bs.deliveryAreas || []).join(", ")} onChange={(e) => sbs("deliveryAreas", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} placeholder="الرياض، جدة، الدمام" /></Field>
            </>
          )}

          {/* Rental / Real Estate */}
          {(bType === "rental" || bType === "real_estate") && (
            <>
              <SectionTitle>إعدادات التأجير</SectionTitle>
              <Toggle value={!!bs.enableOnlineBooking} onChange={(v) => sbs("enableOnlineBooking", v)} label="الحجز الأونلاين" />
              <Toggle value={!!bs.requireInsurance}    onChange={(v) => sbs("requireInsurance", v)}    label="مطلوب تأمين" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Field label="نسبة العربون (%)"><input type="number" className={cls} value={bs.depositPercent || 20} onChange={(e) => sbs("depositPercent", +e.target.value)} dir="ltr" /></Field>
                <Field label="أدنى حجز مسبق (أيام)"><input type="number" className={cls} value={bs.minAdvanceBookingDays || 1} onChange={(e) => sbs("minAdvanceBookingDays", +e.target.value)} dir="ltr" /></Field>
              </div>
              <Field label="سياسة الإلغاء"><textarea rows={3} className={cls + " resize-none"} value={bs.cancellationPolicy || ""} onChange={(e) => sbs("cancellationPolicy", e.target.value)} dir="rtl" /></Field>
              <Field label="شروط الاستخدام"><textarea rows={4} className={cls + " resize-none"} value={bs.termsOfUse || ""} onChange={(e) => sbs("termsOfUse", e.target.value)} dir="rtl" /></Field>
            </>
          )}

          {/* Events */}
          {(bType === "events" || bType === "event_organizer") && (
            <>
              <SectionTitle>إعدادات الفعاليات</SectionTitle>
              <Toggle value={!!bs.enableOnlineBooking} onChange={(v) => sbs("enableOnlineBooking", v)} label="الحجز الأونلاين" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Field label="أدنى حجز مسبق (أيام)"><input type="number" className={cls} value={bs.minAdvanceBookingDays || 7} onChange={(e) => sbs("minAdvanceBookingDays", +e.target.value)} dir="ltr" /></Field>
              </div>
              <Field label="المناطق المتاحة (بفاصلة)"><input className={cls} value={(bs.availableAreas || []).join(", ")} onChange={(e) => sbs("availableAreas", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} /></Field>
              <Field label="سياسة الإلغاء"><textarea rows={3} className={cls + " resize-none"} value={bs.cancellationPolicy || ""} onChange={(e) => sbs("cancellationPolicy", e.target.value)} dir="rtl" /></Field>
            </>
          )}

          {(bType === "general" || bType === "maintenance" || bType === "workshop" || bType === "laundry" || bType === "printing" || bType === "digital_services" || bType === "photography" || bType === "construction" || bType === "logistics") && (
            <>
              <SectionTitle>إعدادات الحجز</SectionTitle>
              <Toggle value={!!bs.enableOnlineBooking}    onChange={(v) => sbs("enableOnlineBooking", v)}    label="تفعيل الحجز الأونلاين" />
              <Toggle value={!!bs.requireDepositForBooking} onChange={(v) => sbs("requireDepositForBooking", v)} label="مطلوب دفع عربون عند الحجز" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Field label="مدة الحجز الافتراضية"><DurationInput valueMinutes={bs.defaultBookingDuration || 60} onChange={m => sbs("defaultBookingDuration", m)} units={["minute","hour"]} /></Field>
                <Field label="الحجز المسبق (أيام كحد أقصى)"><input type="number" className={cls} value={bs.maxAdvanceBookingDays || 90} onChange={(e) => sbs("maxAdvanceBookingDays", +e.target.value)} dir="ltr" /></Field>
                {bs.requireDepositForBooking && (
                  <Field label="نسبة العربون (%)"><input type="number" className={cls} value={bs.depositPercent || 30} onChange={(e) => sbs("depositPercent", +e.target.value)} dir="ltr" /></Field>
                )}
              </div>
              <Field label="سياسة الإلغاء"><textarea rows={3} className={cls + " resize-none"} value={bs.cancellationPolicy || ""} onChange={(e) => sbs("cancellationPolicy", e.target.value)} placeholder="يمكن الإلغاء قبل 48 ساعة من موعد الخدمة..." dir="rtl" /></Field>
              <SectionTitle>ساعات العمل</SectionTitle>
              <div className="space-y-2">
                {DAYS.map((d) => {
                  const wh = bs.workingHours || {};
                  const day = wh[d.key] || { open: false, from: "09:00", to: "22:00" };
                  return (
                    <div key={d.key} className="flex items-center gap-3 py-2 border-b border-gray-50 flex-wrap">
                      <button onClick={() => sbs("workingHours", { ...wh, [d.key]: { ...day, open: !day.open } })}
                        className={clsx("relative w-8 h-4 rounded-full transition-colors", day.open ? "bg-brand-500" : "bg-gray-200")}>
                        <span className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all", day.open ? "right-0.5" : "left-0.5")} />
                      </button>
                      <span className="text-sm text-gray-700 w-16">{d.label}</span>
                      {day.open ? (
                        <>
                          <input type="time" value={day.from} onChange={(e) => sbs("workingHours", { ...wh, [d.key]: { ...day, from: e.target.value } })} className="border border-[#eef2f6] rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-300" dir="ltr" />
                          <span className="text-gray-400 text-xs">—</span>
                          <input type="time" value={day.to} onChange={(e) => sbs("workingHours", { ...wh, [d.key]: { ...day, to: e.target.value } })} className="border border-[#eef2f6] rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-300" dir="ltr" />
                        </>
                      ) : <span className="text-xs text-gray-400">مغلق</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {logoPicker && (
        <MediaPickerModal
          accept="logo"
          title="اختر شعار المنشأة"
          onSelect={(asset) => { sp("logo", asset.fileUrl); setLogoPicker(false); }}
          onClose={() => setLogoPicker(false)}
        />
      )}

      {coverPicker && (
        <MediaPickerModal
          accept="image"
          title="اختر صورة الغلاف"
          onSelect={(asset) => { sp("coverImage", asset.fileUrl); setCoverPicker(false); }}
          onClose={() => setCoverPicker(false)}
        />
      )}
    </div>
  );
}
