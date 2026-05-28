import { estimateFor, pdfFor, FOREMAN_GABLE_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate PDF mojibake", () => {
  it("does not contain mojibake or null placeholders", () => {
    const pdf = pdfFor(estimateFor("/ai?context=foreman", FOREMAN_GABLE_PROMPT));
    expect(pdf.pdfTrace.pdf_mojibake_found).toBe(false);
    expect(pdf.text).not.toMatch(/Ð|Ñ|�|undefined|\[object Object\]|NaN|null null/);
  });
});
