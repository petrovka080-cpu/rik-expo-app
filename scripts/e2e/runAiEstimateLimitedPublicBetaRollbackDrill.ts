import { runLimitedPublicBetaRollbackDrill } from "./aiEstimateLimitedPublicBetaExecutionCore";

export function runAiEstimateLimitedPublicBetaRollbackDrill() {
  const drill = runLimitedPublicBetaRollbackDrill();
  if (!drill.rollback_drill_passed) {
    throw new Error("NO_GO_ROLLBACK_FAILED");
  }
  return drill;
}

if (require.main === module) {
  runAiEstimateLimitedPublicBetaRollbackDrill();
}
