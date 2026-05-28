import { estimateFor, pdfFor, FOREMAN_PAVING_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate PDF Cyrillic", () => {
  it("extracts readable Cyrillic", () => {
    const pdf = pdfFor(estimateFor("/ai?context=foreman", FOREMAN_PAVING_PROMPT));
    expect(pdf.pdfTrace.pdf_cyrillic_readable).toBe(true);
    expect(pdf.text).toContain("Брусчатка");
  });
});
