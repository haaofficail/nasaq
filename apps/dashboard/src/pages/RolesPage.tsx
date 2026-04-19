import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { Shield, Plus, Loader2, AlertCircle, ChevronRight, Users, Save, Trash2, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { jobTitlesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Button, Input } from "@/components/ui";

// ============================================================
// PERMISSION GROUPS (mirrors default-permissions.ts)
// ============================================================

const PERMISSION_GROUPS: Record<string, { label: string; permissions: Array<{ key: string; label: string }> }> = {
  bookings:  { label: "الحجوزات",          permissions: [
    { key: "bookings.view", label: "عرض الحجوزات" }, { key: "bookings.create", label: "اضافة حجز" },
    { key: "bookings.update", label: "تعديل حجز" }, { key: "bookings.cancel", label: "الغاء حجز" },
    { key: "bookings.view_all", label: "عرض جميع الحجوزات" }, { key: "bookings.assign", label: "تعيين موظف" },
  ]},
  orders:    { label: "الطلبات",            permissions: [
    { key: "orders.view", label: "عرض الطلبات" }, { key: "orders.create", label: "اضافة طلب" },
    { key: "orders.update", label: "تعديل طلب" }, { key: "orders.cancel", label: "الغاء طلب" },
    { key: "orders.view_all", label: "جميع الطلبات" },
  ]},
  finance:   { label: "المالية",            permissions: [
    { key: "finance.invoices", label: "الفواتير" }, { key: "finance.reports", label: "التقارير المالية" },
    { key: "finance.commissions", label: "العمولات" }, { key: "finance.salaries", label: "الرواتب" },
    { key: "finance.expenses", label: "المصاريف" }, { key: "finance.payment_gateway", label: "بوابات الدفع" },
  ]},
  team:      { label: "الفريق",             permissions: [
    { key: "team.view", label: "عرض الفريق" }, { key: "team.add", label: "اضافة عضو" },
    { key: "team.remove", label: "حذف عضو" }, { key: "team.edit", label: "تعديل عضو" },
    { key: "team.schedules", label: "الجداول" }, { key: "team.attendance", label: "الحضور" },
    { key: "team.permissions", label: "ادارة الصلاحيات" },
  ]},
  products:  { label: "المنتجات والخدمات", permissions: [
    { key: "products.view", label: "عرض" }, { key: "products.create", label: "اضافة" },
    { key: "products.update", label: "تعديل" }, { key: "products.delete", label: "حذف" },
    { key: "products.inventory", label: "المخزون" }, { key: "products.pricing", label: "الاسعار" },
  ]},
  customers: { label: "العملاء",            permissions: [
    { key: "customers.view", label: "عرض" }, { key: "customers.create", label: "اضافة" },
    { key: "customers.update", label: "تعديل" }, { key: "customers.history", label: "السجل" },
    { key: "customers.loyalty", label: "نقاط الولاء" }, { key: "customers.communicate", label: "التواصل" },
  ]},
  reports:   { label: "التقارير",           permissions: [
    { key: "reports.performance", label: "تقارير الاداء" }, { key: "reports.sales", label: "تقارير المبيعات" },
    { key: "reports.customers", label: "تقارير العملاء" }, { key: "reports.analytics", label: "التحليلات" },
    { key: "reports.export", label: "تصدير" },
  ]},
  settings:  { label: "الاعدادات",          permissions: [
    { key: "settings.org", label: "اعدادات المنشأة" }, { key: "settings.branches", label: "الفروع" },
    { key: "settings.integrations", label: "التكاملات" }, { key: "settings.billing", label: "الاشتراك" },
    { key: "settings.roles", label: "الادوار" },
  ]},
  pos:       { label: "نقطة البيع",         permissions: [
    { key: "pos.sell", label: "البيع" }, { key: "pos.refund", label: "الاسترداد" },
    { key: "pos.discount", label: "الخصومات" }, { key: "pos.close_shift", label: "اغلاق الوردية" },
    { key: "pos.view_shifts", label: "عرض الورديات" },
  ]},
  delivery:  { label: "التوصيل",            permissions: [
    { key: "delivery.view_own", label: "توصيلاتي" }, { key: "delivery.view_all", label: "جميع التوصيلات" },
    { key: "delivery.assign", label: "اسناد" }, { key: "delivery.manage_zones", label: "المناطق" },
    { key: "delivery.manage_fees", label: "الرسوم" },
  ]},
  content:   { label: "المحتوى",            permissions: [
    { key: "content.website", label: "الموقع" }, { key: "content.menu", label: "القائمة" },
    { key: "content.offers", label: "العروض" }, { key: "content.notifications", label: "الاشعارات" },
  ]},
};

const SYSTEM_ROLE_LABELS: Record<string, string> = {
  owner:     "المالك",
  manager:   "المدير",
  provider:  "مقدم الخدمة",
  employee:  "الموظف",
  reception: "الاستقبال",
};

const SYSTEM_ROLE_COLORS: Record<string, string> = {
  owner:     "bg-violet-100 text-violet-700",
  manager:   "bg-blue-100 text-blue-700",
  provider:  "bg-emerald-100 text-emerald-700",
  employee:  "bg-gray-100 text-gray-700",
  reception: "bg-amber-100 text-amber-700",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-[#f1f5f9] rounded-lg", className)} />;
}

// ============================================================
// PERMISSION MATRIX MODAL
// ============================================================

function PermissionModal({ jobTitle, onClose }: { jobTitle: any; onClose: () => void }) {
  const { data, loading } = useApi(() => jobTitlesApi.getPermissions(jobTitle.id), [jobTitle.id]);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);

  const resolved: string[] = data?.data?.resolved || [];
  const perms: Set<string> = selected ?? new Set(resolved);

  const toggle = (key: string) => {
    const next = new Set(perms);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const toggleGroup = (groupKey: string) => {
    const groupPerms = PERMISSION_GROUPS[groupKey].permissions.map((p) => p.key);
    const allSet = groupPerms.every((k) => perms.has(k));
    const next = new Set(perms);
    if (allSet) groupPerms.forEach((k) => next.delete(k));
    else groupPerms.forEach((k) => next.add(k));
    setSelected(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await jobTitlesApi.savePermissions(jobTitle.id, Array.from(perms));
      toast.success("تم حفظ الصلاحيات");
      setTimeout(onClose, 800);
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`صلاحيات: ${jobTitle.name}`}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">إلغاء</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الصلاحيات
          </button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            الدور النظامي: <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", SYSTEM_ROLE_COLORS[jobTitle.systemRole])}>
              {SYSTEM_ROLE_LABELS[jobTitle.systemRole]}
            </span>
          </p>
          {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
            const groupPerms = group.permissions.map((p) => p.key);
            const allSet = groupPerms.every((k) => perms.has(k));
            const someSet = groupPerms.some((k) => perms.has(k));
            return (
              <div key={groupKey} className="border border-[#eef2f6] rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-3 text-right",
                    allSet ? "bg-brand-50" : someSet ? "bg-amber-50" : "bg-[#f8fafc]"
                  )}
                >
                  <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                  <div className={clsx(
                    "w-5 h-5 rounded border-2 flex items-center justify-center",
                    allSet ? "bg-brand-500 border-brand-500" : someSet ? "bg-amber-400 border-amber-400" : "border-[#eef2f6]"
                  )}>
                    {(allSet || someSet) && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-3">
                  {group.permissions.map((perm) => {
                    const on = perms.has(perm.key);
                    return (
                      <button
                        key={perm.key}
                        onClick={() => toggle(perm.key)}
                        className={clsx(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-right",
                          on ? "bg-brand-50 text-brand-700 border border-brand-200" : "bg-white text-gray-500 border border-[#eef2f6] hover:border-[#eef2f6]"
                        )}
                      >
                        <div className={clsx("w-4 h-4 rounded shrink-0 flex items-center justify-center border", on ? "bg-brand-500 border-brand-500" : "border-[#eef2f6]")}>
                          {on && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        {perm.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}    </Modal>
  );
}

// ============================================================
// CREATE / EDIT JOB TITLE MODAL
// ============================================================

const SYSTEM_ROLES = ["owner", "manager", "provider", "employee", "reception"] as const;

function JobTitleModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name:       initial?.name || "",
    nameEn:     initial?.nameEn || "",
    systemRole: initial?.systemRole || "employee",
    color:      initial?.color || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      if (initial) await jobTitlesApi.update(initial.id, form);
      else await jobTitlesApi.create(form);
      onSaved();
      onClose();
    } catch {
      setError("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "تعديل مسمى وظيفي" : "مسمى وظيفي جديد"}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">إلغاء</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="الاسم بالعربية" name="name" value={form.name} onChange={set("name")} required error={error} />
        <Input label="الاسم بالإنجليزية (اختياري)" name="nameEn" value={form.nameEn} onChange={set("nameEn")} dir="ltr" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">الدور النظامي</label>
          <select
            value={form.systemRole}
            onChange={set("systemRole")}
            className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r} value={r}>{SYSTEM_ROLE_LABELS[r]}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">يحدد مجموعة الصلاحيات الافتراضية</p>
        </div>
        <Input label="اللون (اختياري)" name="color" value={form.color} onChange={set("color")} placeholder="#e74c3c" dir="ltr" />
      </div>
    </Modal>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export function RolesPage() {
  const { data: res, loading, error, refetch } = useApi(() => jobTitlesApi.list(), []);
  const jobTitles = res?.data || [];

  const [permissionsTarget, setPermissionsTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف "${name}"؟`)) return;
    try {
      await jobTitlesApi.delete(id);
      toast.success("تم الحذف");
      refetch();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  if (loading) return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المسميات الوظيفية والصلاحيات</h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة أدوار الفريق وتخصيص صلاحياتهم</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>مسمى جديد</Button>
      </div>

      {/* Grid */}
      {jobTitles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-[#eef2f6]">
          <Shield className="w-12 h-12 text-gray-200" />
          <p className="text-gray-400">لا توجد مسميات وظيفية بعد</p>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>أضف أول مسمى</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobTitles.map((jt: any) => (
            <div key={jt.id} className="bg-white rounded-2xl border border-[#eef2f6] p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: jt.color ? `${jt.color}22` : undefined }}
                  >
                    <Shield className="w-5 h-5" style={{ color: jt.color || undefined }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{jt.name}</p>
                    {jt.nameEn && <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{jt.nameEn}</p>}
                  </div>
                </div>
                <span className={clsx("shrink-0 px-2 py-0.5 rounded-full text-xs font-medium", SYSTEM_ROLE_COLORS[jt.systemRole])}>
                  {SYSTEM_ROLE_LABELS[jt.systemRole]}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {(jt.resolvedPermissions || []).slice(0, 4).map((p: string) => (
                  <span key={p} className="px-2 py-0.5 bg-[#f8fafc] rounded-full text-xs text-gray-500">{p.split(".")[1]}</span>
                ))}
                {(jt.resolvedPermissions || []).length > 4 && (
                  <span className="px-2 py-0.5 bg-[#f8fafc] rounded-full text-xs text-gray-400">+{jt.resolvedPermissions.length - 4}</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                <button
                  onClick={() => setPermissionsTarget(jt)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-xs font-medium hover:bg-brand-100"
                >
                  <Shield className="w-3.5 h-3.5" /> الصلاحيات
                </button>
                <button
                  onClick={() => setEditTarget(jt)}
                  className="px-3 py-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-[#f8fafc] text-xs"
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(jt.id, jt.name)}
                  className="px-3 py-1.5 text-red-300 hover:text-red-500 rounded-lg hover:bg-red-50 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <JobTitleModal onClose={() => setShowCreate(false)} onSaved={refetch} />
      )}
      {editTarget && (
        <JobTitleModal initial={editTarget} onClose={() => setEditTarget(null)} onSaved={refetch} />
      )}
      {permissionsTarget && (
        <PermissionModal jobTitle={permissionsTarget} onClose={() => setPermissionsTarget(null)} />
      )}    </div>
  );
}
