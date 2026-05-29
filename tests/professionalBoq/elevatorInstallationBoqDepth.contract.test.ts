import { dynamicBoq, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("elevator installation BOQ depth", () => {
  it("meets regulated work minimum depth", () => {
    expect(dynamicBoq(UNIVERSAL_PROMPTS.elevator).rows.length).toBeGreaterThanOrEqual(35);
  });
});
