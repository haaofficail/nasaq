import { useState } from "react";
import {
  UserCheck, UserX, Clock, CheckCircle2, XCircle, Loader2,
  RefreshCw, Save, ChevronRight, ChevronLeft, MessageCircle,
  ClipboardList, Plus, Trash2, X,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { PageFAQ } from "@/components/school/PageFAQ";

const STATUS_OPTIONS = [
  { value: "present", label: "حاضر",   color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: UserCheck },
  { value: "absent",  label: "غائب",   color: "text-red-600 bg-red-50 border-red-200",             icon: UserX },
  { value: "late",    label: "متأخر",  color: "text-amber-600 bg-amber-50 border-amber-200",       icon: Clock },
  { value: "excused", label: "مستأذن", color: "text-blue-600 bg-blue-50 border-blue-200",          icon: CheckCircle2 },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function shiftDate(d: string, days: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

type TeacherRow = {
  id: string;
  fullName: string;
  phone?: string;
  subject?: string;
};

type AttendanceRecord = {
  id: string;
  teacherId: string;
  classRoomId?: string;
  status: string;
  notified: boolean;
  createdAt: string;
};

// ── الأرقام العربية للحصص ──────────────────────────────────

const PERIOD_LABELS = ["","الأولى","الثانية","الثالثة","الرابعة","الخامسة","السادسة","السابعة","الثامنة","التاسعة","العاشرة"];

// ── Standby Modal (ذكي — من الجدول) ────────────────────────

function StandbyModal({
  date,
  absentTeacher,
  teachers,
  classRooms: allClasses,
  onClose,
  onDone,
}: {
  date: string;
  absentTeacher: TeacherRow | null;
  teachers: TeacherRow[];
  classRooms: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  // يوم الأسبوع: 0=أحد 1=اثنين ... 6=سبت
  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  // جدول المعلم الغائب لهذا اليوم
  const { data: ttData, loading: ttLoading } = useApi(
    () => absentTeacher?.id
      ? schoolApi.getTeacherDayTimetable(absentTeacher.id, dayOfWeek)
      : Promise.resolve({ data: [] }),
    [absentTeacher?.id, dayOfWeek]
  );
  const periods: any[] = (ttData?.data ?? []).filter((p: any) => !p.isBreak && p.subject);

  // اختيار المعلم البديل لكل حصة { periodNumber → teacherId }
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  // تكليف جماعي سريع
  const [bulkTeacher, setBulkTeacher]  = useState("");
  // وضع يدوي (إذا لا يوجد جدول)
  const [manualSubject,    setManualSubject]    = useState("");
  const [manualClassId,    setManualClassId]    = useState("");
  const [manualPeriod,     setManualPeriod]     = useState("");
  const [manualTeacherId,  setManualTeacherId]  = useState("");
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState("");
  const [done,             setDone]             = useState(false);

  const availableTeachers = teachers.filter(t => t.id !== absentTeacher?.id);

  const applyBulk = (tid: string) => {
    setBulkTeacher(tid);
    const all: Record<number, string> = {};
    periods.forEach((p: any) => { if (tid) all[p.periodNumber] = tid; });
    setAssignments(all);
  };

  const assignedCount = Object.values(assignments).filter(Boolean).length;

  // حفظ من الجدول
  const handleSaveSmart = async () => {
    const entries = periods.filter((p: any) => assignments[p.periodNumber]);
    if (!entries.length) { setError("حدد معلماً بديلاً لحصة واحدة على الأقل"); return; }
    setSaving(true); setError("");
    try {
      for (const p of entries) {
        await schoolApi.createStandbyActivation({
          activationDate:   date,
          absentTeacherId:  absentTeacher?.id ?? null,
          standbyTeacherId: assignments[p.periodNumber],
          classRoomId:      p.classRoomId ?? null,
          subject:          p.subject,
          periodLabel:      `الحصة ${PERIOD_LABELS[p.periodNumber] ?? p.periodNumber}`,
          startTime:        p.startTime ?? null,
          endTime:          p.endTime   ?? null,
          notes:            null,
        });
      }
      setDone(true);
      onDone();
      setTimeout(onClose, 800);
    } catch { setError("حدث خطأ أثناء الحفظ"); }
    finally  { setSaving(false); }
  };

  // حفظ يدوي
  const handleSaveManual = async () => {
    if (!manualTeacherId || !manualSubject) { setError("المعلم البديل والمادة مطلوبان"); return; }
    setSaving(true); setError("");
    try {
      await schoolApi.createStandbyActivation({
        activationDate:   date,
        absentTeacherId:  absentTeacher?.id ?? null,
        standbyTeacherId: manualTeacherId,
        classRoomId:      manualClassId || null,
        subject:          manualSubject,
        periodLabel:      manualPeriod || null,
        startTime:        null, endTime: null, notes: null,
      });
      setDone(true);
      onDone();
      setTimeout(onClose, 800);
    } catch { setError("حدث خطأ أثناء الحفظ"); }
    finally  { setSaving(false); }
  };

  const { data: subjectsData } = useApi(() => schoolApi.listSubjects(), []);
  const subjects: any[] = subjectsData?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-black text-gray-900">تكليف حصص الانتظار</h2>
            {absentTeacher && (
              <p className="text-xs text-red-500 font-medium mt-0.5">
                غائب اليوم: {absentTeacher.fullName}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {ttLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="mr-2 text-sm text-gray-500">جاري جلب جدول المعلم...</span>
            </div>
          ) : periods.length > 0 ? (
            // ── الوضع الذكي: حصص من الجدول ──
            <div className="p-5 space-y-4">
              {/* تكليف جماعي */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-emerald-800 mb-2">تكليف معلم واحد لجميع الحصص ({periods.length})</p>
                <select
                  value={bulkTeacher}
                  onChange={e => applyBulk(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-emerald-200 rounded-xl outline-none focus:border-emerald-400 bg-white"
                >
                  <option value="">اختر معلماً لجميع الحصص...</option>
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}{t.subject ? ` — ${t.subject}` : ""}</option>
                  ))}
                </select>
              </div>

              <p className="text-xs font-bold text-gray-500">أو اختر معلماً لكل حصة على حدة:</p>

              {/* حصص المعلم الغائب */}
              <div className="space-y-2.5">
                {periods.map((p: any) => (
                  <div key={p.periodNumber}
                    className={clsx(
                      "border rounded-2xl overflow-hidden transition-all",
                      assignments[p.periodNumber] ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100 bg-white"
                    )}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* رقم الحصة */}
                      <div className={clsx(
                        "w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 text-[9px] font-black",
                        assignments[p.periodNumber] ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600"
                      )}>
                        <span>{p.periodNumber}</span>
                        <span className="leading-none">{PERIOD_LABELS[p.periodNumber] ?? ""}</span>
                      </div>

                      {/* تفاصيل الحصة */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{p.subject}</span>
                          {p.classGrade && (
                            <span className="text-[10px] bg-[#5b9bd5]/10 text-[#5b9bd5] border border-[#5b9bd5]/20 rounded-full px-2 py-0.5 font-semibold">
                              {p.classGrade} — فصل {p.className}
                            </span>
                          )}
                        </div>
                        {p.startTime && (
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{p.startTime} — {p.endTime}</p>
                        )}
                      </div>

                      {/* معلم بديل */}
                      <div className="shrink-0 w-44">
                        <select
                          value={assignments[p.periodNumber] ?? ""}
                          onChange={e => {
                            setBulkTeacher("");
                            setAssignments(prev => ({ ...prev, [p.periodNumber]: e.target.value }));
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-emerald-400 bg-white"
                        >
                          <option value="">بدون تكليف</option>
                          {availableTeachers.map(t => (
                            <option key={t.id} value={t.id}>{t.fullName}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              {done && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 font-bold">تم التكليف بنجاح</p>}
            </div>
          ) : (
            // ── الوضع اليدوي: لا يوجد جدول لهذا المعلم ──
            <div className="p-5 space-y-3">
              {/* المعلم البديل */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">المعلم البديل <span className="text-red-500">*</span></label>
                <select value={manualTeacherId} onChange={e => setManualTeacherId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400">
                  <option value="">اختر معلماً...</option>
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}{t.subject ? ` — ${t.subject}` : ""}</option>
                  ))}
                </select>
              </div>
              {/* المادة + الفصل + الحصة في صف واحد */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">المادة <span className="text-red-500">*</span></label>
                  <select value={manualSubject} onChange={e => setManualSubject(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-emerald-400">
                    <option value="">اختر...</option>
                    {subjects.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">الفصل</label>
                  <select value={manualClassId} onChange={e => setManualClassId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-emerald-400">
                    <option value="">غير محدد</option>
                    {allClasses.map((cr: any) => (
                      <option key={cr.id} value={cr.id}>{cr.grade} — فصل {cr.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">الحصة</label>
                  <select value={manualPeriod} onChange={e => setManualPeriod(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-emerald-400">
                    <option value="">غير محددة</option>
                    {PERIOD_LABELS.slice(1).map((l, i) => (
                      <option key={i+1} value={`الحصة ${l}`}>الحصة {l}</option>
                    ))}
                  </select>
                </div>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              {done && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 font-bold">تم التكليف بنجاح</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex gap-2 shrink-0 bg-white">
          {!ttLoading && (
            <button
              onClick={periods.length > 0 ? handleSaveSmart : handleSaveManual}
              disabled={saving || done || (periods.length > 0 && assignedCount === 0)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
              {periods.length > 0
                ? `تكليف وإشعار (${assignedCount} ${assignedCount === 1 ? "حصة" : "حصص"})`
                : "تكليف وإشعار"}
            </button>
          )}
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export function SchoolTeacherAttendancePage() {
  const [date, setDate]             = useState(todayDate());
  const [selectedClass, setClass]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  // local overrides: teacherId → status
  const [overrides, setOverrides]   = useState<Record<string, string>>({});
  const [standbyModal, setStandbyModal] = useState<{ open: boolean; teacher: TeacherRow | null }>({ open: false, teacher: null });

  // Teachers list
  const { data: teachersData, loading: teachersLoading } = useApi(
    () => schoolApi.listTeachers(), []
  );
  const teachers: TeacherRow[] = (teachersData?.data ?? []).filter((t: any) => t.isActive !== false);

  // Classes for filter
  const { data: classesData } = useApi(() => schoolApi.listClassRooms(), []);
  const classes: any[] = classesData?.data ?? [];

  // Existing attendance for date
  const { data: attendanceData, loading: attLoading, refetch: refetchAtt } = useApi(
    () => schoolApi.getTeacherAttendance({ date, classRoomId: selectedClass || undefined }),
    [date, selectedClass]
  );
  const existing: AttendanceRecord[] = attendanceData?.data ?? [];

  // Standby activations for the selected date
  const { data: standbyData, refetch: refetchStandby } = useApi(
    () => schoolApi.getStandbyActivations(date),
    [date]
  );
  const standbys: any[] = standbyData?.data ?? [];

  // Build a map of teacherId → record
  const existingMap = Object.fromEntries(existing.map(r => [r.teacherId, r]));

  const getStatus = (teacherId: string) =>
    overrides[teacherId] ?? existingMap[teacherId]?.status ?? null;

  const handleStatus = (teacherId: string, status: string) => {
    setOverrides(prev => ({ ...prev, [teacherId]: status }));
    setSaveMsg("");
  };

  const handleSave = async () => {
    const entries = teachers
      .filter(t => overrides[t.id])
      .map(t => ({
        teacherId:   t.id,
        classRoomId: selectedClass || undefined,
        status:      overrides[t.id],
      }));

    if (!entries.length) {
      setSaveMsg("لم تُسجَّل أي تغييرات");
      return;
    }

    setSaving(true);
    setSaveMsg("");
    try {
      await schoolApi.recordTeacherAttendance({ date, entries });
      setSaveMsg("تم الحفظ والإشعار");
      setOverrides({});
      refetchAtt();
    } catch {
      setSaveMsg("خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const absentCount  = teachers.filter(t => getStatus(t.id) === "absent").length;
  const presentCount = teachers.filter(t => getStatus(t.id) === "present").length;
  const loading      = teachersLoading || attLoading;

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">حضور المعلمين</h1>
          <p className="text-sm text-gray-500 mt-1">الوكيل يسجّل الحضور — النظام يُشعر الغائب تلقائياً</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !Object.keys(overrides).length}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ وإرسال
        </button>
      </div>

      {/* Date nav + stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1">
          <button
            onClick={() => { setDate(d => shiftDate(d, -1)); setOverrides({}); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setOverrides({}); }}
            className="text-sm font-semibold text-gray-800 outline-none bg-transparent px-2"
            dir="ltr"
          />
          <button
            onClick={() => { setDate(d => shiftDate(d, 1)); setOverrides({}); }}
            disabled={date >= todayDate()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <select
          value={selectedClass}
          onChange={e => setClass(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400/30"
        >
          <option value="">كل الفصول</option>
          {classes.map((c: any) => (
            <option key={c.id} value={c.id}>{c.grade} / {c.name}</option>
          ))}
        </select>

        <button onClick={() => { refetchAtt(); setOverrides({}); }} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
          <RefreshCw className="w-4 h-4" />
        </button>

        {(presentCount > 0 || absentCount > 0) && (
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
              حاضر {presentCount}
            </span>
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
              غائب {absentCount}
            </span>
          </div>
        )}
      </div>

      {saveMsg && (
        <div className={clsx(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold",
          saveMsg.startsWith("خطأ") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
        )}>
          {saveMsg.startsWith("خطأ") ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {saveMsg}
        </div>
      )}

      {/* Teacher list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">لا يوجد معلمون مسجّلون</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Header row */}
            <div className="px-5 py-2.5 bg-gray-50 grid grid-cols-[1fr_auto] gap-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">المعلم</span>
              <span className="text-xs font-bold text-gray-500 text-center w-64">الحالة</span>
            </div>

            {teachers.map(teacher => {
              const status    = getStatus(teacher.id);
              const isNew     = !!overrides[teacher.id];
              const notified  = existingMap[teacher.id]?.notified;

              return (
                <div
                  key={teacher.id}
                  className={clsx(
                    "px-5 py-3.5 flex items-center justify-between gap-4",
                    isNew && "bg-blue-50/40"
                  )}
                >
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800">{teacher.fullName}</p>
                      {teacher.subject && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 rounded-lg px-1.5 py-0.5">{teacher.subject}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {teacher.phone && (
                        <span className="text-[11px] text-gray-400" dir="ltr">{teacher.phone}</span>
                      )}
                      {existingMap[teacher.id]?.createdAt && (
                        <span className="text-[11px] text-gray-300 font-mono" dir="ltr">
                          {new Date(existingMap[teacher.id].createdAt).toLocaleTimeString("ar-SA", {
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </span>
                      )}
                      {notified && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <MessageCircle className="w-3 h-3" />أُبلغ
                        </span>
                      )}
                      {!teacher.phone && status === "absent" && (
                        <span className="text-[10px] text-amber-600">لا يوجد رقم جوال</span>
                      )}
                    </div>
                  </div>

                  {/* Status buttons + standby trigger */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleStatus(teacher.id, opt.value)}
                        className={clsx(
                          "px-2.5 py-1 rounded-xl border text-xs font-bold transition-all",
                          status === opt.value
                            ? opt.color + " ring-2 ring-offset-1 ring-current/30"
                            : "text-gray-400 bg-gray-50 border-gray-100 hover:bg-gray-100"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {(status === "absent" || status === "excused") && (
                      <button
                        onClick={() => setStandbyModal({ open: true, teacher })}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors"
                        title="تكليف حصة انتظار"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        انتظار
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Standby activations for the day */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-gray-900">حصص الانتظار</h2>
            {standbys.length > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">{standbys.length}</span>
            )}
          </div>
          <button
            onClick={() => setStandbyModal({ open: true, teacher: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة يدوي
          </button>
        </div>

        {standbys.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            لا توجد حصص انتظار مسجّلة لهذا اليوم
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {standbys.map((s: any) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">{s.standbyTeacherName}</span>
                    <span className="text-xs text-white bg-emerald-500 rounded-full px-2 py-0.5">{s.subject}</span>
                    {s.classRoomGrade && (
                      <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{s.classRoomGrade} — فصل {s.classRoomName}</span>
                    )}
                    {s.periodLabel && (
                      <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">الحصة: {s.periodLabel}</span>
                    )}
                  </div>
                  {s.absentTeacherName && (
                    <p className="text-xs text-gray-400 mt-0.5">بدلاً عن: {s.absentTeacherName}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.startTime && s.endTime && (
                      <span className="text-[11px] text-gray-400" dir="ltr">{s.startTime} — {s.endTime}</span>
                    )}
                    {s.notified && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <MessageCircle className="w-3 h-3" />أُبلغ
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await schoolApi.deleteStandbyActivation(s.id);
                    refetchStandby();
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date label at bottom */}
      <p className="text-xs text-gray-400 text-center">{formatDate(date)}</p>

      <PageFAQ pageId="teacher-attendance" />

      {/* Standby Modal */}
      {standbyModal.open && (
        <StandbyModal
          date={date}
          absentTeacher={standbyModal.teacher}
          teachers={teachers}
          classRooms={classes}
          onClose={() => setStandbyModal({ open: false, teacher: null })}
          onDone={() => { refetchStandby(); }}
        />
      )}
    </div>
  );
}
