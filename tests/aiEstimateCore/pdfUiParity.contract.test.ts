import {
  estimateForText,
  pdfTextForEstimate,
  REAL_WORK_READING_SMOKE_CASES,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core PDF/UI parity", () => {
  it("renders the same visible estimate rows into PDF proof text", () => {
    for (const testCase of REAL_WORK_READING_SMOKE_CASES) {
      const estimate = estimateForText(testCase.text);
      const { text, rowNames } = pdfTextForEstimate(estimate);
      expect(rowNames.length).toBeGreaterThan(0);
      for (const rowName of rowNames) {
        expect(text).toContain(rowName);
      }
    }
  });
});
