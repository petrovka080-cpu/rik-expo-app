import { buildProfessionalWorkPassport } from "./buildProfessionalWorkPassport";
import { applyUserParamPatch, type ApplyUserParamPatchResult } from "./applyUserParamPatch";
import { createEstimateDraftRevision } from "./createEstimateDraftRevision";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionParam,
  EstimateDraftRevisionSource,
  EstimateDraftRevisionState,
} from "./estimateDraftRevisionContract";
import { compareEstimateDraftRevisions } from "./compareEstimateDraftRevisions";
import type { UserParamPatch } from "./validateUserParamPatch";
import { aiEstimateRuPromptPhraseForParameter } from "./aiEstimateRuParameterDictionary";

export type RecalculateEstimateDraftRevisionResult = {
  revision: EstimateDraftRevision;
  diff: EstimateDraftRevisionDiff;
};

function sourceForPatch(patch: UserParamPatch): EstimateDraftRevisionSource {
  if (patch.operation === "add_param") return "param_add";
  if (patch.operation === "replace_assumption") return "assumption_override";
  return "param_edit";
}

function valueToPromptToken(key: string, param: EstimateDraftRevisionParam): string {
  const value = String(param.value);
  const unit = param.canonicalUnit;
  if (key === "q") return `объем работ ${value}${unit ? ` ${unit}` : ""}`;
  if (key === "area_m2") return `площадь ${value} м2`;
  if (key === "length_m") return `длина ${value} м`;
  if (key === "line_length_m") return `длина линии ${value} м`;
  if (key === "width_m") return `ширина ${value} м`;
  if (key === "height_m") return `высота ${value} м`;
  if (key === "ceiling_height_m") return `высота потолка ${value} м`;
  if (key === "thickness_m") return `толщина ${value} м`;
  if (key === "depth_mm") return `глубина ${value} мм`;
  if (key === "trench_width_m") return `ширина траншеи ${value} м`;
  if (key === "trench_depth_m") return `глубина траншеи ${value} м`;
  if (key === "insulation_thickness_mm" || key === "insulation_mm") return `толщина утеплителя ${value} мм`;
  if (key === "diameter_mm") return `диаметр ${value} мм`;
  if (key === "volume_m3") return `объем ${value} м3`;
  if (key === "count") return `количество ${value} шт`;
  if (key === "bathrooms_count") return `${value} санузла`;
  if (key === "doors_count") return `${value} двери`;
  if (key === "electrical_points") return `${value} электроточек`;
  if (key === "water_points") return `${value} водоточек`;
  if (key === "sewer_points") return `${value} точек канализации`;
  if (key === "roof_windows_count") return `${value} мансардных окон`;
  if (key === "voltage_kv") return `${value} кВ`;
  if (key === "power_mw") return `${value} МВт`;
  if (key === "power_kw") return `${value} кВт`;
  if (key === "cable_section") return String(param.value);
  if (key === "package_mode" && param.value === "turnkey") return "под ключ";
  const phrase = aiEstimateRuPromptPhraseForParameter(key);
  return unit ? `${phrase} ${value} ${unit}` : `${phrase} ${value}`;
}

export function buildPromptForEstimateDraftRevisionRecalc(
  revision: EstimateDraftRevision,
  params: Record<string, EstimateDraftRevisionParam>,
): string {
  const passport = buildProfessionalWorkPassport(revision.selectedTemplateId);
  const templateLabel = (passport?.localizedNameRu || revision.matchedFamily || revision.selectedTemplateId).replace(/_/g, " ");
  const hasSpecificAreaParam = Object.keys(params).some((key) => key !== "area_m2" && /_area_m2$/.test(key));
  const paramText = Object.entries(params)
    .filter(([key]) => key !== "estimate_level" && key !== "prices")
    .filter(([key, param]) => !(key === "area_m2" && hasSpecificAreaParam && param.source !== "edited_by_user"))
    .filter(([, param]) => param.source !== "derived")
    .map(([key, param]) => valueToPromptToken(key, param))
    .join(" ");
  return [templateLabel, paramText].filter(Boolean).join(" ").trim();
}

