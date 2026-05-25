import { buildAiEstimatePdfSourceFromGlobalEstimate } from "../../src/lib/ai/estimatePdf";
import { buildLiveEstimate, generateAndValidateLivePdf } from "../liveAcceptance/liveAiEstimatePdfRealityTestHelpers";

describe("estimate PDF source", () => {
  it("uses the structured GlobalEstimateResult as source of truth without exposing raw ids", () => {
    const estimate = buildLiveEstimate("смету на установку ГКЛ на 352 кв м", "/chat");
    const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate);
    const { validation } = generateAndValidateLivePdf(estimate);

    expect(source.structuredEstimate).toBe(estimate);
    expect(validation.text).toContain("Документ №");
    expect(validation.text).toContain(estimate.work.title);
    expect(validation.text).toContain("Листы ГКЛ");
    expect(validation.text).not.toContain("Work key");
    expect(validation.text).not.toContain(estimate.work.workKey);
  });
});
