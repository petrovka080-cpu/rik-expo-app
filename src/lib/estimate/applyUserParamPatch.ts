import { getParameterSchemaForTemplate } from "./getParameterSchemaForTemplate";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionAssumption,
  EstimateDraftRevisionMissingInput,
  EstimateDraftRevisionParam,
} from "./estimateDraftRevisionContract";
import { assertValidUserParamPatch, type UserParamPatch } from "./validateUserParamPatch";

export type ApplyUserParamPatchResult = {
  params: EstimateDraftRevision["params"];
  assumptions: EstimateDraftRevision["assumptions"];
  missingInputs: EstimateDraftRevision["missingInputs"];
  selectedTemplateId: string;
};

function labelForParam(templateId: string, paramKey: string): string {
  const schema = getParameterSchemaForTemplate(templateId);
  const param = [...(schema?.requiredParams ?? []), ...(schema?.optionalParams ?? [])]
    .find((entry) => entry.key === paramKey);
  return param?.labelRu ?? paramKey;
}

function missingInputForParam(templateId: string, paramKey: string): EstimateDraftRevisionMissingInput {
  const schema = getParameterSchemaForTemplate(templateId);
  const param = [...(schema?.requiredParams ?? []), ...(schema?.optionalParams ?? [])]
    .find((entry) => entry.key === paramKey);
  return {
    key: paramKey,
    label: param?.labelRu ?? paramKey,
    blocksPreliminaryEstimate: false,
    requiredFor: param?.requiredFor ?? "better_accuracy",
  };
}

function assumptionForRemovedParam(
  revision: EstimateDraftRevision,
  paramKey: string,
): EstimateDraftRevisionAssumption {
  return {
    key: paramKey,
    value: revision.params[paramKey]?.value ?? null,
    reason: `${labelForParam(revision.selectedTemplateId, paramKey)} removed by user; preliminary estimate keeps this as visible missing input or assumption until re-entered.`,
    replacedByUserInput: false,
    visibleToUser: true,
  };
}

function paramFromPatch(patch: UserParamPatch, changedAt: string): EstimateDraftRevisionParam {
  return {
    value: patch.parsedValue,
    canonicalUnit: patch.canonicalUnit,
    source: patch.operation === "add_param" || patch.operation === "replace_assumption"
      ? "user_input"
      : "edited_by_user",
    sourceText: patch.rawValue,
    lastChangedAt: changedAt,
  };
}

function dropDerivedQuantitiesInvalidatedByPatch(
  params: EstimateDraftRevision["params"],
  patch: UserParamPatch,
): void {
  const invalidatesVolume = new Set(["length_m", "height_m", "thickness_m", "width_m", "depth_mm"]);
  if (!invalidatesVolume.has(patch.paramKey)) return;
  if (params.volume_m3?.source === "derived" || params.volume_m3?.sourceText?.includes("*")) {
    delete params.volume_m3;
  }
}

export function applyUserParamPatch(
  revision: EstimateDraftRevision,
  patch: UserParamPatch,
  changedAt = new Date().toISOString(),
): ApplyUserParamPatchResult {
  assertValidUserParamPatch(revision, patch);
  const params = { ...revision.params };
  let assumptions = revision.assumptions.map((assumption) => ({ ...assumption }));
  let missingInputs = revision.missingInputs.filter((input) => input.key !== patch.paramKey);

  if (patch.operation === "remove_param") {
    delete params[patch.paramKey];
    assumptions = [
      ...assumptions.filter((assumption) => assumption.key !== patch.paramKey),
      assumptionForRemovedParam(revision, patch.paramKey),
    ];
    missingInputs = [
      ...missingInputs,
      missingInputForParam(revision.selectedTemplateId, patch.paramKey),
    ];
    return {
      params,
      assumptions,
      missingInputs,
      selectedTemplateId: revision.selectedTemplateId,
    };
  }

  params[patch.paramKey] = paramFromPatch(patch, changedAt);
  dropDerivedQuantitiesInvalidatedByPatch(params, patch);
  assumptions = assumptions.map((assumption) =>
    assumption.key === patch.paramKey
      ? { ...assumption, replacedByUserInput: true }
      : assumption
  );

  if (patch.operation === "replace_assumption" && !assumptions.some((assumption) => assumption.key === patch.paramKey)) {
    assumptions.push({
      key: patch.paramKey,
      value: patch.parsedValue,
      reason: `${labelForParam(revision.selectedTemplateId, patch.paramKey)} replaced by user input.`,
      replacedByUserInput: true,
      visibleToUser: true,
    });
  }

  return {
    params,
    assumptions,
    missingInputs,
    selectedTemplateId: revision.selectedTemplateId,
  };
}
