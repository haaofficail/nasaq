import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  label?: string; // e.g. "نتيجة"
}

export function Pagination({ page, pageSize, total, onPage, label = "نتيجة" }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to   = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/30">
      <span className="text-xs text-gray-400">
        {from}–{to} من {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-600 min-w-[4rem] text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
