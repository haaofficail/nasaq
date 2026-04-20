/**
 * CategoriesGrid Block — Page Builder v2 (Day 11)
 *
 * Design: "Mapmaker" — each category is a clean geographic tile.
 * Navy border, category name bold, product count in subdued text.
 * Hover: scale + accent border. Image or gradient fallback.
 *
 * Layouts:
 *   grid-3 → 3 columns desktop / 2 tablet / 1 mobile
 *   grid-4 → 4 columns desktop / 2 tablet / 1 mobile
 *   grid-6 → 6 columns desktop / 3 tablet / 2 mobile
 *
 * Data: GET /api/v2/pagebuilder/sources/categories
 *   Returns: { categories: [{ id, name, slug, imageUrl, productCount }] }
 *
 * categoryIds prop:
 *   empty  → show all categories
 *   filled → show only selected
 *
 * RTL: dir=rtl, ps-/pe-, text-start
 */

import React, { useEffect, useState } from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export interface CategoryItem {
  id:           string;
  name:         string;
  slug:         string;
  imageUrl:     string | null;
  productCount: number;
}

export interface CategoriesGridProps {
  heading:          string;
  subheading?:      string;
  categoryIds:      Array<{ category: { id: string; name: string } | null }>;
  layout:           "grid-3" | "grid-4" | "grid-6";
  showProductCount: boolean;
  showImage:        boolean;
}

// ── Layout class maps ─────────────────────────────────────────

const GRID_CLASSES: Record<CategoriesGridProps["layout"], string> = {
  "grid-3": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5",
  "grid-4": "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4",
  "grid-6": "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3",
};

// ── Gradient fallback palette ─────────────────────────────────

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #EAF3FB 0%, #C9DDEF 100%)",
  "linear-gradient(135deg, #F0F6FC 0%, #D3E8F7 100%)",
  "linear-gradient(135deg, #E8EEF4 0%, #BDD5EE 100%)",
  "linear-gradient(135deg, #F5F9FD 0%, #C5DAEA 100%)",
  "linear-gradient(135deg, #EBF4FB 0%, #BFCEDB 100%)",
];

function getFallback(name: string): string {
  const idx = name.charCodeAt(0) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[idx];
}

// ── Skeleton card ─────────────────────────────────────────────

function CategorySkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ border: "1px solid #E8EEF4", background: "#F8FAFC" }}
    >
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

// ── Category card ─────────────────────────────────────────────

