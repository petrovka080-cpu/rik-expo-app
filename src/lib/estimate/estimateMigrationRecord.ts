import type { EstimateReplayDriftType, EstimateReplayHashSet } from "./replayableEstimateCoreContract";

export type EstimateMigrationRecordReviewState = "pending_owner_review" | "owner_approved" | "rejected";

export type EstimateMigrationRecord = {
  migration_id: string;
  created_at: string;
  source_sha: string;
  affected_case_ids: string[];
  drift_type: Exclude<EstimateReplayDriftType, "none">;
  reason: string;
  previous_hashes: Partial<EstimateReplayHashSet>;
  next_hashes: Partial<EstimateReplayHashSet>;
  review_state: EstimateMigrationRecordReviewState;
  owner: string;
  fake_green_claimed: false;
};

export function validateEstimateMigrationRecord(record: EstimateMigrationRecord): string[] {
  return [
    record.migration_id.trim().length > 0 ? "" : "migration_id_missing",
    record.created_at.trim().length > 0 ? "" : "created_at_missing",
    record.source_sha.trim().length > 0 ? "" : "source_sha_missing",
    record.affected_case_ids.length > 0 ? "" : "affected_case_ids_missing",
    record.drift_type.trim().length > 0 ? "" : "drift_type_missing",
    record.reason.trim().length >= 12 ? "" : "migration_reason_too_short",
    Object.keys(record.previous_hashes).length > 0 ? "" : "previous_hashes_missing",
    Object.keys(record.next_hashes).length > 0 ? "" : "next_hashes_missing",
    record.review_state === "owner_approved" || record.review_state === "pending_owner_review" ? "" : "review_state_invalid",
    record.owner.trim().length > 0 ? "" : "owner_missing",
    record.fake_green_claimed === false ? "" : "fake_green_claimed",
  ].filter(Boolean);
}
