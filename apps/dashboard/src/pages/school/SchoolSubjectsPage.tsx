import { useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, X, Loader2, Link2, Unlink, GraduationCap, Layers } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────

const SUBJECT_TYPES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  core:     { label: "أساسية",   color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  skill:    { label: "مهارية",   color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  activity: { label: "نشاطية",   color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200" },
};

const STAGES = ["ابتدائي", "متوسط", "ثانوي"] as const;

function TypeBadge({ type }: { type: string }) {
  const t = SUBJECT_TYPES[type] ?? SUBJECT_TYPES.core;
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", t.color, t.bg, t.border)}>
      {t.label}
    </span>
  );
}

// ── Subject Modal ─────────────────────────────────────────────

function SubjectModal({ editing, onClose, onSaved }: { editing: any | null; onClose: () => void; onSaved: () => void }) {
  const [name,      setName]      = useState(editing?.name      ?? "");
  const [type,      setType]      = useState(editing?.type      ?? "core");
  const [sortOrder, setSortOrder] = useState<number>(editing?.sortOrder ?? 0);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError("اسم المادة مطلوب"); return; }
    setSaving(true); setError(null);
    try {
      const payload = { name: name.trim(), type, sortOrder };
      if (editing) await schoolApi.updateSubject(editing.id, payload);
      else         await schoolApi.createSubject(payload);
      onSaved(); onClose();
    } catch (e: any) { setError(e?.message ?? "حدث خطأ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">{editing ? "تعديل المادة" : "إضافة مادة دراسية"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">اسم المادة <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: رياضيات"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">نوع المادة</label>
            <div className="flex gap-2">
              {(["core","skill","activity"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={clsx(
                    "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                    type === t
                      ? `${SUBJECT_TYPES[t].bg} ${SUBJECT_TYPES[t].color} ${SUBJECT_TYPES[t].border}`
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {SUBJECT_TYPES[t].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">ترتيب العرض</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400"
              dir="ltr"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة المادة"}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Grade Level Modal ─────────────────────────────────────────

function GradeLevelModal({ editing, onClose, onSaved }: { editing: any | null; onClose: () => void; onSaved: () => void }) {
  const [name,      setName]      = useState(editing?.name      ?? "");
  const [stage,     setStage]     = useState(editing?.stage     ?? "متوسط");
  const [sortOrder, setSortOrder] = useState<number>(editing?.sortOrder ?? 0);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError("اسم الصف مطلوب"); return; }
    setSaving(true); setError(null);
    try {
      const payload = { name: name.trim(), stage, sortOrder };
      if (editing) await schoolApi.updateGradeLevel(editing.id, payload);
      else         await schoolApi.createGradeLevel(payload);
      onSaved(); onClose();
    } catch (e: any) { setError(e?.message ?? "حدث خطأ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">{editing ? "تعديل الصف" : "إضافة صف دراسي"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">اسم الصف <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: الأول المتوسط"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">المرحلة الدراسية</label>
            <div className="flex gap-2">
              {STAGES.map((s) => (
                <button key={s} onClick={() => setStage(s)}
                  className={clsx("flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                    stage === s ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">ترتيب العرض</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" dir="ltr" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة الصف"}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Link Subject Modal ────────────────────────────────────────

function LinkSubjectModal({
  gradeLevelId, gradeName, linkedIds, allSubjects, onClose, onSaved,
}: {
  gradeLevelId: string; gradeName: string; linkedIds: Set<string>;
  allSubjects: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [selectedId,  setSelectedId]  = useState("");
  const [weeklyHours, setWeeklyHours] = useState(4);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const unlinked = allSubjects.filter((s) => !linkedIds.has(s.id));

  const handleLink = async () => {
    if (!selectedId) { setError("اختر المادة"); return; }
    setSaving(true); setError(null);
    try {
      await schoolApi.linkSubjectToGrade({ subjectId: selectedId, gradeLevelId, weeklyHours });
      onSaved(); onClose();
    } catch (e: any) { setError(e?.message ?? "حدث خطأ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">إضافة مادة للصف</h2>
            <p className="text-xs text-gray-500 mt-0.5">{gradeName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {unlinked.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">جميع المواد مضافة لهذا الصف</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">المادة الدراسية <span className="text-red-400">*</span></label>
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 bg-white">
                  <option value="">اختر المادة...</option>
                  {["core","skill","activity"].map((type) => {
                    const group = unlinked.filter((s) => s.type === type);
                    if (group.length === 0) return null;
                    return (
                      <optgroup key={type} label={SUBJECT_TYPES[type].label}>
                        {group.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">الحصص الأسبوعية</label>
                <input type="number" min={1} max={40} value={weeklyHours} onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" dir="ltr" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={handleLink} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {saving ? "جاري الإضافة..." : "إضافة للصف"}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">إلغاء</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Grade Subjects Panel ──────────────────────────────────────

function GradeSubjectsPanel({
  grade, allSubjects, onRefresh,
}: {
  grade: any; allSubjects: any[]; onRefresh: () => void;
}) {
  const [showLink,  setShowLink]  = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const { data, loading, refetch } = useApi(
    () => schoolApi.getSubjectsByGrade(grade.id),
    [grade.id]
  );
  const linked: any[] = data?.data ?? [];
  const linkedIds = new Set(linked.map((s: any) => s.id));

  const handleUnlink = async (linkId: string) => {
    if (!confirm("إزالة هذه المادة من الصف؟")) return;
    setUnlinking(linkId);
    try { await schoolApi.unlinkSubjectFromGrade(linkId); refetch(); onRefresh(); }
    catch {} finally { setUnlinking(null); }
  };

  const typeGroups: Record<string, any[]> = { core: [], skill: [], activity: [] };
  linked.forEach((s: any) => { (typeGroups[s.type] ?? typeGroups.core).push(s); });

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{linked.length} مادة دراسية</span>
          {Object.entries(typeGroups).map(([type, list]) =>
            list.length > 0 ? (
              <span key={type} className={clsx("text-xs px-2 py-0.5 rounded-full border font-medium",
                SUBJECT_TYPES[type].color, SUBJECT_TYPES[type].bg, SUBJECT_TYPES[type].border)}>
                {list.length} {SUBJECT_TYPES[type].label}
              </span>
            ) : null
          )}
        </div>
        <button
          onClick={() => setShowLink(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة مادة
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : linked.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">لا توجد مواد مضافة لهذا الصف</p>
          <button onClick={() => setShowLink(true)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
            إضافة مادة الآن
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(typeGroups).map(([type, list]) => {
            if (list.length === 0) return null;
            return (
              <div key={type}>
                <p className={clsx("text-xs font-bold mb-2", SUBJECT_TYPES[type].color)}>
                  {SUBJECT_TYPES[type].label}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {list.map((s: any) => (
                    <div key={s.id}
                      className={clsx("flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all group",
                        SUBJECT_TYPES[s.type]?.bg ?? "bg-gray-50",
                        SUBJECT_TYPES[s.type]?.border ?? "border-gray-200"
                      )}>
                      <div>
                        <p className={clsx("text-sm font-semibold", SUBJECT_TYPES[s.type]?.color ?? "text-gray-700")}>{s.name}</p>
                        <p className="text-[10px] text-gray-400">{s.weeklyHours} حصة/أسبوع</p>
                      </div>
                      <button
                        onClick={() => handleUnlink(s.linkId)}
                        disabled={unlinking === s.linkId}
                        title="إزالة من الصف"
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        {unlinking === s.linkId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLink && (
        <LinkSubjectModal
          gradeLevelId={grade.id}
          gradeName={grade.name}
          linkedIds={linkedIds}
          allSubjects={allSubjects}
          onClose={() => setShowLink(false)}
          onSaved={() => { refetch(); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export function SchoolSubjectsPage() {
  const [tab,             setTab]             = useState<"matrix" | "subjects" | "grades">("matrix");
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [filterStage,     setFilterStage]     = useState<string>("متوسط");
  const [editSubject,     setEditSubject]      = useState<any | null>(null);
  const [showSubjectForm, setShowSubjectForm]  = useState(false);
  const [editGrade,       setEditGrade]        = useState<any | null>(null);
  const [showGradeForm,   setShowGradeForm]    = useState(false);
  const [deletingId,      setDeletingId]       = useState<string | null>(null);
  const [seeding,         setSeeding]          = useState(false);

  const { data: gradesData, loading: gradesLoading, refetch: refetchGrades } = useApi(
    () => schoolApi.listGradeLevels(filterStage),
    [filterStage]
  );
  const { data: subjectsData, loading: subjectsLoading, refetch: refetchSubjects } = useApi(
    () => schoolApi.listSubjects(),
    []
  );

  const grades: any[]   = gradesData?.data   ?? [];
  const subjects_: any[] = subjectsData?.data ?? [];

  // Auto-select first grade
  const activeGradeId = selectedGradeId ?? grades[0]?.id ?? null;

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      await schoolApi.seedDefaultSubjects(filterStage);
      refetchGrades();
      refetchSubjects();
    } catch {} finally { setSeeding(false); }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("حذف هذه المادة؟ سيتم إزالتها من جميع الصفوف المرتبطة.")) return;
    setDeletingId(id);
    try { await schoolApi.deleteSubject(id); refetchSubjects(); }
    catch {} finally { setDeletingId(null); }
  };

  const handleDeleteGrade = async (id: string) => {
    if (!confirm("حذف هذا الصف؟ سيتم إزالة جميع ارتباطات المواد به.")) return;
    setDeletingId(id);
    try { await schoolApi.deleteGradeLevel(id); refetchGrades(); if (selectedGradeId === id) setSelectedGradeId(null); }
    catch {} finally { setDeletingId(null); }
  };

  return (
    <div dir="rtl" className="space-y-0">

      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 px-6 pt-8 pb-10">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                المواد الدراسية
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">نظام المواد الدراسية</h1>
            <p className="text-sm text-gray-400 mt-1">إدارة المواد وربطها بالصفوف الدراسية</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 bg-gray-50 min-h-full">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1 w-fit -mt-5 relative z-10 shadow-sm">
          {([
            { key: "matrix",   label: "الصفوف والمواد", icon: Link2 },
            { key: "subjects", label: "المواد الدراسية", icon: BookOpen },
            { key: "grades",   label: "الصفوف الدراسية", icon: GraduationCap },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={clsx("px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5",
                tab === key ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50")}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* ── Tab: Matrix (الصفوف والمواد) ── */}
        {tab === "matrix" && (
          <div className="space-y-4">
            {/* Stage filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">المرحلة:</span>
              <div className="flex gap-1">
                {STAGES.map((s) => (
                  <button key={s} onClick={() => { setFilterStage(s); setSelectedGradeId(null); }}
                    className={clsx("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                      filterStage === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {gradesLoading ? (
              <div className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ) : grades.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Layers className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">لا توجد صفوف دراسية بعد</p>
                  <p className="text-sm text-gray-400 mt-1">ابدأ بتفعيل البيانات الافتراضية للمرحلة {filterStage}</p>
                </div>
                <button onClick={handleSeedDefaults} disabled={seeding}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {seeding ? "جاري التحميل..." : `تفعيل البيانات الافتراضية — ${filterStage}`}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grade tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {grades.map((g: any) => (
                    <button key={g.id}
                      onClick={() => setSelectedGradeId(g.id)}
                      className={clsx(
                        "shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap",
                        activeGradeId === g.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                      )}>
                      {g.name}
                    </button>
                  ))}
                </div>

                {/* Subjects for selected grade */}
                {activeGradeId && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-black text-gray-900">
                        {grades.find((g: any) => g.id === activeGradeId)?.name}
                      </h3>
                    </div>
                    <GradeSubjectsPanel
                      grade={grades.find((g: any) => g.id === activeGradeId)!}
                      allSubjects={subjects_}
                      onRefresh={refetchSubjects}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Subjects ── */}
        {tab === "subjects" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-500">{subjects_.length} مادة دراسية</p>
              <button onClick={() => { setEditSubject(null); setShowSubjectForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" /> إضافة مادة
              </button>
            </div>

            {subjectsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
              </div>
            ) : subjects_.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center">
                <BookOpen className="w-8 h-8 text-gray-300" />
                <p className="font-bold text-gray-900">لا توجد مواد بعد</p>
                <button onClick={() => { setEditSubject(null); setShowSubjectForm(true); }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                  إضافة أول مادة
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjects_.map((s: any) => (
                  <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          SUBJECT_TYPES[s.type]?.bg ?? "bg-gray-50")}>
                          <BookOpen className={clsx("w-4 h-4", SUBJECT_TYPES[s.type]?.color ?? "text-gray-400")} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                          <TypeBadge type={s.type} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setEditSubject(s); setShowSubjectForm(true); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSubject(s.id)} disabled={deletingId === s.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50">
                          {deletingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Grade Levels ── */}
        {tab === "grades" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">{grades.length} صف دراسي</p>
                <div className="flex gap-1">
                  {STAGES.map((s) => (
                    <button key={s} onClick={() => setFilterStage(s)}
                      className={clsx("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                        filterStage === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {grades.length === 0 && (
                  <button onClick={handleSeedDefaults} disabled={seeding}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {seeding ? "جاري التحميل..." : "تفعيل البيانات الافتراضية"}
                  </button>
                )}
                <button onClick={() => { setEditGrade(null); setShowGradeForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" /> إضافة صف
                </button>
              </div>
            </div>

            {gradesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
              </div>
            ) : grades.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center">
                <GraduationCap className="w-8 h-8 text-gray-300" />
                <p className="font-bold text-gray-900">لا توجد صفوف دراسية بعد</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grades.map((g: any) => (
                  <div key={g.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{g.name}</p>
                          <span className="text-xs text-gray-400">{g.stage}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setEditGrade(g); setShowGradeForm(true); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteGrade(g.id)} disabled={deletingId === g.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50">
                          {deletingId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSubjectForm && (
        <SubjectModal
          editing={editSubject}
          onClose={() => { setShowSubjectForm(false); setEditSubject(null); }}
          onSaved={refetchSubjects}
        />
      )}
      {showGradeForm && (
        <GradeLevelModal
          editing={editGrade}
          onClose={() => { setShowGradeForm(false); setEditGrade(null); }}
          onSaved={refetchGrades}
        />
      )}
    </div>
  );
}
