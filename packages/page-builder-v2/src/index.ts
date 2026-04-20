// @nasaq/page-builder-v2 — public API
// Consumed by apps/dashboard

export { puckConfig } from "./config/puck-config";
export type { BlockConfig } from "./types/block";
export { HeroMinimalBlock, HeroMinimalConfig } from "./blocks/hero/HeroMinimal";
export type { HeroMinimalProps } from "./blocks/hero/HeroMinimal";
export { HeroShowcaseBlock, HeroShowcaseConfig } from "./blocks/hero/HeroShowcase";
export type { HeroShowcaseProps } from "./blocks/hero/HeroShowcase";
export { HeroGalleryBlock, HeroGalleryConfig } from "./blocks/hero/HeroGallery";
export type { HeroGalleryProps, GalleryImage } from "./blocks/hero/HeroGallery";
export { HeroVideoBlock, HeroVideoConfig } from "./blocks/hero/HeroVideo";
export type { HeroVideoProps } from "./blocks/hero/HeroVideo";
export { HeroSplitBlock, HeroSplitConfig } from "./blocks/hero/HeroSplit";
export type { HeroSplitProps } from "./blocks/hero/HeroSplit";
export { ProductsGridBlock, ProductsGridConfig } from "./blocks/products/ProductsGrid";
export type { ProductsGridProps, ProductItem } from "./blocks/products/ProductsGrid";
export { ProductsFeaturedBlock, ProductsFeaturedConfig } from "./blocks/products/ProductsFeatured";
export type { ProductsFeaturedProps } from "./blocks/products/ProductsFeatured";
export { CategoriesGridBlock, CategoriesGridConfig } from "./blocks/categories/CategoriesGrid";
export type { CategoriesGridProps, CategoryItem } from "./blocks/categories/CategoriesGrid";
export { CategoriesCarouselBlock, CategoriesCarouselConfig } from "./blocks/categories/CategoriesCarousel";
export type { CategoriesCarouselProps } from "./blocks/categories/CategoriesCarousel";
export { PuckEditor } from "./components/PuckEditor";
export type { PuckEditorProps } from "./components/PuckEditor";
export type { Data as PuckData } from "@measured/puck";
