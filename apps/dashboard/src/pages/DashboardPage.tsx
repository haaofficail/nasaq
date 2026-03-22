import { getProfile } from "@/lib/dashboardProfiles";
import { ProfileDashboard } from "@/components/dashboard/ProfileDashboard";

export function DashboardPage() {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  })();

  const profile = getProfile(user.businessType);

  return <ProfileDashboard profile={profile} user={user} />;
}
