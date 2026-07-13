import type {
  AiEstimateBuyerPackageInput,
  AiEstimateBuyerPackageResult,
  AiEstimateApproveRevisionInput,
  AiEstimateApproveRevisionResult,
  AiEstimateClassifyWorkInput,
  AiEstimateClassifyWorkResult,
  AiEstimateCreateDraftInput,
  AiEstimateDraftResult,
  AiEstimateLoadApprovedHistoryInput,
  AiEstimateLoadApprovedHistoryResult,
  AiEstimateMissingInputAnswerInput,
  AiEstimateMissingInputAnswerResult,
  AiEstimateParameterBatchOverrideInput,
  AiEstimateParameterOverrideInput,
  AiEstimateParameterPassportInput,
  AiEstimateParameterPassportResult,
  AiEstimatePdfSnapshotInput,
  AiEstimatePdfSnapshotResult,
  AiEstimateRebuildInput,
  AiEstimateRevisionResult,
  AiEstimateRuntimeValidationInput,
  AiEstimateRuntimeValidationResult,
} from "./AiEstimateRuntimeContract";

export type AiEstimateRuntime = {
  createDraft(input: AiEstimateCreateDraftInput): AiEstimateDraftResult;
  classifyWork(input: AiEstimateClassifyWorkInput): AiEstimateClassifyWorkResult;
  buildParameterPassport(input: AiEstimateParameterPassportInput): AiEstimateParameterPassportResult;
  applyParameterOverride(input: AiEstimateParameterOverrideInput): AiEstimateRevisionResult;
  applyParameterBatchOverride(input: AiEstimateParameterBatchOverrideInput): AiEstimateRevisionResult;
  answerMissingInput(input: AiEstimateMissingInputAnswerInput): AiEstimateMissingInputAnswerResult;
  approveRevision(input: AiEstimateApproveRevisionInput): AiEstimateApproveRevisionResult;
  rebuildFromRevision(input: AiEstimateRebuildInput): AiEstimateRevisionResult;
  buildPdfSnapshot(input: AiEstimatePdfSnapshotInput): AiEstimatePdfSnapshotResult;
  buildBuyerPackage(input: AiEstimateBuyerPackageInput): AiEstimateBuyerPackageResult;
  loadApprovedHistory(input: AiEstimateLoadApprovedHistoryInput): AiEstimateLoadApprovedHistoryResult;
  validate(input: AiEstimateRuntimeValidationInput): AiEstimateRuntimeValidationResult;
};

export type {
  AiEstimateBuyerPackageInput,
  AiEstimateBuyerPackageResult,
  AiEstimateApproveRevisionInput,
  AiEstimateApproveRevisionResult,
  AiEstimateClassifyWorkInput,
  AiEstimateClassifyWorkResult,
  AiEstimateCreateDraftInput,
  AiEstimateDraftResult,
  AiEstimateLoadApprovedHistoryInput,
  AiEstimateLoadApprovedHistoryResult,
  AiEstimateMissingInputAnswerInput,
  AiEstimateMissingInputAnswerResult,
  AiEstimateParameterBatchOverrideInput,
  AiEstimateParameterOverrideInput,
  AiEstimateParameterPassportInput,
  AiEstimateParameterPassportResult,
  AiEstimatePdfSnapshotInput,
  AiEstimatePdfSnapshotResult,
  AiEstimateRebuildInput,
  AiEstimateRevisionResult,
  AiEstimateRuntimeValidationInput,
  AiEstimateRuntimeValidationResult,
};
