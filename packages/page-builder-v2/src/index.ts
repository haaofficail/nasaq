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
export { PuckEditor } from "./components/PuckEditor";
export type { PuckEditorProps } from "./components/PuckEditor";
export type { Data as PuckData } from "@measured/puck";
