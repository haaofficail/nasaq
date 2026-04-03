import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import { servicesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useBusiness } from "@/hooks/useBusiness";

export function TopServicesWidget() {
  const biz = useBusiness();
  const { data, loading } = useApi(() => servicesApi.list({ limit: "100" }), []);
  const services: any[] = data?.data || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 text-sm">{biz.terminology.topItemsTitle}</h2>
        <Link to="/dashboard/catalog" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
          الكل
        </Link>
      </div>
      <div className="space-y-2.5">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 p-1.5">
                <div className="w-6 h-6 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                <div className="w-10 h-3 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </>
        ) : services.length === 0 ? (
          <div className="py-4 text-center">
            <Layers className="w-6 h-6 text-gray-200 mx-auto mb-1.5" />
            <p className="text-xs text-gray-400">{biz.terminology.itemEmpty}</p>
            <Link to="/dashboard/catalog" className="text-xs text-brand-500 hover:text-brand-600 font-medium mt-1 inline-block">
              {biz.terminology.newItem}
            </Link>
          </div>
        ) : (
          services.slice(0, 4).map((service: any, i: number) => (
            <Link
              key={service.id}
              to={`/dashboard/catalog`}
              className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-gray-50 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-gray-700 truncate">{service.name}</span>
              <span className="text-xs text-gray-400 tabular-nums shrink-0">
                {service.totalBookings || 0} {biz.terminology.booking}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
