import { currencySummary } from "./marketPricebookTestHelpers";

describe("market pricebook KG currency", () => {
  it("uses KGS for Kyrgyzstan regions", () => {
    expect(currencySummary().kg_uses_kgs).toBe(true);
  });
});
