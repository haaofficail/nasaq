import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight, GraduationCap, Phone, User, IdCard, Calendar,
  AlertTriangle, FileText, ArrowLeftRight, CheckCircle2, XCircle,
  Clock, BookOpen, Loader2, MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { fmtHijri } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  present:  { label: "حاضر",    cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  absent:   { label: "غائب",    cls: "bg-red-50 text-red-700 border-red-100" },
  late:     { label: "متأخر",   cls: "bg-amber-50 text-amber-700 border-amber-100" },
  excused:  { label: "مستأذن",  cls: "bg-blue-50 text-blue-700 border-blue-100" },
};

const CASE_STATUS_LABELS: Record<string, string> = {
  open:        "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved:    "محلولة",
  closed:      "مغلقة",
};

const VIOLATION_STATUS_LABELS: Record<string, string> = {
  pending:    "معلقة",
  reviewed:   "تمت المراجعة",
  resolved:   "محلولة",
  dismissed:  "مرفوضة",
};

const NOTE_TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  positive:   { label: "إيجابية",  cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  behavioral: { label: "سلوكية",   cls: "bg-amber-50 text-amber-700 border-amber-100" },
  academic:   { label: "أكاديمية", cls: "bg-blue-50 text-blue-700 border-blue-100" },
  general:    { label: "عامة",     cls: "bg-gray-50 text-gray-600 border-gray-200" },
  followup:   { label: "متابعة",   cls: "bg-violet-50 text-violet-700 border-violet-100" },
};

