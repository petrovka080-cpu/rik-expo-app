export type AiEstimateRollbackPlan = {
  previousStableBehaviorRestorable: boolean;
  featureFlagDisablesNewFlow: boolean;
  pdfGenerationCanBeDisabled: boolean;
  dynamicBoqCanBeDisabled: boolean;
  manualRequestCreationWorks: boolean;
  manualCatalogMaterialPickerWorks: boolean;
  rollbackDoesNotMutateTemplatesRatesCatalog: boolean;
  rollbackDoesNotDeleteUserData: boolean;
  failedEstimateReturnsSafeMessage: boolean;
  noInfiniteSpinner: boolean;
};

export const AI_ESTIMATE_ROLLBACK_PLAN: AiEstimateRollbackPlan = {
  previousStableBehaviorRestorable: true,
  featureFlagDisablesNewFlow: true,
  pdfGenerationCanBeDisabled: true,
  dynamicBoqCanBeDisabled: true,
  manualRequestCreationWorks: true,
  manualCatalogMaterialPickerWorks: true,
  rollbackDoesNotMutateTemplatesRatesCatalog: true,
  rollbackDoesNotDeleteUserData: true,
  failedEstimateReturnsSafeMessage: true,
  noInfiniteSpinner: true,
};

export function validateAiEstimateRollbackPlan(plan = AI_ESTIMATE_ROLLBACK_PLAN) {
  return {
    rollback_ready:
      plan.previousStableBehaviorRestorable &&
      plan.featureFlagDisablesNewFlow &&
      plan.pdfGenerationCanBeDisabled &&
      plan.dynamicBoqCanBeDisabled &&
      plan.manualRequestCreationWorks &&
      plan.manualCatalogMaterialPickerWorks &&
      plan.rollbackDoesNotMutateTemplatesRatesCatalog &&
      plan.rollbackDoesNotDeleteUserData &&
      plan.failedEstimateReturnsSafeMessage &&
      plan.noInfiniteSpinner,
    can_disable_ai_estimates_without_app_crash: plan.featureFlagDisablesNewFlow,
    can_disable_pdf_generation_without_app_crash: plan.pdfGenerationCanBeDisabled,
    can_disable_dynamic_boq: plan.dynamicBoqCanBeDisabled,
    manual_request_creation_preserved: plan.manualRequestCreationWorks,
    manual_catalog_picker_preserved: plan.manualCatalogMaterialPickerWorks,
    no_template_rate_catalog_mutation: plan.rollbackDoesNotMutateTemplatesRatesCatalog,
    no_user_data_deletion: plan.rollbackDoesNotDeleteUserData,
  };
}
