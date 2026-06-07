import { createEstimatePdf, extractEstimatePdfText } from "../../src/lib/estimatePdf";
import { allPayloads } from "../estimateStructuredPipeline/structuredPipelineTestHelpers";

describe("structured pipeline PDF rows match UI", () => {
  it("renders the same visible row names in PDF and UI", () => {
    for (const payload of allPayloads().slice(0, 3)) {
      const pdf = createEstimatePdf({
        estimate: payload.sourceEstimate,
        generatedAt: "2026-06-07T00:00:00.000Z",
        language: "ru",
      });
      const text = extractEstimatePdfText(pdf.bytes);
      for (const row of payload.presentation.rows.slice(0, 8)) {
        expect(text).toContain(row.name);
      }
    }
  });
});
