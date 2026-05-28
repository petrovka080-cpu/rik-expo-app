import { estimateFor, FOREMAN_GABLE_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("gable roof formula", () => {
  it("uses roof area from base area and ridge height, not ridge height as linear volume", () => {
    const estimate = estimateFor("/ai?context=foreman", FOREMAN_GABLE_PROMPT);
    expect(estimate.input.unit).toBe("sq_m");
    expect(estimate.input.volume).toBeGreaterThan(67);
    expect(estimate.input.volume).not.toBe(2.5);
  });
});
