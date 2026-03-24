import { useState } from "react";
import { Building2, GitBranch, CreditCard, Plus, Trash2, Loader2, CheckCircle2, Zap, Shield, Pencil, User, MapPin, Clock, Star, Warehouse, Briefcase } from "lucide-react";
import { clsx } from "clsx";
import { settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Input, Select, Modal } from "@/components/ui";

const BUSINESS_TYPES = [
  { value: "restaurant",  label: "مطعم" },
  { value: "cafe",        label: "مقهى وكوفي شوب" },
  { value: "catering",    label: "ضيافة وتقديم طعام" },
  { value: "bakery",      label: "مخبز وحلويات" },
  { value: "salon",       label: "صالون تجميل نسائي" },
  { value: "barber",      label: "حلاقة وتصفيف رجالي" },
  { value: "spa",         label: "سبا ومساج" },
  { value: "fitness",     label: "صالة رياضية ولياقة" },
  { value: "events",      label: "تنظيم فعاليات وأفراح" },
  { value: "photography", label: "تصوير وإنتاج إعلامي" },
  { value: "retail",      label: "متجر تجزئة عام" },
  { value: "flower_shop", label: "متجر ورود وهدايا" },
  { value: "rental",      label: "تأجير معدات وأصول" },
  { value: "services",    label: "خدمات مهنية وحرة" },
  { value: "medical",     label: "عيادات ورعاية صحية" },
  { value: "education",   label: "تعليم وتدريب" },
  { value: "technology",  label: "تقنية معلومات وبرمجة" },
  { value: "construction",label: "مقاولات وبناء" },
  { value: "logistics",   label: "شحن ونقل ولوجستيات" },
  { value: "other",       label: "أخرى" },
];

const BRANCH_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#ef4444",
];

const DAYS_AR: Record<string, string> = {
  sun: "الأحد", mon: "الاثنين", tue: "الثلاثاء", wed: "الأربعاء",
  thu: "الخميس", fri: "الجمعة", sat: "السبت",
};

const EMPTY_BRANCH = {
  name: "", branchCode: "", type: "branch", color: "#6366f1",
  isMainBranch: false, city: "", address: "",
  managerName: "", managerPhone: "", capacity: "", notes: "",
  openingHours: {
    sun: { open: "09:00", close: "22:00", active: true },
    mon: { open: "09:00", close: "22:00", active: true },
    tue: { open: "09:00", close: "22:00", active: true },
    wed: { open: "09:00", close: "22:00", active: true },
    thu: { open: "09:00", close: "22:00", active: true },
    fri: { open: "09:00", close: "22:00", active: false },
    sat: { open: "09:00", close: "22:00", active: true },
  },
};

const tabs = [
  { label: "الملف التعريفي", icon: Building2 },
  { label: "الفروع",         icon: GitBranch },
  { label: "الاشتراك",      icon: CreditCard },
];

const planColors: Record<string, string> = {
  basic:      "bg-gray-100 text-gray-700",
  pro:        "bg-brand-50 text-brand-700",
  enterprise: "bg-amber-50 text-amber-700",
};

const BRANCH_TYPE_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  branch:    { label: "فرع",     icon: GitBranch, bg: "bg-indigo-50",  text: "text-indigo-600" },
  warehouse: { label: "مستودع",  icon: Warehouse, bg: "bg-amber-50",   text: "text-amber-600"  },
  office:    { label: "مكتب",   icon: Briefcase, bg: "bg-sky-50",     text: "text-sky-600"    },
};

