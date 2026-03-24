import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { Users, Plus, Phone, Mail, Pencil, Trash2, Loader2, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { providersApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Input, TextArea, Select, Button, Toggle, EmptyState } from "@/components/ui";
import { clsx } from "clsx";

const DAYS = [
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الإثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
  { key: "friday", label: "الجمعة" },
  { key: "saturday", label: "السبت" },
];

const EMPTY_FORM = {
  name: "",
  nameEn: "",
  phone: "",
  email: "",
  specialty: "",
  bio: "",
  weeklySchedule: {} as Record<string, { start: string; end: string }>,
};

export function ProvidersPage() {
  const { data: res, loading, error, refetch } = useApi(() => providersApi.list(), []);
  const providers = res?.data || [];

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const { mutate: deleteProvider, loading: deleting } = useMutation((id: string) => providersApi.delete(id));

  const update = (field: string, val: any) => setForm((f) => ({ ...f, [field]: val }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (provider: any) => {
    setEditing(provider);
    setForm({
      name: provider.name || "",
      nameEn: provider.name_en || "",
      phone: provider.phone || "",
      email: provider.email || "",
      specialty: provider.specialty || "",
      bio: provider.bio || "",
      weeklySchedule: provider.weekly_schedule || {},
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      if (editing) {
        await providersApi.update(editing.id, form);
        toast.success("تم تحديث مزود الخدمة");
      } else {
        await providersApi.create(form);
        toast.success("تم إضافة مزود الخدمة");
      }
      setShowForm(false);
      refetch();
    } catch {
      toast.error("فشل الحفظ. حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (provider: any) => {
    try {
      await providersApi.update(provider.id, { isActive: !provider.is_active });
      refetch();
    } catch {
      toast.error("فشل تغيير الحالة");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا المزود؟")) return;
    await deleteProvider(id);
    toast.success("تم الحذف");
    refetch();
  };

  const toggleDay = (day: string) => {
    const current = form.weeklySchedule[day];
    const updated = { ...form.weeklySchedule };
    if (current) {
      delete updated[day];
    } else {
      updated[day] = { start: "09:00", end: "18:00" };
    }
    update("weeklySchedule", updated);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  const activeCount = providers.filter((p: any) => p.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">مزودو الخدمة</h1>
          <p className="text-sm text-gray-400 mt-0.5">{providers.length} مزود · {activeCount} نشط</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>إضافة مزود</Button>
      </div>

      {providers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد مزودو خدمة"
          description="أضف مزودي الخدمة لتنظيم جدول أعمالهم وإسناد الحجوزات إليهم"
          action={<Button icon={Plus} onClick={openCreate}>إضافة مزود</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider: any) => (
            <div key={provider.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 font-bold text-lg flex items-center justify-center shrink-0">
                    {provider.name?.[0] || "م"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{provider.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{provider.specialty || "—"}</p>
                  </div>
                </div>
                <Toggle
                  checked={provider.is_active}
                  onChange={() => handleToggleActive(provider)}
                />
              </div>

              <div className="space-y-2 mb-4">
                {provider.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span dir="ltr">{provider.phone}</span>
                  </div>
                )}
                {provider.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{provider.email}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                <button
                  onClick={() => openEdit(provider)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-100 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> تعديل
                </button>
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "تعديل مزود الخدمة" : "إضافة مزود خدمة جديد"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} loading={saving}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="الاسم"
              name="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="الاسم بالعربي"
              required
            />
            <Input
              label="الاسم بالإنجليزية"
              name="nameEn"
              value={form.nameEn}
              onChange={(e) => update("nameEn", e.target.value)}
              placeholder="Name in English"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="الجوال"
              name="phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="05XXXXXXXX"
              dir="ltr"
            />
            <Input
              label="البريد الإلكتروني"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@example.com"
              dir="ltr"
            />
          </div>
          <Input
            label="التخصص"
            name="specialty"
            value={form.specialty}
            onChange={(e) => update("specialty", e.target.value)}
            placeholder="مثال: تصوير، كيتارنج، ديكور..."
          />
          <TextArea
            label="نبذة مختصرة"
            name="bio"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="نبذة عن مزود الخدمة..."
            rows={3}
          />

          {/* Weekly Schedule */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">الجدول الأسبوعي</p>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const active = !!form.weeklySchedule[day.key];
                const schedule = form.weeklySchedule[day.key];
                return (
                  <div key={day.key} className="flex items-center gap-3">
                    <Toggle
                      checked={active}
                      onChange={() => toggleDay(day.key)}
                      label={day.label}
                    />
                    {active && schedule && (
                      <div className="flex items-center gap-2 mr-auto">
                        <input
                          type="time"
                          value={schedule.start}
                          onChange={(e) => update("weeklySchedule", {
                            ...form.weeklySchedule,
                            [day.key]: { ...schedule, start: e.target.value },
                          })}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                          dir="ltr"
                        />
                        <span className="text-xs text-gray-400">إلى</span>
                        <input
                          type="time"
                          value={schedule.end}
                          onChange={(e) => update("weeklySchedule", {
                            ...form.weeklySchedule,
                            [day.key]: { ...schedule, end: e.target.value },
                          })}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                          dir="ltr"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>    </div>
  );
}
