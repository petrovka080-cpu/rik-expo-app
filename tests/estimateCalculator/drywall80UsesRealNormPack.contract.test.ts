import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("drywall 80 real norm pack", () => {
  it("uses Knauf jointing source-backed norms in the drywall compiled rows", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "drywall_ceiling_interior_drywall_partition_install_standard",
      quantity: 80,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const genericReferenceRows = compiled.rows.filter((row) =>
      row.normSourceId.includes("src_professional_norm_pack_catalog_")
    );
    const drywallJointRows = realRows.filter((row) => row.normSourceId.includes("drywall_knauf_fugenfueller"));

    expect(realRows.length + genericReferenceRows.length).toBe(compiled.rows.length);
    expect(genericReferenceRows.length).toBeGreaterThan(0);
    expect(genericReferenceRows.every((row) =>
      !isProfessionalNormPackSourceId(row.normSourceId)
    )).toBe(true);
    expect(drywallJointRows.length).toBeGreaterThanOrEqual(2);
    expect(realRows.map((row) => row.normSourceId)).toEqual(expect.arrayContaining([
      expect.stringContaining("drywall_knauf_fugenfueller_leicht_jointing"),
      expect.stringContaining("drywall_knauf_fugenfueller_perimeter_joint"),
    ]));
    expect(drywallJointRows.every((row) => row.unit === "kg")).toBe(true);
  });
});
