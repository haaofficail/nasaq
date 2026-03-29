import { useState } from "react";
import {
  LayoutTemplate, Plus, Pencil, Trash2, CheckCircle2,
  Clock, Coffee, Copy, Sun, Snowflake, Loader2, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ── Session types ─────────────────────────────────────────
const SESSION_TYPES = [
  {
    value: "winter",
    label: "شتوي",
    desc: "دوام الفصل الدراسي العادي",
    icon: Snowflake,
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    ring: "ring-blue-200",
  },
  {
    value: "summer",
    label: "صيفي",
    desc: "دوام الفصل الصيفي المقصّر",
    icon: Sun,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    ring: "ring-amber-200",
  },
] as const;

// Saudi school period presets
const WINTER_PRESET = [
  { period_number: 1, label: "الحصة الأولى",   start_time: "07:30", end_time: "08:10", is_break: false },
  { period_number: 2, label: "الحصة الثانية",  start_time: "08:10", end_time: "08:50", is_break: false },
  { period_number: 3, label: "الحصة الثالثة",  start_time: "08:50", end_time: "09:30", is_break: false },
  { period_number: 0, label: "الفسحة",         start_time: "09:30", end_time: "09:50", is_break: true  },
  { period_number: 4, label: "الحصة الرابعة",  start_time: "09:50", end_time: "10:30", is_break: false },
  { period_number: 5, label: "الحصة الخامسة",  start_time: "10:30", end_time: "11:10", is_break: false },
  { period_number: 6, label: "الحصة السادسة",  start_time: "11:10", end_time: "11:50", is_break: false },
  { period_number: 7, label: "الحصة السابعة",  start_time: "11:50", end_time: "12:30", is_break: false },
];

const SUMMER_PRESET = [
  { period_number: 1, label: "الحصة الأولى",   start_time: "07:00", end_time: "07:35", is_break: false },
  { period_number: 2, label: "الحصة الثانية",  start_time: "07:35", end_time: "08:10", is_break: false },
  { period_number: 3, label: "الحصة الثالثة",  start_time: "08:10", end_time: "08:45", is_break: false },
  { period_number: 0, label: "الفسحة",         start_time: "08:45", end_time: "09:00", is_break: true  },
  { period_number: 4, label: "الحصة الرابعة",  start_time: "09:00", end_time: "09:35", is_break: false },
  { period_number: 5, label: "الحصة الخامسة",  start_time: "09:35", end_time: "10:10", is_break: false },
  { period_number: 6, label: "الحصة السادسة",  start_time: "10:10", end_time: "10:45", is_break: false },
];

const EMPTY_PERIOD = { period_number: "", label: "", start_time: "", end_time: "", is_break: false };
const EMPTY_TPL    = { name: "", session_type: "winter" as "winter" | "summer", usePreset: true };

// ── Helpers ───────────────────────────────────────────────
function sessionMeta(value: string) {
  return SESSION_TYPES.find((s) => s.value === value) ?? SESSION_TYPES[0];
}

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// ── Period row component ──────────────────────────────────
function PeriodRow({
  period,
  onEdit,
  onDelete,
}: {
  period: any;
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
}) {
  const dur = minutesBetween(period.startTime ?? "", period.endTime ?? "");
  return (
    <div className={clsx(
      "flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 group",
      period.isBreak ? "bg-amber-50/40" : "hover:bg-gray-50/60"
    )}>
      <div className={clsx(
        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black",
        period.isBreak ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"
      )}>
        {period.isBreak ? <Coffee className="w-3.5 h-3.5" /> : period.periodNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{period.label}</p>
        <p className="text-xs text-gray-400 tabular-nums">
          {period.startTime} — {period.endTime}
          {dur > 0 && <span className="mr-1 text-gray-300">({dur} دقيقة)</span>}
        </p>
      </div>
      <span className={clsx(
        "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
        period.isBreak
          ? "bg-amber-50 text-amber-600 border-amber-200"
          : "bg-blue-50 text-blue-600 border-blue-200"
      )}>
        {period.isBreak ? "فسحة" : "حصة"}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(period)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          title="تعديل"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(period.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
          title="حذف"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export function SchoolTimetableTemplatesPage() {
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({});

  // Template form
  const [tplModal, setTplModal]         = useState(false);
  const [tplForm, setTplForm]           = useState({ ...EMPTY_TPL });
  const [tplSaving, setTplSaving]       = useState(false);
  const [tplError, setTplError]         = useState("");

  // Period form
  const [prdModal, setPrdModal]         = useState<{ open: boolean; mode: "add" | "edit"; targetId?: string; periodId?: string }>({ open: false, mode: "add" });
  const [prdForm, setPrdForm]           = useState({ ...EMPTY_PERIOD });
  const [prdSaving, setPrdSaving]       = useState(false);
  const [prdError, setPrdError]         = useState("");

  const [filterSession, setFilterSession] = useState<"all" | "winter" | "summer">("all");

  // Data
  const { data, loading, error, refetch } = useApi(() => schoolApi.listTemplates(), []);
  const templates: any[] = data?.data ?? [];

  const { data: periodsData, loading: periodsLoading, refetch: refetchPeriods } = useApi(
    () => (selectedId ? schoolApi.listPeriods(selectedId) : Promise.resolve(null)),
    [selectedId]
  );
  const periods: any[] = periodsData?.data ?? [];

  const filtered = filterSession === "all"
    ? templates
    : templates.filter((t) => t.sessionType === filterSession);

  // ── Template CRUD ──────────────────────────────────────
  const openNewTemplate = () => {
    setTplForm({ ...EMPTY_TPL });
    setTplError("");
    setTplModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!tplForm.name.trim()) { setTplError("اسم القالب مطلوب"); return; }
    setTplSaving(true); setTplError("");
    try {
      const created: any = await schoolApi.createTemplate({
        name: tplForm.name.trim(),
        session_type: tplForm.session_type,
      });
      const newId = created?.data?.id ?? created?.id;
      // Auto-fill preset periods if requested
      if (tplForm.usePreset && newId) {
        const preset = tplForm.session_type === "summer" ? SUMMER_PRESET : WINTER_PRESET;
        for (const p of preset) {
          await schoolApi.createPeriod(newId, p);
        }
      }
      setTplModal(false);
      await refetch();
      if (newId) { setSelectedId(newId); setExpanded((e) => ({ ...e, [newId]: true })); }
    } catch (err: any) {
      setTplError(err.message ?? "حدث خطأ");
    } finally {
      setTplSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("حذف هذا القالب وجميع حصصه؟")) return;
    try {
      // Delete all periods first then template (graceful)
      if (selectedId === id) setSelectedId(null);
      await schoolApi.createTemplate({ name: "__DELETE__" }); // placeholder — delete API call below
      // Actual delete: use the schoolApi if available; if not, warn user
      // schoolApi doesn't expose deleteTemplate currently — show guidance
      alert("لحذف القالب يرجى التواصل مع الدعم أو إعادة تسميته (ميزة الحذف قيد التطوير)");
    } catch {}
  };

  const handleDuplicateTemplate = async (tpl: any) => {
    const otherType = tpl.sessionType === "winter" ? "summer" : "winter";
    const otherLabel = otherType === "summer" ? "صيفي" : "شتوي";
    const newName = prompt(`اسم النسخة (${otherLabel}):`, `${tpl.name} — ${otherLabel}`);
    if (!newName) return;
    try {
      const created: any = await schoolApi.createTemplate({ name: newName.trim(), session_type: otherType });
      const newId = created?.data?.id ?? created?.id;
      if (newId) {
        // Copy periods from source
        const srcPeriods: any = await schoolApi.listPeriods(tpl.id);
        for (const p of srcPeriods?.data ?? []) {
          await schoolApi.createPeriod(newId, {
            period_number: p.periodNumber,
            label: p.label,
            start_time: p.startTime,
            end_time: p.endTime,
            is_break: p.isBreak,
          });
        }
        await refetch();
        setSelectedId(newId);
        setExpanded((e) => ({ ...e, [newId]: true }));
      }
    } catch {}
  };

  // ── Period CRUD ────────────────────────────────────────
  const openAddPeriod = (tplId: string) => {
    setSelectedId(tplId);
    setPrdForm({ ...EMPTY_PERIOD });
    setPrdError("");
    setPrdModal({ open: true, mode: "add", targetId: tplId });
  };

  const openEditPeriod = (p: any) => {
    setPrdForm({
      period_number: String(p.periodNumber ?? ""),
      label: p.label ?? "",
      start_time: p.startTime ?? "",
      end_time: p.endTime ?? "",
      is_break: p.isBreak ?? false,
    });
    setPrdError("");
    setPrdModal({ open: true, mode: "edit", targetId: selectedId ?? "", periodId: p.id });
  };

  const handleSavePeriod = async () => {
    if (!prdForm.start_time || !prdForm.end_time) { setPrdError("وقت البداية والنهاية مطلوبان"); return; }
    const tplId = prdModal.targetId;
    if (!tplId) return;
    setPrdSaving(true); setPrdError("");
    try {
      const payload = { ...prdForm, period_number: Number(prdForm.period_number) || 1 };
      if (prdModal.mode === "add") {
        await schoolApi.createPeriod(tplId, payload);
      } else if (prdModal.periodId) {
        await schoolApi.updatePeriod(tplId, prdModal.periodId, payload);
      }
      setPrdModal({ open: false, mode: "add" });
      refetchPeriods();
    } catch (err: any) {
      setPrdError(err.message ?? "حدث خطأ");
    } finally {
      setPrdSaving(false);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!selectedId) return;
    await schoolApi.deletePeriod(selectedId, periodId);
    refetchPeriods();
  };

  const toggleExpanded = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
    setSelectedId(id);
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 p-6 text-white">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black">قوالب أوقات الدوام</h1>
            <p className="text-sm text-gray-400 mt-1 max-w-lg leading-relaxed">
              السنة الدراسية قالب واحد — لكن الأوقات تتغير صيفاً وشتاءً. أنشئ قالب شتوي وآخر صيفي، وعند تغيير الفصل فعّل القالب المناسب ليُطبَّق على جميع الجداول تلقائياً.
            </p>
          </div>
          <button
            onClick={openNewTemplate}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/40 shrink-0"
          >
            <Plus className="w-4 h-4" />
            قالب جديد
          </button>
        </div>

        {/* Session type legend */}
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          {SESSION_TYPES.map((s) => {
            const count = templates.filter((t) => t.sessionType === s.value).length;
            return (
              <div key={s.value} className="bg-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <s.icon className="w-5 h-5 text-white/60 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                  <p className="text-base font-black mt-0.5">
                    {count} قالب {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([["all", "الكل"], ["winter", "شتوي"], ["summer", "صيفي"]] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilterSession(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterSession === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Templates */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <X className="w-4 h-4 shrink-0" />
          {String(error)}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <LayoutTemplate className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="font-black text-gray-800 text-lg">لا توجد قوالب بعد</p>
          <p className="text-sm text-gray-400 mt-2 max-w-xs">
            أنشئ قالبك الأول — ننصح بقالب شتوي وآخر صيفي. يمكنك نسخ أحدهما من الآخر بعد إنشائه.
          </p>
          <div className="flex gap-3 mt-6">
            {SESSION_TYPES.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setTplForm({ name: `الجدول ال${s.label}`, session_type: s.value, usePreset: true });
                  setTplError(""); setTplModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${s.badge} transition-colors hover:opacity-80`}
              >
                <s.icon className="w-4 h-4" />
                قالب {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((tpl: any) => {
            const meta   = sessionMeta(tpl.sessionType);
            const isOpen = !!expanded[tpl.id];
            const isSelected = selectedId === tpl.id;

            return (
              <div
                key={tpl.id}
                className={clsx(
                  "bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow",
                  isOpen ? "border-emerald-200 shadow-md" : "border-gray-100 hover:border-gray-200"
                )}
              >
                {/* Template header row */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer"
                  onClick={() => toggleExpanded(tpl.id)}
                >
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", meta.badge)}>
                    <meta.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-gray-900">{tpl.name}</p>
                      <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border", meta.badge)}>
                        {meta.label}
                      </span>
                      {tpl.isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          مفعّل
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tpl.periodsCount ?? 0} حصة / فسحة
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDuplicateTemplate(tpl)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="نسخ إلى نوع الدوام الآخر"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openAddPeriod(tpl.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      حصة
                    </button>
                  </div>
                  <div className="text-gray-300 shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Periods accordion */}
                {isOpen && (
                  <div className="border-t border-gray-50">
                    {periodsLoading && isSelected ? (
                      <div className="p-4 space-y-2">
                        {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
                      </div>
                    ) : isSelected && periods.length === 0 ? (
                      <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
                        <Clock className="w-8 h-8 text-gray-200" />
                        <p className="text-xs">لا توجد أوقات محددة</p>
                        <button
                          onClick={() => openAddPeriod(tpl.id)}
                          className="mt-1 text-xs text-emerald-600 font-semibold hover:text-emerald-700"
                        >
                          إضافة حصة
                        </button>
                      </div>
                    ) : isSelected ? (
                      <div>
                        {/* Timeline header */}
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50/60 border-b border-gray-50">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-500">
                            جدول الأوقات — {periods.filter((p) => !p.isBreak).length} حصة،{" "}
                            {periods.filter((p) => p.isBreak).length} فسحة
                          </span>
                        </div>
                        {[...periods]
                          .sort((a, b) => {
                            const ta = a.startTime ?? "00:00";
                            const tb = b.startTime ?? "00:00";
                            return ta.localeCompare(tb);
                          })
                          .map((p: any) => (
                            <PeriodRow
                              key={p.id}
                              period={p}
                              onEdit={(prd) => { setSelectedId(tpl.id); openEditPeriod(prd); }}
                              onDelete={handleDeletePeriod}
                            />
                          ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── New Template Modal ── */}
      {tplModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setTplModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl modal-content-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900">قالب أوقات جديد</h2>
              <button onClick={() => setTplModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">اسم القالب</label>
                <input
                  type="text"
                  value={tplForm.name}
                  onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="مثال: الجدول الشتوي الرسمي"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">نوع الدوام</label>
                <div className="grid grid-cols-2 gap-2">
                  {SESSION_TYPES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setTplForm((f) => ({ ...f, session_type: s.value }))}
                      className={clsx(
                        "flex items-center gap-2.5 p-3 rounded-xl border-2 text-right transition-all",
                        tplForm.session_type === s.value
                          ? `border-current ${s.badge} ring-2 ${s.ring}`
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      )}
                    >
                      <s.icon className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-sm font-black">{s.label}</p>
                        <p className="text-[10px] text-gray-400 leading-tight">{s.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <input
                  type="checkbox"
                  checked={tplForm.usePreset}
                  onChange={(e) => setTplForm((f) => ({ ...f, usePreset: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">تعبئة الأوقات تلقائياً</p>
                  <p className="text-xs text-emerald-700/70 mt-0.5">
                    {tplForm.session_type === "summer"
                      ? "7:00 — 10:45 بحصص 35 دقيقة (صيفي)"
                      : "7:30 — 12:30 بحصص 40 دقيقة (شتوي)"}
                  </p>
                </div>
              </label>

              {tplError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{tplError}</p>}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
              <button onClick={() => setTplModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                إلغاء
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={tplSaving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {tplSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء القالب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Period Modal ── */}
      {prdModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setPrdModal({ open: false, mode: "add" })}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl modal-content-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900">
                {prdModal.mode === "add" ? "إضافة حصة / فسحة" : "تعديل الحصة"}
              </h2>
              <button onClick={() => setPrdModal({ open: false, mode: "add" })} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Is break toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPrdForm((f) => ({ ...f, is_break: false }))}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all",
                    !prdForm.is_break ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-400"
                  )}
                >
                  <Clock className="w-4 h-4" />
                  حصة
                </button>
                <button
                  type="button"
                  onClick={() => setPrdForm((f) => ({ ...f, is_break: true, period_number: "0" }))}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all",
                    prdForm.is_break ? "border-amber-400 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-400"
                  )}
                >
                  <Coffee className="w-4 h-4" />
                  فسحة
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!prdForm.is_break && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">رقم الحصة</label>
                    <input
                      type="number"
                      min={1}
                      value={prdForm.period_number}
                      onChange={(e) => setPrdForm((f) => ({ ...f, period_number: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                )}
                <div className={prdForm.is_break ? "col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">التسمية</label>
                  <input
                    type="text"
                    value={prdForm.label}
                    onChange={(e) => setPrdForm((f) => ({ ...f, label: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder={prdForm.is_break ? "الفسحة" : "الحصة الأولى"}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">وقت البداية</label>
                  <input
                    type="time"
                    value={prdForm.start_time}
                    onChange={(e) => setPrdForm((f) => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">وقت النهاية</label>
                  <input
                    type="time"
                    value={prdForm.end_time}
                    onChange={(e) => setPrdForm((f) => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {prdError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{prdError}</p>}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
              <button onClick={() => setPrdModal({ open: false, mode: "add" })} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                إلغاء
              </button>
              <button
                onClick={handleSavePeriod}
                disabled={prdSaving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {prdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
