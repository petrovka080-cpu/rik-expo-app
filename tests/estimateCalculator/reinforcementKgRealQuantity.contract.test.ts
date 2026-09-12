import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a reinforcement kg real quantity", () => {
  it("does not invent reinforcement mass without an approved bar schedule", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "concrete_foundation_interior_reinforcement_frame_reinforce_standard",
      quantity: 100,
      countryCode: "KG",
    });
    const rows = compiled.rows.filter((row) =>
      isProfessionalNormPackSourceId(row.normSourceId) &&
      row.normSourceId.includes("reinforcement_project_bar_schedule")
    );

    expect(rows).toEqual([]);
    expect(compiled.rows.some((row) => row.normSourceId.includes("reinforcement_rebar_kg_m3"))).toBe(false);
  });
});
