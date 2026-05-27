import { WORLD_50000_SHARDS_TOTAL, world50000ProofSource } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 merge requires all shards", () => {
  it("merge proof requires all 50 shard matrices", () => {
    expect(WORLD_50000_SHARDS_TOTAL).toBe(50);
    expect(world50000ProofSource()).toContain("SHARDS_NOT_ALL_GREEN");
  });
});
