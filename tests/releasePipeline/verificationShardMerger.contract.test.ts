import { mergeVerificationShards, type ShardResult } from "../../scripts/verification/verificationShardMerger";
import {
  hashDistributedReceiptStringList,
  mergeDistributedAffectedJestShardReceipts,
} from "../../scripts/verification/mergeDistributedAffectedJestShardReceipts";

const sha = "c".repeat(40);
const manifest = "d".repeat(64);

function shard(shard_id: number, suites: string[], item_indices: number[]): ShardResult {
  return { shard_id, subject_sha: sha, manifest_hash: manifest, exit_code: 0, suites, item_indices, failed_assertions: [] };
}

describe("Verification Architecture V1 shard fan-in", () => {
  it("proves exact suite union and full 11610/11610 item coverage", () => {
    const result = mergeVerificationShards({
      expectedShardIds: [0, 1], expectedSuites: ["a", "b"], expectedItemCount: 11610, subjectSha: sha, manifestHash: manifest,
      results: [shard(0, ["a"], Array.from({ length: 5805 }, (_, i) => i)), shard(1, ["b"], Array.from({ length: 5805 }, (_, i) => i + 5805))],
    });
    expect(result.final_status).toBe("GREEN_COMPLETE_SHARD_FANIN");
    expect(result.item_coverage).toBe("11610/11610");
    expect(result.missing_items).toEqual([]);
    expect(result.duplicate_items).toEqual([]);
  });

  it("treats 11/12 successful shards as RED", () => {
    const results = Array.from({ length: 11 }, (_, id) => shard(id, [`suite-${id}`], []));
    const result = mergeVerificationShards({ expectedShardIds: Array.from({ length: 12 }, (_, id) => id), expectedSuites: Array.from({ length: 12 }, (_, id) => `suite-${id}`), subjectSha: sha, manifestHash: manifest, results });
    expect(result.final_status).toBe("RED_INCOMPLETE_OR_FAILED_SHARD_FANIN");
    expect(result.missing_shards).toEqual([11]);
    expect(result.missing_suites).toEqual(["suite-11"]);
  });

  it("rejects duplicate membership, failed assertions, and lineage drift", () => {
    const bad = shard(1, ["a"], [0]);
    bad.subject_sha = "e".repeat(40);
    bad.failed_assertions = ["boom"];
    const result = mergeVerificationShards({ expectedShardIds: [0, 1], expectedSuites: ["a", "b"], expectedItemCount: 2, subjectSha: sha, manifestHash: manifest, results: [shard(0, ["a"], [0]), bad] });
    expect(result.exit_code).toBe(1);
    expect(result.duplicate_suites).toEqual(["a"]);
    expect(result.duplicate_items).toEqual([0]);
    expect(result.lineage_mismatch_shards).toEqual([1]);
    expect(result.failed_assertions).toEqual(["boom"]);
  });
});

const distributedSuites = Array.from({ length: 335 }, (_, index) => `tests/synthetic/suite-${index}.test.ts`);
const distributedShards = Array.from({ length: 8 }, (_, shardId) => ({
  shard_id: shardId,
  test_files: distributedSuites.filter((_, index) => index % 8 === shardId),
}));
const distributedPlaywrightSuites = [
  "pw-0.web.spec.ts",
  "pw-1.web.spec.ts",
  "pw-2.web.spec.ts",
  "pw-3.web.spec.ts",
];
const distributedPlan = {
  selected_suites: [...distributedSuites, ...distributedPlaywrightSuites],
  input_fingerprint: "fingerprint",
};
const distributedShardPlan = {
  manifest: distributedSuites.map((test_path) => ({ test_path })),
  manifest_sha256: "manifest",
  resource_plan: { waves: [{ shards: distributedShards }] },
  subject: { base_sha: "base", head_sha: "head", input_fingerprint: "fingerprint" },
};

function distributedReceipts() {
  return distributedShards.map((distributedShard, index) => ({
    schema: "verification-distributed-affected-jest-shard-receipt/v1",
    final_status: "GREEN_DISTRIBUTED_AFFECTED_JEST_SHARD",
    subject: {
      base_sha: "base",
      head_sha: "head",
      input_fingerprint: "fingerprint",
      terminal_input_fingerprint: "fingerprint",
      input_drift_detected: false,
    },
    membership: {
      full_selected_jest_suites: 335,
      full_selected_playwright_suites: 4,
      shard_manifest_sha256: "manifest",
      shard_id: distributedShard.shard_id,
      expected_suite_count: distributedShard.test_files.length,
      expected_suites_sha256: hashDistributedReceiptStringList(distributedShard.test_files),
      observed_suite_count: distributedShard.test_files.length,
      observed_suites_sha256: hashDistributedReceiptStringList(distributedShard.test_files),
      passed: true,
    },
    playwright_evidence: {
      complete: true,
      expected_suite_count: 4,
      expected_suites_sha256: hashDistributedReceiptStringList(distributedPlaywrightSuites),
      compatible_evidence_sha256: "e".repeat(64),
    },
    admission: { passed: true },
    execution: {
      started_at: new Date(Date.UTC(2026, 8, 29, 0, 0, index)).toISOString(),
      ended_at: new Date(Date.UTC(2026, 8, 29, 0, 8, index)).toISOString(),
      duration_ms: 480_000,
      exit_code: 0,
      observed_exit_code: 0,
      result_success: true,
      passed_suites: distributedShard.test_files.length,
      failed_suites: 0,
      passed_tests: distributedShard.test_files.length,
      failed_tests: 0,
      pending_tests: 0,
      failed_assertion_count: 0,
      technical_timed_out: false,
      orphan_detected: false,
      memory_evidence_status: "COMPLETE",
      process_tree_memory_peak_bytes: 1,
    },
    slo_ms: 600_000,
    technical_timeout_ms: 720_000,
  }));
}

function mergeDistributed(overrides = distributedReceipts()) {
  return mergeDistributedAffectedJestShardReceipts({
    plan: distributedPlan,
    shardPlan: distributedShardPlan,
    receipts: overrides,
    budgetMs: 600_000,
  });
}

describe("distributed affected Jest gate fan-in", () => {
  test("accepts the exact current 335-suite plan without a stale fixed denominator", () => {
    const result = mergeDistributed();
    expect(result.terminal).toBe("GREEN");
    expect(result.membership.selected_jest_suites).toBe(335);
    expect(result.membership.passed_jest_suites).toBe(335);
    expect(result.playwright_evidence.passed).toBe(true);
    expect(result.timing.gate_duration_ms).toBe(487_000);
    expect(result.timing.slo_passed).toBe(true);
  });

  test.each([
    "duplicate shard",
    "missing observed suite",
    "identity drift",
    "failed shard",
    "SLO overrun",
  ])("rejects %s without weakening membership or timing", (failure) => {
    const changed = distributedReceipts();
    if (failure === "duplicate shard") changed[7].membership.shard_id = 6;
    if (failure === "missing observed suite") changed[0].membership.observed_suite_count -= 1;
    if (failure === "identity drift") changed[0].subject.terminal_input_fingerprint = "drift";
    if (failure === "failed shard") changed[0].execution.failed_tests = 1;
    if (failure === "SLO overrun") changed[7].execution.ended_at = "2026-09-29T00:10:01.000Z";
    expect(mergeDistributed(changed).terminal).toBe("RED_OR_INCOMPLETE");
  });
});
