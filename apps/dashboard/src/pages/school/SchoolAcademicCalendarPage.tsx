import { useState, useMemo } from "react";
import {
  CalendarDays, Plus, Edit2, Trash2, Loader2, CheckCircle2, X,
  ChevronLeft, ChevronRight, Flag, BookOpen, PartyPopper, Star,
  CalendarRange, AlertCircle, GraduationCap, Layers, Download,
  MapPin, Clock, Wand2,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { PageFAQ } from "@/components/school/PageFAQ";

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

// ─────────────────────────────────────────────
// التقويم الدراسي الرسمي 1446-1447هـ
// ─────────────────────────────────────────────

const OFFICIAL_CALENDAR_1446_1447 = {
  label: "العام الدراسي 1446-1447هـ / 2025-2026م",
  semesters: [
    {
      yearLabel: "1446-1447",
      semesterNumber: 1,
      label: "الفصل الدراسي الأول",
      startDate: "2025-08-24",
      endDate: "2026-01-08",
      events: [
        { title: "بداية الدراسة للطلاب",                 eventType: "other",       startDate: "2025-08-24",                           affectsAttendance: false, description: "1 ربيع الأول 1447هـ" },
        { title: "إجازة اليوم الوطني",                   eventType: "national_day", startDate: "2025-09-23",                           affectsAttendance: true,  description: "1 ربيع الآخر 1447هـ" },
        { title: "إجازة نهاية أسبوع مطولة (الأولى)",     eventType: "holiday",      startDate: "2025-10-12",                           affectsAttendance: true,  description: "20 ربيع الآخر 1447هـ" },
        { title: "إجازة الخريف",                         eventType: "holiday",      startDate: "2025-11-21", endDate: "2025-11-29",     affectsAttendance: true,  description: "30 جمادى الأولى - 8 جمادى الآخرة 1447هـ" },
        { title: "إجازة نهاية أسبوع مطولة (الثانية)",    eventType: "holiday",      startDate: "2025-12-11", endDate: "2025-12-14",     affectsAttendance: true,  description: "20-23 جمادى الآخرة 1447هـ" },
        { title: "إجازة منتصف العام الدراسي",             eventType: "holiday",      startDate: "2026-01-09", endDate: "2026-01-17",     affectsAttendance: true,  description: "20-28 رجب 1447هـ" },
      ],
    },
    {
      yearLabel: "1446-1447",
      semesterNumber: 2,
      label: "الفصل الدراسي الثاني",
      startDate: "2026-01-18",
      endDate: "2026-06-25",
      events: [
        { title: "بداية الفصل الدراسي الثاني",            eventType: "other",        startDate: "2026-01-18",                           affectsAttendance: false, description: "29 رجب 1447هـ" },
        { title: "إجازة يوم التأسيس",                    eventType: "national_day", startDate: "2026-02-22",                           affectsAttendance: true,  description: "5 رمضان 1447هـ" },
        { title: "إجازة عيد الفطر المبارك",               eventType: "holiday",      startDate: "2026-03-05", endDate: "2026-03-28",     affectsAttendance: true,  description: "16 رمضان - 9 شوال 1447هـ" },
        { title: "يوم العَلَم السعودي",                   eventType: "national_day", startDate: "2026-03-11",                           affectsAttendance: false, description: "22 رمضان 1447هـ (ضمن إجازة العيد)" },
        { title: "العودة للدراسة بعد عيد الفطر",           eventType: "other",        startDate: "2026-03-29",                           affectsAttendance: false, description: "10 شوال 1447هـ" },
        { title: "إجازة عيد الأضحى المبارك",              eventType: "holiday",      startDate: "2026-05-22", endDate: "2026-06-01",     affectsAttendance: true,  description: "5-15 ذي الحجة 1447هـ" },
        { title: "العودة للدراسة بعد عيد الأضحى",          eventType: "other",        startDate: "2026-06-02",                           affectsAttendance: false, description: "16 ذي الحجة 1447هـ" },
        { title: "إجازة نهاية العام الدراسي",              eventType: "holiday",      startDate: "2026-06-25",                           affectsAttendance: true,  description: "10 محرم 1448هـ" },
      ],
    },
  ],
};

const OFFICIAL_CALENDAR_1447_1448 = {
  label: "العام الدراسي 1447-1448هـ / 2026-2027م",
  semesters: [
    {
      yearLabel: "1447-1448",
      semesterNumber: 1,
      label: "الفصل الدراسي الأول",
      startDate: "2026-08-16",
      endDate: "2026-12-31",
      events: [
        { title: "بداية الدراسة للطلاب",              eventType: "other",        startDate: "2026-08-16",                           affectsAttendance: false, description: "1 صفر 1448هـ" },
        { title: "إجازة اليوم الوطني",                eventType: "national_day", startDate: "2026-09-23",                           affectsAttendance: true,  description: "8 ربيع الأول 1448هـ" },
        { title: "إجازة الخريف",                      eventType: "holiday",      startDate: "2026-11-08", endDate: "2026-11-14",     affectsAttendance: true,  description: "نوفمبر 2026م" },
        { title: "إجازة منتصف العام الدراسي",          eventType: "holiday",      startDate: "2027-01-01", endDate: "2027-01-09",     affectsAttendance: true,  description: "مطلع عام 2027م" },
      ],
    },
    {
      yearLabel: "1447-1448",
      semesterNumber: 2,
      label: "الفصل الدراسي الثاني",
      startDate: "2027-01-10",
      endDate: "2027-06-10",
      events: [
        { title: "بداية الفصل الدراسي الثاني",         eventType: "other",        startDate: "2027-01-10",                           affectsAttendance: false, description: "يناير 2027م" },
        { title: "إجازة يوم التأسيس",                 eventType: "national_day", startDate: "2027-02-22",                           affectsAttendance: true,  description: "22 فبراير 2027م" },
        { title: "إجازة عيد الفطر المبارك",            eventType: "holiday",      startDate: "2027-03-13", endDate: "2027-04-04",     affectsAttendance: true,  description: "رمضان / شوال 1448هـ (تقريبي)" },
        { title: "إجازة عيد الأضحى المبارك",           eventType: "holiday",      startDate: "2027-05-08", endDate: "2027-05-20",     affectsAttendance: true,  description: "ذو الحجة 1448هـ (تقريبي)" },
        { title: "إجازة نهاية العام الدراسي",           eventType: "holiday",      startDate: "2027-06-10",                           affectsAttendance: true,  description: "نهاية العام الدراسي 1447-1448هـ" },
      ],
    },
  ],
};

const OFFICIAL_CALENDARS: Record<string, typeof OFFICIAL_CALENDAR_1446_1447> = {
  "1446-1447": OFFICIAL_CALENDAR_1446_1447,
  "1447-1448": OFFICIAL_CALENDAR_1447_1448,
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("ar-SA", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtHijri(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-arab", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function hijriRange(start: string, end?: string | null): string {
  if (!end || end === start) return fmtHijri(start);
  return `${fmtHijri(start)} — ${fmtHijri(end)}`;
}

function dateRange(start: string, end?: string | null): string {
  if (!end || end === start) return fmtDate(start);
  return `${fmtDate(start)} — ${fmtDate(end)}`;
}

// هل الإجازة تغطي الأسبوع بالكامل؟ (أحد → خميس)
function isFullHolidayWeek(event: any, week: { start: string; end: string }): boolean {
  const es = event.startDate;
  const ee = event.endDate ?? event.startDate;
  // الحدث يغطي بداية الأسبوع (الأحد) ونهايته (الخميس على الأقل)
  return es <= week.start && ee >= new Date(new Date(week.end + "T00:00:00").getTime() - 2 * 86400000).toISOString().slice(0, 10);
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
// Saudi School Directorates — مواقيت الدوام
// ─────────────────────────────────────────────

type SeasonSchedule = {
  start: string; end: string;
  periods: number; periodMins: number;
  breakMins: number; breakAfter: number;
};
type DirectorateData = {
  city: string; region: string;
  winter: SeasonSchedule; summer: SeasonSchedule; ramadan: SeasonSchedule;
};

// Helper to build a SeasonSchedule
function sched(start: string, end: string, periods: number, periodMins: number, breakMins: number, breakAfter: number): SeasonSchedule {
  return { start, end, periods, periodMins, breakMins, breakAfter };
}

// المواقيت الرسمية لعام 1446-1447 حسب إدارات التعليم
// المصدر: إعلانات إدارات التعليم + وكالة الأنباء السعودية

// شتاء: 7 حصص × 45 دقيقة + فسحة 30 دقيقة بعد الحصة 3
const W_RYD  = sched("07:00","12:45", 7, 45, 30, 3);  // الرياض
const W_MCK  = sched("07:30","13:15", 7, 45, 30, 3);  // مكة / جدة / الطائف / القصيم / عسير / نجران / الباحة
const W_EST  = sched("07:15","13:00", 7, 45, 30, 3);  // الشرقية / جيزان
const W_HBD  = sched("07:45","13:30", 7, 45, 30, 3);  // الحدود الشمالية
const W_NRT  = sched("08:00","13:45", 7, 45, 30, 3);  // تبوك / الجوف
const W_MED  = sched("07:30","13:15", 7, 45, 30, 3);  // المدينة المنورة

// صيف: 6 حصص × 45 دقيقة + فسحة 30 دقيقة بعد الحصة 3
const S_RYD  = sched("06:30","11:30", 6, 45, 30, 3);  // الرياض / الشرقية / القصيم
const S_MCK  = sched("07:00","12:00", 6, 45, 30, 3);  // مكة / جدة / المدينة / عسير / نجران / الباحة / الجوف / الطائف
const S_HIL  = sched("06:45","11:45", 6, 45, 30, 3);  // حائل / الحدود الشمالية / جيزان
const S_TBK  = sched("07:15","12:15", 6, 45, 30, 3);  // تبوك

// رمضان: 4 حصص × 35 دقيقة + فسحة 15 دقيقة بعد الحصة 2
const R_RYD  = sched("09:00","11:35", 4, 35, 15, 2);  // الرياض / مكة / جدة / الطائف / الباحة
const R_MED  = sched("09:30","12:05", 4, 35, 15, 2);  // المدينة / الشرقية / عسير / تبوك / حائل / الجوف / جيزان
const R_QSM  = sched("10:00","12:35", 4, 35, 15, 2);  // القصيم / الحدود الشمالية / نجران

const DIRECTORATES: DirectorateData[] = [
  // ── الرياض
  { city:"الرياض",           region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"شمال الرياض",      region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"جنوب الرياض",      region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"الخرج",            region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"الدوادمي",         region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"القويعية",         region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"وادي الدواسر",     region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"الأفلاج",          region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"المجمعة",          region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  { city:"الزلفي",           region:"إدارة تعليم الرياض",          winter:W_RYD,  summer:S_RYD,  ramadan:R_RYD  },
  // ── مكة المكرمة
  { city:"مكة المكرمة",      region:"إدارة تعليم مكة المكرمة",     winter:W_MCK,  summer:S_MCK,  ramadan:R_RYD  },
  { city:"جدة",              region:"إدارة تعليم جدة",             winter:W_MCK,  summer:S_MCK,  ramadan:R_RYD  },
  { city:"الطائف",           region:"إدارة تعليم الطائف",          winter:W_MCK,  summer:S_MCK,  ramadan:R_RYD  },
  { city:"القنفذة",          region:"إدارة تعليم القنفذة",         winter:W_MCK,  summer:S_MCK,  ramadan:R_RYD  },
  { city:"رابغ",             region:"إدارة تعليم رابغ",            winter:W_MCK,  summer:S_MCK,  ramadan:R_RYD  },
  { city:"الليث",            region:"إدارة تعليم الليث",           winter:W_MCK,  summer:S_MCK,  ramadan:R_RYD  },
  // ── المدينة المنورة
  { city:"المدينة المنورة",  region:"إدارة تعليم المدينة المنورة", winter:W_MED,  summer:S_MCK,  ramadan:R_MED  },
  { city:"ينبع",             region:"إدارة تعليم ينبع",            winter:W_MED,  summer:S_MCK,  ramadan:R_MED  },
  { city:"العلا",            region:"إدارة تعليم العلا",           winter:W_MED,  summer:S_MCK,  ramadan:R_MED  },
  { city:"المهد",            region:"إدارة تعليم المهد",           winter:W_MED,  summer:S_MCK,  ramadan:R_MED  },
  // ── القصيم
  { city:"بريدة",            region:"إدارة تعليم القصيم",          winter:W_MCK,  summer:S_RYD,  ramadan:R_QSM  },
  { city:"عنيزة",            region:"إدارة تعليم القصيم",          winter:W_MCK,  summer:S_RYD,  ramadan:R_QSM  },
  { city:"الرس",             region:"إدارة تعليم القصيم",          winter:W_MCK,  summer:S_RYD,  ramadan:R_QSM  },
  // ── المنطقة الشرقية
  { city:"الدمام",           region:"إدارة تعليم الشرقية",         winter:W_EST,  summer:S_RYD,  ramadan:R_MED  },
  { city:"الأحساء",          region:"إدارة تعليم الأحساء",         winter:W_EST,  summer:S_RYD,  ramadan:R_MED  },
  { city:"الجبيل",           region:"إدارة تعليم الشرقية",         winter:W_EST,  summer:S_RYD,  ramadan:R_MED  },
  { city:"القطيف",           region:"إدارة تعليم الشرقية",         winter:W_EST,  summer:S_RYD,  ramadan:R_MED  },
  { city:"حفر الباطن",       region:"إدارة تعليم حفر الباطن",      winter:W_EST,  summer:S_RYD,  ramadan:R_MED  },
  { city:"الخبر",            region:"إدارة تعليم الشرقية",         winter:W_EST,  summer:S_RYD,  ramadan:R_MED  },
  // ── عسير
  { city:"أبها",             region:"إدارة تعليم عسير",            winter:W_MCK,  summer:S_MCK,  ramadan:R_MED  },
  { city:"خميس مشيط",        region:"إدارة تعليم عسير",            winter:W_MCK,  summer:S_MCK,  ramadan:R_MED  },
  { city:"بيشة",             region:"إدارة تعليم عسير",            winter:W_MCK,  summer:S_MCK,  ramadan:R_MED  },
  { city:"النماص",           region:"إدارة تعليم عسير",            winter:W_MCK,  summer:S_MCK,  ramadan:R_MED  },
  { city:"محايل عسير",       region:"إدارة تعليم محايل عسير",      winter:W_MCK,  summer:S_MCK,  ramadan:R_MED  },
  // ── تبوك
  { city:"تبوك",             region:"إدارة تعليم تبوك",            winter:W_NRT,  summer:S_TBK,  ramadan:R_MED  },
  { city:"الوجه",            region:"إدارة تعليم تبوك",            winter:W_NRT,  summer:S_TBK,  ramadan:R_MED  },
  { city:"تيماء",            region:"إدارة تعليم تبوك",            winter:W_NRT,  summer:S_TBK,  ramadan:R_MED  },
  // ── حائل
  { city:"حائل",             region:"إدارة تعليم حائل",            winter:W_MCK,  summer:S_HIL,  ramadan:R_MED  },
  { city:"بقعاء",            region:"إدارة تعليم حائل",            winter:W_MCK,  summer:S_HIL,  ramadan:R_MED  },
  // ── الجوف
  { city:"سكاكا",            region:"إدارة تعليم الجوف",           winter:W_NRT,  summer:S_MCK,  ramadan:R_MED  },
  { city:"دومة الجندل",      region:"إدارة تعليم الجوف",           winter:W_NRT,  summer:S_MCK,  ramadan:R_MED  },
  // ── الحدود الشمالية
  { city:"عرعر",             region:"إدارة تعليم الحدود الشمالية", winter:W_HBD,  summer:S_HIL,  ramadan:R_QSM  },
  { city:"رفحاء",            region:"إدارة تعليم الحدود الشمالية", winter:W_HBD,  summer:S_HIL,  ramadan:R_QSM  },
  { city:"طريف",             region:"إدارة تعليم الحدود الشمالية", winter:W_HBD,  summer:S_HIL,  ramadan:R_QSM  },
  // ── جيزان
  { city:"جيزان",            region:"إدارة تعليم جيزان",           winter:W_EST,  summer:S_HIL,  ramadan:R_MED  },
  { city:"أبو عريش",         region:"إدارة تعليم جيزان",           winter:W_EST,  summer:S_HIL,  ramadan:R_MED  },
  { city:"صبيا",             region:"إدارة تعليم جيزان",           winter:W_EST,  summer:S_HIL,  ramadan:R_MED  },
  { city:"الدرب",            region:"إدارة تعليم جيزان",           winter:W_EST,  summer:S_HIL,  ramadan:R_MED  },
  // ── نجران
  { city:"نجران",            region:"إدارة تعليم نجران",           winter:W_MCK,  summer:S_MCK,  ramadan:R_QSM  },
  { city:"شرورة",            region:"إدارة تعليم نجران",           winter:W_MCK,  summer:S_MCK,  ramadan:R_QSM  },
  // ── الباحة
  { city:"الباحة",           region:"إدارة تعليم الباحة",          winter:W_MCK,  summer:S_MCK,  ramadan:R_RYD  },
  { city:"بلجرشي",           region:"إدارة تعليم الباحة",          winter:W_MCK,  summer:S_MCK,  ramadan:R_RYD  },
];

function buildPeriodsFromSchedule(s: SeasonSchedule) {
  const periods: Array<{ periodNumber: number; label: string; startTime: string; endTime: string; isBreak: boolean }> = [];
  const addMinutes = (t: string, m: number) => {
    const [h, min] = t.split(":").map(Number);
    const total = h * 60 + min + m;
    return `${String(Math.floor(total / 60) % 24).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
  };
  const arabicNums = ["","الأولى","الثانية","الثالثة","الرابعة","الخامسة","السادسة","السابعة","الثامنة"];
  let cur = s.start;
  let pn = 1;
  for (let i = 1; i <= s.periods; i++) {
    const end = addMinutes(cur, s.periodMins);
    periods.push({ periodNumber: pn++, label: `الحصة ${arabicNums[i] ?? i}`, startTime: cur, endTime: end, isBreak: false });
    cur = end;
    if (i === s.breakAfter) {
      const bEnd = addMinutes(cur, s.breakMins);
      periods.push({ periodNumber: pn++, label: "الفسحة", startTime: cur, endTime: bEnd, isBreak: true });
      cur = bEnd;
    }
  }
  return periods;
}

// ─────────────────────────────────────────────
// School Year Setup Modal — إعداد العام الدراسي
// ─────────────────────────────────────────────

const SEASON_LABELS: Record<string, string> = {
  winter: "الدوام الشتوي",
  summer: "الدوام الصيفي",
  ramadan: "دوام رمضان",
};
const SEASON_COLORS: Record<string, string> = {
  winter: "border-[#5b9bd5] bg-[#5b9bd5]/5",
  summer: "border-amber-300 bg-amber-50",
  ramadan: "border-emerald-300 bg-emerald-50",
};
const SEASON_TITLE_COLORS: Record<string, string> = {
  winter: "text-[#5b9bd5]",
  summer: "text-amber-600",
  ramadan: "text-emerald-700",
};

function SchoolYearSetupModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<1|2|3>(1);
  const [yearKey, setYearKey] = useState<"1446-1447"|"1447-1448">("1447-1448");
  const [city, setCity] = useState("");
  const [schedules, setSchedules] = useState<Record<string, SeasonSchedule>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const calendar = OFFICIAL_CALENDARS[yearKey];
  const directorate = DIRECTORATES.find(d => d.city === city);

  const goToStep2 = () => {
    if (!directorate) return;
    setSchedules({
      winter: { ...directorate.winter },
      summer: { ...directorate.summer },
      ramadan: { ...directorate.ramadan },
    });
    setStep(2);
  };

  const updateSchedule = (season: string, key: keyof SeasonSchedule, val: string | number) => {
    setSchedules(prev => ({ ...prev, [season]: { ...prev[season], [key]: typeof val === "string" ? val : Number(val) } }));
  };

  const addProgress = (msg: string) => setProgress(prev => [...prev, msg]);

  const handleSetup = async () => {
    setRunning(true); setErr(""); setProgress([]);
    try {
      // 0. تحقق من وجود الفصول الدراسية مسبقاً
      addProgress("التحقق من البيانات الموجودة...");
      const existingRes = await schoolApi.getSemesters() as any;
      const existingSems: any[] = existingRes?.data ?? [];
      const alreadyExists = existingSems.some((s: any) => s.yearLabel === yearKey);

      // 1. حفظ إعدادات الدوام الشتوي
      addProgress("حفظ إعدادات الدوام...");
      const settingsRes = await schoolApi.getSettings() as any;
      const settingsData = settingsRes?.data ?? {};
      await schoolApi.saveSettings({
        ...settingsData,
        sessionStartTime:      schedules.summer.start,
        sessionEndTime:        schedules.summer.end,
        periodDurationMinutes: schedules.summer.periodMins,
        breakDurationMinutes:  schedules.summer.breakMins,
        numberOfPeriods:       schedules.summer.periods,
        sessionType:           "summer",
        schoolRegion:          directorate?.region ?? settingsData?.schoolRegion,
      });

      // 2. إنشاء الفصلين الدراسيين والأحداث (تخطّ إذا كانت موجودة)
      const semIds: string[] = [];
      if (alreadyExists) {
        addProgress(`الفصول الدراسية لعام ${yearKey} موجودة مسبقاً — تم تخطي الإنشاء`);
        const existing = existingSems.filter((s: any) => s.yearLabel === yearKey);
        existing.sort((a: any, b: any) => a.semesterNumber - b.semesterNumber);
        existing.forEach((s: any) => semIds.push(s.id));
      } else {
        for (const sem of calendar.semesters) {
          addProgress(`إنشاء ${sem.label}...`);
          const res = await schoolApi.createSemester({
            yearLabel:      sem.yearLabel,
            semesterNumber: sem.semesterNumber,
            label:          sem.label,
            startDate:      sem.startDate,
            endDate:        sem.endDate,
          });
          const semId: string = (res as any)?.data?.id ?? (res as any)?.id;
          semIds.push(semId);
          addProgress(`إضافة أحداث ${sem.label}...`);
          for (const evt of sem.events) {
            await schoolApi.createSchoolEvent({
              semesterId:        semId,
              title:             evt.title,
              eventType:         evt.eventType,
              startDate:         evt.startDate,
              endDate:           (evt as any).endDate,
              description:       evt.description,
              affectsAttendance: evt.affectsAttendance,
            });
          }
        }
        if (semIds[0]) await schoolApi.updateSemester(semIds[0], { isActive: true });
      }

      // 3. إنشاء قوالب الدوام (شتوي + صيفي + رمضان)
      const seasons: Array<{ key: string; name: string; type: "winter" | "summer" }> = [
        { key: "winter",  name: `الدوام الشتوي — ${city}`,  type: "winter" },
        { key: "summer",  name: `الدوام الصيفي — ${city}`,  type: "summer" },
        { key: "ramadan", name: `دوام رمضان — ${city}`,     type: "winter" },
      ];
      for (const s of seasons) {
        addProgress(`إنشاء قالب ${s.name}...`);
        const res = await schoolApi.createTimetableTemplate({
          name: s.name, sessionType: s.type,
          description: `مواقيت ${directorate?.region ?? city}`,
        });
        const tmplId: string = (res as any)?.data?.id ?? (res as any)?.id;
        const periods = buildPeriodsFromSchedule(schedules[s.key]);
        for (const p of periods) {
          await schoolApi.createTimetableTemplatePeriod(tmplId, p);
        }
      }

      setDone(true);
      addProgress("اكتمل الإعداد بنجاح");
      onDone();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("already")) {
        setErr(`الفصول الدراسية لعام ${yearKey} موجودة مسبقاً. يمكنك إدارتها من قائمة الفصول الدراسية.`);
      } else {
        setErr(msg || "حدث خطأ في الخادم، يرجى المحاولة لاحقاً");
      }
    } finally { setRunning(false); }
  };

  // Group cities by region for the dropdown
  const regionGroups = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const d of DIRECTORATES) {
      (map[d.region] ??= []).push(d.city);
    }
    return map;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">إعداد العام الدراسي {yearKey}هـ</h2>
              <p className="text-[10px] text-gray-400">التقويم + قوالب الدوام حسب مدينتك أو محافظتك</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1,2,3].map(n => (
                <div key={n} className={clsx(
                  "w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center",
                  step === n ? "bg-emerald-600 text-white" :
                  step > n  ? "bg-emerald-100 text-emerald-700" :
                  "bg-gray-100 text-gray-400"
                )}>{step > n ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}</div>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Select City */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Year selector */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-black text-gray-800 mb-2">
                  <CalendarRange className="w-4 h-4 text-[#5b9bd5]" /> العام الدراسي
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["1446-1447","1447-1448"] as const).map(y => (
                    <button key={y} onClick={() => setYearKey(y)}
                      className={clsx(
                        "px-4 py-2.5 rounded-xl border text-xs font-bold transition-all",
                        yearKey === y
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      )}>
                      {y}هـ
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-black text-gray-800 mb-2">
                  <MapPin className="w-4 h-4 text-emerald-600" /> اختر مدينتك أو محافظتك
                </label>
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
                >
                  <option value="">-- اختر المدينة / المحافظة --</option>
                  {Object.entries(regionGroups).map(([region, cities]) => (
                    <optgroup key={region} label={region}>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              {directorate && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs font-bold text-emerald-800">{directorate.region}</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-emerald-700">
                    <div><span className="font-bold">شتاء:</span> {directorate.winter.start} - {directorate.winter.end}</div>
                    <div><span className="font-bold">صيف:</span> {directorate.summer.start} - {directorate.summer.end}</div>
                    <div><span className="font-bold">رمضان:</span> {directorate.ramadan.start} - {directorate.ramadan.end}</div>
                  </div>
                </div>
              )}
              <div className="bg-[#5b9bd5]/5 border border-[#5b9bd5]/20 rounded-xl px-4 py-3">
                <p className="text-xs text-[#5b9bd5] font-medium">سيتم إنشاء:</p>
                <ul className="mt-1.5 space-y-1 text-xs text-gray-600">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> فصلان دراسيان + {calendar.semesters.reduce((a,s) => a+s.events.length, 0)} حدث رسمي</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 3 قوالب دوام (شتوي / صيفي / رمضان) بحصصها</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> إعدادات الدوام الصيفي كتوقيت افتراضي (بداية العام)</li>
                </ul>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={goToStep2} disabled={!city}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40">
                  التالي — مراجعة المواقيت
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review Schedules */}
          {step === 2 && directorate && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-medium">راجع مواقيت الدوام لمدينة <span className="text-gray-900 font-bold">{city}</span> وعدّل إذا لزم:</p>
              {(["winter","summer","ramadan"] as const).map(season => {
                const s = schedules[season];
                if (!s) return null;
                return (
                  <div key={season} className={clsx("border rounded-2xl p-4", SEASON_COLORS[season])}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className={clsx("w-4 h-4", SEASON_TITLE_COLORS[season])} />
                      <span className={clsx("text-sm font-black", SEASON_TITLE_COLORS[season])}>{SEASON_LABELS[season]}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">بداية الدوام</label>
                        <input type="time" value={s.start} onChange={e => updateSchedule(season,"start",e.target.value)} dir="ltr"
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-current bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">نهاية الدوام</label>
                        <input type="time" value={s.end} onChange={e => updateSchedule(season,"end",e.target.value)} dir="ltr"
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-current bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">عدد الحصص</label>
                        <input type="number" min={2} max={12} value={s.periods} onChange={e => updateSchedule(season,"periods",e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-current bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">مدة الحصة (دقيقة)</label>
                        <input type="number" min={20} max={90} value={s.periodMins} onChange={e => updateSchedule(season,"periodMins",e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-current bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">مدة الفسحة (دقيقة)</label>
                        <input type="number" min={0} max={45} value={s.breakMins} onChange={e => updateSchedule(season,"breakMins",e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-current bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">الفسحة بعد الحصة</label>
                        <input type="number" min={1} max={10} value={s.breakAfter} onChange={e => updateSchedule(season,"breakAfter",e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-current bg-white" />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {s.periods} حصص × {s.periodMins} دقيقة + فسحة {s.breakMins} دقيقة = نهاية الدوام ~{s.end}
                    </p>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(3)}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">
                  التالي — تأكيد الإعداد
                </button>
                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                  رجوع
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm & Execute */}
          {step === 3 && (
            <div className="space-y-4">
              {!running && !done && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                    <p className="text-xs font-black text-gray-700">ملخص الإعداد</p>
                    <div className="text-xs text-gray-600 space-y-1.5">
                      <p className="flex items-center gap-2"><MapPin className="w-3 h-3 text-[#5b9bd5]" /> <span className="font-medium">المدينة:</span> {city} — {directorate?.region}</p>
                      <p className="flex items-center gap-2"><CalendarDays className="w-3 h-3 text-[#5b9bd5]" /> <span className="font-medium">التقويم:</span> {calendar.label}</p>
                      <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-[#5b9bd5]" /> <span className="font-medium">الدوام الشتوي:</span> {schedules.winter?.start} - {schedules.winter?.end} ({schedules.winter?.periods} حصص)</p>
                      <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-amber-500" /> <span className="font-medium">الدوام الصيفي:</span> {schedules.summer?.start} - {schedules.summer?.end} ({schedules.summer?.periods} حصص)</p>
                      <p className="flex items-center gap-2"><Clock className="w-3 h-3 text-emerald-600" /> <span className="font-medium">دوام رمضان:</span> {schedules.ramadan?.start} - {schedules.ramadan?.end} ({schedules.ramadan?.periods} حصص)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      إذا كانت الفصول الدراسية لعام {yearKey} موجودة مسبقاً، سيتم تخطيها تلقائياً وإنشاء قوالب الدوام فقط.
                    </p>
                  </div>
                </div>
              )}

              {/* Progress */}
              {(running || done) && (
                <div className="space-y-1.5 bg-gray-50 rounded-2xl p-4 max-h-64 overflow-y-auto">
                  {progress.map((p, i) => (
                    <div key={i} className={clsx(
                      "flex items-center gap-2 text-xs",
                      i === progress.length - 1 && running ? "text-[#5b9bd5]" : "text-gray-500"
                    )}>
                      {i === progress.length - 1 && running
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      {p}
                    </div>
                  ))}
                </div>
              )}
              {err && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{err}</p>}

              <div className="flex gap-2 pt-1">
                {done ? (
                  <button onClick={onClose}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">
                    <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> تم الإعداد بنجاح</span>
                  </button>
                ) : (
                  <button onClick={handleSetup} disabled={running}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                    <span className="flex items-center justify-center gap-2">
                      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      {running ? "جارٍ الإعداد..." : "تنفيذ الإعداد"}
                    </span>
                  </button>
                )}
                {!running && !done && (
                  <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                    رجوع
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Import Official Calendar Modal
// ─────────────────────────────────────────────

function ImportCalendarModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [importing, setImporting] = useState(false);
  const [progress,  setProgress]  = useState("");
  const [done,      setDone]      = useState(false);
  const [err,       setErr]       = useState("");

  const handleImport = async () => {
    setImporting(true); setErr("");
    try {
      const semIds: string[] = [];
      for (const sem of OFFICIAL_CALENDAR_1446_1447.semesters) {
        setProgress(`إنشاء ${sem.label}...`);
        const res = await schoolApi.createSemester({
          yearLabel:      sem.yearLabel,
          semesterNumber: sem.semesterNumber,
          label:          sem.label,
          startDate:      sem.startDate,
          endDate:        sem.endDate,
        });
        const semId: string = (res as any)?.data?.id ?? (res as any)?.id;
        semIds.push(semId);
        setProgress(`إضافة أحداث ${sem.label}...`);
        for (const evt of sem.events) {
          await schoolApi.createSchoolEvent({
            semesterId:        semId,
            title:             evt.title,
            eventType:         evt.eventType,
            startDate:         evt.startDate,
            endDate:           (evt as any).endDate,
            description:       evt.description,
            affectsAttendance: evt.affectsAttendance,
          });
        }
      }
      // تفعيل الفصل الأول تلقائياً
      if (semIds[0]) await schoolApi.updateSemester(semIds[0], { isActive: true });
      setDone(true);
      setProgress("تم الاستيراد بنجاح");
      onImported();
    } catch (e: any) {
      setErr(e?.message ?? "حدث خطأ أثناء الاستيراد — تأكد من عدم وجود فصول بنفس السنة");
    } finally { setImporting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4" dir="rtl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5b9bd5]/10 flex items-center justify-center">
              <Download className="w-4 h-4 text-[#5b9bd5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">استيراد التقويم الدراسي الرسمي</h2>
              <p className="text-[10px] text-gray-400">{OFFICIAL_CALENDAR_1446_1447.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {OFFICIAL_CALENDAR_1446_1447.semesters.map((sem, si) => (
            <div key={si} className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className={clsx(
                "px-4 py-2.5 flex items-center gap-2",
                si === 0 ? "bg-[#5b9bd5]/8 border-b border-[#5b9bd5]/10" : "bg-amber-50/60 border-b border-amber-100"
              )}>
                <div className={clsx(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black",
                  si === 0 ? "bg-[#5b9bd5]/15 text-[#5b9bd5]" : "bg-amber-100 text-amber-700"
                )}>
                  {si + 1}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-gray-900">{sem.label}</span>
                  <span className="text-[10px] text-gray-400 mr-2">{sem.startDate} — {sem.endDate}</span>
                </div>
                <span className="text-[10px] text-gray-400">{sem.events.length} أحداث</span>
              </div>
              <div className="divide-y divide-gray-50">
                {sem.events.map((evt, ei) => {
                  const et = EVENT_TYPES[evt.eventType] ?? EVENT_TYPES.other;
                  return (
                    <div key={ei} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={clsx("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", et.bg)}>
                        <et.icon className="w-2.5 h-2.5" />
                        {et.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{evt.title}</p>
                        {evt.description && <p className="text-[10px] text-gray-400">{evt.description}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {(evt as any).endDate ? `${evt.startDate} ← ${(evt as any).endDate}` : evt.startDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              سيتم إنشاء فصلين دراسيين مع جميع الأحداث والإجازات. يمكنك تعديل أو حذف أي حدث بعد الاستيراد.
            </p>
          </div>

          {progress && (
            <div className={clsx(
              "flex items-center gap-2 text-sm px-3 py-2 rounded-xl",
              done ? "bg-emerald-50 text-emerald-700" : "bg-[#5b9bd5]/8 text-[#5b9bd5]"
            )}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {progress}
            </div>
          )}
          {err && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{err}</p>}
        </div>

        <div className="flex items-center gap-2 px-5 pb-5 pt-3 border-t border-gray-50">
          {done ? (
            <button onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> تم الاستيراد
            </button>
          ) : (
            <button onClick={handleImport} disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-bold hover:bg-[#4a8bc4] disabled:opacity-50">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              استيراد التقويم
            </button>
          )}
          {!done && (
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              إلغاء
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export function SchoolAcademicCalendarPage() {
  const [activeSemId,      setActiveSemId]      = useState<string | null>(null);
  const [semModal,         setSemModal]          = useState<{ open: boolean; initial?: any }>({ open: false });
  const [evtModal,         setEvtModal]          = useState<{ open: boolean; initial?: any }>({ open: false });
  const [deletingSemId,    setDeletingSemId]     = useState<string | null>(null);
  const [deletingEvtId,    setDeletingEvtId]     = useState<string | null>(null);
  const [activeTab,        setActiveTab]         = useState<"weeks" | "events">("weeks");
  const [showImportModal,  setShowImportModal]   = useState(false);
  const [showSetupModal,   setShowSetupModal]    = useState(false);

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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSetupModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            إعداد العام الدراسي
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#5b9bd5] text-[#5b9bd5] rounded-xl text-sm font-bold hover:bg-[#5b9bd5]/8 transition-colors"
          >
            <Download className="w-4 h-4" />
            استيراد التقويم فقط
          </button>
          <button
            onClick={() => setSemModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-bold hover:bg-[#4a8bc4] transition-colors"
          >
            <Plus className="w-4 h-4" />
            فصل دراسي
          </button>
        </div>
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
                    <div className="flex items-start gap-1">
                      <CalendarDays className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p>{hijriRange(sem.startDate, sem.endDate)}</p>
                        <p className="text-[10px] text-gray-400">{dateRange(sem.startDate, sem.endDate)}</p>
                      </div>
                    </div>
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
              ) : (() => {
                  // حساب الأسابيع الدراسية والإجازات
                  const teachingWeeks = weekWithEvents.filter(w =>
                    !w.events.some((e: any) => e.affectsAttendance && isFullHolidayWeek(e, w))
                  );
                  const holidayWeeks = weekWithEvents.filter(w =>
                    w.events.some((e: any) => e.affectsAttendance && isFullHolidayWeek(e, w))
                  );
                  return (
                    <>
                      {/* إحصاء سريع */}
                      <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5b9bd5]">
                          <div className="w-3 h-3 rounded-full bg-[#5b9bd5]" />
                          {weekWithEvents.length} أسبوع إجمالاً
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          {weekWithEvents.length - holidayWeeks.length} أسبوع دراسي
                        </div>
                        {holidayWeeks.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            {holidayWeeks.length} أسبوع إجازة
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                              <th className="text-right py-2.5 px-5 font-bold text-gray-600 text-xs w-24">الأسبوع</th>
                              <th className="text-right py-2.5 px-5 font-bold text-gray-600 text-xs">من</th>
                              <th className="text-right py-2.5 px-5 font-bold text-gray-600 text-xs">إلى</th>
                              <th className="text-right py-2.5 px-5 font-bold text-gray-600 text-xs">الأحداث</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {weekWithEvents.map(w => {
                              const hasFullHoliday = w.events.some((e: any) => e.affectsAttendance && isFullHolidayWeek(e, w));
                              const hasPartialHoliday = !hasFullHoliday && w.events.some((e: any) => e.affectsAttendance);
                              return (
                                <tr key={w.num}
                                  className={clsx(
                                    "transition-colors",
                                    hasFullHoliday  ? "bg-red-50/40 hover:bg-red-50/60"    :
                                    hasPartialHoliday? "bg-amber-50/30 hover:bg-amber-50/50" :
                                    "hover:bg-gray-50/50"
                                  )}>
                                  <td className="py-3 px-5">
                                    <div className="flex items-center gap-2">
                                      <div className={clsx(
                                        "w-7 h-7 rounded-full text-xs font-black flex items-center justify-center",
                                        hasFullHoliday   ? "bg-red-100 text-red-600"       :
                                        hasPartialHoliday? "bg-amber-100 text-amber-600"   :
                                        "bg-[#5b9bd5]/10 text-[#5b9bd5]"
                                      )}>
                                        {w.num}
                                      </div>
                                      {hasFullHoliday && (
                                        <span className="text-[9px] font-bold text-red-500 bg-red-100 border border-red-200 rounded-full px-1.5 py-0.5">إجازة</span>
                                      )}
                                      {hasPartialHoliday && !hasFullHoliday && (
                                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">جزئي</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-5 text-xs text-gray-700">
                                    <div className="font-medium">{fmtHijri(w.start)}</div>
                                    <div className="text-gray-400 text-[10px]">{fmtDate(w.start)}</div>
                                  </td>
                                  <td className="py-3 px-5 text-xs text-gray-700">
                                    <div className="font-medium">{fmtHijri(w.end)}</div>
                                    <div className="text-gray-400 text-[10px]">{fmtDate(w.end)}</div>
                                  </td>
                                  <td className="py-3 px-5">
                                    <div className="flex flex-wrap gap-1">
                                      {w.events.length === 0 ? (
                                        <span className="text-[10px] text-gray-300">دراسي</span>
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()
              }
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
                            <p className="text-xs font-medium text-gray-700 mt-0.5">{hijriRange(e.startDate, e.endDate)}</p>
                            <p className="text-[10px] text-gray-400">{dateRange(e.startDate, e.endDate)}</p>
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

      <PageFAQ pageId="academic-calendar" />

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
      {showImportModal && (
        <ImportCalendarModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { refetchSems(); setShowImportModal(false); }}
        />
      )}
      {showSetupModal && (
        <SchoolYearSetupModal
          onClose={() => setShowSetupModal(false)}
          onDone={() => { refetchSems(); setShowSetupModal(false); }}
        />
      )}
    </div>
  );
}
