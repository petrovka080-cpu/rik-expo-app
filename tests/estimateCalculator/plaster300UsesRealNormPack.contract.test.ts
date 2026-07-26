import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("plaster 300 real norm pack", () => {
  it("uses the Ceresit CT29 plaster pack in the compiled formula rows", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "plaster_paint_interior_wall_plaster_apply_standard",
      quantity: 300,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const genericReferenceRows = compiled.rows.filter((row) =>
      row.normSourceId.includes("src_professional_norm_pack_catalog_")
    );
    const plasterRow = realRows.find((row) => row.normSourceId.includes("plaster_ceresit_ct29"));

    expect(realRows.length + genericReferenceRows.length).toBe(compiled.rows.length);
    expect(genericReferenceRows.length).toBeGreaterThan(0);
    expect(genericReferenceRows.every((row) =>
      !isProfessionalNormPackSourceId(row.normSourceId)
    )).toBe(true);
    expect(plasterRow?.unit).toBe("kg");
    expect(plasterRow?.sourceParameters?.formulaContext).toMatchObject({ normFactor: 1.8, packageSize: 25 });
  });
});
