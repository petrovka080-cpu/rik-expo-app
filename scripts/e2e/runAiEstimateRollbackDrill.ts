import { runInternalCanaryRollbackDrill } from "./aiEstimateInternalCanaryCore";

export function runAiEstimateRollbackDrill() {
  const drill = runInternalCanaryRollbackDrill();
  if (!drill.rollback_drill_passed) {
    throw new Error("NO_GO_ROLLBACK_FAILED");
  }
  return drill;
}

if (require.main === module) {
  runAiEstimateRollbackDrill();
}
