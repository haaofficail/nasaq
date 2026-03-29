import { useState } from "react";
import {
  CalendarDays, Plus, CheckCircle2, Circle, ChevronLeft, Grid3x3,
} from "lucide-react";

import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";

const DAYS = [
  { value: 0, key: "sun", label: "الأحد" },
  { value: 1, key: "mon", label: "الاثنين" },
  { value: 2, key: "tue", label: "الثلاثاء" },
  { value: 3, key: "wed", label: "الأربعاء" },
  { value: 4, key: "thu", label: "الخميس" },
];

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu"] as const;

const emptyWeekForm = {
  template_id: "",
  week_number: "",
  label: "",
  start_date: "",
  end_date: "",
};

function ScheduleEntryRow({
  period,
  entry,
  classRooms,
  teachers,
  onSave,
}: {
  period: any;
  entry: any | undefined;
  classRooms: any[];
  teachers: any[];
  onSave: (classRoomId: string, teacherId: string, subject: string) => void;
}) {
  const [classRoomId, setClassRoomId] = useState(entry?.classRoomId ?? "");
  const [teacherId, setTeacherId]     = useState(entry?.teacherId ?? "");
  const [subject, setSubject]         = useState(entry?.subject ?? "");

  return (
    <div className="px-4 py-3 grid grid-cols-4 gap-2 items-center hover:bg-gray-50">
      <div>
        <p className="text-xs font-semibold text-gray-700">{period.label}</p>
        <p className="text-xs text-gray-400 tabular-nums">{period.startTime} — {period.endTime}</p>
      </div>
      <select
        value={classRoomId}
        onChange={(e) => { setClassRoomId(e.target.value); onSave(e.target.value, teacherId, subject); }}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
      >
        <option value="">الفصل</option>
        {classRooms.map((cr: any) => (
          <option key={cr.id} value={cr.id}>{cr.grade}/{cr.name}</option>
        ))}
      </select>
      <select
        value={teacherId}
        onChange={(e) => { setTeacherId(e.target.value); onSave(classRoomId, e.target.value, subject); }}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
      >
        <option value="">المعلم</option>
        {teachers.map((t: any) => (
          <option key={t.id} value={t.id}>{t.fullName}</option>
        ))}
      </select>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        onBlur={() => onSave(classRoomId, teacherId, subject)}
        placeholder="المادة"
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    </div>
  );
}

