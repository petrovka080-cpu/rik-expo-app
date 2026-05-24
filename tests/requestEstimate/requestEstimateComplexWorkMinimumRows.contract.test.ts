import { foundationDepth } from "./requestEstimateBoqCatalogTestHelpers";

describe("complex work minimum rows", () => {
  it("fails known complex work when it is below the governed minimum row depth", () => {
    expect(foundationDepth().minimumRows).toBe(12);
    expect(foundationDepth().actualRows).toBeGreaterThanOrEqual(foundationDepth().minimumRows);
  });
});
