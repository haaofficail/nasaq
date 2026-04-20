import { describe, it, expect } from "vitest";
import { puckConfig } from "../config/puck-config";

describe("puckConfig", () => {
  it("exports a valid Puck config object", () => {
    expect(puckConfig).toBeDefined();
    expect(puckConfig).toHaveProperty("components");
    expect(puckConfig).toHaveProperty("root");
  });

  it("root has required fields: title, description", () => {
    expect(puckConfig.root?.fields).toHaveProperty("title");
    expect(puckConfig.root?.fields).toHaveProperty("description");
  });

  it("starts with zero registered blocks (Day 2 scaffold)", () => {
    expect(Object.keys(puckConfig.components ?? {})).toHaveLength(0);
  });
});
