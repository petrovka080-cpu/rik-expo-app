import type { AiEvalResult } from "./AiEvalContract";

export type AiQualityDrift = {
  caseId: string;
  driftTypes: string[];
  driftDetected: boolean;
};

export function detectAiQualityDrift(previous: AiEvalResult, next: AiEvalResult): AiQualityDrift {
  const driftTypes = [
    previous.actual.workFamily === next.actual.workFamily ? "" : "work_family_changed",
    JSON.stringify(previous.actual.parameterKeys.sort()) === JSON.stringify(next.actual.parameterKeys.sort()) ? "" : "parameter_key_changed",
    JSON.stringify(previous.actual.missingQuestionsRu) === JSON.stringify(next.actual.missingQuestionsRu) ? "" : "missing_question_changed",
    JSON.stringify(previous.actual.boqFamilies.sort()) === JSON.stringify(next.actual.boqFamilies.sort()) ? "" : "boq_row_family_changed",
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
