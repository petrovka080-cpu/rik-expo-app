import {
  countInternalKeysVisible,
  countMojibakeVisible,
} from "../professionalEstimateTemplates";
import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

export function evaluatePdfRequestHistoryParityQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const snapshot = context.snapshot;
  if (!snapshot) return qualityRuleResult({ check: "pdf_request_history_parity_passed" });

  const failures = [];
  const hashesMatch = snapshot.all_hashes_match &&
    snapshot.ui_payload_hash === snapshot.pdf_payload_hash &&
    snapshot.pdf_payload_hash === snapshot.request_payload_hash &&
    snapshot.request_payload_hash === snapshot.history_payload_hash;
  if (!hashesMatch) {
    failures.push(qualityFailure({
      code: "REQUEST_HISTORY_PAYLOAD_MISMATCH",
      details: "UI/PDF/request/history payload hashes do not match.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  const internalKeys = countInternalKeysVisible(snapshot.visible_rows);
  const mojibake = countMojibakeVisible(snapshot.visible_rows);
  if (internalKeys > 0) {
    failures.push(qualityFailure({
      code: "INTERNAL_KEY_VISIBLE",
      details: "Internal key-like token is visible in user payload.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }
  if (mojibake > 0) {
    failures.push(qualityFailure({
      code: "MOJIBAKE_FOUND",
      details: "Mojibake marker is visible in user payload.",
      selectedWorkKey: snapshot.selected_work_key,
    }));
  }

  return qualityRuleResult({ check: "pdf_request_history_parity_passed", failures });
}
