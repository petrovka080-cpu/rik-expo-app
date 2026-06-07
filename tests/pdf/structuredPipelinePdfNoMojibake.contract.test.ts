import { createEstimatePdf, validateEstimatePdf } from "../../src/lib/estimatePdf";
import { allPayloads } from "../estimateStructuredPipeline/structuredPipelineTestHelpers";

describe("structured pipeline PDF mojibake guard", () => {
  it("keeps Cyrillic text extractable without mojibake", () => {
    for (const payload of allPayloads().slice(0, 3)) {
      const pdf = createEstimatePdf({
        estimate: payload.sourceEstimate,
        generatedAt: "2026-06-07T00:00:00.000Z",
        language: "ru",
      });
      const validation = validateEstimatePdf({ pdf: pdf.bytes, requiredText: [payload.presentation.rows[0].name] });
      expect(validation.details.cyrillicReadable).toBe(true);
      expect(validation.details.mojibakeFound).toBe(false);
      expect(validation.valid).toBe(true);
    }
  });
});
