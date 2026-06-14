import { productionSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator generic rows", () => {
  it("has no generic material rows", () => {
    expect(productionSummary().generic_material_rows).toBe(0);
  });
});
