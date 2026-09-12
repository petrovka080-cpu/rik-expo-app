import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("plaster 300 physical norm safety", () => {
  it("does not apply the CT29 thickness rate to area alone", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "plaster_paint_interior_wall_plaster_apply_standard",
      quantity: 300,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const genericReferenceRows = compiled.rows.filter((row) =>
      row.normSourceId.includes("src_professional_norm_pack_catalog_")
    );
    const plasterRows = compiled.rows.filter((row) => row.normSourceId.includes("plaster_ceresit_ct29"));

    expect(realRows.length + genericReferenceRows.length).toBe(compiled.rows.length);
    expect(genericReferenceRows.length).toBeGreaterThan(0);
    expect(genericReferenceRows.every((row) =>
      !isProfessionalNormPackSourceId(row.normSourceId)
    )).toBe(true);
    expect(realRows).toEqual([]);
    expect(plasterRows).toEqual([]);
    expect(compiled.rows.find((row) =>
      row.rowCode === "plaster_paint_interior_wall_plaster_apply_standard_materials_01"))
      .toMatchObject({
        unit: "l",
        normSourceId: expect.stringContaining("src_professional_norm_pack_catalog_plaster_"),
      });
  });
});
