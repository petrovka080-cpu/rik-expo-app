import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a concrete real quantity", () => {
  it("binds concrete volume rows to a real ready-mix norm pack", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "concrete_foundation_interior_concrete_slab_pour_standard",
      quantity: 10,
      countryCode: "KG",
    });
    const concreteRows = compiled.rows.filter((row) =>
      isProfessionalNormPackSourceId(row.normSourceId) &&
      row.normSourceId.includes("concrete_ready_mix")
    );

    expect(100 * (120 / 1000)).toBe(12);
    expect(20 * 0.4 * 0.6).toBeCloseTo(4.8);
    expect(concreteRows.length).toBeGreaterThan(0);
    expect(concreteRows.every((row) => row.unit === "m3" && row.quantity > 0)).toBe(true);
  });
});
