import type { Config } from "@measured/puck";
import { HeroMinimalConfig } from "../blocks/hero/HeroMinimal";
import { HeroShowcaseConfig } from "../blocks/hero/HeroShowcase";
import { HeroGalleryConfig } from "../blocks/hero/HeroGallery";

// Page Builder v2 — Puck configuration
// All blocks: RTL, IBM Plex Sans Arabic, Tailwind-only, brand #5b9bd5

export const puckConfig: Config = {
  components: {
    HeroMinimal: HeroMinimalConfig,
    HeroShowcase: HeroShowcaseConfig,
    HeroGallery:  HeroGalleryConfig,
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
