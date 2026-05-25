import { buildLegacyPdfRegressionProof } from "./pdfTabularRegressionTestHelpers";

describe("AI estimate PDF tabular regression legacy PDF protection", () => {
  it("keeps the legacy estimate PDF renderer valid", () => {
    const { extraction } = buildLegacyPdfRegressionProof();
    expect(extraction.valid).toBe(true);
    expect(extraction.failures).toEqual([]);
    expect(extraction.binaryHeader).toBe("%PDF-");
    expect(extraction.cyrillicReadable).toBe(true);
  });
});
