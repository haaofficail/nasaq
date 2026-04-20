import type { Config } from "@measured/puck";
import { HeroMinimalConfig } from "../blocks/hero/HeroMinimal";
import { HeroShowcaseConfig } from "../blocks/hero/HeroShowcase";
import { HeroGalleryConfig } from "../blocks/hero/HeroGallery";
import { HeroVideoConfig } from "../blocks/hero/HeroVideo";
import { HeroSplitConfig } from "../blocks/hero/HeroSplit";
import { ProductsGridConfig } from "../blocks/products/ProductsGrid";
import { ProductsFeaturedConfig } from "../blocks/products/ProductsFeatured";
import { CategoriesGridConfig } from "../blocks/categories/CategoriesGrid";
import { CategoriesCarouselConfig } from "../blocks/categories/CategoriesCarousel";
import { Features3colConfig } from "../blocks/features/Features3col";
import { Features4cardsConfig } from "../blocks/features/Features4cards";
import { FeaturesListConfig } from "../blocks/features/FeaturesList";
import { FeaturesAlternatingConfig } from "../blocks/features/FeaturesAlternating";
import { TestimonialsCardsConfig } from "../blocks/social/TestimonialsCards";
import { TestimonialsSliderConfig } from "../blocks/social/TestimonialsSlider";
import { FAQAccordionConfig } from "../blocks/social/FAQAccordion";
import { StatsSimpleConfig } from "../blocks/social/StatsSimple";

// Page Builder v2 — Puck configuration
// All blocks: RTL, IBM Plex Sans Arabic, Tailwind-only, brand #5b9bd5

export const puckConfig: Config = {
  components: {
    HeroMinimal:          HeroMinimalConfig,
    HeroShowcase:         HeroShowcaseConfig,
    HeroGallery:          HeroGalleryConfig,
    HeroVideo:            HeroVideoConfig,
    HeroSplit:            HeroSplitConfig,
    ProductsGrid:         ProductsGridConfig,
    ProductsFeatured:     ProductsFeaturedConfig,
    CategoriesGrid:       CategoriesGridConfig,
    CategoriesCarousel:   CategoriesCarouselConfig,
    Features3col:         Features3colConfig,
    Features4cards:       Features4cardsConfig,
    FeaturesList:         FeaturesListConfig,
    FeaturesAlternating:  FeaturesAlternatingConfig,
    TestimonialsCards:    TestimonialsCardsConfig,
    TestimonialsSlider:   TestimonialsSliderConfig,
    FAQAccordion:         FAQAccordionConfig,
    StatsSimple:          StatsSimpleConfig,
  },
  root: {
    fields: {
      title: {
        type: "text",
        label: "عنوان الصفحة",
      },
      description: {
        type: "text",
        label: "وصف الصفحة",
      },
    },
    defaultProps: {
      title: "",
      description: "",
    },
  },
};
