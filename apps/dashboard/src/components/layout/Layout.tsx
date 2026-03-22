import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Layers, Tag, PlusCircle, CalendarCheck, CalendarDays,
  Users, Monitor, FileText, DollarSign, TrendingDown, BarChart3,
  Package, Truck, UserCog, BadgeCheck, Shield, ClipboardCheck,
  Globe, ShoppingCart, MessageCircle,
  Settings, CalendarCog, Building, Landmark, BookOpen, BarChart2, GitMerge,
  UtensilsCrossed, List, ChefHat, Armchair, Clock, Percent,
  Flower2, Gift, Key, FileSignature, ClipboardList, PartyPopper, Box, Database,
  ChevronLeft, ChevronRight, Bell, Search, Plus, LogOut, Menu, X,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { authApi, settingsApi } from "@/lib/api";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const CORE_GROUPS: NavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { name: "الرئيسية", href: "/dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "المبيعات",
    items: [
      { name: "الحجوزات",   href: "/dashboard/bookings",  icon: CalendarCheck },
      { name: "التقويم",    href: "/dashboard/calendar",  icon: CalendarDays },
      { name: "العملاء",    href: "/dashboard/customers", icon: Users },
      { name: "نقطة البيع", href: "/dashboard/pos",       icon: Monitor },
    ],
  },
  {
    label: "الكتالوج",
    items: [
      { name: "الخدمات",   href: "/dashboard/services",   icon: Layers },
      { name: "التصنيفات", href: "/dashboard/categories", icon: Tag },
      { name: "الإضافات",  href: "/dashboard/addons",     icon: PlusCircle },
    ],
  },
  {
    label: "المالية",
    items: [
      { name: "الفواتير",  href: "/dashboard/invoices",  icon: FileText },
      { name: "الإيرادات", href: "/dashboard/finance",   icon: DollarSign },
      { name: "المصروفات", href: "/dashboard/expenses",  icon: TrendingDown },
      { name: "الخزينة",      href: "/dashboard/treasury",             icon: Landmark },
      { name: "المحاسبة",     href: "/dashboard/accounting",           icon: BookOpen },
      { name: "القوائم المالية", href: "/dashboard/financial-statements", icon: BarChart2 },
      { name: "التسويات",    href: "/dashboard/reconciliation",        icon: GitMerge },
      { name: "التقارير",    href: "/dashboard/reports",               icon: BarChart3 },
    ],
  },
  {
    label: "الفريق",
    items: [
      { name: "الموظفون",      href: "/dashboard/staff",       icon: BadgeCheck },
      { name: "مقدمو الخدمة",  href: "/dashboard/providers",   icon: UserCog },
      { name: "الحضور",        href: "/dashboard/attendance",  icon: ClipboardCheck },
      { name: "الصلاحيات",     href: "/dashboard/permissions", icon: Shield },
    ],
  },
  {
    label: "المخزون",
    items: [
      { name: "المخزون",  href: "/dashboard/inventory", icon: Package },
      { name: "الموردون", href: "/dashboard/suppliers", icon: Truck },
    ],
  },
  {
    label: "القنوات",
    items: [
      { name: "موقعي",             href: "/dashboard/website",          icon: Globe },
      { name: "الطلبات الأونلاين", href: "/dashboard/online-orders",    icon: ShoppingCart },
      { name: "الرسائل",           href: "/dashboard/messaging",        icon: MessageCircle },
    ],
  },
];

// ── Food & Beverage group (shared by restaurant, cafe, catering, bakery)
const FOOD_GROUP: NavGroup = {
  label: "المطبخ والقائمة",
  items: [
    { name: "قائمة الطعام",    href: "/dashboard/menu",            icon: UtensilsCrossed },
    { name: "تصنيفات القائمة", href: "/dashboard/menu/categories", icon: List },
    { name: "المطبخ",          href: "/dashboard/kitchen",         icon: ChefHat },
    { name: "حجز الطاولات",    href: "/dashboard/reservations",    icon: Armchair },
  ],
};

// ── Beauty & Wellness group (shared by salon, barber, spa, fitness)
const BEAUTY_GROUP: NavGroup = {
  label: "المواعيد والفريق",
  items: [
    { name: "جدول المواعيد", href: "/dashboard/schedule",    icon: Clock },
    { name: "العمولات",       href: "/dashboard/commissions", icon: Percent },
  ],
};

