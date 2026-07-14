import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";
import { createRealMaterialQuantityPreview } from "../../src/lib/ai/professionalEstimateCalculator";

describe("wave2a masonry 400 m2 real quantity", () => {
  it("calculates masonry material rows in pcs/kg/m2 and keeps user confirmation boundary", () => {
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

    expect(realRows.length).toBeGreaterThanOrEqual(3);
    expect(realRows.map((row) => row.unit)).toEqual(expect.arrayContaining(["piece", "kg", "m2"]));
    expect(realRows.every((row) => row.quantity > 0 && row.calculationTrace.includes("normSource="))).toBe(true);
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    expect(preview.rowsInsertedBeforeConfirmation).toBe(false);
    expect(preview.rows.some((row) => row.formulaOutput.includes("400") && row.formulaOutput.includes("0.2"))).toBe(true);
  });
});
