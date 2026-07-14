import { estimatorPlan, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("concrete pedestal volume formula", () => {
  it("calculates volume, waste and formwork from dimensions", () => {
    const outputs = estimatorPlan(UNIVERSAL_PROMPTS.concretePedestals).formulas[0]?.outputs;
    expect(outputs).toMatchObject({
      volumeEachM3: 1,
      volumeTotalM3: 10,
      concreteWithWasteM3: 10.8,
      formworkTotalM2: 90,
    });
  });
});