export function SchoolStudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate      = useNavigate();
  const [showAllAttendance, setShowAllAttendance] = useState(false);

  const { data, loading, error } = useApi(
    () => schoolApi.getStudent(studentId!),
    [studentId]
  );
  const { data: attendanceData } = useApi(
    () => schoolApi.getStudentAttendance(studentId!),
    [studentId]
  );
  const { data: notesData } = useApi(
    () => schoolApi.getTeacherStudentNotes({ studentId: studentId! }),
    [studentId]
  );

  const student    = (data as any)?.data;
  const attendance: any[] = (attendanceData as any)?.data ?? [];
  const notes: any[] = (notesData as any)?.data ?? [];

  if (loading) {
    return (
      <div dir="rtl" className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div dir="rtl" className="p-6">
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
          <p className="text-red-500 text-sm">{error ?? "الطالب غير موجود"}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline">
            العودة
          </button>
        </div>
      </div>
    );
  }

  const initials   = student.fullName?.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("") ?? "؟";
  const transfers: any[]  = student.transfers  ?? [];
  const violations: any[] = student.violations ?? [];
  const cases: any[]      = student.cases      ?? [];
  const summaryArr: any[] = student.attendanceSummary ?? [];

  const summaryMap: Record<string, number> = {};
  for (const a of summaryArr) summaryMap[a.status] = a.cnt;

  const displayedAttendance = showAllAttendance ? attendance : attendance.slice(0, 10);

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/school/students")}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{student.fullName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">ملف الطالب الكامل</p>
        </div>
      </div>

      {/* Student info card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 font-medium">الصف / الفصل</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">
                {student.classRoomGrade
                  ? `${student.classRoomGrade} / فصل ${student.classRoomName}`
                  : <span className="text-amber-600">غير مسند</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">رقم الهوية</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5 tabular-nums">{student.nationalId || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">رقم الطالب</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5 tabular-nums">{student.studentNumber || "—"}</p>
            </div>
            {student.guardianName && (
              <div>
                <p className="text-xs text-gray-400 font-medium">ولي الأمر</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{student.guardianName}</p>
              </div>
            )}
            {student.guardianPhone && (
              <div>
                <p className="text-xs text-gray-400 font-medium">الجوال</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 tabular-nums">{student.guardianPhone}</p>
              </div>
            )}
            {student.guardianRelation && (
              <div>
                <p className="text-xs text-gray-400 font-medium">صلة القرابة</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{student.guardianRelation}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance summary (last 30 days) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "present", label: "حاضر",   icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
          { key: "absent",  label: "غائب",   icon: XCircle,      bg: "bg-red-50",     text: "text-red-700",     border: "border-red-100" },
          { key: "late",    label: "متأخر",  icon: Clock,        bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100" },
          { key: "excused", label: "مستأذن", icon: BookOpen,     bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
        ].map(({ key, label, icon: Icon, bg, text, border }) => (
          <div key={key} className={`${bg} border ${border} rounded-2xl p-4`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${text}`} />
              <p className={`text-xs font-medium ${text}`}>{label}</p>
            </div>
            <p className={`text-2xl font-bold ${text} mt-1`}>{summaryMap[key] ?? 0}</p>
            <p className={`text-[10px] ${text} opacity-70`}>آخر 30 يوم</p>
          </div>
        ))}
      </div>

      {/* Full attendance history */}
      {attendance.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-bold text-gray-900">سجل الحضور</h2>
            </div>
            <span className="text-xs text-gray-400">{attendance.length} يوم</span>
          </div>
          <div className="divide-y divide-gray-50">
            {displayedAttendance.map((a: any) => {
              const s = STATUS_LABELS[a.status] ?? { label: a.status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
              return (
                <div key={a.id ?? a.attendanceDate} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm text-gray-700 tabular-nums">{a.attendanceDate}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${s.cls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
          {attendance.length > 10 && (
            <button
              onClick={() => setShowAllAttendance(p => !p)}
              className="w-full py-3 text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center justify-center gap-1 border-t border-gray-50"
            >
              {showAllAttendance ? (
                <><ChevronUp className="w-3.5 h-3.5" /> عرض أقل</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> عرض جميع السجلات ({attendance.length})</>
              )}
            </button>
          )}
        </section>
      )}

      {/* Teacher notes about this student */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-bold text-gray-900">ملاحظات المعلمين</h2>
          </div>
          {notes.length > 0 && (
            <span className="text-xs text-gray-400">{notes.length} ملاحظة</span>
          )}
        </div>
        {notes.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">لا توجد ملاحظات</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notes.slice(0, 20).map((n: any) => {
              const nt = NOTE_TYPE_LABELS[n.noteType] ?? { label: n.noteType, cls: "bg-gray-50 text-gray-600 border-gray-200" };
              return (
                <div key={n.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs text-gray-400 tabular-nums">{n.noteDate}</span>
                    <span className={`px-1.5 py-0.5 rounded-lg text-[10px] border ${nt.cls}`}>{nt.label}</span>
                    {n.requiresFollowUp && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[10px] bg-red-50 text-red-600 border border-red-100">متابعة مطلوبة</span>
                    )}
                    {n.isPrivate && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[10px] bg-gray-100 text-gray-500 border border-gray-200">خاصة</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{n.note}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Violations */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-gray-900">المخالفات</span>
            </div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {violations.length}
            </span>
          </div>
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {violations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">لا توجد مخالفات</p>
            ) : violations.map((v: any) => (
              <div key={v.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: v.categoryColor ?? "#6b7280" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{v.categoryName ?? "مخالفة"}</p>
                  <p className="text-[11px] text-gray-500 truncate">{v.description}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{v.violationDate}</p>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
                  v.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                }`}>
                  {VIOLATION_STATUS_LABELS[v.status] ?? v.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cases */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-gray-900">الحالات</span>
            </div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {cases.length}
            </span>
          </div>
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {cases.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">لا توجد حالات</p>
            ) : cases.map((cs: any) => (
              <div key={cs.id} className="p-2 rounded-xl hover:bg-gray-50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800 truncate flex-1">{cs.title}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
                    cs.status === "resolved" || cs.status === "closed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {CASE_STATUS_LABELS[cs.status] ?? cs.status}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{cs.category}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer history */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-bold text-gray-900">سجل النقل</span>
            </div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {transfers.length}
            </span>
          </div>
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {transfers.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">لا توجد تنقلات</p>
            ) : transfers.map((t: any) => (
              <div key={t.id} className="p-2 rounded-xl hover:bg-gray-50">
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <span className="bg-gray-100 rounded-lg px-1.5 py-0.5 font-medium">
                    {t.fromGrade ? `${t.fromGrade} / ${t.fromName}` : "بدون فصل"}
                  </span>
                  <ArrowLeftRight className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="bg-emerald-50 text-emerald-700 rounded-lg px-1.5 py-0.5 font-medium">
                    {t.toGrade} / {t.toName}
                  </span>
                </div>
                {t.reason && <p className="text-[11px] text-gray-500 mt-1 truncate">{t.reason}</p>}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {fmtHijri(t.transferredAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
