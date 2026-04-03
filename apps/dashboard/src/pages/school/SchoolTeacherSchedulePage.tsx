import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight, Plus, Trash2, Loader2, BookOpen, Calendar,
  Building2, GraduationCap, LayoutGrid,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";

// ── Constants ────────────────────────────────────────────────

const DAYS = [
  { key: "sun", label: "الأحد" },
  { key: "mon", label: "الاثنين" },
  { key: "tue", label: "الثلاثاء" },
  { key: "wed", label: "الأربعاء" },
  { key: "thu", label: "الخميس" },
] as const;

const STAGES = [
  "المرحلة الابتدائية",
  "المرحلة المتوسطة",
  "المرحلة الثانوية",
];

const GRADES = [
  "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي",
  "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
  "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط",
  "الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي",
];

type ScopeType = "classroom" | "grade" | "stage";

const SCOPE_OPTIONS: { key: ScopeType; label: string; icon: typeof BookOpen }[] = [
  { key: "classroom", label: "فصل محدد", icon: LayoutGrid },
  { key: "grade",     label: "صف كامل",  icon: GraduationCap },
  { key: "stage",     label: "مرحلة كاملة", icon: Building2 },
];

const emptyForm = {
  scopeType: "classroom" as ScopeType,
  classRoomId: "",
  grade: "",
  stage: "",
  subject: "",
  notes: "",
};

// ── Helpers ──────────────────────────────────────────────────

function scopeLabel(a: any): string {
  if (a.classRoomId) return `${a.classRoomGrade ?? ""} / ${a.classRoomName ?? ""}`;
  if (a.grade)       return `صف: ${a.grade}`;
  if (a.stage)       return `مرحلة: ${a.stage}`;
  return "—";
}

// ── Schedule Grid ─────────────────────────────────────────────

