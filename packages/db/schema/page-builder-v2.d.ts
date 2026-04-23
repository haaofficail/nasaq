type PageStatus = "draft" | "published" | "archived";
type VersionChangeType = "auto_save" | "manual_save" | "publish" | "restore";
export declare const pagesV2: any;
export declare const pageVersionsV2: any;
export type PageV2 = typeof pagesV2.$inferSelect;
export type NewPageV2 = typeof pagesV2.$inferInsert;
export type PageVersionV2 = typeof pageVersionsV2.$inferSelect;
export type NewPageVersionV2 = typeof pageVersionsV2.$inferInsert;
export type { PageStatus, VersionChangeType };
//# sourceMappingURL=page-builder-v2.d.ts.map