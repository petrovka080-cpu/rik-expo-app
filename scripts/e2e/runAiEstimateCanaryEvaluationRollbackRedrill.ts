import { runCanaryEvaluationRollbackRedrill } from "./aiEstimateCanaryEvaluationCore";

export function runAiEstimateCanaryEvaluationRollbackRedrill() {
  const result = runCanaryEvaluationRollbackRedrill();
  if (!result.rollback_redrill_passed) {
    throw new Error("NO_GO_ROLLBACK_AND_FIX");
  }
  return result;
}

if (require.main === module) {
  runAiEstimateCanaryEvaluationRollbackRedrill();
}
