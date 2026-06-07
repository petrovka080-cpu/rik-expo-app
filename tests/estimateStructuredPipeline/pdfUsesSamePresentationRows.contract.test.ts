import { buildStructuredEstimatePdfViewModel } from "../../src/lib/estimateStructuredPipeline";
import { allPayloads, payloadRowsFingerprint } from "./structuredPipelineTestHelpers";

describe("PDF structured estimate binding", () => {
  it("uses the same presentation rows as UI", () => {
    for (const payload of allPayloads()) {
      const pdf = buildStructuredEstimatePdfViewModel(payload, {
        generatedAt: "2026-06-07T00:00:00.000Z",
        language: "ru",
      });
      const pdfRows = pdf.sections.flatMap((section) => section.rows.map((row) => row.name));
      expect(pdfRows).toEqual(payload.presentation.rows.map((row) => row.name));
      expect(payloadRowsFingerprint(payload)).toBeTruthy();
    }
  });
});
