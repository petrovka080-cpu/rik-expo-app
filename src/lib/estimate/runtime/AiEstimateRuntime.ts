import type {
  AiEstimateBuyerPackageInput,
  AiEstimateBuyerPackageResult,
  AiEstimateCreateDraftInput,
  AiEstimateDraftResult,
  AiEstimateParameterOverrideInput,
  AiEstimatePdfSnapshotInput,
  AiEstimatePdfSnapshotResult,
  AiEstimateRebuildInput,
  AiEstimateRevisionResult,
  AiEstimateRuntimeValidationInput,
  AiEstimateRuntimeValidationResult,
} from "./AiEstimateRuntimeContract";

export type AiEstimateRuntime = {
  createDraft(input: AiEstimateCreateDraftInput): AiEstimateDraftResult;
  applyParameterOverride(input: AiEstimateParameterOverrideInput): AiEstimateRevisionResult;
  rebuildFromRevision(input: AiEstimateRebuildInput): AiEstimateRevisionResult;
  buildPdfSnapshot(input: AiEstimatePdfSnapshotInput): AiEstimatePdfSnapshotResult;
  buildBuyerPackage(input: AiEstimateBuyerPackageInput): AiEstimateBuyerPackageResult;
  validate(input: AiEstimateRuntimeValidationInput): AiEstimateRuntimeValidationResult;
};

export type {
  AiEstimateBuyerPackageInput,
  AiEstimateBuyerPackageResult,
  AiEstimateCreateDraftInput,
  AiEstimateDraftResult,
  AiEstimateParameterOverrideInput,
  AiEstimatePdfSnapshotInput,
  AiEstimatePdfSnapshotResult,
  AiEstimateRebuildInput,
  AiEstimateRevisionResult,
  AiEstimateRuntimeValidationInput,
  AiEstimateRuntimeValidationResult,
};
