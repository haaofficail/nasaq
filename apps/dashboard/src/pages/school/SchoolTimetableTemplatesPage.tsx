import { useState } from "react";
import {
  LayoutTemplate, Plus, ChevronLeft, Pencil, Trash2,
  CheckCircle2, Clock, Coffee,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";

const SESSION_TYPES = [
  { value: "winter", label: "شتوي" },
  { value: "summer", label: "صيفي" },
];

const emptyTemplateForm = { name: "", session_type: "winter" };
const emptyPeriodForm = {
  period_number: "",
  label: "",
  start_time: "",
  end_time: "",
  is_break: false,
};

export function SchoolTimetableTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateModal, setTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({ ...emptyTemplateForm });
  const [periodModal, setPeriodModal] = useState<{ open: boolean; mode: "add" | "edit"; periodId?: string }>({
    open: false, mode: "add",
  });
  const [periodForm, setPeriodForm] = useState({ ...emptyPeriodForm });
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error, refetch } = useApi(() => schoolApi.listTemplates(), []);
  const templates: any[] = data?.data ?? [];

  const { data: periodsData, loading: periodsLoading, refetch: refetchPeriods } = useApi(
    () => (selectedTemplate ? schoolApi.listPeriods(selectedTemplate.id) : Promise.resolve(null)),
    [selectedTemplate?.id]
  );
  const periods: any[] = periodsData?.data ?? [];

  const handleAddTemplate = async () => {
    setSubmitting(true);
    try {
      await schoolApi.createTemplate(templateForm);
      setTemplateModal(false);
      setTemplateForm({ ...emptyTemplateForm });
      refetch();
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  const openAddPeriod = () => {
    setPeriodForm({ ...emptyPeriodForm });
    setPeriodModal({ open: true, mode: "add" });
  };

  const openEditPeriod = (p: any) => {
    setPeriodForm({
      period_number: String(p.periodNumber ?? ""),
      label: p.label ?? "",
      start_time: p.startTime ?? "",
      end_time: p.endTime ?? "",
      is_break: p.isBreak ?? false,
    });
    setPeriodModal({ open: true, mode: "edit", periodId: p.id });
  };

  const handleSavePeriod = async () => {
    if (!selectedTemplate) return;
    setSubmitting(true);
    try {
      const payload = {
        ...periodForm,
        period_number: Number(periodForm.period_number) || 1,
      };
      if (periodModal.mode === "add") {
        await schoolApi.createPeriod(selectedTemplate.id, payload);
      } else if (periodModal.periodId) {
        await schoolApi.updatePeriod(selectedTemplate.id, periodModal.periodId, payload);
      }
      setPeriodModal({ open: false, mode: "add" });
      refetchPeriods();
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!selectedTemplate) return;
    try {
      await schoolApi.deletePeriod(selectedTemplate.id, periodId);
      refetchPeriods();
    } catch {
      // handled
    }
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">قوالب الجداول الدراسية</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة قوالب الحصص وأوقاتها</p>
        </div>
        <button
          onClick={() => { setTemplateForm({ ...emptyTemplateForm }); setTemplateModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          قالب جديد
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">القوالب</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-400 text-sm">{error}</div>
          ) : templates.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
              <LayoutTemplate className="w-8 h-8" />
              <p className="text-xs">لا توجد قوالب</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {templates.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={clsx(
                    "w-full text-right px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors",
                    selectedTemplate?.id === t.id && "bg-emerald-600/5 border-r-2 border-emerald-600"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {SESSION_TYPES.find((s) => s.value === t.sessionType)?.label ?? t.sessionType}
                      </span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs text-gray-500">{t.periodsCount ?? 0} حصة</span>
                      {t.isActive && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          نشط
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Template Periods */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!selectedTemplate ? (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <LayoutTemplate className="w-12 h-12" />
              <p className="text-sm">اختر قالباً لعرض حصصه</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedTemplate.name}</p>
                  <p className="text-xs text-gray-500">
                    {SESSION_TYPES.find((s) => s.value === selectedTemplate.sessionType)?.label}
                  </p>
                </div>
                <button
                  onClick={openAddPeriod}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة حصة
                </button>
              </div>

              {periodsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />
                  ))}
                </div>
              ) : periods.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
                  <Clock className="w-8 h-8" />
                  <p className="text-xs">لا توجد حصص في هذا القالب</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs">
                        <th className="text-right px-4 py-3 font-medium">رقم</th>
                        <th className="text-right px-4 py-3 font-medium">التسمية</th>
                        <th className="text-right px-4 py-3 font-medium">البداية</th>
                        <th className="text-right px-4 py-3 font-medium">النهاية</th>
                        <th className="text-right px-4 py-3 font-medium">نوع</th>
                        <th className="text-right px-4 py-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {periods.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.periodNumber}</td>
                          <td className="px-4 py-3 text-gray-700">{p.label}</td>
                          <td className="px-4 py-3 text-gray-600 tabular-nums">{p.startTime}</td>
                          <td className="px-4 py-3 text-gray-600 tabular-nums">{p.endTime}</td>
                          <td className="px-4 py-3">
                            {p.isBreak ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                                <Coffee className="w-3 h-3" />
                                فسحة
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3" />
                                حصة
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditPeriod(p)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePeriod(p.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
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
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Template Modal */}
      <Modal
        open={templateModal}
        onClose={() => setTemplateModal(false)}
        title="إضافة قالب جديد"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setTemplateModal(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleAddTemplate}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "جاري الحفظ..." : "إضافة"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم القالب</label>
            <input
              value={templateForm.name}
              onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="مثال: جدول الفصل الأول"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الدوام</label>
            <select
              value={templateForm.session_type}
              onChange={(e) => setTemplateForm((f) => ({ ...f, session_type: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
            >
              {SESSION_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Period Modal */}
      <Modal
        open={periodModal.open}
        onClose={() => setPeriodModal({ open: false, mode: "add" })}
        title={periodModal.mode === "add" ? "إضافة حصة" : "تعديل الحصة"}
        size="sm"
        footer={
          <>
            <button
              onClick={() => setPeriodModal({ open: false, mode: "add" })}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleSavePeriod}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "جاري الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الحصة</label>
              <input
                type="number"
                min={1}
                value={periodForm.period_number}
                onChange={(e) => setPeriodForm((f) => ({ ...f, period_number: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التسمية</label>
              <input
                value={periodForm.label}
                onChange={(e) => setPeriodForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="الحصة الأولى"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وقت البداية</label>
              <input
                type="time"
                value={periodForm.start_time}
                onChange={(e) => setPeriodForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وقت النهاية</label>
              <input
                type="time"
                value={periodForm.end_time}
                onChange={(e) => setPeriodForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="is_break"
              type="checkbox"
              checked={periodForm.is_break}
              onChange={(e) => setPeriodForm((f) => ({ ...f, is_break: e.target.checked }))}
              className="w-4 h-4 accent-[#5b9bd5] rounded"
            />
            <label htmlFor="is_break" className="text-sm text-gray-700">هذه الحصة فسحة (استراحة)</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
