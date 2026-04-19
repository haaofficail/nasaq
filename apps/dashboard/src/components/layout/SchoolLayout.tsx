import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  GraduationCap, ChevronLeft, ChevronRight, Bell, Search, LogOut, Menu, X, User,
  WifiOff, CheckCheck, ExternalLink, Clock, Settings,
  LayoutDashboard, ClipboardCheck, Users, DoorOpen, CalendarDays,
  AlertCircle, Upload, UserRoundCheck, ShieldAlert, Timer, MessageCircle, CalendarCheck2, CalendarRange, BookOpenCheck, Grid3X3, Tablet, Headphones, Briefcase,
} from "lucide-react";
import { clsx } from "clsx";
import { authApi } from "@/lib/api";
import { useOrgContext, invalidateOrgContextCache } from "@/hooks/useOrgContext";
import { Toaster } from "@/components/ui/Toaster";
import { useNetwork } from "@/hooks/useNetwork";
import { isNative } from "@/hooks/usePlatform";
import { useAlerts } from "@/hooks/useAlerts";

const SCHOOL_COLLAPSED_KEY = "nasaq_school_sidebar_collapsed";

const SCHOOL_NAV = [
  { name: "الرئيسية",           href: "/school/dashboard",           icon: LayoutDashboard, exact: true },
  { name: "مراقب اليوم",        href: "/school/day-monitor",         icon: ClipboardCheck,  exact: false },
  { name: "صفحة المعلم",        href: "/school/teacher-work",        icon: Tablet,          exact: false },
  { name: "الطلاب",              href: "/school/students",            icon: Users,           exact: false },
  { name: "المعلمون",             href: "/school/teachers",            icon: UserRoundCheck,  exact: false },
  { name: "الموظفون",             href: "/school/team",                icon: Briefcase,       exact: false },
  { name: "الفصول",              href: "/school/classes",             icon: DoorOpen,        exact: false },
  { name: "الحالات والمتابعة",   href: "/school/cases",               icon: AlertCircle,     exact: false },
  { name: "المخالفات",            href: "/school/violations",          icon: ShieldAlert,     exact: false },
  { name: "حضور المعلمين",         href: "/school/teacher-attendance",  icon: CalendarCheck2,  exact: false },
  { name: "التقويم الدراسي",       href: "/school/academic-calendar",   icon: CalendarRange,   exact: false },
  { name: "الجدول الدراسي",        href: "/school/timetable",           icon: Grid3X3,         exact: false },
  { name: "الإشعارات",            href: "/school/notifications",       icon: MessageCircle,   exact: false },
  { name: "الاستيراد",           href: "/school/import",              icon: Upload,          exact: false },
  { name: "الدعم الفني",          href: "/school/support",             icon: Headphones,      exact: false },
  { name: "الإعدادات",           href: "/school/account",             icon: Settings,        exact: false },
  { name: "دليل المستخدم",       href: "/school/guide",               icon: BookOpenCheck,   exact: false },
];

