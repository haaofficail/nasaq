import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Plus, Settings2, Clock, Copy, Check, ExternalLink, ChevronLeft, TrendingUp, Zap, LayoutGrid, BookOpen } from "lucide-react";
import { SetupChecklist } from "./SetupChecklist";
import type { DashboardProfile, Role, WidgetConfig, QuickActionModal } from "@/lib/dashboardProfiles";
import { useDashboardPrefs } from "@/hooks/useDashboardPrefs";
import { passesContextGate } from "@/lib/widgetRegistry";
import type { OrgContext } from "@/hooks/useOrgContext";
import { useApi } from "@/hooks/useApi";
import { orgSubscriptionApi, settingsApi } from "@/lib/api";
import { PLAN_MAP } from "@/lib/constants";
import { KPICard } from "./KPICard";
import { QuickActionsGrid } from "./QuickActionsGrid";
import { CustomizePanel } from "./CustomizePanel";
import { CreateBookingForm } from "@/components/bookings/CreateBookingForm";
import { CreateCustomerForm } from "@/components/customers/CreateCustomerForm";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "صباح الخير";
  if (h >= 12 && h < 14) return "مرحباً";
  if (h >= 14 && h < 18) return "مساء الخير";
  if (h >= 18 && h < 22) return "مساء النور";
  return "طابت ليلتك";
}

const sizeClass: Record<WidgetConfig["size"], string> = {
  full:         "col-span-1 lg:col-span-6",
  "two-thirds": "col-span-1 lg:col-span-4",
  half:         "col-span-1 lg:col-span-3",
  third:        "col-span-1 lg:col-span-2",
};

interface ProfileDashboardProps {
  profile: DashboardProfile;
  user: { name?: string; role?: string; orgId?: string };
  context?: OrgContext;
}

