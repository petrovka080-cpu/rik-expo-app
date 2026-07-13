import { smart1500Summary } from "./marketPricebookTestHelpers";

describe("market pricebook smart estimator 1500 coverage", () => {
  it("resolves at least 98 percent of material keys", () => {
    const summary = smart1500Summary();
    expect(summary.smart_estimator_cases_total).toBe(1500);
    expect(summary.material_keys_resolved_percent).toBeGreaterThanOrEqual(98);
    expect(summary.wrong_currency_cases).toBe(0);
  });
});
