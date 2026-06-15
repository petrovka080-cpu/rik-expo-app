import { deepGoldenSummary } from "./marketPricebookTestHelpers";

describe("market pricebook deep golden 300 coverage", () => {
  it("keeps deep golden material and price coverage production-ready", () => {
    const summary = deepGoldenSummary();
    expect(summary.deep_golden_cases).toBe(300);
    expect(summary.material_coverage_percent).toBe(100);
    expect(summary.price_coverage_percent).toBeGreaterThanOrEqual(95);
    expect(summary.fake_price_cases).toBe(0);
    expect(summary.fake_supplier_cases).toBe(0);
  });
});
