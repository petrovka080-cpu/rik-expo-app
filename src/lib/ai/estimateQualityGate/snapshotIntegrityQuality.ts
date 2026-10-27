import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

export function evaluateSnapshotIntegrityQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "snapshot_integrity_passed" });

  const hashes = [
    snapshot.ui_payload_hash,
    snapshot.pdf_payload_hash,
    snapshot.request_payload_hash,
    snapshot.history_payload_hash,
  ];
  const allHashesMatch = snapshot.all_hashes_match && hashes.every((hash) => hash === hashes[0]);
  const failures = [];
  if (!snapshot.snapshot_id || !snapshot.pricebook_snapshot_id || !allHashesMatch) {
    failures.push(qualityFailure({
      code: "SNAPSHOT_DESYNC",
      details: "Snapshot id, pricebook snapshot id, or payload hashes are not stable.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if (snapshot.pdf_repriced_after_snapshot) {
    failures.push(qualityFailure({
      code: "PDF_RECALCULATED_SEPARATELY",
      details: "PDF payload was recalculated instead of using the immutable snapshot.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if (snapshot.history_repriced_after_snapshot || snapshot.ui_repriced_after_snapshot) {
    failures.push(qualityFailure({
      code: "REQUEST_HISTORY_PAYLOAD_MISMATCH",
      details: "UI/request/history payload desynchronized from the immutable snapshot.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }

  return qualityRuleResult({ check: "snapshot_integrity_passed", failures });
}
