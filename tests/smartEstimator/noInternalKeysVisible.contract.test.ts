import { pdfParitySummary, productionSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator visible internal keys", () => {
  it("does not expose internal keys in visible rows or PDF", () => {
    expect(productionSummary().internal_keys_visible).toBe(0);
    expect(pdfParitySummary().internal_keys_visible).toBe(0);
  });
});
