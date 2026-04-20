/**
 * CategoriesCarousel Block — Page Builder v2 (Day 11)
 *
 * Design: Same "Mapmaker" tile aesthetic as CategoriesGrid,
 * arranged in a smooth RTL-aware horizontal carousel.
 *
 * RTL carousel specifics:
 *   - dir="rtl" causes scroll to start from right
 *   - "Next" button scrolls left (ChevronLeft)
 *   - "Prev" button scrolls right (ChevronRight)
 *   - Keyboard: ArrowRight = scroll start (next in RTL)
 *   - snap-x + snap-mandatory for precise snapping
 *
 * Data: GET /api/v2/pagebuilder/sources/categories
 *   Returns: { categories: [{ id, name, slug, imageUrl, productCount }] }
 */

import React, { useEffect, useRef, useState } from "react";
import type { ComponentConfig } from "@measured/puck";
import type { CategoryItem } from "./CategoriesGrid";

// ── Types ─────────────────────────────────────────────────────

export interface CategoriesCarouselProps {
  heading:          string;
  subheading?:      string;
  categoryIds:      Array<{ category: { id: string; name: string } | null }>;
  showProductCount: boolean;
  showImage:        boolean;
}

// ── Gradient fallback ─────────────────────────────────────────

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #EAF3FB 0%, #C9DDEF 100%)",
  "linear-gradient(135deg, #F0F6FC 0%, #D3E8F7 100%)",
  "linear-gradient(135deg, #E8EEF4 0%, #BDD5EE 100%)",
  "linear-gradient(135deg, #F5F9FD 0%, #C5DAEA 100%)",
  "linear-gradient(135deg, #EBF4FB 0%, #BFCEDB 100%)",
];

function getFallback(name: string): string {
  return FALLBACK_GRADIENTS[name.charCodeAt(0) % FALLBACK_GRADIENTS.length];
}

// ── Skeleton ──────────────────────────────────────────────────

function CarouselSkeleton() {
  return (
    <div
      className="flex gap-4 overflow-x-hidden"
      data-loading=""
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden animate-pulse flex-shrink-0"
          style={{ width: "180px", border: "1px solid #E8EEF4", background: "#F8FAFC" }}
        >
          <div style={{ height: "130px", background: "#E2E8F0" }} />
          <div className="p-3 flex flex-col gap-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Category carousel tile ────────────────────────────────────

function CarouselTile({
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
      data-carousel-tile=""
      className="rounded-2xl overflow-hidden flex flex-col flex-shrink-0 snap-start transition-all duration-200 hover:-translate-y-1 hover:shadow-md block"
      style={{
        width:           "180px",
        border:          "1px solid #E8EEF4",
        background:      "#ffffff",
        textDecoration:  "none",
      }}
    >
      {showImage && (
        <div
          className="overflow-hidden"
          style={{ height: "130px", background: getFallback(category.name) }}
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

      <div className="p-3 flex-1">
        <p
          className="font-semibold text-start leading-snug"
          style={{ fontSize: "0.85rem", color: "#0D2138" }}
        >
          {category.name}
        </p>
        {showProductCount && (
          <p
            className="mt-1 text-start"
            style={{ fontSize: "0.75rem", color: "#5289BE" }}
          >
            {category.productCount} منتج
          </p>
        )}
      </div>
    </a>
  );
}

// ── Nav button ────────────────────────────────────────────────

function NavBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-full transition-all duration-150 hover:opacity-80 active:scale-95"
      style={{
        width:      "36px",
        height:     "36px",
        border:     "1px solid #D9E8F5",
        background: "#ffffff",
        color:      "#5289BE",
        flexShrink: 0,
      }}
      aria-label="scroll"
      type="button"
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────

export function CategoriesCarouselBlock({
  heading,
  subheading,
  categoryIds,
  showProductCount,
  showImage,
}: CategoriesCarouselProps) {
  const [all, setAll]         = useState<CategoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const trackRef              = useRef<HTMLDivElement>(null);

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

  // ── Filter ───────────────────────────────────────────────────
  const selectedIds = categoryIds
    .map((item) => item.category?.id)
    .filter(Boolean) as string[];

  const displayed = all
    ? selectedIds.length > 0
      ? all.filter((c) => selectedIds.includes(c.id))
      : all
    : null;

  // ── Scroll helpers (RTL-aware) ───────────────────────────────
  const SCROLL_STEP = 200;

  function scrollNext() {
    trackRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
  }

  function scrollPrev() {
    trackRef.current?.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
  }

  return (
    <section
      dir="rtl"
      data-block="categories-carousel"
      className="w-full py-12 ps-6 pe-6 overflow-hidden"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#FAFBFC",
      }}
    >
      {/* Header + nav buttons */}
      <div className="flex items-end justify-between mb-6">
        <div>
          {heading && (
            <h2
              className="font-bold text-start"
              style={{
                fontSize:      "clamp(1.4rem, 2.5vw, 2rem)",
                color:         "#0D2138",
                letterSpacing: "-0.02em",
              }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p
              className="mt-1 text-start"
              style={{ color: "#5289BE", fontSize: "0.9rem" }}
            >
              {subheading}
            </p>
          )}
        </div>

        {!loading && !error && displayed && displayed.length > 0 && (
          <div className="flex gap-2">
            {/* In RTL: scroll right = "previous", scroll left = "next" */}
            <NavBtn onClick={scrollPrev}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                <path d="M6 4l4 4-4 4" />
              </svg>
            </NavBtn>
            <NavBtn onClick={scrollNext}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                <path d="M10 4L6 8l4 4" />
              </svg>
            </NavBtn>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && <CarouselSkeleton />}

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
          className="flex flex-col items-center justify-center py-12 rounded-2xl gap-3"
          style={{ border: "1px dashed #C9DDEF", color: "#5289BE" }}
        >
          <p style={{ fontSize: "0.9rem" }}>لا توجد تصنيفات متاحة</p>
        </div>
      )}

      {/* Carousel track */}
      {!loading && !error && displayed && displayed.length > 0 && (
        <div
          ref={trackRef}
          data-carousel-track=""
          className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {displayed.map((cat) => (
            <CarouselTile
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

export const CategoriesCarouselConfig: ComponentConfig<CategoriesCarouselProps> = {
  label: "تصنيفات — شريط أفقي",
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
      label: "التصنيفات (فارغ = الكل)",
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
    heading:          "تصفح التصنيفات",
    subheading:       "اختر ما يناسبك",
    categoryIds:      [],
    showProductCount: true,
    showImage:        true,
  },
  render: (props) => <CategoriesCarouselBlock {...props} />,
};
