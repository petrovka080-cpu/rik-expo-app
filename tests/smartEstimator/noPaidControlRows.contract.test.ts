import { productionSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator paid control rows", () => {
  it("has no paid control rows", () => {
    expect(productionSummary().paid_control_rows).toBe(0);
  });
});
