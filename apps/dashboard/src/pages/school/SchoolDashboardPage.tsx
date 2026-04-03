import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Users, DoorOpen, AlertCircle, CalendarDays,
  ChevronLeft, Upload, MonitorCheck, GraduationCap,
  ShieldAlert, MessageCircle, Settings, CalendarRange,
  UserCheck, UserX, Clock, CheckCircle2, CalendarCheck2,
  BookOpen, Grid3X3, BookOpenCheck, Flag, Star, PartyPopper,
  TrendingUp, Layers, ClipboardList, Timer, UserRoundCheck,
  Bell, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { fmtHijriFull } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getWeekBounds(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const start = new Date(d); start.setDate(d.getDate() - day);
  const end   = new Date(d); end.setDate(d.getDate() + (4 - day));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now    = new Date(); now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));
}

function weekNumInSemester(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const now   = new Date(); now.setHours(0, 0, 0, 0);
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (7 * 86400000)));
}

// هل الوقت الحالي بين startTime و endTime؟
function isNowInRange(startTime: string, endTime: string, nowMinutes: number): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return nowMinutes >= toMin(startTime) && nowMinutes <= toMin(endTime);
}

function nowToMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToClock(m: number): string {
  const h = Math.floor(m / 60), min = m % 60;
  return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
}

const PERIOD_LABEL_AR = ["","الأولى","الثانية","الثالثة","الرابعة","الخامسة","السادسة","السابعة","الثامنة"];

const EVENT_COLORS: Record<string, { bg: string; text: string; icon: typeof Flag }> = {
  holiday:     { bg: "bg-red-50",    text: "text-red-700",    icon: Flag },
  national_day:{ bg: "bg-emerald-50",text: "text-emerald-700",icon: Star },
  exam:        { bg: "bg-violet-50", text: "text-violet-700", icon: BookOpen },
  activity:    { bg: "bg-amber-50",  text: "text-amber-700",  icon: PartyPopper },
  other:       { bg: "bg-gray-50",   text: "text-gray-600",   icon: CalendarDays },
};

// ── Module Card ───────────────────────────────────────────────

function ModuleCard({ label, desc, icon: Icon, href, bg, iconColor }: {
  label: string; desc: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string; bg: string; iconColor: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all text-right group w-full"
    >
      <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-colors", bg)}>
        <Icon className={clsx("w-4 h-4", iconColor)} />
      </div>
      <p className="text-sm font-bold text-gray-900 leading-snug">{label}</p>
      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{desc}</p>
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, bg, iconColor, border, loading, onClick }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string; iconColor: string; border: string; loading: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-2xl border p-5 transition-all",
        border,
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>
          <Icon className={clsx("w-5 h-5", iconColor)} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-lg mb-1" />
      ) : (
        <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">{value}</p>
      )}
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && !loading && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Circular Progress ─────────────────────────────────────────

