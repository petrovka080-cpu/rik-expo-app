import { estimateFor, FOREMAN_CANOPY_PROMPT, units } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("canopy unit semantics", () => {
  it("uses structural units instead of all sq_m", () => {
    const estimate = estimateFor("/ai?context=foreman", FOREMAN_CANOPY_PROMPT);
    expect(new Set(units(estimate)).size).toBeGreaterThanOrEqual(5);
    expect(units(estimate)).toEqual(expect.arrayContaining(["pcs", "kg", "linear_m", "m3", "shift", "trip", "sq_m"]));
  });
});
