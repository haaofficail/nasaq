import { useMemo, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, QrCode, Printer, ExternalLink, AlertTriangle, CalendarCheck, Users, Package, Clock, CheckCircle2, Truck } from "lucide-react";
import { FlowersEventsDashboardSection } from "@/components/dashboard/FlowersEventsCards";
import { isFlowersEvents } from "@/lib/flowersEventsConfig";
import { clsx } from "clsx";
import { getProfile } from "@/lib/dashboardProfiles";
import { ProfileDashboard } from "@/components/dashboard/ProfileDashboard";
import { useOrgContext } from "@/hooks/useOrgContext";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useApi } from "@/hooks/useApi";
import { bookingsApi, settingsApi, inventoryApi, servicesApi, flowerBuilderApi, serviceOrdersApi } from "@/lib/api";
import { getDashboardPrimaryAction } from "@/lib/dashboardPrimaryAction";

// ── SmartAlertsBanner ──────────────────────────────────────────────────────────
// تنبيهات ذكية: مخزون منخفض، يوم مزدحم، لا خدمات
function SmartAlertsBanner({ businessType }: { businessType: string }) {
  const today = new Date().toISOString().split("T")[0];

  const { data: todayRes }     = useApi(() => bookingsApi.list({ limit: "50", startDate: today, endDate: today }), []);
  const { data: productsRes }  = useApi(() => inventoryApi.products(), []);
  const { data: servicesRes }  = useApi(() => servicesApi.list({ limit: "1" }), []);

  const todayCount   = (todayRes?.data ?? []).length as number;
  const lowStock     = ((productsRes?.data ?? []) as any[]).filter(p => p.is_low_stock);
  const hasServices  = ((servicesRes?.data ?? []) as any[]).length > 0;

  const alerts: { icon: React.ElementType; msg: string; sub?: string; href?: string; color: string; iconColor: string }[] = [];

  if (!hasServices) alerts.push({
    icon: Package,
    msg: "لم تضف أي خدمات بعد",
    sub: "ابدأ بإضافة أول خدمة لتستقبل حجوزاتك",
    href: "/dashboard/catalog",
    color: "bg-brand-50 border-brand-100",
    iconColor: "text-brand-500",
  });

  if (todayCount >= 5) alerts.push({
    icon: CalendarCheck,
    msg: `يومك مزدحم — ${todayCount} حجوزات اليوم`,
    sub: "تأكد من جاهزية فريقك والمستلزمات",
    href: "/dashboard/bookings",
    color: "bg-warning-soft border-warning-soft",
    iconColor: "text-warning",
  });

  if (lowStock.length > 0) alerts.push({
    icon: AlertTriangle,
    msg: `${lowStock.length === 1 ? "مادة قاربت على النفاد" : `${lowStock.length} مواد قاربت على النفاد`}`,
    sub: lowStock.slice(0, 2).map((p: any) => p.name).join("، ") + (lowStock.length > 2 ? " وأخرى..." : ""),
    href: "/dashboard/inventory?tab=consumables",
    color: "bg-danger-soft border-danger-soft",
    iconColor: "text-danger",
  });

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const Icon = a.icon;
        const inner = (
          <div className={clsx("flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm", a.color)}>
            <div className={clsx("shrink-0", a.iconColor)}><Icon className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-1)]">{a.msg}</p>
              {a.sub && <p className="text-xs text-[var(--text-2)] mt-0.5">{a.sub}</p>}
            </div>
            {a.href && <ArrowLeft className="w-4 h-4 text-[var(--text-3)] shrink-0" />}
          </div>
        );
        return a.href
          ? <Link key={i} to={a.href}>{inner}</Link>
          : <div key={i}>{inner}</div>;
      })}
    </div>
  );
}

