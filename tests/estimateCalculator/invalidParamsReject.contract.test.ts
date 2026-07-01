import {
  createRealMaterialQuantityPreview,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("real quantity formula engine invalid params", () => {
  it("rejects invalid deterministic parameters instead of producing fake rows", () => {
    expect(() =>
      createRealMaterialQuantityPreview({
        rawInput: "каменную кладку 400 кв метра",
        parameters: {
          material_type: "газоблок",
          wall_thickness_mm: 0,
        },
      }),
    ).toThrow("REAL_QUANTITY_INVALID_PARAM:wall_thickness_mm");
  });
});
