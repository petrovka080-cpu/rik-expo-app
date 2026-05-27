import { WORLD_50000_CASES_PER_SHARD, WORLD_50000_GOVERNED_TOTAL, WORLD_50000_SHARDS_TOTAL, buildWorld50000ShardCases } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 shard planner", () => {
  it("plans 50 shards with 1000 governed construction cases each", () => {
    expect(WORLD_50000_SHARDS_TOTAL).toBe(50);
    expect(WORLD_50000_CASES_PER_SHARD).toBe(1000);
    expect(WORLD_50000_GOVERNED_TOTAL).toBe(50000);
    expect(buildWorld50000ShardCases(0)).toHaveLength(1000);
    expect(buildWorld50000ShardCases(49)).toHaveLength(1000);
  });
});
