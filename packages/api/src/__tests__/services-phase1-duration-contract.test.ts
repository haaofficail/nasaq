import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const apiServicesRoute = readFileSync(
  new URL("../routes/services.ts", import.meta.url),
  "utf8",
);

const createWizard = readFileSync(
  new URL("../../../../apps/dashboard/src/pages/ServiceCreateWizard.tsx", import.meta.url),
  "utf8",
);

const editForm = readFileSync(
  new URL("../../../../apps/dashboard/src/pages/ServiceFormPage.tsx", import.meta.url),
  "utf8",
);

function extractStringSet(source: string, name: string) {
  const match = source.match(new RegExp(`const ${name}\\s*=\\s*new Set(?:<[^>]+>)?\\(\\[([^\\]]+)\\]\\)`));
  if (!match) return [];

  return Array.from(match[1].matchAll(/"([^"]+)"/g), (entry) => entry[1]);
}

describe("services duration contract", () => {
  it("keeps project timed in both dashboard create/edit flows and API defaults", () => {
    expect(extractStringSet(createWizard, "NEEDS_TIMING")).toContain("project");
    expect(extractStringSet(editForm, "NEEDS_TIMING")).toContain("project");
    expect(extractStringSet(apiServicesRoute, "TIMED_SERVICE_TYPES")).toContain("project");
  });
});
