/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/page-builder-v2/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui-v2/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand (dynamic — يُحقن من site_config.primaryColor via applyOrgTheme) ──
        // بدون fallback صلب — القيمة الافتراضية محددة في :root داخل index.css فقط
        brand: {
          DEFAULT: "var(--brand-primary)",
          hover:   "var(--brand-primary-hover)",
          dark:    "var(--brand-primary-dark)",
          light:   "var(--brand-primary-light)",
          soft:    "var(--brand-primary-soft)",
          focus:   "var(--brand-primary-focus)",
          50:      "var(--brand-primary-soft)",
          100:     "var(--brand-primary-soft)",
          200:     "var(--brand-primary-200)",
          300:     "var(--brand-primary-300)",
          400:     "var(--brand-primary-400)",
          500:     "var(--brand-primary)",
          600:     "var(--brand-primary-dark)",
          700:     "var(--brand-primary-700)",
        },
        // ── Semantic palette (ثابتة — معنوية) ──
        // Base tokens
        ink:      { DEFAULT: "var(--ink, #2c2c2c)", soft: "var(--ink-soft, #4a4a4a)", muted: "var(--ink-muted, #7a7a7a)" },
        cream:    "var(--cream, #fefcf9)",
        sand:     { DEFAULT: "var(--sand, #f9f7f4)", d: "var(--sand-d, #f0ece6)" },
        // Semantic palette
        sage:     { DEFAULT: "var(--sage-main, #7fb09b)",     soft: "var(--sage-soft, #e8f2ed)",     bg: "var(--sage-bg, #f4f9f6)" },
        lavender: { DEFAULT: "var(--lavender-main, #9b8fc4)", soft: "var(--lavender-soft, #eee9f7)", bg: "var(--lavender-bg, #f7f5fb)" },
        rose:     { DEFAULT: "var(--rose-main, #d4917e)",     soft: "var(--rose-soft, #fae8e2)",     bg: "var(--rose-bg, #fdf5f2)" },
        sky:      { DEFAULT: "var(--sky-main, #7eb5d4)",      soft: "var(--sky-soft, #e1eff7)",      bg: "var(--sky-bg, #f2f8fc)" },
        honey:    { DEFAULT: "var(--honey-main, #d4b06a)",    soft: "var(--honey-soft, #f5edda)",    bg: "var(--honey-bg, #faf7ef)" },
        coral:    { DEFAULT: "var(--coral-main, #c98b8b)",    soft: "var(--coral-soft, #f5e3e3)",    bg: "var(--coral-bg, #fdf6f6)" },
        // ── State (semantic usage → CSS var) ──
        success:  { DEFAULT: "var(--color-success, #1a9e72)",  soft: "var(--color-success-soft, #d1fae5)" },
        warning:  { DEFAULT: "var(--color-warning, #d4b06a)",  soft: "var(--color-warning-soft, #fef3c7)" },
        danger:   { DEFAULT: "var(--color-danger, #dc2626)",   soft: "var(--color-danger-soft, #fee2e2)" },
        info:     { DEFAULT: "var(--color-info, #7eb5d4)",     soft: "var(--color-info-soft, #e0f2fe)" },
        // ── Surface tokens ──
        surface:  { page: "var(--surface-page, #f8fafc)", card: "var(--surface-card, #ffffff)", elevated: "var(--surface-elevated, #ffffff)" },
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Tajawal", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.7s ease forwards",
        "fade-in": "fadeIn 0.6s ease forwards",
        "slide-up": "slideUp 0.5s ease forwards",
        "counter": "counter 1.5s ease forwards",
        "orbit-slow": "orbit 20s linear infinite",
        "orbit-medium": "orbit 14s linear infinite",
        "orbit-fast": "orbit 9s linear infinite",
        "orbit-reverse": "orbitReverse 18s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        orbitReverse: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      borderRadius: {
        token: { sm: "var(--radius-sm, 8px)", md: "var(--radius-md, 14px)", lg: "var(--radius-lg, 24px)", xl: "var(--radius-xl, 32px)", full: "var(--radius-full, 100px)" },
      },
      boxShadow: {
        "token-xs":  "var(--shadow-xs)",
        "token-sm":  "var(--shadow-sm)",
        "token-md":  "var(--shadow-md)",
        "token-lg":  "var(--shadow-lg)",
        "token-xl":  "var(--shadow-xl)",
        "glow":      "var(--shadow-glow)",
        "glow-lg":   "var(--shadow-glow-lg)",
      },
      transitionTimingFunction: {
        "ease-out-token": "var(--ease-out)",
        "ease-spring":    "var(--ease-spring)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
