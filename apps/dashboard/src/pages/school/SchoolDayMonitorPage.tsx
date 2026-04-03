import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Users, DoorOpen, GraduationCap, AlarmClock, CheckCircle2, XCircle,
  AlertCircle, UserCheck, Upload,
  CalendarRange, UsersRound, ChevronRight, Timer, BookOpen,
} from "lucide-react";
import { PageFAQ } from "@/components/school/PageFAQ";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

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


const PERIOD_LABEL_AR = ["","الأولى","الثانية","الثالثة","الرابعة","الخامسة","السادسة","السابعة","الثامنة"];

function nowToMinutes(): number { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function isNowInRange(s: string, e: string, now: number): boolean {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return now >= toMin(s) && now <= toMin(e);
}

export function SchoolDayMonitorPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useApi(() => schoolApi.dayMonitor(), []);
  const { data: semesterData }   = useApi(() => schoolApi.getSemesters(), []);

  const [nowMin, setNowMin] = useState(nowToMinutes());
  useEffect(() => {
    const id = setInterval(() => setNowMin(nowToMinutes()), 60000);
    return () => clearInterval(id);
  }, []);

  const today     = new Date();
  const todayName = DAY_MAP[today.getDay()] ?? "";
  const todayDate = today.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const nowClock  = `${String(today.getHours()).padStart(2,"0")}:${String(today.getMinutes()).padStart(2,"0")}`;

  const stats     = data?.data?.stats;
  const openCases = (data?.data as any)?.openCasesCount ?? 0;
  const semesters: any[] = semesterData?.data ?? [];
  const activeSemester   = semesters.find((s: any) => s.isActive);
  const todayEntries: any[] = (data?.data as any)?.todayEntries ?? [];

  // الحصة الجارية
  const currentEntry = todayEntries.find((e: any) =>
    e.startTime && e.endTime && isNowInRange(e.startTime, e.endTime, nowMin)
  );
  const currentPeriodNum: number | null = currentEntry?.periodNumber ?? null;
  const minutesLeft: number | null = currentEntry?.endTime
    ? (() => {
        const [h, m] = currentEntry.endTime.split(":").map(Number);
        return Math.max(0, (h * 60 + m) - nowMin);
      })()
    : null;

  // Setup checklist
  const setupSteps = [
    { done: (stats?.teachers ?? 0) > 0,    label: "إضافة المعلمين",     href: "/school/teachers",          icon: UsersRound },
    { done: !!activeSemester,               label: "تفعيل فصل دراسي",   href: "/school/academic-calendar", icon: CalendarRange },
  ];
  const setupDone = setupSteps.every(s => s.done);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مراقب اليوم المدرسي</h1>
          <p className="text-sm text-gray-500 mt-1">
            {todayName} — {todayDate}
            {activeSemester ? ` | ${activeSemester.label ?? `الفصل ${activeSemester.semesterNumber}`}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/school/attendance")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            تسجيل الحضور
          </button>
          {activeSemester && (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {activeSemester.startDate} — {activeSemester.endDate}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <button onClick={() => navigate("/school/teachers")} className="text-right">
          <StatCard icon={<Users className="w-6 h-6 text-white" />} label="المعلمون"    value={stats?.teachers   ?? 0} color="bg-emerald-600" />
        </button>
        <button onClick={() => navigate("/school/classes")} className="text-right">
          <StatCard icon={<DoorOpen className="w-6 h-6 text-white" />} label="الفصول"   value={stats?.classRooms ?? 0} color="bg-emerald-500" />
        </button>
        <button onClick={() => navigate("/school/students")} className="text-right">
          <StatCard icon={<GraduationCap className="w-6 h-6 text-white" />} label="الطلاب" value={stats?.students ?? 0} color="bg-violet-500" />
        </button>
        <button onClick={() => navigate("/school/cases")} className="text-right">
          <StatCard icon={<AlertCircle className="w-6 h-6 text-white" />} label="حالات مفتوحة" value={openCases} color={openCases > 0 ? "bg-amber-500" : "bg-gray-400"} />
        </button>
        <StatCard icon={<AlarmClock className="w-6 h-6 text-white" />} label="تأخرات اليوم" value={stats?.lateToday ?? 0} color={stats?.lateToday ? "bg-red-500" : "bg-gray-400"} />
      </div>

      {/* الحصة الجارية */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-gray-900">الحصة الجارية الآن</span>
          </div>
          <span className="text-xs font-mono text-gray-400">{nowClock}</span>
        </div>
        {currentEntry ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  الحصة {PERIOD_LABEL_AR[currentPeriodNum ?? 0] ?? currentPeriodNum}
                </p>
                <p className="text-xs text-gray-500">
                  {currentEntry.startTime} — {currentEntry.endTime}
                  {currentEntry.subject ? ` | ${currentEntry.subject}` : ""}
                </p>
              </div>
            </div>
            {minutesLeft !== null && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                {minutesLeft} دقيقة متبقية
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
              <Timer className="w-5 h-5 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                {todayEntries.length === 0 ? "لم يُفعَّل جدول لهذا اليوم" : nowMin < 420 ? "قبل بداية الدوام" : "انتهى الدوام لليوم"}
              </p>
              <p className="text-xs text-gray-400">
                {todayEntries.length === 0
                  ? <button onClick={() => navigate("/school/timetable")} className="text-emerald-600 hover:underline">افتح صفحة الجدول لتفعيله</button>
                  : `${todayEntries.length} حصة مجدولة اليوم`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Setup guide — only when incomplete */}
      {!setupDone && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-bold text-amber-800">إعداد النظام غير مكتمل</p>
          </div>
          <div className="space-y-2">
            {setupSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <button
                  key={i}
                  onClick={() => !step.done && navigate(step.href)}
                  className={clsx(
                    "w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-colors",
                    step.done
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                      : "bg-white border-amber-200 text-amber-800 hover:bg-amber-100 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center", step.done ? "bg-emerald-100" : "bg-amber-100")}>
                      {step.done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        : <Icon className="w-4 h-4 text-amber-600" />}
                    </div>
                    <span className="font-medium">{step.label}</span>
                  </div>
                  {!step.done && <ChevronRight className="w-4 h-4 text-amber-500" />}
                  {step.done && <span className="text-xs text-emerald-600 font-semibold">مكتمل</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إضافة معلم",      href: "/school/teachers",          icon: UsersRound,   color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "التقويم الدراسي", href: "/school/academic-calendar", icon: CalendarRange, color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "تسجيل مخالفة",    href: "/school/violations",        icon: XCircle,      color: "bg-red-50 border-red-200 text-red-700" },
          { label: "استيراد البيانات", href: "/school/import",            icon: Upload,       color: "bg-gray-50 border-gray-200 text-gray-700" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.href)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium hover:opacity-80 transition-all ${a.color}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {a.label}
            </button>
          );
        })}
      </div>

      <PageFAQ pageId="day-monitor" />
    </div>
  );
}
