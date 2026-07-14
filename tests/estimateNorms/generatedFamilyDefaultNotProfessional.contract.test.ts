import { classifyEstimateRowReality } from "../../scripts/estimate/classifyEstimateRowReality";

describe("generated family default is not professional", () => {
  it("classifies src_norm rows as generic family-default", () => {
    const row = classifyEstimateRowReality({
      rowCode: "generic",
      section: "materials",
      unit: "m2",
      quantity: 10,
      normId: "norm:generic",
      normVersion: "2026.07",
      normSourceId: "src_norm_material_consumption_tables_2026_07",
      calculationTrace: "formula=q; result=10 m2",
      formulaId: "formula",
    });

    expect(row.is_source_backed).toBe(false);
    expect(row.is_family_default).toBe(true);
    expect(row.source_status).toBe("GENERIC_FAMILY_DEFAULT");
    expect(row.blocking_reasons).toContain("generated_family_default_not_professional");
  });
});