function ScheduleGrid({ entries }: { entries: any[] }) {
  // Build period list
  const periodsMap = new Map<string, any>();
  entries.forEach((e) => {
    if (!e.isBreak) periodsMap.set(e.periodId, e);
  });
  const periods = [...periodsMap.values()].sort(
    (a, b) => a.periodNumber - b.periodNumber
  );

  if (periods.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
        <Calendar className="w-8 h-8" />
        <p className="text-sm">لا يوجد جدول مسجّل لهذا المعلم في الأسبوع النشط</p>
      </div>
    );
  }

  // entries indexed by periodId+day
  const entryMap = new Map<string, any>();
  entries.forEach((e) => {
    entryMap.set(`${e.periodId}-${e.dayOfWeek}`, e);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 rounded-tl-xl border-b border-gray-100 w-28">
              الحصة
            </th>
            {DAYS.map((d) => (
              <th
                key={d.key}
                className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 text-center"
              >
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.periodId} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-3 py-2 text-right">
                <p className="text-xs font-semibold text-gray-700">
                  {p.label ?? `الحصة ${p.periodNumber}`}
                </p>
                <p className="text-[10px] text-gray-400">
                  {p.startTime} – {p.endTime}
                </p>
              </td>
              {DAYS.map((d) => {
                const entry = entryMap.get(`${p.periodId}-${d.key}`);
                return (
                  <td key={d.key} className="px-2 py-2 text-center">
                    {entry ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2 py-1.5 text-right space-y-0.5">
                        <p className="text-xs font-semibold text-emerald-800">
                          {entry.subject}
                        </p>
                        <p className="text-[10px] text-emerald-600">
                          {entry.classGrade} / {entry.className}
                        </p>
                      </div>
                    ) : (
                      <div className="h-10 rounded-xl bg-gray-50 border border-dashed border-gray-100" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export function SchoolTeacherSchedulePage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();

  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: assignData, loading, error, refetch } = useApi(
    () => schoolApi.getTeacherAssignments(teacherId!),
    [teacherId]
  );

  const { data: classRoomsData } = useApi(() => schoolApi.listClassRooms(), []);
  const { data: subjectsData }   = useApi(() => schoolApi.listSubjects(), []);

  const teacher    = assignData?.data?.teacher ?? null;
  const assignments: any[] = assignData?.data?.assignments ?? [];
  const classRooms: any[]  = classRoomsData?.data ?? [];
  const subjectOptions: string[] = (subjectsData as any)?.data?.map((s: any) => s.name) ?? [];

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      const payload: any = { subject: form.subject, notes: form.notes || null };
      if (form.scopeType === "classroom") payload.classRoomId = form.classRoomId || null;
      else if (form.scopeType === "grade")  payload.grade = form.grade || null;
      else if (form.scopeType === "stage")  payload.stage = form.stage || null;

      await schoolApi.createTeacherAssignment(teacherId!, payload);
      setAddModal(false);
      setForm({ ...emptyForm });
      refetch();
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الارتباط؟")) return;
    setDeleting(id);
    try {
      await schoolApi.deleteTeacherAssignment(id);
      refetch();
    } catch {}
    finally { setDeleting(null); }
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/school/teachers")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        العودة إلى قائمة المعلمين
      </button>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : !teacher ? (
        <div className="text-center py-12 text-gray-400">المعلم غير موجود</div>
      ) : (
        <>
          {/* Teacher header */}
          <div className="bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black">{teacher.fullName}</h1>
                <p className="text-sm text-emerald-300 mt-0.5">
                  {teacher.subject ?? "—"} · {teacher.employeeNumber ?? "بدون رقم وظيفي"}
                </p>
                <div className="flex gap-2 mt-3">
                  <span
                    className={clsx(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      teacher.isActive
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                    )}
                  >
                    {teacher.isActive ? "نشط" : "غير نشط"}
                  </span>
                  {teacher.gender && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                      {teacher.gender}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assignments section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">ارتباطات التدريس</h2>
                <p className="text-xs text-gray-500">الفصول والصفوف والمراحل المسندة لهذا المعلم</p>
              </div>
              <button
                onClick={() => setAddModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة ارتباط
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 flex flex-col items-center gap-2 text-gray-400">
                <BookOpen className="w-8 h-8" />
                <p className="text-sm">لا يوجد ارتباط مضاف بعد</p>
                <button
                  onClick={() => setAddModal(true)}
                  className="mt-1 text-xs text-emerald-600 hover:underline"
                >
                  إضافة ارتباط جديد
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs">
                      <th className="text-right px-4 py-3 font-medium">النطاق</th>
                      <th className="text-right px-4 py-3 font-medium">المادة</th>
                      <th className="text-right px-4 py-3 font-medium">ملاحظات</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {assignments.map((a: any) => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {a.classRoomId ? (
                              <LayoutGrid className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : a.grade ? (
                              <GraduationCap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            )}
                            <span className="font-medium text-gray-800">{scopeLabel(a)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{a.subject}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{a.notes ?? "—"}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deleting === a.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            {deleting === a.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>
      )}

      {/* Add Assignment Modal */}
      <Modal
        open={addModal}
        onClose={() => { setAddModal(false); setForm({ ...emptyForm }); }}
        title="إضافة ارتباط تدريسي"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setAddModal(false); setForm({ ...emptyForm }); }}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleAdd}
              disabled={submitting || !form.subject || (
                form.scopeType === "classroom" ? !form.classRoomId :
                form.scopeType === "grade"     ? !form.grade :
                !form.stage
              )}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "جاري الحفظ..." : "إضافة"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Scope type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع الارتباط</label>
            <div className="grid grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setForm((f) => ({ ...f, scopeType: opt.key, classRoomId: "", grade: "", stage: "" }))}
                    className={clsx(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all",
                      form.scopeType === opt.key
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope value */}
          {form.scopeType === "classroom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفصل</label>
              <select
                value={form.classRoomId}
                onChange={(e) => setForm((f) => ({ ...f, classRoomId: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">اختر الفصل</option>
                {classRooms.map((cr: any) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.grade} / {cr.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.scopeType === "grade" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الصف الدراسي</label>
              <select
                value={form.grade}
                onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">اختر الصف</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          {form.scopeType === "stage" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المرحلة الدراسية</label>
              <select
                value={form.stage}
                onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">اختر المرحلة</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المادة الدراسية</label>
            {subjectOptions.length > 0 ? (
              <select
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">اختر المادة...</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="مثال: رياضيات، عربي، علوم"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="ملاحظة إضافية"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
