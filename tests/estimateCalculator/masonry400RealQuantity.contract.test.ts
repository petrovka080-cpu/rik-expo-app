import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";
import { createRealMaterialQuantityPreview } from "../../src/lib/ai/professionalEstimateCalculator/realMaterialQuantityEngine";

describe("wave2a masonry 400 m2 real quantity", () => {
  it("keeps user confirmation boundary and rejects generic material rates for an unspecified block", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "masonry_interior_gas_block_lay_standard",
      quantity: 400,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const preview = createRealMaterialQuantityPreview({
      rawInput: "каменную кладку 400 кв метра",
      parameters: { material_type: "газоблок", wall_thickness_mm: 200 },
    });

    expect(realRows).toEqual([]);
    expect(compiled.rows.some((row) => /masonry_(?:aac_block|brick_250|thin_bed|cement_lime|reinforcement_mesh)/u
      .test(row.normSourceId))).toBe(false);
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    expect(preview.rowsInsertedBeforeConfirmation).toBe(false);
    expect(preview.rows.some((row) => row.formulaOutput.includes("400") && row.formulaOutput.includes("0.2"))).toBe(true);
  });
});
