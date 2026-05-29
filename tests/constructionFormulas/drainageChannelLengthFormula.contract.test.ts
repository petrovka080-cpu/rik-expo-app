import { estimatorPlan, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("drainage channel length formula", () => {
  it("keeps drainage work length-based", () => {
    const formula = estimatorPlan(UNIVERSAL_PROMPTS.drainage).formulas[0];
    expect(formula?.formulaId).toBe("drainage_channel_length_based_estimate");
    expect(formula?.outputs.channelLengthM).toBe(120);
  });
});
