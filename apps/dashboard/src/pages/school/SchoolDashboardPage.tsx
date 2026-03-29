import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Users, DoorOpen, AlertCircle, CalendarDays, ChevronLeft, BookOpenCheck } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

function StatCard({
  label,
  value,
  icon: Icon,
  bg,
  iconColor,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  iconColor: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-gray-100 animate-pulse rounded-lg" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  label,
  icon: Icon,
  href,
  bg,
  text,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  bg: string;
  text: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center ${bg}`}
    >
      <Icon className={`w-6 h-6 ${text}`} />
      <span className={`text-sm font-medium ${text}`}>{label}</span>
    </button>
  );
}

export function SchoolDashboardPage() {
  const navigate = useNavigate();
  const { data: monitorData, loading } = useApi(() => schoolApi.dayMonitor(), []);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || sessionStorage.getItem("nasaq_user") || "{}"); }
    catch { return {}; }
  })();

  const stats = (monitorData as any)?.data?.stats ?? {};
  const todayEntries: any[] = (monitorData as any)?.data?.todayEntries ?? [];
  const openCases: number = (monitorData as any)?.data?.openCasesCount ?? 0;

  const now = new Date();
  const todayLabel = now.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مرحباً{user?.name ? `، ${user.name}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{todayLabel}</p>
        </div>
        <button
          onClick={() => navigate("/school/day-monitor")}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <ClipboardCheck className="w-4 h-4" />
          مراقب اليوم
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="المعلمون" value={stats.teachers ?? 0} icon={Users} bg="bg-emerald-50" iconColor="text-emerald-600" loading={loading} />
        <StatCard label="الطلاب" value={stats.students ?? 0} icon={Users} bg="bg-blue-50" iconColor="text-blue-600" loading={loading} />
        <StatCard label="الفصول" value={stats.classRooms ?? 0} icon={DoorOpen} bg="bg-violet-50" iconColor="text-violet-600" loading={loading} />
        <StatCard label="تأخر اليوم" value={stats.lateToday ?? 0} icon={AlertCircle} bg="bg-amber-50" iconColor="text-amber-600" loading={loading} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">وصول سريع</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction label="مراقب اليوم"       href="/school/day-monitor"         icon={ClipboardCheck}  bg="bg-emerald-50"  text="text-emerald-700" />
          <QuickAction label="الحالات"            href="/school/cases"               icon={AlertCircle}     bg="bg-red-50"      text="text-red-700" />
          <QuickAction label="قوالب الجداول"      href="/school/timetable-templates" icon={BookOpenCheck}   bg="bg-violet-50"   text="text-violet-700" />
          <QuickAction label="الأسابيع والجداول"  href="/school/schedules/weeks"     icon={CalendarDays}    bg="bg-sky-50"      text="text-sky-700" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">حصص اليوم</h2>
            <button
              onClick={() => navigate("/school/periods")}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
            >
              عرض الكل <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-12" />
              ))}
            </div>
          ) : todayEntries.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">لا توجد حصص مجدولة اليوم</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayEntries.slice(0, 5).map((entry: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {entry.classRoomGrade} / {entry.classRoomName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{entry.teacherName ?? "—"}</p>
                  </div>
                  <div className="text-left text-xs text-gray-500 tabular-nums" dir="ltr">
                    {entry.startTime} – {entry.endTime}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Cases */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">الحالات المفتوحة</h2>
            <button
              onClick={() => navigate("/school/cases")}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
            >
              عرض الكل <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-12" />
              ))}
            </div>
          ) : openCases === 0 ? (
            <div className="py-10 text-center">
              <p className="text-emerald-600 font-medium text-sm">لا توجد حالات مفتوحة</p>
              <p className="text-gray-400 text-xs mt-1">جميع الحالات مغلقة</p>
            </div>
          ) : (
            <div className="px-5 py-8 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{openCases}</p>
              <p className="text-sm text-gray-500">حالة تحتاج متابعة</p>
              <button
                onClick={() => navigate("/school/cases")}
                className="mt-2 px-4 py-1.5 bg-amber-500 text-white rounded-xl text-sm hover:bg-amber-600 transition-colors"
              >
                متابعة الحالات
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
