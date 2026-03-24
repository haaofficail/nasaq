import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import type { KPIConfig } from "@/lib/dashboardProfiles";

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

interface KPICardProps {
  config: KPIConfig;
}

export function KPICard({ config }: KPICardProps) {
  const { data, loading } = useApi(config.fetcher, []);
  const value = data != null ? config.transform(data) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", config.bg)}>
          <config.icon className={clsx("w-4.5 h-4.5", config.iconColor)} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24 mb-1" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      )}
      <p className="text-xs text-gray-400 mt-0.5">{config.label} · {config.unit}</p>
    </div>
  );
}
