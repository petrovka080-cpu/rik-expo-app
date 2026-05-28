import { estimateFor, FOREMAN_PAVING_PROMPT, units } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("paving stone formula units", () => {
  it("keeps paving area and layered units", () => {
    const estimate = estimateFor("/ai?context=foreman", FOREMAN_PAVING_PROMPT);
    expect(estimate.input.unit).toBe("sq_m");
    expect(estimate.work.workKey).toBe("paving_stone_laying");
    expect(units(estimate)).toEqual(expect.arrayContaining(["sq_m", "m3", "linear_m", "shift", "trip"]));
  });
});
