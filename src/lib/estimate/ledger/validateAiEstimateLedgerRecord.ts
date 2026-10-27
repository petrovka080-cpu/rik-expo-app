import type { AiEstimateLedgerRecord } from "./AiEstimateLedgerTypes";

export type AiEstimateLedgerRecordValidation = {
  ok: boolean;
  errors: string[];
};

export function validateAiEstimateLedgerRecord(record: AiEstimateLedgerRecord): AiEstimateLedgerRecordValidation {
  const errors = [
    record.schemaVersion === "ai-estimate-ledger-record-v1" ? "" : "schema_version_invalid",
    record.estimateId.trim() ? "" : "estimate_id_missing",
    record.ownerUserId.trim() ? "" : "owner_user_id_missing",
    record.sourceDraftId.trim() ? "" : "source_draft_id_missing",
    record.currentRevisionId.trim() ? "" : "current_revision_id_missing",
    record.sourceSnapshotId.trim() ? "" : "source_snapshot_id_missing",
    record.revisions.some((revision) => revision.revisionId === record.currentRevisionId)
      ? ""
      : "current_revision_not_in_chain",
    record.revisions.every((revision) => revision.immutable === true) ? "" : "revision_not_immutable",
    record.eventLog.every((event) => event.immutable === true && event.idempotencyKey.trim().length > 0)
      ? ""
      : "event_log_not_immutable_or_missing_idempotency",
    record.artifacts.artifactsValidForRevisionId === null
      || record.artifacts.artifactsValidForRevisionId === record.currentRevisionId
      ? ""
      : "artifact_revision_mismatch",
    record.rowCount >= 0 && record.materialRowsCount >= 0 && record.workRowsCount >= 0
      ? ""
      : "negative_row_counts",
  ].filter(Boolean);
  return { ok: errors.length === 0, errors };
}
