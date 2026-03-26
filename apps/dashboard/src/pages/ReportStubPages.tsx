// ============================================================
// REPORT STUB PAGES — صفحات التقارير (قيد الإنشاء)
// يتم استبدال كل stub بصفحة كاملة تدريجياً
// ============================================================

import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, Construction } from "lucide-react";

function ReportComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> التقارير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">{title}</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
        <Construction className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-400 text-sm">هذا التقرير قيد الإنشاء وسيكون متاحاً قريباً.</p>
        <Link to="/dashboard/reports"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 text-brand-600 text-sm font-medium hover:bg-brand-100 transition-colors">
          العودة للتقارير
        </Link>
      </div>
    </div>
  );
}

// All report pages have been moved to their own files. This file is kept as a placeholder.
