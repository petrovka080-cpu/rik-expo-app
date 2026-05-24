import { PHASE1_SHARD_PLAN } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 shard planner", () => {
  it("plans 5 shards with 1000 cases each", () => {
    expect(PHASE1_SHARD_PLAN).toHaveLength(5);
    expect(PHASE1_SHARD_PLAN.every((shard) => shard.casesTotal === 1000)).toBe(true);
    expect(PHASE1_SHARD_PLAN.flatMap((shard) => shard.caseIds)).toHaveLength(5000);
  });
});
