import { createEstimatePdf, extractEstimatePdfTextForProof, validateNoPdfMojibake } from "../../src/lib/estimatePdf";
import { requestEstimate, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("universal estimator PDF mojibake guard", () => {
  it("generates extractable text without mojibake markers", () => {
    const estimate = requestEstimate(UNIVERSAL_PROMPTS.elevator);
    const pdf = createEstimatePdf({ estimate, generatedAt: "2026-05-29T00:00:00.000Z", language: "ru" });
    const text = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey }).text;
    expect(validateNoPdfMojibake(text).passed).toBe(true);
  });
});
