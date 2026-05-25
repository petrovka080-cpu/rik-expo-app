import { generateAiEstimatePdf } from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFromGlobalEstimate } from "../../src/lib/ai/estimatePdf/estimatePdfSourceResolver";
import { buildPdfTabularRegressionEstimate } from "./pdfTabularRegressionTestHelpers";

describe("AI estimate PDF tabular regression structured view model", () => {
  it("requires structured GlobalEstimateResult payload for AI estimate PDF generation", () => {
    const estimate = buildPdfTabularRegressionEstimate("гидроизоляция крыши 100 м²");
    const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate);
    const result = generateAiEstimatePdf({ source, userConfirmed: true });
    expect(result.access.uri).toContain("data:application/pdf;base64,");

    expect(() =>
      generateAiEstimatePdf({
        source: { ...source, structuredEstimate: undefined },
        userConfirmed: true,
      }),
    ).toThrow(/structured GlobalEstimateResult payload/);
  });
});
