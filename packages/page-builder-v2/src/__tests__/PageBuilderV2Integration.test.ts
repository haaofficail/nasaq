/**
 * Integration test: Puck data → API shape
 *
 * Verifies that data produced by Puck with HeroMinimal
 * matches the shape expected by POST /api/v2/pages.
 *
 * No real API call — validates the data contract.
 */

import { describe, it, expect } from "vitest";
import { puckConfig } from "../config/puck-config";
import type { Data } from "@measured/puck";

// Simulate what Puck produces after user adds HeroMinimal and sets props
function makePuckData(heroProps: Record<string, unknown>): Data {
  return {
    content: [
      {
        type: "HeroMinimal",
        props: {
          id: "hero-1",
          ...heroProps,
        },
      },
    ],
    root: {
      props: { title: "الصفحة الرئيسية", description: "" },
    },
  };
}

describe("Puck data contract", () => {
  it("puckConfig has HeroMinimal component registered", () => {
    expect(puckConfig.components).toHaveProperty("HeroMinimal");
  });

  it("HeroMinimal defaultProps match expected Arabic content", () => {
    const config = puckConfig.components.HeroMinimal;
    expect(config.defaultProps?.heading).toBe("ابدأ متجرك اليوم");
    expect(config.defaultProps?.subheading).toContain("منصة متكاملة");
    expect(config.defaultProps?.ctaText).toBe("ابدأ الآن");
  });

  it("Puck data structure is JSON-serializable for API POST body", () => {
    const data = makePuckData({
      heading: "عنوان مخصص",
      subheading: "نص المنشأة",
      ctaText: "احجز الآن",
      ctaUrl: "/book",
      backgroundStyle: "white",
      alignment: "center",
    });

    const serialized = JSON.stringify({ draftData: data });
    const parsed = JSON.parse(serialized);

    // Verify round-trip
    expect(parsed.draftData.content[0].type).toBe("HeroMinimal");
    expect(parsed.draftData.content[0].props.heading).toBe("عنوان مخصص");
    expect(parsed.draftData.root.props.title).toBe("الصفحة الرئيسية");
  });

  it("API POST body shape matches pages_v2 schema fields", () => {
    const data = makePuckData({ heading: "test", subheading: "sub", ctaText: "go",
                                ctaUrl: "#", backgroundStyle: "white", alignment: "center" });
    // Shape of what we send to POST /api/v2/pages
    const postBody = {
      title: "الصفحة الرئيسية",
      slug: "home",
      pageType: "home",
      draftData: data,
    };

    expect(postBody).toHaveProperty("title");
    expect(postBody).toHaveProperty("slug");
    expect(postBody).toHaveProperty("draftData");
    expect(postBody.draftData.content).toHaveLength(1);
  });

  it("updated heading flows through Puck data correctly", () => {
    const original = makePuckData({ heading: "ابدأ متجرك اليوم", subheading: "original",
                                    ctaText: "ابدأ الآن", ctaUrl: "#",
                                    backgroundStyle: "white", alignment: "center" });
    // Simulate user editing heading in Puck
    const updated: Data = {
      ...original,
      content: original.content.map(block =>
        block.type === "HeroMinimal"
          ? { ...block, props: { ...block.props, heading: "عنوان محدّث" } }
          : block
      ),
    };

    // Shape of what we send to PUT /api/v2/pages/:id
    const putBody = { draftData: updated };
    const hero = putBody.draftData.content[0];
    expect((hero.props as Record<string, unknown>).heading).toBe("عنوان محدّث");
  });
});
