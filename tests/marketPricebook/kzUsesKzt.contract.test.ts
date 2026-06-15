import { currencySummary } from "./marketPricebookTestHelpers";

describe("market pricebook KZ currency", () => {
  it("uses KZT for Kazakhstan regions", () => {
    expect(currencySummary().kz_uses_kzt).toBe(true);
  });
});
