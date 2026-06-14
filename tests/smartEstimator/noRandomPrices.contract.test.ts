import { realPriceSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator random prices", () => {
  it("does not use random prices", () => {
    expect(realPriceSummary().random_prices_found).toBe(0);
  });
});
