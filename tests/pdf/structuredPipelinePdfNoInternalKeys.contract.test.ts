import { createEstimatePdf, extractEstimatePdfText } from "../../src/lib/estimatePdf";
import { allPayloads, expectNoForbiddenVisibleText } from "../estimateStructuredPipeline/structuredPipelineTestHelpers";

describe("structured pipeline PDF internal key guard", () => {
  it("does not expose work keys, material keys or snake_case in PDF text", () => {
    for (const payload of allPayloads().slice(0, 3)) {
      const pdf = createEstimatePdf({
        estimate: payload.sourceEstimate,
        generatedAt: "2026-06-07T00:00:00.000Z",
        language: "ru",
      });
      expectNoForbiddenVisibleText(extractEstimatePdfText(pdf.bytes));
    }
  });
});
