import { productEntrypointSource, world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no screen local calculation", () => {
  it("keeps proof logic out of route-local calculation code", () => {
    expect(productEntrypointSource()).not.toContain("S_WORLD_CONSTRUCTION_50000_PLUS_SHARDED_LIVE_REALITY_PROOF");
    expect(world50000Source()).toContain("runWorldConstructionEstimateEngine");
  });
});
