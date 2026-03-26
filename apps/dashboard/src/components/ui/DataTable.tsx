import { useState, ReactNode } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { clsx } from "clsx";

interface Column<T> {
  key: string;
  label: string;
  width?: string | number;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  onFilter?: () => void;
  renderRow?: (row: T, index: number) => ReactNode;
  keyExtractor?: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
}

export function DataTable<T extends Record<string, any>>({
  title,
  columns,
  data,
  searchPlaceholder = "بحث...",
  onSearch,
  onAdd,
  addLabel = "إضافة",
  onFilter,
  renderRow,
  keyExtractor,
  loading,
  emptyText = "لا توجد بيانات",
}: DataTableProps<T>) {
  const [searchVal, setSearchVal] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const handleSearch = (v: string) => {
    setSearchVal(v);
    onSearch?.(v);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      {(title || onSearch || onAdd || onFilter) && (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 gap-3 flex-wrap">
          {title && <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>}
          <div className={clsx("flex items-center gap-2 flex-wrap", title && "mr-auto")}>
            {onSearch && (
              <div className="relative">
                <Search
                  size={14}
                  className={clsx(
                    "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors",
                    searchFocused ? "text-brand-400" : "text-gray-400",
                  )}
                />
                <input
                  value={searchVal}
                  onChange={e => handleSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={searchPlaceholder}
                  className={clsx(
                    "pr-8 pl-3 py-1.5 rounded-xl text-[13px] text-gray-900 bg-gray-50 outline-none transition-all w-48 placeholder:text-gray-400",
                    searchFocused
                      ? "border border-brand-400 ring-[3px] ring-brand-400/10"
                      : "border border-gray-200 hover:border-gray-300",
                  )}
                />
              </div>
            )}
            {onFilter && (
              <button
                onClick={onFilter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Filter size={14} /> فلتر
              </button>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-400 text-white text-[13px] font-medium hover:bg-brand-500 transition-colors"
              >
                <Plus size={14} /> {addLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 whitespace-nowrap"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-3.5 rounded-lg bg-gray-100 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center px-4 py-12 text-[13px] text-gray-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, i) =>
                renderRow ? (
                  <tr key={keyExtractor ? keyExtractor(row) : i}>{renderRow(row, i)}</tr>
                ) : (
                  <tr
                    key={keyExtractor ? keyExtractor(row) : i}
                    className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors"
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-[13px] text-gray-800 align-middle"
                        style={col.width ? { width: col.width } : undefined}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
