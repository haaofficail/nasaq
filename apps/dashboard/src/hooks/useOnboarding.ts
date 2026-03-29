import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/api";

export interface OnboardingStatus {
  onboardingCompleted: boolean;
  onboardingStep: string;
  hasDemoData: boolean;
  businessType: string;
  orgName: string;
}

// Session-level flag — don't re-show wizard after user dismisses it
let _dismissed = false;

export function dismissOnboarding(): void {
  _dismissed = true;
}

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi
      .profile()
      .then((res: any) => {
        const d = res.data;
        setStatus({
          onboardingCompleted: d.onboardingCompleted ?? false,
          onboardingStep:      d.onboardingStep ?? "0",
          hasDemoData:         d.hasDemoData ?? false,
          businessType:        d.businessType ?? "general",
          orgName:             d.name ?? "",
        });
      })
      .catch(() => {
        // On error: assume completed so wizard doesn't block the dashboard
        setStatus({ onboardingCompleted: true, onboardingStep: "done", hasDemoData: false, businessType: "general", orgName: "" });
      })
      .finally(() => setLoading(false));
  }, []);

  const shouldShow = !loading && !_dismissed && status !== null && !status.onboardingCompleted && status.businessType !== "school";

  return { status, loading, shouldShow, setStatus };
}
