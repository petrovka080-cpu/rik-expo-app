import { fullCases, fullShardPlan } from "./phase2TestHelpers";

describe("built-in AI 50000 Phase 2 shard completeness", () => {
  it("assigns every full manifest case to a shard", () => {
    const plannedIds = new Set(fullShardPlan.flatMap((shard) => shard.caseIds));
    expect(fullCases.every((testCase) => plannedIds.has(testCase.id))).toBe(true);
    expect(plannedIds.size).toBe(fullCases.length);
  });
});