export function ProfileDashboard({ profile, user, context }: ProfileDashboardProps) {
  const navigate = useNavigate();
  const currentRole = (user.role || "") as Role;
  const orgId = user.orgId || "default";
  const [showCustomize, setShowCustomize] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  const { data: subRes } = useApi(() => orgSubscriptionApi.get(), []);
  const sub = subRes?.data;

  const { data: profileRes } = useApi(() => settingsApi.profile(), []);
  const orgSlug: string | null = (profileRes?.data as any)?.slug ?? null;

  const { prefs, toggleWidget, toggleKpi, reorderWidgets, pinAction, resetPrefs } = useDashboardPrefs(orgId);

  const bookingLink = orgSlug ? `${window.location.origin}/book/${orgSlug}` : null;

  const handleCopyLink = () => {
    if (!bookingLink) return;
    navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const visibleKpis = profile.kpis
    .filter((k) => k.allowedRoles.length === 0 || k.allowedRoles.includes(currentRole))
    .filter((k) => !prefs.hiddenKpis.includes(k.id));

  const roleFilteredWidgets = profile.widgets
    .filter((w) => w.allowedRoles.length === 0 || w.allowedRoles.includes(currentRole))
    .filter((w) =>
      !context ||
      passesContextGate(w.id, {
        businessType: context.businessType,
        operatingProfile: context.operatingProfile,
        capabilities: context.capabilities,
      })
    );

  const orderedWidgets = (() => {
    if (prefs.widgetOrder.length === 0) return roleFilteredWidgets;
    const byId = Object.fromEntries(roleFilteredWidgets.map((w) => [w.id, w]));
    const ordered = prefs.widgetOrder.map((id) => byId[id]).filter(Boolean) as WidgetConfig[];
    const unordered = roleFilteredWidgets.filter((w) => !prefs.widgetOrder.includes(w.id));
    return [...ordered, ...unordered];
  })();

  const renderedWidgets = orderedWidgets.filter((w) => !prefs.hiddenWidgets.includes(w.id));

  const daysLeft  = sub?.daysRemaining ?? null;
  const planName  = PLAN_MAP[sub?.plan ?? ""]?.name ?? sub?.plan ?? null;
  const orgCode   = context?.orgCode ?? null;
  const greeting  = getGreeting();
  const dateStr   = new Date().toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════
          HEADER CARD
      ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Brand accent strip */}
        <div className="h-[3px] bg-gradient-to-r from-brand-600 via-brand-400 to-brand-300" />

        {/* Main content row */}
        <div className="flex items-start justify-between px-6 py-5 gap-4">
          {/* Left: greeting + date + profile type */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {profile.label && profile.label !== "افتراضي" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-100">
                  {profile.label}
                </span>
              )}
              {orgCode && (
                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100" dir="ltr">
                  {orgCode}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {greeting}{user.name ? `، ${user.name}` : ""}
            </h1>
            <p className="text-xs text-gray-400 mt-1">{dateStr}</p>
          </div>

          {/* Right: sub pill + customize + primary CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Subscription pill */}
            {(planName || daysLeft !== null) && (
              <Link
                to="/dashboard/subscription"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-brand-50 rounded-xl border border-gray-100 hover:border-brand-200 transition-all group text-xs"
              >
                {planName && (
                  <span className="font-semibold text-gray-700 group-hover:text-brand-700">{planName}</span>
                )}
                {planName && daysLeft !== null && (
                  <span className="w-px h-3 bg-gray-200" />
                )}
                {daysLeft !== null && (
                  <span className={clsx(
                    "font-bold flex items-center gap-0.5",
                    daysLeft <= 7 ? "text-red-500" : daysLeft <= 30 ? "text-amber-500" : "text-emerald-600"
                  )}>
                    <Clock className="w-3 h-3" />
                    {daysLeft}
                  </span>
                )}
                <ChevronLeft className="w-3 h-3 text-gray-300 group-hover:text-brand-400" />
              </Link>
            )}

            {/* Guide link */}
            <Link
              to="/dashboard/guide"
              title="دليل الاستخدام"
              className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-all"
            >
              <BookOpen className="w-4 h-4" />
            </Link>

            {/* Customize toggle */}
            <button
              onClick={() => setShowCustomize((v) => !v)}
              title="تخصيص اللوحة"
              className={clsx(
                "p-2 rounded-xl transition-all",
                showCustomize
                  ? "bg-brand-50 text-brand-600 border border-brand-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              )}
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Primary CTA */}
            <button
              onClick={() => navigate(profile.primaryAction.href)}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-px"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{profile.primaryAction.label}</span>
              <span className="sm:hidden">جديد</span>
            </button>
          </div>
        </div>

        {/* Booking link strip — مخصص للمنشآت التي تعمل بالحجوزات */}
        {bookingLink && context?.businessType !== "flower_shop" && (
          <div className="flex items-center gap-2 px-6 py-2.5 border-t border-gray-50 bg-gray-50/60">
            <a href={bookingLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 text-brand-400 hover:text-brand-600 transition-colors shrink-0" />
            </a>
            <span className="text-[11px] text-gray-400 shrink-0">رابط الحجز</span>
            <span className="w-px h-3 bg-gray-200 shrink-0" />
            <a
              href={bookingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-[11px] text-brand-500 font-mono truncate hover:underline"
              dir="ltr"
            >
              {bookingLink}
            </a>
            <button
              onClick={handleCopyLink}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-brand-50 text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-lg text-[11px] font-medium transition-all"
            >
              {copied
                ? <><Check className="w-3 h-3 text-emerald-500" /> تم</>
                : <><Copy className="w-3 h-3" /> نسخ</>
              }
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SETUP CHECKLIST — يختفي بعد اكتمال الإعداد أو الإخفاء
      ══════════════════════════════════════════════════════ */}
      <SetupChecklist />

      {/* ══════════════════════════════════════════════════════
          CUSTOMIZE PANEL
      ══════════════════════════════════════════════════════ */}
      {showCustomize && (
        <CustomizePanel
          profile={profile}
          currentRole={currentRole}
          prefs={prefs}
          toggleKpi={toggleKpi}
          toggleWidget={toggleWidget}
          resetPrefs={resetPrefs}
          onClose={() => setShowCustomize(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════════
          KPI CARDS
      ══════════════════════════════════════════════════════ */}
      {visibleKpis.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-500 tracking-wide">مؤشرات الأداء</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleKpis.map((kpi) => (
              <KPICard key={kpi.id} config={kpi} />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          QUICK ACTIONS
      ══════════════════════════════════════════════════════ */}
      {profile.quickActions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <Zap className="w-3.5 h-3.5 text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-500 tracking-wide">إجراءات سريعة</h2>
          </div>
          <QuickActionsGrid
            actions={profile.quickActions}
            currentRole={currentRole}
            onModalOpen={(modal: QuickActionModal) => {
              if (modal === "booking")  setShowNewBooking(true);
              if (modal === "customer") setShowNewCustomer(true);
              if (modal === "invoice")  setShowNewInvoice(true);
              if (modal === "service")  navigate("/dashboard/catalog?tab=services&new=1");
            }}
          />
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          WIDGETS
      ══════════════════════════════════════════════════════ */}
      {renderedWidgets.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <LayoutGrid className="w-3.5 h-3.5 text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-500 tracking-wide">نظرة عامة</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            {renderedWidgets.map((widget) => {
              const Widget = widget.component;
              return (
                <div key={widget.id} className={sizeClass[widget.size]}>
                  <Widget />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modals */}
      <CreateBookingForm
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        onSuccess={() => setShowNewBooking(false)}
      />
      <CreateCustomerForm
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        onSuccess={() => setShowNewCustomer(false)}
      />
      <CreateInvoiceModal
        open={showNewInvoice}
        onClose={() => setShowNewInvoice(false)}
        onSuccess={() => setShowNewInvoice(false)}
      />
    </div>
  );
}
