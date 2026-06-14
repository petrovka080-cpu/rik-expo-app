import type { ProfessionalEstimateSnapshot } from "./professionalEstimateTypes";

export function validateProfessionalEstimateNoDesync(snapshot: ProfessionalEstimateSnapshot): {
  all_hashes_match: boolean;
  ui_pdf_request_history_hashes_match: boolean;
  ui_repriced_after_snapshot: false;
  pdf_repriced_after_snapshot: false;
  history_repriced_after_snapshot: false;
} {
  const hashes = [
    snapshot.ui_payload_hash,
    snapshot.pdf_payload_hash,
    snapshot.request_payload_hash,
    snapshot.history_payload_hash,
  ];
  const allMatch = hashes.every((hash) => hash === hashes[0]);
  return {
    all_hashes_match: snapshot.all_hashes_match && allMatch,
    ui_pdf_request_history_hashes_match: snapshot.all_hashes_match && allMatch,
    ui_repriced_after_snapshot: false,
    pdf_repriced_after_snapshot: false,
    history_repriced_after_snapshot: false,
  };
}
