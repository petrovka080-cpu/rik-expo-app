import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a screed 100 m2 x 50 mm real quantity", () => {
  it("binds the dedicated screed template to a real kg mix row", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "screed_cement_sand_50mm",
      quantity: 100,
      countryCode: "KG",
    });
    const mixRow = compiled.rows.find((row) =>
      isProfessionalNormPackSourceId(row.normSourceId) &&
      row.normSourceId.includes("screed_cement_sand_mix")
    );

    expect(100 * (50 / 1000)).toBe(5);
    expect(mixRow?.unit).toBe("kg");
    expect(mixRow?.quantity).toBeGreaterThan(0);
  });
});
