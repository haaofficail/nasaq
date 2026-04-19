import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight, Save, Loader2, Search, X, CheckCircle2,
  AlertCircle, Users, BarChart3, UserX,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

const QUALITATIVE_OPTIONS = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"];
const LETTER_OPTIONS = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];

export function SchoolGradesEntryPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [classRoomId, setClassRoomId] = useState("");
  const [grades, setGrades] = useState<Record<string, { score: string; isAbsent: boolean; isExempt: boolean; notes: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  const { data: typesData } = useApi(
    () => schoolApi.listAssessmentTypes(),
    []
  );
  const { data: classesData } = useApi(
    () => schoolApi.listClassRooms(),
    []
  );
  const { data: reportData, loading: reportLoading, refetch: refetchReport } = useApi(
    () => (classRoomId && assessmentId)
      ? schoolApi.getClassAssessmentReport(classRoomId, assessmentId)
      : Promise.resolve(null),
    [classRoomId, assessmentId]
  );

  const assessmentTypes: any[] = (typesData as any)?.data ?? [];
  const classRooms: any[] = (classesData as any)?.data ?? [];
  const report = reportData as any;
  const students: any[] = report?.data ?? [];
  const stats = report?.stats ?? null;

  const assessment = assessmentTypes.find(t => t.id === assessmentId);
  const gradeScale = assessment?.gradeScale ?? "numeric";
  const maxScore   = parseFloat(assessment?.maxScore ?? "100");

  // Initialize grades from existing data
  useEffect(() => {
    if (!students.length) return;
    const init: typeof grades = {};
    for (const s of students) {
      init[s.id] = {
        score:    s.grade?.score !== null ? String(parseFloat(s.grade?.score ?? "")) : "",
        isAbsent: s.grade?.isAbsent ?? false,
        isExempt: s.grade?.isExempt ?? false,
        notes:    s.grade?.notes ?? "",
      };
    }
    setGrades(init);
    setSaved(false);
  }, [report]);

  const setField = (studentId: string, field: keyof (typeof grades)[string], value: any) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { score: "", isAbsent: false, isExempt: false, notes: "" }), [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!assessmentId || !students.length) return;
    setSaving(true); setMsg("");
    try {
      const gradesList = students.map(s => {
        const g = grades[s.id] ?? { score: "", isAbsent: false, isExempt: false, notes: "" };
        return {
          studentId: s.id,
          score:     gradeScale === "numeric" && g.score !== "" ? Number(g.score) : null,
          letterGrade:      gradeScale === "letter" ? g.score || null : null,
          qualitativeGrade: gradeScale === "qualitative" ? g.score || null : null,
          isAbsent: g.isAbsent,
          isExempt: g.isExempt,
          notes:    g.notes || null,
        };
      });
      await schoolApi.bulkSaveGrades({ assessmentTypeId: assessmentId, grades: gradesList });
      setSaved(true);
      setMsg("تم حفظ الدرجات بنجاح");
      refetchReport();
    } catch (e: any) {
      setMsg(e?.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const displayed = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s => s.fullName?.toLowerCase().includes(q) || s.studentNumber?.includes(q));
  }, [students, search]);

  const entered = students.filter(s => {
    const g = grades[s.id];
    return g && (g.score !== "" || g.isAbsent || g.isExempt);
  });

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/school/assessments")}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">رصد الدرجات</h1>
          {assessment && (
            <p className="text-sm text-gray-500 mt-0.5">{assessment.name} — الدرجة الكاملة: {maxScore}</p>
          )}
        </div>
        {classRoomId && students.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الدرجات
          </button>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${msg.includes("خطأ") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {msg.includes("خطأ") ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {msg}
        </div>
      )}

      {/* Classroom selector */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">الفصل الدراسي</label>
        <select
          value={classRoomId}
          onChange={e => setClassRoomId(e.target.value)}
          className="w-full px-3 py-2 border border-[#eef2f6] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">اختر الفصل</option>
          {classRooms.map((cr: any) => (
            <option key={cr.id} value={cr.id}>{cr.grade} / فصل {cr.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {stats && students.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "إجمالي الطلاب", value: stats.total,   cls: "bg-brand-50 text-brand-600" },
            { label: "تم الرصد",      value: entered.length, cls: "bg-emerald-50 text-emerald-600" },
            { label: "غائب",          value: students.filter(s => grades[s.id]?.isAbsent).length, cls: "bg-red-50 text-red-600" },
            { label: "متوسط الدرجات", value: stats.avg ?? "—", cls: "bg-amber-50 text-amber-600" },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`${cls.split(" ")[0]} border ${cls.split(" ")[0].replace("bg-", "border-").replace("-50", "-100")} rounded-2xl p-3 text-center`}>
              <p className={`text-xl font-bold tabular-nums ${cls.split(" ")[1]}`}>{value}</p>
              <p className={`text-xs ${cls.split(" ")[1]} opacity-80 mt-0.5`}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {students.length > 0 && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            className="w-full pr-9 pl-9 py-2.5 border border-[#eef2f6] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Student grades list */}
      {!classRoomId ? (
        <div className="bg-white rounded-2xl border border-[#eef2f6] py-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Users className="w-7 h-7 text-brand-400" />
          </div>
          <p className="text-sm font-semibold text-gray-600">اختر الفصل لبدء رصد الدرجات</p>
        </div>
      ) : reportLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-[#f1f5f9] rounded-2xl animate-pulse" />)}
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#eef2f6] py-12 text-center">
          <p className="text-sm text-gray-400">لا يوجد طلاب في هذا الفصل</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((s: any, idx: number) => {
            const g = grades[s.id] ?? { score: "", isAbsent: false, isExempt: false, notes: "" };
            const hasValue = g.score !== "" || g.isAbsent || g.isExempt;
            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border shadow-sm p-3 flex items-center gap-3 transition-colors ${
                  g.isAbsent ? "border-red-100" : g.isExempt ? "border-blue-100" : hasValue ? "border-emerald-100" : "border-[#eef2f6]"
                }`}
              >
                <span className="text-xs text-gray-300 font-bold w-6 text-center shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{s.fullName}</p>
                  <p className="text-[11px] text-gray-400 tabular-nums">{s.studentNumber || ""}</p>
                </div>

                {/* Grade input based on scale */}
                <div className="flex items-center gap-2 shrink-0">
                  {gradeScale === "numeric" && (
                    <input
                      type="number"
                      min={0}
                      max={maxScore}
                      step={0.5}
                      value={g.score}
                      onChange={e => setField(s.id, "score", e.target.value)}
                      disabled={g.isAbsent || g.isExempt}
                      placeholder={String(maxScore)}
                      className="w-20 px-2.5 py-1.5 border border-[#eef2f6] rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50 disabled:text-gray-400 tabular-nums"
                    />
                  )}
                  {gradeScale === "letter" && (
                    <select
                      value={g.score}
                      onChange={e => setField(s.id, "score", e.target.value)}
                      disabled={g.isAbsent || g.isExempt}
                      className="w-20 px-2 py-1.5 border border-[#eef2f6] rounded-xl text-sm bg-white focus:outline-none disabled:bg-gray-50"
                    >
                      <option value="">—</option>
                      {LETTER_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  )}
                  {gradeScale === "qualitative" && (
                    <select
                      value={g.score}
                      onChange={e => setField(s.id, "score", e.target.value)}
                      disabled={g.isAbsent || g.isExempt}
                      className="w-28 px-2 py-1.5 border border-[#eef2f6] rounded-xl text-sm bg-white focus:outline-none disabled:bg-gray-50"
                    >
                      <option value="">—</option>
                      {QUALITATIVE_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  )}

                  <button
                    onClick={() => setField(s.id, "isAbsent", !g.isAbsent)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      g.isAbsent
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "border-[#eef2f6] text-gray-400 hover:border-red-200 hover:text-red-500"
                    }`}
                    title="غائب"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">غائب</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Sticky save button */}
          <div className="sticky bottom-4 flex justify-center pt-2">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg transition-all ${
                saved
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? "جاري الحفظ..." : saved ? "تم الحفظ" : `حفظ درجات ${students.length} طالب`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
