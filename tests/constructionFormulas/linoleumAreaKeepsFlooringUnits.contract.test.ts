import { estimateFor, REQUEST_LINOLEUM_PROMPT, units } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("linoleum formula units", () => {
  it("keeps flooring area with perimeter and piece rows", () => {
    const estimate = estimateFor("/request", REQUEST_LINOLEUM_PROMPT);
    expect(estimate.input.unit).toBe("sq_m");
    expect(estimate.work.workKey).toBe("linoleum_laying");
    expect(units(estimate)).toEqual(expect.arrayContaining(["sq_m", "linear_m", "pcs", "set"]));
  });
});
