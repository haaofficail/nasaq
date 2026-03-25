import { useState, useEffect } from "react";
import { Modal, Input, Select, Button } from "../ui";
import { customersApi, settingsApi } from "@/lib/api";
import { User, Building2, UserPlus, Phone, Mail, MapPin, Star, Tag, StickyNote, Globe, Hash } from "lucide-react";
import { clsx } from "clsx";

const CITIES = ["الرياض","جدة","مكة المكرمة","المدينة المنورة","الدمام","الخبر","الطائف","بريدة","تبوك","أبها","حائل","نجران","الجبيل","ينبع","الأحساء","القطيف","خميس مشيط","الباحة","عرعر","سكاكا"];

const TIERS = [
  { value: "regular",    label: "عادي" },
  { value: "vip",        label: "VIP — عميل مميز" },
  { value: "enterprise", label: "مؤسسة — حساب كبير" },
];

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
        <Icon className="w-3.5 h-3.5 text-brand-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function CreateCustomerForm({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess?: () => void;
}) {
  const [type, setType]   = useState<"individual" | "business">("individual");
  const [form, setForm]   = useState({
    // Common
    name: "", phone: "", whatsapp: "", sameAsPhone: true,
    email: "", city: "الرياض", source: "direct", tier: "regular", internalNotes: "",
    // Individual
    gender: "", birthdate: "",
    // Business
    companyName: "", crNumber: "", vatNumber: "", website: "",
  });
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [sources, setSources]   = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    settingsApi.customLists().then(r => {
      const s: string[] = r.data?.customerSources || ["انستقرام","واتساب","توصية","قوقل","تيك توك","معرض","مباشر"];
      setSources(s.map((v: string) => ({ value: v, label: v })));
    }).catch(() => {
      setSources([
        { value: "direct",    label: "مباشر" },
        { value: "instagram", label: "انستقرام" },
        { value: "whatsapp",  label: "واتساب" },
        { value: "referral",  label: "إحالة" },
        { value: "google",    label: "قوقل" },
      ]);
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm({ name:"",phone:"",whatsapp:"",sameAsPhone:true,email:"",city:"الرياض",source:"direct",tier:"regular",internalNotes:"",gender:"",birthdate:"",companyName:"",crNumber:"",vatNumber:"",website:"" });
      setErrors({});
      setType("individual");
    }
  }, [open]);

  const set = (field: string) => (e: any) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: "" }));
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim())  errs.name  = "الاسم مطلوب";
    if (!form.phone.trim()) errs.phone = "رقم الجوال مطلوب";
    if (type === "business" && !form.companyName.trim()) errs.companyName = "اسم المؤسسة مطلوب";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await customersApi.create({
        name:          form.name,
        phone:         form.phone,
        email:         form.email || undefined,
        type,
        tier:          form.tier,
        city:          form.city || undefined,
        source:        form.source,
        internalNotes: form.internalNotes || undefined,
        ...(type === "business" && {
          companyName: form.companyName,
          vatNumber:   form.vatNumber || undefined,
          crNumber:    form.crNumber  || undefined,
          website:     form.website   || undefined,
        }),
        ...(type === "individual" && {
          gender:    form.gender    || undefined,
          birthdate: form.birthdate || undefined,
        }),
        whatsapp: form.sameAsPhone ? form.phone : (form.whatsapp || undefined),
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrors({ submit: err?.message || "حدث خطأ، حاول مجدداً" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="عميل جديد" size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} loading={loading} icon={UserPlus}>إضافة العميل</Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
          {([
            { v: "individual", label: "فرد",    icon: User },
            { v: "business",   label: "مؤسسة",  icon: Building2 },
          ] as const).map(t => (
            <button
              key={t.v}
              type="button"
              onClick={() => setType(t.v)}
              className={clsx(
                "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                type === t.v
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        {/* معلومات التواصل */}
        <Section title="معلومات التواصل" icon={Phone}>
          {type === "business" && (
            <Input
              name="companyName"
              label="اسم المؤسسة *"
              value={form.companyName}
              onChange={set("companyName")}
              placeholder="مثال: شركة الفجر للتقنية"
              error={errors.companyName}
            />
          )}
          <Input
            name="name"
            label={type === "business" ? "اسم جهة الاتصال *" : "الاسم الكامل *"}
            value={form.name}
            onChange={set("name")}
            placeholder={type === "business" ? "المدير أو المسؤول" : "الاسم الثلاثي"}
            error={errors.name}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              name="phone"
              label="رقم الجوال *"
              value={form.phone}
              onChange={set("phone")}
              placeholder="05XXXXXXXX"
              dir="ltr"
              error={errors.phone}
            />
            <Input
              name="email"
              label="البريد الإلكتروني"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="اختياري"
              dir="ltr"
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={form.sameAsPhone}
                onChange={set("sameAsPhone")}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-xs text-gray-600">واتساب = نفس رقم الجوال</span>
            </label>
            {!form.sameAsPhone && (
              <Input
                name="whatsapp"
                label="رقم واتساب"
                value={form.whatsapp}
                onChange={set("whatsapp")}
                placeholder="05XXXXXXXX"
                dir="ltr"
              />
            )}
          </div>
        </Section>

        {/* معلومات إضافية — فرد */}
        {type === "individual" && (
          <Section title="تفاصيل إضافية" icon={User}>
            <div className="grid grid-cols-2 gap-3">
              <Select
                name="gender"
                label="الجنس"
                value={form.gender}
                onChange={set("gender")}
                options={[
                  { value: "",       label: "غير محدد" },
                  { value: "male",   label: "ذكر" },
                  { value: "female", label: "أنثى" },
                ]}
              />
              <Input
                name="birthdate"
                label="تاريخ الميلاد"
                type="date"
                value={form.birthdate}
                onChange={set("birthdate")}
              />
            </div>
          </Section>
        )}

        {/* معلومات المؤسسة */}
        {type === "business" && (
          <Section title="بيانات المؤسسة" icon={Building2}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="crNumber"
                label="رقم السجل التجاري"
                value={form.crNumber}
                onChange={set("crNumber")}
                placeholder="1010XXXXXX"
                dir="ltr"
              />
              <Input
                name="vatNumber"
                label="الرقم الضريبي"
                value={form.vatNumber}
                onChange={set("vatNumber")}
                placeholder="3XXXXXXXXXX"
                dir="ltr"
              />
            </div>
            <Input
              name="website"
              label="الموقع الإلكتروني"
              value={form.website}
              onChange={set("website")}
              placeholder="https://example.com"
              dir="ltr"
            />
          </Section>
        )}

        {/* الموقع والتصنيف */}
        <Section title="التصنيف والمصدر" icon={Tag}>
          <div className="grid grid-cols-2 gap-3">
            <Select
              name="city"
              label="المدينة"
              value={form.city}
              onChange={set("city")}
              options={CITIES.map(c => ({ value: c, label: c }))}
            />
            <Select
              name="source"
              label="مصدر الاكتساب"
              value={form.source}
              onChange={set("source")}
              options={sources.length ? sources : [{ value: "direct", label: "مباشر" }]}
            />
          </div>
          <Select
            name="tier"
            label="تصنيف العميل"
            value={form.tier}
            onChange={set("tier")}
            options={TIERS}
          />
        </Section>

        {/* ملاحظات */}
        <Section title="ملاحظات داخلية" icon={StickyNote}>
          <textarea
            value={form.internalNotes}
            onChange={set("internalNotes")}
            rows={3}
            placeholder="ملاحظات خاصة بالفريق — لا يراها العميل"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all resize-none text-gray-700 placeholder:text-gray-300"
          />
        </Section>

      </div>
    </Modal>
  );
}
