import { realPriceSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator fake suppliers", () => {
  it("does not claim fake suppliers", () => {
    expect(realPriceSummary().fake_suppliers_found).toBe(0);
  });
});
