/**
 * StatsDetailed Block — Page Builder v2 (Day 14)
 *
 * Design: "Analytics Panel"
 * Dark navy dashboard aesthetic. Each metric tile glows with brand-blue borders.
 * Trend arrows (up=green, down=red, neutral=muted). Icon circle per stat.
 * 3-col desktop, 2-col tablet, 1-col mobile.
 *
 * RTL: dir=rtl, ps-/pe-, text-start
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";
import {
  TrendingUp, TrendingDown, Minus,
  ShoppingBag, Users, BarChart2, CheckCircle, RefreshCw,
  TrendingUp as TrendingUpIcon, Star, Zap, DollarSign,
  Package, Clock, Award, Globe, CreditCard, Lock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export type TrendDirection = "up" | "down" | "neutral";

export interface StatsDetailedItem {
  label:       string;
  value:       string;
  icon:        string;
  description: string;
  trend:       TrendDirection;
  trendValue:  string;
}

export interface StatsDetailedProps {
  heading:    string;
  subheading: string;
  stats:      StatsDetailedItem[];
}

// ── Icon map ──────────────────────────────────────────────────

const STAT_ICON_MAP: Record<string, React.ElementType> = {
  "trending-up":   TrendingUpIcon,
  "users":         Users,
  "bar-chart-2":   BarChart2,
  "shopping-bag":  ShoppingBag,
  "check-circle":  CheckCircle,
  "refresh-cw":    RefreshCw,
  "star":          Star,
  "zap":           Zap,
  "dollar-sign":   DollarSign,
  "package":       Package,
  "clock":         Clock,
  "award":         Award,
  "globe":         Globe,
  "credit-card":   CreditCard,
  "lock":          Lock,
};

function StatIcon({ name }: { name: string }) {
  const Comp = STAT_ICON_MAP[name] ?? BarChart2;
  return <Comp size={20} strokeWidth={1.5} aria-hidden="true" />;
}

// ── Trend colors ──────────────────────────────────────────────

const TREND_COLORS: Record<TrendDirection, string> = {
  up:      "#22c55e",
  down:    "#ef4444",
  neutral: "#6b7280",
};

function TrendBadge({ direction, value }: { direction: TrendDirection; value: string }) {
  const color = TREND_COLORS[direction];
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <span
      data-trend={direction}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium tabular-nums flex-shrink-0"
      style={{
        background: `${color}18`,
        color,
        fontSize:   "0.72rem",
      }}
    >
      <Icon size={11} strokeWidth={2.5} aria-hidden="true" />
      {value}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({ stat }: { stat: StatsDetailedItem }) {
  return (
    <div
      data-stat-card=""
      className="flex flex-col gap-3 rounded-2xl p-5 relative overflow-hidden"
      style={{
        background:  "rgba(255,255,255,0.04)",
        border:      "1px solid rgba(91,155,213,0.2)",
        boxShadow:   "0 1px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        transition:  "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Subtle corner glow */}
      <div
        className="absolute top-0 end-0 w-20 h-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 100% 0%, rgba(91,155,213,0.12) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between gap-3">
        <div
          data-stat-icon=""
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(91,155,213,0.15)",
            color:      "#5b9bd5",
          }}
        >
          <StatIcon name={stat.icon} />
        </div>
        <TrendBadge direction={stat.trend} value={stat.trendValue} />
      </div>

      {/* Value */}
      <div>
        <p
          className="font-bold tabular-nums leading-none text-start"
          style={{
            fontSize:      "clamp(1.5rem, 2.5vw, 2rem)",
            color:         "#ffffff",
            letterSpacing: "-0.04em",
          }}
        >
          {stat.value}
        </p>
        <p
          className="mt-1 font-semibold text-start"
          style={{ color: "#A0BFDA", fontSize: "0.82rem", letterSpacing: "0.01em" }}
        >
          {stat.label}
        </p>
      </div>

      {/* Description */}
      <p
        className="text-start leading-relaxed"
        style={{
          color:    "rgba(160,191,218,0.65)",
          fontSize: "0.75rem",
          lineHeight: "1.6",
        }}
      >
        {stat.description}
      </p>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 start-0 end-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(91,155,213,0.4), transparent)" }}
        aria-hidden="true"
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function StatsDetailedBlock({ heading, subheading, stats }: StatsDetailedProps) {
  return (
    <section
      dir="rtl"
      data-block="stats-detailed"
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "linear-gradient(160deg, #0D2138 0%, #0a1a2e 60%, #0D2138 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        {(heading || subheading) && (
          <div className="mb-10 text-start">
            {heading && (
              <h2
                className="font-bold text-start"
                style={{
                  fontSize:      "clamp(1.6rem, 3vw, 2.2rem)",
                  color:         "#ffffff",
                  letterSpacing: "-0.03em",
                }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p
                className="mt-2 text-start"
                style={{ color: "#7AADD4", fontSize: "0.9rem", lineHeight: "1.7" }}
              >
                {subheading}
              </p>
            )}
            <div
              className="mt-4 w-10 h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg, #5b9bd5, transparent)" }}
            />
          </div>
        )}

        {/* Grid */}
        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <StatCard key={i} stat={stat} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const StatsDetailedConfig: ComponentConfig<StatsDetailedProps> = {
  label: "إحصائيات تفصيلية",
  fields: {
    heading:    { type: "text",     label: "العنوان" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    stats: {
      type:  "array",
      label: "المؤشرات",
      arrayFields: {
        label:       { type: "text",     label: "التسمية" },
        value:       { type: "text",     label: "القيمة" },
        icon:        { type: "text",     label: "الأيقونة (مثال: users)" },
        description: { type: "textarea", label: "الوصف" },
        trend: {
          type:    "radio",
          label:   "الاتجاه",
          options: [
            { label: "صعود",   value: "up"      },
            { label: "هبوط",   value: "down"    },
            { label: "محايد",  value: "neutral" },
          ],
        },
        trendValue: { type: "text", label: "قيمة التغيير (مثال: +15%)" },
      },
      defaultItemProps: { label: "مؤشر جديد", value: "0", icon: "bar-chart-2", description: "وصف المؤشر", trend: "neutral", trendValue: "0%" },
    },
  },
  defaultProps: {
    heading:    "لوحة الأداء",
    subheading: "مؤشرات الأداء الرئيسية لهذا الشهر",
    stats: [
      { label: "المبيعات الشهرية",  value: "1.2M ريال", icon: "trending-up",  description: "إجمالي المبيعات هذا الشهر",    trend: "up",      trendValue: "+15%" },
      { label: "العملاء النشطون",   value: "8,432",      icon: "users",        description: "عملاء نشطون خلال آخر 30 يوم",  trend: "up",      trendValue: "+8%"  },
      { label: "معدل التحويل",      value: "3.8%",       icon: "bar-chart-2",  description: "نسبة الزوار الذين أتموا شراء", trend: "up",      trendValue: "+0.5%" },
      { label: "متوسط قيمة الطلب", value: "245 ريال",   icon: "shopping-bag", description: "متوسط قيمة كل طلب مكتمل",     trend: "neutral", trendValue: "0%"   },
      { label: "الطلبات المكتملة",  value: "15,234",     icon: "check-circle", description: "طلبات مكتملة هذا الشهر",       trend: "up",      trendValue: "+12%" },
      { label: "معدل الإرجاع",      value: "1.2%",       icon: "refresh-cw",   description: "نسبة الطلبات المُعادة",         trend: "down",    trendValue: "-0.3%" },
    ],
  },
  render: (props) => <StatsDetailedBlock {...props} />,
};
