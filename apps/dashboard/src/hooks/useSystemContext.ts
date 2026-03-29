import { useLocation } from "react-router-dom";

export type SystemContext = "school" | "commerce";

/**
 * Single source of truth for which system the user is currently in.
 * Checks route prefix first, then falls back to businessType in stored user profile.
 */
export function useSystemContext(): SystemContext {
  const { pathname } = useLocation();

  if (pathname.startsWith("/school")) return "school";

  try {
    const user = JSON.parse(
      localStorage.getItem("nasaq_user") ||
      sessionStorage.getItem("nasaq_user") ||
      "{}"
    );
    if (user?.businessType === "school") return "school";
  } catch {
    // ignore
  }

  return "commerce";
}
