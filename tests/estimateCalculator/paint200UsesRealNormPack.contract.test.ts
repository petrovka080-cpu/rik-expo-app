import { compileProductionExpandedEstimate10000, isProfessionalNormPackSourceId } from "../../src/lib/ai/estimateTemplate10000";

describe("paint 200 real norm pack", () => {
  it("uses paint and primer source-backed norms through the dedicated paint template", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "paint_wall_ceiling_2_coats",
      quantity: 200,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const paintRows = realRows.filter((row) =>
      row.normSourceId.includes("paint_ceresit_ct54_silicate_two_coats") ||
      row.normSourceId.includes("paint_ceresit_ct17_primer")
    );

    expect(compiled.templateKey).toBe("paint_wall_ceiling_2_coats_project_template_group_v1");
    expect(realRows).toHaveLength(compiled.rows.length);
    expect(paintRows.length).toBeGreaterThanOrEqual(4);
    expect(realRows.map((row) => row.normSourceId)).toEqual(expect.arrayContaining([
      expect.stringContaining("paint_ceresit_ct54_silicate_two_coats"),
      expect.stringContaining("paint_ceresit_ct17_primer"),
    ]));
    expect(paintRows.every((row) => row.unit === "l")).toBe(true);
  });
});
