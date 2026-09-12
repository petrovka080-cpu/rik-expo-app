import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("paint 200 reviewed norm pack", () => {
  it("keeps the dedicated paint template fail-closed without substrate-specific project inputs", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "paint_wall_ceiling_2_coats",
      quantity: 200,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const genericReferenceRows = compiled.rows.filter((row) =>
      row.normSourceId.includes("src_professional_norm_pack_catalog_")
    );
    const paintRows = realRows.filter((row) =>
      row.normSourceId.includes("paint_ceresit_ct54_silicate_two_coats") ||
      row.normSourceId.includes("paint_ceresit_ct17_primer")
    );

    expect(compiled.templateKey).toBe("paint_wall_ceiling_2_coats_project_template_group_v1");
    expect(realRows.length + genericReferenceRows.length).toBe(compiled.rows.length);
    expect(genericReferenceRows.length).toBeGreaterThan(0);
    expect(genericReferenceRows.every((row) =>
      !isProfessionalNormPackSourceId(row.normSourceId)
    )).toBe(true);
    expect(paintRows).toEqual([]);
    expect(realRows).toEqual([]);
    expect(genericReferenceRows).toHaveLength(compiled.rows.length);
    expect(compiled.rows.some((row) => row.lineType === "material" && row.unit === "l")).toBe(true);
  });
});
