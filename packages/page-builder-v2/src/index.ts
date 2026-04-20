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
export { Features3colBlock, Features3colConfig } from "./blocks/features/Features3col";
export type { Features3colProps, Features3colItem } from "./blocks/features/Features3col";
export { Features4cardsBlock, Features4cardsConfig } from "./blocks/features/Features4cards";
export type { Features4cardsProps, Features4cardsItem } from "./blocks/features/Features4cards";
export { FeaturesListBlock, FeaturesListConfig } from "./blocks/features/FeaturesList";
export type { FeaturesListProps, FeaturesListItem } from "./blocks/features/FeaturesList";
export { FeaturesAlternatingBlock, FeaturesAlternatingConfig } from "./blocks/features/FeaturesAlternating";
export type { FeaturesAlternatingProps, FeaturesAlternatingItem } from "./blocks/features/FeaturesAlternating";
export { TestimonialsCardsBlock, TestimonialsCardsConfig } from "./blocks/social/TestimonialsCards";
export type { TestimonialsCardsProps, TestimonialsCardsItem } from "./blocks/social/TestimonialsCards";
export { TestimonialsSliderBlock, TestimonialsSliderConfig } from "./blocks/social/TestimonialsSlider";
export type { TestimonialsSliderProps, TestimonialsSliderItem } from "./blocks/social/TestimonialsSlider";
export { FAQAccordionBlock, FAQAccordionConfig } from "./blocks/social/FAQAccordion";
export type { FAQAccordionProps, FAQAccordionItem } from "./blocks/social/FAQAccordion";
export { StatsSimpleBlock, StatsSimpleConfig } from "./blocks/social/StatsSimple";
export type { StatsSimpleProps, StatItem } from "./blocks/social/StatsSimple";
export { StatsDetailedBlock, StatsDetailedConfig } from "./blocks/stats/StatsDetailed";
export type { StatsDetailedProps, StatsDetailedItem, TrendDirection } from "./blocks/stats/StatsDetailed";
export { GalleryGridBlock, GalleryGridConfig } from "./blocks/media/GalleryGrid";
export type { GalleryGridProps, GalleryItem } from "./blocks/media/GalleryGrid";
export { GalleryCarouselBlock, GalleryCarouselConfig } from "./blocks/media/GalleryCarousel";
export type { GalleryCarouselProps, GalleryCarouselItem } from "./blocks/media/GalleryCarousel";
export { CTAImageBgBlock, CTAImageBgConfig } from "./blocks/cta/CTAImageBg";
export type { CTAImageBgProps, CTAAlignment } from "./blocks/cta/CTAImageBg";
export { CTAColorBgBlock, CTAColorBgConfig } from "./blocks/cta/CTAColorBg";
export type { CTAColorBgProps } from "./blocks/cta/CTAColorBg";
export { ContactSimpleBlock, ContactSimpleConfig } from "./blocks/contact/ContactSimple";
export type { ContactSimpleProps } from "./blocks/contact/ContactSimple";
export { ContactWithMapBlock, ContactWithMapConfig } from "./blocks/contact/ContactWithMap";
export type { ContactWithMapProps } from "./blocks/contact/ContactWithMap";
export { FooterMinimalBlock, FooterMinimalConfig } from "./blocks/footer/FooterMinimal";
export type { FooterMinimalProps, FooterLink, FooterSocialLink } from "./blocks/footer/FooterMinimal";
export { FooterComprehensiveBlock, FooterComprehensiveConfig } from "./blocks/footer/FooterComprehensive";
export type { FooterComprehensiveProps, FooterColumn, FooterColumnLink, ComprehensiveSocialLink } from "./blocks/footer/FooterComprehensive";
export { HeaderSimpleBlock, HeaderSimpleConfig } from "./blocks/header/HeaderSimple";
export type { HeaderSimpleProps, HeaderLink, HeaderBg } from "./blocks/header/HeaderSimple";
export { HeaderMegamenuBlock, HeaderMegamenuConfig } from "./blocks/header/HeaderMegamenu";
export type { HeaderMegamenuProps, MenuItem, MegaColumn, MegaLink } from "./blocks/header/HeaderMegamenu";
export { PuckEditor } from "./components/PuckEditor";
export { SeoDrawer } from "./components/SeoDrawer";
export type { SeoDrawerProps, SeoFields as SeoDrawerFields } from "./components/SeoDrawer";
export type { PuckEditorProps } from "./components/PuckEditor";
export type { Data as PuckData } from "@measured/puck";
export {
  buildPagesListUrl,
  filterPagesBySearch,
  paginatePages,
  getPageStatusActions,
  makeDuplicateTitle,
  makeDuplicateSlug,
  sortPages,
} from "./utils/pages-v2-utils";
export type { PageStatus, SortOption, PageAction } from "./utils/pages-v2-utils";
export {
  arabicToSlug,
  validateSlug,
  getSeoWarnings,
  truncateForSerp,
  buildRobotsContent,
} from "./utils/seo-utils";
export type { SeoWarning, SeoWarningType } from "./utils/seo-utils";
export {
  computePageStatusBadge,
  isContentEqual,
  getRetryDelay,
  shouldAutoSave,
  formatSaveStatus,
} from "./utils/autosave-utils";
export type { PageBadgeStatus, SaveStatus } from "./utils/autosave-utils";
export { useAutoSave } from "./hooks/useAutoSave";
export type { UseAutoSaveOptions, UseAutoSaveResult } from "./hooks/useAutoSave";
