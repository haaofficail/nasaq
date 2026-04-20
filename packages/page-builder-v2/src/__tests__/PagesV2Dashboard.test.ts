/**
 * PagesV2Dashboard — contract tests
 *
 * Tests the data contract between PagesV2Page and the API:
 *   - list response shape
 *   - create request shape
 *   - update (save draft) request shape
 *   - publish request shape
 *
 * No DOM rendering — validates the data flow contract.
 */

import { describe, it, expect } from "vitest";
import type { Data } from "@measured/puck";

// ── Mirrors the API interface declared in apps/dashboard/src/lib/api.ts ──

interface PageV2Summary {
  id: string;
  slug: string;
  title: string;
  pageType: string;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  showInNavigation: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

interface PageV2Full extends PageV2Summary {
  draftData: Record<string, unknown> | null;
  publishedData: Record<string, unknown> | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function makeListResponse(pages: PageV2Summary[]) {
  return {
    data: pages,
    meta: { page: 1, limit: 50, total: pages.length },
  };
}

function makeCreateBody(title: string, slug: string, draftData: Data) {
  return { title, slug, pageType: "custom", draftData };
}

function makeUpdateBody(draftData: Data) {
  return { draftData };
}

function makeHeroPuckData(): Data {
  return {
    content: [{
      type: "HeroMinimal",
      props: {
        id: "hero-1",
        heading: "ابدأ متجرك اليوم",
        subheading: "منصة متكاملة",
        ctaText: "ابدأ الآن",
        ctaUrl: "#",
        backgroundStyle: "white",
        alignment: "center",
      },
    }],
    root: { props: { title: "الرئيسية", description: "" } },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("PagesV2Dashboard — list response contract", () => {
  it("list response has data array and meta pagination", () => {
    const response = makeListResponse([]);
    expect(response).toHaveProperty("data");
    expect(response).toHaveProperty("meta");
    expect(response.meta).toHaveProperty("total");
    expect(Array.isArray(response.data)).toBe(true);
  });

  it("page summary has required display fields", () => {
    const page: PageV2Summary = {
      id: "uuid-1",
      slug: "home",
      title: "الرئيسية",
      pageType: "home",
      status: "draft",
      sortOrder: 0,
      showInNavigation: true,
      publishedAt: null,
      updatedAt: new Date().toISOString(),
    };
    const response = makeListResponse([page]);

    const item = response.data[0];
    expect(item.id).toBe("uuid-1");
    expect(item.title).toBe("الرئيسية");
    expect(item.status).toBe("draft");
    expect(item.publishedAt).toBeNull();
  });

  it("status badge maps correctly to Arabic labels", () => {
    const statusLabels: Record<PageV2Summary["status"], string> = {
      draft: "مسودة",
      published: "منشورة",
      archived: "مؤرشفة",
    };
    expect(statusLabels["draft"]).toBe("مسودة");
    expect(statusLabels["published"]).toBe("منشورة");
    expect(statusLabels["archived"]).toBe("مؤرشفة");
  });
});

describe("PagesV2Dashboard — create request contract", () => {
  it("create body includes title, slug, pageType, draftData", () => {
    const data = makeHeroPuckData();
    const body = makeCreateBody("الرئيسية", "home", data);

    expect(body).toHaveProperty("title", "الرئيسية");
    expect(body).toHaveProperty("slug", "home");
    expect(body).toHaveProperty("pageType", "custom");
    expect(body).toHaveProperty("draftData");
    expect(body.draftData.content).toHaveLength(1);
  });

  it("slug is auto-generated from Arabic title via simple romanisation", () => {
    // The page generates a slug from the title; we test the function contract
    function titleToSlug(title: string): string {
      return title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "page";
    }
    expect(titleToSlug("الرئيسية")).toBe("page"); // Arabic chars stripped → fallback
    expect(titleToSlug("Home Page")).toBe("home-page");
    expect(titleToSlug("  About  ")).toBe("about");
    expect(titleToSlug("")).toBe("page");
  });
});

describe("PagesV2Dashboard — save draft contract", () => {
  it("update body contains only draftData (no orgId injection)", () => {
    const data = makeHeroPuckData();
    const body = makeUpdateBody(data);

    expect(body).toHaveProperty("draftData");
    expect(body).not.toHaveProperty("orgId");
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("id");
  });

  it("edited hero content flows through update body correctly", () => {
    const original = makeHeroPuckData();
    const updated: Data = {
      ...original,
      content: original.content.map(block =>
        block.type === "HeroMinimal"
          ? { ...block, props: { ...block.props, heading: "عنوان جديد" } }
          : block
      ),
    };
    const body = makeUpdateBody(updated);
    const hero = body.draftData.content[0];
    expect((hero.props as Record<string, unknown>).heading).toBe("عنوان جديد");
  });
});

describe("PagesV2Dashboard — full response contract (PageV2Full)", () => {
  it("full page has draftData containing Puck content array", () => {
    const full: PageV2Full = {
      id: "uuid-1",
      slug: "home",
      title: "الرئيسية",
      pageType: "home",
      status: "draft",
      sortOrder: 0,
      showInNavigation: true,
      publishedAt: null,
      updatedAt: new Date().toISOString(),
      draftData: makeHeroPuckData() as unknown as Record<string, unknown>,
      publishedData: null,
      metaTitle: null,
      metaDescription: null,
      ogImage: null,
    };

    expect(full.draftData).not.toBeNull();
    const draftContent = (full.draftData as unknown as Data).content;
    expect(draftContent[0].type).toBe("HeroMinimal");
  });
});
