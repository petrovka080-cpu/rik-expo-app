import { buildPdfTabularRegressionPdf } from "./pdfTabularRegressionTestHelpers";

describe("AI estimate PDF tabular regression raw internal field guard", () => {
  it("does not expose materialKey, rateKey, sourceId, raw units, or backend labels", () => {
    const { pdf } = buildPdfTabularRegressionPdf();
    expect(pdf.validation.details.rawMaterialKeyVisible).toBe(false);
    expect(pdf.validation.details.rawRateKeyVisible).toBe(false);
    expect(pdf.validation.details.rawSourceIdVisible).toBe(false);
    expect(pdf.validation.details.backendDebugTextVisible).toBe(false);
    expect(pdf.validation.details.rawUnitLabelsFound).toBe(false);
    expect(pdf.validation.text).not.toMatch(/materialKey|rateKey|sourceId|Confidence|Work key|Estimate ID|Runtime trace ID/);
  });
});
