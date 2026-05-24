import { allRows, foundationEstimate } from "./requestEstimateBoqCatalogTestHelpers";

describe("strip foundation concrete volume", () => {
  it("calculates concrete as 48 x 0.4 x 1.7 = 32.64 m3", () => {
    const estimate = foundationEstimate();
    expect(estimate.input.dimensions?.concreteVolumeM3).toBe(32.64);
    const concrete = allRows(estimate).find((row) => row.code === "strip_foundation_concrete_m300");
    expect(concrete?.quantity).toBe(32.64);
    expect(concrete?.unit).toBe("m3");
  });
});
