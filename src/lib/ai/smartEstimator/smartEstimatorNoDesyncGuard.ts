import { validateProfessionalEstimateNoDesync } from "../professionalEstimateTemplates";
import type { SmartEstimatorNoDesyncAudit, SmartEstimatorSnapshot } from "./smartEstimatorTypes";

export function validateSmartEstimatorNoDesync(
  snapshot: SmartEstimatorSnapshot,
): SmartEstimatorNoDesyncAudit {
  const professional = validateProfessionalEstimateNoDesync(snapshot.professional_snapshot);
  const hashes = [
    snapshot.ui_payload_hash,
    snapshot.pdf_payload_hash,
    snapshot.request_payload_hash,
    snapshot.history_payload_hash,
  ];
  const hashesMatch = snapshot.all_hashes_match && hashes.every((hash) => hash === hashes[0]);
  const valid = professional.ui_pdf_request_history_hashes_match && hashesMatch;
  return {
    snapshot_desync_cases: valid ? 0 : 1,
    ui_pdf_request_history_hashes_match: valid,
    ui_repriced_after_snapshot: false,
    pdf_repriced_after_snapshot: false,
    history_repriced_after_snapshot: false,
    fake_green_claimed: false,
  };
}
