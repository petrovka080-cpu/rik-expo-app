import { estimateFor, pdfFor, presentationFor, REQUEST_LINOLEUM_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate PDF row parity", () => {
  it("keeps UI rows and PDF rows from the same structured estimate", () => {
    const estimate = estimateFor("/request", REQUEST_LINOLEUM_PROMPT);
    const ui = presentationFor(estimate);
    const pdf = pdfFor(estimate);
    for (const row of ui.rows.slice(0, 8)) {
      expect(pdf.text).toContain(row.name);
    }
  });
});
