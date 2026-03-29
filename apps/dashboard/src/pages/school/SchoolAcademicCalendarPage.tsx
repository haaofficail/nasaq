import { useState, useMemo } from "react";
import {
  CalendarDays, Plus, Edit2, Trash2, Loader2, CheckCircle2, X,
  ChevronLeft, ChevronRight, Flag, BookOpen, PartyPopper, Star,
  CalendarRange, AlertCircle, GraduationCap, Layers,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const EVENT_TYPES: Record<string, { label: string; color: string; icon: typeof Flag; bg: string }> = {
  holiday:     { label: "إجازة",           color: "#ef4444", bg: "bg-red-50 border-red-200 text-red-700",    icon: Flag },
  national_day:{ label: "مناسبة وطنية",    color: "#10b981", bg: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: Star },
  exam:        { label: "اختبار",          color: "#8b5cf6", bg: "bg-violet-50 border-violet-200 text-violet-700", icon: GraduationCap },
  activity:    { label: "نشاط مدرسي",      color: "#f59e0b", bg: "bg-amber-50 border-amber-200 text-amber-700", icon: PartyPopper },
  other:       { label: "أخرى",            color: "#6b7280", bg: "bg-gray-50 border-gray-200 text-gray-600",  icon: CalendarDays },
};

const SEMESTER_LABELS: Record<number, string> = { 1: "الفصل الدراسي الأول", 2: "الفصل الدراسي الثاني" };

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("ar-SA", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function dateRange(start: string, end?: string | null): string {
  if (!end || end === start) return fmtDate(start);
  return `${fmtDate(start)} — ${fmtDate(end)}`;
}

function weeksInRange(start: string, end: string): number {
  const s = new Date(start), e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

// Generate week rows for a semester
function buildWeekRows(startDate: string, endDate: string): Array<{ num: number; start: string; end: string }> {
  const rows: Array<{ num: number; start: string; end: string }> = [];
  let cur = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  let num = 1;
  while (cur <= end) {
    const wEnd = new Date(cur);
    wEnd.setDate(wEnd.getDate() + 6);
    if (wEnd > end) wEnd.setTime(end.getTime());
    rows.push({
      num,
      start: cur.toISOString().slice(0, 10),
      end:   wEnd.toISOString().slice(0, 10),
    });
    cur.setDate(cur.getDate() + 7);
    num++;
  }
  return rows;
}

// ─────────────────────────────────────────────
// Semester Modal
// ─────────────────────────────────────────────

function SemesterModal({
  initial, onClose, onSaved,
}: {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    yearLabel:      initial?.yearLabel      ?? "1446-1447",
    semesterNumber: initial?.semesterNumber ?? 1,
    label:          initial?.label          ?? "",
    startDate:      initial?.startDate      ?? "",
    endDate:        initial?.endDate        ?? "",
    notes:          initial?.notes          ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.yearLabel || !form.semesterNumber) { setErr("السنة ورقم الفصل مطلوبان"); return; }
    setSaving(true); setErr("");
    try {
      const data = {
        ...form,
        semesterNumber: Number(form.semesterNumber),
        label: form.label || SEMESTER_LABELS[Number(form.semesterNumber)] || "",
        startDate: form.startDate || undefined,
        endDate:   form.endDate   || undefined,
        notes:     form.notes     || undefined,
      };
      if (initial?.id) await schoolApi.updateSemester(initial.id, data);
      else             await schoolApi.createSemester(data);
      onSaved();
    } catch { setErr("حدث خطأ — حاول مرة أخرى"); }
    finally  { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" dir="rtl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">
            {initial?.id ? "تعديل الفصل الدراسي" : "إضافة فصل دراسي"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">السنة الدراسية</label>
              <input value={form.yearLabel} onChange={e => set("yearLabel", e.target.value)}
                placeholder="1446-1447"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5]" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">رقم الفصل</label>
              <select value={form.semesterNumber} onChange={e => set("semesterNumber", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5]">
                <option value={1}>الأول</option>
                <option value={2}>الثاني</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">التسمية (اختياري)</label>
            <input value={form.label} onChange={e => set("label", e.target.value)}
              placeholder="الفصل الدراسي الأول"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ البداية</label>
              <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5]" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ النهاية</label>
              <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5]" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5] resize-none" />
          </div>

          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
        <div className="flex items-center gap-2 px-5 pb-5">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-bold hover:bg-[#4a8bc4] disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            حفظ
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Event Modal
// ─────────────────────────────────────────────

function EventModal({
  initial, semesterId, onClose, onSaved,
}: {
  initial?: any;
  semesterId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title:             initial?.title             ?? "",
    eventType:         initial?.eventType         ?? "other",
    startDate:         initial?.startDate         ?? "",
    endDate:           initial?.endDate           ?? "",
    description:       initial?.description       ?? "",
    color:             initial?.color             ?? "",
    affectsAttendance: initial?.affectsAttendance ?? false,
    semesterId:        initial?.semesterId        ?? semesterId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.startDate) { setErr("العنوان والتاريخ مطلوبان"); return; }
    setSaving(true); setErr("");
    try {
      const data = {
        ...form,
        endDate:     form.endDate     || undefined,
        description: form.description || undefined,
        color:       form.color       || EVENT_TYPES[form.eventType]?.color || undefined,
        semesterId:  form.semesterId  || undefined,
      };
      if (initial?.id) await schoolApi.updateSchoolEvent(initial.id, data);
      else             await schoolApi.createSchoolEvent(data);
      onSaved();
    } catch { setErr("حدث خطأ — حاول مرة أخرى"); }
    finally  { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" dir="rtl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">
            {initial?.id ? "تعديل الحدث" : "إضافة حدث"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">نوع الحدث</label>
            <div className="grid grid-cols-5 gap-1.5">
              {Object.entries(EVENT_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => set("eventType", k)}
                  className={clsx(
                    "flex flex-col items-center gap-0.5 p-2 rounded-xl border text-[10px] font-bold transition-all",
                    form.eventType === k ? v.bg + " border-current" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}>
                  <v.icon className="w-4 h-4" />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">العنوان</label>
            <input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="مثال: إجازة اليوم الوطني"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ البداية</label>
              <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5]" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ النهاية (اختياري)</label>
              <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5]" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">الوصف (اختياري)</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#5b9bd5] resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.affectsAttendance} onChange={e => set("affectsAttendance", e.target.checked)}
              className="rounded" />
            <span className="text-sm text-gray-600">يؤثر على الدوام (إجازة رسمية)</span>
          </label>

          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
        <div className="flex items-center gap-2 px-5 pb-5">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-bold hover:bg-[#4a8bc4] disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            حفظ
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export function SchoolAcademicCalendarPage() {
  const [activeSemId,   setActiveSemId]   = useState<string | null>(null);
  const [semModal,      setSemModal]       = useState<{ open: boolean; initial?: any }>({ open: false });
  const [evtModal,      setEvtModal]       = useState<{ open: boolean; initial?: any }>({ open: false });
  const [deletingSemId, setDeletingSemId]  = useState<string | null>(null);
  const [deletingEvtId, setDeletingEvtId]  = useState<string | null>(null);
  const [activeTab,     setActiveTab]      = useState<"weeks" | "events">("weeks");

  const { data: semData, loading: semLoading, refetch: refetchSems } = useApi(
    () => schoolApi.getSemesters(), []
  );
  const semesters: any[] = semData?.data ?? [];

  // Pick active semester: prefer explicitly selected, else isActive, else first
  const selectedSem = useMemo(() => {
    if (activeSemId) return semesters.find(s => s.id === activeSemId) ?? null;
    return semesters.find(s => s.isActive) ?? semesters[0] ?? null;
  }, [semesters, activeSemId]);

  const { data: evtData, loading: evtLoading, refetch: refetchEvts } = useApi(
    () => selectedSem ? schoolApi.getSchoolEvents({ semesterId: selectedSem.id }) : Promise.resolve({ data: [] }),
    [selectedSem?.id]
  );
  const events: any[] = evtData?.data ?? [];

  // Build week rows from semester date range
  const weekRows = useMemo(() => {
    if (!selectedSem?.startDate || !selectedSem?.endDate) return [];
    return buildWeekRows(selectedSem.startDate, selectedSem.endDate);
  }, [selectedSem?.startDate, selectedSem?.endDate]);

  // Overlay events on weeks
  const weekWithEvents = useMemo(() => {
    return weekRows.map(w => ({
      ...w,
      events: events.filter(e => {
        const es = e.startDate, ee = e.endDate ?? e.startDate;
        return es <= w.end && ee >= w.start;
      }),
    }));
  }, [weekRows, events]);

  const handleDeleteSem = async (id: string) => {
    if (!confirm("حذف الفصل الدراسي؟ سيحذف كل الأحداث المرتبطة به.")) return;
    setDeletingSemId(id);
    try {
      await schoolApi.deleteSemester(id);
      if (activeSemId === id) setActiveSemId(null);
      refetchSems();
    } finally { setDeletingSemId(null); }
  };

  const handleDeleteEvt = async (id: string) => {
    if (!confirm("حذف هذا الحدث؟")) return;
    setDeletingEvtId(id);
    try {
      await schoolApi.deleteSchoolEvent(id);
      refetchEvts();
    } finally { setDeletingEvtId(null); }
  };

  const handleSetActive = async (sem: any) => {
    await schoolApi.updateSemester(sem.id, { isActive: true });
    refetchSems();
  };

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقويم الدراسي</h1>
          <p className="text-sm text-gray-500 mt-1">الفصول الدراسية، الأسابيع، الإجازات، المناسبات، والاختبارات</p>
        </div>
        <button
          onClick={() => setSemModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-bold hover:bg-[#4a8bc4] transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          فصل دراسي
        </button>
      </div>

      {/* Semester cards */}
      {semLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map(i => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : semesters.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <CalendarRange className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">لا توجد فصول دراسية بعد</p>
          <p className="text-xs text-gray-400 mt-1">أضف الفصل الدراسي الأول والثاني لبدء التخطيط</p>
          <button
            onClick={() => setSemModal({ open: true })}
            className="mt-4 px-5 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-bold hover:bg-[#4a8bc4]"
          >
            إضافة فصل دراسي
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {semesters.map((sem: any) => {
            const isSelected = selectedSem?.id === sem.id;
            const weeks = sem.startDate && sem.endDate
              ? weeksInRange(sem.startDate, sem.endDate)
              : null;
            return (
              <button
                key={sem.id}
                onClick={() => { setActiveSemId(sem.id); setActiveTab("weeks"); }}
                className={clsx(
                  "text-right p-4 rounded-2xl border transition-all",
                  isSelected
                    ? "border-[#5b9bd5] bg-[#5b9bd5]/5 ring-2 ring-[#5b9bd5]/20"
                    : "border-gray-100 bg-white hover:border-[#5b9bd5]/40"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={clsx(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black",
                      sem.semesterNumber === 1 ? "bg-[#5b9bd5]/10 text-[#5b9bd5]" : "bg-amber-100 text-amber-700"
                    )}>
                      {sem.semesterNumber}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 leading-tight">
                        {sem.label || SEMESTER_LABELS[sem.semesterNumber] || `الفصل ${sem.semesterNumber}`}
                      </p>
                      <p className="text-[10px] text-gray-400">{sem.yearLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {sem.isActive && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
                        نشط
                      </span>
                    )}
                    <button onClick={() => setSemModal({ open: true, initial: sem })}
                      className="p-1 rounded-lg text-gray-400 hover:text-[#5b9bd5] hover:bg-[#5b9bd5]/10 transition-colors">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteSem(sem.id)}
                      disabled={deletingSemId === sem.id}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      {deletingSemId === sem.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                  {sem.startDate && (
                    <p className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-gray-400" />
                      {dateRange(sem.startDate, sem.endDate)}
                    </p>
                  )}
                  {weeks !== null && (
                    <p className="text-[11px] text-[#5b9bd5] font-semibold">
                      {weeks} أسبوع
                    </p>
                  )}
                </div>
                {!sem.isActive && (
                  <button
                    onClick={e => { e.stopPropagation(); handleSetActive(sem); }}
                    className="mt-2 text-[10px] text-[#5b9bd5] underline hover:no-underline"
                  >
                    تعيين كفصل نشط
                  </button>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Detail panel — only if a semester is selected */}
      {selectedSem && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5b9bd5]/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#5b9bd5]" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900">
                  {selectedSem.label || SEMESTER_LABELS[selectedSem.semesterNumber] || `الفصل ${selectedSem.semesterNumber}`}
                </h2>
                <p className="text-xs text-gray-400">{selectedSem.yearLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {([
                  { id: "weeks",  label: "الأسابيع",  icon: CalendarRange },
                  { id: "events", label: "الأحداث",   icon: CalendarDays },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}>
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
              {activeTab === "events" && (
                <button
                  onClick={() => setEvtModal({ open: true })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5b9bd5] text-white rounded-xl text-xs font-bold hover:bg-[#4a8bc4] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  حدث
                </button>
              )}
            </div>
          </div>

          {/* Weeks tab */}
          {activeTab === "weeks" && (
            <>
              {!selectedSem.startDate || !selectedSem.endDate ? (
                <div className="py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">حدد تاريخ بداية ونهاية الفصل لعرض الأسابيع</p>
                  <button
                    onClick={() => setSemModal({ open: true, initial: selectedSem })}
                    className="mt-3 text-xs text-[#5b9bd5] underline"
                  >
                    تعديل الفصل
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-right py-2.5 px-5 font-bold text-gray-600 text-xs w-16">الأسبوع</th>
                        <th className="text-right py-2.5 px-5 font-bold text-gray-600 text-xs">من</th>
                        <th className="text-right py-2.5 px-5 font-bold text-gray-600 text-xs">إلى</th>
                        <th className="text-right py-2.5 px-5 font-bold text-gray-600 text-xs">الأحداث</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {weekWithEvents.map(w => (
                        <tr key={w.num} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-5">
                            <div className="w-7 h-7 rounded-full bg-[#5b9bd5]/10 text-[#5b9bd5] text-xs font-black flex items-center justify-center">
                              {w.num}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-xs text-gray-700">{fmtDate(w.start)}</td>
                          <td className="py-3 px-5 text-xs text-gray-700">{fmtDate(w.end)}</td>
                          <td className="py-3 px-5">
                            <div className="flex flex-wrap gap-1">
                              {w.events.length === 0 ? (
                                <span className="text-[10px] text-gray-300">—</span>
                              ) : (
                                w.events.map((e: any) => {
                                  const et = EVENT_TYPES[e.eventType] ?? EVENT_TYPES.other;
                                  return (
                                    <span key={e.id}
                                      className={clsx("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", et.bg)}>
                                      <et.icon className="w-2.5 h-2.5" />
                                      {e.title}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Events tab */}
          {activeTab === "events" && (
            <>
              {evtLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 font-medium">لا توجد أحداث لهذا الفصل</p>
                  <button
                    onClick={() => setEvtModal({ open: true })}
                    className="mt-3 px-4 py-2 bg-[#5b9bd5] text-white rounded-xl text-xs font-bold hover:bg-[#4a8bc4]"
                  >
                    إضافة حدث
                  </button>
                </div>
              ) : (
                <div>
                  {/* Event type legend */}
                  <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-50 bg-gray-50/40">
                    {Object.entries(EVENT_TYPES).map(([k, v]) => {
                      const cnt = events.filter((e: any) => e.eventType === k).length;
                      if (!cnt) return null;
                      return (
                        <span key={k} className={clsx("flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border", v.bg)}>
                          <v.icon className="w-3 h-3" />
                          {v.label} ({cnt})
                        </span>
                      );
                    })}
                  </div>

                  <div className="divide-y divide-gray-50">
                    {events.map((e: any) => {
                      const et = EVENT_TYPES[e.eventType] ?? EVENT_TYPES.other;
                      return (
                        <div key={e.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                          <div className={clsx("p-2 rounded-xl border shrink-0 mt-0.5", et.bg)}>
                            <et.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-900">{e.title}</span>
                              {e.affectsAttendance && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
                                  إجازة رسمية
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{dateRange(e.startDate, e.endDate)}</p>
                            {e.description && (
                              <p className="text-xs text-gray-400 mt-1">{e.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setEvtModal({ open: true, initial: e })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#5b9bd5] hover:bg-[#5b9bd5]/10 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteEvt(e.id)} disabled={deletingEvtId === e.id}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              {deletingEvtId === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {semModal.open && (
        <SemesterModal
          initial={semModal.initial}
          onClose={() => setSemModal({ open: false })}
          onSaved={() => { setSemModal({ open: false }); refetchSems(); }}
        />
      )}
      {evtModal.open && (
        <EventModal
          initial={evtModal.initial}
          semesterId={selectedSem?.id}
          onClose={() => setEvtModal({ open: false })}
          onSaved={() => { setEvtModal({ open: false }); refetchEvts(); }}
        />
      )}
    </div>
  );
}
