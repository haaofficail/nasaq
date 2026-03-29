import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, ClipboardList, AlertTriangle, MessageSquare,
  Clock, CheckCircle2, Circle, ChevronLeft,
  Bell, User, Loader2, X, Check, Users,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

type DashboardData = {
  teacher: { id: string; fullName: string; subject: string | null };
  today: { date: string; dayCode: string; dayLabel: string };
  currentStatus: {
    status: string;
    current: { periodNumber: number; label: string | null; startTime: string; endTime: string; minutesRemaining: number } | null;
    next:    { periodNumber: number; label: string | null; startTime: string; minutesUntil: number } | null;
  };
  todayEntries: Array<{
    id: string; periodId: string; classRoomId: string; subject: string;
    classRoomName: string | null;
    period: { periodNumber: number; label: string | null; startTime: string; endTime: string; isBreak: boolean } | null;
    isPrepared: boolean;
    isLogged: boolean | null;
    periodStatus: "upcoming" | "current" | "passed" | "break";
  }>;
  allPeriods: Array<{ periodNumber: number; label: string | null; startTime: string; endTime: string; isBreak: boolean }>;
  alerts: {
    unpreparedCount: number;
    unpreparedEntries: any[];
    unloggedCount: number;
    unloggedEntries: any[];
    violationAlerts: Array<{ studentId: string; studentName: string; count: number }>;
  };
};

// ── Quick Action Flows ─────────────────────────────────────────

type ActiveFlow =
  | { type: "preparation"; entry: DashboardData["todayEntries"][0] }
  | { type: "daily_log";   entry: DashboardData["todayEntries"][0] }
  | { type: "violation";   entry: DashboardData["todayEntries"][0] | null }
  | { type: "note";        entry: DashboardData["todayEntries"][0] | null };

// ── Preparation Form ──────────────────────────────────────────

