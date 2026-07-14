import type { EstimateQualitySnapshotContext, EstimateQualityRuleResult } from "./estimateQualityTypes";
import { qualityFailure, qualityRuleResult } from "./estimateQualityReport";

export function evaluateWorkResolutionQuality(
  context: EstimateQualitySnapshotContext,
): EstimateQualityRuleResult {
  const result = context.result;
  const snapshot = context.snapshot;
  const failures = [];

  if (result.status === "NEEDS_CLARIFICATION") {
    return qualityRuleResult({ check: "work_resolution_passed" });
  }

  if (result.status === "WORK_NOT_SUPPORTED") {
    failures.push(qualityFailure({
      code: "WRONG_WORK_MATCH",
      details: "Work is not supported and cannot be shown as a ready estimate.",
      selectedWorkKey: result.work_resolution.selected_work_key,
    }));
  }

  if (!snapshot) {
    failures.push(qualityFailure({
      code: "WRONG_WORK_MATCH",
      details: "Ready estimate status requires an immutable professional snapshot.",
      selectedWorkKey: result.work_resolution.selected_work_key,
    }));
  } else {
    const resolvedKey = result.work_resolution.selected_work_key;
    if (result.work_resolution.status !== "RESOLVED" || !resolvedKey) {
      failures.push(qualityFailure({
        code: "WRONG_WORK_MATCH",
        details: "Estimate snapshot exists without resolved work.",
        selectedWorkKey: snapshot.selected_work_key,
      }));
    }
    if (resolvedKey && resolvedKey !== snapshot.selected_work_key) {
      failures.push(qualityFailure({
        code: "WRONG_WORK_MATCH",
        details: "Resolved work key does not match the snapshot work key.",
        selectedWorkKey: resolvedKey,
      }));
    }
    if (context.input.strict_mode && result.work_resolution.confidence < 0.7) {
      failures.push(qualityFailure({
        code: "LOW_CONFIDENCE_AUTO_SELECTED",
        details: "Strict mode blocks low-confidence auto-selected work.",
        selectedWorkKey: snapshot.selected_work_key,
      }));
    }
  }

  return qualityRuleResult({ check: "work_resolution_passed", failures });
}
