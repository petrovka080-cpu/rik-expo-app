import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF Cyrillic", () => {
  it("extracts readable Cyrillic without mojibake", () => {
    const { pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.details.cyrillicReadable).toBe(true);
    expect(pdf.validation.details.mojibakeFound).toBe(false);
  });
});
