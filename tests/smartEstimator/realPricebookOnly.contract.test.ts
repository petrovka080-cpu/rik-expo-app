import { realPriceSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator real pricebook only", () => {
  it("does not claim prices outside governed pricebook", () => {
    const summary = realPriceSummary();
    expect(summary.price_cases_total).toBe(500);
    expect(summary.missing_prices_reported_honestly).toBe(true);
  });
});
