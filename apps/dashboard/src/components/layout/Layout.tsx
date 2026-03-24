import { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  Layers, ChevronLeft, ChevronRight, Bell, Search, Plus, LogOut, Menu, X, User,
} from "lucide-react";
import { clsx } from "clsx";
import { authApi, orgSubscriptionApi } from "@/lib/api";
import { useOrgContext, invalidateOrgContextCache } from "@/hooks/useOrgContext";
import { buildVisibleNav, BOTTOM_NAV, SUPER_ADMIN_NAV } from "@/lib/navigationRegistry";
import { Toaster } from "@/components/ui/Toaster";
import { useApi } from "@/hooks/useApi";
import { PLAN_MAP } from "@/lib/constants";

const COLLAPSED_KEY = "nasaq_sidebar_collapsed";

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { context } = useOrgContext();
  const location = useLocation();
  const navigate = useNavigate();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  })();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    ["nasaq_token", "nasaq_org_id", "nasaq_user_id", "nasaq_user"].forEach((k) => localStorage.removeItem(k));
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

  const { data: subRes } = useApi(
    () => (isSuperAdmin ? Promise.resolve(null) : orgSubscriptionApi.get()),
    [isSuperAdmin]
  );
  const sub = subRes?.data;

  // Super admins have their own standalone panel — redirect them out of the merchant layout
  if (isSuperAdmin) return <Navigate to="/admin" replace />;

  const allGroups = isSuperAdmin
    ? []
    : buildVisibleNav(
        context
          ? { businessType: context.businessType, operatingProfile: context.operatingProfile, capabilities: context.capabilities }
          : { businessType: "", operatingProfile: "general", capabilities: ["bookings", "customers", "catalog", "media"] }
      );

  const allItems = allGroups.flatMap((g) => g.items);
  const currentPage =
    allItems.find((i) => isActive(i.href, i.exact)) ||
    BOTTOM_NAV.find((i) => isActive(i.href, i.exact)) ||
    (isSuperAdmin && isActive(SUPER_ADMIN_NAV.href) ? SUPER_ADMIN_NAV : undefined);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" dir="rtl">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-gray-100 transition-all duration-300 ease-in-out lg:static shadow-xl lg:shadow-none",
          collapsed ? "w-[68px]" : "w-[220px]",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={clsx(
          "flex items-center border-b border-gray-100 h-16 px-4 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/30">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-brand-500 tracking-tight">نسق</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/30">
              <Layers className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
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
                  {!collapsed && (
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                      {group.label}
                    </p>
                  )}
                  {collapsed && <div className="h-px bg-gray-100 mx-2 my-2" />}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
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
            </>
          )}
        </nav>

        {/* Bottom nav (always visible) */}
        <div className="border-t border-gray-100 px-2 pt-2 shrink-0">
          {collapsed && <div className="h-px bg-gray-100 mx-2 mb-2" />}
          {!collapsed && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">عام</p>
          )}
          <div className="space-y-0.5 pb-2">
            {BOTTOM_NAV.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.name : undefined}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
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
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-5 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              <Menu className="w-5 h-5" />
            </button>
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-gray-400 font-medium">نسق</span>
              {currentPage && (
                <>
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-300" />
                  <span className="text-gray-700 font-medium">{currentPage.name}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 w-52 focus-within:border-brand-200 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="text" placeholder="بحث..." className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full" />
            </div>
            <button
              onClick={() => navigate("/dashboard/bookings")}
              className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-3.5 py-2 text-sm font-medium hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">حجز جديد</span>
            </button>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm cursor-pointer hover:ring-2 hover:ring-brand-200 transition-all">
              {user?.name?.[0] || "م"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
