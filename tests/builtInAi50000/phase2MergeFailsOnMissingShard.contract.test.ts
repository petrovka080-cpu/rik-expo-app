import {
  BUILT_IN_AI_50000_FULL_CASES,
  validateBuiltInAi50000Phase2Merge,
} from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 merge missing shard guard", () => {
  it("fails when not all shard matrices are present", () => {
    const result = validateBuiltInAi50000Phase2Merge({
      cases: BUILT_IN_AI_50000_FULL_CASES,
      shardMatrices: [],
      shardCaseResults: [],
      shardFailures: [],
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("SHARD_MATRIX_COUNT_INVALID:0");
  });
});
