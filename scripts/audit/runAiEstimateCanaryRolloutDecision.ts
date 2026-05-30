import {
  writeCanaryEvaluationEvidenceLedgerAudit,
  writeCanaryEvaluationFeedbackEvaluation,
  writeCanaryEvaluationManualEstimatorReviewSample,
  writeCanaryEvaluationPrerequisiteLedger,
  writeCanaryEvaluationRealUsageEvaluation,
  writeCanaryEvaluationRolloutDecision,
  writeLimitedPublicBetaPlanArtifacts,
  runCanaryEvaluationRollbackRedrill,
} from "../e2e/aiEstimateCanaryEvaluationCore";

export function runAiEstimateCanaryRolloutDecision() {
  const prerequisiteLedger = writeCanaryEvaluationPrerequisiteLedger();
  const evidenceLedger = writeCanaryEvaluationEvidenceLedgerAudit();
  const realUsage = writeCanaryEvaluationRealUsageEvaluation();
  const feedback = writeCanaryEvaluationFeedbackEvaluation();
  const manualReview = writeCanaryEvaluationManualEstimatorReviewSample();
  const limitedPublicBetaPlan = writeLimitedPublicBetaPlanArtifacts();
  const rollbackRedrill = runCanaryEvaluationRollbackRedrill();
  const decision = writeCanaryEvaluationRolloutDecision({
    prerequisiteLedger,
    evidenceLedger,
    realUsage,
    feedback,
    manualReview,
    limitedPublicBetaPlan,
    rollbackRedrill,
  });

  if (!decision.ready) {
    throw new Error(`${decision.decision}:${decision.issues.join(";")}`);
  }
  return decision;
}

if (require.main === module) {
  runAiEstimateCanaryRolloutDecision();
}
