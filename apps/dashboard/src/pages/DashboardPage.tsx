import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/dashboardProfiles";
import { ProfileDashboard } from "@/components/dashboard/ProfileDashboard";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useApi } from "@/hooks/useApi";
import { bookingsApi, settingsApi } from "@/lib/api";
import { getDashboardPrimaryAction } from "@/lib/dashboardPrimaryAction";

// ── WelcomeView ────────────────────────────────────────────────────────────────
// Shown to new orgs (≤7 days old AND no bookings yet)
function WelcomeView({ orgName, businessType }: { orgName: string; businessType: string }) {
  const action = getDashboardPrimaryAction(businessType);
  const Icon = action.icon;

  const secondary = [
    { label: "إضافة خدمة",  href: "/dashboard/services" },
    { label: "إضافة موظف",  href: "/dashboard/team" },
    { label: "إعدادات المنشأة", href: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 gap-8">
      {/* Greeting */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400 font-medium">مرحباً بك في نسق</p>
        <h1 className="text-2xl font-bold text-gray-900">
          {orgName ? `أهلاً، ${orgName}` : "ابدأ رحلتك مع نسق"}
        </h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
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
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 hover:text-brand-700 text-sm font-medium rounded-xl px-4 py-2.5 transition-all"
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Skip to dashboard */}
      <Link
        to="/dashboard?skip_welcome=1"
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span>تخطي إلى الداشبورد</span>
        <ArrowLeft className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ── ActiveDashboardHeader ──────────────────────────────────────────────────────
// Compact CTA banner shown above the existing dashboard for active orgs
function ActiveDashboardHeader({ orgName, businessType }: { orgName: string; businessType: string }) {
  const action = getDashboardPrimaryAction(businessType);
  const Icon = action.icon;

  return (
    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-3.5 mb-1">
      <div>
        <p className="text-sm font-semibold text-gray-900">
          {orgName || "مرحباً"}
        </p>
        <p className="text-xs text-gray-400">ماذا تريد أن تفعل اليوم؟</p>
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

  // Check if user explicitly skipped the welcome screen
  const skipWelcome = new URLSearchParams(window.location.search).get("skip_welcome") === "1";

  const orgName: string = profileRes?.data?.name ?? user?.orgName ?? "";

  if (loading || bookingsLoading || profileLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 bg-gray-100 rounded-lg w-48" />
            <div className="h-4 bg-gray-100 rounded-lg w-64" />
          </div>
          <div className="h-10 bg-gray-100 rounded-xl w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // New org → show focused welcome view (unless explicitly skipped)
  if (isNewOrg && !skipWelcome) {
    return <WelcomeView orgName={orgName} businessType={businessType} />;
  }

  // Single source of truth: dashboardProfile from backend org context.
  const dashboardProfileKey = context?.dashboardProfile ?? "default";
  const profile = getProfile(dashboardProfileKey);

  const enrichedUser = {
    ...user,
    orgId: user.orgId || context?.orgId,
  };

  return (
    <div className="space-y-4">
      {/* Sticky CTA header for all active orgs */}
      <ActiveDashboardHeader orgName={orgName} businessType={businessType} />

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
