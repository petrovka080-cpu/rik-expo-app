import { createEstimatePdf } from "../../src/lib/estimatePdf";
import { requestEstimate, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("universal estimator PDF structured payload", () => {
  it("uses GlobalEstimateResult, not markdown answer text", () => {
    const estimate = requestEstimate(UNIVERSAL_PROMPTS.concretePedestals);
    const pdf = createEstimatePdf({ estimate, generatedAt: "2026-05-29T00:00:00.000Z", language: "ru" });
    expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
    expect(pdf.validation.valid).toBe(true);
  });
});
