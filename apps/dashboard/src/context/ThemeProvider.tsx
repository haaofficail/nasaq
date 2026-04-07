/**
 * ThemeProvider — المصدر الوحيد لتحميل الثيم وتطبيقه
 *
 * ثلاث حالات استخدام:
 * 1. DashboardThemeProvider → للداشبورد (authenticated)
 * 2. usePublicTheme(data)   → للصفحات العامة (public pages)
 * 3. applyOrgTheme(...)     → للتحديث الفوري بعد الحفظ
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { applyOrgTheme } from "@/hooks/useOrgTheme";
import { websiteApi, settingsApi } from "@/lib/api";

// ── Context ──────────────────────────────────────────────────
interface ThemeCtx {
  /** استدعها بعد حفظ الثيم لتطبيق اللون فوراً */
  applyTheme: typeof applyOrgTheme;
}

const ThemeContext = createContext<ThemeCtx>({ applyTheme: applyOrgTheme });

export function useTheme() {
  return useContext(ThemeContext);
}

// ── DashboardThemeProvider ────────────────────────────────────
/**
 * يُغلّف Layout الداشبورد.
 * - يقرأ من localStorage فوراً (sync — بدون flash)
 * - ثم يُحدّث من API ويحفظ في cache
 * - يُنفَّذ مرة واحدة فقط per session
 */
export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const fetched = useRef(false);

  // تطبيق فوري من localStorage cache — قبل أول رسم
  // يمنع flash عند الانتقال من صفحات NasaqThemeGuard للداشبورد
  useLayoutEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem("nasaq_theme_cache") || "null");
      if (t?.p && /^#[0-9a-fA-F]{6}$/.test(t.p)) {
        applyOrgTheme(t.p, t.s ?? null, null, null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    Promise.all([
      websiteApi.config().catch(() => null),
      settingsApi.profile().catch(() => null),
    ]).then(([cfgRes, profRes]: any[]) => {
      const cfg  = cfgRes?.data;
      const prof = profRes?.data;
      const primary      = cfg?.primaryColor || prof?.primaryColor;
      const secondary    = cfg?.secondaryColor;
      const fontFamily   = cfg?.fontFamily;
      const businessType = prof?.businessType;
      if (primary) applyOrgTheme(primary, secondary, fontFamily, businessType);
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ applyTheme: applyOrgTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── usePublicTheme ────────────────────────────────────────────
/**
 * للصفحات العامة — يستقبل البيانات المجلوبة بالفعل ويطبّق الثيم.
 * لا يعمل API call إضافي — يستخدم البيانات الموجودة.
 *
 * @example
 * const [data, setData] = useState(null);
 * usePublicTheme(data);  // ← يطبّق فور وصول البيانات
 */
export function usePublicTheme(data: any) {
  useEffect(() => {
    if (!data) return;
    const primary      = data.config?.primaryColor || data.org?.primaryColor;
    const secondary    = data.config?.secondaryColor;
    const fontFamily   = data.config?.fontFamily;
    const businessType = data.org?.businessType;
    if (primary) applyOrgTheme(primary, secondary, fontFamily, businessType);
  }, [data]);
}
