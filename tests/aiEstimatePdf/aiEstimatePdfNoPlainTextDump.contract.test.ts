import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF plain text dump guard", () => {
  it("does not render a pipe-separated text dump", () => {
    const { pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.details.plainTextDumpFound).toBe(false);
    expect(pdf.validation.text.split(/\r?\n/).some((line) => line.split("|").length >= 4)).toBe(false);
  });
});
