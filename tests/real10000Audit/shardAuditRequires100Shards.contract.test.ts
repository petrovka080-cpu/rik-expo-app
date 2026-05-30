import { runReal10000ShardRuntimeEvidenceAudit } from "../../scripts/audit/real10000EstimateAuditCore";

test("shard audit requires 100 shards present", () => {
  const result = runReal10000ShardRuntimeEvidenceAudit({
    shardMatrices: [{ final_status: "REAL_10000_SHARD_OK" }],
    shardFailures: [[]],
    mergedMatrix: { cases_total: 1 },
    runtimeResults: [{ caseId: "case_1", runtimeTraceId: "trace_1" }],
  });

  expect(result.holes.map((hole) => hole.classification)).toContain("SHARD_COUNT_NOT_100");
});
