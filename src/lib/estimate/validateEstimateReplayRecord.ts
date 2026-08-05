import type {
  EstimateReplayRecord,
  EstimateReplayRecordValidation,
} from "./replayableEstimateCoreContract";
import { AI_ESTIMATE_REPLAYABLE_CORE_SCHEMA } from "./replayableEstimateCoreContract";
import { resolvedEstimateIdentityChecksum } from "./createEstimateDraftRevision";

export function validateEstimateReplayRecord(record: EstimateReplayRecord): EstimateReplayRecordValidation {
  const { checksum: resolvedChecksum, ...resolvedIdentity } = record.resolved_identity;
  const failures = [
    record.schema === AI_ESTIMATE_REPLAYABLE_CORE_SCHEMA ? "" : "replay_record_schema_invalid",
    record.replay_record_builder_created === true ? "" : "replay_record_builder_missing",
    record.snapshot_id.trim().length > 0 ? "" : "replay_record_without_snapshot",
    record.snapshot_rows_hash.trim().length > 0 ? "" : "replay_record_without_snapshot_rows_hash",
    record.version_lineage.source_sha.trim().length > 0 ? "" : "replay_record_without_source_sha",
    record.version_lineage.catalog_version.trim().length > 0 ? "" : "replay_record_without_catalog_version",
    record.version_lineage.norm_registry_version.trim().length > 0 ? "" : "replay_record_without_norm_registry_version",
    record.version_lineage.pricebook_version.trim().length > 0 ? "" : "replay_record_without_pricebook_version",
    record.version_lineage.calculator_version.trim().length > 0 ? "" : "replay_record_without_calculator_version",
    record.all_new_replay_records_have_resolved_identity === true
      ? ""
      : "replay_record_without_resolved_identity",
    record.new_revision_prompt_fallback_used === false
      ? ""
      : "new_revision_prompt_fallback_used",
    resolvedEstimateIdentityChecksum(resolvedIdentity) === resolvedChecksum
      ? ""
      : "resolved_identity_checksum_invalid",
    record.fake_green_claimed === false ? "" : "fake_green_claimed",
  ].filter(Boolean);
  return {
    replay_core_contract_created: true,
    replay_record_builder_created: record.replay_record_builder_created === true,
    replay_runner_created: true,
    replay_comparator_created: true,
    all_replay_records_have_snapshot: Boolean(record.snapshot_id && record.snapshot_rows_hash),
    all_replay_records_have_version_lineage: Boolean(
      record.version_lineage.source_sha &&
      record.version_lineage.catalog_version &&
      record.version_lineage.norm_registry_version &&
      record.version_lineage.pricebook_version &&
      record.version_lineage.calculator_version
    ),
    all_new_replay_records_have_resolved_identity:
      record.all_new_replay_records_have_resolved_identity === true &&
      Boolean(record.resolved_identity?.checksum),
    valid: failures.length === 0,
    failures,
  };
}
