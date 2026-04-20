/**
 * ProductsFeatured Block — Page Builder v2 (Day 11)
 *
 * Design: "Spotlight" — editorial magazine. Merchant hand-picks 1-4 hero products.
 * Feel: luxury print ad — generous space, strong contrast, product as protagonist.
 *
 * Layouts:
 *   single  → one full-width horizontal card (image + copy, 50/50)
 *   two     → two large side-by-side panels
 *   three   → one dominant + two supporting (1 wide + 2 narrow)
 *   four    → 2×2 editorial grid
 *
 * Data: fetched via GET /api/v2/pagebuilder/sources/products?ids=id1,id2,...
 *       Only org-owned products (orgId from auth context).
 *
 * RTL specifics:
 *   - dir="rtl" on root
 *   - ps-/pe- for padding
 *   - text-start for copy alignment
 *   - single layout: image on start side (right in RTL)
 */

import React, { useEffect, useState } from "react";
import type { ComponentConfig } from "@measured/puck";
import type { ProductItem } from "./ProductsGrid";

// ── Types ─────────────────────────────────────────────────────

export interface ProductsFeaturedProps {
  heading:         string;
  subheading?:     string;
  productIds:      Array<{ product: { id: string; name: string } | null }>;
  layout:          "single" | "two" | "three" | "four";
  showPrice:       boolean;
  showBadge:       boolean;
  showDescription: boolean;
  badgeText:       string;
}

// ── Layout grid classes ────────────────────────────────────────

const GRID_CLASSES: Record<ProductsFeaturedProps["layout"], string> = {
  single:  "grid grid-cols-1",
  two:     "grid grid-cols-1 sm:grid-cols-2 gap-8",
  three:   "grid grid-cols-1 sm:grid-cols-3 gap-6",
  four:    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5",
};

// ── Format price ───────────────────────────────────────────────

function formatPrice(price: string | null, _currency: string): string {
  if (!price) return "";
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return `${num.toLocaleString("ar-SA")} ر.س`;
}

// ── Skeleton ───────────────────────────────────────────────────

function SpotlightSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl overflow-hidden animate-pulse"
          style={{ border: "1px solid #E8EEF4", background: "#F8FAFC" }}
        >
          <div className="aspect-[4/3] bg-gray-200" />
          <div className="p-6 flex flex-col gap-3">
            <div className="h-5 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </>
  );
}

// ── Featured product card ──────────────────────────────────────

function FeaturedCard({
  product,
  showPrice,
  showBadge,
  showDescription,
  badgeText,
  wide,
}: {
  product:         ProductItem;
  showPrice:       boolean;
  showBadge:       boolean;
  showDescription: boolean;
  badgeText:       string;
  wide?:           boolean;
}) {
  const containerClass = wide
    ? "rounded-3xl overflow-hidden flex flex-col sm:flex-row"
    : "rounded-3xl overflow-hidden flex flex-col";

  return (
    <article
      data-featured-card=""
      className={containerClass}
      style={{ border: "1px solid #D9E8F5", background: "#ffffff", position: "relative" }}
    >
      {/* Badge */}
      {showBadge && badgeText && (
        <div
          className="absolute top-4 start-4 px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: "var(--color-primary, #5b9bd5)",
            color:      "#ffffff",
            zIndex:     1,
            fontSize:   "0.75rem",
          }}
        >
          {badgeText}
        </div>
      )}

      {/* Image */}
      <div
        className={`overflow-hidden bg-[#F0F6FC] flex-shrink-0 ${wide ? "sm:w-1/2" : "w-full"}`}
        style={{ aspectRatio: wide ? "auto" : "4/3" }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-103"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: "#C9DDEF", minHeight: "200px" }}
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-20 h-20"
              aria-hidden="true"
            >
              <rect x="6" y="6" width="36" height="36" rx="4" />
              <circle cx="18" cy="18" r="4" />
              <path d="M6 32 l10-10 8 8 6-6 12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={`p-6 flex flex-col gap-3 flex-1 ${wide ? "justify-center" : ""}`}
        style={{ minHeight: wide ? "auto" : "140px" }}
      >
        {/* Accent line */}
        <div
          className="w-8 h-0.5 rounded-full"
          style={{ background: "var(--color-primary, #5b9bd5)" }}
        />

        <h3
          className="font-bold text-start leading-tight"
          style={{ fontSize: wide ? "1.4rem" : "1.05rem", color: "#0D2138", letterSpacing: "-0.02em" }}
        >
          {product.name}
        </h3>

        {showDescription && (
          <p className="text-start line-clamp-2" style={{ color: "#5289BE", fontSize: "0.88rem", lineHeight: 1.6 }}>
            {product.slug}
          </p>
        )}

        {showPrice && product.price && (
          <span
            className="inline-flex items-center px-3 py-1 rounded-full font-bold self-start"
            style={{
              background: "var(--color-primary-10, #EAF3FB)",
              color:      "var(--color-primary, #5b9bd5)",
              fontSize:   "0.95rem",
            }}
          >
            {formatPrice(product.price, product.currency)}
          </span>
        )}

        <a
          href={`/products/${product.slug}`}
          className="mt-auto inline-flex items-center gap-2 font-semibold text-start"
          style={{ color: "var(--color-primary, #5b9bd5)", fontSize: "0.875rem" }}
        >
          <span>تصفح المنتج</span>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </a>
      </div>
    </article>
  );
}

