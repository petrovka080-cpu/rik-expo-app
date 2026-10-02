import { buildProfessionalWorkPassport } from "../buildProfessionalWorkPassport";
import { applyUserParamPatch, type ApplyUserParamPatchResult } from "../applyUserParamPatch";
import { createEstimateDraftRevision } from "./canonicalEstimateHistoricalDraftProjection";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionParam,
  EstimateDraftRevisionSource,
  EstimateDraftRevisionState,
} from "../estimateDraftRevisionContract";
import { compareEstimateDraftRevisions } from "../compareEstimateDraftRevisions";
import type { UserParamPatch } from "../validateUserParamPatch";
import { aiEstimateRuPromptPhraseForParameter } from "../aiEstimateRuParameterDictionary";
import { resolvedEstimateIdentityChecksum } from "../resolvedEstimateIdentityChecksum";
import {
  getRoadworksWaveAProductionRegistration,
  type RoadworksWaveAProductionRegistration,
} from "../v4/roadworks";
import { migrateInteriorFinishesProfessionalRevisionV4 } from "../v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRevisionMigrationV4";

export type RecalculateEstimateDraftRevisionResult = {
  revision: EstimateDraftRevision;
  diff: EstimateDraftRevisionDiff;
};

function exactRoadworksWaveARegistration(
  revision: EstimateDraftRevision,
): RoadworksWaveAProductionRegistration | null {
  if (
    revision.boq.rows.length === 0 ||
    !revision.boq.rows.every((row) => row.sourceParameters?.roadworksWaveA === true)
  ) {
    return null;
  }
  return getRoadworksWaveAProductionRegistration(
    revision.resolvedIdentity?.requestedCatalogWorkId ?? revision.matchedFamily,
  );
}

function usesRegisteredProfessionalDomain(revision: EstimateDraftRevision): boolean {
  return revision.boq.rows.length > 0 && revision.boq.rows.every((row) =>
    row.sourceParameters?.professionalDomainFactoryV1 === true &&
    typeof row.sourceParameters?.catalogId === "string" &&
    typeof row.sourceParameters?.workKey === "string",
  );
}

function sourceForPatch(patch: UserParamPatch): EstimateDraftRevisionSource {
  if (patch.operation === "add_param") return "param_add";
  if (patch.operation === "replace_assumption") return "assumption_override";
  return "param_edit";
}

function retargetPatchAfterRevisionMigration(
  original: EstimateDraftRevision,
  migrated: EstimateDraftRevision,
  patch: UserParamPatch,
): UserParamPatch {
  if (
    original === migrated ||
    patch.revisionId !== original.revisionId ||
    patch.selectedTemplateId !== original.selectedTemplateId
  ) {
    return patch;
  }
  return {
    ...patch,
    revisionId: migrated.revisionId,
    selectedTemplateId: migrated.selectedTemplateId,
  };
}

function selectedWorkKeyForRecalculation(
  previous: EstimateDraftRevision,
  exactRoadworks: RoadworksWaveAProductionRegistration | null,
): string | undefined {
  return exactRoadworks?.workId
    ?? previous.resolvedIdentity?.requestedCatalogWorkId?.trim()
    ?? undefined;
}