const BUSINESS_GROUPS: Record<string, NavGroup> = {
  restaurant:  { ...FOOD_GROUP, label: "المطعم" },
  cafe:        { ...FOOD_GROUP, label: "المقهى" },
  catering:    { ...FOOD_GROUP, label: "الضيافة" },
  bakery:      { ...FOOD_GROUP, label: "المخبز" },
  salon:       { ...BEAUTY_GROUP, label: "الصالون" },
  barber:      { ...BEAUTY_GROUP, label: "الحلاقة" },
  spa:         { ...BEAUTY_GROUP, label: "السبا" },
  fitness:     { ...BEAUTY_GROUP, label: "الصالة الرياضية" },
  flower_shop: {
    label: "متجر الورود",
    items: [
      { name: "مخزون الورد",  href: "/dashboard/flower-inventory", icon: Flower2 },
      { name: "بيانات الورد", href: "/dashboard/flower-master",    icon: Database },
      { name: "التنسيقات",    href: "/dashboard/arrangements",     icon: Gift },
    ],
  },
  rental: {
    label: "التأجير",
    items: [
      { name: "الأصول",   href: "/dashboard/assets",      icon: Key },
      { name: "العقود",   href: "/dashboard/contracts",   icon: FileSignature },
      { name: "التفتيش",  href: "/dashboard/inspections", icon: ClipboardList },
    ],
  },
  events: {
    label: "الفعاليات",
    items: [
      { name: "الفعاليات", href: "/dashboard/events",   icon: PartyPopper },
      { name: "الباقات",   href: "/dashboard/packages", icon: Box },
    ],
  },
  hotel: {
    label: "الفندق",
    items: [
      { name: "إدارة الفندق", href: "/dashboard/hotel", icon: Building },
    ],
  },
  car_rental: {
    label: "تأجير السيارات",
    items: [
      { name: "تأجير السيارات", href: "/dashboard/car-rental", icon: Truck },
    ],
  },
  // photography, retail, store, services, medical, education, technology,
  // construction, logistics, other — use core groups only (no specialty group needed)
};

const SYSTEM_GROUP: NavGroup = {
  label: "الإعدادات",
  items: [
    { name: "التكاملات",       href: "/dashboard/integrations",     icon: Key },
    { name: "إعدادات النظام",  href: "/dashboard/settings",         icon: Settings },
    { name: "إعدادات الحجز",  href: "/dashboard/settings/booking", icon: CalendarCog },
    { name: "الملف التعريفي", href: "/dashboard/settings/profile", icon: Building },
  ],
};

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [businessType, setBusinessType] = useState(() => {
    // Fast path: get from cached user object set at login
    try {
      const u = JSON.parse(localStorage.getItem("nasaq_user") || "{}");
      return u.businessType || "";
    } catch { return ""; }
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Authoritative source: org profile from API
    settingsApi.profile()
      .then((res) => {
        const bt = res?.data?.businessType || res?.data?.business_type || "";
        if (bt) setBusinessType(bt);
      })
      .catch(() => {});
  }, []);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  })();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    ["nasaq_token", "nasaq_org_id", "nasaq_user_id", "nasaq_user"].forEach((k) =>
      localStorage.removeItem(k)
    );
    navigate("/login", { replace: true });
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? location.pathname === href : location.pathname.startsWith(href);

  const allGroups: NavGroup[] = [
    ...CORE_GROUPS,
    ...(businessType && BUSINESS_GROUPS[businessType] ? [BUSINESS_GROUPS[businessType]] : []),
    SYSTEM_GROUP,
  ];

  const allItems = allGroups.flatMap((g) => g.items);
  const currentPage = allItems.find((i) =>
    i.exact ? location.pathname === i.href : location.pathname.startsWith(i.href)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" dir="rtl">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-gray-100 transition-all duration-300 ease-in-out lg:static shadow-xl lg:shadow-none",
          collapsed ? "w-[68px]" : "w-60",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo + Collapse */}
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
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
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
                        active
                          ? "bg-brand-50 text-brand-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
        </nav>

        {/* User footer */}
        <div className={clsx("border-t border-gray-100 p-2 shrink-0", collapsed && "flex justify-center")}>
          {!collapsed ? (
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 group transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                {user?.name?.[0] || "م"}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name || "المستخدم"}</p>
                <p className="text-xs text-gray-400">تسجيل الخروج</p>
              </div>
              <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors shrink-0" />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm hover:bg-red-100 transition-colors"
            >
              {user?.name?.[0] || "م"}
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-5 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
            >
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
              <input
                type="text"
                placeholder="بحث..."
                className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-full"
              />
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
    </div>
  );
}
