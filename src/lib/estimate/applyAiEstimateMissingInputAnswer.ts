import {
  applyAiEstimateParameterOverride,
  type ApplyAiEstimateParameterOverrideResult,
} from "./applyAiEstimateParameterOverrides";
import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";
import type { UserParamPatchOperation } from "./validateUserParamPatch";

export type ApplyAiEstimateMissingInputAnswerInput = {
  revision: EstimateDraftRevision;
  paramKey: string;
  rawValue: string;
  createdAt?: string;
  city?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  revisionIndex?: number;
};

export type ApplyAiEstimateMissingInputAnswerResult = ApplyAiEstimateParameterOverrideResult & {
  answeredParamKey: string;
};

export function applyAiEstimateMissingInputAnswer(
  input: ApplyAiEstimateMissingInputAnswerInput,
): ApplyAiEstimateMissingInputAnswerResult {
  const operation: UserParamPatchOperation = input.revision.params[input.paramKey] ? "update_param" : "add_param";
  const result = applyAiEstimateParameterOverride({
    revision: input.revision,
    operation,
    paramKey: input.paramKey,
    rawValue: input.rawValue,
    createdAt: input.createdAt,
    city: input.city,
    currency: input.currency,
    countryCode: input.countryCode,
    revisionIndex: input.revisionIndex,
  });
  return {
    ...result,
    answeredParamKey: input.paramKey,
  };
}
