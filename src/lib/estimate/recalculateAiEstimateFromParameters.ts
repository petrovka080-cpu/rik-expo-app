import { applyAiEstimateParameterOverride } from "./applyAiEstimateParameterOverrides";
import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";
import type { UserParamPatchOperation } from "./validateUserParamPatch";

export type RecalculateAiEstimateFromParametersInput = {
  revision: EstimateDraftRevision;
  params: Record<string, string | number | boolean>;
  createdAt?: string;
  revisionIndex?: number;
};

export function recalculateAiEstimateFromParameters(input: RecalculateAiEstimateFromParametersInput) {
  let current = input.revision;
  let latest = null as ReturnType<typeof applyAiEstimateParameterOverride> | null;
  let index = input.revisionIndex;
  for (const [paramKey, value] of Object.entries(input.params)) {
    const operation: UserParamPatchOperation = current.params[paramKey] ? "update_param" : "add_param";
    latest = applyAiEstimateParameterOverride({
      revision: current,
      operation,
      paramKey,
      rawValue: String(value),
      createdAt: input.createdAt,
      revisionIndex: index,
    });
    current = latest.revision;
    index = index == null ? undefined : index + 1;
  }
  if (!latest) throw new Error("AI_ESTIMATE_RECALC_PARAMS_EMPTY");
  return latest;
}
