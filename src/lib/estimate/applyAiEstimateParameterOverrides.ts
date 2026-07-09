import { parseUserParamPatch } from "./parseUserParamPatch";
import {
  recalculateEstimateDraftRevision,
  type RecalculateEstimateDraftRevisionResult,
} from "./recalculateEstimateDraftRevision";
import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";
import type { UserParamPatchOperation } from "./validateUserParamPatch";
import { buildAiEstimateParameterCards, type AiEstimateParameterCard } from "./buildAiEstimateParameterCards";

export type ApplyAiEstimateParameterOverrideInput = {
  revision: EstimateDraftRevision;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  createdAt?: string;
  city?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  revisionIndex?: number;
};

export type ApplyAiEstimateParameterOverrideResult = RecalculateEstimateDraftRevisionResult & {
  cards: AiEstimateParameterCard[];
  pdfBuyerPackageStale: true;
};

export function applyAiEstimateParameterOverride(
  input: ApplyAiEstimateParameterOverrideInput,
): ApplyAiEstimateParameterOverrideResult {
  const patch = parseUserParamPatch({
    revision: input.revision,
    operation: input.operation,
    paramKey: input.paramKey,
    rawValue: input.rawValue,
  });
  const result = recalculateEstimateDraftRevision(input.revision, patch, {
    createdAt: input.createdAt,
    city: input.city,
    currency: input.currency,
    countryCode: input.countryCode,
    revisionIndex: input.revisionIndex,
  });
  return {
    ...result,
    cards: buildAiEstimateParameterCards({ revision: result.revision }),
    pdfBuyerPackageStale: true,
  };
}
