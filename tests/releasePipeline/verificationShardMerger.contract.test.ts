import { mergeVerificationShards, type ShardResult } from "../../scripts/verification/verificationShardMerger";

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
