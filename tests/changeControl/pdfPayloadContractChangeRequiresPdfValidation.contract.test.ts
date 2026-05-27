import { validatePayload, validPdfPayload } from "./changeControlTestHelpers";

describe("change control - PDF payload contract", () => {
  it("rejects markdown truth and missing professional table", () => {
    const { run } = validatePayload("PDF_ESTIMATE_PAYLOAD_CONTRACT", "estimate_pdf_v1", validPdfPayload({
      structuredPayload: false,
      markdownAsTruth: true,
      professionalTable: false,
    }));
    expect(run.status).toBe("failed");
    expect(run.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "PDF_STRUCTURED_PAYLOAD_REQUIRED",
      "PDF_MARKDOWN_TRUTH_FORBIDDEN",
      "PDF_PROFESSIONAL_TABLE_REQUIRED",
    ]));
  });
});
