import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck, Users, DoorOpen, AlertCircle, CalendarDays,
  ChevronLeft, BookOpenCheck, ClipboardPen, Upload, MonitorCheck,
  GraduationCap,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ─── KPI Card — styled like landing features section ───────────────────────
function KpiCard({
  label, value, icon: Icon, bg, iconColor, border, loading,
}: {
  label: string; value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  bg: string; iconColor: string; border: string; loading: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border ${border} p-5 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-lg mb-1" />
      ) : (
        <p className="text-3xl font-black text-gray-900 tabular-nums mb-0.5">{value}</p>
      )}
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

// ─── Module Quick Action — styled like landing modules grid ─────────────────
function ModuleCard({
  label, desc, icon: Icon, href,
}: {
  label: string; desc: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 hover:shadow-sm transition-all text-center group"
    >
      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-100 transition-colors">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <p className="text-sm font-bold text-gray-900">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{desc}</p>
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
    <div dir="rtl" className="space-y-0">

      {/* ── Welcome Banner — dark gradient matching landing hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 px-6 pt-8 pb-10">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                نظام إدارة المدارس
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">
              {user?.name ? `مرحباً، ${user.name}` : "لوحة التحكم"}
            </h1>
            <p className="text-sm text-gray-400 mt-1">{todayLabel}</p>
          </div>
          <button
            onClick={() => navigate("/school/day-monitor")}
            className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 hover:-translate-y-0.5"
          >
            <MonitorCheck className="w-4 h-4" />
            مراقب اليوم
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8 bg-gray-50 min-h-full">

        {/* ── KPI Cards — like landing features ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-6">
          <KpiCard label="المعلمون"   value={stats.teachers   ?? 0} icon={Users}        bg="bg-emerald-50" iconColor="text-emerald-600" border="border-emerald-100" loading={loading} />
          <KpiCard label="الطلاب"     value={stats.students   ?? 0} icon={Users}        bg="bg-blue-50"    iconColor="text-blue-600"    border="border-blue-100"    loading={loading} />
          <KpiCard label="الفصول"     value={stats.classRooms ?? 0} icon={DoorOpen}     bg="bg-violet-50"  iconColor="text-violet-600"  border="border-violet-100"  loading={loading} />
          <KpiCard label="تأخر اليوم" value={stats.lateToday  ?? 0} icon={AlertCircle} bg="bg-amber-50"   iconColor="text-amber-600"   border="border-amber-100"   loading={loading} />
        </div>

        {/* ── Modules Grid — identical to landing modules section ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                وحدات النظام
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ModuleCard label="مراقب اليوم"       desc="لوحة الحصص اللحظية"  icon={MonitorCheck}  href="/school/day-monitor" />
            <ModuleCard label="الحالات والمتابعة" desc="رصد وتتبع الحالات"    icon={AlertCircle}   href="/school/cases" />
            <ModuleCard label="قوالب الجداول"      desc="صيفي وشتوي"          icon={BookOpenCheck} href="/school/timetable-templates" />
            <ModuleCard label="الأسابيع والجداول"  desc="بناء الجدول الأسبوعي" icon={ClipboardPen}  href="/school/schedules/weeks" />
            <ModuleCard label="الطلاب"             desc="قاعدة بيانات الطلاب" icon={Users}         href="/school/students" />
            <ModuleCard label="الفصول"             desc="إدارة الفصول والمراحل" icon={DoorOpen}     href="/school/classes" />
            <ModuleCard label="حصص اليوم"          desc="الجدول اليومي الحالي" icon={CalendarDays} href="/school/periods" />
            <ModuleCard label="الاستيراد"          desc="Excel / CSV"          icon={Upload}        href="/school/import" />
          </div>
        </div>

        {/* ── Today's Schedule + Open Cases ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Today's Schedule */}
          <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="font-bold text-gray-900">حصص اليوم</h2>
              </div>
              <button
                onClick={() => navigate("/school/periods")}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
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
              <div className="py-12 text-center text-gray-400">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">لا توجد حصص مجدولة اليوم</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {todayEntries.slice(0, 5).map((entry: any, i: number) => (
                  <div key={i} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {entry.classRoomGrade} / {entry.classRoomName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{entry.teacherName ?? "—"}</p>
                    </div>
                    <div className="text-xs text-gray-500 tabular-nums bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100" dir="ltr">
                      {entry.startTime} – {entry.endTime}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Cases */}
          <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <h2 className="font-bold text-gray-900">الحالات المفتوحة</h2>
              </div>
              <button
                onClick={() => navigate("/school/cases")}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
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
              <div className="py-12 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="font-semibold text-emerald-700 text-sm">لا توجد حالات مفتوحة</p>
                <p className="text-gray-400 text-xs">جميع الحالات تمت معالجتها</p>
              </div>
            ) : (
              <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <p className="text-4xl font-black text-gray-900 tabular-nums">{openCases}</p>
                  <p className="text-sm text-gray-500 mt-0.5">حالة تحتاج متابعة</p>
                </div>
                <button
                  onClick={() => navigate("/school/cases")}
                  className="px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  متابعة الحالات
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
