import type { EstimateMigrationRecord } from "./estimateMigrationRecord";
import { validateEstimateMigrationRecord } from "./estimateMigrationRecord";
import type {
  EstimateReplayComparison,
  EstimateReplayDriftType,
} from "./replayableEstimateCoreContract";

export type EstimateDriftPolicyResult = {
  drift_policy_created: true;
  migration_record_schema_created: true;
  drift_detected: boolean;
  silent_drift_rejected: boolean;
  migration_record_required_for_drift: boolean;
  owner_review_required_for_costing_formula_or_catalog_change: boolean;
  migration_record_found: boolean;
  migration_record_owner_approved: boolean;
  accepted: boolean;
  blocking_reasons: string[];
};

function requiresOwnerReview(driftType: EstimateReplayDriftType): boolean {
  return driftType === "formula_or_catalog_update" ||
    driftType === "norm_registry_update" ||
    driftType === "pricebook_update" ||
    driftType === "buyer_handoff_update";
}

export function evaluateEstimateDriftPolicy(input: {
  comparison: EstimateReplayComparison;
  migrationRecords?: readonly EstimateMigrationRecord[];
}): EstimateDriftPolicyResult {
  const migrationRecords = input.migrationRecords ?? [];
  const matching = migrationRecords.find((record) =>
    record.affected_case_ids.includes(input.comparison.expected_record_id) ||
    record.affected_case_ids.includes(input.comparison.expected_record_id.replace(/^replay_record:/, "")) ||
    record.drift_type === input.comparison.drift_type
  );
  const matchingValidation = matching ? validateEstimateMigrationRecord(matching) : [];
  const ownerReviewRequired = requiresOwnerReview(input.comparison.drift_type);
  const ownerApproved = matching?.review_state === "owner_approved";
  const silentDriftRejected = input.comparison.drift_detected && !matching;
  const blockers = [
    input.comparison.drift_detected && !matching ? "silent_drift_without_migration_record" : "",
    matching && matchingValidation.length > 0 ? `migration_record_invalid:${matchingValidation.join("|")}` : "",
    ownerReviewRequired && matching && !ownerApproved ? "owner_review_required" : "",
  ].filter(Boolean);
  return {
    drift_policy_created: true,
    migration_record_schema_created: true,
    drift_detected: input.comparison.drift_detected,
    silent_drift_rejected: silentDriftRejected,
    migration_record_required_for_drift: input.comparison.drift_detected,
    owner_review_required_for_costing_formula_or_catalog_change: ownerReviewRequired,
    migration_record_found: Boolean(matching),
    migration_record_owner_approved: ownerApproved,
    accepted: input.comparison.drift_detected ? blockers.length === 0 : true,
    blocking_reasons: blockers,
  };
}
