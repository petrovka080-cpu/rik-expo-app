import path from "node:path";

import { evaluateEstimateDriftPolicy } from "../../src/lib/estimate/estimateDriftPolicy";
import type { EstimateMigrationRecord } from "../../src/lib/estimate/estimateMigrationRecord";
import type { EstimateReplayComparison } from "../../src/lib/estimate/replayableEstimateCoreContract";
import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

const ROOT = path.join(".release-runtime", "ai-estimate-replayable-core", "migration-policy");

export const GREEN_AI_ESTIMATE_MIGRATION_RECORD_POLICY = "GREEN_AI_ESTIMATE_MIGRATION_RECORD_POLICY" as const;
export const STOP_AI_ESTIMATE_MIGRATION_RECORD_POLICY_FAILED = "STOP_AI_ESTIMATE_MIGRATION_RECORD_POLICY_FAILED" as const;

function sampleDriftComparison(): EstimateReplayComparison {
  return {
    status: "failed",
    drift_detected: true,
    drift_type: "pricebook_update",
    expected_record_id: "replay_record:policy_sample:old",
    actual_record_id: "replay_record:policy_sample:new",
    mismatches: [{
      hash_name: "costing_hash",
      expected_hash: "old",
      actual_hash: "new",
      drift_type: "pricebook_update",
    }],
    mismatch_count: 1,
    rows_count_match: true,
    material_rows_count_match: true,
    work_rows_count_match: true,
    snapshot_rows_hash_match: true,
    snapshot_totals_hash_match: true,
    blocking_reasons: ["hash_mismatch:costing_hash"],
  };
}

export function validateEstimateMigrationRecords(records: readonly EstimateMigrationRecord[] = []) {
  const noDrift = evaluateEstimateDriftPolicy({
    comparison: {
      ...sampleDriftComparison(),
      status: "passed",
      drift_detected: false,
      drift_type: "none",
      mismatches: [],
      mismatch_count: 0,
      blocking_reasons: [],
    },
    migrationRecords: records,
  });
  const silentDrift = evaluateEstimateDriftPolicy({
    comparison: sampleDriftComparison(),
    migrationRecords: [],
  });
  const ownerApprovedMigration: EstimateMigrationRecord = {
    migration_id: "mig_policy_sample_pricebook_update",
    created_at: "2026-07-09T00:00:00.000Z",
    source_sha: currentSourceSha(),
    affected_case_ids: ["replay_record:policy_sample:old"],
    drift_type: "pricebook_update",
    reason: "Trusted pricebook sample migration requires explicit owner approval.",
    previous_hashes: { costing_hash: "old" },
    next_hashes: { costing_hash: "new" },
    review_state: "owner_approved",
    owner: "estimate-core-owner",
    fake_green_claimed: false,
  };
  const approvedDrift = evaluateEstimateDriftPolicy({
    comparison: sampleDriftComparison(),
    migrationRecords: [ownerApprovedMigration],
  });
  const blockers = [
    noDrift.accepted ? "" : "no_drift_policy_rejected",
    silentDrift.silent_drift_rejected ? "" : "silent_drift_not_rejected",
    !silentDrift.accepted ? "" : "silent_drift_accepted",
    approvedDrift.accepted ? "" : "approved_migration_rejected",
    approvedDrift.migration_record_owner_approved ? "" : "owner_approved_migration_not_detected",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_MIGRATION_RECORD_POLICY
      : STOP_AI_ESTIMATE_MIGRATION_RECORD_POLICY_FAILED,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    drift_policy_created: true,
    migration_record_schema_created: true,
    silent_drift_rejected: silentDrift.silent_drift_rejected,
    migration_record_required_for_drift: silentDrift.migration_record_required_for_drift,
    owner_review_required_for_costing_formula_or_catalog_change:
      silentDrift.owner_review_required_for_costing_formula_or_catalog_change,
    approved_migration_accepted: approvedDrift.accepted,
    external_migration_records_total: records.length,
    blockers,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(ROOT, summary);
  return {
    artifactPath: result.artifactPath,
    artifact: summary,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateEstimateMigrationRecords.ts")) {
  const result = validateEstimateMigrationRecords();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_MIGRATION_RECORD_POLICY) process.exitCode = 1;
}
