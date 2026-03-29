import { useState } from "react";
import { Clock, CalendarDays } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

const DAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الاثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
];

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu"] as const;

function todayDayOfWeek(): number {
  const d = new Date().getDay();
  // If today is Fri or Sat, default to Sun
  if (d === 5 || d === 6) return 0;
  return d;
}

type Entry = {
  id: string;
  periodNumber: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  classRoomGrade: string;
  classRoomName: string;
  subject: string;
  teacherName: string;
};

type GroupedPeriod = {
  periodNumber: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  entries: Entry[];
};

function groupByPeriod(entries: Entry[]): GroupedPeriod[] {
  const map = new Map<number, GroupedPeriod>();
  for (const e of entries) {
    if (!map.has(e.periodNumber)) {
      map.set(e.periodNumber, {
        periodNumber: e.periodNumber,
        periodLabel: e.periodLabel,
        startTime: e.startTime,
        endTime: e.endTime,
        isBreak: e.isBreak,
        entries: [],
      });
    }
    map.get(e.periodNumber)!.entries.push(e);
  }
  return Array.from(map.values()).sort((a, b) => a.periodNumber - b.periodNumber);
}

export function SchoolPeriodsPage() {
  const [selectedDay, setSelectedDay] = useState<number>(todayDayOfWeek);

  // Fetch active week first
  const { data: monitorData } = useApi(() => schoolApi.dayMonitor(), []);
  const activeWeekId: string | null = monitorData?.data?.activeWeek?.id ?? null;

  const { data, loading, error } = useApi(
    () =>
      activeWeekId
        ? schoolApi.getScheduleEntries({ weekId: activeWeekId, dayOfWeek: DAY_KEYS[selectedDay] })
        : Promise.resolve(null),
    [activeWeekId, selectedDay]
  );

  const entries: Entry[] = data?.data ?? [];
  const periods = groupByPeriod(entries);

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الحصص الدراسية</h1>
        <p className="text-sm text-gray-500 mt-1">عرض جدول الحصص حسب اليوم</p>
      </div>

      {/* Day Filter */}
      <div className="flex gap-2 flex-wrap">
        {DAYS.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDay(d.value)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              selectedDay === d.value
                ? "bg-emerald-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Active week indicator */}
      {monitorData?.data?.activeWeek && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CalendarDays className="w-4 h-4" />
          الأسبوع النشط: {monitorData?.data?.activeWeek?.label} ({monitorData?.data?.activeWeek?.startDate} — {monitorData?.data?.activeWeek?.endDate})
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : !activeWeekId ? (
        <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
          <CalendarDays className="w-12 h-12" />
          <p className="text-sm">لا يوجد أسبوع نشط. يرجى تعيين أسبوع نشط من صفحة الأسابيع.</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
          <Clock className="w-12 h-12" />
          <p className="text-sm">لا توجد حصص مجدولة لهذا اليوم</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => (
            <div
              key={period.periodNumber}
              className={clsx(
                "bg-white rounded-2xl border shadow-sm overflow-hidden",
                period.isBreak ? "border-amber-100" : "border-gray-100"
              )}
            >
              {/* Period header */}
              <div
                className={clsx(
                  "px-5 py-3 flex items-center justify-between",
                  period.isBreak ? "bg-amber-50" : "bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                      period.isBreak ? "bg-amber-200 text-amber-800" : "bg-emerald-600/10 text-emerald-600"
                    )}
                  >
                    {period.periodNumber}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{period.periodLabel}</p>
                    {period.isBreak && (
                      <span className="text-xs text-amber-700 font-medium">فسحة</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="tabular-nums">
                    {period.startTime} — {period.endTime}
                  </span>
                </div>
              </div>

              {/* Entries */}
              {!period.isBreak && period.entries.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {period.entries.map((e) => (
                    <div key={e.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-600/10 text-emerald-600">
                          {e.classRoomGrade} / {e.classRoomName}
                        </span>
                        <span className="text-sm text-gray-700 font-medium">{e.subject}</span>
                      </div>
                      <span className="text-sm text-gray-500">{e.teacherName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
