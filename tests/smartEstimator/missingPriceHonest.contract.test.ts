import { realPriceSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator missing price honesty", () => {
  it("reports missing prices honestly", () => {
    expect(realPriceSummary().missing_prices_reported_honestly).toBe(true);
  });
});
