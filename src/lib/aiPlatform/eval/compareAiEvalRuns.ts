import type { AiEvalRunSummary } from "./AiEvalContract";
import { detectAiQualityDrift } from "./detectAiQualityDrift";

export function compareAiEvalRuns(previous: AiEvalRunSummary, next: AiEvalRunSummary) {
  const previousByCase = new Map(previous.results.map((result) => [result.caseId, result]));
  const drifts = next.results
    .map((result) => {
      const previousResult = previousByCase.get(result.caseId);
      return previousResult ? detectAiQualityDrift(previousResult, result) : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  return {
    eval_run_comparison_created: true,
    drifts,
    driftDetected: drifts.some((drift) => drift.driftDetected),
    work_family_drift_detected: drifts.some((drift) => drift.driftTypes.includes("work_family_changed")),
    parameter_drift_detected: drifts.some((drift) => drift.driftTypes.includes("parameter_key_changed")),
    missing_question_drift_detected: drifts.some((drift) => drift.driftTypes.includes("missing_question_changed")),
    boq_drift_detected: drifts.some((drift) => drift.driftTypes.includes("boq_row_family_changed")),
    quantity_trace_drift_detected: drifts.some((drift) => drift.driftTypes.includes("quantity_trace_changed")),
    russian_ui_drift_detected: drifts.some((drift) => drift.driftTypes.includes("russian_ui_changed")),
    policy_drift_detected: drifts.some((drift) => drift.driftTypes.includes("policy_status_changed")),
    pdf_buyer_drift_detected: drifts.some((drift) => drift.driftTypes.includes("boq_row_family_changed")),
    cost_latency_drift_detected: drifts.some((drift) => drift.driftTypes.includes("cost_latency_changed")),
    quality_score_drift_detected: drifts.some((drift) => drift.driftTypes.includes("quality_score_changed")),
    drift_requires_explicit_acceptance_or_stop: true,
  };
}
