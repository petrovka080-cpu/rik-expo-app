import { expectPhase2ShardPlanValid } from "./phase2TestHelpers";

describe("built-in AI 50000 Phase 2 shard planner", () => {
  it("plans 50 shards of 1000 cases each", () => {
    expectPhase2ShardPlanValid();
  });
});