export function SchoolLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SCHOOL_COLLAPSED_KEY) === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { context, loading: ctxLoading } = useOrgContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline } = useNetwork();

  // Android back button
  useEffect(() => {
    if (!isNative) return;
    let handle: any;
    import("@capacitor/app").then(({ App: CapApp }) => {
      handle = CapApp.addListener("backButton", () => navigate(-1));
    });
    return () => handle?.then?.((h: any) => h.remove());
  }, [navigate]);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || sessionStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  })();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    ["nasaq_token", "nasaq_org_id", "nasaq_user_id", "nasaq_user"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    invalidateOrgContextCache();
    navigate("/school/login", { replace: true });
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SCHOOL_COLLAPSED_KEY, String(next));
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? location.pathname === href : location.pathname.startsWith(href);

  const isSuperAdmin = !!user?.isSuperAdmin;

  // Super admins go to their own panel
  if (isSuperAdmin) return <Navigate to="/admin" replace />;

  // Commerce accounts don't belong in school layout
  if (!ctxLoading && context && context.businessType !== "school") {
    return <Navigate to="/dashboard" replace />;
  }

  const { alerts, unread, markRead, readAll } = useAlerts();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentPage = SCHOOL_NAV.find((i) => isActive(i.href, i.exact));
  const orgName = user?.name || "المدرسة";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" dir="rtl" data-system="school">

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-[100] bg-red-500 text-white text-xs flex items-center justify-center gap-1.5 py-1.5">
          <WifiOff className="w-3.5 h-3.5" />
          <span>لا يوجد اتصال بالإنترنت</span>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar — clean light theme ── */}
      <aside
        className={clsx(
          "fixed inset-y-0 right-0 z-50 flex flex-col transition-all duration-300 ease-in-out md:static",
          "bg-white border-l border-[#eef2f6] shadow-sm md:shadow-none",
          collapsed ? "w-[64px]" : "w-[216px]",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
        style={{ paddingBottom: "var(--safe-area-bottom)" }}
      >
        {/* Logo */}
        <div className={clsx(
          "flex items-center border-b border-[#eef2f6] h-16 px-3 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
                <GraduationCap className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="leading-none">
                <span className="text-[15px] font-black text-gray-900 block tracking-tight">ترميز OS</span>
                <span className="text-[10px] font-semibold text-emerald-600">للمدارس</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <button onClick={toggleCollapsed}
              className="hidden lg:flex w-6 h-6 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {collapsed && (
            <button onClick={toggleCollapsed}
              className="hidden lg:absolute lg:flex lg:-left-2.5 lg:top-1/2 lg:-translate-y-1/2 w-5 h-5 items-center justify-center rounded-full bg-white border border-[#eef2f6] shadow-sm text-gray-500 hover:text-emerald-600 transition-colors">
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => setMobileOpen(false)} className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          <div className="space-y-0.5">
            {SCHOOL_NAV.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.name : undefined}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-gray-500 hover:bg-[#f8fafc] hover:text-gray-800"
                  )}
                >
                  <item.icon className={clsx(
                    "w-4 h-4 shrink-0 transition-colors",
                    active ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                  {!collapsed && active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className={clsx(
          "border-t border-[#eef2f6] p-2 shrink-0 space-y-0.5",
          collapsed && "flex flex-col items-center"
        )}>
          <NavLink
            to="/school/account"
            onClick={() => setMobileOpen(false)}
            title="الإعدادات"
            className={({ isActive: a }) => clsx(
              "flex items-center gap-2.5 p-2 rounded-xl transition-colors w-full",
              collapsed && "justify-center",
              a ? "bg-emerald-50 text-emerald-700" : "hover:bg-[#f8fafc] text-gray-600"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0 overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} className="w-full h-full object-cover" />
                : user?.name?.[0] || "م"
              }
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">{user?.name || "المستخدم"}</p>
                <p className="text-[10px] text-gray-400">الإعدادات</p>
              </div>
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className={clsx(
              "flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500 w-full text-[12px]",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Impersonate banner */}
        {user?.isImpersonating && (
          <div className="bg-amber-500 text-white text-xs flex items-center justify-between px-4 py-2 shrink-0">
            <span>أنت تعمل الآن داخل منشأة: <strong>{user.impersonateOrgName || "غير معروف"}</strong></span>
            <button
              onClick={() => {
                const original = localStorage.getItem("nasaq_impersonate_original_token");
                if (original) localStorage.setItem("nasaq_token", original);
                localStorage.removeItem("nasaq_impersonate_original_token");
                localStorage.removeItem("nasaq_org_id");
                localStorage.removeItem("nasaq_user_id");
                localStorage.removeItem("nasaq_user");
                window.location.href = "/dashboard/admin";
              }}
              className="underline font-semibold hover:no-underline"
            >
              خروج من الانتحال
            </button>
          </div>
        )}

        {/* Topbar — like landing header when scrolled: white + subtle border */}
        <header
          className="h-16 bg-white/95 backdrop-blur-sm border-b border-[#eef2f6] shadow-sm flex items-center justify-between px-4 md:px-5 shrink-0"
          style={{ paddingTop: "var(--safe-area-top)" }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500">
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm">
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <GraduationCap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-black text-gray-900">ترميز OS</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">للمدارس</span>
              </div>
              {currentPage && (
                <>
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-300 hidden sm:block" />
                  <span className="text-gray-700 font-semibold">{currentPage.name}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-[#f8fafc] border border-[#eef2f6] rounded-xl px-3 py-2 w-48 focus-within:border-emerald-300 focus-within:bg-white focus-within:shadow-sm transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="text" placeholder="بحث..." className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full" />
            </div>

            {/* Bell */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen(o => !o)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Bell className={clsx("w-4 h-4 transition-colors", unread > 0 ? "text-emerald-600" : "text-gray-500")} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 ring-2 ring-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute left-0 top-11 w-80 bg-white border border-[#eef2f6] rounded-2xl shadow-xl shadow-black/8 z-50 overflow-hidden" dir="rtl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#eef2f6]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-gray-900">الإشعارات</span>
                      {unread > 0 && (
                        <span className="text-[10px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">{unread} جديد</span>
                      )}
                    </div>
                    {unread > 0 && (
                      <button onClick={() => readAll()} className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                        <CheckCheck className="w-3.5 h-3.5" /> قراءة الكل
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Bell className="w-8 h-8 text-gray-200 mb-2" />
                        <p className="text-xs text-gray-400">لا توجد إشعارات</p>
                      </div>
                    ) : (
                      alerts.map((a: any) => (
                        <div
                          key={a.id}
                          onClick={() => {
                            if (!a.isRead) markRead(a.id);
                            if (a.link) { navigate(a.link); setBellOpen(false); }
                          }}
                          className={clsx(
                            "flex items-start gap-3 px-4 py-3 border-b border-gray-50 transition-colors cursor-pointer",
                            !a.isRead ? "bg-emerald-50/40 hover:bg-emerald-50" : "hover:bg-[#f8fafc]"
                          )}
                        >
                          <div className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", !a.isRead ? "bg-emerald-400" : "bg-transparent")} />
                          <div className="flex-1 min-w-0">
                            <p className={clsx("text-xs leading-snug", !a.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>{a.title}</p>
                            {a.body && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{a.body}</p>}
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-gray-300" />
                              <span className="text-[10px] text-gray-300">
                                {new Date(a.createdAt).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                          {a.link && <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-1" />}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2.5 bg-gray-50/60 border-t border-[#eef2f6]">
                    <button onClick={() => { navigate("/school/support"); setBellOpen(false); }}
                      className="w-full text-center text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                      عرض بوابة الدعم
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:ring-offset-1 transition-all shadow-sm">
              {user?.name?.[0] || "م"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "var(--safe-area-bottom)" }}>
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
}
