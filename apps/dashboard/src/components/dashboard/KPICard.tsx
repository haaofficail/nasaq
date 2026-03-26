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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all px-4 py-3 flex items-center gap-3">
      <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
        <config.icon className={clsx("w-4 h-4", config.iconColor)} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="h-5 w-14 rounded bg-gray-100 animate-pulse mb-1" />
        ) : (
          <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
        )}
        <p className="text-[11px] text-gray-400 truncate">
          {config.label}
          {config.unit && <span className="mr-1">· {config.unit}</span>}
        </p>
      </div>
    </div>
  );
}