// ── FlowerOpsPanel ─────────────────────────────────────────────────────────────
// Active / Late / Ready orders quick-view for flower shops
function FlowerOpsPanel() {
  const { data: statsRes, loading } = useApi(() => flowerBuilderApi.orderStats(), []);
  const { data: serviceStatsRes } = useApi(() => serviceOrdersApi.stats(), []);

  const stats = statsRes?.data ?? {};
  const serviceStats = serviceStatsRes?.data ?? {};

  const panels: { label: string; value: number; href: string; color: string; bg: string; icon: React.ElementType }[] = [
    {
      label: "طلبات نشطة",
      value: Number(stats.pending ?? 0) + Number(stats.confirmed ?? 0) + Number(stats.preparing ?? 0),
      href: "/dashboard/flower-orders",
      color: "text-brand-600",
      bg: "bg-brand-soft",
      icon: Package,
    },
    {
      label: "جاهز للتسليم",
      value: Number(stats.ready ?? 0),
      href: "/dashboard/flower-orders",
      color: "text-success",
      bg: "bg-success-soft",
      icon: CheckCircle2,
    },
    {
      label: "في الطريق",
      value: Number(stats.out_for_delivery ?? 0),
      href: "/dashboard/flower-delivery",
      color: "text-orange-600",
      bg: "bg-orange-50",
      icon: Truck,
    },
    {
      label: "خدمات تحت التنفيذ",
      // serviceOrdersApi.stats() may return in_progress or active depending on version
      value: Number(serviceStats.in_progress ?? serviceStats.active ?? 0),
      href: "/dashboard/flower-service-orders",
      color: "text-lavender",
      bg: "bg-lavender-soft",
      icon: Clock,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-[var(--surface-3)] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {panels.map(p => {
        const Icon = p.icon;
        return (
          <Link
            key={p.label}
            to={p.href}
            className="group bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-token-md transition-all"
          >
            <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0", p.bg)}>
              <Icon className={clsx("w-5 h-5", p.color)} />
            </div>
            <div className="min-w-0">
              <p className={clsx("text-xl font-bold tabular-nums", p.color)}>{p.value}</p>
              <p className="text-[11px] text-[var(--text-3)] truncate">{p.label}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── WelcomeView ────────────────────────────────────────────────────────────────
// Shown to new orgs (≤7 days old AND no bookings yet) — once per org only
function WelcomeView({ orgName, businessType, orgId }: { orgName: string; businessType: string; orgId: string }) {
  const navigate = useNavigate();
  const { platformName } = usePlatformConfig();
  const welcomeKey = `nasaq_welcome_seen_${orgId}`;

  // Mark as seen on first render — never show again after this
  useEffect(() => {
    localStorage.setItem(welcomeKey, "1");
  }, [welcomeKey]);

  const action = getDashboardPrimaryAction(businessType);
  const Icon = action.icon;

  const SECONDARY_BY_TYPE: Record<string, { label: string; href: string }[]> = {
    flower_shop: [
      { label: "إضافة باقة",    href: "/dashboard/arrangements" },
      { label: "إضافة موظف",   href: "/dashboard/team" },
      { label: "إعدادات المنشأة", href: "/dashboard/settings" },
    ],
    hotel: [
      { label: "إضافة غرفة",   href: "/dashboard/hotel" },
      { label: "إضافة موظف",   href: "/dashboard/team" },
      { label: "إعدادات المنشأة", href: "/dashboard/settings" },
    ],
    car_rental: [
      { label: "إضافة سيارة",  href: "/dashboard/car-rental" },
      { label: "إضافة موظف",   href: "/dashboard/team" },
      { label: "إعدادات المنشأة", href: "/dashboard/settings" },
    ],
    retail: [
      { label: "إضافة منتج",   href: "/dashboard/catalog" },
      { label: "إضافة موظف",   href: "/dashboard/team" },
      { label: "إعدادات المنشأة", href: "/dashboard/settings" },
    ],
  };

  const secondary = SECONDARY_BY_TYPE[businessType] ?? [
    { label: "إضافة خدمة",      href: "/dashboard/services" },
    { label: "إضافة موظف",      href: "/dashboard/team" },
    { label: "إعدادات المنشأة", href: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 gap-8">
      {/* Greeting */}
      <div className="space-y-2">
        <p className="text-sm text-[var(--text-3)] font-medium">مرحباً بك في {platformName}</p>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">
          {orgName ? `أهلاً، ${orgName}` : `ابدأ رحلتك مع ${platformName}`}
        </h1>
        <p className="text-sm text-[var(--text-2)] max-w-sm mx-auto">
          كل شيء جاهز — خطوة واحدة تفصلك عن تشغيل منشأتك
        </p>
      </div>

      {/* Primary CTA */}
      <Link
        to={action.href}
        className="flex flex-col items-center gap-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl px-10 py-6 transition-colors shadow-lg shadow-brand-500/20 w-full max-w-xs"
      >
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-lg font-bold">{action.label}</p>
          <p className="text-sm text-white/75 mt-0.5">{action.description}</p>
        </div>
      </Link>

      {/* Secondary actions */}
      <div className="flex flex-wrap justify-center gap-3">
        {secondary.map((s) => (
          <Link
            key={s.href}
            to={s.href}
            className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] hover:border-brand-300 hover:bg-brand-50 text-[var(--text-1)] hover:text-brand-700 text-sm font-medium rounded-xl px-4 py-2.5 transition-all"
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Skip to dashboard */}
      <button
        onClick={() => navigate("/dashboard", { replace: true })}
        className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
      >
        <span>تخطي إلى الداشبورد</span>
        <ArrowLeft className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── ActiveDashboardHeader ──────────────────────────────────────────────────────
// Compact CTA banner shown above the existing dashboard for active orgs
function ActiveDashboardHeader({ orgName, businessType }: { orgName: string; businessType: string }) {
  const action = getDashboardPrimaryAction(businessType);
  const Icon = action.icon;

  return (
    <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-[6px] mb-1">
      <div>
        <p className="text-sm font-semibold text-[var(--text-1)]">
          {orgName || "مرحباً"}
        </p>
        <p className="text-xs text-[var(--text-3)]">ماذا تريد أن تفعل اليوم؟</p>
      </div>
      <Link
        to={action.href}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
      >
        <Icon className="w-4 h-4" />
        <span>{action.label}</span>
      </Link>
    </div>
  );
}

// ── DashboardPage ──────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { context, loading } = useOrgContext();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  })();

  // School accounts go directly to their day monitor
  const businessType = context?.businessType ?? user?.businessType ?? "";
  if (!loading && businessType === "school") {
    return <Navigate to="/school/dashboard" replace />;
  }

  const { status: onboardingStatus, shouldShow, setStatus: setOnboarding } = useOnboarding();

  // Detect activity: fetch a single booking to know if org has ever used the system
  const { data: bookingsRes, loading: bookingsLoading } = useApi(
    () => bookingsApi.list({ limit: "1" }),
    []
  );

  // Fetch org profile to get name + createdAt
  const { data: profileRes, loading: profileLoading } = useApi(
    () => settingsApi.profile(),
    []
  );

  const isNewOrg = useMemo(() => {
    if (bookingsLoading || profileLoading) return false;
    const hasActivity = (bookingsRes?.data?.length ?? 0) > 0;
    if (hasActivity) return false;

    const org = profileRes?.data;
    if (!org?.createdAt) return false;
    const daysOld = (Date.now() - new Date(org.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysOld <= 7;
  }, [bookingsLoading, profileLoading, bookingsRes, profileRes]);

  const orgId: string = user?.orgId ?? context?.orgId ?? "";
  const welcomeKey = `nasaq_welcome_seen_${orgId}`;
  const welcomeSeen = localStorage.getItem(welcomeKey) === "1";

  const orgName: string = profileRes?.data?.name ?? user?.orgName ?? "";

  if (loading || bookingsLoading || profileLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 bg-[var(--surface-3)] rounded-lg w-48" />
            <div className="h-4 bg-[var(--surface-3)] rounded-lg w-64" />
          </div>
          <div className="h-10 bg-[var(--surface-3)] rounded-xl w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#f1f5f9] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#f1f5f9] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // New org → show focused welcome view once (never again after first visit)
  if (isNewOrg && !welcomeSeen) {
    return <WelcomeView orgName={orgName} businessType={businessType} orgId={orgId} />;
  }

  // Single source of truth: dashboardProfile from backend org context.
  const dashboardProfileKey = context?.dashboardProfile ?? "default";
  const profile = getProfile(dashboardProfileKey);

  const enrichedUser = {
    ...user,
    orgId: user.orgId || context?.orgId,
  };

  const orgSlug: string = profileRes?.data?.slug ?? "";

  return (
    <div className="space-y-4">
      {/* CTA header — محل الورد لا يحتاجه (ProfileDashboard يعرض header أقوى) */}
      {businessType !== "flower_shop" && (
        <ActiveDashboardHeader orgName={orgName} businessType={businessType} />
      )}

      {/* Public page quick access */}
      {orgSlug && (
        <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-[6px]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">صفحتك العامة</p>
              <p className="text-xs text-[var(--text-3)] font-mono">tarmizos.com/s/{orgSlug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/storefront?tab=qr"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text-2)] text-xs hover:bg-[var(--surface-2)] transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" /> باركود QR
            </Link>
            <a
              href={`/s/${orgSlug}/print`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text-2)] text-xs hover:bg-[var(--surface-2)] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> طباعة
            </a>
            <a
              href={`/s/${orgSlug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500 text-white text-xs hover:bg-brand-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> عرض
            </a>
          </div>
        </div>
      )}

      {businessType !== "flower_shop" && !isFlowersEvents(businessType) && (
        <SmartAlertsBanner businessType={businessType} />
      )}

      {/* Flower shop operations panel */}
      {businessType === "flower_shop" && <FlowerOpsPanel />}

      {/* flowers_events: 3 dedicated cards — upcoming events, daily sales, flower alerts */}
      {isFlowersEvents(businessType) && <FlowersEventsDashboardSection />}

      <ProfileDashboard profile={profile} user={enrichedUser} context={context ?? undefined} />

      {shouldShow && onboardingStatus && (
        <OnboardingWizard
          status={onboardingStatus}
          onComplete={() => setOnboarding(s => s ? { ...s, onboardingCompleted: true } : s)}
        />
      )}
    </div>
  );
}
