import type { Config } from "@measured/puck";

// Page Builder v2 — Puck configuration skeleton
// Blocks are added here as they are built (Week 2+)
// All blocks: RTL, IBM Plex Sans Arabic, Tailwind-only, brand #5b9bd5

export const puckConfig: Config = {
  components: {
    // Blocks will be registered here, e.g.:
    // Hero: HeroBlock,
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
