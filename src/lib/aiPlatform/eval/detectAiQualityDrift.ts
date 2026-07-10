import type { AiEvalResult } from "./AiEvalContract";

export type AiQualityDrift = {
  caseId: string;
  driftTypes: string[];
  driftDetected: boolean;
};

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

export function detectAiQualityDrift(previous: AiEvalResult, next: AiEvalResult): AiQualityDrift {
  const driftTypes = [
    previous.actual.workFamily === next.actual.workFamily ? "" : "work_family_changed",
    JSON.stringify(sorted(previous.actual.parameterKeys)) === JSON.stringify(sorted(next.actual.parameterKeys)) ? "" : "parameter_key_changed",
    JSON.stringify(previous.actual.missingQuestionsRu) === JSON.stringify(next.actual.missingQuestionsRu) ? "" : "missing_question_changed",
    JSON.stringify(sorted(previous.actual.boqFamilies)) === JSON.stringify(sorted(next.actual.boqFamilies)) ? "" : "boq_row_family_changed",
    previous.scoreBreakdown.quantity_trace_score === next.scoreBreakdown.quantity_trace_score ? "" : "quantity_trace_changed",
    previous.scoreBreakdown.russian_ui_score === next.scoreBreakdown.russian_ui_score &&
      previous.actual.userVisibleAnswerRu === next.actual.userVisibleAnswerRu ? "" : "russian_ui_changed",
    previous.actual.policyStatus === next.actual.policyStatus ? "" : "policy_status_changed",
    Math.abs(previous.cost.durationMs - next.cost.durationMs) <= 250 ? "" : "cost_latency_changed",
    previous.score === next.score ? "" : "quality_score_changed",
  ].filter(Boolean);
  return {
    caseId: next.caseId,
    driftTypes,
    driftDetected: driftTypes.length > 0,
  };
}
