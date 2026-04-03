import { clsx } from "clsx";
import { AlertCircle } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { KPIConfig } from "@/lib/dashboardProfiles";

interface KPICardProps {
  config: KPIConfig;
}

export function KPICard({ config }: KPICardProps) {
  const { data, loading, error } = useApi(config.fetcher, []);
  const value = data != null ? config.transform(data) : null;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-200 p-5 flex flex-col gap-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-50/0 group-hover:to-gray-50/50 transition-all duration-200 pointer-events-none rounded-2xl" />

      <div className={clsx(
        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
        "group-hover:scale-110 transition-transform duration-200",
        config.bg
      )}>
        <config.icon className={clsx("w-5 h-5", config.iconColor)} />
      </div>

      <div className="min-w-0">
        {loading ? (
          <>
            <div className="h-8 w-24 bg-gray-100 rounded-xl animate-pulse mb-2" />
            <div className="h-3 w-16 bg-gray-100 rounded-lg animate-pulse" />
          </>
        ) : error ? (
          <>
            <div className="flex items-center gap-1.5 text-gray-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">—</span>
            </div>
            <p className="text-xs text-gray-300 mt-1.5">{config.label}</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none tracking-tight">
              {value}
            </p>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              {config.label}
              {config.unit && <span className="mr-1.5 opacity-70">· {config.unit}</span>}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
