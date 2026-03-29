import { useState } from "react";
import {
  Plus, ShieldAlert, Settings2, Pencil, Trash2, CheckCircle2,
  XCircle, AlertTriangle, ChevronLeft, Circle,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";
import { fmtHijri } from "@/lib/utils";
import { PageFAQ } from "@/components/school/PageFAQ";

// ── Severity config ──────────────────────────────────────────

const SEVERITIES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: "منخفضة", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  medium: { label: "متوسطة", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  high:   { label: "مرتفعة", color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
};

const STATUSES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open:       { label: "مفتوحة",   color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  resolved:   { label: "محلولة",   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  cancelled:  { label: "ملغاة",    color: "text-gray-600",    bg: "bg-gray-100",   border: "border-gray-200" },
};

const SEVERITY_DEFAULT_DEGREE: Record<string, string> = {
  low: "1", medium: "3", high: "5",
};

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
];

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITIES[severity] ?? SEVERITIES.medium;
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", s.color, s.bg, s.border)}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status] ?? STATUSES.open;
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", s.color, s.bg, s.border)}>
      {s.label}
    </span>
  );
}

// ── Category Modal ───────────────────────────────────────────

function CategoryModal({
  open, onClose, editing, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: any | null;
  onSaved: () => void;
}) {
  const [name,          setName]          = useState(editing?.name          ?? "");
  const [description,   setDescription]   = useState(editing?.description   ?? "");
  const [severity,      setSeverity]      = useState(editing?.severity      ?? "medium");
  const [color,         setColor]         = useState(editing?.color         ?? "#f59e0b");
  const [defaultDegree, setDefaultDegree] = useState<string>(
    editing?.defaultDegree ?? SEVERITY_DEFAULT_DEGREE[editing?.severity ?? "medium"] ?? "3"
  );
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const handleSeverityChange = (sev: string) => {
    setSeverity(sev);
    // auto-suggest matching degree unless user has manually deviated
    setDefaultDegree(SEVERITY_DEFAULT_DEGREE[sev] ?? "1");
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("اسم التصنيف مطلوب"); return; }
    setSaving(true); setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim() || null, severity, color, defaultDegree };
      if (editing) {
        await schoolApi.updateViolationCategory(editing.id, payload);
      } else {
        await schoolApi.createViolationCategory(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "تعديل التصنيف" : "تصنيف جديد"}>
      <div className="space-y-4 p-4">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <XCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم التصنيف <span className="text-red-400">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: غياب متكرر"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="وصف اختياري للتصنيف"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">درجة الخطورة</label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => handleSeverityChange(sev)}
                className={clsx(
                  "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                  severity === sev
                    ? `${SEVERITIES[sev].bg} ${SEVERITIES[sev].color} ${SEVERITIES[sev].border}`
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {SEVERITIES[sev].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            الدرجة الافتراضية
            <span className="text-xs text-gray-400 font-normal mr-1">(تُقترح تلقائياً عند اختيار هذا التصنيف)</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {(["1","2","3","4","5"] as const).map((d) => {
              const cfg = DEGREES[d];
              const isSuggested = SEVERITY_DEFAULT_DEGREE[severity] === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDefaultDegree(d)}
                  className={clsx(
                    "relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-center transition-all",
                    defaultDegree === d
                      ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm font-semibold`
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {isSuggested && defaultDegree !== d && (
                    <span className="absolute -top-1.5 right-1 text-[8px] bg-amber-100 text-amber-600 rounded px-0.5 leading-tight">مقترح</span>
                  )}
                  <span className="text-xs font-bold">{cfg.label}</span>
                  <span className="text-[9px] leading-tight opacity-75">{cfg.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">اللون</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={clsx(
                  "w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-gray-800 scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer"
              title="لون مخصص"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إنشاء التصنيف"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Degree config ────────────────────────────────────────────

const DEGREES: Record<string, {
  label: string; sub: string;
  color: string; bg: string; border: string; iconBg: string;
  procedures: string[];
}> = {
  "1": {
    label: "درجة ١", sub: "تنبيه شفهي",
    color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", iconBg: "bg-blue-100",
    procedures: [
      "تنبيه الطالب شفهياً من قِبل المعلم أو المرشد الطلابي",
      "توضيح طبيعة المخالفة وأثرها على الطالب والبيئة المدرسية",
      "توثيق التنبيه في سجل الفصل",
      "متابعة سلوك الطالب خلال الأسبوع التالي",
    ],
  },
  "2": {
    label: "درجة ٢", sub: "إنذار كتابي",
    color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", iconBg: "bg-sky-100",
    procedures: [
      "إصدار إنذار كتابي رسمي موقّع من المرشد الطلابي ومدير المدرسة",
      "إشعار ولي الأمر هاتفياً بالمخالفة والإنذار الصادر",
      "تسجيل الإنذار في ملف الطالب الأكاديمي",
      "جلسة إرشادية للطالب مع المرشد الطلابي",
    ],
  },
  "3": {
    label: "درجة ٣", sub: "إخطار ولي الأمر",
    color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-100",
    procedures: [
      "استدعاء ولي الأمر رسمياً للمدرسة خلال ٤٨ ساعة",
      "توقيع ولي الأمر على إقرار بالعلم والالتزام بالتعديل السلوكي",
      "إحالة الطالب للمرشد الطلابي لوضع خطة متابعة أسبوعية",
      "تسجيل الإجراء كاملاً في ملف الطالب",
      "رفع تقرير للإدارة إذا تكررت المخالفة ذاتها",
    ],
  },
  "4": {
    label: "درجة ٤", sub: "توبيخ وحرمان",
    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", iconBg: "bg-orange-100",
    procedures: [
      "توبيخ رسمي أمام مجلس تأديبي يضم مدير المدرسة والمرشد الطلابي",
      "إشعار إدارة التعليم بالحالة التأديبية",
      "حرمان الطالب من المشاركة في الأنشطة المدرسية لمدة تحددها الإدارة",
      "استدعاء ولي الأمر وإطلاعه على قرار مجلس التأديب",
      "متابعة مكثفة من المرشد الطلابي بتقارير دورية",
      "وضع الطالب تحت الرقابة السلوكية المستمرة",
    ],
  },
  "5": {
    label: "درجة ٥", sub: "فصل انقطاعي",
    color: "text-red-700", bg: "bg-red-50", border: "border-red-200", iconBg: "bg-red-100",
    procedures: [
      "إيقاف الطالب انقطاعياً لمدة لا تتجاوز أسبوعاً بقرار من مدير المدرسة",
      "رفع تقرير تفصيلي لمدير التعليم خلال ٢٤ ساعة",
      "إشعار ولي الأمر رسمياً بقرار الفصل وأسبابه وأمد المدة",
      "تحويل الطالب للاستشارة النفسية أو الاجتماعية إذا اقتضى الأمر",
      "وضع خطة إعادة تأهيل وتكامل سلوكي قبل العودة",
      "متابعة صارمة بعد العودة مع تقارير أسبوعية لمدة شهر",
    ],
  },
};

function DegreeBadge({ degree }: { degree: string }) {
  const d = DEGREES[degree] ?? DEGREES["1"];
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", d.color, d.bg, d.border)}>
      {d.label}
    </span>
  );
}

// ── Violation Modal ──────────────────────────────────────────

function ViolationModal({
  open, onClose, editing, categories, classRooms, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: any | null;
  categories: any[];
  classRooms: any[];
  onSaved: () => void;
}) {
  const [studentId,     setStudentId]     = useState(editing?.studentId    ?? "");
  const [selectedName,  setSelectedName]  = useState(editing?.studentName  ?? "");
  const [categoryId,    setCategoryId]    = useState(editing?.categoryId   ?? "");
  const [description,   setDescription]  = useState(editing?.description  ?? "");
  const [degree,        setDegree]        = useState<string>(editing?.degree ?? "1");
  const [degreeAutoSet, setDegreeAutoSet] = useState(false);
  const [date,          setDate]          = useState(editing?.violationDate ?? new Date().toISOString().split("T")[0]);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [query,         setQuery]         = useState("");
  const [gradeFilter,   setGradeFilter]   = useState("");
  const [roomFilter,    setRoomFilter]    = useState("");
  const [listOpen,      setListOpen]      = useState(!editing);

  // ── Server-side student search ────────────────────────────
  const { data: stuData, loading: stuLoading } = useApi(
    () => schoolApi.listStudents({
      search:      query      || undefined,
      classRoomId: roomFilter || undefined,
      grade:       gradeFilter || undefined,
      limit:       "100",
    }),
    [query, roomFilter, gradeFilter]
  );
  const filtered: any[] = stuData?.data ?? [];

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    if (id) {
      const cat = categories.find((c) => c.id === id);
      if (cat?.defaultDegree) {
        setDegree(cat.defaultDegree);
        setDegreeAutoSet(true);
      }
    } else {
      setDegreeAutoSet(false);
    }
  };

  const handleDegreeClick = (d: string) => {
    setDegree(d);
    setDegreeAutoSet(false);
  };

  // Build grade list from classRooms
  const grades = Array.from(new Set(classRooms.map((cr: any) => cr.grade).filter(Boolean)));
  const roomsForGrade = gradeFilter
    ? classRooms.filter((cr: any) => cr.grade === gradeFilter)
    : classRooms;

  const selectStudent = (s: any) => {
    setStudentId(s.id);
    setSelectedName(s.fullName);
    setQuery("");
    setListOpen(false);
    setError(null);
  };

  const hijriLabel = (() => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-arab", {
        day: "2-digit", month: "long", year: "numeric",
      });
    } catch { return ""; }
  })();

  const handleSave = async () => {
    if (!studentId) { setError("يجب اختيار الطالب أولاً"); setListOpen(true); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        studentId,
        categoryId:    categoryId || null,
        description:   description.trim() || null,
        degree,
        violationDate: date,
      };
      if (editing) {
        await schoolApi.updateViolation(editing.id, payload);
      } else {
        await schoolApi.createViolation(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const footerNode = (
    <div className="w-full space-y-2">
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <XCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "تسجيل المخالفة"}
        </button>
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
          إلغاء
        </button>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={editing ? "تعديل المخالفة" : "تسجيل مخالفة"} footer={footerNode}>
      <div className="space-y-4">

        {/* Student picker */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            الطالب <span className="text-red-400">*</span>
          </label>

          {/* Selected student chip */}
          {studentId && !listOpen ? (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-semibold text-emerald-800">{selectedName}</span>
              </div>
              <button
                onClick={() => setListOpen(true)}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
              >
                تغيير
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Filters row */}
              <div className="flex gap-2">
                <select
                  value={gradeFilter}
                  onChange={(e) => { setGradeFilter(e.target.value); setRoomFilter(""); }}
                  className="flex-1 rounded-xl border border-gray-200 px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-400 bg-white"
                >
                  <option value="">كل الصفوف</option>
                  {grades.map((g: string) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-400 bg-white"
                >
                  <option value="">كل الفصول</option>
                  {roomsForGrade.map((cr: any) => (
                    <option key={cr.id} value={cr.id}>{cr.name}</option>
                  ))}
                </select>
              </div>
              {/* Search */}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم الطالب أو رقمه..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              {/* List */}
              <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-50">
                {stuLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                    جاري البحث...
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-gray-400 text-center">
                    {query || gradeFilter || roomFilter ? "لا توجد نتائج" : "ابحث باسم الطالب أو اختر صفاً لعرض الطلاب"}
                  </p>
                ) : (
                  filtered.map((s: any) => {
                    const room = classRooms.find((cr: any) => cr.id === s.classRoomId);
                    return (
                      <button
                        key={s.id}
                        onClick={() => selectStudent(s)}
                        className="w-full text-right px-3 py-2 text-sm transition-colors flex items-center justify-between hover:bg-emerald-50"
                      >
                        <span className="font-medium text-gray-800">{s.fullName}</span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {room ? `${room.grade} — ${room.name}` : (s.classRoomGrade ? `${s.classRoomGrade} — ${s.classRoomName ?? ""}` : (s.studentNumber ?? ""))}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Category — يأتي أولاً لأنه يُفعّل الربط الذكي */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع المخالفة</label>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
          >
            <option value="">— بدون تصنيف —</option>
            {categories.filter((c) => c.isActive !== false).map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Smart bridge: category → degree */}
        {(() => {
          const cat = categoryId ? categories.find((c) => c.id === categoryId) : null;
          return (
            <div className={clsx(
              "rounded-2xl border transition-all overflow-hidden",
              cat ? "border-emerald-200 bg-emerald-50/60" : "border-gray-100 bg-gray-50"
            )}>
              {/* Category info row */}
              {cat && (
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-emerald-200/60">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border-2"
                    style={{ backgroundColor: cat.color ?? "#f59e0b", borderColor: cat.color ?? "#f59e0b" }}
                  />
                  <span className="text-sm font-semibold text-gray-800 flex-1">{cat.name}</span>
                  <SeverityBadge severity={cat.severity} />
                  {degreeAutoSet && (
                    <span className="text-[10px] bg-emerald-600 text-white rounded-full px-2 py-0.5 font-semibold shrink-0">
                      الدرجة مقترحة تلقائياً
                    </span>
                  )}
                </div>
              )}

              {/* Degree selector */}
              <div className="p-3">
                {!cat && (
                  <p className="text-xs text-gray-400 mb-2.5">
                    درجة المخالفة <span className="font-normal">(وفق لائحة وزارة التعليم)</span>
                  </p>
                )}
                {cat && (
                  <p className="text-xs text-emerald-700 font-medium mb-2.5">
                    درجة المخالفة — اختر أو اقبل المقترح
                  </p>
                )}
                <div className="grid grid-cols-5 gap-1.5">
                  {(["1","2","3","4","5"] as const).map((d) => {
                    const cfg = DEGREES[d];
                    const isSelected = degree === d;
                    const isSuggested = degreeAutoSet && isSelected;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDegreeClick(d)}
                        className={clsx(
                          "relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-center transition-all",
                          isSelected
                            ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm font-semibold`
                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        {isSuggested && (
                          <span className="absolute -top-2 inset-x-0 flex justify-center">
                            <span className="text-[8px] bg-emerald-600 text-white rounded-full px-1.5 leading-4 font-bold shadow-sm">مقترح</span>
                          </span>
                        )}
                        <span className="text-xs font-bold">{cfg.label}</span>
                        <span className="text-[9px] leading-tight opacity-75">{cfg.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Procedures for selected degree */}
                {(() => {
                  const degCfg = DEGREES[degree];
                  if (!degCfg) return null;
                  return (
                    <div className={clsx(
                      "mt-3 rounded-xl border p-3 space-y-1.5",
                      degCfg.border, degCfg.bg
                    )}>
                      <p className={clsx("text-xs font-bold mb-2 flex items-center gap-1.5", degCfg.color)}>
                        <span className={clsx("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0", degCfg.iconBg, degCfg.color)}>
                          {degree}
                        </span>
                        الإجراءات الواجب تنفيذها — {degCfg.sub}
                      </p>
                      <ol className="space-y-1">
                        {degCfg.procedures.map((proc, i) => (
                          <li key={i} className={clsx("flex items-start gap-2 text-xs", degCfg.color)}>
                            <span className={clsx(
                              "shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-px",
                              degCfg.iconBg
                            )}>
                              {i + 1}
                            </span>
                            <span className="leading-relaxed opacity-90">{proc}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">تاريخ المخالفة</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          {hijriLabel && (
            <p className="mt-1 text-xs text-gray-400">{hijriLabel}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="تفاصيل المخالفة (اختياري)"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>

      </div>
    </Modal>
  );
}

// ── Resolve Modal ────────────────────────────────────────────

function ResolveModal({
  open, onClose, violation, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  violation: any | null;
  onSaved: () => void;
}) {
  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);

  const handleResolve = async () => {
    if (!violation) return;
    setSaving(true);
    try {
      await schoolApi.updateViolation(violation.id, {
        status: "resolved",
        resolutionNotes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="إغلاق المخالفة">
      <div className="space-y-4 p-4">
        <p className="text-sm text-gray-600">
          إغلاق مخالفة{" "}
          <strong>{violation?.studentName}</strong>
          {violation?.categoryName && ` — ${violation.categoryName}`}
        </p>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات الحل (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="ما الإجراء المتخذ؟"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResolve}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "جاري الحفظ..." : "تأكيد الإغلاق"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────

export function SchoolViolationsPage() {
  const [tab,           setTab]           = useState<"violations" | "categories">("violations");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterCatId,   setFilterCatId]   = useState("");
  const [showAddViolation, setShowAddViolation] = useState(false);
  const [editingViolation, setEditingViolation] = useState<any | null>(null);
  const [resolvingV,    setResolvingV]    = useState<any | null>(null);
  const [showAddCat,    setShowAddCat]    = useState(false);
  const [editingCat,    setEditingCat]    = useState<any | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [seeding,       setSeeding]       = useState(false);

  const { data: catData,  loading: catLoading,  refetch: refetchCats }       = useApi(() => schoolApi.listViolationCategories(), []);
  const { data: vData,    loading: vLoading,    refetch: refetchViolations } = useApi(
    () => schoolApi.listViolations({ status: filterStatus || undefined, categoryId: filterCatId || undefined }),
    [filterStatus, filterCatId]
  );
  const { data: roomData } = useApi(() => schoolApi.listClassRooms(), []);

  const categories: any[]  = catData?.data  ?? [];
  const violations: any[]  = vData?.data    ?? [];
  const classRooms: any[]  = roomData?.data ?? [];

  const handleDeleteViolation = async (id: string) => {
    if (!confirm("حذف هذه المخالفة نهائياً؟")) return;
    setDeletingId(id);
    try {
      await schoolApi.deleteViolation(id);
      refetchViolations();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      await schoolApi.seedDefaultViolationCategories();
      refetchCats();
    } catch {} finally {
      setSeeding(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("حذف هذا التصنيف؟ ستبقى المخالفات المرتبطة به بدون تصنيف.")) return;
    setDeletingId(id);
    try {
      await schoolApi.deleteViolationCategory(id);
      refetchCats();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div dir="rtl" className="space-y-0">

      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900 px-6 pt-8 pb-10">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/40">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-2 py-0.5">
                مخالفات الطلاب
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">المخالفات والتصنيفات</h1>
            <p className="text-sm text-gray-400 mt-1">رصد وإدارة مخالفات الطلاب بتصنيفات مرنة</p>
          </div>
          <button
            onClick={() => setShowAddViolation(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-500 transition-all shadow-lg shadow-rose-900/40 hover:shadow-rose-900/60 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            تسجيل مخالفة
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5 bg-gray-50 min-h-full -mt-0">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1 w-fit -mt-5 relative z-10 shadow-sm">
          <button
            onClick={() => setTab("violations")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              tab === "violations" ? "bg-rose-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              المخالفات
              {violations.filter((v) => v.status === "open").length > 0 && (
                <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {violations.filter((v) => v.status === "open").length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setTab("categories")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              tab === "categories" ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              التصنيفات
            </span>
          </button>
        </div>

        {/* ── Violations Tab ─────────────────────────────────────── */}
        {tab === "violations" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400"
              >
                <option value="">كل الحالات</option>
                <option value="open">مفتوحة</option>
                <option value="resolved">محلولة</option>
                <option value="cancelled">ملغاة</option>
              </select>
              <select
                value={filterCatId}
                onChange={(e) => setFilterCatId(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400"
              >
                <option value="">كل الأنواع</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {vLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : violations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-rose-400" />
                </div>
                <p className="font-bold text-gray-900">لا توجد مخالفات</p>
                <p className="text-sm text-gray-400">استخدم زر "تسجيل مخالفة" لإضافة أول مخالفة</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">الطالب</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">الدرجة</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">نوع المخالفة</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">التاريخ</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">الحالة</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">الوصف</th>
                        <th className="px-4 py-3 w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {violations.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-sm">{v.studentName}</p>
                            {v.studentNumber && (
                              <p className="text-xs text-gray-400">{v.studentNumber}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <DegreeBadge degree={v.degree ?? "1"} />
                          </td>
                          <td className="px-4 py-3">
                            {v.categoryName ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Circle className="w-2.5 h-2.5 shrink-0" style={{ color: v.categoryColor, fill: v.categoryColor }} />
                                <span className="text-sm text-gray-700">{v.categoryName}</span>
                                {v.categorySeverity && <SeverityBadge severity={v.categorySeverity} />}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 tabular-nums whitespace-nowrap">
                            {fmtHijri(v.violationDate)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={v.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                            {v.description ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {v.status === "open" && (
                                <button
                                  onClick={() => setResolvingV(v)}
                                  title="إغلاق المخالفة"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => { setEditingViolation(v); setShowAddViolation(true); }}
                                title="تعديل"
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteViolation(v.id)}
                                disabled={deletingId === v.id}
                                title="حذف"
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Categories Tab ─────────────────────────────────────── */}
        {tab === "categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-500">
                {categories.length} تصنيف — يمكنك إضافة وتعديل وحذف التصنيفات بحرية
              </p>
              <div className="flex items-center gap-2">
                {categories.length === 0 && (
                  <button
                    onClick={handleSeedDefaults}
                    disabled={seeding}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {seeding ? "جاري التحميل..." : "استيراد التصنيفات الافتراضية (وزارة التعليم)"}
                  </button>
                )}
                <button
                  onClick={() => { setEditingCat(null); setShowAddCat(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  تصنيف جديد
                </button>
              </div>
            </div>

            {catLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Settings2 className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-bold text-gray-900">لا توجد تصنيفات بعد</p>
                <p className="text-sm text-gray-400">أنشئ تصنيفاتك الخاصة لتنظيم المخالفات</p>
                <button
                  onClick={() => { setEditingCat(null); setShowAddCat(true); }}
                  className="mt-1 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  إنشاء أول تصنيف
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={clsx(
                      "bg-white rounded-2xl border p-4 hover:shadow-sm transition-all",
                      cat.isActive === false ? "opacity-60 border-gray-100" : "border-gray-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat.color}20`, border: `2px solid ${cat.color}40` }}
                        >
                          <Circle className="w-4 h-4" style={{ color: cat.color, fill: cat.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{cat.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingCat(cat); setShowAddCat(true); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          disabled={deletingId === cat.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={cat.severity} />
                      {cat.defaultDegree && (
                        <DegreeBadge degree={cat.defaultDegree} />
                      )}
                      {cat.isActive === false && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">غير نشط</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PageFAQ pageId="violations" />

      {/* Modals */}
      {showAddViolation && (
        <ViolationModal
          open={showAddViolation}
          onClose={() => { setShowAddViolation(false); setEditingViolation(null); }}
          editing={editingViolation}
          categories={categories}
          classRooms={classRooms}
          onSaved={refetchViolations}
        />
      )}
      {showAddCat && (
        <CategoryModal
          open={showAddCat}
          onClose={() => { setShowAddCat(false); setEditingCat(null); }}
          editing={editingCat}
          onSaved={refetchCats}
        />
      )}
      {resolvingV && (
        <ResolveModal
          open={!!resolvingV}
          onClose={() => setResolvingV(null)}
          violation={resolvingV}
          onSaved={refetchViolations}
        />
      )}
    </div>
  );
}
