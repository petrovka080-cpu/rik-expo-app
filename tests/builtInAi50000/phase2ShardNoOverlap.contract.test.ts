import { fullShardPlan } from "./phase2TestHelpers";

describe("built-in AI 50000 Phase 2 shard overlap", () => {
  it("does not assign the same case to multiple shards", () => {
    const ids = fullShardPlan.flatMap((shard) => shard.caseIds);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
