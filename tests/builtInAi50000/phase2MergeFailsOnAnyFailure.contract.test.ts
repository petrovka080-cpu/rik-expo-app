import {
  BUILT_IN_AI_50000_FULL_CASES,
  validateBuiltInAi50000Phase2Merge,
} from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 merge failure guard", () => {
  it("fails when any shard failure is present", () => {
    const result = validateBuiltInAi50000Phase2Merge({
      cases: BUILT_IN_AI_50000_FULL_CASES,
      shardMatrices: [],
      shardCaseResults: [],
      shardFailures: [{ code: "SOURCE_EVIDENCE_MISSING" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("SHARD_FAILURES_PRESENT:1");
  });
});
