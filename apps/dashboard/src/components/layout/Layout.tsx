import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  Layers, ChevronLeft, ChevronRight, Bell, Search, Plus, LogOut, Menu, X, User, WifiOff,
  CheckCheck, ExternalLink, Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { authApi, orgSubscriptionApi } from "@/lib/api";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { useOrgContext, invalidateOrgContextCache } from "@/hooks/useOrgContext";
import { buildVisibleNav, BOTTOM_NAV, SUPER_ADMIN_NAV, type SubscriptionPlan } from "@/lib/navigationRegistry";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmDialogHost } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useNetwork } from "@/hooks/useNetwork";
import { isNative } from "@/hooks/usePlatform";
import { PLAN_MAP } from "@/lib/constants";
import { useAlerts } from "@/hooks/useAlerts";
import { FreePlanBanner } from "@/components/FreePlanBanner";
import { FreeLimitModal } from "@/components/FreeLimitModal";
// الداشبورد يستخدم هوية ترميز OS الثابتة — لا يُستورد DashboardThemeProvider هنا

// قائمة CSS vars التي تحقنها applyOrgTheme — نُزيلها عند دخول الداشبورد
const BRAND_VARS = [
  "--brand-primary", "--brand-primary-hover", "--brand-primary-dark",
  "--brand-primary-soft", "--brand-primary-light", "--brand-primary-200",
  "--brand-primary-300", "--brand-primary-400", "--brand-primary-700",
  "--brand-primary-focus", "--brand-secondary", "--brand-secondary-hover",
  "--brand-secondary-soft", "--nasaq-primary", "--sys-brand",
  "--sys-brand-dark", "--sys-brand-light", "--sys-brand-focus",
  "--accent-business", "--accent-business-soft", "--nasaq-font-family",
];

