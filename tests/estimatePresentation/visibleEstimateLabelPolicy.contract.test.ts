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

  it("removes an internal phase prefix only when the typed material key owns it", () => {
    expect(toVisibleEstimateLabel({
      label: "demolition_tile: \u0437\u0430\u0449\u0438\u0442\u043d\u0430\u044f \u043f\u043b\u0435\u043d\u043a\u0430",
      materialKey: "demolition_tile_protective_film",
      sectionType: "materials",
    })).toBe("\u0437\u0430\u0449\u0438\u0442\u043d\u0430\u044f \u043f\u043b\u0435\u043d\u043a\u0430");
  });

  it("uses the canonical row code as typed prefix ownership for composed rows", () => {
    expect(toVisibleEstimateLabel({
      label: "demolition_tile: \u0437\u0430\u0449\u0438\u0442\u043d\u0430\u044f \u043f\u043b\u0435\u043d\u043a\u0430",
      materialKey: "protective_film",
      internalKey: "demolition_tile_demolition_interior_tile_remove_standard_materials_01",
      sectionType: "materials",
    })).toBe("\u0437\u0430\u0449\u0438\u0442\u043d\u0430\u044f \u043f\u043b\u0435\u043d\u043a\u0430");
  });

  it("does not remove a legal colon prefix without matching typed ownership", () => {
    expect(toVisibleEstimateLabel({
      label: "custom_project: \u0437\u0430\u0449\u0438\u0442\u043d\u0430\u044f \u043f\u043b\u0435\u043d\u043a\u0430",
      materialKey: "demolition_tile_protective_film",
      sectionType: "materials",
    })).not.toBe("\u0437\u0430\u0449\u0438\u0442\u043d\u0430\u044f \u043f\u043b\u0435\u043d\u043a\u0430");
  });

  it("keeps the canonical title but removes an unresolved project parameter reference", () => {
    const label = toVisibleEstimateLabel({
      label: "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u0430\u044f \u0433\u0440\u0443\u043d\u0442\u043e\u0432\u043a\u0430 \u2014 PROJECT:primer_product_reference",
      sectionType: "materials",
    });

    expect(label).toBe("\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u0430\u044f \u0433\u0440\u0443\u043d\u0442\u043e\u0432\u043a\u0430");
    expect(visibleEstimateLabelViolations(label)).toEqual([]);
  });

  it("uses a finite public fallback when both the source and generated object label are invalid", () => {
    const label = toVisibleEstimateLabel({
      label: "internal_equipment_key",
      sectionType: "equipment",
      objectKey: "missing_domain_key",
    });

    expect(label).toBe("\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u043c \u0443\u0441\u043b\u043e\u0432\u0438\u044f\u043c \u0440\u0430\u0431\u043e\u0442");
    expect(visibleEstimateLabelViolations(label)).toEqual([]);
  });
});
