import { productionSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator cross-domain guard", () => {
  it("has zero cross-domain row leaks", () => {
    expect(productionSummary().cross_domain_row_leaks).toBe(0);
  });
});