export function recalculateEstimateDraftRevision(
  previous: EstimateDraftRevision,
  patch: UserParamPatch,
  input: {
    createdAt?: string;
    city?: string | null;
    currency?: string | null;
    countryCode?: string | null;
    revisionIndex?: number;
  } = {},
): RecalculateEstimateDraftRevisionResult {
  const changedAt = input.createdAt ?? new Date().toISOString();
  const patched = applyUserParamPatch(previous, patch, changedAt);
  const rawInput = buildPromptForEstimateDraftRevisionRecalc(previous, patched.params);
  const passport = buildProfessionalWorkPassport(previous.selectedTemplateId);
  const paramOverrides = previous.roadScopeBinding
    ? {
      ...patched.params,
      selectedRoadScope: {
        value: previous.roadScopeBinding.selectedRoadScope,
        source: "edited_by_user" as const,
        lastChangedAt: changedAt,
      },
    }
    : patched.params;
  const revision = createEstimateDraftRevision({
    estimateDraftId: previous.estimateDraftId,
    previousRevisionId: previous.revisionId,
    rawInput,
    selectedTemplateId: previous.selectedTemplateId,
    selectedTemplateName: passport?.localizedNameRu ?? previous.selectedTemplateId,
    city: input.city,
    currency: input.currency,
    countryCode: input.countryCode,
    source: sourceForPatch(patch),
    createdAt: changedAt,
    revisionIndex: input.revisionIndex,
    paramOverrides,
    assumptionOverrides: patched.assumptions,
    changedParamKey: patch.paramKey,
    artifacts: {
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
    },
  });
  return {
    revision: {
      ...revision,
      missingInputs: patched.missingInputs.length > 0 ? patched.missingInputs : revision.missingInputs,
    },
    diff: compareEstimateDraftRevisions(previous, revision),
  };
}

function applyUserParamPatches(
  previous: EstimateDraftRevision,
  patches: readonly UserParamPatch[],
  changedAt: string,
): ApplyUserParamPatchResult {
  let working: EstimateDraftRevision = {
    ...previous,
    params: { ...previous.params },
    assumptions: previous.assumptions.map((assumption) => ({ ...assumption })),
    missingInputs: previous.missingInputs.map((input) => ({ ...input })),
  };
  let result: ApplyUserParamPatchResult = {
    params: working.params,
    assumptions: working.assumptions,
    missingInputs: working.missingInputs,
    selectedTemplateId: working.selectedTemplateId,
  };

  for (const patch of patches) {
    result = applyUserParamPatch(working, patch, changedAt);
    working = {
      ...working,
      params: result.params,
      assumptions: result.assumptions,
      missingInputs: result.missingInputs,
    };
  }

  return result;
}

export function recalculateEstimateDraftRevisionBatch(
  previous: EstimateDraftRevision,
  patches: readonly UserParamPatch[],
  input: {
    createdAt?: string;
    city?: string | null;
    currency?: string | null;
    countryCode?: string | null;
    revisionIndex?: number;
  } = {},
): RecalculateEstimateDraftRevisionResult {
  if (patches.length === 0) {
    throw new Error("USER_PARAM_BATCH_EMPTY");
  }

  const changedAt = input.createdAt ?? new Date().toISOString();
  const patched = applyUserParamPatches(previous, patches, changedAt);
  const rawInput = buildPromptForEstimateDraftRevisionRecalc(previous, patched.params);
  const passport = buildProfessionalWorkPassport(previous.selectedTemplateId);
  const source = patches.length === 1 ? sourceForPatch(patches[0]) : "param_batch";
  const paramOverrides = previous.roadScopeBinding
    ? {
      ...patched.params,
      selectedRoadScope: {
        value: previous.roadScopeBinding.selectedRoadScope,
        source: "edited_by_user" as const,
        lastChangedAt: changedAt,
      },
    }
    : patched.params;
  const revision = createEstimateDraftRevision({
    estimateDraftId: previous.estimateDraftId,
    previousRevisionId: previous.revisionId,
    rawInput,
    selectedTemplateId: previous.selectedTemplateId,
    selectedTemplateName: passport?.localizedNameRu ?? previous.selectedTemplateId,
    city: input.city,
    currency: input.currency,
    countryCode: input.countryCode,
    source,
    createdAt: changedAt,
    revisionIndex: input.revisionIndex,
    paramOverrides,
    assumptionOverrides: patched.assumptions,
    changedParamKey: patches.length === 1 ? patches[0].paramKey : null,
    artifacts: {
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
    },
  });
  const nextRevision = {
    ...revision,
    missingInputs: patched.missingInputs.length > 0 ? patched.missingInputs : revision.missingInputs,
  };
  return {
    revision: nextRevision,
    diff: compareEstimateDraftRevisions(previous, nextRevision),
  };
}

export function appendRecalculatedEstimateDraftRevision(
  state: EstimateDraftRevisionState,
  patch: UserParamPatch,
  input: Parameters<typeof recalculateEstimateDraftRevision>[2] = {},
): EstimateDraftRevisionState {
  const current = state.revisions.find((revision) => revision.revisionId === state.currentRevisionId);
  if (!current) throw new Error(`ESTIMATE_DRAFT_REVISION_CURRENT_MISSING:${state.currentRevisionId}`);
  const result = recalculateEstimateDraftRevision(current, patch, {
    ...input,
    revisionIndex: input.revisionIndex ?? state.revisions.length + 1,
  });
  return {
    estimateDraftId: state.estimateDraftId,
    currentRevisionId: result.revision.revisionId,
    revisions: [...state.revisions, result.revision],
    diffs: [...state.diffs, result.diff],
  };
}
