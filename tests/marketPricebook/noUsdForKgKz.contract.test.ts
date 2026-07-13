import { currencySummary } from "./marketPricebookTestHelpers";

describe("market pricebook USD fallback", () => {
  it("does not use USD totals for KG or KZ", () => {
    const summary = currencySummary();
    expect(summary.usd_final_total_for_kg).toBe(0);
    expect(summary.usd_final_total_for_kz).toBe(0);
  });
});