function CircleProgress({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={4} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export function SchoolDashboardPage() {
  const navigate = useNavigate();
  const today  = todayStr();
  const { start: weekStart, end: weekEnd } = getWeekBounds(today);

  // Live clock — updates every minute
  const [nowMin, setNowMin] = useState(nowToMinutes());
  useEffect(() => {
    const id = setInterval(() => setNowMin(nowToMinutes()), 60000);
    return () => clearInterval(id);
  }, []);

  // API calls
  const { data: monitorData, loading: monitorLoading } = useApi(() => schoolApi.dayMonitor(), []);
  const { data: semData }    = useApi(() => schoolApi.getSemesters(), []);
  const { data: attData }    = useApi(() => schoolApi.getTeacherAttendance({ date: today }), [today]);
  const { data: evtData }    = useApi(
    () => schoolApi.getSchoolEvents({ from: weekStart, to: weekEnd }),
    [weekStart]
  );
  const { data: stuAttData } = useApi(
    () => schoolApi.getAttendanceStats({ date: today }),
    [today]
  );
  const { data: standbyData } = useApi(
    () => schoolApi.getStandbyActivations(today),
    [today]
  );
  const { data: classroomSummaryData } = useApi(
    () => schoolApi.getClassroomAttendanceSummary(today),
    [today]
  );

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || sessionStorage.getItem("nasaq_user") || "{}"); }
    catch { return {}; }
  })();

  // Derived data
  const stats        = (monitorData as any)?.data?.stats ?? {};
  const openCases    = (monitorData as any)?.data?.openCasesCount ?? 0;
  const todayEntries: any[] = (monitorData as any)?.data?.todayEntries ?? [];
  const semesters: any[] = (semData as any)?.data ?? [];
  const activeSem    = semesters.find((s: any) => s.isActive) ?? null;
  const attendance: any[] = (attData as any)?.data ?? [];
  const weekEvents: any[] = (evtData as any)?.data ?? [];
  const standbys: any[]   = (standbyData as any)?.data ?? [];

  // Teacher attendance breakdown
  const attPresent = attendance.filter((a: any) => a.status === "present").length;
  const attAbsent  = attendance.filter((a: any) => a.status === "absent").length;
  const attLate    = attendance.filter((a: any) => a.status === "late").length;
  const attExcused = attendance.filter((a: any) => a.status === "excused").length;
  const attTotal   = attendance.length;
  const attPct     = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  // Student attendance today
  const stuAttRows: any[] = (stuAttData as any)?.data ?? [];
  const stuPresent = stuAttRows.find((r: any) => r.status === "present")?.cnt ?? 0;
  const stuAbsent  = stuAttRows.find((r: any) => r.status === "absent")?.cnt  ?? 0;
  const stuLate    = stuAttRows.find((r: any) => r.status === "late")?.cnt    ?? 0;
  const stuTotal   = stuAttRows.reduce((sum: number, r: any) => sum + (r.cnt ?? 0), 0);
  const stuPct     = stuTotal > 0 ? Math.round((stuPresent / stuTotal) * 100) : 0;

  // Current period — from todayEntries
  const currentEntries = todayEntries.filter((e: any) =>
    e.startTime && e.endTime && isNowInRange(e.startTime, e.endTime, nowMin)
  );
  const currentPeriodNum: number | null = currentEntries[0]?.periodNumber ?? null;
  const currentPeriodStart: string | null = currentEntries[0]?.startTime ?? null;
  const currentPeriodEnd: string | null   = currentEntries[0]?.endTime ?? null;

  // Minutes remaining in current period
  const minutesLeft: number | null = currentPeriodEnd
    ? (() => {
        const [h, m] = currentPeriodEnd.split(":").map(Number);
        return Math.max(0, (h * 60 + m) - nowMin);
      })()
    : null;

  // Smart alerts derived data
  const classroomSummary: any[] = (classroomSummaryData as any)?.data ?? [];
  const classroomsNotRecorded = classroomSummary.filter((cr: any) => !cr.hasAttendance);
  const classroomsRecorded    = classroomSummary.filter((cr: any) => cr.hasAttendance);
  const totalClassrooms       = classroomSummary.length;
  const attendancePct         = totalClassrooms > 0
    ? Math.round((classroomsRecorded.length / totalClassrooms) * 100) : 0;

  // Teachers absent but not covered by standby
  const absentTeachers: any[] = (attData as any)?.data
    ? (attData as any).data.filter((a: any) => a.status === "absent")
    : [];
  const coveredCount   = standbys.length;
  const uncoveredCount = Math.max(0, attAbsent - coveredCount);

  // Semester calculations
  const remDays = activeSem?.endDate   ? daysUntil(activeSem.endDate)           : null;
  const weekNum = activeSem?.startDate ? weekNumInSemester(activeSem.startDate) : null;

  // Date display
  const todayHijri  = fmtHijriFull(new Date());
  const todayMiladi = new Date().toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const DAILY_MODULES = [
    { label: "مراقب اليوم",      desc: "لمحة فورية عن المدرسة",     icon: MonitorCheck,   href: "/school/day-monitor",       bg: "bg-blue-50",    iconColor: "text-blue-600" },
    { label: "حضور المعلمين",    desc: "تسجيل حضور وغياب المعلمين", icon: CalendarCheck2, href: "/school/teacher-attendance", bg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "الحالات والمتابعة",desc: "رصد وتتبع الحالات التربوية", icon: AlertCircle,    href: "/school/cases",              bg: "bg-orange-50",  iconColor: "text-orange-600" },
    { label: "المخالفات",         desc: "نظام نقاط السلوك",          icon: ShieldAlert,    href: "/school/violations",         bg: "bg-red-50",     iconColor: "text-red-600" },
  ];
  const MANAGE_MODULES = [
    { label: "المعلمون",         desc: "إدارة هيئة التدريس",         icon: Users,         href: "/school/teachers",           bg: "bg-violet-50",  iconColor: "text-violet-600" },
    { label: "الطلاب",           desc: "قاعدة بيانات الطلاب",        icon: GraduationCap, href: "/school/students",           bg: "bg-cyan-50",    iconColor: "text-cyan-600" },
    { label: "الفصول",           desc: "إدارة الفصول والمراحل",      icon: DoorOpen,      href: "/school/classes",            bg: "bg-amber-50",   iconColor: "text-amber-600" },
    { label: "المواد الدراسية", desc: "قائمة المواد والصفوف",         icon: BookOpen,      href: "/school/subjects",           bg: "bg-lime-50",    iconColor: "text-lime-700" },
    { label: "الجدول الدراسي",  desc: "الجدول الأسبوعي المرن",       icon: Grid3X3,       href: "/school/timetable",          bg: "bg-indigo-50",  iconColor: "text-indigo-600" },
    { label: "التقويم الدراسي", desc: "الفصول والإجازات والمناسبات", icon: CalendarRange, href: "/school/academic-calendar",  bg: "bg-teal-50",    iconColor: "text-teal-600" },
  ];
  const TOOLS_MODULES = [
    { label: "الإشعارات",        desc: "قوالب رسائل واتساب",         icon: MessageCircle, href: "/school/notifications",      bg: "bg-pink-50",    iconColor: "text-pink-600" },
    { label: "الاستيراد",        desc: "رفع Excel للطلاب والمعلمين", icon: Upload,        href: "/school/import",             bg: "bg-gray-100",   iconColor: "text-gray-600" },
    { label: "الإعدادات",        desc: "بيانات المدرسة وتوقيت الدوام",icon: Settings,     href: "/school/account",            bg: "bg-slate-100",  iconColor: "text-slate-600" },
    { label: "دليل المستخدم",   desc: "شرح جميع ميزات النظام",       icon: BookOpenCheck, href: "/school/guide",              bg: "bg-emerald-50", iconColor: "text-emerald-700" },
  ];

  return (
    <div dir="rtl" className="space-y-0">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-emerald-900 to-slate-800 px-6 pt-7 pb-12">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 left-1/3 w-72 h-32 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-48 h-24 bg-blue-400/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            {activeSem && (
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 rounded-full px-2.5 py-0.5">
                {activeSem.label || `الفصل ${activeSem.semesterNumber}`} — {activeSem.yearLabel}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">
            {user?.name ? `مرحباً، ${user.name}` : "لوحة التحكم"}
          </h1>
          <p className="text-sm text-emerald-300 mt-1 font-medium">{todayHijri}</p>
          <p className="text-xs text-gray-400 mt-0.5">{todayMiladi}</p>
          {activeSem && (
            <div className="flex items-center gap-4 mt-4">
              {weekNum !== null && (
                <div className="flex items-center gap-1.5 text-xs text-gray-300">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>الأسبوع <strong className="text-white">{weekNum}</strong></span>
                </div>
              )}
              {remDays !== null && (
                <div className="flex items-center gap-1.5 text-xs text-gray-300">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span><strong className="text-white">{remDays}</strong> يوم حتى نهاية الفصل</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 bg-gray-50">

        {/* ── KPI Cards — floating over hero ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-6">
          <KpiCard
            label="الطلاب" value={stats.students ?? 0}
            icon={GraduationCap} bg="bg-cyan-50" iconColor="text-cyan-600" border="border-cyan-100"
            loading={monitorLoading} onClick={() => navigate("/school/students")}
          />
          <KpiCard
            label="المعلمون" value={stats.teachers ?? 0}
            icon={Users} bg="bg-violet-50" iconColor="text-violet-600" border="border-violet-100"
            loading={monitorLoading} onClick={() => navigate("/school/teachers")}
          />
          <KpiCard
            label="الفصول" value={stats.classRooms ?? 0}
            icon={DoorOpen} bg="bg-amber-50" iconColor="text-amber-600" border="border-amber-100"
            loading={monitorLoading} onClick={() => navigate("/school/classes")}
          />
          <KpiCard
            label="حالات مفتوحة" value={openCases}
            sub={openCases > 0 ? "تحتاج متابعة" : "لا توجد حالات معلّقة"}
            icon={AlertCircle} bg="bg-rose-50" iconColor="text-rose-600" border="border-rose-100"
            loading={monitorLoading} onClick={() => navigate("/school/cases")}
          />
        </div>

        {/* ══════════════════════════════════════════
            متابعة إنجاز اليوم — Smart Daily Tracker
            ════════════════════════════════════════ */}
        {(totalClassrooms > 0 || stats.teachers > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <span className="text-sm font-black text-gray-900">متابعة إنجاز اليوم</span>
              </div>
              {totalClassrooms > 0 && (
                <span className={clsx(
                  "text-xs font-bold rounded-full px-2.5 py-0.5 border",
                  attendancePct === 100
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : attendancePct > 0
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-red-50 text-red-600 border-red-100"
                )}>
                  {classroomsRecorded.length}/{totalClassrooms} فصل
                </span>
              )}
            </div>

            <div className="divide-y divide-gray-50">

              {/* ── حضور الطلاب بالفصول ── */}
              {totalClassrooms > 0 && (() => {
                // Group by grade
                const grouped: Record<string, any[]> = {};
                classroomSummary.forEach((cr: any) => {
                  const g = cr.grade ?? "أخرى";
                  if (!grouped[g]) grouped[g] = [];
                  grouped[g].push(cr);
                });
                return (
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-700">حضور الطلاب</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full transition-all",
                              attendancePct === 100 ? "bg-emerald-500" : attendancePct > 50 ? "bg-amber-400" : "bg-red-400"
                            )}
                            style={{ width: `${attendancePct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 tabular-nums">{attendancePct}%</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(grouped).map(([grade, rooms]) => (
                        <div key={grade}>
                          <p className="text-[10px] font-bold text-gray-400 mb-1.5">{grade}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rooms.map((cr: any) => (
                              <button
                                key={cr.id}
                                onClick={() => navigate(`/school/attendance?classRoomId=${cr.id}`)}
                                title={cr.hasAttendance ? "سُجِّل الحضور" : "لم يُسجَّل — اضغط للتسجيل"}
                                className={clsx(
                                  "flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all",
                                  cr.hasAttendance
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                                )}
                              >
                                {cr.hasAttendance
                                  ? <CheckCircle2 className="w-3 h-3" />
                                  : <UserX className="w-3 h-3" />
                                }
                                فصل {cr.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {classroomsNotRecorded.length === 0 && totalClassrooms > 0 && (
                      <p className="text-xs text-emerald-600 font-bold mt-2">كل الفصول سجّلت الحضور اليوم</p>
                    )}
                  </div>
                );
              })()}

              {/* ── حضور المعلمين ── */}
              {stats.teachers > 0 && (
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-bold text-gray-700">حضور المعلمين</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all",
                            attPct === 100 ? "bg-emerald-500" : attPct > 0 ? "bg-amber-400" : "bg-gray-200"
                          )}
                          style={{ width: `${attPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 tabular-nums">{attTotal}/{stats.teachers}</span>
                    </div>
                  </div>

                  {attTotal === 0 ? (
                    <button
                      onClick={() => navigate("/school/teacher-attendance")}
                      className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-bold text-amber-800">لم يُسجَّل بعد — {stats.teachers} معلم</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "حاضر",   value: attPresent, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                          { label: "غائب",   value: attAbsent,  cls: "bg-red-50 border-red-200 text-red-600" },
                          { label: "متأخر",  value: attLate,    cls: "bg-amber-50 border-amber-200 text-amber-700" },
                          { label: "مستأذن", value: attExcused, cls: "bg-blue-50 border-blue-200 text-blue-600" },
                        ].filter(s => s.value > 0).map(s => (
                          <span key={s.label} className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${s.cls}`}>
                            {s.value} {s.label}
                          </span>
                        ))}
                      </div>
                      {uncoveredCount > 0 && (
                        <button
                          onClick={() => navigate("/school/teacher-attendance")}
                          className="w-full flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2 hover:bg-red-100 transition-colors mt-1"
                        >
                          <div className="flex items-center gap-2">
                            <UserX className="w-3.5 h-3.5 text-red-600" />
                            <span className="text-xs font-bold text-red-700">
                              {uncoveredCount} غائب بدون حصة انتظار
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            Widget 1: الحصة الجارية الآن
            ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <span className="text-sm font-black text-gray-900">الحصة الجارية الآن</span>
            </div>
            <span className="text-xs text-gray-400 font-mono tabular-nums">
              {minutesToClock(nowMin)}
            </span>
          </div>

          {monitorLoading ? (
            <div className="p-5 grid grid-cols-3 gap-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />)}
            </div>
          ) : currentPeriodNum !== null ? (
            <div className="p-5">
              {/* Current period header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex flex-col items-center justify-center shadow-lg shadow-indigo-200">
                  <span className="text-[10px] text-indigo-200 font-bold leading-none">الحصة</span>
                  <span className="text-2xl font-black text-white leading-none mt-0.5">
                    {currentPeriodNum}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900">
                    الحصة {PERIOD_LABEL_AR[currentPeriodNum] ?? currentPeriodNum}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {currentPeriodStart} — {currentPeriodEnd}
                  </p>
                </div>
                {minutesLeft !== null && (
                  <div className="mr-auto text-center">
                    <p className="text-2xl font-black text-indigo-600 tabular-nums leading-none">{minutesLeft}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">دقيقة متبقية</p>
                  </div>
                )}
              </div>

              {/* Classes in this period */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {currentEntries.slice(0, 8).map((e: any, i: number) => (
                  <div key={i} className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2.5">
                    <p className="text-xs font-bold text-indigo-900 truncate">{e.subject ?? "—"}</p>
                    <p className="text-[10px] text-indigo-600 mt-0.5 truncate">
                      {e.classRoomGrade} — فصل {e.classRoomName}
                    </p>
                    {e.teacherName && (
                      <p className="text-[9px] text-gray-400 mt-0.5 truncate">{e.teacherName}</p>
                    )}
                  </div>
                ))}
                {currentEntries.length > 8 && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 flex items-center justify-center">
                    <p className="text-xs text-gray-400 font-semibold">+{currentEntries.length - 8} أخرى</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // No active period
            <div className="px-5 py-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">
                  {todayEntries.length === 0
                    ? "لم يُفعَّل جدول لهذا اليوم"
                    : nowMin < 420
                    ? "قبل بداية الدوام"
                    : "انتهى الدوام لليوم"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {todayEntries.length > 0
                    ? `${todayEntries.length} حصة مجدولة اليوم`
                    : "فعّل الجدول من صفحة الجدول الدراسي"}
                </p>
              </div>
              <button
                onClick={() => navigate("/school/day-monitor")}
                className="mr-auto flex items-center gap-1 text-xs text-indigo-600 font-bold hover:text-indigo-700"
              >
                مراقب اليوم <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            Widget 2: حضور الطلاب اليوم
            ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Student Attendance Today */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center">
                  <UserRoundCheck className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <span className="text-sm font-black text-gray-900">حضور الطلاب اليوم</span>
              </div>
              <button
                onClick={() => navigate("/school/day-monitor")}
                className="text-[10px] text-cyan-600 font-bold hover:text-cyan-700"
              >تفاصيل</button>
            </div>
            <div className="p-5">
              {stuTotal === 0 ? (
                <div className="text-center py-4">
                  <GraduationCap className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">لم يُسجَّل حضور الطلاب بعد</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <CircleProgress pct={stuPct} color="#06b6d4" size={64} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-black text-gray-900 leading-none">{stuPct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { label: "حاضر",   value: stuPresent, color: "bg-cyan-500" },
                      { label: "غائب",   value: stuAbsent,  color: "bg-red-400" },
                      { label: "متأخر",  value: stuLate,    color: "bg-amber-400" },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <div className={clsx("w-2 h-2 rounded-full shrink-0", s.color)} />
                        <span className="text-[11px] text-gray-500 flex-1">{s.label}</span>
                        <span className="text-[11px] font-black text-gray-900 tabular-nums">{s.value}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400 pt-0.5 border-t border-gray-50">
                      إجمالي مسجّل: {stuTotal} طالب
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Teacher Attendance Today */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-sm font-black text-gray-900">حضور المعلمين اليوم</span>
              </div>
              <button
                onClick={() => navigate("/school/teacher-attendance")}
                className="text-[10px] text-emerald-600 font-bold hover:text-emerald-700"
              >تسجيل</button>
            </div>
            <div className="p-5">
              {attTotal === 0 ? (
                <div className="text-center py-4">
                  <CalendarCheck2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 mb-3">لم يُسجَّل حضور المعلمين بعد</p>
                  <button
                    onClick={() => navigate("/school/teacher-attendance")}
                    className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                  >تسجيل الحضور</button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <CircleProgress pct={attPct} color="#10b981" size={64} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-black text-gray-900 leading-none">{attPct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { label: "حاضر",   value: attPresent, color: "bg-emerald-500", icon: UserCheck },
                      { label: "غائب",   value: attAbsent,  color: "bg-red-400",     icon: UserX },
                      { label: "متأخر",  value: attLate,    color: "bg-amber-400",   icon: Clock },
                      { label: "مستأذن", value: attExcused, color: "bg-blue-400",    icon: CheckCircle2 },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <div className={clsx("w-2 h-2 rounded-full shrink-0", s.color)} />
                        <span className="text-[11px] text-gray-500 flex-1">{s.label}</span>
                        <span className="text-[11px] font-black text-gray-900 tabular-nums">{s.value}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400 pt-0.5 border-t border-gray-50">
                      إجمالي: {attTotal} معلم
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Widget 3: حصص الانتظار اليوم */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-sm font-black text-gray-900">حصص الانتظار اليوم</span>
              </div>
              {standbys.length > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                  {standbys.length} تكليف
                </span>
              )}
            </div>
            <div className="overflow-y-auto max-h-[180px]">
              {standbys.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">لا توجد حصص انتظار اليوم</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {standbys.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-amber-700">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {s.standbyTeacherName ?? s.standbyTeacherId?.slice(0, 8)}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {s.subject ?? "—"}{s.periodLabel ? ` · ${s.periodLabel}` : ""}
                        </p>
                      </div>
                      {s.classRoomName && (
                        <span className="text-[9px] font-bold text-[#5b9bd5] bg-[#5b9bd5]/10 rounded-full px-1.5 py-0.5 shrink-0">
                          {s.classRoomName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {attAbsent > 0 && standbys.length === 0 && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => navigate("/school/teacher-attendance")}
                  className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-100 transition-colors"
                >
                  {attAbsent} معلم غائب — كلّف حصص الانتظار
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ── Week Events ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#5b9bd5]/10 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 text-[#5b9bd5]" />
              </div>
              <span className="text-sm font-black text-gray-900">أحداث هذا الأسبوع</span>
            </div>
            <button
              onClick={() => navigate("/school/academic-calendar")}
              className="flex items-center gap-1 text-xs text-[#5b9bd5] font-bold hover:text-[#4a8bc4]"
            >
              التقويم <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          {weekEvents.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد أحداث هذا الأسبوع — أسبوع دراسي عادي</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-gray-50">
              {weekEvents.slice(0, 6).map((evt: any) => {
                const ec = EVENT_COLORS[evt.eventType] ?? EVENT_COLORS.other;
                const EIcon = ec.icon;
                return (
                  <div key={evt.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", ec.bg)}>
                      <EIcon className={clsx("w-3.5 h-3.5", ec.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{evt.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {evt.startDate}{evt.endDate && evt.endDate !== evt.startDate ? ` — ${evt.endDate}` : ""}
                      </p>
                    </div>
                    {evt.affectsAttendance && (
                      <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-1.5 py-0.5 shrink-0">
                        إجازة
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Navigation Grid ── */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-blue-500 rounded-full" />
              <h2 className="text-sm font-black text-gray-900">العمليات اليومية</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAILY_MODULES.map(m => <ModuleCard key={m.href} {...m} />)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-violet-500 rounded-full" />
              <h2 className="text-sm font-black text-gray-900">إدارة المدرسة</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {MANAGE_MODULES.map(m => <ModuleCard key={m.href} {...m} />)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-gray-300 rounded-full" />
              <h2 className="text-sm font-black text-gray-900">الأدوات</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TOOLS_MODULES.map(m => <ModuleCard key={m.href} {...m} />)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
