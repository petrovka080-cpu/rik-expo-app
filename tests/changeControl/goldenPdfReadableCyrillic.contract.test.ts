import { validatePayload, validPdfPayload } from "./changeControlTestHelpers";

describe("golden change control - readable PDF", () => {
  it("requires the PDF contract to keep Cyrillic text extractable", () => {
    const { run } = validatePayload("PDF_ESTIMATE_PAYLOAD_CONTRACT", "estimate_pdf_v1", validPdfPayload({
      cyrillicReadable: true,
      structuredPayload: true,
      professionalTable: true,
    }));
    expect(run.status).toBe("passed");
  });
});
