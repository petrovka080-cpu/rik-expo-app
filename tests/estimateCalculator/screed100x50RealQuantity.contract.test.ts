import { compileProductionExpandedEstimate10000 } from "../../src/lib/ai/estimateTemplate10000";

const RETIRED_CN87_SOURCE_ID =
  "src_professional_norm_pack_screed_cement_sand_mix_kg_m2_50mm_v1";

describe("wave2a screed 100 m2 x 50 mm source-only quantity", () => {
  it("keeps the dedicated geometry and material row without assuming Ceresit CN 87", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "screed_cement_sand_50mm",
      quantity: 100,
      countryCode: "KG",
    });
    const mixCandidate = compiled.rows.find((row) =>
      row.rowCode.includes("_materials_") && row.unit === "kg"
    );

    expect(100 * (50 / 1000)).toBe(5);
    expect(compiled.rows).toHaveLength(59);
    expect(mixCandidate).toMatchObject({
      unit: "kg",
      normSourceId: "src_professional_norm_pack_catalog_flooring_material_materials_kg_v1",
      sourceParameters: expect.objectContaining({
        baseQuantity: 100,
        baseUnit: "m2",
        projectTemplateGroupKey: "screed_cement_sand_50mm",
        childBaseQuantity: 100,
      }),
    });
    expect(mixCandidate?.calculationTrace).toContain("projectTemplateGroup=screed_cement_sand_50mm");
    expect(compiled.rows.some((row) => row.normSourceId === RETIRED_CN87_SOURCE_ID)).toBe(false);
  });
});
