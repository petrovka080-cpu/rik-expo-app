import { runReal10000ShardRuntimeEvidenceAudit } from "../../scripts/audit/real10000EstimateAuditCore";

test("shard audit rejects single-shard fake green", () => {
  const result = runReal10000ShardRuntimeEvidenceAudit({
    shardMatrices: [{ final_status: "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY" }],
    shardFailures: [[]],
    mergedMatrix: { cases_total: 1 },
    runtimeResults: [{ caseId: "case_1", runtimeTraceId: "trace_1" }],
  });

  expect(result.holes.map((hole) => hole.classification)).toContain("SINGLE_SHARD_GREEN_CLAIMED");
});
