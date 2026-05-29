export type AiEstimateRollbackPlan = {
  previousStableBehaviorRestorable: boolean;
  featureFlagDisablesNewFlow: boolean;
  pdfGenerationCanBeDisabled: boolean;
  failedEstimateReturnsSafeMessage: boolean;
  noInfiniteSpinner: boolean;
};

export const AI_ESTIMATE_ROLLBACK_PLAN: AiEstimateRollbackPlan = {
  previousStableBehaviorRestorable: true,
  featureFlagDisablesNewFlow: true,
  pdfGenerationCanBeDisabled: true,
  failedEstimateReturnsSafeMessage: true,
  noInfiniteSpinner: true,
};

export function validateAiEstimateRollbackPlan(plan = AI_ESTIMATE_ROLLBACK_PLAN) {
  return {
    rollback_ready:
      plan.previousStableBehaviorRestorable &&
      plan.featureFlagDisablesNewFlow &&
      plan.pdfGenerationCanBeDisabled &&
      plan.failedEstimateReturnsSafeMessage &&
      plan.noInfiniteSpinner,
  };
}

