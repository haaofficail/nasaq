import { getProfile } from "@/lib/dashboardProfiles";
import { ProfileDashboard } from "@/components/dashboard/ProfileDashboard";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export function DashboardPage() {
  const { context, loading } = useOrgContext();
  const { status: onboardingStatus, shouldShow, setStatus: setOnboarding } = useOnboarding();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  })();

  if (loading) {
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

  // Single source of truth: dashboardProfile from backend org context.
  // Falls back to "default" (generic_dashboard) if context unavailable or profile unknown.
  const dashboardProfileKey = context?.dashboardProfile ?? "default";
  const profile = getProfile(dashboardProfileKey);

  const enrichedUser = {
    ...user,
    orgId: user.orgId || context?.orgId,
  };

  return (
    <>
      <ProfileDashboard profile={profile} user={enrichedUser} context={context ?? undefined} />
      {shouldShow && onboardingStatus && (
        <OnboardingWizard
          status={onboardingStatus}
          onComplete={() => setOnboarding(s => s ? { ...s, onboardingCompleted: true } : s)}
        />
      )}
    </>
  );
}
