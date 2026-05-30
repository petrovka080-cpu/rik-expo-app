import { writeCanaryEvaluationFeedbackEvaluation } from "../e2e/aiEstimateCanaryEvaluationCore";

export function runAiEstimateCanaryFeedbackEvaluation() {
  const evaluation = writeCanaryEvaluationFeedbackEvaluation();
  if (!evaluation.passed) {
    throw new Error(`${evaluation.recommended_action}:${evaluation.issues.join(";")}`);
  }
  return evaluation;
}

if (require.main === module) {
  runAiEstimateCanaryFeedbackEvaluation();
}
