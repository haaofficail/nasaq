import { useState, useEffect, useCallback } from "react";
import {
  Grid3x3, Save, RefreshCw, ChevronDown, X, Check,
  Coffee, Loader2, Download, Copy, Trash2, Settings2, AlertTriangle, ArrowUpDown,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ── Constants ──────────────────────────────────────────────

const DAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الاثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
];

// ── Helpers ────────────────────────────────────────────────

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function buildDefaultPeriods(
  startTime: string,
  periodDuration: number,
  breakDuration: number,
  numberOfPeriods: number,
  breakAfter = 3,
): Array<{ periodNumber: number; startTime: string; endTime: string; isBreak: boolean; label: string }> {
  const periods = [];
  let current = startTime;
  for (let i = 1; i <= numberOfPeriods; i++) {
    const end = addMinutes(current, periodDuration);
    periods.push({ periodNumber: i, startTime: current, endTime: end, isBreak: false, label: `الحصة ${arabicOrdinal(i)}` });
    current = end;
    if (i === breakAfter) {
      const breakEnd = addMinutes(current, breakDuration);
      periods.push({ periodNumber: i + 0.5, startTime: current, endTime: breakEnd, isBreak: true, label: "الفسحة" });
      current = breakEnd;
    }
  }
  return periods;
}

function arabicOrdinal(n: number): string {
  const labels = ["الأولى","الثانية","الثالثة","الرابعة","الخامسة","السادسة","السابعة","الثامنة","التاسعة","العاشرة"];
  return labels[n - 1] ?? `${n}`;
}

// Key for a cell
function cellKey(day: number, period: number): string { return `${day}-${period}`; }

// ── Cell Editor Modal ──────────────────────────────────────

