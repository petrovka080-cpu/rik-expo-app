import {
  formatCatalogMaterialButtonLabel,
  toVisibleEstimateLabel,
  visibleEstimateLabelViolations,
} from "../../src/lib/estimatePresentation/visibleEstimateLabelPolicy";

describe("visible estimate label policy", () => {
  it("rejects internal keys and English debug tokens in visible labels", () => {
    expect(visibleEstimateLabelViolations("foundation_concrete")).toContain("SNAKE_CASE_INTERNAL_KEY");
    expect(visibleEstimateLabelViolations("foundation system")).toContain("ENGLISH_SYSTEM_KEY");
    expect(visibleEstimateLabelViolations("excavator warning")).toContain("VISIBLE_WARNING_TOKEN");
  });

  it("builds catalog button labels from Russian visible material names", () => {
    const label = formatCatalogMaterialButtonLabel({ materialKey: "foundation_concrete" });

    expect(label).toContain("\u0431\u0435\u0442\u043e\u043d");
    expect(label).not.toContain("foundation_concrete");
    expect(visibleEstimateLabelViolations(label)).toEqual([]);
  });

  it("falls back to a visible label instead of leaking unknown material keys", () => {
    const label = toVisibleEstimateLabel({
      label: "roofing_system material_1",
      materialKey: "roofing_system_material_1",
      sectionType: "materials",
    });

    expect(label).not.toMatch(/[a-z][a-z0-9]+(?:_[a-z0-9]+)+/);
    expect(label).not.toMatch(/\bwarning\b/i);
    expect(visibleEstimateLabelViolations(label)).toEqual([]);
  });
});

