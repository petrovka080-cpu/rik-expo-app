import type { DraftRevisionSnapshot } from "../../../features/estimates/createSnapshotFromDraftRevision";
import type { DraftRevisionPdfArtifact } from "../../../features/pdf/renderPdfFromDraftRevision";
import type { DraftRevisionBuyerHandoff } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import type { EstimateDraftRevision, EstimateDraftRevisionDiff } from "../estimateDraftRevisionContract";
import type { UserParamPatchOperation } from "../validateUserParamPatch";

export type AiEstimateCreateDraftInput = {
  estimateDraftId?: string;
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedTemplateName?: string | null;
  selectedWorkKey?: string | null;
  city?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  createdAt?: string;
};

export type AiEstimateDraftResult = {
  revision: EstimateDraftRevision;
};

export type AiEstimateParameterOverrideInput = {
  revision: EstimateDraftRevision;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  createdAt?: string;
  revisionIndex?: number;
};

export type AiEstimateRevisionResult = {
  revision: EstimateDraftRevision;
  diff: EstimateDraftRevisionDiff;
  pdfBuyerPackageStale: true;
};

export type AiEstimateRebuildInput = {
  revision: EstimateDraftRevision;
  createdAt?: string;
  revisionIndex?: number;
};

export type AiEstimatePdfSnapshotInput = {
  revision: EstimateDraftRevision;
};

export type AiEstimatePdfSnapshotResult = {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
  pdf: DraftRevisionPdfArtifact;
};

export type AiEstimateBuyerPackageInput = {
  revision: EstimateDraftRevision;
  snapshot?: DraftRevisionSnapshot;
};

export type AiEstimateBuyerPackageResult = {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
  buyerPackage: DraftRevisionBuyerHandoff;
};

export type AiEstimateRuntimeValidationInput = {
  revision?: EstimateDraftRevision | null;
};

export type AiEstimateRuntimeValidationResult = {
  ok: boolean;
  runtimeFacadeCreated: true;
  parameterGraphCreated: boolean;
  formulaDagCreated: boolean;
  blockingReasons: string[];
};
