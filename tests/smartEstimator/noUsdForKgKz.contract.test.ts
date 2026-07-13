import { regionalCurrencySummary } from "./smartEstimatorTestHelpers";

describe("smart estimator no USD for KG/KZ", () => {
  it("does not emit USD totals for KG or KZ", () => {
    const summary = regionalCurrencySummary();
    expect(summary.usd_final_total_for_kg).toBe(0);
    expect(summary.usd_final_total_for_kz).toBe(0);
  });
});
