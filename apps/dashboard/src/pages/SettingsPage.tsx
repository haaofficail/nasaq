import { useState, useRef } from "react";
import { Building2, GitBranch, CreditCard, Plus, Trash2, Loader2, CheckCircle2, Zap, Shield, Pencil, User, MapPin, Clock, Star, Warehouse, Briefcase, Palette, Upload, ImageIcon } from "lucide-react";
import { clsx } from "clsx";
import { settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Input, Select, Modal } from "@/components/ui";
import { SAUDI_CITIES, BUSINESS_TYPE_LIST } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";

const CITY_OPTIONS = [{ value: "", label: "— اختر المدينة —" }, ...SAUDI_CITIES.map(c => ({ value: c, label: c }))];

const BUSINESS_TYPES = BUSINESS_TYPE_LIST.map(b => ({ value: b.key, label: b.name }));

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
  { label: "الهوية البصرية", icon: Palette },
];

const BRAND_COLORS = [
  "#5b9bd5", "#6366f1", "#8b5cf6", "#ec4899",
  "#10b981", "#f59e0b", "#ef4444", "#06b6d4",
  "#64748b", "#0f172a",
];


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
  const [uploadingLogo, setUploadingLogo]   = useState(false);
  const [uploadingFav,  setUploadingFav]    = useState(false);
  const logoInputRef  = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
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

  const handleUploadFile = async (file: File, field: "logo" | "favicon", setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("nasaq_token") || "";
      const res = await fetch("/api/uploads", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const json = await res.json();
      if (json?.url) {
        setForm((prev: any) => ({ ...(prev || org), [field]: json.url }));
      }
    } finally {
      setLoading(false);
    }
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
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  );

  return (
    <div className="flex flex-col gap-5" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-[13px] text-gray-400 mt-1">إدارة إعدادات حسابك ومؤسستك</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 w-fit">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl border-0 text-[13px] cursor-pointer transition-all",
              activeTab === i ? "bg-brand-400 text-white font-semibold shadow-sm" : "bg-transparent text-gray-400 font-normal hover:text-gray-600",
            )}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ──────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6">
          <h2 className="text-[15px] font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Building2 size={16} className="text-brand-400" />
            معلومات المؤسسة
          </h2>
          <div className="space-y-4 max-w-lg">
            <Select
              label="نوع المنشأة" name="businessType"
              value={f.businessType || f.business_type || ""}
              onChange={e => setForm({ ...f, businessType: e.target.value })}
              options={[{ value: "", label: "— اختر نوع المنشأة —" }, ...BUSINESS_TYPES]}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="اسم المؤسسة" name="name" value={f.name || ""} onChange={e => setForm({ ...f, name: e.target.value })} placeholder="اسم الشركة بالعربي" />
              <Select label="المدينة" name="city" value={f.city || ""} onChange={e => setForm({ ...f, city: e.target.value })} options={CITY_OPTIONS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="رقم الجوال" name="phone" value={f.phone || ""} onChange={e => setForm({ ...f, phone: e.target.value })} dir="ltr" placeholder="05XXXXXXXX" />
              <Input label="البريد الإلكتروني" name="email" value={f.email || ""} onChange={e => setForm({ ...f, email: e.target.value })} dir="ltr" placeholder="info@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="السجل التجاري" name="cr" value={f.commercialRegister || ""} onChange={e => setForm({ ...f, commercialRegister: e.target.value })} dir="ltr" />
              <Input label="الرقم الضريبي" name="vat" value={f.vatNumber || ""} onChange={e => setForm({ ...f, vatNumber: e.target.value })} dir="ltr" />
            </div>
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
            {[
              { icon: <GitBranch size={17} className="text-indigo-600" />, bg: "bg-indigo-50", value: branches.length,                          label: "إجمالي الفروع" },
              { icon: <CheckCircle2 size={17} className="text-emerald-600" />, bg: "bg-emerald-50", value: branches.filter(b => b.isActive).length, label: "فروع نشطة" },
              { icon: <Star size={17} className="text-amber-600" />, bg: "bg-amber-50", value: null, name: mainBranch?.name || "—", label: "الفرع الرئيسي" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                  {s.icon}
                </div>
                <div>
                  {s.value != null ? (
                    <p className="text-[22px] font-bold text-gray-900 leading-none">{s.value}</p>
                  ) : (
                    <p className="text-[13px] font-semibold text-gray-900 truncate max-w-[120px]">{(s as any).name}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Header action */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-400">{branches.length} {branches.length === 1 ? "فرع" : "فروع"} مضافة</p>
            <Button icon={Plus} onClick={openCreate}>فرع جديد</Button>
          </div>

          {/* Empty state */}
          {branches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-14 px-5 text-center">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GitBranch size={28} className="text-indigo-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">لا توجد فروع</h3>
              <p className="text-[13px] text-gray-400 mb-5">أضف فروع منشأتك لإدارة الحضور والحجوزات والمخزون لكل فرع</p>
              <Button icon={Plus} onClick={openCreate}>إضافة أول فرع</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch: any) => (
                <div
                  key={branch.id}
                  className={clsx("bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-md", !branch.isActive && "opacity-60")}
                >
                  {/* Color bar */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: branch.color || "#6366f1" }} />

                  <div className="p-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-gray-900 truncate">{branch.name}</p>
                          {branch.isMainBranch && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                              <Star size={10} /> رئيسي
                            </span>
                          )}
                          {!branch.isActive && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">معطّل</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <BranchTypeIcon type={branch.type} />
                          {branch.branchCode && (
                            <span className="text-[11px] text-gray-400 font-mono">{branch.branchCode}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(branch)} className="p-1 rounded-lg border-0 bg-transparent cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeleteBranch(branch.id, branch.name)} className="p-1 rounded-lg border-0 bg-transparent cursor-pointer text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div className="flex flex-col gap-1.5">
                      {branch.city && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <MapPin size={12} className="text-gray-300 shrink-0" />
                          <span className="truncate">{branch.city}{branch.address ? ` — ${branch.address}` : ""}</span>
                        </div>
                      )}
                      {branch.managerName && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <User size={12} className="text-gray-300 shrink-0" />
                          <span>{branch.managerName}</span>
                          {branch.managerPhone && <span className="font-mono" dir="ltr">{branch.managerPhone}</span>}
                        </div>
                      )}
                      {branch.openingHours && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <Clock size={12} className="text-gray-300 shrink-0" />
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
                          className={clsx("w-7 h-7 rounded-full cursor-pointer transition-transform border-2", branchForm.color === c ? "border-gray-900 scale-110" : "border-transparent")}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* الفرع الرئيسي toggle */}
                <div className="mt-3 flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <button
                    type="button"
                    onClick={() => setBranchForm((p: any) => ({ ...p, isMainBranch: !p.isMainBranch }))}
                    className={clsx("border-0 bg-transparent cursor-pointer p-0", branchForm.isMainBranch ? "text-amber-500" : "text-gray-300")}
                  >
                    <Star size={20} style={{ fill: "currentColor" }} />
                  </button>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-gray-900">الفرع الرئيسي</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">يظهر كفرع افتراضي في الحجوزات والتقارير</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBranchForm((p: any) => ({ ...p, isMainBranch: !p.isMainBranch }))}
                    className={clsx("w-10 h-6 rounded-full relative border-0 cursor-pointer transition-colors", branchForm.isMainBranch ? "bg-amber-400" : "bg-gray-200")}
                  >
                    <span className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all", branchForm.isMainBranch ? "right-1" : "left-1")} />
                  </button>
                </div>
              </div>

              {/* Section: الموقع */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">الموقع الجغرافي</p>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="المدينة" name="city" value={branchForm.city} onChange={e => setBranchForm((p: any) => ({ ...p, city: e.target.value }))} options={CITY_OPTIONS} />
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
                          className={clsx("w-8 h-5 rounded-full relative border-0 cursor-pointer shrink-0 transition-colors", dayData.active ? "bg-brand-400" : "bg-gray-200")}
                        >
                          <span className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all", dayData.active ? "right-0.5" : "left-0.5")} />
                        </button>
                        <span className={clsx("text-[13px] w-20 shrink-0", dayData.active ? "font-medium text-gray-900" : "font-normal text-gray-400")}>{label}</span>
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

      {/* ── Branding tab ─────────────────────────────────────── */}
      {activeTab === 3 && (
        <div className="space-y-5 max-w-2xl">
          {/* Logo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[15px] font-bold text-gray-900 mb-5 flex items-center gap-2">
              <ImageIcon size={16} className="text-brand-400" />
              شعار المنشأة
            </h2>
            <div className="flex items-center gap-5">
              {/* Preview */}
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                {f.logo ? (
                  <img src={f.logo} alt="logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon size={28} color="#cbd5e1" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <Input
                  label="رابط الشعار"
                  name="logo"
                  value={f.logo || ""}
                  onChange={e => setForm({ ...f, logo: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
                <div className="flex items-center gap-3">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleUploadFile(file, "logo", setUploadingLogo); e.target.value = ""; }}
                  />
                  <Button
                    variant="secondary"
                    icon={uploadingLogo ? Loader2 : Upload}
                    loading={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    رفع صورة
                  </Button>
                  <p className="text-xs text-gray-400">PNG أو SVG أو WEBP — يُفضل 200×200 أو أكبر</p>
                </div>
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[15px] font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Palette size={16} className="text-brand-400" />
              أيقونة المتصفح (Favicon)
            </h2>
            <div className="flex items-center gap-5">
              {/* Preview */}
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                {f.favicon ? (
                  <img src={f.favicon} alt="favicon" className="w-8 h-8 object-contain" />
                ) : (
                  <Palette size={20} color="#cbd5e1" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <Input
                  label="رابط الأيقونة"
                  name="favicon"
                  value={f.favicon || ""}
                  onChange={e => setForm({ ...f, favicon: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
                <div className="flex items-center gap-3">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/x-icon,image/ico"
                    className="hidden"
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleUploadFile(file, "favicon", setUploadingFav); e.target.value = ""; }}
                  />
                  <Button
                    variant="secondary"
                    icon={uploadingFav ? Loader2 : Upload}
                    loading={uploadingFav}
                    onClick={() => faviconInputRef.current?.click()}
                  >
                    رفع أيقونة
                  </Button>
                  <p className="text-xs text-gray-400">PNG أو SVG أو ICO — 32×32 أو 64×64 مثالي</p>
                </div>
              </div>
            </div>
          </div>

          {/* Brand color */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[15px] font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Palette size={16} className="text-brand-400" />
              اللون الأساسي للمنشأة
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {BRAND_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...f, brandColor: c })}
                    className={clsx("w-9 h-9 rounded-full cursor-pointer transition-transform border-[3px]", (f.brandColor || "#5b9bd5") === c ? "border-gray-900 scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600">لون مخصص</label>
                <input
                  type="color"
                  value={f.brandColor || "#5b9bd5"}
                  onChange={e => setForm({ ...f, brandColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <span className="text-xs text-gray-400 font-mono">{f.brandColor || "#5b9bd5"}</span>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveProfile} loading={saving}>حفظ الهوية البصرية</Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" /> تم الحفظ
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Subscription tab ─────────────────────────────────── */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                الباقة الحالية
              </h2>
              <span className="px-3 py-1 rounded-full text-[13px] font-semibold bg-blue-50 text-blue-700">
                {sub.plan || "basic"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[11px] text-gray-400 mb-1.5">الحالة</p>
                <div className="flex items-center gap-1.5">
                  <span className={clsx("w-2 h-2 rounded-full shrink-0", sub.status === "active" ? "bg-emerald-500" : sub.status === "trialing" ? "bg-amber-500" : "bg-gray-400")} />
                  <span className="text-[13px] font-semibold text-gray-900">
                    {sub.status === "active" ? "نشط" : sub.status === "trialing" ? "تجربة مجانية" : sub.status || "—"}
                  </span>
                </div>
              </div>
              {sub.trialEndsAt && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-[11px] text-amber-600 mb-1.5">تنتهي التجربة</p>
                  <p className="text-[13px] font-semibold text-amber-700">{fmtDate(sub.trialEndsAt)}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[11px] text-gray-400 mb-1.5">التجديد</p>
                <p className="text-[13px] font-semibold text-gray-900">
                  {sub.renewalDate ? fmtDate(sub.renewalDate) : "—"}
                </p>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100">
              <Button variant="secondary" icon={CreditCard}>ترقية الباقة</Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={16} className="text-brand-400" />
              مميزات الباقة
            </h3>
            <div className="flex flex-col gap-2.5">
              {["إدارة الحجوزات والتقويم","إدارة العملاء والخدمات","التقارير والتحليلات","مزودو الخدمة والفريق","الفوترة والمالية","المخزون والأصول"].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span className="text-[13px] text-gray-900">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
