/**
 * applyOrgTheme — Core theme injector
 *
 * يُحقن CSS variables على document.documentElement.
 * يُستدعى فقط من:
 *   1. DashboardThemeProvider  (الداشبورد)
 *   2. usePublicTheme          (الصفحات العامة)
 *   3. StorefrontPage          (بعد حفظ الثيم مباشرة)
 */

// ── Color math utilities ─────────────────────────────────────
function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function lighten(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function isValidHex(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

// ── businessType → accent color map ─────────────────────────
const BUSINESS_ACCENT: Record<string, string> = {
  flower_shop:  "#1a9e72", // sage
  salon:        "#9b8fc4", // lavender
  spa:          "#9b8fc4", // lavender
  restaurant:   "#c98b8b", // coral
  cafe:         "#d4b06a", // honey
  hotel:        "#7eb5d4", // sky
  car_rental:   "#7eb5d4", // sky
  photography:  "#d4917e", // rose
  events:       "#d4917e", // rose
  retail:       "#d4b06a", // honey
  rental:       "#7eb5d4", // sky
};

// ── Core injector ────────────────────────────────────────────
export function applyOrgTheme(
  primary: string,
  secondary?: string | null,
  fontFamily?: string | null,
  businessType?: string | null,
) {
  if (!primary || !isValidHex(primary)) return;

  const root = document.documentElement;

  // 1. Brand layer — dynamic (user controlled)
  root.style.setProperty("--brand-primary",       primary);
  root.style.setProperty("--brand-primary-hover",  darken(primary, 0.12));
  root.style.setProperty("--brand-primary-dark",   darken(primary, 0.18));
  root.style.setProperty("--brand-primary-soft",   lighten(primary, 0.88));
  root.style.setProperty("--brand-primary-light",  lighten(primary, 0.92));
  root.style.setProperty("--brand-primary-200",    lighten(primary, 0.72));
  root.style.setProperty("--brand-primary-300",    lighten(primary, 0.52));
  root.style.setProperty("--brand-primary-400",    lighten(primary, 0.18));
  root.style.setProperty("--brand-primary-700",    darken(primary, 0.28));
  root.style.setProperty("--brand-primary-focus",  `${primary}40`);

  const sec = (secondary && isValidHex(secondary)) ? secondary : primary;
  root.style.setProperty("--brand-secondary",       sec);
  root.style.setProperty("--brand-secondary-hover", darken(sec, 0.12));
  root.style.setProperty("--brand-secondary-soft",  lighten(sec, 0.88));

  // 2. businessType accent layer — للعناصر الثانوية فقط (badges, icons)
  // لا يُستخدم أبداً في: buttons, CTA, navbar, links
  const accent = (businessType && BUSINESS_ACCENT[businessType]) || null;
  if (accent) {
    root.style.setProperty("--accent-business",      accent);
    root.style.setProperty("--accent-business-soft", lighten(accent, 0.88));
  } else {
    // بدون businessType → الـ accent = الـ brand (لا ازدواج)
    root.style.setProperty("--accent-business",      primary);
    root.style.setProperty("--accent-business-soft", lighten(primary, 0.88));
  }

  // 3. Typography
  if (fontFamily) {
    root.style.setProperty("--nasaq-font-family", `'${fontFamily}', 'IBM Plex Sans Arabic', sans-serif`);
  }

  // 4. Cache في localStorage — يُقرأ في index.html قبل React لمنع flash
  try {
    localStorage.setItem("nasaq_theme_cache", JSON.stringify({
      p:   primary,
      h:   darken(primary, 0.12),
      d:   darken(primary, 0.18),
      sf:  lighten(primary, 0.88),
      l:   lighten(primary, 0.92),
      c2:  lighten(primary, 0.72),
      c3:  lighten(primary, 0.52),
      c4:  lighten(primary, 0.18),
      c7:  darken(primary, 0.28),
      s:   sec,
      f:   fontFamily ? `'${fontFamily}', 'IBM Plex Sans Arabic', sans-serif` : null,
    }));
  } catch (_) {}
}

/**
 * استدعها بعد حفظ الثيم لتطبيق اللون فوراً في الداشبورد
 * (DashboardThemeProvider يعيد الجلب تلقائياً في المرة القادمة)
 */
export function invalidateOrgTheme() {
  // لا يوجد singleton بعد الآن — applyOrgTheme مباشر
}
