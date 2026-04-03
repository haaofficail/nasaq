import { useState } from "react";
import { Shield, Plus, Loader2, X, Save, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { jobTitlesApi } from "@/lib/api";

// ── صلاحيات المدرسة ─────────────────────────────────────────

const SCHOOL_PERMISSION_GROUPS: Record<string, {
  label: string;
  permissions: Array<{ key: string; label: string }>;
}> = {
  students: {
    label: "الطلاب",
    permissions: [
      { key: "school.students.read",  label: "عرض بيانات الطلاب" },
      { key: "school.students.write", label: "إضافة وتعديل الطلاب" },
    ],
  },
  timetable: {
    label: "الجدول الدراسي",
    permissions: [
      { key: "school.timetable.view", label: "عرض الجدول" },
      { key: "school.timetable.edit", label: "تعديل الجدول" },
    ],
  },
  attendance: {
    label: "الحضور والغياب",
    permissions: [
      { key: "school.attendance.record",   label: "تسجيل الحضور" },
      { key: "school.attendance.view_all", label: "عرض جميع السجلات" },
    ],
  },
  behavior: {
    label: "السلوك والمخالفات",
    permissions: [
      { key: "school.behavior.view",  label: "عرض السلوك" },
      { key: "school.behavior.write", label: "إضافة مخالفة أو تقدير" },
    ],
  },
  cases: {
    label: "الحالات والإرشاد",
    permissions: [
      { key: "school.cases.access",       label: "الوصول للحالات" },
      { key: "school.cases.manage",       label: "إدارة الحالات" },
      { key: "school.referrals.create",   label: "رفع حالة" },
      { key: "school.referrals.manage",   label: "إدارة الإحالات" },
      { key: "school.counseling.access",  label: "الإرشاد الطلابي" },
    ],
  },
  reports: {
    label: "التقارير",
    permissions: [
      { key: "school.reports.view", label: "عرض التقارير" },
    ],
  },
  settings: {
    label: "الإعدادات",
    permissions: [
      { key: "school.settings.manage", label: "إدارة إعدادات المدرسة" },
    ],
  },
  teacher: {
    label: "أدوات المعلم",
    permissions: [
      { key: "school.teacher.dashboard",  label: "لوحة تحكم المعلم" },
      { key: "school.preparations.write", label: "التحضيرات اليومية" },
      { key: "school.daily_logs.write",   label: "اليوميات" },
    ],
  },
};

// ── مودال الصلاحيات ──────────────────────────────────────────

function PermissionsModal({ jobTitle, onClose }: { jobTitle: any; onClose: () => void }) {
  const { data, loading } = useApi(() => jobTitlesApi.getPermissions(jobTitle.id), [jobTitle.id]);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const resolved: string[] = data?.data?.resolved ?? [];
  const perms: Set<string> = selected ?? new Set(resolved);

  const toggle = (key: string) => {
    const next = new Set(perms);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
    setSaved(false);
  };

  const toggleGroup = (groupKey: string) => {
    const keys = SCHOOL_PERMISSION_GROUPS[groupKey].permissions.map(p => p.key);
    const allSet = keys.every(k => perms.has(k));
    const next = new Set(perms);
    if (allSet) keys.forEach(k => next.delete(k)); else keys.forEach(k => next.add(k));
    setSelected(next);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await jobTitlesApi.savePermissions(jobTitle.id, Array.from(perms));
      setSaved(true);
      setTimeout(onClose, 600);
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: jobTitle.color + "22" }}>
              <Shield className="w-4 h-4" style={{ color: jobTitle.color }} />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">صلاحيات: {jobTitle.name}</h2>
              <p className="text-xs text-gray-400">{perms.size} صلاحية مفعّلة</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          ) : (
            Object.entries(SCHOOL_PERMISSION_GROUPS).map(([groupKey, group]) => {
              const groupPerms = group.permissions;
              const checkedCount = groupPerms.filter(p => perms.has(p.key)).length;
              const allChecked = checkedCount === groupPerms.length;
              const isOpen = expanded[groupKey] !== false; // open by default

              return (
                <div key={groupKey} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [groupKey]: !isOpen }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleGroup(groupKey); }}
                        className={clsx(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                          allChecked ? "bg-emerald-500 border-emerald-500" : checkedCount > 0 ? "border-emerald-300 bg-emerald-50" : "border-gray-300"
                        )}
                      >
                        {allChecked && <Check className="w-3 h-3 text-white" />}
                        {!allChecked && checkedCount > 0 && <div className="w-2 h-0.5 bg-emerald-400" />}
                      </button>
                      <span className="text-sm font-bold text-gray-700">{group.label}</span>
                      {checkedCount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                          {checkedCount}/{groupPerms.length}
                        </span>
                      )}
                    </div>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 py-2 space-y-1.5">
                      {groupPerms.map(perm => (
                        <label key={perm.key} className="flex items-center gap-3 py-1.5 cursor-pointer group">
                          <div
                            onClick={() => toggle(perm.key)}
                            className={clsx(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                              perms.has(perm.key) ? "bg-emerald-500 border-emerald-500" : "border-gray-300 group-hover:border-emerald-300"
                            )}
                          >
                            {perms.has(perm.key) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-gray-700">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-gray-100 flex gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "تم الحفظ" : "حفظ الصلاحيات"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ── مودال إضافة مسمى ─────────────────────────────────────────

const COLORS = ["#1d4ed8","#0891b2","#7c3aed","#059669","#d97706","#dc2626","#be185d","#166534","#374151","#0f766e"];

function AddTitleModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name,    setName]    = useState("");
  const [color,   setColor]   = useState(COLORS[0]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("اسم المسمى مطلوب"); return; }
    setSaving(true);
    try {
      await jobTitlesApi.create({ name: name.trim(), color, systemRole: "employee" });
      onDone();
      onClose();
    } catch { setError("خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-black text-gray-900 mb-5">مسمى وظيفي جديد</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">اسم المسمى <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: فني صيانة"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">اللون</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={clsx("w-7 h-7 rounded-lg transition-all", color === c && "ring-2 ring-offset-2 ring-gray-400")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </button>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ──────────────────────────────────────────

export function SchoolRolesPage() {
  const { data: res, loading, error, refetch } = useApi(() => jobTitlesApi.list(), []);
  const jobTitles: any[] = res?.data ?? [];

  const [permTarget, setPermTarget] = useState<any>(null);
  const [showAdd, setShowAdd]       = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف مسمى "${name}"؟`)) return;
    try {
      await jobTitlesApi.delete(id);
      refetch();
    } catch {}
  };

  return (
    <div dir="rtl" className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-900">المسميات الوظيفية وصلاحياتها</h2>
          <p className="text-xs text-gray-400 mt-0.5">خصّص صلاحيات كل دور في المدرسة</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          مسمى جديد
        </button>
      </div>

      {/* Job Titles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : jobTitles.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-14 text-center">
          <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-500">لا توجد مسميات وظيفية</p>
          <p className="text-xs text-gray-400 mt-1">اضغط «مسمى جديد» لإضافة أول مسمى</p>
          <p className="text-xs text-gray-300 mt-3">
            إذا أكملت إعداد المدرسة، ستُضاف المسميات الافتراضية تلقائياً
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {jobTitles.map((jt: any) => (
            <div key={jt.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-all group">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: (jt.color ?? "#374151") + "1a" }}
                >
                  <Shield className="w-5 h-5" style={{ color: jt.color ?? "#374151" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-gray-900">{jt.name}</p>
                  </div>
                  {jt.nameEn && <p className="text-xs text-gray-400 mt-0.5">{jt.nameEn}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                <button
                  onClick={() => setPermTarget(jt)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  <Shield className="w-3 h-3" />
                  الصلاحيات
                </button>
                <button
                  onClick={() => handleDelete(jt.id, jt.name)}
                  className="p-1.5 rounded-xl border border-gray-100 text-gray-300 hover:border-red-100 hover:text-red-400 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {permTarget && <PermissionsModal jobTitle={permTarget} onClose={() => { setPermTarget(null); refetch(); }} />}
      {showAdd && <AddTitleModal onClose={() => setShowAdd(false)} onDone={refetch} />}
    </div>
  );
}
