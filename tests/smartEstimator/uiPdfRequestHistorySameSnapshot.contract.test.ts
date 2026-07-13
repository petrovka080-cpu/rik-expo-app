import { pdfParitySummary } from "./smartEstimatorTestHelpers";

describe("smart estimator UI/PDF/request/history parity", () => {
  it("uses the same snapshot for all surfaces", () => {
    expect(pdfParitySummary().ui_pdf_request_history_same_snapshot).toBe(true);
  });
});
