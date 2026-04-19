import { useState } from "react";
import { CalendarDays, Plus, Trash2, X, Loader2, Zap, Clock } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Link } from "react-router-dom";

// ── Create/Edit Week Modal ─────────────────────────────────────

function WeekModal({
  editing,
  templates,
  semesters,
  onClose,
  onSaved,
}: {
  editing: any | null;
  templates: any[];
  semesters: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [weekNumber, setWeekNumber] = useState<number>(editing?.weekNumber ?? 1);
  const [startDate,  setStartDate]  = useState<string>(editing?.startDate?.slice(0, 10) ?? "");
  const [endDate,    setEndDate]    = useState<string>(editing?.endDate?.slice(0, 10)   ?? "");
  const [templateId, setTemplateId] = useState<string>(editing?.templateId ?? "");
  const [semesterId, setSemesterId] = useState<string>(editing?.semesterId ?? "");
  const [label,      setLabel]      = useState<string>(editing?.label      ?? "");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSave = async () => {
    if (!startDate || !endDate) { setError("تاريخ البداية والنهاية مطلوبان"); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        weekNumber,
        startDate,
        endDate,
        templateId: templateId || undefined,
        semesterId: semesterId || undefined,
        label: label.trim() || undefined,
      };
      if (editing) await schoolApi.updateScheduleWeek(editing.id, payload);
      else         await schoolApi.createScheduleWeek(payload);
      onSaved(); onClose();
    } catch (e: any) { setError(e?.message ?? "حدث خطأ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6]">
          <h2 className="text-base font-black text-gray-900">{editing ? "تعديل الأسبوع" : "إضافة أسبوع"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">رقم الأسبوع <span className="text-red-400">*</span></label>
              <input
                type="number" min={1} value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">التسمية (اختياري)</label>
              <input
                value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder="مثال: الأسبوع الأول"
                className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">تاريخ البداية <span className="text-red-400">*</span></label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">تاريخ النهاية <span className="text-red-400">*</span></label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">قالب الدوام</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl outline-none focus:border-emerald-400 bg-white">
              <option value="">بدون قالب محدد</option>
              {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">الفصل الدراسي</label>
            <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#eef2f6] rounded-xl outline-none focus:border-emerald-400 bg-white">
              <option value="">بدون فصل محدد</option>
              {semesters.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة الأسبوع"}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#eef2f6] text-gray-600 text-sm hover:bg-[#f8fafc] transition-colors">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export function SchoolScheduleWeeksPage() {
  const [showCreate,  setShowCreate]  = useState(false);
  const [editWeek,    setEditWeek]    = useState<any | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const { data: weeksData,     loading: weeksLoading,     error: weeksError,     refetch: refetchWeeks }     = useApi(() => schoolApi.listScheduleWeeks(), []);
  const { data: templatesData, loading: templatesLoading                                                    } = useApi(() => schoolApi.listTimetableTemplates(), []);
  const { data: semestersData                                                                                } = useApi(() => schoolApi.getSemesters(), []);

  const weeks:     any[] = weeksData?.data     ?? [];
  const templates: any[] = templatesData?.data ?? [];
  const semesters: any[] = semestersData?.data ?? [];

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الأسبوع؟")) return;
    setDeletingId(id);
    try { await schoolApi.deleteScheduleWeek(id); refetchWeeks(); }
    catch {} finally { setDeletingId(null); }
  };

  const handleActivate = async (id: string) => {
    if (!confirm("تفعيل هذا الأسبوع كأسبوع حالي؟")) return;
    setActivatingId(id);
    try { await schoolApi.activateScheduleWeek(id); refetchWeeks(); }
    catch {} finally { setActivatingId(null); }
  };

  const getTemplateName = (id?: string) => templates.find((t) => t.id === id)?.name ?? "—";
  const getSemesterName = (id?: string) => semesters.find((s) => s.id === id)?.name ?? "—";

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return d; }
  };

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
                <CalendarDays className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                أسابيع الجدول
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">أسابيع الدراسة</h1>
            <p className="text-sm text-gray-400 mt-1">إدارة الأسابيع الدراسية وربطها بقوالب الدوام والفصول</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/school/timetable-templates"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              <Clock className="w-4 h-4" />
              قوالب الدوام
            </Link>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" />
              إضافة أسبوع
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 bg-[#f8fafc] min-h-full">

        {/* Loading */}
        {weeksLoading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl border border-[#eef2f6] animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {!weeksLoading && weeksError && (
          <div className="bg-white rounded-2xl border border-red-100 p-8 flex flex-col items-center gap-3 text-center">
            <X className="w-8 h-8 text-red-400" />
            <p className="font-bold text-gray-900">تعذر تحميل البيانات</p>
            <p className="text-sm text-gray-500">{weeksError}</p>
            <button onClick={refetchWeeks} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Empty */}
        {!weeksLoading && !weeksError && weeks.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#eef2f6] py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CalendarDays className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900">لا توجد أسابيع مضافة بعد</p>
              <p className="text-sm text-gray-400 mt-1">أضف أسابيع الدراسة وربطها بقوالب الدوام</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة أول أسبوع
            </button>
          </div>
        )}

        {/* Data Table */}
        {!weeksLoading && !weeksError && weeks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{weeks.length} أسبوع دراسي</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#eef2f6] bg-gray-50/50">
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">رقم الأسبوع</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">الفترة</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">القالب</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">الفصل الدراسي</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">الحالة</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...weeks].sort((a, b) => a.weekNumber - b.weekNumber).map((week: any) => (
                      <tr key={week.id} className={clsx("hover:bg-[#f8fafc]/50 transition-colors", week.isActive && "bg-emerald-50/30")}>
                        <td className="px-[10px] py-[6px]">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                              {week.weekNumber}
                            </span>
                            {week.label && <span className="text-gray-600 text-sm">{week.label}</span>}
                          </div>
                        </td>
                        <td className="px-[10px] py-[6px] text-gray-600" dir="ltr">
                          <span className="text-xs">{formatDate(week.startDate)} — {formatDate(week.endDate)}</span>
                        </td>
                        <td className="px-[10px] py-[6px]">
                          {week.templateId ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {getTemplateName(week.templateId)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-[10px] py-[6px]">
                          {week.semesterId ? (
                            <span className="text-sm text-gray-600">{getSemesterName(week.semesterId)}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-[10px] py-[6px]">
                          {week.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              نشط
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">غير نشط</span>
                          )}
                        </td>
                        <td className="px-[10px] py-[6px]">
                          <div className="flex items-center gap-1.5">
                            {!week.isActive && (
                              <button
                                onClick={() => handleActivate(week.id)}
                                disabled={activatingId === week.id}
                                title="تفعيل هذا الأسبوع"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {activatingId === week.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                تفعيل
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(week.id)}
                              disabled={deletingId === week.id}
                              title="حذف"
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              {deletingId === week.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editWeek) && !templatesLoading && (
        <WeekModal
          editing={editWeek}
          templates={templates}
          semesters={semesters}
          onClose={() => { setShowCreate(false); setEditWeek(null); }}
          onSaved={refetchWeeks}
        />
      )}
    </div>
  );
}
