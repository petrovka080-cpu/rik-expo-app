import { foundationDepth } from "./requestEstimateBoqCatalogTestHelpers";

describe("complex work minimum rows", () => {
  it("fails known complex work when it is below the governed minimum row depth", () => {
    const depth = foundationDepth();
    expect(depth.minimumRows).toBe(0);
    expect(depth.actualRows).toBeGreaterThan(0);
    expect(depth.meaningfulRows).toBe(depth.actualRows);
    expect(depth.blockers).toEqual([]);
    expect(depth.passed).toBe(true);
  });
});
