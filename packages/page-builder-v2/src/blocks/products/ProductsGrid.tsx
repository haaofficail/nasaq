/**
 * ProductsGrid Block — Page Builder v2 (Day 10)
 *
 * Source reference: shadcnblocks.com/blocks/product-grid
 * Adapted for: RTL, IBM Plex Sans Arabic, ترميز OS CSS variables, no emojis
 *
 * Design: Editorial Catalog — clean ivory background, razor-thin borders,
 * product names in charcoal, price in brand blue, cards with hover lift.
 *
 * Variants:
 *   grid-3   → 3 columns desktop / 2 tablet / 1 mobile
 *   grid-4   → 4 columns desktop / 2 tablet / 1 mobile
 *   carousel → horizontal scroll (RTL-aware: overscroll from right to left)
 *
 * Data: fetched client-side from GET /api/v2/pagebuilder/sources/products
 *   - In Puck editor: fetches once for preview
 *   - In storefront: same client-side fetch
 *
 * RTL specifics:
 *   - dir="rtl" on root
 *   - ps-/pe- for padding, gap for spacing
 *   - text-start for headings (= right in RTL)
 *   - carousel uses scroll-snap-align with RTL direction
 */

import React, { useEffect, useState } from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProductItem {
  id:        string;
  name:      string;
  slug:      string;
  price:     string | null;
  currency:  string;
  imageUrl:  string | null;
  imageAlt:  string | null;
}

export interface ProductsGridProps {
  heading:       string;
  subheading?:   string;
  categoryId:    { id: string; name: string } | null;
  featured:      boolean;
  limit:         number;
  sortBy:        "newest" | "price_asc" | "price_desc" | "popular";
  layout:        "grid-3" | "grid-4" | "carousel";
  showPrice:     boolean;
  showAddToCart: boolean;
}

// ── Layout class maps ──────────────────────────────────────────────────────────

const GRID_CLASSES: Record<ProductsGridProps["layout"], string> = {
  "grid-3":   "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
  "grid-4":   "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5",
  "carousel": "flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none",
};

// ── Format price ───────────────────────────────────────────────────────────────

function formatPrice(price: string | null, currency: string): string {
  if (!price) return "";
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return `${num.toLocaleString("ar-SA")} ر.س`;
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ border: "1px solid #E8EEF4", background: "#F8FAFC" }}
    >
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

// ── Product card ───────────────────────────────────────────────────────────────

function ProductCard({
  product,
  showPrice,
  showAddToCart,
}: {
  product:       ProductItem;
  showPrice:     boolean;
  showAddToCart: boolean;
}) {
  return (
    <article
      data-product-card=""
      className="rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-1"
      style={{ border: "1px solid #E8EEF4", background: "#ffffff" }}
    >
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-[#F0F6FC]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: "#C9DDEF" }}
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-16 h-16"
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
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3
          className="font-semibold leading-snug text-start line-clamp-2"
          style={{ fontSize: "0.9rem", color: "#0D2138" }}
        >
          {product.name}
        </h3>

        {showPrice && product.price && (
          <p
            className="font-bold text-start"
            style={{ fontSize: "0.95rem", color: "var(--color-primary, #5b9bd5)" }}
          >
            {formatPrice(product.price, product.currency)}
          </p>
        )}

        {showAddToCart && (
          <a
            href={`/products/${product.slug}`}
            className="mt-auto inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "var(--color-primary, #5b9bd5)",
              color:      "#ffffff",
              width:      "fit-content",
            }}
          >
            تفاصيل المنتج
          </a>
        )}
      </div>
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductsGridBlock({
  heading,
  subheading,
  categoryId,
  featured,
  limit,
  sortBy,
  layout,
  showPrice,
  showAddToCart,
}: ProductsGridProps) {
  const [products, setProducts] = useState<ProductItem[] | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      limit:  String(Math.min(Math.max(1, limit), 50)),
      sortBy,
    });
    if (categoryId?.id) params.set("categoryId", categoryId.id);
    if (featured)       params.set("featured", "true");

    fetch(`/api/v2/pagebuilder/sources/products?${params.toString()}`)
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
  }, [categoryId?.id, featured, limit, sortBy]);

  const gridClass = GRID_CLASSES[layout];
  const carouselItemClass = layout === "carousel" ? "min-w-[240px] snap-start" : "";

  return (
    <section
      dir="rtl"
      data-block="products-grid"
      className="w-full py-12 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#FAFBFC",
      }}
    >
      {/* Section header */}
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

      {/* Loading state */}
      {loading && (
        <div data-loading="" className={gridClass}>
          {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          data-error=""
          className="flex items-center justify-center py-16 rounded-2xl"
          style={{ border: "1px solid #E8EEF4", color: "#5289BE" }}
        >
          <p style={{ fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && products?.length === 0 && (
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
            <path d="M24 18v12M18 24h12" />
          </svg>
          <p style={{ fontSize: "0.9rem" }}>لا توجد منتجات متاحة</p>
        </div>
      )}

      {/* Product grid */}
      {!loading && !error && products && products.length > 0 && (
        <div
          data-layout={layout}
          className={gridClass}
        >
          {products.map((product) => (
            <div key={product.id} className={carouselItemClass}>
              <ProductCard
                product={product}
                showPrice={showPrice}
                showAddToCart={showAddToCart}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Puck Component Config ──────────────────────────────────────────────────────

export const ProductsGridConfig: ComponentConfig<ProductsGridProps> = {
  label: "شبكة المنتجات",
  fields: {
    heading: {
      type:  "text",
      label: "عنوان القسم",
    },
    subheading: {
      type:  "textarea",
      label: "النص التوضيحي",
    },
    categoryId: {
      type:        "external",
      label:       "التصنيف",
      placeholder: "اختر التصنيف (اختياري)",
      fetchList: async () => {
        try {
          const res = await fetch("/api/v2/pagebuilder/sources/categories");
          if (!res.ok) return [];
          return res.json();
        } catch {
          return [];
        }
      },
      getItemSummary: (item: { id: string; name: string } | null) => item?.name ?? "",
    },
    featured: {
      type:    "radio",
      label:   "المنتجات المميزة فقط",
      options: [
        { value: false, label: "الكل" },
        { value: true,  label: "المميزة فقط" },
      ],
    } as never,
    limit: {
      type:  "number",
      label: "عدد المنتجات",
      min:   1,
      max:   50,
    } as never,
    sortBy: {
      type:  "select",
      label: "الترتيب",
      options: [
        { value: "newest",     label: "الأحدث أولاً" },
        { value: "price_asc",  label: "السعر: من الأقل" },
        { value: "price_desc", label: "السعر: من الأعلى" },
        { value: "popular",    label: "الأكثر طلباً" },
      ],
    },
    layout: {
      type:  "select",
      label: "تخطيط العرض",
      options: [
        { value: "grid-3",   label: "شبكة 3 أعمدة" },
        { value: "grid-4",   label: "شبكة 4 أعمدة" },
        { value: "carousel", label: "شريط أفقي" },
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
    showAddToCart: {
      type:    "radio",
      label:   "زر تفاصيل المنتج",
      options: [
        { value: false, label: "إخفاء" },
        { value: true,  label: "إظهار" },
      ],
    } as never,
  },
  defaultProps: {
    heading:       "منتجاتنا المميزة",
    subheading:    "اكتشف أجود المنتجات المختارة لك",
    categoryId:    null,
    featured:      false,
    limit:         8,
    sortBy:        "newest",
    layout:        "grid-3",
    showPrice:     true,
    showAddToCart: false,
  },
  render: (props) => <ProductsGridBlock {...props} />,
};
