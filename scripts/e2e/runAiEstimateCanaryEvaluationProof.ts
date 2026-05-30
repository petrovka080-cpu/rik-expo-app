import {
  buildCanaryEvaluationProofMatrix,
  runCanaryEvaluationRollbackRedrill,
  writeCanaryEvaluationDecisionPolicyArtifacts,
  writeCanaryEvaluationEvidenceLedgerAudit,
  writeCanaryEvaluationEvidenceArtifacts,
  writeCanaryEvaluationFeedbackEvaluation,
  writeCanaryEvaluationJson,
  writeCanaryEvaluationManualEstimatorReviewSample,
  writeCanaryEvaluationPrerequisiteLedger,
  writeCanaryEvaluationRealUsageEvaluation,
  writeCanaryEvaluationRolloutDecision,
  writeCanaryEvaluationText,
  writeCanaryEvaluationWebArtifacts,
  writeLimitedPublicBetaPlanArtifacts,
} from "./aiEstimateCanaryEvaluationCore";
import { runAndroidApi34AiEstimateCanaryEvaluationSmoke } from "./runAndroidApi34AiEstimateCanaryEvaluationSmoke";

export function runAiEstimateCanaryEvaluationProof() {
  const prerequisiteLedger = writeCanaryEvaluationPrerequisiteLedger();
  const evidenceLedger = writeCanaryEvaluationEvidenceLedgerAudit();
  const realUsage = writeCanaryEvaluationRealUsageEvaluation();
  const feedback = writeCanaryEvaluationFeedbackEvaluation();
  const manualReview = writeCanaryEvaluationManualEstimatorReviewSample();
  const limitedPublicBetaPlan = writeLimitedPublicBetaPlanArtifacts();
  const rollbackRedrill = runCanaryEvaluationRollbackRedrill();
  const rolloutDecision = writeCanaryEvaluationRolloutDecision({
    prerequisiteLedger,
    evidenceLedger,
    realUsage,
    feedback,
    manualReview,
    limitedPublicBetaPlan,
    rollbackRedrill,
  });
  writeCanaryEvaluationDecisionPolicyArtifacts();
  writeCanaryEvaluationEvidenceArtifacts();
  const web = writeCanaryEvaluationWebArtifacts();
  const android = runAndroidApi34AiEstimateCanaryEvaluationSmoke().matrix;
  const proof = buildCanaryEvaluationProofMatrix({
    prerequisiteLedger,
    evidenceLedger,
    realUsage,
    feedback,
    manualReview,
    rolloutDecision,
    limitedPublicBetaPlan,
    rollbackRedrill,
    web,
    android,
  });

  writeCanaryEvaluationJson("failures.json", proof.failures);
  writeCanaryEvaluationJson("matrix.json", proof.matrix);
  writeCanaryEvaluationText(
    "proof.md",
    [
      "# AI Estimate Canary Evaluation And Rollout Decision",
      "",
      `Status: ${proof.matrix.final_status}`,
      `Decision: ${proof.matrix.decision}`,
      `All prerequisites green: ${String(proof.matrix.all_prerequisites_green)}`,
      `Production rollout enabled: ${String(proof.matrix.production_rollout_enabled)}`,
      `Public beta enabled: ${String(proof.matrix.public_beta_enabled)}`,
      `Limited public beta ready: ${String(proof.matrix.limited_public_beta_ready)}`,
      `Evidence ledger passed: ${String(proof.matrix.evidence_ledger_passed)}`,
      `Real usage evaluation passed: ${String(proof.matrix.real_usage_evaluation_passed)}`,
      `Feedback evaluation passed: ${String(proof.matrix.feedback_evaluation_passed)}`,
      `Manual estimator review passed: ${String(proof.matrix.manual_estimator_review_passed)}`,
      `Rollback redrill passed: ${String(proof.matrix.rollback_redrill_passed)}`,
      `Android API34: ${String(proof.matrix.android_api34_tested)}`,
      `Fake green claimed: ${String(proof.matrix.fake_green_claimed)}`,
      "",
      "Failures:",
      ...(proof.failures.length > 0 ? proof.failures.map((failure) => `- ${failure.classification}: ${failure.reason}`) : ["- none"]),
      "",
    ].join("\n"),
  );

  if (proof.failures.length > 0) {
    throw new Error(`${proof.matrix.final_status}:${proof.failures.map((failure) => failure.classification).join(";")}`);
  }
  return proof;
}

if (require.main === module) {
  runAiEstimateCanaryEvaluationProof();
}
