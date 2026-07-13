import { classifyEstimateRowReality } from "../../scripts/estimate/classifyEstimateRowReality";

describe("source-backed norm required for professional status", () => {
  it("accepts only professional norm pack source ids as source-backed", () => {
    const row = classifyEstimateRowReality({
      rowCode: "real",
      section: "materials",
      unit: "kg",
      quantity: 10,
      normId: "norm:real",
      normVersion: "2026.07",
      normSourceId: "src_professional_norm_pack_screed_cement_sand_mix_kg_m2_50mm_v1",
      calculationTrace: "formula=q; normSource=src_professional_norm_pack_screed_cement_sand_mix_kg_m2_50mm_v1; result=10 kg",
      formulaId: "formula",
    });

    expect(row.is_source_backed).toBe(true);
    expect(row.source_status).toBe("READY_SOURCE_BACKED");
    expect(row.blocking_reasons).not.toContain("generated_family_default_not_professional");
  });
});
