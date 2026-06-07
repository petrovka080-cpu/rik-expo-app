import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF metadata", () => {
  it("contains human document metadata while keeping service trace out of visible PDF text", () => {
    const { estimate, pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.text).toContain("Документ №");
    expect(pdf.validation.text).toContain("Объект / вид работ");
    expect(pdf.viewModel.runtimeTraceId).toBeTruthy();
    expect(pdf.validation.text).toContain(estimate.work.title);
    expect(pdf.validation.text).not.toContain("Служебный ID");
    expect(pdf.validation.text).not.toContain("Work key");
    expect(pdf.validation.text).not.toContain("Estimate ID");
    expect(pdf.validation.text).not.toContain("Runtime trace ID");
  });
});
