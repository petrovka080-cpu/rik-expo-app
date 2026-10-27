import {
  professionalSha256,
} from "../professionalEstimateTemplates";
import type { ProfessionalEstimateSnapshot } from "../professionalEstimateTemplates";
import {
  SMART_ESTIMATOR_PROTOCOL_VERSION,
  type SmartEstimatorSnapshot,
} from "./smartEstimatorTypes";

export function buildSmartEstimatorSnapshot(
  professionalSnapshot: ProfessionalEstimateSnapshot,
): SmartEstimatorSnapshot {
  const status = professionalSnapshot.totals.estimate_total_status === "COMPLETE"
    ? "ESTIMATE_READY"
    : "PARTIAL_PRICE_MISSING";
  const smartSnapshotHash = professionalSha256({
    protocol_version: SMART_ESTIMATOR_PROTOCOL_VERSION,
    professional_snapshot_id: professionalSnapshot.snapshot_id,
    selected_work_key: professionalSnapshot.selected_work_key,
    ui_payload_hash: professionalSnapshot.ui_payload_hash,
    pdf_payload_hash: professionalSnapshot.pdf_payload_hash,
    request_payload_hash: professionalSnapshot.request_payload_hash,
    history_payload_hash: professionalSnapshot.history_payload_hash,
  });
  return {
    protocol_version: SMART_ESTIMATOR_PROTOCOL_VERSION,
    snapshot_id: professionalSnapshot.snapshot_id,
    status,
    professional_snapshot: professionalSnapshot,
    ui_payload_hash: professionalSnapshot.ui_payload_hash,
    pdf_payload_hash: professionalSnapshot.pdf_payload_hash,
    request_payload_hash: professionalSnapshot.request_payload_hash,
    history_payload_hash: professionalSnapshot.history_payload_hash,
    all_hashes_match: professionalSnapshot.all_hashes_match,
    smart_snapshot_hash: smartSnapshotHash,
    fake_green_claimed: false,
  };
}
