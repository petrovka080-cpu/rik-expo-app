import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a reinforcement kg real quantity", () => {
  it("uses source-backed reinforcement rows in kg", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "concrete_foundation_interior_reinforcement_frame_reinforce_standard",
      quantity: 100,
      countryCode: "KG",
    });
    const rows = compiled.rows.filter((row) =>
      isProfessionalNormPackSourceId(row.normSourceId) &&
      row.normSourceId.includes("reinforcement_rebar")
    );
    const kgPerMeter12 = (12 * 12) / 162;

    expect(kgPerMeter12).toBeGreaterThan(0);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.unit === "kg" && row.quantity > 0)).toBe(true);
  });
});
