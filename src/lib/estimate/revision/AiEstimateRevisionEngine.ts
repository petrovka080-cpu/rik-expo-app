import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionState,
} from "../estimateDraftRevisionContract";
import type { UserParamPatch } from "../validateUserParamPatch";

export type AiEstimateRevisionEngine = {
  createRevision(input: {
    rawInput: string;
    selectedTemplateId?: string | null;
    selectedTemplateName?: string | null;
    estimateDraftId?: string;
    createdAt?: string;
  }): EstimateDraftRevision;
  applyPatch(input: {
    revision: EstimateDraftRevision;
    patch: UserParamPatch;
    createdAt?: string;
    revisionIndex?: number;
  }): { revision: EstimateDraftRevision; diff: EstimateDraftRevisionDiff };
  compare(previous: EstimateDraftRevision, next: EstimateDraftRevision): EstimateDraftRevisionDiff;
  validateChain(state: EstimateDraftRevisionState): AiEstimateRevisionChainValidation;
};

export type AiEstimateRevisionChainValidation = {
  ok: boolean;
  revisionChainPreserved: boolean;
  approvedHistoryUsesRevisionIds: boolean;
  blockingReasons: string[];
};
