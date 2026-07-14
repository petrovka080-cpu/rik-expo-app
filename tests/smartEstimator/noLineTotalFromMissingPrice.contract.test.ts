import { realPriceSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator missing price totals", () => {
  it("does not calculate totals from missing prices", () => {
    expect(realPriceSummary().line_total_from_missing_price).toBe(0);
  });
});
