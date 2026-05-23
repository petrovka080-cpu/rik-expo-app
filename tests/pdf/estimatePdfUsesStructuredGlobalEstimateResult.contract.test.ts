import { buildAiEstimatePdfSourceFromGlobalEstimate } from "../../src/lib/ai/estimatePdf";
import { buildLiveEstimate, generateAndValidateLivePdf } from "../liveAcceptance/liveAiEstimatePdfRealityTestHelpers";

describe("estimate PDF source", () => {
  it("uses the structured GlobalEstimateResult as source of truth", () => {
    const estimate = buildLiveEstimate("смету на установку ГКЛ на 352 кв м", "/chat");
    const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate);
    const { validation } = generateAndValidateLivePdf(estimate);

    expect(source.structuredEstimate).toBe(estimate);
    expect(validation.text).toContain(estimate.estimateId);
    expect(validation.text).toContain(estimate.work.workKey);
    expect(validation.text).toContain("Листы ГКЛ");
  });
});
