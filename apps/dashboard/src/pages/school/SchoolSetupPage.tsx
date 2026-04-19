import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Loader2, X, Plus, Trash2,
  School, Users, Calendar, Clock, BookOpen, Link2, BarChart2,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ============================================================
// HELPERS
// ============================================================

function toArabicNum(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

const STAGE_GRADES: Record<string, string[]> = {
  "ابتدائي": [
    "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي",
    "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
  ],
  "متوسط": ["الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط"],
  "ثانوي": ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي"],
};

// Grade index within stage (for display as ١-١)
const GRADE_STAGE_INDEX: Record<string, number> = {};
Object.entries(STAGE_GRADES).forEach(([, grades]) => {
  grades.forEach((g, i) => { GRADE_STAGE_INDEX[g] = i + 1; });
});

function classroomLabel(grade: string, roomNum: number) {
  return `${toArabicNum(GRADE_STAGE_INDEX[grade] ?? 0)}-${toArabicNum(roomNum)}`;
}

// ============================================================
// STEP DATA TYPES
// ============================================================

interface CalendarPeriod {
  sessionType:     "winter" | "summer";
  startDate:       string;
  endDate:         string;
  dayStartTime:    string;
  periodCount:     number;
  periodDuration:  number;
  breakDuration:   number;
  breakAfterPeriod: number;
}

interface TeacherEntry {
  id:           string; // local temp id
  fullName:     string;
  subject:      string;
  classRoomIds: string[];
}

interface WizardData {
  // Step 1
  schoolName:     string;
  schoolGender:   string;
  educationLevel: string;
  // Step 2
  classroomsPerGrade: Record<string, number>;
  // Step 3
  weekCount: number;
  // Step 4
  calendar: CalendarPeriod[];
  // Step 5+6
  teachers: TeacherEntry[];
}

const DEFAULT_CALENDAR: CalendarPeriod = {
  sessionType:     "winter",
  startDate:       "",
  endDate:         "",
  dayStartTime:    "07:30",
  periodCount:     7,
  periodDuration:  45,
  breakDuration:   20,
  breakAfterPeriod: 4,
};

// ============================================================
// STEP INDICATOR
// ============================================================

const STEPS = [
  { label: "بيانات المدرسة", icon: School },
  { label: "الفصول",         icon: Users },
  { label: "الأسابيع",       icon: Calendar },
  { label: "التقويم",        icon: Clock },
  { label: "المعلمون",       icon: BookOpen },
  { label: "الإسناد",        icon: Link2 },
  { label: "المراجعة",       icon: BarChart2 },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              active  ? "bg-emerald-600 text-white shadow-sm" :
              done    ? "bg-emerald-100 text-emerald-700" :
                        "bg-gray-100 text-gray-400"
            }`}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-3 mx-0.5 rounded-full ${i < current ? "bg-emerald-300" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// STEP 1: School Info
// ============================================================

function Step1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">بيانات المدرسة</h2>
        <p className="text-sm text-gray-500 mt-0.5">المعلومات الأساسية للمدرسة</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم المدرسة <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={data.schoolName}
            onChange={(e) => onChange({ schoolName: e.target.value })}
            placeholder="مثال: مدرسة الملك عبدالله المتوسطة"
            className="w-full px-4 py-3 rounded-2xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">نوع المدرسة <span className="text-red-400">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            {["بنين", "بنات"].map((g) => (
              <button
                key={g}
                onClick={() => onChange({ schoolGender: g })}
                className={`py-3 rounded-2xl border text-sm font-semibold transition-all ${
                  data.schoolGender === g
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-gray-600 border-[#eef2f6] hover:border-emerald-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">المرحلة الدراسية <span className="text-red-400">*</span></label>
          <div className="grid grid-cols-3 gap-3">
            {["ابتدائي", "متوسط", "ثانوي"].map((s) => (
              <button
                key={s}
                onClick={() => onChange({ educationLevel: s, classroomsPerGrade: {} })}
                className={`py-3 rounded-2xl border text-sm font-semibold transition-all ${
                  data.educationLevel === s
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-gray-600 border-[#eef2f6] hover:border-emerald-300"
                }`}
              >
                {s === "ابتدائي" ? "ابتدائي" : s === "متوسط" ? "متوسط" : "ثانوي"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2: Classrooms per grade
// ============================================================

function Step2({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const grades = STAGE_GRADES[data.educationLevel] ?? [];

  const set = (grade: string, count: number) => {
    onChange({ classroomsPerGrade: { ...data.classroomsPerGrade, [grade]: Math.max(1, Math.min(20, count)) } });
  };

  const preview = grades.flatMap((g) => {
    const count = data.classroomsPerGrade[g] ?? 0;
    return Array.from({ length: count }, (_, i) => ({ grade: g, num: i + 1 }));
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">الفصول الدراسية</h2>
        <p className="text-sm text-gray-500 mt-0.5">حدد عدد الفصول لكل صف — ستُنشأ بصيغة ١-١، ١-٢، ٢-١...</p>
      </div>
      <div className="space-y-3">
        {grades.map((grade) => {
          const count = data.classroomsPerGrade[grade] ?? 1;
          const idx   = GRADE_STAGE_INDEX[grade] ?? 0;
          return (
            <div key={grade} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{grade}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {Array.from({ length: count }, (_, i) => classroomLabel(grade, i + 1)).join("، ")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => set(grade, count - 1)}
                  disabled={count <= 1}
                  className="w-8 h-8 rounded-xl border border-[#eef2f6] flex items-center justify-center text-gray-500 hover:bg-[#f8fafc] disabled:opacity-30 transition-colors"
                >
                  <span className="text-lg font-bold leading-none">-</span>
                </button>
                <span className="w-8 text-center text-sm font-bold tabular-nums">{toArabicNum(count)}</span>
                <button
                  onClick={() => set(grade, count + 1)}
                  className="w-8 h-8 rounded-xl border border-[#eef2f6] flex items-center justify-center text-gray-500 hover:bg-[#f8fafc] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {preview.length > 0 && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
          <p className="text-xs font-bold text-emerald-700 mb-2">معاينة الفصول ({toArabicNum(preview.length)} فصل)</p>
          <div className="flex flex-wrap gap-1.5">
            {preview.map(({ grade, num }) => (
              <span key={`${grade}-${num}`} className="text-xs font-semibold text-emerald-800 bg-white border border-emerald-200 rounded-lg px-2 py-0.5">
                {classroomLabel(grade, num)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 3: Academic weeks
// ============================================================

function Step3({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">الأسابيع الدراسية</h2>
        <p className="text-sm text-gray-500 mt-0.5">كم عدد الأسابيع في العام الدراسي؟</p>
      </div>
      <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-6">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => onChange({ weekCount: Math.max(10, data.weekCount - 1) })}
            className="w-12 h-12 rounded-2xl border border-[#eef2f6] flex items-center justify-center text-gray-500 hover:bg-[#f8fafc] transition-colors text-xl font-bold"
          >
            -
          </button>
          <div className="text-center">
            <p className="text-5xl font-black text-emerald-700 tabular-nums">{toArabicNum(data.weekCount)}</p>
            <p className="text-sm text-gray-500 mt-1">أسبوع دراسي</p>
          </div>
          <button
            onClick={() => onChange({ weekCount: Math.min(52, data.weekCount + 1) })}
            className="w-12 h-12 rounded-2xl border border-[#eef2f6] flex items-center justify-center text-gray-500 hover:bg-[#f8fafc] transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3 justify-center mt-5">
          {[30, 36, 40].map((n) => (
            <button
              key={n}
              onClick={() => onChange({ weekCount: n })}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                data.weekCount === n
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-600 border-[#eef2f6] hover:border-emerald-300"
              }`}
            >
              {toArabicNum(n)} أسبوع
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 4: Calendar
// ============================================================

function Step4({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const setCalendar = (index: number, field: keyof CalendarPeriod, value: any) => {
    const updated = data.calendar.map((c, i) => i === index ? { ...c, [field]: value } : c);
    onChange({ calendar: updated });
  };

  const addCalendar = () => {
    if (data.calendar.length >= 2) return;
    const existingTypes = data.calendar.map((c) => c.sessionType);
    const newType = existingTypes.includes("winter") ? "summer" : "winter";
    onChange({ calendar: [...data.calendar, { ...DEFAULT_CALENDAR, sessionType: newType }] });
  };

  const removeCalendar = (index: number) => {
    onChange({ calendar: data.calendar.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">التقويم الدراسي</h2>
          <p className="text-sm text-gray-500 mt-0.5">أوقات الحصص والجدول اليومي</p>
        </div>
        {data.calendar.length < 2 && (
          <button
            onClick={addCalendar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#eef2f6] text-xs font-semibold text-gray-600 hover:bg-[#f8fafc] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة فترة
          </button>
        )}
      </div>

      {data.calendar.map((cal, idx) => (
        <div key={idx} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["winter", "summer"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCalendar(idx, "sessionType", t)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    cal.sessionType === t
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-gray-50 text-gray-500 border-[#eef2f6]"
                  }`}
                >
                  {t === "winter" ? "شتوي" : "صيفي"}
                </button>
              ))}
            </div>
            {data.calendar.length > 1 && (
              <button onClick={() => removeCalendar(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">تاريخ البداية</label>
              <input type="date" value={cal.startDate} onChange={(e) => setCalendar(idx, "startDate", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">تاريخ النهاية</label>
              <input type="date" value={cal.endDate} onChange={(e) => setCalendar(idx, "endDate", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">وقت بداية اليوم</label>
              <input type="time" value={cal.dayStartTime} onChange={(e) => setCalendar(idx, "dayStartTime", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">عدد الحصص</label>
              <input type="number" min={3} max={10} value={cal.periodCount} onChange={(e) => setCalendar(idx, "periodCount", Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">مدة الحصة (دقيقة)</label>
              <input type="number" min={20} max={90} value={cal.periodDuration} onChange={(e) => setCalendar(idx, "periodDuration", Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">مدة الفسحة (دقيقة)</label>
              <input type="number" min={5} max={60} value={cal.breakDuration} onChange={(e) => setCalendar(idx, "breakDuration", Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">الفسحة بعد الحصة رقم</label>
              <select value={cal.breakAfterPeriod} onChange={(e) => setCalendar(idx, "breakAfterPeriod", Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none">
                {Array.from({ length: cal.periodCount - 1 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>بعد الحصة {toArabicNum(n)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// STEP 5: Teachers entry
// ============================================================

function Step5({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const [newName,    setNewName]    = useState("");
  const [newSubject, setNewSubject] = useState("");

  const subjects = [
    "رياضيات", "علوم", "لغتي", "اللغة العربية", "دراسات إسلامية",
    "اجتماعيات", "إنجليزي", "مهارات رقمية", "تربية فنية", "تربية بدنية",
    "فيزياء", "كيمياء", "أحياء", "حاسب آلي",
  ];

  const addTeacher = () => {
    if (!newName.trim() || !newSubject.trim()) return;
    const teacher: TeacherEntry = {
      id: `t_${Date.now()}`,
      fullName: newName.trim(),
      subject: newSubject.trim(),
      classRoomIds: [],
    };
    onChange({ teachers: [...data.teachers, teacher] });
    setNewName("");
  };

  const removeTeacher = (id: string) => {
    onChange({ teachers: data.teachers.filter((t) => t.id !== id) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">المعلمون</h2>
        <p className="text-sm text-gray-500 mt-0.5">أضف المعلمين مع مادتهم الأساسية</p>
      </div>

      {/* Add teacher form */}
      <div className="bg-gray-50 rounded-2xl border border-[#eef2f6] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">اسم المعلم</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTeacher()}
              placeholder="خالد محمد العتيبي"
              className="w-full px-3 py-2.5 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">المادة الأساسية</label>
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">اختر المادة</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__custom">أخرى...</option>
            </select>
          </div>
        </div>
        {newSubject === "__custom" && (
          <input
            type="text"
            placeholder="اكتب اسم المادة"
            onChange={(e) => setNewSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#eef2f6] text-sm bg-white focus:outline-none"
          />
        )}
        <button
          onClick={addTeacher}
          disabled={!newName.trim() || !newSubject.trim() || newSubject === "__custom"}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة معلم
        </button>
      </div>

      {/* Teachers list */}
      {data.teachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#eef2f6] py-10 text-center">
          <p className="text-sm text-gray-400">لم يتم إضافة أي معلم بعد</p>
          <p className="text-xs text-gray-400 mt-1">يمكنك المتابعة وإضافة المعلمين لاحقاً</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.teachers.map((t, i) => (
            <div key={t.id} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                  {toArabicNum(i + 1)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.fullName}</p>
                  <p className="text-xs text-emerald-600">{t.subject}</p>
                </div>
              </div>
              <button onClick={() => removeTeacher(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 6: Teacher-Classroom Assignment
// ============================================================

function Step6({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  // Build classroom list from classroomsPerGrade
  const grades  = STAGE_GRADES[data.educationLevel] ?? [];
  const allRooms = grades.flatMap((grade) => {
    const count = data.classroomsPerGrade[grade] ?? 0;
    return Array.from({ length: count }, (_, i) => ({
      id:    `local:${grade}:${i + 1}`,
      grade,
      num:   i + 1,
      label: classroomLabel(grade, i + 1),
    }));
  });

  const toggleRoom = (teacherId: string, roomId: string) => {
    onChange({
      teachers: data.teachers.map((t) => {
        if (t.id !== teacherId) return t;
        const ids = new Set(t.classRoomIds);
        if (ids.has(roomId)) ids.delete(roomId); else ids.add(roomId);
        return { ...t, classRoomIds: [...ids] };
      }),
    });
  };

  if (data.teachers.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">إسناد المعلمين للفصول</h2>
        </div>
        <div className="bg-white rounded-2xl border border-dashed border-[#eef2f6] py-12 text-center">
          <p className="text-sm text-gray-400">لم يتم إضافة معلمين في الخطوة السابقة</p>
          <p className="text-xs text-gray-400 mt-1">ارجع للخطوة السابقة وأضف المعلمين أولاً</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">إسناد المعلمين للفصول</h2>
        <p className="text-sm text-gray-500 mt-0.5">لكل معلم، حدد الفصول التي يدرسها</p>
      </div>

      <div className="space-y-4">
        {data.teachers.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                {t.fullName[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{t.fullName}</p>
                <p className="text-xs text-emerald-600">{t.subject}</p>
              </div>
              <span className="mr-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {t.classRoomIds.length > 0 ? `${toArabicNum(t.classRoomIds.length)} فصل` : "لم يُسند بعد"}
              </span>
            </div>

            {/* Grouped classrooms checkboxes */}
            <div className="space-y-2">
              {grades.map((grade) => {
                const rooms = allRooms.filter((r) => r.grade === grade);
                if (rooms.length === 0) return null;
                return (
                  <div key={grade}>
                    <p className="text-[10px] font-bold text-gray-400 mb-1.5">{grade}</p>
                    <div className="flex flex-wrap gap-2">
                      {rooms.map((room) => {
                        const checked = t.classRoomIds.includes(room.id);
                        return (
                          <label
                            key={room.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none ${
                              checked
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-gray-50 text-gray-600 border-[#eef2f6] hover:border-emerald-300 hover:bg-emerald-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRoom(t.id, room.id)}
                              className="sr-only"
                            />
                            {room.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STEP 7: Review
// ============================================================

function Step7({ data }: { data: WizardData }) {
  const grades     = STAGE_GRADES[data.educationLevel] ?? [];
  const totalRooms = grades.reduce((n, g) => n + (data.classroomsPerGrade[g] ?? 0), 0);

  const stats = [
    { label: "الفصول",   value: toArabicNum(totalRooms) },
    { label: "المعلمون", value: toArabicNum(data.teachers.length) },
    { label: "الأسابيع", value: toArabicNum(data.weekCount) },
    { label: "الفترات",  value: toArabicNum(data.calendar.length) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">مراجعة قبل الإنشاء</h2>
        <p className="text-sm text-gray-500 mt-0.5">تأكد من البيانات ثم اضغط إنشاء الهيكل الدراسي</p>
      </div>

      {/* School info */}
      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 space-y-2">
        <p className="text-sm font-bold text-emerald-900">{data.schoolName || "—"}</p>
        <div className="flex gap-3 text-xs text-emerald-700">
          <span>{data.schoolGender}</span>
          <span>·</span>
          <span>{data.educationLevel}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#eef2f6] p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Classrooms preview */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">الفصول المزمع إنشاؤها</p>
        <div className="flex flex-wrap gap-1.5">
          {grades.flatMap((g) =>
            Array.from({ length: data.classroomsPerGrade[g] ?? 0 }, (_, i) => (
              <span key={`${g}-${i}`} className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                {classroomLabel(g, i + 1)}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Teachers & assignments */}
      {data.teachers.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4">
          <p className="text-xs font-bold text-gray-700 mb-3">المعلمون والإسناد</p>
          <div className="space-y-2">
            {data.teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-gray-900">{t.fullName}</span>
                <span className="text-emerald-600">{t.subject}</span>
                <span className="text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {toArabicNum(t.classRoomIds.length)} فصل
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      {data.calendar.map((cal, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-4">
          <p className="text-xs font-bold text-gray-700 mb-2">جدول {cal.sessionType === "winter" ? "شتوي" : "صيفي"}</p>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
            <div>من: <span className="font-semibold">{cal.startDate || "—"}</span></div>
            <div>إلى: <span className="font-semibold">{cal.endDate || "—"}</span></div>
            <div>بداية: <span className="font-semibold">{cal.dayStartTime}</span></div>
            <div>الحصص: <span className="font-semibold">{toArabicNum(cal.periodCount)}</span></div>
            <div>مدة الحصة: <span className="font-semibold">{toArabicNum(cal.periodDuration)} د</span></div>
            <div>الفسحة: <span className="font-semibold">{toArabicNum(cal.breakDuration)} د</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export function SchoolSetupPage() {
  const navigate = useNavigate();
  const [step,     setStep]     = useState(0);
  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState("");

  const [data, setData] = useState<WizardData>({
    schoolName:         "",
    schoolGender:       "بنين",
    educationLevel:     "متوسط",
    classroomsPerGrade: { "الأول المتوسط": 2, "الثاني المتوسط": 2, "الثالث المتوسط": 2 },
    weekCount:          36,
    calendar:           [{ ...DEFAULT_CALENDAR }],
    teachers:           [],
  });

  // Update classroomsPerGrade when educationLevel changes
  useEffect(() => {
    const grades = STAGE_GRADES[data.educationLevel] ?? [];
    const perGrade: Record<string, number> = {};
    grades.forEach((g) => { perGrade[g] = data.classroomsPerGrade[g] ?? 2; });
    setData((d) => ({ ...d, classroomsPerGrade: perGrade }));
  }, [data.educationLevel]);

  const onChange = (partial: Partial<WizardData>) => {
    setData((d) => ({ ...d, ...partial }));
  };

  const canNext = () => {
    if (step === 0) return !!data.schoolName.trim() && !!data.schoolGender && !!data.educationLevel;
    if (step === 1) return Object.values(data.classroomsPerGrade).some((n) => n > 0);
    if (step === 2) return data.weekCount >= 1;
    if (step === 3) return data.calendar.length > 0;
    return true;
  };

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      // Build payload — teacher classRoomIds are local "local:grade:num" strings,
      // we need to pass classroomsPerGrade to the backend which will create rooms
      // and we match assignments by grade/num
      await schoolApi.completeSetup({
        schoolName:          data.schoolName,
        schoolGender:        data.schoolGender,
        educationLevel:      data.educationLevel,
        classroomsPerGrade:  data.classroomsPerGrade,
        weekCount:           data.weekCount,
        calendar:            data.calendar,
        teachers:            data.teachers.map((t) => ({
          fullName:     t.fullName,
          subject:      t.subject,
          classRoomIds: [], // teacher classrooms: assigned after rooms created by backend
          classroomLabels: t.classRoomIds, // pass local labels for matching
        })),
      });
      navigate("/school/day-monitor");
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ أثناء الإنشاء");
    } finally {
      setCreating(false);
    }
  };

  const STEP_COMPONENTS = [
    <Step1 key="1" data={data} onChange={onChange} />,
    <Step2 key="2" data={data} onChange={onChange} />,
    <Step3 key="3" data={data} onChange={onChange} />,
    <Step4 key="4" data={data} onChange={onChange} />,
    <Step5 key="5" data={data} onChange={onChange} />,
    <Step6 key="6" data={data} onChange={onChange} />,
    <Step7 key="7" data={data} />,
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#eef2f6] px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-black text-gray-900">معالج تهيئة النظام المدرسي</h1>
              <p className="text-xs text-gray-500 mt-0.5">الخطوة {toArabicNum(step + 1)} من {toArabicNum(STEPS.length)}</p>
            </div>
            <button
              onClick={() => navigate("/school/day-monitor")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              تخطي الآن
            </button>
          </div>
          <StepIndicator current={step} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {STEP_COMPONENTS[step]}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#eef2f6] px-6 py-4 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#eef2f6] text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </button>
          )}

          {error && <p className="flex-1 text-xs text-red-500 text-center">{error}</p>}

          <div className="flex-1" />

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {creating ? "جاري إنشاء الهيكل الدراسي..." : "إنشاء الهيكل الدراسي"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
