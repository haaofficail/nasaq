import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import type { KPIConfig } from "@/lib/dashboardProfiles";

interface KPICardProps {
  config: KPIConfig;
}

export function KPICard({ config }: KPICardProps) {
  const { data, loading } = useApi(config.fetcher, []);
  const value = data != null ? config.transform(data) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all px-4 py-4 flex flex-col gap-2.5 direction-rtl">
      {/* Icon */}
      <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
        <config.icon className={clsx("w-4.5 h-4.5", config.iconColor)} />
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-7 w-20 rounded-lg bg-gray-100 animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight leading-none">
          {value}
        </p>
      )}

      {/* Label */}
      <p className="text-xs text-gray-400">
        {config.label}
        {config.unit && <span className="mr-1">· {config.unit}</span>}
      </p>
    </div>
  );
}
