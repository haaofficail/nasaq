import { useState, useEffect } from "react";
import { Modal, Input, Select, TextArea, Button, Toggle } from "../ui";
import { customersApi, settingsApi } from "@/lib/api";
import { UserPlus } from "lucide-react";

export function CreateCustomerForm({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess?: () => void;
}) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", type: "individual",
    tier: "regular", companyName: "", city: "الرياض",
    source: "direct", internalNotes: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sourceOptions, setSourceOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    settingsApi.customLists().then(r => {
      const sources: string[] = r.data?.customerSources || ["انستقرام", "واتساب", "توصية", "قوقل", "تيك توك", "معرض", "مباشر"];
      setSourceOptions(sources.map((s: string) => ({ value: s, label: s })));
    }).catch(() => {
      setSourceOptions([
        { value: "direct", label: "مباشر" },
        { value: "instagram", label: "انستقرام" },
        { value: "whatsapp", label: "واتساب" },
        { value: "referral", label: "إحالة" },
      ]);
    });
  }, [open]);

  const set = (field: string) => (e: any) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "الاسم مطلوب";
    if (!form.phone.trim()) errs.phone = "رقم الجوال مطلوب";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await customersApi.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        type: form.type,
        tier: form.tier,
        companyName: form.type === "business" ? form.companyName : undefined,
        city: form.city || undefined,
        source: form.source,
        internalNotes: form.internalNotes || undefined,
      });
      onSuccess?.();
      onClose();
      setForm({ name: "", phone: "", email: "", type: "individual", tier: "regular", companyName: "", city: "الرياض", source: "direct", internalNotes: "" });
    } catch (err: any) {
      setErrors({ submit: err.message });
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
      {errors.submit && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{errors.submit}</div>}

      <div className="space-y-4">
        {/* Type */}
        <div className="flex gap-3">
          {[{ v: "individual", l: "فرد" }, { v: "business", l: "مؤسسة" }].map(t => (
            <button key={t.v} type="button" onClick={() => setForm(f => ({ ...f, type: t.v }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                form.type === t.v ? "bg-brand-50 border-brand-200 text-brand-600" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >{t.l}</button>
          ))}
        </div>

        <Input label="الاسم" name="name" value={form.name} onChange={set("name")} placeholder={form.type === "business" ? "اسم جهة الاتصال" : "الاسم الكامل"} required error={errors.name} />
        
        {form.type === "business" && (
          <Input label="اسم المؤسسة" name="companyName" value={form.companyName} onChange={set("companyName")} placeholder="مثال: شركة أوتاد العقارية" />
        )}

        <Input label="رقم الجوال" name="phone" value={form.phone} onChange={set("phone")} placeholder="05XXXXXXXX" required error={errors.phone} dir="ltr" />
        <Input label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={set("email")} placeholder="اختياري" dir="ltr" />
        <Input label="المدينة" name="city" value={form.city} onChange={set("city")} />

        <div className="grid grid-cols-2 gap-4">
          <Select label="التصنيف" name="tier" value={form.tier} onChange={set("tier")} options={[
            { value: "regular", label: "عادي" },
            { value: "vip", label: "VIP" },
            { value: "enterprise", label: "مؤسسة" },
          ]} />
          <Select
            label="مصدر الاكتساب"
            name="source"
            value={form.source}
            onChange={set("source")}
            options={sourceOptions.length > 0 ? sourceOptions : [{ value: "direct", label: "مباشر" }]}
            placeholder={sourceOptions.length === 0 ? "جاري التحميل..." : undefined}
          />
        </div>

        <TextArea label="ملاحظات داخلية" name="internalNotes" value={form.internalNotes} onChange={set("internalNotes")} placeholder="ملاحظات لا يراها العميل" rows={2} />
      </div>
    </Modal>
  );
}