function BranchTypeIcon({ type }: { type: string }) {
  const cfg = BRANCH_TYPE_CONFIG[type] || BRANCH_TYPE_CONFIG.branch;
  const Icon = cfg.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.bg, cfg.text)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [showBranch, setShowBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchForm, setBranchForm] = useState<any>(EMPTY_BRANCH);
  const [saved, setSaved] = useState(false);

  const { data: profileRes, loading: pLoading, refetch: refetchProfile } = useApi(() => settingsApi.profile(), []);
  const { data: branchRes,  loading: bLoading, refetch: refetchBranches } = useApi(() => settingsApi.branches(), []);
  const { data: subRes }                                                   = useApi(() => settingsApi.subscription(), []);

  const { mutate: updateProfile, loading: saving   } = useMutation((data: any)  => settingsApi.updateProfile(data));
  const { mutate: createBranch,  loading: creating  } = useMutation((data: any)  => settingsApi.createBranch(data));
  const { mutate: updateBranch,  loading: updating  } = useMutation(({ id, data }: any) => settingsApi.updateBranch(id, data));
  const { mutate: deleteBranch                      } = useMutation((id: string) => settingsApi.deleteBranch(id));

  const org      = profileRes?.data || {};
  const branches: any[] = branchRes?.data || [];
  const sub      = subRes?.data || {};
  const mainBranch = branches.find(b => b.isMainBranch);

  const [form, setForm] = useState<any>(null);
  const f = form || org;

  const handleSaveProfile = async () => {
    await updateProfile(form || org);
    setSaved(true);
    refetchProfile();
    setTimeout(() => setSaved(false), 2500);
  };

  const openCreate = () => {
    setEditingBranch(null);
    setBranchForm({ ...EMPTY_BRANCH });
    setShowBranch(true);
  };

  const openEdit = (branch: any) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name || "",
      branchCode: branch.branchCode || "",
      type: branch.type || "branch",
      color: branch.color || "#6366f1",
      isMainBranch: branch.isMainBranch || false,
      city: branch.city || "",
      address: branch.address || "",
      managerName: branch.managerName || "",
      managerPhone: branch.managerPhone || "",
      capacity: branch.capacity || "",
      notes: branch.notes || "",
      openingHours: branch.openingHours || EMPTY_BRANCH.openingHours,
    });
    setShowBranch(true);
  };

  const handleSaveBranch = async () => {
    if (editingBranch) {
      await updateBranch({ id: editingBranch.id, data: branchForm });
    } else {
      await createBranch(branchForm);
    }
    setShowBranch(false);
    setBranchForm({ ...EMPTY_BRANCH });
    setEditingBranch(null);
    refetchBranches();
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (!confirm(`حذف الفرع "${name}"؟`)) return;
    await deleteBranch(id);
    refetchBranches();
  };

  const setDay = (day: string, field: string, value: any) => {
    setBranchForm((prev: any) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: { ...prev.openingHours[day], [field]: value },
      },
    }));
  };

  if (pLoading || bLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-sm text-gray-400 mt-0.5">إدارة إعدادات حسابك ومؤسستك</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 w-fit">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === i ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ──────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-500" />
            معلومات المؤسسة
          </h2>
          <div className="space-y-4 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <Input label="اسم المؤسسة" name="name" value={f.name || ""} onChange={e => setForm({ ...f, name: e.target.value })} placeholder="اسم الشركة بالعربي" />
              <Input label="المدينة" name="city" value={f.city || ""} onChange={e => setForm({ ...f, city: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="رقم الجوال" name="phone" value={f.phone || ""} onChange={e => setForm({ ...f, phone: e.target.value })} dir="ltr" placeholder="05XXXXXXXX" />
              <Input label="البريد الإلكتروني" name="email" value={f.email || ""} onChange={e => setForm({ ...f, email: e.target.value })} dir="ltr" placeholder="info@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="السجل التجاري" name="cr" value={f.commercialRegister || ""} onChange={e => setForm({ ...f, commercialRegister: e.target.value })} dir="ltr" />
              <Input label="الرقم الضريبي" name="vat" value={f.vatNumber || ""} onChange={e => setForm({ ...f, vatNumber: e.target.value })} dir="ltr" />
            </div>
            <Select
              label="نوع المنشأة" name="businessType"
              value={f.businessType || f.business_type || ""}
              onChange={e => setForm({ ...f, businessType: e.target.value })}
              options={[{ value: "", label: "— اختر نوع المنشأة —" }, ...BUSINESS_TYPES]}
            />
            <div className="pt-2 flex items-center gap-3">
              <Button onClick={handleSaveProfile} loading={saving}>حفظ التغييرات</Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> تم الحفظ
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Branches tab ─────────────────────────────────────── */}
      {activeTab === 1 && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                <GitBranch className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
                <p className="text-xs text-gray-400">إجمالي الفروع</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{branches.filter(b => b.isActive).length}</p>
                <p className="text-xs text-gray-400">فروع نشطة</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <Star className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 truncate">{mainBranch?.name || "—"}</p>
                <p className="text-xs text-gray-400">الفرع الرئيسي</p>
              </div>
            </div>
          </div>

          {/* Header action */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{branches.length} {branches.length === 1 ? "فرع" : "فروع"} مضافة</p>
            <Button icon={Plus} onClick={openCreate}>فرع جديد</Button>
          </div>

          {/* Empty state */}
          {branches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد فروع</h3>
              <p className="text-sm text-gray-400 mb-5">أضف فروع منشأتك لإدارة الحضور والحجوزات والمخزون لكل فرع</p>
              <Button icon={Plus} onClick={openCreate}>إضافة أول فرع</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch: any) => (
                <div
                  key={branch.id}
                  className={clsx(
                    "bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all",
                    branch.isActive ? "border-gray-100" : "border-gray-100 opacity-60"
                  )}
                >
                  {/* Color bar */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: branch.color || "#6366f1" }} />

                  <div className="p-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 truncate">{branch.name}</p>
                          {branch.isMainBranch && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                              <Star className="w-3 h-3" /> رئيسي
                            </span>
                          )}
                          {!branch.isActive && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">معطّل</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <BranchTypeIcon type={branch.type} />
                          {branch.branchCode && (
                            <span className="text-xs text-gray-400 font-mono">{branch.branchCode}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(branch)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteBranch(branch.id, branch.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-1.5">
                      {branch.city && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <span className="truncate">{branch.city}{branch.address ? ` — ${branch.address}` : ""}</span>
                        </div>
                      )}
                      {branch.managerName && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <span>{branch.managerName}</span>
                          {branch.managerPhone && (
                            <span className="text-gray-400 font-mono" dir="ltr">{branch.managerPhone}</span>
                          )}
                        </div>
                      )}
                      {branch.openingHours && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <span>
                            {(() => {
                              const activeDays = Object.entries(branch.openingHours as Record<string, any>)
                                .filter(([, v]) => v.active).length;
                              const sample = Object.values(branch.openingHours as Record<string, any>).find((v: any) => v.active) as any;
                              return sample ? `${sample.open} – ${sample.close} (${activeDays} أيام)` : "—";
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Branch create/edit modal */}
          <Modal
            open={showBranch}
            onClose={() => { setShowBranch(false); setEditingBranch(null); }}
            title={editingBranch ? `تعديل الفرع — ${editingBranch.name}` : "فرع جديد"}
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => { setShowBranch(false); setEditingBranch(null); }}>إلغاء</Button>
                <Button onClick={handleSaveBranch} loading={creating || updating} icon={editingBranch ? CheckCircle2 : Plus}>
                  {editingBranch ? "حفظ التغييرات" : "إضافة الفرع"}
                </Button>
              </>
            }
          >
            <div className="space-y-5">
              {/* Section: معلومات أساسية */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">معلومات الفرع</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="اسم الفرع *"
                    name="name"
                    value={branchForm.name}
                    onChange={e => setBranchForm((p: any) => ({ ...p, name: e.target.value }))}
                    placeholder="مثال: فرع الرياض الرئيسي"
                    required
                  />
                  <Input
                    label="كود الفرع"
                    name="branchCode"
                    value={branchForm.branchCode}
                    onChange={e => setBranchForm((p: any) => ({ ...p, branchCode: e.target.value }))}
                    placeholder="FR-01"
                    dir="ltr"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Select
                    label="نوع الفرع"
                    name="type"
                    value={branchForm.type}
                    onChange={e => setBranchForm((p: any) => ({ ...p, type: e.target.value }))}
                    options={[
                      { value: "branch",    label: "فرع" },
                      { value: "warehouse", label: "مستودع" },
                      { value: "office",    label: "مكتب" },
                    ]}
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">لون الفرع</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {BRANCH_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBranchForm((p: any) => ({ ...p, color: c }))}
                          className={clsx(
                            "w-7 h-7 rounded-full border-2 transition-transform",
                            branchForm.color === c ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* الفرع الرئيسي toggle */}
                <div className="mt-3 flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <button
                    type="button"
                    onClick={() => setBranchForm((p: any) => ({ ...p, isMainBranch: !p.isMainBranch }))}
                    className={clsx("transition-colors", branchForm.isMainBranch ? "text-amber-500" : "text-gray-300")}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">الفرع الرئيسي</p>
                    <p className="text-xs text-gray-500">يظهر كفرع افتراضي في الحجوزات والتقارير</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBranchForm((p: any) => ({ ...p, isMainBranch: !p.isMainBranch }))}
                    className={clsx(
                      "w-10 h-6 rounded-full transition-colors relative",
                      branchForm.isMainBranch ? "bg-amber-400" : "bg-gray-200"
                    )}
                  >
                    <span className={clsx(
                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all",
                      branchForm.isMainBranch ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              {/* Section: الموقع */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">الموقع الجغرافي</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="المدينة" name="city" value={branchForm.city} onChange={e => setBranchForm((p: any) => ({ ...p, city: e.target.value }))} placeholder="الرياض" />
                  <Input label="العنوان التفصيلي" name="address" value={branchForm.address} onChange={e => setBranchForm((p: any) => ({ ...p, address: e.target.value }))} placeholder="حي الملز، شارع..." />
                </div>
              </div>

              {/* Section: مدير الفرع */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">مدير الفرع</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="اسم المدير" name="managerName" value={branchForm.managerName} onChange={e => setBranchForm((p: any) => ({ ...p, managerName: e.target.value }))} placeholder="اسم مدير الفرع" />
                  <Input label="جوال المدير" name="managerPhone" value={branchForm.managerPhone} onChange={e => setBranchForm((p: any) => ({ ...p, managerPhone: e.target.value }))} placeholder="05XXXXXXXX" dir="ltr" />
                </div>
              </div>

              {/* Section: أوقات الدوام */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">أوقات الدوام</p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {Object.entries(DAYS_AR).map(([day, label], idx) => {
                    const dayData = branchForm.openingHours?.[day] || { open: "09:00", close: "22:00", active: false };
                    return (
                      <div key={day} className={clsx("flex items-center gap-3 px-4 py-2.5", idx % 2 === 0 ? "bg-gray-50" : "bg-white")}>
                        {/* Active toggle */}
                        <button
                          type="button"
                          onClick={() => setDay(day, "active", !dayData.active)}
                          className={clsx("w-8 h-5 rounded-full relative transition-colors shrink-0", dayData.active ? "bg-brand-500" : "bg-gray-200")}
                        >
                          <span className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all", dayData.active ? "right-0.5" : "left-0.5")} />
                        </button>
                        <span className={clsx("text-sm w-20 shrink-0", dayData.active ? "text-gray-800 font-medium" : "text-gray-400")}>{label}</span>
                        {dayData.active ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="time"
                              value={dayData.open}
                              onChange={e => setDay(day, "open", e.target.value)}
                              className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 text-center"
                              dir="ltr"
                            />
                            <span className="text-gray-400 text-sm">—</span>
                            <input
                              type="time"
                              value={dayData.close}
                              onChange={e => setDay(day, "close", e.target.value)}
                              className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 text-center"
                              dir="ltr"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 flex-1">مغلق</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section: ملاحظات */}
              <div className="grid grid-cols-2 gap-3">
                <Input label="الطاقة الاستيعابية" name="capacity" value={branchForm.capacity} onChange={e => setBranchForm((p: any) => ({ ...p, capacity: e.target.value }))} placeholder="مثال: 200 شخص" />
                <Input label="ملاحظات" name="notes" value={branchForm.notes} onChange={e => setBranchForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="أي ملاحظات إضافية" />
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ── Subscription tab ─────────────────────────────────── */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                الباقة الحالية
              </h2>
              <span className={clsx("px-3 py-1 rounded-full text-sm font-semibold", planColors[sub.plan] || planColors.basic)}>
                {sub.plan || "basic"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">الحالة</p>
                <div className="flex items-center gap-1.5">
                  <span className={clsx("w-2 h-2 rounded-full", sub.status === "active" ? "bg-emerald-500" : sub.status === "trialing" ? "bg-amber-500" : "bg-gray-400")} />
                  <span className="text-sm font-semibold text-gray-700">
                    {sub.status === "active" ? "نشط" : sub.status === "trialing" ? "تجربة مجانية" : sub.status || "—"}
                  </span>
                </div>
              </div>
              {sub.trialEndsAt && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs text-amber-600 mb-1">تنتهي التجربة</p>
                  <p className="text-sm font-semibold text-amber-700">{new Date(sub.trialEndsAt).toLocaleDateString("ar-SA")}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">التجديد</p>
                <p className="text-sm font-semibold text-gray-700">
                  {sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString("ar-SA") : "—"}
                </p>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-gray-50">
              <Button variant="secondary" icon={CreditCard}>ترقية الباقة</Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-500" />
              مميزات الباقة
            </h3>
            <div className="space-y-2.5">
              {["إدارة الحجوزات والتقويم","إدارة العملاء والخدمات","التقارير والتحليلات","مزودو الخدمة والفريق","الفوترة والمالية","المخزون والأصول"].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-gray-700">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
