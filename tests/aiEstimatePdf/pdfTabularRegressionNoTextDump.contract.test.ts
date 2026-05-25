import { buildPdfTabularRegressionPdf, PDF_TABULAR_REGRESSION_CASES } from "./pdfTabularRegressionTestHelpers";

describe("AI estimate PDF tabular regression no text dump", () => {
  it("renders every regression case as a bordered table document", () => {
    for (const testCase of PDF_TABULAR_REGRESSION_CASES) {
      const { estimate, pdf } = buildPdfTabularRegressionPdf(testCase.prompt);
      expect(estimate.work.workKey).toBe(testCase.expectedWorkKey);
      expect(pdf.validation.details.plainTextDumpFound).toBe(false);
      expect(pdf.validation.details.realBorderedTablePresent).toBe(true);
      expect(pdf.validation.details.markdownTableFound).toBe(false);
    }
  });
});