export function SchoolScheduleWeeksPage() {
  const [templateFilter, setTemplateFilter] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [weekForm, setWeekForm] = useState({ ...emptyWeekForm });
  const [submitting, setSubmitting] = useState(false);

  const [builderWeek, setBuilderWeek] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  const { data: templatesData } = useApi(() => schoolApi.listTemplates(), []);
  const templates: any[] = templatesData?.data ?? [];

  const { data, loading, error, refetch } = useApi(
    () => schoolApi.listWeeks(templateFilter ? { templateId: templateFilter } : {}),
    [templateFilter]
  );
  const weeks: any[] = data?.data ?? [];

  // Builder data
  const { data: builderData, loading: builderLoading, refetch: refetchBuilder } = useApi(
    () =>
      builderWeek
        ? schoolApi.getScheduleEntries({ weekId: builderWeek.id, dayOfWeek: DAY_KEYS[selectedDay] })
        : Promise.resolve(null),
    [builderWeek?.id, selectedDay]
  );
  const { data: periodsData } = useApi(
    () =>
      builderWeek?.templateId
        ? schoolApi.listPeriods(builderWeek.templateId)
        : Promise.resolve(null),
    [builderWeek?.templateId]
  );
  const { data: classRoomsData } = useApi(() => schoolApi.listClassRooms(), []);
  const { data: teachersData } = useApi(() => schoolApi.listTeachers(), []);

  const builderEntries: any[] = builderData?.data ?? [];
  const templatePeriods: any[] = periodsData?.data ?? [];
  const classRooms: any[] = classRoomsData?.data ?? [];
  const teachers: any[] = teachersData?.data ?? [];

  const handleAddWeek = async () => {
    setSubmitting(true);
    try {
      const payload = { ...weekForm, week_number: Number(weekForm.week_number) || 1 };
      await schoolApi.createWeek(payload);
      setAddModal(false);
      setWeekForm({ ...emptyWeekForm });
      refetch();
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async (weekId: string) => {
    try {
      await schoolApi.activateWeek(weekId);
      refetch();
    } catch {
      // handled
    }
  };

  const handleUpdateEntry = async (periodId: string, classRoomId: string, teacherId: string, subject: string) => {
    if (!builderWeek) return;
    try {
      await schoolApi.upsertEntries([{
        week_id: builderWeek.id,
        day_of_week: DAY_KEYS[selectedDay],
        period_id: periodId,
        class_room_id: classRoomId,
        teacher_id: teacherId,
        subject,
      }]);
      refetchBuilder();
    } catch {
      // handled
    }
  };

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أسابيع الجدول</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة وتعيين أسابيع الدراسة</p>
        </div>
        <button
          onClick={() => { setWeekForm({ ...emptyWeekForm }); setAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة أسبوع
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
        >
          <option value="">كل القوالب</option>
          {templates.map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className={clsx("grid gap-6", builderWeek ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1")}>
        {/* Weeks Table */}
        <div className={clsx("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", builderWeek ? "lg:col-span-2" : "")}>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">{error}</div>
          ) : weeks.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <CalendarDays className="w-12 h-12" />
              <p className="text-sm">لا توجد أسابيع مضافة</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-right px-4 py-3 font-medium">الأسبوع</th>
                  <th className="text-right px-4 py-3 font-medium">التسمية</th>
                  <th className="text-right px-4 py-3 font-medium">من — إلى</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {weeks.map((w: any) => (
                  <tr
                    key={w.id}
                    className={clsx(
                      "hover:bg-gray-50 transition-colors",
                      builderWeek?.id === w.id && "bg-emerald-600/5"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{w.weekNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{w.label}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">
                      {w.startDate} — {w.endDate}
                    </td>
                    <td className="px-4 py-3">
                      {w.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">
                          <Circle className="w-3 h-3" />
                          غير نشط
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!w.isActive && (
                          <button
                            onClick={() => handleSetActive(w.id)}
                            className="text-xs px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          >
                            تعيين نشط
                          </button>
                        )}
                        <button
                          onClick={() => { setBuilderWeek(w); setSelectedDay(0); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-600"
                          title="بناء الجدول"
                        >
                          <Grid3x3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Schedule Builder */}
        {builderWeek && (
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">بناء الجدول — {builderWeek.label}</p>
                <p className="text-xs text-gray-500">الأسبوع {builderWeek.weekNumber}</p>
              </div>
              <button
                onClick={() => setBuilderWeek(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                إغلاق
              </button>
            </div>

            {/* Day selector */}
            <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDay(d.value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    selectedDay === d.value
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {builderLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-16 w-full" />
                ))}
              </div>
            ) : templatePeriods.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                لا توجد حصص في قالب هذا الأسبوع
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {templatePeriods
                  .filter((p) => !p.isBreak)
                  .map((period: any) => {
                    const entry = builderEntries.find((e) => e.periodId === period.id);
                    return (
                      <ScheduleEntryRow
                        key={`${period.id}-${selectedDay}-${builderWeek?.id}`}
                        period={period}
                        entry={entry}
                        classRooms={classRooms}
                        teachers={teachers}
                        onSave={(classRoomId, teacherId, subject) =>
                          handleUpdateEntry(period.id, classRoomId, teacherId, subject)
                        }
                      />
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Week Modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="إضافة أسبوع جديد"
        size="md"
        footer={
          <>
            <button
              onClick={() => setAddModal(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleAddWeek}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">القالب</label>
            <select
              value={weekForm.template_id}
              onChange={(e) => setWeekForm((f) => ({ ...f, template_id: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
            >
              <option value="">اختر القالب</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الأسبوع</label>
              <input
                type="number"
                min={1}
                value={weekForm.week_number}
                onChange={(e) => setWeekForm((f) => ({ ...f, week_number: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التسمية</label>
              <input
                value={weekForm.label}
                onChange={(e) => setWeekForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="مثال: الأسبوع الأول"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
              <input
                type="date"
                value={weekForm.start_date}
                onChange={(e) => setWeekForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
              <input
                type="date"
                value={weekForm.end_date}
                onChange={(e) => setWeekForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
