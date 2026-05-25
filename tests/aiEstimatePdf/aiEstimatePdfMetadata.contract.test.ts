import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF metadata", () => {
  it("contains human document metadata and the service trace without raw work keys", () => {
    const { estimate, pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.text).toContain("Документ №");
    expect(pdf.validation.text).toContain("Объект / вид работ");
    expect(pdf.validation.text).toContain("Служебный ID");
    expect(pdf.validation.text).toContain(estimate.work.title);
    expect(pdf.validation.text).not.toContain("Work key");
    expect(pdf.validation.text).not.toContain("Estimate ID");
    expect(pdf.validation.text).not.toContain("Runtime trace ID");
  });
});
