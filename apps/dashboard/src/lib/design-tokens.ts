export const COLORS = {
  primary: "#5b9bd5",
  primaryLight: "#5b9bd510",
  primaryHover: "#4a8bc5",
  dark: "#1a1a2e",
  light: "#f8f9fc",
  border: "#e2e8f0",
  borderHover: "#5b9bd5",
  muted: "#94a3b8",
  background: "#f4f6f9",
  surface: "#ffffff",
  success: "#22c55e",
  successBg: "#ecfdf5",
  successText: "#059669",
  warning: "#f59e0b",
  warningBg: "#fffbeb",
  warningText: "#d97706",
  danger: "#ef4444",
  dangerBg: "#fef2f2",
  dangerText: "#dc2626",
  infoBg: "#eff6ff",
  infoText: "#2563eb",
} as const;

export const RADIUS = {
  sm: "6px",
  md: "8px",
  lg: "10px",
  xl: "12px",
  "2xl": "14px",
  "3xl": "16px",
  full: "9999px",
} as const;

export const SHADOWS = {
  focus: `0 0 0 3px #5b9bd515`,
  dropdown: "0 8px 30px rgba(0,0,0,0.08)",
  card: "0 1px 3px rgba(0,0,0,0.04)",
  cardHover: `0 0 0 3px #5b9bd515`,
} as const;

export const TYPOGRAPHY = {
  family: "'IBM Plex Sans Arabic', sans-serif",
  sizes: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "38px",
  },
} as const;

export const MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

export const DAYS_AR = ["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

export const STATUS_MAP = {
  active:    { label: "نشط",    bg: COLORS.successBg, color: COLORS.successText, dot: COLORS.success },
  pending:   { label: "معلّق",  bg: COLORS.warningBg, color: COLORS.warningText, dot: COLORS.warning },
  cancelled: { label: "ملغي",   bg: COLORS.dangerBg,  color: COLORS.dangerText,  dot: COLORS.danger },
  completed: { label: "مكتمل", bg: COLORS.infoBg,    color: COLORS.infoText,    dot: COLORS.primary },
  suspended: { label: "موقوف", bg: "#f1f5f9",        color: "#64748b",           dot: "#94a3b8" },
  confirmed: { label: "مؤكد",  bg: "#eff6ff",        color: "#1d4ed8",           dot: "#3b82f6" },
  draft:     { label: "مسودة", bg: "#f8fafc",        color: "#64748b",           dot: "#94a3b8" },
} as const;

export const ROLE_COLORS = {
  owner:     { bg: "#eff6ff", color: "#1d4ed8" },
  manager:   { bg: "#ecfdf5", color: "#047857" },
  provider:  { bg: "#fff1f2", color: "#be123c" },
  employee:  { bg: "#fffbeb", color: "#b45309" },
  reception: { bg: "#faf5ff", color: "#7c3aed" },
} as const;

export const EMPLOYMENT_TYPE_COLORS = {
  internal:   { bg: "#f0f9ff", color: "#0369a1", label: "داخلي" },
  freelance:  { bg: "#faf5ff", color: "#7c3aed", label: "مستقل" },
  outsourced: { bg: "#fff7ed", color: "#c2410c", label: "خارجي" },
} as const;
