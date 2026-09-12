import {
  compileProductionExpandedEstimate10000,
  getProductionWorkDefinition10000,
} from "../../src/lib/ai/estimateTemplate10000";

const RETIRED_GERFLOR_SOURCE_ID =
  "src_professional_norm_pack_baseboards_gerflor_design_skirting_linear_m_perimeter_v1";

describe("Gerflor Design Skirting source-only applicability", () => {
  it("keeps the measured-perimeter row generic until the selected skirting system is explicit", () => {
    const definition = getProductionWorkDefinition10000("flooring_interior_baseboard_install_standard");
    expect(definition?.defaultUnit).toBe("linear_m");
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "flooring_interior_baseboard_install_standard",
      quantity: 55,
      countryCode: "KG",
    });
    const row = compiled.rows.find((candidate) =>
      candidate.rowCode === "flooring_interior_baseboard_install_standard_materials_01"
    );

    expect(compiled.rows).toHaveLength(59);
    expect(row).toMatchObject({
      unit: "linear_m",
      normSourceId: "src_professional_norm_pack_catalog_baseboards_material_materials_linear_m_v1",
      sourceParameters: expect.objectContaining({
        baseQuantity: 55,
        baseUnit: "linear_m",
      }),
    });
    expect(row?.calculationTrace).toContain("baseQuantity=55 linear_m");
    expect(compiled.rows.some((candidate) => candidate.normSourceId === RETIRED_GERFLOR_SOURCE_ID))
      .toBe(false);
  });
});