function preserveResolvedIdentityLineage(
  previous: EstimateDraftRevision,
  recalculated: EstimateDraftRevision,
): EstimateDraftRevision {
  const before = previous.resolvedIdentity;
  const after = recalculated.resolvedIdentity;
  if (
    !before || !after ||
    before.requestedCatalogWorkId !== after.requestedCatalogWorkId ||
    before.canonicalModelId !== after.canonicalModelId
  ) return recalculated;

  const identityWithoutChecksum = {
    ...after,
    requestedCatalogWorkId: before.requestedCatalogWorkId,
    passportId: before.passportId,
    passportVersion: before.passportVersion,
    parameterSchemaId: before.parameterSchemaId,
    parameterSchemaVersion: before.parameterSchemaVersion,
    calculationStrategyId: before.calculationStrategyId,
    calculationProfileId: before.calculationProfileId,
    calculationProfileVersion: before.calculationProfileVersion,
    semanticOwner: before.semanticOwner,
    originalPrompt: before.originalPrompt,
    legacyFallbackUsed: before.legacyFallbackUsed,
    fallbackReason: before.fallbackReason,
    projectionOwner: before.projectionOwner,
  };
  const { checksum: _discardedChecksum, ...identityForChecksum } = identityWithoutChecksum;
  return {
    ...recalculated,
    resolvedIdentity: {
      ...identityForChecksum,
      checksum: resolvedEstimateIdentityChecksum(identityForChecksum),
    },
  };
}

/**
 * Some legacy families expose both the generic editable area and one
 * technology-owned area (for example facade_area_m2 or roof_area_m2). They
 * represent the same measurement when there is exactly one specific area
 * owner. Keep that pair atomic so a revision cannot feed the compiler a new
 * generic value together with a stale technology value.
 */