function CategoryCard({
  category,
  showProductCount,
  showImage,
}: {
  category:         CategoryItem;
  showProductCount: boolean;
  showImage:        boolean;
}) {
  return (
    <a
      href={`/categories/${category.slug}`}
      data-category-card=""
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer block"
      style={{ border: "1px solid #E8EEF4", background: "#ffffff", textDecoration: "none" }}
    >
      {/* Image / fallback */}
      {showImage && (
        <div
          className="aspect-[4/3] overflow-hidden"
          style={{ background: getFallback(category.name) }}
        >
          {category.imageUrl && (
            <img
              src={category.imageUrl}
              alt={category.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 flex-1">
        <p
          className="font-semibold text-start leading-snug"
          style={{ fontSize: "0.9rem", color: "#0D2138" }}
        >
          {category.name}
        </p>

        {showProductCount && (
          <p
            className="mt-1 text-start"
            style={{ fontSize: "0.78rem", color: "#5289BE" }}
          >
            {category.productCount} منتج
          </p>
        )}
      </div>
    </a>
  );
}

// ── Main component ─────────────────────────────────────────────

export function CategoriesGridBlock({
  heading,
  subheading,
  categoryIds,
  layout,
  showProductCount,
  showImage,
}: CategoriesGridProps) {
  const [all, setAll]         = useState<CategoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/v2/pagebuilder/sources/categories")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { categories: CategoryItem[] };
        if (!cancelled) {
          setAll(data.categories);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("تعذّر تحميل التصنيفات");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  // ── Filter client-side if specific IDs selected ───────────────
  const selectedIds = categoryIds
    .map((item) => item.category?.id)
    .filter(Boolean) as string[];

  const displayed = all
    ? selectedIds.length > 0
      ? all.filter((c) => selectedIds.includes(c.id))
      : all
    : null;

  const gridClass = GRID_CLASSES[layout];

  return (
    <section
      dir="rtl"
      data-block="categories-grid"
      className="w-full py-12 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#FAFBFC",
      }}
    >
      {/* Header */}
      {(heading || subheading) && (
        <div className="mb-8 text-start">
          {heading && (
            <h2
              className="font-bold text-start"
              style={{
                fontSize:      "clamp(1.5rem, 3vw, 2.2rem)",
                color:         "#0D2138",
                letterSpacing: "-0.02em",
              }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p
              className="mt-2 text-start"
              style={{ color: "#5289BE", fontSize: "0.95rem", lineHeight: "1.7" }}
            >
              {subheading}
            </p>
          )}
          <div
            className="mt-3 w-10 h-0.5 rounded-full"
            style={{ background: "var(--color-primary, #5b9bd5)" }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div data-loading="" className={gridClass}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CategorySkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          data-error=""
          className="flex items-center justify-center py-16 rounded-2xl"
          style={{ border: "1px solid #E8EEF4", color: "#5289BE" }}
        >
          <p style={{ fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && displayed?.length === 0 && (
        <div
          data-empty=""
          className="flex flex-col items-center justify-center py-16 rounded-2xl gap-3"
          style={{ border: "1px dashed #C9DDEF", color: "#5289BE" }}
        >
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-12 h-12 opacity-40"
            aria-hidden="true"
          >
            <rect x="6" y="6" width="36" height="36" rx="4" />
            <path d="M16 24h16M24 16v16" />
          </svg>
          <p style={{ fontSize: "0.9rem" }}>لا توجد تصنيفات متاحة</p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && displayed && displayed.length > 0 && (
        <div data-layout={layout} className={gridClass}>
          {displayed.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              showProductCount={showProductCount}
              showImage={showImage}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Puck Component Config ─────────────────────────────────────

export const CategoriesGridConfig: ComponentConfig<CategoriesGridProps> = {
  label: "شبكة التصنيفات",
  fields: {
    heading: {
      type:  "text",
      label: "عنوان القسم",
    },
    subheading: {
      type:  "textarea",
      label: "النص التوضيحي",
    },
    categoryIds: {
      type:  "array",
      label: "التصنيفات (فارغ = كل التصنيفات)",
      arrayFields: {
        category: {
          type:        "external",
          label:       "تصنيف",
          placeholder: "اختر تصنيفاً...",
          fetchList: async () => {
            try {
              const res = await fetch("/api/v2/pagebuilder/sources/categories");
              if (!res.ok) return [];
              const data = await res.json() as { categories: { id: string; name: string }[] };
              return data.categories ?? [];
            } catch {
              return [];
            }
          },
          getItemSummary: (item: { id: string; name: string } | null) => item?.name ?? "",
        },
      },
      defaultItemProps: { category: null },
    } as never,
    layout: {
      type:  "select",
      label: "تخطيط الشبكة",
      options: [
        { value: "grid-3", label: "شبكة 3 أعمدة" },
        { value: "grid-4", label: "شبكة 4 أعمدة" },
        { value: "grid-6", label: "شبكة 6 أعمدة (مدمج)" },
      ],
    },
    showProductCount: {
      type:    "radio",
      label:   "عدد المنتجات",
      options: [
        { value: true,  label: "إظهار" },
        { value: false, label: "إخفاء" },
      ],
    } as never,
    showImage: {
      type:    "radio",
      label:   "صورة التصنيف",
      options: [
        { value: true,  label: "إظهار" },
        { value: false, label: "إخفاء" },
      ],
    } as never,
  },
  defaultProps: {
    heading:          "تصنيفاتنا",
    subheading:       "تصفح حسب التصنيف",
    categoryIds:      [],
    layout:           "grid-3",
    showProductCount: true,
    showImage:        true,
  },
  render: (props) => <CategoriesGridBlock {...props} />,
};
