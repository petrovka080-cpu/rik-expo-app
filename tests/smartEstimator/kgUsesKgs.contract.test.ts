import { regionalCurrencySummary } from "./smartEstimatorTestHelpers";

describe("smart estimator KG currency", () => {
  it("uses KGS for KG", () => {
    expect(regionalCurrencySummary().kg_uses_kgs).toBe(true);
  });
});
