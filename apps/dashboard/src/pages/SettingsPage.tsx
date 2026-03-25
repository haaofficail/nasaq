import { useState, useRef } from "react";
import { Building2, GitBranch, CreditCard, Plus, Trash2, Loader2, CheckCircle2, Zap, Shield, Pencil, User, MapPin, Clock, Star, Warehouse, Briefcase, Palette, Upload, ImageIcon } from "lucide-react";
import { clsx } from "clsx";
import { settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Input, Select, Modal } from "@/components/ui";
import { COLORS, SHADOWS, TYPOGRAPHY } from "@/lib/design-tokens";
import { SAUDI_CITIES, BUSINESS_TYPE_LIST } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";

const CITY_OPTIONS = [{ value: "", label: "— اختر المدينة —" }, ...SAUDI_CITIES.map(c => ({ value: c, label: c }))];

const FONT = TYPOGRAPHY.family;

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}>
      <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: COLORS.primary }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, direction: "rtl", fontFamily: FONT }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, margin: 0 }}>الإعدادات</h1>
        <p style={{ fontSize: 13, color: COLORS.muted, margin: "4px 0 0" }}>إدارة إعدادات حسابك ومؤسستك</p>
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 4, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 4, width: "fit-content" }}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 10, border: "none",
              fontFamily: FONT, fontSize: 13, fontWeight: activeTab === i ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
              background: activeTab === i ? COLORS.primary : "transparent",
              color: activeTab === i ? "#fff" : COLORS.muted,
              boxShadow: activeTab === i ? `0 1px 4px ${COLORS.primary}30` : "none",
            }}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ──────────────────────────────────────── */}
      {activeTab === 0 && (
        <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: "24px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={16} color={COLORS.primary} />
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { icon: <GitBranch size={17} color="#6366f1" />, bg: "#eef2ff", value: branches.length,                          label: "إجمالي الفروع" },
              { icon: <CheckCircle2 size={17} color={COLORS.successText} />, bg: COLORS.successBg, value: branches.filter(b => b.isActive).length, label: "فروع نشطة" },
              { icon: <Star size={17} color={COLORS.warningText} />, bg: COLORS.warningBg, value: null, name: mainBranch?.name || "—", label: "الفرع الرئيسي" },
            ].map((s, i) => (
              <div key={i} style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  {s.value != null ? (
                    <p style={{ fontSize: 22, fontWeight: 700, color: COLORS.dark, margin: 0, lineHeight: 1 }}>{s.value}</p>
                  ) : (
                    <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{s.name}</p>
                  )}
                  <p style={{ fontSize: 11, color: COLORS.muted, margin: "2px 0 0" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Header action */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>{branches.length} {branches.length === 1 ? "فرع" : "فروع"} مضافة</p>
            <Button icon={Plus} onClick={openCreate}>فرع جديد</Button>
          </div>

          {/* Empty state */}
          {branches.length === 0 ? (
            <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "56px 20px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, background: "#eef2ff", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <GitBranch size={28} color="#6366f1" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: COLORS.dark, marginBottom: 6 }}>لا توجد فروع</h3>
              <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 20 }}>أضف فروع منشأتك لإدارة الحضور والحجوزات والمخزون لكل فرع</p>
              <Button icon={Plus} onClick={openCreate}>إضافة أول فرع</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch: any) => (
                <div
                  key={branch.id}
                  style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden", transition: "box-shadow 0.15s", opacity: branch.isActive ? 1 : 0.6 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = SHADOWS.cardHover; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  {/* Color bar */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: branch.color || "#6366f1" }} />

                  <div style={{ padding: 16 }}>
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{branch.name}</p>
                          {branch.isMainBranch && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: COLORS.warningBg, color: COLORS.warningText }}>
                              <Star size={10} /> رئيسي
                            </span>
                          )}
                          {!branch.isActive && (
                            <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "#f1f5f9", color: "#64748b" }}>معطّل</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                          <BranchTypeIcon type={branch.type} />
                          {branch.branchCode && (
                            <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: "monospace" }}>{branch.branchCode}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => openEdit(branch)} style={{ padding: 5, borderRadius: 7, border: "none", background: "none", cursor: "pointer", color: COLORS.muted }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeleteBranch(branch.id, branch.name)} style={{ padding: 5, borderRadius: 7, border: "none", background: "none", cursor: "pointer", color: COLORS.danger }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {branch.city && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.muted }}>
                          <MapPin size={12} color="#cbd5e1" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{branch.city}{branch.address ? ` — ${branch.address}` : ""}</span>
                        </div>
                      )}
                      {branch.managerName && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.muted }}>
                          <User size={12} color="#cbd5e1" style={{ flexShrink: 0 }} />
                          <span>{branch.managerName}</span>
                          {branch.managerPhone && <span style={{ fontFamily: "monospace" }} dir="ltr">{branch.managerPhone}</span>}
                        </div>
                      )}
                      {branch.openingHours && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.muted }}>
                          <Clock size={12} color="#cbd5e1" style={{ flexShrink: 0 }} />
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
                          style={{ width: 28, height: 28, borderRadius: "50%", border: branchForm.color === c ? `2px solid ${COLORS.dark}` : "2px solid transparent", backgroundColor: c, cursor: "pointer", transform: branchForm.color === c ? "scale(1.1)" : "scale(1)", transition: "transform 0.15s" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* الفرع الرئيسي toggle */}
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, padding: 12, background: COLORS.warningBg, borderRadius: 10, border: `1px solid #fde68a` }}>
                  <button
                    type="button"
                    onClick={() => setBranchForm((p: any) => ({ ...p, isMainBranch: !p.isMainBranch }))}
                    style={{ border: "none", background: "none", cursor: "pointer", color: branchForm.isMainBranch ? COLORS.warningText : "#cbd5e1", padding: 0 }}
                  >
                    <Star size={20} style={{ fill: "currentColor" }} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: COLORS.dark, margin: 0 }}>الفرع الرئيسي</p>
                    <p style={{ fontSize: 11, color: COLORS.muted, margin: "2px 0 0" }}>يظهر كفرع افتراضي في الحجوزات والتقارير</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBranchForm((p: any) => ({ ...p, isMainBranch: !p.isMainBranch }))}
                    style={{ width: 40, height: 24, borderRadius: 12, position: "relative", border: "none", cursor: "pointer", background: branchForm.isMainBranch ? COLORS.warning : "#e2e8f0", transition: "background 0.15s" }}
                  >
                    <span style={{ position: "absolute", top: 4, width: 16, height: 16, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "right 0.15s, left 0.15s", ...(branchForm.isMainBranch ? { right: 4 } : { left: 4 }) }} />
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
                      <div key={day} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: idx % 2 === 0 ? "#f8f9fc" : "#fff" }}>
                        {/* Active toggle */}
                        <button
                          type="button"
                          onClick={() => setDay(day, "active", !dayData.active)}
                          style={{ width: 32, height: 20, borderRadius: 10, position: "relative", border: "none", cursor: "pointer", flexShrink: 0, background: dayData.active ? COLORS.primary : "#e2e8f0", transition: "background 0.15s" }}
                        >
                          <span style={{ position: "absolute", top: 2, width: 16, height: 16, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "right 0.15s, left 0.15s", ...(dayData.active ? { right: 2 } : { left: 2 }) }} />
                        </button>
                        <span style={{ fontSize: 13, width: 80, flexShrink: 0, fontWeight: dayData.active ? 500 : 400, color: dayData.active ? COLORS.dark : COLORS.muted }}>{label}</span>
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
          <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <ImageIcon size={16} color={COLORS.primary} />
              شعار المنشأة
            </h2>
            <div className="flex items-center gap-5">
              {/* Preview */}
              <div style={{ width: 80, height: 80, borderRadius: 16, border: `2px dashed ${COLORS.border}`, background: COLORS.light, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {f.logo ? (
                  <img src={f.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
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
          <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Palette size={16} color={COLORS.primary} />
              أيقونة المتصفح (Favicon)
            </h2>
            <div className="flex items-center gap-5">
              {/* Preview */}
              <div style={{ width: 48, height: 48, borderRadius: 10, border: `2px dashed ${COLORS.border}`, background: COLORS.light, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {f.favicon ? (
                  <img src={f.favicon} alt="favicon" style={{ width: 32, height: 32, objectFit: "contain" }} />
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
          <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Palette size={16} color={COLORS.primary} />
              اللون الأساسي للمنشأة
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {BRAND_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...f, brandColor: c })}
                    style={{
                      width: 36, height: 36, borderRadius: "50%", border: (f.brandColor || COLORS.primary) === c ? `3px solid ${COLORS.dark}` : "3px solid transparent",
                      backgroundColor: c, cursor: "pointer",
                      transform: (f.brandColor || COLORS.primary) === c ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.15s",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600">لون مخصص</label>
                <input
                  type="color"
                  value={f.brandColor || COLORS.primary}
                  onChange={e => setForm({ ...f, brandColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <span className="text-xs text-gray-400 font-mono">{f.brandColor || COLORS.primary}</span>
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
          <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={16} color={COLORS.warningText} />
                الباقة الحالية
              </h2>
              <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: COLORS.infoBg, color: COLORS.infoText }}>
                {sub.plan || "basic"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: COLORS.light, borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>الحالة</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: sub.status === "active" ? COLORS.success : sub.status === "trialing" ? COLORS.warning : COLORS.muted, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>
                    {sub.status === "active" ? "نشط" : sub.status === "trialing" ? "تجربة مجانية" : sub.status || "—"}
                  </span>
                </div>
              </div>
              {sub.trialEndsAt && (
                <div style={{ background: COLORS.warningBg, borderRadius: 10, padding: 16 }}>
                  <p style={{ fontSize: 11, color: COLORS.warningText, marginBottom: 6 }}>تنتهي التجربة</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.warningText }}>{fmtDate(sub.trialEndsAt)}</p>
                </div>
              )}
              <div style={{ background: COLORS.light, borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>التجديد</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark }}>
                  {sub.renewalDate ? fmtDate(sub.renewalDate) : "—"}
                </p>
              </div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
              <Button variant="secondary" icon={CreditCard}>ترقية الباقة</Button>
            </div>
          </div>

          <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={16} color={COLORS.primary} />
              مميزات الباقة
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["إدارة الحجوزات والتقويم","إدارة العملاء والخدمات","التقارير والتحليلات","مزودو الخدمة والفريق","الفوترة والمالية","المخزون والأصول"].map((feat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={15} color={COLORS.successText} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: COLORS.dark }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
