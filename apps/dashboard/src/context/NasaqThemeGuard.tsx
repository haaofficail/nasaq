/**
 * NasaqThemeGuard — يُطبّق هوية ترميز OS الثابتة على الصفحات التعريفية
 *
 * يُستخدم في: LandingPage, PricingPage, FeaturesPage, AboutPage, ContactPage
 *
 * الفلسفة:
 * - صفحات ترميز OS العامة = هوية ترميز OS دائماً (#5b9bd5)
 * - يُنظّف عند unmount لمنع التأثير على الداشبورد
 * - DashboardThemeProvider يُعيد تطبيق لون المنشأة فوراً عند mount
 */
import { useEffect, useLayoutEffect, type ReactNode } from "react";

// هوية ترميز OS الرسمية — لا تتغير
const NASAQ_BRAND         = "#5b9bd5";
const NASAQ_BRAND_HOVER   = "#3a7abf";
const NASAQ_BRAND_DARK    = "#3a7abf";
const NASAQ_BRAND_SOFT    = "#EBF3FB";
const NASAQ_BRAND_LIGHT   = "#EBF3FB";
const NASAQ_BRAND_200     = "#ADCFEF";
const NASAQ_BRAND_300     = "#85B7E7";
const NASAQ_BRAND_700     = "#2d6a9f";

const NASAQ_VARS: [string, string][] = [
  ["--brand-primary",        NASAQ_BRAND],
  ["--brand-primary-hover",  NASAQ_BRAND_HOVER],
  ["--brand-primary-dark",   NASAQ_BRAND_DARK],
  ["--brand-primary-soft",   NASAQ_BRAND_SOFT],
  ["--brand-primary-light",  NASAQ_BRAND_LIGHT],
  ["--brand-primary-200",    NASAQ_BRAND_200],
  ["--brand-primary-300",    NASAQ_BRAND_300],
  ["--brand-primary-400",    NASAQ_BRAND],
  ["--brand-primary-700",    NASAQ_BRAND_700],
  ["--brand-primary-focus",  `${NASAQ_BRAND}40`],
  ["--brand-secondary",      NASAQ_BRAND],
  ["--nasaq-primary",        NASAQ_BRAND],
  ["--sys-brand",            NASAQ_BRAND],
];

export function NasaqThemeGuard({ children }: { children: ReactNode }) {
  // useLayoutEffect → قبل أول رسم → لا flash
  useLayoutEffect(() => {
    const r = document.documentElement;
    NASAQ_VARS.forEach(([k, v]) => r.style.setProperty(k, v));

    // التنظيف عند الانتقال للداشبورد — يُزيل inline overrides
    // DashboardThemeProvider سيُطبّق لون المنشأة مكانها فوراً
    return () => {
      NASAQ_VARS.forEach(([k]) => r.style.removeProperty(k));
    };
  }, []);

  return <>{children}</>;
}
