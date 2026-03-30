import { useState } from "react";
import { Clock, Plus, Trash2, X, Loader2, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Link } from "react-router-dom";

// ── Constants ─────────────────────────────────────────────────

const SESSION_TYPES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  morning:   { label: "دوام صباحي",  color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  afternoon: { label: "دوام مسائي",  color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200" },
  full:      { label: "دوام كامل",   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
};

function SessionBadge({ type }: { type: string }) {
  const t = SESSION_TYPES[type] ?? SESSION_TYPES.morning;
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", t.color, t.bg, t.border)}>
      {t.label}
    </span>
  );
}

// ── Create Template Modal ──────────────────────────────────────

function CreateTemplateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name,        setName]        = useState("");
  const [sessionType, setSessionType] = useState("morning");
  const [description, setDescription] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError("اسم القالب مطلوب"); return; }
    setSaving(true); setError(null);
    try {
      await schoolApi.createTimetableTemplate({ name: name.trim(), sessionType, description: description.trim() || undefined });
      onSaved(); onClose();
    } catch (e: any) { setError(e?.message ?? "حدث خطأ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">إضافة قالب دوام</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">اسم القالب <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: قالب الدوام الصباحي"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">نوع الدوام</label>
            <div className="flex gap-2">
              {(["morning", "afternoon", "full"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSessionType(t)}
                  className={clsx(
                    "flex-1 py-2 rounded-xl text-xs font-medium border transition-all",
                    sessionType === t
                      ? `${SESSION_TYPES[t].bg} ${SESSION_TYPES[t].color} ${SESSION_TYPES[t].border}`
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {SESSION_TYPES[t].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">وصف القالب (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="وصف مختصر للقالب..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {saving ? "جاري الحفظ..." : "إضافة القالب"}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Period Form ────────────────────────────────────────────

function AddPeriodForm({ templateId, nextNumber, onSaved }: { templateId: string; nextNumber: number; onSaved: () => void }) {
  const [label,     setLabel]     = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime,   setEndTime]   = useState("");
  const [isBreak,   setIsBreak]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleAdd = async () => {
    if (!startTime || !endTime) { setError("وقت البداية والنهاية مطلوبان"); return; }
    setSaving(true); setError(null);
    try {
      await schoolApi.createTimetableTemplatePeriod(templateId, {
        periodNumber: nextNumber,
        label: label.trim() || undefined,
        startTime,
        endTime,
        isBreak,
      });
      setLabel(""); setStartTime(""); setEndTime(""); setIsBreak(false);
      onSaved();
    } catch (e: any) { setError(e?.message ?? "حدث خطأ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <p className="text-xs font-bold text-gray-600">إضافة حصة — رقم {nextNumber}</p>
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <X className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">البداية <span className="text-red-400">*</span></label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" dir="ltr" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">النهاية <span className="text-red-400">*</span></label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">التسمية (اختياري)</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: الحصة الأولى"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400" />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isBreak} onChange={(e) => setIsBreak(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          <span className="text-xs text-gray-600">استراحة</span>
        </label>
        <button onClick={handleAdd} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {saving ? "جاري الإضافة..." : "إضافة الحصة"}
        </button>
      </div>
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────

function TemplateCard({ template, onDeleted }: { template: any; onDeleted: () => void }) {
  const [expanded,   setExpanded]   = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [deletingPId, setDeletingPId] = useState<string | null>(null);

  const { data: periodsData, loading: periodsLoading, refetch: refetchPeriods } = useApi(
    () => expanded ? schoolApi.getTimetableTemplatePeriods(template.id) : Promise.resolve({ data: [] }),
    [template.id, expanded]
  );
  const periods: any[] = periodsData?.data ?? [];

  const handleDeleteTemplate = async () => {
    if (!confirm("حذف هذا القالب؟ سيتم حذف جميع حصصه.")) return;
    setDeleting(true);
    try { await schoolApi.deleteTimetableTemplate(template.id); onDeleted(); }
    catch {} finally { setDeleting(false); }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!confirm("حذف هذه الحصة؟")) return;
    setDeletingPId(periodId);
    try { await schoolApi.deleteTimetableTemplatePeriod(template.id, periodId); refetchPeriods(); }
    catch {} finally { setDeletingPId(null); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{template.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <SessionBadge type={template.sessionType ?? "morning"} />
              {(template.periodCount ?? 0) > 0 && (
                <span className="text-xs text-gray-400">{template.periodCount} حصة</span>
              )}
            </div>
            {template.description && (
              <p className="text-xs text-gray-400 mt-1">{template.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "إخفاء الحصص" : "عرض الحصص"}
          </button>
          <button
            onClick={handleDeleteTemplate}
            disabled={deleting}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded: Periods */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          {periodsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : periods.length === 0 ? (
            <div className="py-6 flex flex-col items-center gap-2 text-center">
              <Clock className="w-7 h-7 text-gray-200" />
              <p className="text-xs font-semibold text-gray-400">لا توجد حصص في هذا القالب بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...periods].sort((a, b) => a.periodNumber - b.periodNumber).map((p: any) => (
                <div key={p.id}
                  className={clsx(
                    "flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all group",
                    p.isBreak ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"
                  )}>
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                      p.isBreak ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {p.periodNumber}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {p.label ?? (p.isBreak ? "استراحة" : `الحصة ${p.periodNumber}`)}
                        {p.isBreak && (
                          <span className="mr-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">استراحة</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400" dir="ltr">{p.startTime} — {p.endTime}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePeriod(p.id)}
                    disabled={deletingPId === p.id}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  >
                    {deletingPId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Period Form */}
          <AddPeriodForm
            templateId={template.id}
            nextNumber={periods.length + 1}
            onSaved={refetchPeriods}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export function SchoolTimetableTemplatesPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data, loading, error, refetch } = useApi(
    () => schoolApi.listTimetableTemplates(),
    []
  );
  const templates: any[] = data?.data ?? [];

  return (
    <div dir="rtl" className="space-y-0">

      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 px-6 pt-8 pb-10">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                قوالب الدوام
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">قوالب الجدول الدراسي</h1>
            <p className="text-sm text-gray-400 mt-1">تعريف الحصص والفترات الزمنية لكل نوع دوام</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/school/schedule-weeks"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              أسابيع الجدول
            </Link>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" />
              قالب جديد
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 bg-gray-50 min-h-full">

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-100 p-8 flex flex-col items-center gap-3 text-center">
            <X className="w-8 h-8 text-red-400" />
            <p className="font-bold text-gray-900">تعذر تحميل البيانات</p>
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={refetch} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && templates.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Clock className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900">لا توجد قوالب بعد</p>
              <p className="text-sm text-gray-400 mt-1">أنشئ قالب دوام وأضف الحصص الزمنية</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إنشاء أول قالب
            </button>
          </div>
        )}

        {/* Data */}
        {!loading && !error && templates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{templates.length} قالب دوام</p>
            </div>
            <div className="space-y-3">
              {templates.map((t: any) => (
                <TemplateCard key={t.id} template={t} onDeleted={refetch} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
