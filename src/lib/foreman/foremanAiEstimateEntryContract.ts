export type ForemanAiEstimateEntryPoint =
  | "foreman_materials_block"
  | "foreman_subcontracts_block";

export type ForemanAiEstimateMode =
  | "materials_procurement_focus"
  | "subcontract_work_package_focus";

export type ForemanAiEstimateSourceBlockTestId =
  | "foreman-main-materials-open"
  | "foreman-main-subcontracts-open";

export type ForemanAiEstimateButtonTestId =
  | "foreman-materials-estimate-open"
  | "foreman-subcontracts-estimate-open";

export type ForemanAiEstimateEntry = {
  entryPoint: ForemanAiEstimateEntryPoint;
  mode: ForemanAiEstimateMode;
  sourceRoute: "/office/foreman";
  sourceBlockTestId: ForemanAiEstimateSourceBlockTestId;
  estimateButtonTestId: ForemanAiEstimateButtonTestId;
  usesSharedAiEstimateEngine: true;
  usesGlobalEstimatePipeline: true;
  usesProfessionalBoqSnapshot: true;
  forbiddenLegacyPickerVisible: false;
  forbiddenGenericDraftVisible: false;
  requiresUserConfirmationBeforeSubmit: true;
};
