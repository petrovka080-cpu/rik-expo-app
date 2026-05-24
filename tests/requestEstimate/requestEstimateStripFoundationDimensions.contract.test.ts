import { foundationEstimate } from "./requestEstimateBoqCatalogTestHelpers";

describe("strip foundation dimensions", () => {
  it("parses length, width and height from the Russian request prompt", () => {
    expect(foundationEstimate().input.dimensions).toMatchObject({
      length: 48,
      width: 0.4,
      height: 1.7,
      unitSystem: "metric",
    });
  });
});
