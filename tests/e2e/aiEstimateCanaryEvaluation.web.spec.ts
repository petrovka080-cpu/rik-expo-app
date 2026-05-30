import { expect, test } from "playwright/test";

import {
  writeCanaryEvaluationDecisionPolicyArtifacts,
  writeCanaryEvaluationEvidenceArtifacts,
  writeCanaryEvaluationFeedbackEvaluation,
  writeCanaryEvaluationManualEstimatorReviewSample,
  writeCanaryEvaluationRealUsageEvaluation,
  writeCanaryEvaluationRolloutDecision,
  writeCanaryEvaluationWebArtifacts,
  writeLimitedPublicBetaPlanArtifacts,
  runCanaryEvaluationRollbackRedrill,
  writeCanaryEvaluationPrerequisiteLedger,
  writeCanaryEvaluationEvidenceLedgerAudit,
} from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test.describe("AI estimate canary evaluation", () => {
  test("keeps public rollout disabled while evaluating internal canary evidence", () => {
    const policy = writeCanaryEvaluationDecisionPolicyArtifacts();
    writeCanaryEvaluationEvidenceArtifacts();
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
    const web = writeCanaryEvaluationWebArtifacts();

    expect(policy.production_rollout_enabled).toBe(false);
    expect(policy.public_canary_enabled).toBe(false);
    expect(policy.public_rollout_authorized).toBe(false);
    expect(decision.decision).toBe("GO_LIMITED_PUBLIC_BETA");
    expect(limitedPublicBetaPlan.public_beta_enabled).toBe(false);
    expect(web.web_live_app_tested).toBe(true);
    expect(web.web_flows_passed).toBe(true);
  });
});