function PreparationSheet({
  entry,
  weekId,
  dayCode,
  onClose,
  onSaved,
}: {
  entry: DashboardData["todayEntries"][0];
  weekId: string | null;
  dayCode: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    preparationText: "",
    learningObjectives: "",
    resources: "",
    status: "ready" as "draft" | "ready" | "done",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const subjectId = (entry as any).subjectId;
    if (!weekId || !subjectId) { setError("لم يتم ربط المادة بـ subjectId — تأكد من إعداد المواد"); return; }
    setSaving(true);
    try {
      await schoolApi.upsertTeacherPreparation({
        weekId,
        periodId:    entry.periodId,
        classRoomId: entry.classRoomId,
        dayOfWeek:   dayCode,
        subjectId,
        ...form,
      });
      onSaved();
    } catch {
      setError("حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet title={`تحضير — ${entry.subject} / ${entry.classRoomName ?? ""}`} onClose={onClose}>
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <Field label="عنوان الدرس / الموضوع" value={form.preparationText}
          onChange={v => setForm(f => ({ ...f, preparationText: v }))} placeholder="مثال: الجمع والطرح" />
        <Field label="الأهداف" value={form.learningObjectives}
          onChange={v => setForm(f => ({ ...f, learningObjectives: v }))} placeholder="الهدف من الدرس" />
        <Field label="ملاحظات / مصادر" value={form.resources}
          onChange={v => setForm(f => ({ ...f, resources: v }))} placeholder="كتاب، شريحة، ..." />
        <div className="flex gap-2 pt-1">
          <button onClick={() => { setForm(f => ({ ...f, status: "draft" })); save(); }}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium active:opacity-70">
            حفظ كمسودة
          </button>
          <button onClick={() => { setForm(f => ({ ...f, status: "ready" })); save(); }}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#5b9bd5] text-white text-sm font-medium flex items-center justify-center gap-1 active:opacity-80 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            تم التحضير
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ── Daily Log Form ─────────────────────────────────────────────

function DailyLogSheet({
  entry,
  date,
  onClose,
  onSaved,
}: {
  entry: DashboardData["todayEntries"][0];
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    topicCovered: "",
    notes: "",
    studentEngagement: "normal" as "low" | "normal" | "high",
    studentsAbsent: [] as Array<{ studentId: string; name: string }>,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ENGAGEMENT_LABELS = { low: "ضعيف", normal: "متوسط", high: "ممتاز" };

  const save = async () => {
    const subjectId = (entry as any).subjectId;
    if (!subjectId) { setError("لم يتم ربط المادة — تأكد من إعداد المواد"); return; }
    if (!form.topicCovered.trim()) { setError("أدخل الموضوع المغطى"); return; }
    setSaving(true);
    try {
      await schoolApi.upsertTeacherDailyLog({
        classRoomId: entry.classRoomId,
        date,
        periodId: entry.periodId,
        subjectId,
        ...form,
      });
      onSaved();
    } catch {
      setError("حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet title={`سجل الحصة — ${entry.subject} / ${entry.classRoomName ?? ""}`} onClose={onClose}>
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <Field label="الموضوع المغطى" value={form.topicCovered}
          onChange={v => setForm(f => ({ ...f, topicCovered: v }))} placeholder="ما تم تدريسه اليوم" required />

        {/* التفاعل */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">مستوى التفاعل</p>
          <div className="flex gap-2">
            {(["low", "normal", "high"] as const).map(level => (
              <button key={level}
                onClick={() => setForm(f => ({ ...f, studentEngagement: level }))}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                  form.studentEngagement === level
                    ? "bg-[#5b9bd5] text-white border-[#5b9bd5]"
                    : "bg-white text-gray-600 border-gray-200"
                )}>
                {ENGAGEMENT_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        <Field label="ملاحظات" value={form.notes}
          onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="أي ملاحظات..." />

        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-xl bg-[#5b9bd5] text-white text-sm font-medium flex items-center justify-center gap-1 active:opacity-80 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          حفظ السجل
        </button>
      </div>
    </BottomSheet>
  );
}

// ── Violation Quick Form ───────────────────────────────────────

function ViolationSheet({
  classRoomId,
  onClose,
  onSaved,
}: {
  classRoomId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<"select_student" | "fill_form">("select_student");
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; fullName: string } | null>(null);
  const [search, setSearch] = useState("");
  const [degree, setDegree] = useState<"1" | "2" | "3">("1");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: studentsData } = useApi(
    () => classRoomId ? schoolApi.listStudents({ classRoomId, limit: "200" }) : Promise.resolve({ data: [], total: 0, page: 1, pages: 1 }),
    [classRoomId]
  );

  const filteredStudents = (studentsData?.data ?? []).filter(s =>
    !search || s.fullName.includes(search)
  );

  const DEGREE_LABELS: Record<string, string> = { "1": "خفيف", "2": "متوسط", "3": "عالي" };

  const save = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      await schoolApi.createBehaviorIncident({
        studentId: selectedStudent.id,
        degree,
        description: description || null,
        incidentDate: new Date().toISOString().split("T")[0],
      });
      onSaved();
    } catch {
      setError("حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet title="تسجيل مخالفة" onClose={onClose}>
      {step === "select_student" ? (
        <div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن طالب..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 outline-none focus:border-[#5b9bd5]"
          />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filteredStudents.map(s => (
              <button key={s.id}
                onClick={() => { setSelectedStudent(s); setStep("fill_form"); }}
                className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-blue-50 active:bg-blue-100 text-sm text-gray-800 flex items-center gap-2 transition-colors">
                <User size={14} className="text-gray-400 flex-shrink-0" />
                {s.fullName}
              </button>
            ))}
            {filteredStudents.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">لا توجد نتائج</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setStep("select_student")} className="p-1 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-800">{selectedStudent?.fullName}</span>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">درجة المخالفة</p>
            <div className="flex gap-2">
              {(["1", "2", "3"] as const).map(d => (
                <button key={d}
                  onClick={() => setDegree(d)}
                  className={clsx(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                    degree === d
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-600 border-gray-200"
                  )}>
                  {DEGREE_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
          <Field label="ملاحظة" value={description}
            onChange={v => setDescription(v)} placeholder="وصف المخالفة (اختياري)" />
          <button onClick={save} disabled={saving}
            className="w-full py-3 rounded-xl bg-orange-500 text-white text-sm font-medium flex items-center justify-center gap-1 active:opacity-80 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
            تسجيل
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

// ── Student Note Form ─────────────────────────────────────────

function StudentNoteSheet({
  classRoomId,
  onClose,
  onSaved,
}: {
  classRoomId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<"select_student" | "fill_form">("select_student");
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; fullName: string } | null>(null);
  const [search, setSearch] = useState("");
  const [noteType, setNoteType] = useState<"academic" | "behavioral" | "social" | "other">("academic");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: studentsData } = useApi(
    () => classRoomId ? schoolApi.listStudents({ classRoomId, limit: "200" }) : Promise.resolve({ data: [], total: 0, page: 1, pages: 1 }),
    [classRoomId]
  );

  const filteredStudents = (studentsData?.data ?? []).filter(s =>
    !search || s.fullName.includes(search)
  );

  const NOTE_LABELS: Record<string, string> = {
    academic: "أكاديمي", behavioral: "سلوكي", social: "اجتماعي", other: "أخرى",
  };

  const save = async () => {
    if (!selectedStudent || !classRoomId) return;
    if (!note.trim()) { setError("أدخل نص الملاحظة"); return; }
    setSaving(true);
    try {
      await schoolApi.createTeacherStudentNote({
        studentId: selectedStudent.id,
        classRoomId,
        noteType,
        note,
      });
      onSaved();
    } catch {
      setError("حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet title="ملاحظة طالب" onClose={onClose}>
      {step === "select_student" ? (
        <div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن طالب..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 outline-none focus:border-[#5b9bd5]"
          />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filteredStudents.map(s => (
              <button key={s.id}
                onClick={() => { setSelectedStudent(s); setStep("fill_form"); }}
                className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-blue-50 active:bg-blue-100 text-sm text-gray-800 flex items-center gap-2 transition-colors">
                <User size={14} className="text-gray-400 flex-shrink-0" />
                {s.fullName}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setStep("select_student")} className="p-1 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-800">{selectedStudent?.fullName}</span>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">النوع</p>
            <div className="flex flex-wrap gap-2">
              {(["academic", "behavioral", "social", "other"] as const).map(t => (
                <button key={t}
                  onClick={() => setNoteType(t)}
                  className={clsx(
                    "px-3 py-2 rounded-xl text-sm font-medium border transition-colors",
                    noteType === t
                      ? "bg-[#5b9bd5] text-white border-[#5b9bd5]"
                      : "bg-white text-gray-600 border-gray-200"
                  )}>
                  {NOTE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <Field label="الملاحظة" value={note}
            onChange={v => setNote(v)} placeholder="اكتب ملاحظتك..." required rows={3} />
          <button onClick={save} disabled={saving}
            className="w-full py-3 rounded-xl bg-[#5b9bd5] text-white text-sm font-medium flex items-center justify-center gap-1 active:opacity-80 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            حفظ الملاحظة
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

// ── Shared: BottomSheet ────────────────────────────────────────

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Shared: Field ──────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, required, rows = 1 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}{required && " *"}</label>
      {rows > 1 ? (
        <textarea
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#5b9bd5] resize-none"
        />
      ) : (
        <input
          type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#5b9bd5]"
        />
      )}
    </div>
  );
}

// ── Current Period Banner ──────────────────────────────────────

function CurrentPeriodBanner({ status, current, next }: DashboardData["currentStatus"]) {
  const STATUS_CONFIG = {
    before_school: { bg: "bg-gray-50", text: "text-gray-600", label: "لم يبدأ الدوام" },
    in_period:     { bg: "bg-blue-50",  text: "text-blue-800", label: "داخل حصة" },
    in_break:      { bg: "bg-amber-50", text: "text-amber-800", label: "استراحة" },
    after_school:  { bg: "bg-gray-50",  text: "text-gray-600", label: "انتهى الدوام" },
  };
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.before_school;

  return (
    <div className={clsx("rounded-2xl p-4", cfg.bg)}>
      <div className="flex items-center justify-between">
        <div>
          <p className={clsx("text-xs font-medium mb-0.5", cfg.text)}>{cfg.label}</p>
          {current ? (
            <p className="text-lg font-bold text-gray-900">
              الحصة {current.periodNumber} — {current.minutesRemaining} دقيقة متبقية
            </p>
          ) : next ? (
            <p className="text-base font-semibold text-gray-700">
              الحصة {next.periodNumber} تبدأ بعد {next.minutesUntil} دقيقة
            </p>
          ) : null}
        </div>
        <Clock size={28} className={clsx("opacity-40", cfg.text)} />
      </div>
    </div>
  );
}

// ── Periods List ───────────────────────────────────────────────

function PeriodRow({
  entry,
  onPrep,
  onLog,
}: {
  entry: DashboardData["todayEntries"][0];
  onPrep: () => void;
  onLog: () => void;
}) {
  const { periodStatus, period, subject, classRoomName, isPrepared, isLogged } = entry;

  const STATUS_STYLES = {
    current:  "bg-blue-50 border-blue-200",
    passed:   "bg-white border-gray-100",
    upcoming: "bg-white border-gray-100",
    break:    "bg-gray-50 border-gray-100",
  };

  return (
    <div className={clsx(
      "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all",
      STATUS_STYLES[periodStatus],
      periodStatus === "current" && "shadow-sm ring-1 ring-blue-100",
    )}>
      {/* رقم الحصة */}
      <div className={clsx(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
        periodStatus === "current"  ? "bg-[#5b9bd5] text-white" :
        periodStatus === "passed"   ? "bg-gray-200 text-gray-500" :
        "bg-gray-100 text-gray-500"
      )}>
        {period?.periodNumber ?? "-"}
      </div>

      {/* بيانات الحصة */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{subject}</p>
        <p className="text-xs text-gray-500">
          {classRoomName ?? "—"}
          {period ? ` · ${period.startTime}` : ""}
        </p>
      </div>

      {/* أيقونات الحالة */}
      <div className="flex items-center gap-1.5">
        {/* تحضير */}
        <button onClick={onPrep}
          className={clsx(
            "p-1.5 rounded-lg transition-colors",
            isPrepared
              ? "text-green-600 bg-green-50"
              : "text-gray-400 hover:text-[#5b9bd5] hover:bg-blue-50"
          )}
          title={isPrepared ? "تم التحضير" : "تحضير الحصة"}>
          <BookOpen size={16} />
        </button>

        {/* يومية (للحصص المنتهية فقط) */}
        {periodStatus === "passed" && (
          <button onClick={onLog}
            className={clsx(
              "p-1.5 rounded-lg transition-colors",
              isLogged
                ? "text-green-600 bg-green-50"
                : "text-amber-600 bg-amber-50 hover:bg-amber-100"
            )}
            title={isLogged ? "تم تسجيل اليومية" : "سجل الحصة"}>
            <ClipboardList size={16} />
          </button>
        )}

        {/* الحصة الحالية */}
        {periodStatus === "current" && (
          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">الآن</span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export function SchoolTeacherWorkPage() {
  const { data, loading, error, refetch } = useApi(() => schoolApi.getTeacherDashboard(), []);
  const dashboard = data?.data as DashboardData | null;

  const [activeFlow, setActiveFlow] = useState<ActiveFlow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-refresh every 60s to update current period
  useEffect(() => {
    const interval = setInterval(refetch, 60_000);
    return () => clearInterval(interval);
  }, [refetch]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleSaved = useCallback((msg: string) => {
    setActiveFlow(null);
    showToast(msg);
    refetch();
  }, [refetch, showToast]);

  // Get context for quick actions
  const currentEntry = (dashboard?.todayEntries ?? []).find(e => e.periodStatus === "current");
  const activeWeekId = (dashboard as any)?.activeWeekId ?? null;
  const todayDayCode = dashboard?.today?.dayCode ?? "sun";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <Loader2 className="animate-spin text-[#5b9bd5]" size={28} />
      </div>
    );
  }

  // API returns 403 for non-teachers
  if (error?.includes("403") || error?.includes("المعلم") || (data as any)?.error?.includes("للمعلمين")) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-gray-500 text-sm">هذه الصفحة مخصصة للمعلمين فقط</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-gray-500 text-sm">حدث خطأ في تحميل البيانات</p>
      </div>
    );
  }

  // مدير / وكيل — عرض مبسط (fallback)
  if (!dashboard.teacher) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-gray-500 text-sm">هذه الصفحة مخصصة للمعلمين فقط</p>
      </div>
    );
  }

  const { teacher, today, currentStatus, todayEntries = [], alerts } = dashboard;

  const defaultClassRoomId = currentEntry?.classRoomId ?? todayEntries[0]?.classRoomId ?? null;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* رأس الصفحة */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{teacher.fullName}</h1>
            <p className="text-sm text-gray-500">{today.dayLabel} · {today.date}</p>
          </div>
          <div className="text-xs text-gray-400">{teacher.subject ?? ""}</div>
        </div>

        {/* بانر الحصة الحالية */}
        <CurrentPeriodBanner {...currentStatus} />

        {/* التنبيهات */}
        {(alerts.unpreparedCount > 0 || alerts.unloggedCount > 0 || alerts.violationAlerts.length > 0) && (
          <div className="space-y-2">
            {alerts.unpreparedCount > 0 && (
              <AlertBadge
                icon={<BookOpen size={14} />}
                color="amber"
                text={`${alerts.unpreparedCount} حصة بدون تحضير`}
              />
            )}
            {alerts.unloggedCount > 0 && (
              <AlertBadge
                icon={<ClipboardList size={14} />}
                color="orange"
                text={`${alerts.unloggedCount} حصة منتهية بدون سجل`}
              />
            )}
            {alerts.violationAlerts.map(v => (
              <AlertBadge
                key={v.studentId}
                icon={<AlertTriangle size={14} />}
                color="red"
                text={`${v.studentName} · ${v.count} مخالفات هذا الأسبوع`}
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={<BookOpen size={20} />}
            label="تحضير الحصة"
            color="blue"
            onClick={() => { const e = currentEntry ?? todayEntries[0]; if (e) setActiveFlow({ type: "preparation", entry: e }); }}
            disabled={!currentEntry && todayEntries.length === 0}
          />
          <QuickAction
            icon={<ClipboardList size={20} />}
            label="سجل الحصة"
            color="green"
            onClick={() => {
              const lastPassed = [...todayEntries].reverse().find(e => e.periodStatus === "passed");
              const target = lastPassed ?? todayEntries[0];
              if (target) setActiveFlow({ type: "daily_log", entry: target });
            }}
            disabled={todayEntries.length === 0}
          />
          <QuickAction
            icon={<AlertTriangle size={20} />}
            label="تسجيل مخالفة"
            color="orange"
            onClick={() => setActiveFlow({ type: "violation", entry: currentEntry ?? null })}
          />
          <QuickAction
            icon={<MessageSquare size={20} />}
            label="ملاحظة طالب"
            color="purple"
            onClick={() => setActiveFlow({ type: "note", entry: currentEntry ?? null })}
          />
        </div>

        {/* حصص اليوم */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">حصص اليوم</p>
          {todayEntries.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-400">لا يوجد جدول لهذا اليوم</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayEntries.map(entry => (
                <PeriodRow
                  key={entry.id}
                  entry={entry}
                  onPrep={() => setActiveFlow({ type: "preparation", entry })}
                  onLog={() => setActiveFlow({ type: "daily_log", entry })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet Flows */}
      {activeFlow?.type === "preparation" && activeFlow.entry && (
        <PreparationSheet
          entry={activeFlow.entry}
          weekId={activeWeekId}
          dayCode={todayDayCode}
          onClose={() => setActiveFlow(null)}
          onSaved={() => handleSaved("تم حفظ التحضير")}
        />
      )}
      {activeFlow?.type === "daily_log" && activeFlow.entry && (
        <DailyLogSheet
          entry={activeFlow.entry}
          date={today.date}
          onClose={() => setActiveFlow(null)}
          onSaved={() => handleSaved("تم حفظ سجل الحصة")}
        />
      )}
      {activeFlow?.type === "violation" && (
        <ViolationSheet
          classRoomId={activeFlow.entry?.classRoomId ?? defaultClassRoomId}
          onClose={() => setActiveFlow(null)}
          onSaved={() => handleSaved("تم تسجيل المخالفة")}
        />
      )}
      {activeFlow?.type === "note" && (
        <StudentNoteSheet
          classRoomId={activeFlow.entry?.classRoomId ?? defaultClassRoomId}
          onClose={() => setActiveFlow(null)}
          onSaved={() => handleSaved("تم حفظ الملاحظة")}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function AlertBadge({ icon, color, text }: {
  icon: React.ReactNode; color: "amber" | "orange" | "red"; text: string;
}) {
  const COLORS = {
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red:    "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={clsx("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm", COLORS[color])}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function QuickAction({ icon, label, color, onClick, disabled }: {
  icon: React.ReactNode; label: string;
  color: "blue" | "green" | "orange" | "purple";
  onClick: () => void; disabled?: boolean;
}) {
  const COLORS = {
    blue:   "bg-blue-50 text-blue-600 active:bg-blue-100",
    green:  "bg-green-50 text-green-600 active:bg-green-100",
    orange: "bg-orange-50 text-orange-600 active:bg-orange-100",
    purple: "bg-purple-50 text-purple-600 active:bg-purple-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-colors",
        COLORS[color],
        disabled && "opacity-40 cursor-not-allowed"
      )}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
