import { Link } from "react-router-dom";
import { servicesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export function TopServicesWidget() {
  const { data } = useApi(() => servicesApi.list({ limit: "100" }), []);
  const services: any[] = data?.data || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 text-sm">أبرز الخدمات</h2>
        <Link to="/dashboard/services" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
          الكل
        </Link>
      </div>
      <div className="space-y-2.5">
        {services.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">لا توجد خدمات</p>
        ) : (
          services.slice(0, 4).map((service: any, i: number) => (
            <Link
              key={service.id}
              to={`/dashboard/services/${service.id}`}
              className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-gray-50 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-gray-700 truncate">{service.name}</span>
              <span className="text-xs text-gray-400 tabular-nums shrink-0">
                {service.totalBookings || 0} حجز
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
