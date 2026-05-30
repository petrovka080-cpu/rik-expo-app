import { writeCanaryEvaluationRealUsageEvaluation } from "../e2e/aiEstimateCanaryEvaluationCore";

export function runAiEstimateRealUsageEvaluation() {
  const evaluation = writeCanaryEvaluationRealUsageEvaluation();
  if (!evaluation.passed) {
    throw new Error(`NO_GO_ERROR_BUDGET_EXCEEDED:${evaluation.issues.join(";")}`);
  }
  return evaluation;
}

if (require.main === module) {
  runAiEstimateRealUsageEvaluation();
}
