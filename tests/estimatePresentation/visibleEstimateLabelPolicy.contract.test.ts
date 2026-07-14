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

  it("rejects section titles as catalog material search labels", () => {
    const sectionTitle = "1.2 \u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u043f\u043e \u0440\u0430\u0437\u0434\u0435\u043b\u0430\u043c";
    const label = toVisibleEstimateLabel({
      label: sectionTitle,
      materialKey: "roof_covering",
      sectionType: "materials",
    });

    expect(visibleEstimateLabelViolations(sectionTitle)).toContain("SECTION_TITLE_VISIBLE_LABEL");
    expect(visibleEstimateLabelViolations(sectionTitle)).toContain("ESTIMATE_ROW_NUMBER_PREFIX");
    expect(label).toBe("\u041a\u0440\u043e\u0432\u0435\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435");
    expect(visibleEstimateLabelViolations(label)).toEqual([]);
  });

  it("rejects numbered BOQ row prefixes before catalog search", () => {
    const label = toVisibleEstimateLabel({
      label: "1.1 \u0414\u0435\u043c\u043e\u043d\u0442\u0430\u0436 \u043f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0439",
      materialKey: "roof_covering",
      sectionType: "materials",
    });

    expect(visibleEstimateLabelViolations("1.1 \u0414\u0435\u043c\u043e\u043d\u0442\u0430\u0436 \u043f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0439")).toContain("ESTIMATE_ROW_NUMBER_PREFIX");
    expect(label).toBe("\u041a\u0440\u043e\u0432\u0435\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435");
  });
});
