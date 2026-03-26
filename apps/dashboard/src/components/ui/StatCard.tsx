import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  change?: number;
  changeType?: "up" | "down";
  unit?: string;
}

export function StatCard({ icon, label, value, change, changeType, unit }: StatCardProps) {
  const isUp = changeType === "up" || (change !== undefined && change > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all px-5 py-4 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-400 shrink-0">
          {icon}
        </div>
        {change !== undefined && (
          <span className={clsx(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
            isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
          )}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>

      {/* Value + label */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight leading-none">
            {typeof value === "number" ? value.toLocaleString("en-US") : value}
          </span>
          {unit && <span className="text-xs text-gray-400">{unit}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  );
}
