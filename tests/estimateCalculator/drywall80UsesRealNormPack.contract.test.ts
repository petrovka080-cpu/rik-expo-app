import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("drywall 80 reviewed norm pack", () => {
  it("keeps the generic drywall case unbound without an exact Knauf table cell", () => {
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
    expect(drywallJointRows).toEqual([]);
    expect(realRows).toEqual([]);
    expect(realRows.map((row) => row.normSourceId)).not.toEqual(expect.arrayContaining([
      expect.stringContaining("drywall_knauf_fugenfueller_perimeter_joint"),
    ]));
    expect(compiled.rows.some((row) => row.lineType === "material" && row.unit === "kg")).toBe(true);
  });
});
