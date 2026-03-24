import { useState, ReactNode } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { COLORS, TYPOGRAPHY, SHADOWS } from "@/lib/design-tokens";

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

const FONT = TYPOGRAPHY.family;

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
    <div style={{
      background: COLORS.surface,
      borderRadius: 14,
      border: `1px solid ${COLORS.border}`,
      boxShadow: SHADOWS.card,
      fontFamily: FONT, direction: "rtl",
      overflow: "hidden",
    }}>
      {/* Header */}
      {(title || onSearch || onAdd || onFilter) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`,
          gap: 12, flexWrap: "wrap",
        }}>
          {title && <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, margin: 0 }}>{title}</h3>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: title ? "auto" : 0, flexWrap: "wrap" }}>
            {onSearch && (
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: searchFocused ? COLORS.primary : COLORS.muted, transition: "color 0.15s" }} />
                <input
                  value={searchVal}
                  onChange={e => handleSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={searchPlaceholder}
                  style={{
                    paddingRight: 32, paddingLeft: 12, paddingTop: 7, paddingBottom: 7,
                    borderRadius: 9, border: `1px solid ${searchFocused ? COLORS.primary : COLORS.border}`,
                    boxShadow: searchFocused ? `0 0 0 3px ${COLORS.primary}15` : "none",
                    fontFamily: FONT, fontSize: 13, color: COLORS.dark, outline: "none",
                    background: "#fafbfc", transition: "border-color 0.15s, box-shadow 0.15s",
                    width: 200,
                  }}
                />
              </div>
            )}
            {onFilter && (
              <button onClick={onFilter} style={{ ...toolBtn }}>
                <Filter size={14} /> فلتر
              </button>
            )}
            {onAdd && (
              <button onClick={onAdd} style={{ ...addBtn }}>
                <Plus size={14} /> {addLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  textAlign: "right", padding: "10px 18px",
                  fontSize: 12, fontWeight: 600, color: COLORS.muted,
                  width: col.width, whiteSpace: "nowrap",
                }}>
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
                    <td key={col.key} style={{ padding: "12px 18px" }}>
                      <div style={{ height: 14, borderRadius: 6, background: "#f1f5f9", animation: "pulse 1.5s infinite" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: "48px 18px", color: COLORS.muted, fontSize: 13 }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                renderRow ? (
                  <tr key={keyExtractor ? keyExtractor(row) : i}>{renderRow(row, i)}</tr>
                ) : (
                  <tr
                    key={keyExtractor ? keyExtractor(row) : i}
                    style={{ borderBottom: `1px solid ${COLORS.border}`, transition: "background 0.1s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fafbfc"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {columns.map(col => (
                      <td key={col.key} style={{ padding: "12px 18px", fontSize: 13, color: COLORS.dark, verticalAlign: "middle" }}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                )
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "7px 12px", borderRadius: 9,
  border: `1px solid ${COLORS.border}`,
  background: "transparent", cursor: "pointer",
  fontFamily: TYPOGRAPHY.family, fontSize: 13, color: COLORS.muted,
  transition: "background 0.15s",
};

const addBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "7px 14px", borderRadius: 9,
  border: "none", background: COLORS.primary,
  cursor: "pointer", fontFamily: TYPOGRAPHY.family, fontSize: 13, color: "#fff",
  fontWeight: 500, transition: "background 0.15s",
};
