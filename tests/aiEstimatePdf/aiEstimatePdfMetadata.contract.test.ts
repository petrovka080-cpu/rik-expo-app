import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF metadata", () => {
  it("contains estimate id, work key, route, and runtime trace id", () => {
    const { estimate, pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.text).toContain(estimate.estimateId);
    expect(pdf.validation.text).toContain(estimate.work.workKey);
    expect(pdf.validation.text).toContain("Маршрут");
    expect(pdf.validation.text).toContain("Runtime trace ID");
  });
});
