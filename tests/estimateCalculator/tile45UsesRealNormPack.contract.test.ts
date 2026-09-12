import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("tile 45 physical norm safety", () => {
  it("does not promote CM11 or CT17 lower bounds without their project applicability inputs", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "tile_stone_interior_ceramic_tile_lay_standard",
      quantity: 45,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const sourceIds = compiled.rows.map((row) => row.normSourceId);

    expect(sourceIds.some((sourceId) => sourceId.includes("tile_ceresit_cm11_plus_adhesive"))).toBe(false);
    expect(sourceIds.some((sourceId) => sourceId.includes("tile_ceresit_ct17_primer"))).toBe(false);
    expect(realRows).toEqual([]);
    expect(compiled.rows.filter((row) => [
      "tile_stone_interior_ceramic_tile_lay_standard_materials_02",
      "tile_stone_interior_ceramic_tile_lay_standard_materials_04",
    ].includes(row.rowCode))).toEqual([
      expect.objectContaining({ unit: "kg" }),
      expect.objectContaining({ unit: "l" }),
    ]);
  });
});
