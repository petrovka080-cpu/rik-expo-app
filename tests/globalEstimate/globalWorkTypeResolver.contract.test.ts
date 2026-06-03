import { GLOBAL_WORK_CATEGORIES, GLOBAL_WORK_TYPE_DEFINITIONS, resolveGlobalWorkType } from "../../src/lib/ai/globalEstimate";

describe("global work type resolver", () => {
  it("covers the production ontology and resolves normal construction aliases", () => {
    expect(GLOBAL_WORK_CATEGORIES).toContain("flooring");
    expect(GLOBAL_WORK_CATEGORIES).toContain("electrical");
    expect(GLOBAL_WORK_TYPE_DEFINITIONS.length).toBeGreaterThanOrEqual(40);
    expect(resolveGlobalWorkType({ text: "дай смету на укладку ламината 100 м²", language: "ru" }).workKey).toBe("laminate_laying");
    expect(resolveGlobalWorkType({ text: "Drywall installation 500 sq ft", language: "en" }).workKey).toBe("drywall_partition");
  });

  it("keeps bathroom turnkey tile requests out of standalone waterproofing", () => {
    expect(
      resolveGlobalWorkType({
        text: "estimate cost for bathroom turnkey tile waterproofing plumbing residential scenario alpha 107 sq_m",
        language: "en",
      }).workKey,
    ).toBe("bathroom_tile_full");
  });

  it("does not match short aliases inside longer construction words", () => {
    expect(resolveGlobalWorkType({ text: "смета на забор из профнастила 100 м", language: "ru" }).workKey).toBe("fence_installation");
    expect(resolveGlobalWorkType({ text: "смета на водозаборная скважина 60 метров на объекте", language: "ru" }).workKey).toBe("other_construction_work");
  });
});
