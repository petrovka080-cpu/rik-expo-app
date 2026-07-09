import type { DraftRevisionSnapshot } from "../../../features/estimates/createSnapshotFromDraftRevision";
import type { DraftRevisionPdfArtifact } from "../../../features/pdf/renderPdfFromDraftRevision";
import type { DraftRevisionBuyerHandoff } from "../../../features/procurement/createBuyerHandoffFromDraftRevision";
import type { AiEstimateParameterCard } from "../buildAiEstimateParameterCards";
import type { EstimateDraftRevision, EstimateDraftRevisionDiff } from "../estimateDraftRevisionContract";
import type { AiEstimateLedgerHistoryRecord } from "../ledger/AiEstimateLedgerTypes";
import type { AiEstimateWorkClassification } from "../semantic/AiEstimateWorkClassifier";
import type { AiEstimateNormativeWorkParameterPassport } from "../aiEstimateNormativeWorkParameterPassport";
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

export type AiEstimateClassifyWorkInput = {
  rawInput: string;
  selectedTemplateId?: string | null;
};

export type AiEstimateClassifyWorkResult = {
  classification: AiEstimateWorkClassification;
};

export type AiEstimateParameterPassportInput = {
  revision: EstimateDraftRevision;
};

export type AiEstimateParameterPassportResult = {
  revisionId: string;
  templateId: string;
  passport: AiEstimateNormativeWorkParameterPassport | null;
  cards: AiEstimateParameterCard[];
  missingInputs: EstimateDraftRevision["missingInputs"];
  completeness: {
    presentParameterCount: number;
    missingParameterCount: number;
    requiredForQuantityMissingCount: number;
    requiredForProfessionalAccuracyMissingCount: number;
  };
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

export type AiEstimateMissingInputAnswerInput = {
  revision: EstimateDraftRevision;
  paramKey: string;
  rawValue: string;
  createdAt?: string;
  city?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  revisionIndex?: number;
};

export type AiEstimateMissingInputAnswerResult = AiEstimateRevisionResult & {
  answeredParamKey: string;
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

export type AiEstimateApproveRevisionInput = {
  revision: EstimateDraftRevision;
  ownerUserId: string;
  orgId?: string | null;
  kind?: "consumer_repair" | "request_estimate" | "office_estimate" | "ai_estimate";
  sourceRoute?: string;
  title?: string;
  approvedAt?: string;
  actorUserId?: string | null;
  idempotencyKey?: string;
  snapshotId?: string | null;
  pdfArtifactId?: string | null;
  buyerHandoffId?: string | null;
};

export type AiEstimateApproveRevisionResult = {
  approved: true;
  estimateId: string;
  revisionId: string;
  historyRecord: AiEstimateLedgerHistoryRecord | null;
};

export type AiEstimateLoadApprovedHistoryInput = {
  ownerUserId: string;
  limit?: number;
  cursorCreatedAt?: string | null;
};

export type AiEstimateLoadApprovedHistoryResult = {
  records: AiEstimateLedgerHistoryRecord[];
  nextCursorCreatedAt: string | null;
  totalCount: number;
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
