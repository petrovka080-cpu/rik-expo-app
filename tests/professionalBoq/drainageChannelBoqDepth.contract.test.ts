import { dynamicBoq, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("drainage channel BOQ depth", () => {
  it("meets medium work minimum depth", () => {
    const boq = dynamicBoq(UNIVERSAL_PROMPTS.drainage);
    expect(boq.rows.length).toBeGreaterThanOrEqual(18);
  });
});