function CellModal({
  day, period, periodLabel, startTime, endTime,
  value, teachers, subjects,
  onSave, onClear, onClose,
}: {
  day: number; period: number; periodLabel: string; startTime: string; endTime: string;
  value: { subject?: string | null; teacherId?: string | null; teacherName?: string | null } | null;
  teachers: any[]; subjects: any[];
  onSave: (subject: string | null, teacherId: string | null, st: string, et: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [subject,   setSubject]   = useState(value?.subject   ?? "");
  const [teacherId, setTeacherId] = useState(value?.teacherId ?? "");
  const [st,        setSt]        = useState(startTime);
  const [et,        setEt]        = useState(endTime);

  const dayLabel = DAYS.find(d => d.value === day)?.label ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-gray-900">{periodLabel}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{dayLabel}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">المادة</label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">— لا يوجد —</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">المعلم</label>
            <select
              value={teacherId}
              onChange={e => setTeacherId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">— لا يوجد —</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.fullName}{t.subject ? ` — ${t.subject}` : ""}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">من</label>
              <input type="time" value={st} onChange={e => setSt(e.target.value)} dir="ltr"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">إلى</label>
              <input type="time" value={et} onChange={e => setEt(e.target.value)} dir="ltr"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" />
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onSave(subject || null, teacherId || null, st, et)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700"
          >
            <Check className="w-4 h-4" />
            حفظ
          </button>
          <button
            onClick={onClear}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settings Panel ─────────────────────────────────────────

function SettingsPanel({
  settings, onApply, onClose,
}: {
  settings: { startTime: string; periodDuration: number; breakDuration: number; numberOfPeriods: number; breakAfter: number };
  onApply: (s: typeof settings) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...settings });
  const sf = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-900">إعدادات الجدول</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">بداية الدوام</label>
            <input type="time" value={form.startTime} onChange={e => sf("startTime", e.target.value)} dir="ltr"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">مدة الحصة (دقيقة)</label>
              <input type="number" min={20} max={90} value={form.periodDuration} onChange={e => sf("periodDuration", +e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">مدة الفسحة (دقيقة)</label>
              <input type="number" min={5} max={45} value={form.breakDuration} onChange={e => sf("breakDuration", +e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">عدد الحصص</label>
              <input type="number" min={1} max={12} value={form.numberOfPeriods} onChange={e => sf("numberOfPeriods", +e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">الفسحة بعد الحصة</label>
              <input type="number" min={1} max={10} value={form.breakAfter} onChange={e => sf("breakAfter", +e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" />
            </div>
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-gray-100 flex gap-2">
          <button onClick={() => onApply(form)}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">
            تطبيق وإعادة البناء
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────

type CellData = {
  id?: string;
  subject?: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isBreak?: boolean;
};

type TimetableMap = Record<string, CellData>; // key = "day-period"

// ── Page ──────────────────────────────────────────────────

export function SchoolTimetablePage() {
  const [classRoomId,  setClassRoomId]  = useState("");
  const [editModal,    setEditModal]    = useState<{ day: number; period: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState("");
  const [dirty,        setDirty]        = useState(false);
  const [migrating,    setMigrating]    = useState(false);
  const [migrateMsg,   setMigrateMsg]   = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  // in-memory overrides
  const [cellMap, setCellMap] = useState<TimetableMap>({});

  // Schedule params (pulled from school settings, then editable locally)
  const [schedParams, setSchedParams] = useState({
    startTime:       "07:30",
    periodDuration:  45,
    breakDuration:   30,
    numberOfPeriods: 7,
    breakAfter:      3,
  });

  // Data fetches
  const { data: classesData }   = useApi(() => schoolApi.listClassRooms(), []);
  const { data: teachersData }  = useApi(() => schoolApi.listTeachers(), []);
  const { data: subjectsData }  = useApi(() => schoolApi.listSubjects(), []);
  const { data: settingsData }  = useApi(() => schoolApi.getSettings(), []);

  const classRooms: any[] = classesData?.data ?? [];
  const teachers: any[]   = (teachersData?.data ?? []).filter((t: any) => t.isActive !== false);
  const subjects: any[]   = subjectsData?.data ?? [];

  // Apply school settings to schedule params
  useEffect(() => {
    const s = settingsData?.data;
    if (!s) return;
    setSchedParams(prev => ({
      ...prev,
      startTime:       s.sessionStartTime      ?? prev.startTime,
      periodDuration:  s.periodDurationMinutes ?? prev.periodDuration,
      breakDuration:   s.breakDurationMinutes  ?? prev.breakDuration,
      numberOfPeriods: s.numberOfPeriods        ?? prev.numberOfPeriods,
    }));
  }, [settingsData]);

  const { data: timetableData, loading: ttLoading, refetch: refetchTt } = useApi(
    () => classRoomId
      ? schoolApi.getTimetable(classRoomId) as Promise<{ data: any[]; weekId?: string | null; periods?: any[] }>
      : Promise.resolve({ data: [], weekId: null, periods: [] }),
    [classRoomId]
  );

  // Build cell map from server data
  useEffect(() => {
    if (!timetableData) return;
    const map: TimetableMap = {};
    for (const row of (timetableData.data ?? [])) {
      map[cellKey(row.dayOfWeek, row.periodNumber)] = {
        id: row.id, subject: row.subject, teacherId: row.teacherId,
        teacherName: row.teacherName, startTime: row.startTime, endTime: row.endTime, isBreak: row.isBreak,
      };
    }
    setCellMap(map);
    setDirty(false);
    // تسجيل وقت جلب البيانات لفحص التعديل المتزامن
    setLastFetchedAt(new Date().toISOString());
  }, [timetableData]);

  // Build period rows: من قالب System A إن وجد، وإلا من إعدادات الجدول المحلية
  const templatePeriods: any[] = timetableData?.periods ?? [];
  const periods = templatePeriods.length > 0
    ? templatePeriods.map((p: any) => ({
        periodNumber: p.periodNumber,
        startTime:    p.startTime,
        endTime:      p.endTime,
        isBreak:      p.isBreak,
        label:        p.label ?? (p.isBreak ? "الفسحة" : `الحصة ${arabicOrdinal(p.periodNumber)}`),
      }))
    : buildDefaultPeriods(
        schedParams.startTime, schedParams.periodDuration,
        schedParams.breakDuration, schedParams.numberOfPeriods, schedParams.breakAfter,
      );

  const activeWeekId: string | null = timetableData?.weekId ?? null;

  const getCell = useCallback((day: number, period: number): CellData | null => {
    return cellMap[cellKey(day, period)] ?? null;
  }, [cellMap]);

  const updateCell = (day: number, period: number, subject: string | null, teacherId: string | null, st: string, et: string) => {
    const teacher = teachers.find(t => t.id === teacherId) ?? null;
    setCellMap(prev => ({
      ...prev,
      [cellKey(day, period)]: {
        ...prev[cellKey(day, period)],
        subject, teacherId, teacherName: teacher?.fullName ?? null,
        startTime: st, endTime: et,
      },
    }));
    setDirty(true);
    setEditModal(null);
  };

  const clearCell = (day: number, period: number) => {
    setCellMap(prev => {
      const n = { ...prev };
      delete n[cellKey(day, period)];
      return n;
    });
    setDirty(true);
    setEditModal(null);
  };

  const handleSave = async () => {
    if (!classRoomId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      // Build cells — فقط الخلايا ذات المادة (System A يشترط وجود subject)
      const allCells: any[] = [];
      for (const day of DAYS) {
        for (const p of periods) {
          if (p.isBreak) continue;
          const key = cellKey(day.value, p.periodNumber);
          const cell = cellMap[key];
          if (cell?.subject?.trim()) {
            allCells.push({
              dayOfWeek:    day.value,
              periodNumber: p.periodNumber,
              subject:      cell.subject,
              teacherId:    cell.teacherId ?? null,
              isBreak:      false,
            });
          }
        }
      }

      await schoolApi.bulkUpsertTimetable(classRoomId, allCells, lastFetchedAt ?? undefined);
      setDirty(false);
      setSaveMsg("تم الحفظ");
      refetchTt();
    } catch (err: any) {
      setSaveMsg(err?.message ?? "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateMsg("");
    try {
      const res = await schoolApi.migrateToSystemA();
      setMigrateMsg(`تم ترحيل ${res.migrated} إدخال`);
      refetchTt();
    } catch {
      setMigrateMsg("فشل الترحيل");
    } finally {
      setMigrating(false);
    }
  };

  const handleApplySettings = async (newSettings: typeof schedParams) => {
    setSchedParams(newSettings);
    // Reset cell times to new defaults
    setCellMap(prev => {
      const newMap: TimetableMap = {};
      const newPeriods = buildDefaultPeriods(
        newSettings.startTime, newSettings.periodDuration,
        newSettings.breakDuration, newSettings.numberOfPeriods, newSettings.breakAfter,
      );
      for (const [k, v] of Object.entries(prev)) {
        const [, pStr] = k.split("-");
        const pNum = Number(pStr);
        const pd = newPeriods.find(p => p.periodNumber === pNum);
        newMap[k] = { ...v, startTime: pd?.startTime ?? v.startTime, endTime: pd?.endTime ?? v.endTime };
      }
      return newMap;
    });
    setShowSettings(false);
    setDirty(true);
    // Persist to school settings so changes survive page reload
    try {
      const cur = settingsData?.data ?? {};
      await schoolApi.saveSettings({
        ...cur,
        sessionStartTime:      newSettings.startTime,
        periodDurationMinutes: newSettings.periodDuration,
        breakDurationMinutes:  newSettings.breakDuration,
        numberOfPeriods:       newSettings.numberOfPeriods,
      });
    } catch { /* non-blocking */ }
  };

  const selectedClass = classRooms.find(c => c.id === classRoomId);

  const editPeriod = editModal
    ? periods.find(p => !p.isBreak && p.periodNumber === editModal.period)
    : null;

  return (
    <div dir="rtl" className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الجدول الدراسي</h1>
          <p className="text-sm text-gray-500 mt-1">جدول حصص أسبوعي لكل فصل — قابل للتخصيص الكامل</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
          >
            <Settings2 className="w-4 h-4" />
            إعدادات الجدول
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !classRoomId || !dirty}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {dirty ? "حفظ الجدول" : "محفوظ"}
          </button>
        </div>
      </div>

      {/* Class selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={classRoomId}
          onChange={e => setClassRoomId(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400/30 min-w-[200px]"
        >
          <option value="">اختر الفصل الدراسي...</option>
          {classRooms.map((cr: any) => (
            <option key={cr.id} value={cr.id}>{cr.grade} — فصل {cr.name}</option>
          ))}
        </select>
        {classRoomId && (
          <button onClick={() => { refetchTt(); setSaveMsg(""); }} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {saveMsg && (
          <span className={clsx("text-xs font-semibold", saveMsg.startsWith("خطأ") ? "text-red-500" : "text-emerald-600")}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* No active week warning */}
      {classRoomId && !ttLoading && activeWeekId === null && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">لا يوجد أسبوع دراسي نشط</p>
            <p className="text-xs text-amber-700 mt-0.5">
              قم بإعداد العام الدراسي أولاً، أو رحّل بيانات الجدول القديمة إلى النظام الجديد.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {migrateMsg && <span className="text-xs text-emerald-700 font-semibold">{migrateMsg}</span>}
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
            >
              {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
              ترحيل البيانات
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!classRoomId && (
        <div className="py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
            <Grid3x3 className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">اختر فصلاً لعرض جدوله الدراسي</p>
          <p className="text-xs text-gray-400 max-w-xs">
            الجدول يُبنى تلقائياً من إعدادات الدوام — يمكن تعديل كل خلية بالضغط عليها
          </p>
        </div>
      )}

      {/* Timetable Grid */}
      {classRoomId && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-gray-900">
              {selectedClass ? `${selectedClass.grade} — فصل ${selectedClass.name}` : ""}
            </span>
            {dirty && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">يوجد تغييرات غير محفوظة</span>}
          </div>

          {ttLoading ? (
            <div className="p-8 space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="text-right px-4 py-3 font-bold w-28 border-l border-gray-100">الحصة / الوقت</th>
                    {DAYS.map(d => (
                      <th key={d.value} className="text-center px-3 py-3 font-bold border-l border-gray-100">{d.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => {
                    if (p.isBreak) {
                      return (
                        <tr key={`break-${p.periodNumber}`} className="bg-amber-50/60">
                          <td className="px-4 py-2 border-t border-l border-gray-100">
                            <div className="flex items-center gap-1.5 text-amber-700">
                              <Coffee className="w-3.5 h-3.5" />
                              <span className="text-xs font-bold">فسحة</span>
                            </div>
                            <p className="text-[10px] text-amber-500 mt-0.5" dir="ltr">{p.startTime} — {p.endTime}</p>
                          </td>
                          {DAYS.map(d => (
                            <td key={d.value} className="px-3 py-2 text-center border-t border-l border-amber-100">
                              <Coffee className="w-3.5 h-3.5 text-amber-300 mx-auto" />
                            </td>
                          ))}
                        </tr>
                      );
                    }

                    return (
                      <tr key={p.periodNumber} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                        <td className="px-4 py-3 border-l border-gray-100 bg-gray-50/50">
                          <p className="text-xs font-bold text-gray-700">{p.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5" dir="ltr">{p.startTime} — {p.endTime}</p>
                        </td>
                        {DAYS.map(d => {
                          const cell = getCell(d.value, p.periodNumber);
                          const hasContent = !!(cell?.subject || cell?.teacherId);
                          return (
                            <td
                              key={d.value}
                              onClick={() => setEditModal({ day: d.value, period: p.periodNumber })}
                              className="px-2 py-2 border-l border-gray-100 cursor-pointer group"
                            >
                              {hasContent ? (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-2 text-center group-hover:border-emerald-300 transition-colors">
                                  {cell?.subject && (
                                    <p className="text-[11px] font-black text-emerald-800 truncate">{cell.subject}</p>
                                  )}
                                  {cell?.teacherName && (
                                    <p className="text-[10px] text-emerald-600 truncate mt-0.5">{cell.teacherName}</p>
                                  )}
                                  {cell?.startTime && cell.startTime !== p.startTime && (
                                    <p className="text-[9px] text-emerald-400 mt-0.5" dir="ltr">{cell.startTime} — {cell.endTime}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="h-12 rounded-xl border border-dashed border-gray-200 group-hover:border-emerald-300 group-hover:bg-emerald-50/30 transition-all flex items-center justify-center">
                                  <span className="text-[10px] text-gray-300 group-hover:text-emerald-400">+</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hint */}
      {classRoomId && !ttLoading && (
        <p className="text-xs text-gray-400 text-center">
          اضغط على أي خلية لتعديل المادة والمعلم — التغييرات تُحفظ بالضغط على «حفظ الجدول»
        </p>
      )}

      {/* Cell Edit Modal */}
      {editModal && editPeriod && (
        <CellModal
          day={editModal.day}
          period={editModal.period}
          periodLabel={editPeriod.label}
          startTime={cellMap[cellKey(editModal.day, editModal.period)]?.startTime ?? editPeriod.startTime}
          endTime={cellMap[cellKey(editModal.day, editModal.period)]?.endTime ?? editPeriod.endTime}
          value={cellMap[cellKey(editModal.day, editModal.period)] ?? null}
          teachers={teachers}
          subjects={subjects}
          onSave={(subject, teacherId, st, et) => updateCell(editModal.day, editModal.period, subject, teacherId, st, et)}
          onClear={() => clearCell(editModal.day, editModal.period)}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel
          settings={schedParams}
          onApply={handleApplySettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
