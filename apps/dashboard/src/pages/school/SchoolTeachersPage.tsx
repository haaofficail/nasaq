import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Search, Pencil, Trash2, X, Loader2, CheckCircle2, UserCheck, Calendar, Link2 } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { PageFAQ } from "@/components/school/PageFAQ";

// ── Assignment Modal ──────────────────────────────────────

type ScopeType = "class" | "grade" | "stage";

const SCOPE_OPTIONS: { value: ScopeType; label: string; desc: string }[] = [
  { value: "class", label: "فصل محدد",     desc: "اختر فصلاً أو أكثر" },
  { value: "grade", label: "صف كامل",      desc: "جميع فصول الصف" },
  { value: "stage", label: "مرحلة كاملة",  desc: "جميع فصول المرحلة" },
];

function TeacherAssignModal({
  teacher,
  onClose,
  onDone,
}: {
  teacher: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const [scope,       setScope]       = useState<ScopeType>("class");
  const [subject,     setSubject]     = useState("");
  const [notes,       setNotes]       = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // classRoomIds
  const [selGrades,   setSelGrades]   = useState<Set<string>>(new Set()); // grade names
  const [saving,      setSaving]      = useState(false);

  const { data: classData }    = useApi(() => schoolApi.listClassRooms(), []);
  const classRooms: any[]      = classData?.data ?? [];
  const { data: subjectsData } = useApi(() => schoolApi.listSubjects(), []);
  const subjectsList: any[]    = subjectsData?.data ?? [];
  const { data: setupData }    = useApi(() => schoolApi.getSetupStatus(), []);
  const stage: string          = setupData?.data?.stage ?? "متوسط";

  const { data: assignData, refetch } = useApi(
    () => schoolApi.getTeacherAssignments(teacher.id),
    [teacher.id]
  );
  const existing: any[] = assignData?.data?.assignments ?? [];

  // Group classrooms by grade
  const byGrade = new Map<string, any[]>();
  classRooms.forEach((cr: any) => {
    if (!byGrade.has(cr.grade)) byGrade.set(cr.grade, []);
    byGrade.get(cr.grade)!.push(cr);
  });
  const grades = [...byGrade.keys()];

  const toggleClass = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleGrade = (g: string) =>
    setSelGrades(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });

  const canSubmit = !!subject &&
    (scope === "stage" || (scope === "class" && selectedIds.size > 0) || (scope === "grade" && selGrades.size > 0));

  const handleAdd = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (scope === "class") {
        for (const classRoomId of selectedIds)
          await schoolApi.createTeacherAssignment(teacher.id, { classRoomId, subject, notes: notes || undefined });
      } else if (scope === "grade") {
        for (const grade of selGrades)
          await schoolApi.createTeacherAssignment(teacher.id, { grade, subject, notes: notes || undefined });
      } else {
        await schoolApi.createTeacherAssignment(teacher.id, { stage, subject, notes: notes || undefined });
      }
      setSelectedIds(new Set()); setSelGrades(new Set()); setSubject(""); setNotes("");
      refetch(); onDone();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await schoolApi.deleteTeacherAssignment(id);
    refetch(); onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">إسناد حصة انتظار</h2>
            <p className="text-xs text-gray-500 mt-0.5">{teacher.fullName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto">

          {/* نوع الارتباط */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">نوع الارتباط</label>
            <div className="grid grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setScope(opt.value); setSelectedIds(new Set()); setSelGrades(new Set()); }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-right transition-all ${
                    scope === opt.value
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
                  }`}
                >
                  <p className="font-bold">{opt.label}</p>
                  <p className={`text-[10px] mt-0.5 ${scope === opt.value ? "text-emerald-100" : "text-gray-400"}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* المادة الدراسية */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">المادة الدراسية</label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
            >
              <option value="">اختر المادة...</option>
              {subjectsList.map((s: any) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* النطاق حسب النوع */}
          {scope === "class" && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                الفصول الدراسية
                {selectedIds.size > 0 && <span className="mr-1.5 text-emerald-600">{selectedIds.size} محدد</span>}
              </label>
              {classRooms.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-xl">لا توجد فصول</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {[...byGrade.entries()].map(([grade, rooms]) => (
                    <div key={grade}>
                      <p className="text-[10px] font-black text-gray-500 mb-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        {grade}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rooms.map((cr: any) => {
                          const on = selectedIds.has(cr.id);
                          return (
                            <label key={cr.id} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none ${
                              on ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                            }`}>
                              <input type="checkbox" checked={on} onChange={() => toggleClass(cr.id)} className="sr-only" />
                              فصل {cr.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {scope === "grade" && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                الصفوف الدراسية
                {selGrades.size > 0 && <span className="mr-1.5 text-emerald-600">{selGrades.size} محدد</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {grades.map(g => {
                  const on = selGrades.has(g);
                  return (
                    <label key={g} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none ${
                      on ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                    }`}>
                      <input type="checkbox" checked={on} onChange={() => toggleGrade(g)} className="sr-only" />
                      {g}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {scope === "stage" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-emerald-800">المرحلة الدراسية</p>
              <p className="text-sm font-black text-emerald-700 mt-0.5">{stage === "متوسط" ? "المرحلة المتوسطة" : stage === "ابتدائي" ? "المرحلة الابتدائية" : "المرحلة الثانوية"}</p>
              <p className="text-[11px] text-emerald-600 mt-1">سيُطبَّق على جميع فصول ومراحل المدرسة</p>
            </div>
          )}

          {/* ملاحظات */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span></label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظة إضافية"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* إسنادات قائمة */}
          {existing.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">حصص الانتظار المسندة</p>
              <div className="space-y-1.5">
                {existing.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <span className="shrink-0 font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                        {a.classRoomGrade ? `${a.classRoomGrade} - فصل ${a.classRoomName}` : a.grade ? `صف: ${a.grade}` : `مرحلة: ${a.stage ?? "—"}`}
                      </span>
                      <span className="text-gray-600 truncate">{a.subject}</span>
                    </div>
                    <button onClick={() => handleDelete(a.id)} className="p-1 mr-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex gap-2">
          <button
            onClick={handleAdd}
            disabled={saving || !canSubmit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            إسناد
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────
interface Teacher {
  id: string;
  fullName: string;
  employeeNumber?: string | null;
  subject?: string | null;
  phone?: string | null;
  email?: string | null;
  nationalId?: string | null;
  gender?: "ذكر" | "أنثى" | null;
  qualification?: string | null;
  notes?: string | null;
  isActive: boolean;
}

const EMPTY_FORM = {
  fullName: "",
  employeeNumber: "",
  subject: "",
  phone: "",
  email: "",
  nationalId: "",
  gender: "" as "" | "ذكر" | "أنثى",
  qualification: "",
  notes: "",
  isActive: true,
};

type FormState = typeof EMPTY_FORM;

// ── Page ──────────────────────────────────────────────────
export function SchoolTeachersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => schoolApi.listTeachers(),
    []
  );
  const refresh = refetch;

  const { data: setupData } = useApi(() => schoolApi.getSetupStatus(), []);
  const schoolStage: string = setupData?.data?.stage ?? "متوسط";
  const { data: gradesData } = useApi(() => schoolApi.getSetupGrades(schoolStage), [schoolStage]);
  const subjectOptions: string[] = gradesData?.data?.subjects ?? [];

  const teachers: Teacher[] = (data as any)?.data ?? [];

  const filtered = teachers.filter((t) => {
    const matchesSearch =
      !search ||
      t.fullName.includes(search) ||
      t.subject?.includes(search) ||
      t.employeeNumber?.includes(search);
    const matchesActive =
      activeFilter === "all" ||
      (activeFilter === "active" && t.isActive) ||
      (activeFilter === "inactive" && !t.isActive);
    return matchesSearch && matchesActive;
  });

  const openNew = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (t: Teacher) => {
    setEditTarget(t);
    setForm({
      fullName: t.fullName,
      employeeNumber: t.employeeNumber ?? "",
      subject: t.subject ?? "",
      phone: t.phone ?? "",
      email: t.email ?? "",
      nationalId: t.nationalId ?? "",
      gender: (t.gender as "" | "ذكر" | "أنثى") ?? "",
      qualification: t.qualification ?? "",
      notes: t.notes ?? "",
      isActive: t.isActive,
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setFormError("");
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) { setFormError("اسم المعلم مطلوب"); return; }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        fullName: form.fullName.trim(),
        employeeNumber: form.employeeNumber || null,
        subject: form.subject || null,
        phone: form.phone || null,
        email: form.email || null,
        nationalId: form.nationalId || null,
        gender: form.gender || null,
        qualification: form.qualification || null,
        notes: form.notes || null,
        isActive: form.isActive,
      };
      if (editTarget) {
        await schoolApi.updateTeacher(editTarget.id, payload);
      } else {
        await schoolApi.createTeacher(payload);
      }
      closeForm();
      refresh();
    } catch (err: any) {
      setFormError(err.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Teacher) => {
    if (!confirm(`حذف المعلم "${t.fullName}"؟`)) return;
    setDeleting(t.id);
    try {
      await schoolApi.deleteTeacher(t.id);
      refresh();
    } catch {}
    finally { setDeleting(null); }
  };

  const set = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // ── Stats ────────────────────────────────────────────────
  const total  = teachers.length;
  const active = teachers.filter((t) => t.isActive).length;

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Header banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 p-6 text-white">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">المعلمون</h1>
            <p className="text-sm text-gray-400 mt-0.5">إدارة هيئة التدريس وبياناتهم</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/40"
          >
            <Plus className="w-4 h-4" />
            إضافة معلم
          </button>
        </div>
        {/* KPI strip */}
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">إجمالي المعلمين</p>
            <p className="text-2xl font-black mt-0.5">{total}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400">نشطون</p>
            <p className="text-2xl font-black mt-0.5 text-emerald-400">{active}</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث باسم المعلم أو المادة أو الرقم الوظيفي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "all" ? "الكل" : f === "active" ? "نشط" : "غير نشط"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <X className="w-4 h-4 shrink-0" />
          {(error as any)?.message ?? "حدث خطأ في تحميل البيانات"}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="font-semibold text-gray-700">
            {search ? "لا توجد نتائج" : "لا يوجد معلمون بعد"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? "جرّب كلمة بحث أخرى" : "أضف أول معلم الآن"}
          </p>
          {!search && (
            <button
              onClick={openNew}
              className="mt-4 flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة معلم
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black text-base shrink-0">
                    {t.fullName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">{t.fullName}</p>
                    {t.subject && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">{t.subject}</p>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.isActive
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}>
                  {t.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500">
                {t.employeeNumber && (
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span>رقم وظيفي: {t.employeeNumber}</span>
                  </div>
                )}
                {t.phone && (
                  <div className="flex items-center gap-2" dir="ltr">
                    <span className="text-gray-300 font-bold">☎</span>
                    <span>{t.phone}</span>
                  </div>
                )}
                {t.gender && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">●</span>
                    <span>{t.gender}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setAssigningTeacher(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 py-1.5 rounded-lg transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  الفصول
                </button>
                <button
                  onClick={() => navigate(`/school/teachers/${t.id}/schedule`)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 py-1.5 rounded-lg transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  الجدول
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 py-1.5 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  disabled={deleting === t.id}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PageFAQ pageId="teachers" />

      {/* ── Assignment Modal ── */}
      {assigningTeacher && (
        <TeacherAssignModal
          teacher={assigningTeacher}
          onClose={() => setAssigningTeacher(null)}
          onDone={() => {}}
        />
      )}

      {/* ── Form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={closeForm}>
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden modal-content-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900">
                {editTarget ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}
              </h2>
              <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* الاسم */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    الاسم الكامل <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="أحمد محمد العتيبي"
                    autoFocus
                  />
                </div>

                {/* الرقم الوظيفي */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">الرقم الوظيفي</label>
                  <input
                    type="text"
                    value={form.employeeNumber}
                    onChange={(e) => set("employeeNumber", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="EMP-001"
                    dir="ltr"
                  />
                </div>

                {/* المادة */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">المادة</label>
                  {subjectOptions.length > 0 ? (
                    <>
                      <select
                        value={subjectOptions.includes(form.subject) ? form.subject : (form.subject ? "__other__" : "")}
                        onChange={(e) => {
                          if (e.target.value === "__other__") {
                            set("subject", "");
                          } else {
                            set("subject", e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors bg-white"
                      >
                        <option value="">اختر المادة...</option>
                        {subjectOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        <option value="__other__">أخرى...</option>
                      </select>
                      {!subjectOptions.includes(form.subject) && (
                        <input
                          type="text"
                          value={form.subject}
                          onChange={(e) => set("subject", e.target.value)}
                          className="mt-1.5 w-full px-3 py-2.5 text-sm border border-emerald-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                          placeholder="اكتب اسم المادة"
                          autoFocus={!subjectOptions.includes(form.subject) && form.subject === ""}
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                      placeholder="الرياضيات"
                    />
                  )}
                </div>

                {/* الجنس */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">الجنس</label>
                  <select
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors bg-white"
                  >
                    <option value="">اختر...</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                {/* المؤهل */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">المؤهل العلمي</label>
                  <input
                    type="text"
                    value={form.qualification}
                    onChange={(e) => set("qualification", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="بكالوريوس تربية"
                  />
                </div>

                {/* الجوال */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">الجوال</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="05XXXXXXXX"
                  />
                </div>

                {/* الإيميل */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="teacher@school.edu.sa"
                  />
                </div>

                {/* رقم الهوية */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">رقم الهوية</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.nationalId}
                    onChange={(e) => set("nationalId", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                    placeholder="1XXXXXXXXX"
                  />
                </div>

                {/* ملاحظات */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors resize-none"
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>

                {/* نشط */}
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => set("isActive", e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                    />
                    <span className="text-sm font-medium text-gray-700">معلم نشط</span>
                  </label>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
              <button
                onClick={closeForm}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {editTarget ? "حفظ التعديلات" : "إضافة المعلم"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
