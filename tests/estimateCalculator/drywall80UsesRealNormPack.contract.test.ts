import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("drywall 80 real norm pack", () => {
  it("uses Knauf jointing source-backed norms in the drywall compiled rows", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "drywall_ceiling_interior_drywall_partition_install_standard",
      quantity: 80,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));

    expect(realRows.length).toBeGreaterThanOrEqual(2);
    expect(realRows.map((row) => row.normSourceId)).toEqual(expect.arrayContaining([
      expect.stringContaining("drywall_knauf_fugenfueller_leicht_jointing"),
      expect.stringContaining("drywall_knauf_fugenfueller_perimeter_joint"),
    ]));
    expect(realRows.every((row) => row.unit === "kg")).toBe(true);
  });
});
