/**
 * Day 3 — TDD: schema shape tests
 * These run BEFORE the schema implementation to define what must exist.
 * Tests verify Drizzle table structure at the TypeScript level (no real DB needed).
 */

import { describe, it, expect } from "vitest";

// These imports will fail until the schema is created — that's the point of TDD.
// Run: pnpm test → RED → create schema → GREEN
import { pagesV2, pageVersionsV2 } from "@nasaq/db/schema";

describe("pagesV2 table", () => {
  it("exports a Drizzle table named pages_v2", () => {
    expect(pagesV2).toBeDefined();
    // Drizzle tables expose their SQL name via Symbol.for or ._
    expect((pagesV2 as any)[Symbol.for("drizzle:Name")]).toBe("pages_v2");
  });

  it("has required multi-tenant field: orgId", () => {
    const cols = (pagesV2 as any)._?.columns ?? (pagesV2 as any)[Symbol.for("drizzle:Columns")];
    expect(cols).toHaveProperty("orgId");
  });

  it("has content fields: draftData, publishedData", () => {
    const cols = Object.keys((pagesV2 as any)[Symbol.for("drizzle:Columns")] ?? {});
    expect(cols).toContain("draftData");
    expect(cols).toContain("publishedData");
  });

  it("has status field", () => {
    const cols = Object.keys((pagesV2 as any)[Symbol.for("drizzle:Columns")] ?? {});
    expect(cols).toContain("status");
  });

  it("has SEO fields: metaTitle, metaDescription, ogImage", () => {
    const cols = Object.keys((pagesV2 as any)[Symbol.for("drizzle:Columns")] ?? {});
    expect(cols).toContain("metaTitle");
    expect(cols).toContain("metaDescription");
    expect(cols).toContain("ogImage");
  });

  it("has timestamp fields: createdAt, updatedAt", () => {
    const cols = Object.keys((pagesV2 as any)[Symbol.for("drizzle:Columns")] ?? {});
    expect(cols).toContain("createdAt");
    expect(cols).toContain("updatedAt");
  });
});

describe("pageVersionsV2 table", () => {
  it("exports a Drizzle table named page_versions_v2", () => {
    expect(pageVersionsV2).toBeDefined();
    expect((pageVersionsV2 as any)[Symbol.for("drizzle:Name")]).toBe("page_versions_v2");
  });

  it("has required fields: pageId, orgId, versionNumber, data", () => {
    const cols = Object.keys((pageVersionsV2 as any)[Symbol.for("drizzle:Columns")] ?? {});
    expect(cols).toContain("pageId");
    expect(cols).toContain("orgId");
    expect(cols).toContain("versionNumber");
    expect(cols).toContain("data");
  });

  it("has changeType field for version audit", () => {
    const cols = Object.keys((pageVersionsV2 as any)[Symbol.for("drizzle:Columns")] ?? {});
    expect(cols).toContain("changeType");
  });
});
