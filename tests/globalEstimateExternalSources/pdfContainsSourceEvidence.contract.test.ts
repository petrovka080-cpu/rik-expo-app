import { buildAiEstimatePdfSourceFromGlobalEstimate, buildAiEstimatePdfSupplement } from "../../src/lib/ai/estimatePdf";
import { calculateEstimateForPrompt } from "../estimateIntent/anyEstimateTestHelpers";

describe("PDF contains source evidence", () => {
  it("passes row source evidence into the existing PDF lifecycle payload", () => {
    const { result } = calculateEstimateForPrompt("дай смету на прокладку асфальта на 10000 кв метров");
    const source = buildAiEstimatePdfSourceFromGlobalEstimate(result);
    const supplement = buildAiEstimatePdfSupplement(source);

    expect(source.estimate.sections.flatMap((section) => section.rows).every((row) => (row.sourceEvidence?.length ?? 0) > 0)).toBe(true);
    expect(supplement.sourceEvidenceLabels?.length).toBeGreaterThan(0);
  });
});
