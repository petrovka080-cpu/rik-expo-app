import { freshnessSummary } from "./marketPricebookTestHelpers";

describe("market pricebook freshness policy", () => {
  it("requires fresh governed prices", () => {
    const summary = freshnessSummary();
    expect(summary.stale_prices).toBe(0);
    expect(summary.low_confidence_prices).toBe(0);
  });
});