const COLLAPSED_KEY = "nasaq_sidebar_collapsed";

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { context } = useOrgContext();
  const platformConfig = usePlatformConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline } = useNetwork();

  // الداشبورد يستخدم هوية ترميز OS الثابتة — يُزيل أي ثيم تاجر مُطبَّق
  // يعمل قبل أول رسم لمنع أي flash
  useLayoutEffect(() => {
    const r = document.documentElement;
    BRAND_VARS.forEach(v => r.style.removeProperty(v));
  }, []);

  // Android back button — navigate back instead of closing app
  useEffect(() => {
    if (!isNative) return;
    let listenerHandle: any;
    import("@capacitor/app").then(({ App: CapApp }) => {
      listenerHandle = CapApp.addListener("backButton", () => { navigate(-1); });
    });
    return () => { listenerHandle?.then?.((h: any) => h.remove()); };
  }, [navigate]);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  })();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    ["nasaq_token", "nasaq_org_id", "nasaq_user_id", "nasaq_user"].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    invalidateOrgContextCache();
    navigate("/login", { replace: true });
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? location.pathname === href : location.pathname.startsWith(href);

  const isSuperAdmin = !!user?.isSuperAdmin;
  const isSchool = context?.businessType === "school" || user?.businessType === "school";

  const { data: subRes } = useApi(
    () => (isSuperAdmin ? Promise.resolve(null) : orgSubscriptionApi.get()),
    [isSuperAdmin]
  );
  const sub = subRes?.data;

  const { alerts, unread, markRead, readAll } = useAlerts();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Super admins have their own standalone panel — redirect them out of the merchant layout
  if (isSuperAdmin) return <Navigate to="/admin" replace />;

  // School accounts must NEVER enter the commerce layout — redirect to their own domain
  if (isSchool) return <Navigate to="/school/dashboard" replace />;

  const allGroups = isSuperAdmin
    ? []
    : buildVisibleNav(
        context
          ? {
              businessType: context.businessType,
              operatingProfile: context.operatingProfile,
              capabilities: context.capabilities,
              plan: (sub?.plan ?? "free") as SubscriptionPlan,
            }
          : { businessType: "", operatingProfile: "general", capabilities: ["bookings", "customers", "catalog", "media"], plan: "free" }
      );

  const allItems = allGroups.flatMap((g) => g.items);
  const currentPage =
    allItems.find((i) => isActive(i.href, i.exact)) ||
    BOTTOM_NAV.find((i) => isActive(i.href, i.exact)) ||
    (isSuperAdmin && isActive(SUPER_ADMIN_NAV.href) ? SUPER_ADMIN_NAV : undefined);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" dir="rtl" data-system="commerce">
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-[100] bg-red-500 text-white text-xs flex items-center justify-center gap-1.5 py-1.5">
          <WifiOff className="w-3.5 h-3.5" />
          <span>لا يوجد اتصال بالإنترنت</span>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-gray-100 transition-all duration-300 ease-in-out md:static shadow-xl md:shadow-none",
          collapsed ? "w-[68px]" : "w-[220px]",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
        style={{ paddingBottom: "var(--safe-area-bottom)" }}
      >
        {/* Logo */}
        <div className={clsx(
          "flex items-center border-b border-gray-100 h-16 px-4 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm overflow-hidden shrink-0"
                style={{ backgroundColor: platformConfig.primaryColor }}
              >
                {platformConfig.logoUrl
                  ? <img src={platformConfig.logoUrl} alt={platformConfig.platformName} className="w-full h-full object-contain" />
                  : <Layers className="w-4 h-4 text-white" />
                }
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ color: platformConfig.primaryColor }}>{platformConfig.platformName}</span>
            </div>
          )}
          {collapsed && (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm overflow-hidden"
              style={{ backgroundColor: platformConfig.primaryColor }}
            >
              {platformConfig.logoUrl
                ? <img src={platformConfig.logoUrl} alt={platformConfig.platformName} className="w-full h-full object-contain" />
                : <Layers className="w-4 h-4 text-white" />
              }
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileOpen(false)} className="md:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          {isSuperAdmin ? (
            // Super admin sees only admin + bottom nav
            <div className="space-y-0.5">
              {[SUPER_ADMIN_NAV, ...BOTTOM_NAV].map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.name : undefined}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      collapsed && "justify-center px-2",
                      active ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon className={clsx("w-4 h-4 shrink-0", active ? "text-brand-500" : "text-gray-400")} />
                    {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          ) : (
            <>
              {/* Regular nav groups */}
              {allGroups.map((group) => (
                <div key={group.label} className="mb-1">
                  {/* Section divider */}
                  {!collapsed && group.sectionLabel && (
                    <div className="flex items-center gap-2 px-3 pt-4 pb-1">
                      <span className="text-[11px] font-bold text-gray-700">{group.sectionLabel}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  )}
                  {collapsed && group.sectionLabel && <div className="h-px bg-gray-200 mx-2 my-3" />}
                  {!collapsed && (
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">
                      {group.label}
                    </p>
                  )}
                  {collapsed && !group.sectionLabel && <div className="h-px bg-gray-100 mx-2 my-2" />}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href, item.exact);
                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileOpen(false)}
                          title={item.name}
                          className={clsx(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                            collapsed && "justify-center px-2",
                            active ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <item.icon className={clsx("w-4 h-4 shrink-0", active ? "text-brand-500" : "text-gray-400")} />
                          {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Admin link for super admins in merchant context */}
              {isSuperAdmin && (
                <div className="mb-1">
                  {collapsed && <div className="h-px bg-gray-100 mx-2 my-2" />}
                  <NavLink
                    to={SUPER_ADMIN_NAV.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? SUPER_ADMIN_NAV.name : undefined}
                    className={({ isActive: a }) => clsx(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      collapsed && "justify-center px-2",
                      a ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {({ isActive: a }) => (
                      <>
                        <SUPER_ADMIN_NAV.icon className={clsx("w-4 h-4 shrink-0", a ? "text-brand-500" : "text-gray-400")} />
                        {!collapsed && <span className="flex-1 truncate">{SUPER_ADMIN_NAV.name}</span>}
                      </>
                    )}
                  </NavLink>
                </div>
              )}

              {/* Bottom nav (عام) — scrolls with main nav */}
              <div className="mb-1 mt-1">
                {collapsed ? (
                  <div className="h-px bg-gray-100 mx-2 my-2" />
                ) : (
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">عام</p>
                )}
                <div className="space-y-0.5">
                  {BOTTOM_NAV.map((item) => {
                    const active = isActive(item.href, item.exact);
                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={item.name}
                        className={clsx(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                          collapsed && "justify-center px-2",
                          active ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <item.icon className={clsx("w-4 h-4 shrink-0", active ? "text-brand-500" : "text-gray-400")} />
                        {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className={clsx("border-t border-gray-100 p-2 shrink-0 space-y-1", collapsed && "flex flex-col items-center space-y-1")}>
          {/* Subscription badge */}
          {!isSuperAdmin && sub && !collapsed && (
            <NavLink to="/dashboard/subscription" className="block px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">{PLAN_MAP[sub.plan]?.name ?? sub.plan}</span>
                <span className={clsx(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                  (sub.daysRemaining ?? 999) <= 7
                    ? "bg-red-50 text-red-600"
                    : (sub.daysRemaining ?? 999) <= 30
                    ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600"
                )}>
                  {sub.daysRemaining != null ? `${sub.daysRemaining} يوم` : "نشط"}
                </span>
              </div>
            </NavLink>
          )}
          {/* Account link */}
          <NavLink
            to="/dashboard/account"
            title="حسابي"
            className={({ isActive }) => clsx(
              "flex items-center gap-3 p-2 rounded-lg transition-colors w-full",
              collapsed && "justify-center w-auto",
              isActive ? "bg-brand-50 text-brand-600" : "hover:bg-gray-50 text-gray-700"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0 overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} className="w-full h-full object-cover" />
                : user?.name?.[0] || "م"
              }
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name || "المستخدم"}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />حسابي</p>
              </div>
            )}
          </NavLink>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className={clsx(
              "flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 group transition-colors text-gray-500 hover:text-red-500 w-full",
              collapsed && "justify-center w-auto"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-xs">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Free plan banner */}
        {!isSuperAdmin && sub?.plan === "free" && sub.freeState && sub.freeState !== "active" && (
          <FreePlanBanner
            bookingUsed={sub.bookingUsed ?? 0}
            bookingLimit={sub.bookingLimit ?? 15}
            freeState={sub.freeState as "near_limit" | "last_warning" | "reached"}
          />
        )}

        {/* Free plan modals (soft warning + hard stop) */}
        {!isSuperAdmin && sub?.plan === "free" && sub.freeState && sub.freeState !== "active" && (
          <FreeLimitModal
            orgId={sub.id ?? ""}
            freeState={sub.freeState as "near_limit" | "last_warning" | "reached"}
            bookingUsed={sub.bookingUsed ?? 0}
            bookingLimit={sub.bookingLimit ?? 15}
          />
        )}

        {/* Impersonate Banner */}
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

        {/* Header */}
        <header
          className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-5 shrink-0 overflow-visible relative z-30"
          style={{ paddingTop: "var(--safe-area-top)" }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              <Menu className="w-5 h-5" />
            </button>
            <nav className="flex items-center gap-1.5 text-sm">
              {currentPage && (
                <span className="text-gray-700 font-medium">{currentPage.name}</span>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 w-52 focus-within:border-brand-200 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="text" placeholder="بحث..." className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full" />
            </div>
            {/* Bell — real-time alerts */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen(o => !o)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Bell className={clsx("w-4 h-4 transition-colors", unread > 0 ? "text-brand-500" : "text-gray-500")} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 ring-2 ring-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute left-0 top-11 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-black/8 z-[200] overflow-hidden" dir="rtl">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-brand-500" />
                      <span className="text-sm font-bold text-gray-900">الإشعارات</span>
                      {unread > 0 && (
                        <span className="text-[10px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">{unread} جديد</span>
                      )}
                    </div>
                    {unread > 0 && (
                      <button onClick={() => readAll()} className="flex items-center gap-1 text-[11px] text-brand-500 hover:text-brand-600 font-medium transition-colors">
                        <CheckCheck className="w-3.5 h-3.5" /> قراءة الكل
                      </button>
                    )}
                  </div>

                  {/* List */}
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
                            !a.isRead ? "bg-brand-50/40 hover:bg-brand-50" : "hover:bg-gray-50"
                          )}
                        >
                          <div className={clsx(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            !a.isRead ? "bg-brand-400" : "bg-transparent"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className={clsx("text-xs leading-snug", !a.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                              {a.title}
                            </p>
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

                  {/* Footer */}
                  <div className="px-4 py-2.5 bg-gray-50/60 border-t border-gray-100">
                    <button onClick={() => { navigate("/dashboard/support"); setBellOpen(false); }}
                      className="w-full text-center text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors">
                      عرض بوابة الدعم
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm cursor-pointer hover:ring-2 hover:ring-brand-200 transition-all">
              {user?.name?.[0] || "م"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ paddingBottom: "calc(var(--safe-area-bottom) + 1.5rem)" }}>
          <Outlet />
        </main>
      </div>
      <Toaster />
      <ConfirmDialogHost />
    </div>
  );
}
