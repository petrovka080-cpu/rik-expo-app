import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a concrete real quantity", () => {
  it("keeps volume geometry but rejects the unsupported automatic ready-mix allowance", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "concrete_foundation_interior_concrete_slab_pour_standard",
      quantity: 10,
      countryCode: "KG",
    });
    const concreteRows = compiled.rows.filter((row) =>
      isProfessionalNormPackSourceId(row.normSourceId) &&
      row.normSourceId.includes("concrete_nrmca_cip31")
    );

    expect(100 * (120 / 1000)).toBe(12);
    expect(20 * 0.4 * 0.6).toBeCloseTo(4.8);
    expect(concreteRows).toEqual([]);
    expect(compiled.rows.some((row) => row.normSourceId.includes("concrete_ready_mix_m3_m3_placed_v1"))).toBe(false);
  });
});
