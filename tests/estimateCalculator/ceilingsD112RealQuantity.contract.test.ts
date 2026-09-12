import { compileProductionExpandedEstimate10000 } from "../../src/lib/ai/estimateTemplate10000";

const D112_ROW_CODES = [
  "drywall_ceiling_interior_drywall_ceiling_install_standard_materials_01",
  "drywall_ceiling_interior_drywall_ceiling_install_standard_materials_02",
  "drywall_ceiling_interior_drywall_ceiling_install_standard_materials_05",
  "drywall_ceiling_interior_drywall_ceiling_install_standard_materials_06",
  "drywall_ceiling_interior_drywall_ceiling_install_standard_components_07",
  "drywall_ceiling_interior_drywall_ceiling_install_standard_components_08",
] as const;

describe("Knauf D112 ceiling source-only applicability", () => {
  it("preserves all six candidate rows without inferring the D112 system from a generic ceiling key", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "drywall_ceiling_interior_drywall_ceiling_install_standard",
      quantity: 100,
      countryCode: "KG",
    });
    const rows = D112_ROW_CODES.map((rowCode) =>
      compiled.rows.find((row) => row.rowCode === rowCode)
    );

    expect(compiled.rows).toHaveLength(59);
    expect(rows).toHaveLength(6);
    expect(rows.every(Boolean)).toBe(true);
    expect(rows.every((row) =>
      row?.normSourceId.startsWith("src_professional_norm_pack_catalog_") &&
      !row.normSourceId.includes("ceilings_knauf_d112_standard") &&
      row.sourceParameters.baseQuantity === 100 &&
      row.calculationTrace.includes("normSource=")
    )).toBe(true);
    expect(compiled.rows.some((row) =>
      row.normSourceId.startsWith("src_professional_norm_pack_ceilings_knauf_d112_standard_")))
      .toBe(false);
  });
});
