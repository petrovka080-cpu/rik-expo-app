import { smart1500Summary } from "./marketPricebookTestHelpers";

describe("market pricebook missing price honesty", () => {
  it("reports missing prices honestly", () => {
    expect(smart1500Summary().missing_prices_reported_honestly).toBe(true);
  });
});
