import { useState } from "react";
import { Users, DoorOpen, GraduationCap, Clock, AlarmClock, CheckCircle2, XCircle, Minus, X } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { Modal } from "@/components/ui";

const DAY_MAP: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function LateBadge({ minutes }: { minutes: number | null | undefined }) {
  if (minutes == null) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
        <Minus className="w-3 h-3" />
        لم يُسجَّل
      </span>
    );
  }
  if (minutes === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        في الوقت
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <XCircle className="w-3 h-3" />
      تأخر {minutes} دقيقة
    </span>
  );
}

export function SchoolDayMonitorPage() {
  const { data, loading, error, refetch } = useApi(() => schoolApi.dayMonitor(), []);

  const [lateModal, setLateModal] = useState<{ open: boolean; entryId: string; currentMinutes: number | null }>({
    open: false,
    entryId: "",
    currentMinutes: null,
  });
  const [lateForm, setLateForm] = useState({ teacher_late_minutes: "", teacher_arrived_at: "" });
  const [submitting, setSubmitting] = useState(false);

  const todayName = DAY_MAP[new Date().getDay()] ?? "";

  const openLateModal = (entryId: string, currentMinutes: number | null) => {
    setLateForm({
      teacher_late_minutes: currentMinutes != null ? String(currentMinutes) : "",
      teacher_arrived_at: "",
    });
    setLateModal({ open: true, entryId, currentMinutes });
  };

  const handleMarkLate = async () => {
    if (!lateModal.entryId) return;
    setSubmitting(true);
    try {
      await schoolApi.markLate(lateModal.entryId, {
        teacher_late_minutes: Number(lateForm.teacher_late_minutes) || 0,
        teacher_arrived_at: lateForm.teacher_arrived_at || undefined,
      });
      setLateModal({ open: false, entryId: "", currentMinutes: null });
      refetch();
    } catch {
      // error handled by api layer
    } finally {
      setSubmitting(false);
    }
  };

  const stats = data?.data?.stats;
  const entries: any[] = data?.data?.todayEntries ?? [];
  const activeWeek = data?.data?.activeWeek;

  if (loading) {
    return (
      <div dir="rtl" className="p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-24 w-full" />
          ))}
        </div>
        <div className="animate-pulse bg-gray-100 rounded-2xl h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="p-6">
        <div className="text-center py-12 text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مراقب اليوم المدرسي</h1>
          <p className="text-sm text-gray-500 mt-1">
            {todayName}
            {activeWeek ? ` — ${activeWeek.label}` : ""}
          </p>
        </div>
        {activeWeek && (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {activeWeek.startDate} — {activeWeek.endDate}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-white" />}
          label="المعلمون"
          value={stats?.teachers ?? 0}
          color="bg-emerald-600"
        />
        <StatCard
          icon={<DoorOpen className="w-6 h-6 text-white" />}
          label="الفصول"
          value={stats?.classRooms ?? 0}
          color="bg-emerald-500"
        />
        <StatCard
          icon={<GraduationCap className="w-6 h-6 text-white" />}
          label="الطلاب"
          value={stats?.students ?? 0}
          color="bg-violet-500"
        />
        <StatCard
          icon={<AlarmClock className="w-6 h-6 text-white" />}
          label="تأخرات اليوم"
          value={stats?.lateToday ?? 0}
          color="bg-red-500"
        />
      </div>

      {/* Today Entries */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">حصص اليوم</h2>
        </div>

        {entries.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Clock className="w-12 h-12" />
            <p className="text-sm">لا توجد حصص مجدولة لهذا اليوم</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-right px-4 py-3 font-medium">الحصة</th>
                  <th className="text-right px-4 py-3 font-medium">الوقت</th>
                  <th className="text-right px-4 py-3 font-medium">الفصل</th>
                  <th className="text-right px-4 py-3 font-medium">المادة</th>
                  <th className="text-right px-4 py-3 font-medium">المعلم</th>
                  <th className="text-right px-4 py-3 font-medium">التأخر</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.periodLabel}</td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">
                      {entry.startTime} — {entry.endTime}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {entry.classRoomGrade} / {entry.classRoomName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.subject}</td>
                    <td className="px-4 py-3 text-gray-700">{entry.teacherName}</td>
                    <td className="px-4 py-3">
                      <LateBadge minutes={entry.teacherLateMinutes} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openLateModal(entry.id, entry.teacherLateMinutes)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        تسجيل تأخر
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Late Modal */}
      <Modal
        open={lateModal.open}
        onClose={() => setLateModal({ open: false, entryId: "", currentMinutes: null })}
        title="تسجيل تأخر المعلم"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setLateModal({ open: false, entryId: "", currentMinutes: null })}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleMarkLate}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "جاري الحفظ..." : "حفظ"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">دقائق التأخر</label>
            <input
              type="number"
              min={0}
              value={lateForm.teacher_late_minutes}
              onChange={(e) => setLateForm((f) => ({ ...f, teacher_late_minutes: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وقت الوصول الفعلي</label>
            <input
              type="time"
              value={lateForm.teacher_arrived_at}
              onChange={(e) => setLateForm((f) => ({ ...f, teacher_arrived_at: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
