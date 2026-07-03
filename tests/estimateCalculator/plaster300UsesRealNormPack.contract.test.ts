import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("plaster 300 real norm pack", () => {
  it("uses the Ceresit CT29 plaster pack in the compiled formula rows", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "plaster_paint_interior_wall_plaster_apply_standard",
      quantity: 300,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));

    expect(realRows).toHaveLength(1);
    expect(realRows[0]?.normSourceId).toContain("plaster_ceresit_ct29");
    expect(realRows[0]?.unit).toBe("kg");
    expect(realRows[0]?.sourceParameters?.formulaContext).toMatchObject({ normFactor: 1.8, packageSize: 25 });
  });
});