function synchronizeSingleSemanticAreaAlias(
  params: Record<string, EstimateDraftRevisionParam>,
  changedParamKeys: readonly string[],
): Record<string, EstimateDraftRevisionParam> {
  const specificAreaKeys = Object.keys(params)
    .filter((key) => key !== "area_m2" && /_area_m2$/.test(key));
  if (specificAreaKeys.length !== 1) return params;

  const specificAreaKey = specificAreaKeys[0];
  const changedKeys = new Set(changedParamKeys);
  const genericChanged = changedKeys.has("area_m2");
  const specificChanged = changedKeys.has(specificAreaKey);
  if (genericChanged === specificChanged) return params;

  const sourceKey = genericChanged ? "area_m2" : specificAreaKey;
  const targetKey = genericChanged ? specificAreaKey : "area_m2";
  const sourceParam = params[sourceKey];
  if (!sourceParam || typeof sourceParam.value !== "number" || !Number.isFinite(sourceParam.value)) {
    return params;
  }

  return {
    ...params,
    [targetKey]: { ...sourceParam },
  };
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

const RECALC_PROMPT_PRESERVED_CALCULATOR_INPUT_KEYS = new Set([
  // Some expanded calculators parse labelled dimensions that the generic
  // ingress does not retain as user_input.  Keep those independent geometry
  // facts across a one-field edit.  Other calculator_input_parameter values
  // can be defaults or outputs (wall height/floors/areas, for example) and
  // serialising them would falsely promote assumptions to explicit user text.
  "length_m",
  "width_m",
]);

export function buildPromptForEstimateDraftRevisionRecalc(
  revision: EstimateDraftRevision,
  params: Record<string, EstimateDraftRevisionParam>,
): string {
  const exactRoadworks = exactRoadworksWaveARegistration(revision);
  const passport = exactRoadworks || usesRegisteredProfessionalDomain(revision)
    ? null
    : buildProfessionalWorkPassport(revision.selectedTemplateId);
  const templateLabel = revision.matchedFamily === "drywall_ceiling_preparation"
    ? "подготовка существующего потолка из гипсокартона"
    : (
      exactRoadworks?.professionalNameRu ||
      passport?.localizedNameRu ||
      revision.matchedFamily ||
      revision.selectedTemplateId
    ).replace(/_/g, " ");
  const hasSpecificAreaParam = Object.keys(params).some((key) => key !== "area_m2" && /_area_m2$/.test(key));
  const calculatorDerivedTargets = new Set(revision.boq.rows.flatMap((row) => {
    const steps = row.sourceParameters?.expandedComplexFormulaSteps;
    if (!Array.isArray(steps)) return [];
    return steps.flatMap((step) => {
      if (typeof step !== "string") return [];
      const assignment = step.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/u);
      return assignment ? [assignment[1]] : [];
    });
  }));
  const paramText = Object.entries(params)
    .filter(([key]) => key !== "estimate_level" && key !== "prices")
    .filter(([key, param]) => !(key === "area_m2" && hasSpecificAreaParam && param.source !== "edited_by_user"))
    // The prompt is a human/routing projection. Compiler-owned defaults are
    // already supplied through paramOverrides; serializing them back into text
    // can make units such as m2_machine_hour look like a user-entered area and
    // create a false geometry conflict during an otherwise valid edit.
    .filter(([key, param]) =>
      param.source === "user_input" ||
      param.source === "edited_by_user" ||
      (param.source === "derived" &&
        param.sourceText === "calculator_input_parameter" &&
        RECALC_PROMPT_PRESERVED_CALCULATOR_INPUT_KEYS.has(key) &&
        !calculatorDerivedTargets.has(key)))
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
  const originalPrevious = previous;
  previous = migrateInteriorFinishesProfessionalRevisionV4(originalPrevious);
  patch = retargetPatchAfterRevisionMigration(originalPrevious, previous, patch);
  const changedAt = input.createdAt ?? new Date().toISOString();
  const patchedResult = applyUserParamPatch(previous, patch, changedAt);
  const patched = {
    ...patchedResult,
    params: synchronizeSingleSemanticAreaAlias(patchedResult.params, [patch.paramKey]),
  };
  const rawInput = buildPromptForEstimateDraftRevisionRecalc(previous, patched.params);
  const exactRoadworks = exactRoadworksWaveARegistration(previous);
  const passport = exactRoadworks || usesRegisteredProfessionalDomain(previous)
    ? null
    : buildProfessionalWorkPassport(previous.selectedTemplateId);
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
  const revision = preserveResolvedIdentityLineage(
    previous,
    migrateInteriorFinishesProfessionalRevisionV4(createEstimateDraftRevision({
      estimateDraftId: previous.estimateDraftId,
      previousRevisionId: previous.revisionId,
      rawInput,
      selectedTemplateId: previous.selectedTemplateId,
      selectedTemplateName:
        exactRoadworks?.professionalNameRu ??
        passport?.localizedNameRu ??
        previous.selectedTemplateId,
      selectedWorkKey: selectedWorkKeyForRecalculation(previous, exactRoadworks),
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
    })),
  );
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
  const originalPrevious = previous;
  previous = migrateInteriorFinishesProfessionalRevisionV4(originalPrevious);
  if (patches.length === 0) {
    throw new Error("USER_PARAM_BATCH_EMPTY");
  }

  const changedAt = input.createdAt ?? new Date().toISOString();
  patches = patches.map((patch) => retargetPatchAfterRevisionMigration(originalPrevious, previous, patch));
  const patchedResult = applyUserParamPatches(previous, patches, changedAt);
  const patched = {
    ...patchedResult,
    params: synchronizeSingleSemanticAreaAlias(
      patchedResult.params,
      patches.map((patch) => patch.paramKey),
    ),
  };
  const rawInput = buildPromptForEstimateDraftRevisionRecalc(previous, patched.params);
  const exactRoadworks = exactRoadworksWaveARegistration(previous);
  const passport = exactRoadworks || usesRegisteredProfessionalDomain(previous)
    ? null
    : buildProfessionalWorkPassport(previous.selectedTemplateId);
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
  const revision = preserveResolvedIdentityLineage(
    previous,
    migrateInteriorFinishesProfessionalRevisionV4(createEstimateDraftRevision({
    estimateDraftId: previous.estimateDraftId,
    previousRevisionId: previous.revisionId,
    rawInput,
    selectedTemplateId: previous.selectedTemplateId,
    selectedTemplateName:
      exactRoadworks?.professionalNameRu ??
      passport?.localizedNameRu ??
      previous.selectedTemplateId,
    selectedWorkKey: selectedWorkKeyForRecalculation(previous, exactRoadworks),
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
    })),
  );
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
