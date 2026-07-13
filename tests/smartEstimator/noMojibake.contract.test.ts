import { pdfParitySummary, productionSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator mojibake", () => {
  it("does not emit mojibake in visible rows or PDF", () => {
    expect(productionSummary().mojibake_found).toBe(0);
    expect(pdfParitySummary().mojibake_found).toBe(0);
  });
});
