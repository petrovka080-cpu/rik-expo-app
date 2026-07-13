import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("tile 45 real norm pack", () => {
  it("uses tile adhesive and primer source-backed norms", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "tile_stone_interior_ceramic_tile_lay_standard",
      quantity: 45,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const sourceIds = realRows.map((row) => row.normSourceId);

    expect(sourceIds).toEqual(expect.arrayContaining([
      expect.stringContaining("tile_ceresit_cm11_plus_adhesive"),
      expect.stringContaining("tile_ceresit_ct17_primer"),
    ]));
    expect([...new Set(realRows.map((row) => row.unit))]).toEqual(expect.arrayContaining(["kg", "l"]));
    expect(realRows.every((row) => row.normId.includes(":professional_pack:"))).toBe(true);
  });
});
