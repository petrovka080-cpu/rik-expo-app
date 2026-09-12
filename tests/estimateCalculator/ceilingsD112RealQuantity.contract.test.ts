import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("Knauf D112 ceiling source-backed quantities", () => {
  it("applies the documented D112 variant 1 factors instead of only tracing them", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "drywall_ceiling_interior_drywall_ceiling_install_standard",
      quantity: 100,
      countryCode: "KG",
    });
    const rows = compiled.rows.filter((row) =>
      isProfessionalNormPackSourceId(row.normSourceId) &&
      row.normSourceId.includes("ceilings_knauf_d112_standard")
    );
    const bySource = (part: string) => rows.find((row) => row.normSourceId.includes(part));

    expect(rows).toHaveLength(6);
    expect(bySource("board_m2_m2")?.quantity).toBe(100);
    expect(bySource("ud_runner")?.quantity).toBe(40);
    expect(bySource("uniflott")?.quantity).toBe(30);
    expect(bySource("joint_tape")?.quantity).toBe(45);
    expect(bySource("tn25_screw")?.quantity).toBe(1700);
    expect(bySource("substructure_anchor")?.quantity).toBe(120);
    expect(rows.every((row) =>
      (row.sourceParameters.formulaContext as Record<string, unknown>).wastePercent === 0
    )).toBe(true);
  });
});
