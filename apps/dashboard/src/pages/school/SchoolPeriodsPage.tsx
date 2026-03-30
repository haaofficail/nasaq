import { useState } from "react";
import { Clock, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Link } from "react-router-dom";

// ── Constants ─────────────────────────────────────────────────

const SESSION_LABELS: Record<string, string> = {
  morning:   "دوام صباحي",
  afternoon: "دوام مسائي",
  full:      "دوام كامل",
};

// ── TemplatePeriodsList ────────────────────────────────────────

function TemplatePeriodsList({ templateId }: { templateId: string }) {
  const { data, loading, error } = useApi(
    () => schoolApi.getTimetableTemplatePeriods(templateId),
    [templateId]
  );
  const periods: any[] = data?.data ?? [];

  if (loading) {
    return (
      <div className="space-y-2 mt-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
        تعذر تحميل الحصص
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="mt-3 py-6 flex flex-col items-center gap-2 text-center bg-gray-50 rounded-xl border border-gray-100">
        <Clock className="w-6 h-6 text-gray-200" />
        <p className="text-xs text-gray-400">لا توجد حصص في هذا القالب</p>
      </div>
    );
  }

  const sorted = [...periods].sort((a, b) => a.periodNumber - b.periodNumber);

  return (
    <div className="mt-3 space-y-1.5">
      {sorted.map((p: any) => (
        <div key={p.id}
          className={clsx(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl border",
            p.isBreak ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"
          )}>
          {/* Period number bubble */}
          <span className={clsx(
            "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
            p.isBreak ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
          )}>
            {p.periodNumber}
          </span>

          {/* Label */}
          <span className="text-sm font-semibold text-gray-800 min-w-0 flex-1">
            {p.label ?? (p.isBreak ? "استراحة" : `الحصة ${p.periodNumber}`)}
          </span>

          {/* Break badge */}
          {p.isBreak && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
              استراحة
            </span>
          )}

          {/* Time range */}
          <span className="text-xs text-gray-400 shrink-0" dir="ltr">
            {p.startTime} — {p.endTime}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Template Accordion ────────────────────────────────────────

function TemplateAccordion({ template }: { template: any }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors text-right"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900 text-sm">{template.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">
                {SESSION_LABELS[template.sessionType ?? "morning"] ?? template.sessionType}
              </span>
              {(template.periodCount ?? 0) > 0 && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs text-gray-400">{template.periodCount} حصة</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-gray-400 shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 pb-5">
          {template.description && (
            <p className="text-xs text-gray-400 pt-3 pb-1">{template.description}</p>
          )}
          <TemplatePeriodsList templateId={template.id} />
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export function SchoolPeriodsPage() {
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
                الحصص الدراسية
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">جدول الحصص</h1>
            <p className="text-sm text-gray-400 mt-1">عرض الحصص الزمنية لكل قالب دوام</p>
          </div>
          <Link
            to="/school/timetable-templates"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30 w-fit"
          >
            <ExternalLink className="w-4 h-4" />
            إدارة القوالب
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-5 bg-gray-50 min-h-full">

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
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
              <p className="font-bold text-gray-900">لا توجد قوالب دوام بعد</p>
              <p className="text-sm text-gray-400 mt-1">أنشئ قوالب الدوام وأضف الحصص الزمنية لها</p>
            </div>
            <Link
              to="/school/timetable-templates"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              إنشاء قالب دوام
            </Link>
          </div>
        )}

        {/* Data */}
        {!loading && !error && templates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{templates.length} قالب دوام</p>
              <Link
                to="/school/timetable-templates"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                تعديل القوالب
              </Link>
            </div>

            <div className="space-y-3">
              {templates.map((t: any) => (
                <TemplateAccordion key={t.id} template={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
