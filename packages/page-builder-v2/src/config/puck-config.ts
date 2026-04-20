import type { Config } from "@measured/puck";
import { HeroMinimalConfig } from "../blocks/hero/HeroMinimal";

// Page Builder v2 — Puck configuration
// All blocks: RTL, IBM Plex Sans Arabic, Tailwind-only, brand #5b9bd5

export const puckConfig: Config = {
  components: {
    HeroMinimal: HeroMinimalConfig,
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
