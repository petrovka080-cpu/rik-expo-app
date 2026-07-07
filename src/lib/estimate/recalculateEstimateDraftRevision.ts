import { buildProfessionalWorkPassport } from "./buildProfessionalWorkPassport";
import { applyUserParamPatch } from "./applyUserParamPatch";
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
  if (key === "area_m2") return `площадь ${value} м2`;
  if (key === "length_m") return `длина ${value} м`;
  if (key === "line_length_m") return `длина линии ${value} м`;
  if (key === "width_m") return `ширина ${value} м`;
  if (key === "height_m") return `высота ${value} м`;
  if (key === "thickness_m") return `толщина ${value} м`;
  if (key === "depth_mm") return `глубина ${value} мм`;
  if (key === "diameter_mm") return `диаметр ${value} мм`;
  if (key === "volume_m3") return `объем ${value} м3`;
  if (key === "count") return `количество ${value} шт`;
  if (key === "voltage_kv") return `${value} кВ`;
  if (key === "power_mw") return `${value} МВт`;
  if (key === "power_kw") return `${value} кВт`;
  if (key === "cable_section") return String(param.value);
  if (key === "package_mode" && param.value === "turnkey") return "под ключ";
  return unit ? `${key} ${value} ${unit}` : `${key} ${value}`;
}

export function buildPromptForEstimateDraftRevisionRecalc(
  revision: EstimateDraftRevision,
  params: Record<string, EstimateDraftRevisionParam>,
): string {
  const passport = buildProfessionalWorkPassport(revision.selectedTemplateId);
  const templateLabel = (passport?.localizedNameRu || revision.matchedFamily || revision.selectedTemplateId).replace(/_/g, " ");
  const paramText = Object.entries(params)
    .filter(([key]) => key !== "estimate_level" && key !== "prices")
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
    paramOverrides: patched.params,
    assumptionOverrides: patched.assumptions,
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
