import { noFakeSummary } from "./marketPricebookTestHelpers";

describe("market pricebook random prices", () => {
  it("does not use random prices", () => {
    expect(noFakeSummary().random_prices_found).toBe(0);
  });
});
