// Reusable skeleton components for loading states

// Full-page loading skeleton — replaces Loader2 + "جاري التحميل..."
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-[#f1f5f9] rounded-lg w-40" />
          <div className="h-4 bg-[#f1f5f9] rounded-lg w-56" />
        </div>
        <div className="h-9 bg-[#f1f5f9] rounded-xl w-28" />
      </div>
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="divide-y divide-gray-50">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-[#f1f5f9] rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 bg-gray-100 rounded w-48" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-6 bg-[#f1f5f9] rounded-lg w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Inline skeleton — replaces "text-center py-12 جاري التحميل..."
export function SkeletonRows({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`animate-pulse divide-y divide-gray-50 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="w-8 h-8 bg-[#f1f5f9] rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-4 bg-gray-100 rounded w-44" />
            <div className="h-3 bg-gray-100 rounded w-28" />
          </div>
          <div className="h-5 bg-[#f1f5f9] rounded-lg w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Card grid skeleton — for KPI cards
export function SkeletonCards({ count = 4, cols = 4 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${cols} gap-3 animate-pulse`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#eef2f6] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#f1f5f9] rounded-xl" />
            <div className="h-4 bg-gray-100 rounded w-20 flex-1" />
          </div>
          <div className="h-7 bg-gray-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}