// ── Main component ─────────────────────────────────────────────

export function ProductsFeaturedBlock({
  heading,
  subheading,
  productIds,
  layout,
  showPrice,
  showBadge,
  showDescription,
  badgeText,
}: ProductsFeaturedProps) {
  const [products, setProducts] = useState<ProductItem[] | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Extract valid IDs from Puck array field
  const ids = productIds.map((p) => p.product?.id).filter(Boolean) as string[];

  useEffect(() => {
    let cancelled = false;
    setError(null);

    // No IDs selected → show empty immediately
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetch(`/api/v2/pagebuilder/sources/products?ids=${ids.join(",")}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { products: ProductItem[] };
        if (!cancelled) {
          setProducts(data.products);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("تعذّر تحميل المنتجات");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  const isWide      = layout === "single";
  const skeletonCnt = ids.length || 2;

  return (
    <section
      dir="rtl"
      data-block="products-featured"
      className="w-full py-14 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#FFFEF9",
      }}
    >
      {/* Header */}
      {(heading || subheading) && (
        <div className="mb-10 text-start">
          {heading && (
            <h2
              className="font-bold text-start"
              style={{
                fontSize:      "clamp(1.6rem, 3.5vw, 2.4rem)",
                color:         "#0D2138",
                letterSpacing: "-0.03em",
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
            className="mt-4 w-14 h-0.5 rounded-full"
            style={{ background: "var(--color-primary, #5b9bd5)" }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div data-loading="" className={GRID_CLASSES[layout]}>
          <SpotlightSkeleton count={skeletonCnt} />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          data-error=""
          className="flex items-center justify-center py-16 rounded-3xl"
          style={{ border: "1px solid #E8EEF4", color: "#5289BE" }}
        >
          <p style={{ fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && (products === null || products.length === 0) && (
        <div
          data-empty=""
          className="flex flex-col items-center justify-center py-16 rounded-3xl gap-3"
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
            <path d="M24 18v12M18 24h12" />
          </svg>
          <p style={{ fontSize: "0.9rem" }}>لم يتم اختيار منتجات بعد</p>
        </div>
      )}

      {/* Products */}
      {!loading && !error && products && products.length > 0 && (
        <div
          data-layout={layout}
          className={GRID_CLASSES[layout]}
        >
          {products.map((product) => (
            <FeaturedCard
              key={product.id}
              product={product}
              showPrice={showPrice}
              showBadge={showBadge}
              showDescription={showDescription}
              badgeText={badgeText}
              wide={isWide}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Puck Component Config ──────────────────────────────────────

export const ProductsFeaturedConfig: ComponentConfig<ProductsFeaturedProps> = {
  label: "منتجات مميزة",
  fields: {
    heading: {
      type:  "text",
      label: "عنوان القسم",
    },
    subheading: {
      type:  "textarea",
      label: "النص التوضيحي",
    },
    productIds: {
      type:  "array",
      label: "المنتجات المختارة",
      arrayFields: {
        product: {
          type:        "external",
          label:       "منتج",
          placeholder: "ابحث عن منتج...",
          fetchList: async () => {
            try {
              const res = await fetch("/api/v2/pagebuilder/sources/products?limit=50");
              if (!res.ok) return [];
              const data = await res.json() as { products: { id: string; name: string }[] };
              return data.products ?? [];
            } catch {
              return [];
            }
          },
          getItemSummary: (item: { id: string; name: string } | null) => item?.name ?? "",
        },
      },
      defaultItemProps: { product: null },
    } as never,
    layout: {
      type:  "select",
      label: "تخطيط العرض",
      options: [
        { value: "single", label: "بطاقة واحدة كاملة العرض" },
        { value: "two",    label: "بطاقتان جنباً لجنب" },
        { value: "three",  label: "ثلاث بطاقات" },
        { value: "four",   label: "أربع بطاقات (2×2)" },
      ],
    },
    showPrice: {
      type:    "radio",
      label:   "إظهار السعر",
      options: [
        { value: true,  label: "إظهار" },
        { value: false, label: "إخفاء" },
      ],
    } as never,
    showBadge: {
      type:    "radio",
      label:   "شارة المنتج",
      options: [
        { value: true,  label: "إظهار" },
        { value: false, label: "إخفاء" },
      ],
    } as never,
    badgeText: {
      type:  "text",
      label: "نص الشارة",
    },
    showDescription: {
      type:    "radio",
      label:   "الوصف",
      options: [
        { value: false, label: "إخفاء" },
        { value: true,  label: "إظهار" },
      ],
    } as never,
  },
  defaultProps: {
    heading:         "منتجات مختارة بعناية",
    subheading:      "أبرز ما نقدمه لك",
    productIds:      [],
    layout:          "two",
    showPrice:       true,
    showBadge:       true,
    showDescription: false,
    badgeText:       "الأكثر مبيعاً",
  },
  render: (props) => <ProductsFeaturedBlock {...props} />,
};
