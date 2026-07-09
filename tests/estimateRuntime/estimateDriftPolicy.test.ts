import { evaluateEstimateDriftPolicy } from "../../src/lib/estimate/estimateDriftPolicy";
import type { EstimateMigrationRecord } from "../../src/lib/estimate/estimateMigrationRecord";
import type { EstimateReplayComparison } from "../../src/lib/estimate/replayableEstimateCoreContract";

function driftComparison(): EstimateReplayComparison {
  return {
    status: "failed",
    drift_detected: true,
    drift_type: "formula_or_catalog_update",
    expected_record_id: "replay_record:case_1:old",
    actual_record_id: "replay_record:case_1:new",
    mismatches: [{
      hash_name: "boq_hash",
      expected_hash: "old",
      actual_hash: "new",
      drift_type: "formula_or_catalog_update",
    }],
    mismatch_count: 1,
    rows_count_match: false,
    material_rows_count_match: true,
    work_rows_count_match: true,
    snapshot_rows_hash_match: false,
    snapshot_totals_hash_match: true,
    blocking_reasons: ["hash_mismatch:boq_hash"],
  };
}

describe("estimate drift policy", () => {
  it("rejects silent drift and accepts only explicit owner reviewed migrations", () => {
    const silent = evaluateEstimateDriftPolicy({ comparison: driftComparison(), migrationRecords: [] });
    const migration: EstimateMigrationRecord = {
      migration_id: "mig_case_1_formula_catalog",
      created_at: "2026-07-09T00:00:00.000Z",
      source_sha: "test-source-sha",
      affected_case_ids: ["replay_record:case_1:old"],
      drift_type: "formula_or_catalog_update",
      reason: "Formula and catalog migration for replay case one.",
      previous_hashes: { boq_hash: "old" },
      next_hashes: { boq_hash: "new" },
      review_state: "owner_approved",
      owner: "estimate-core-owner",
      fake_green_claimed: false,
    };
    const approved = evaluateEstimateDriftPolicy({
      comparison: driftComparison(),
      migrationRecords: [migration],
    });

    expect(silent.accepted).toBe(false);
    expect(silent.silent_drift_rejected).toBe(true);
    expect(approved.accepted).toBe(true);
    expect(approved.migration_record_owner_approved).toBe(true);
  });
});
