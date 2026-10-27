import sourcePack from "../../../../data/estimate-benchmarks/source-packs/stairs-concrete-vibration-high-load-s27-23.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
} from "./stairsConcreteVibrationStandardS2723";
import { createStairsConcreteVibrationContextS2723 } from
  "./stairsConcreteVibrationContextAdapterS2723";

type Json = Record<string, unknown>;

export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_vibrate_high_load";
export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_ID =
  "stairs_concrete_vibration_high_load_s27_23";
export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID =
  "ACI-309-WACKER-IRFU45-STAIRS-VIBRATION-HIGH-LOAD-S27-23-R1";
export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256 =
  "8b43a76655f69e6cce57a9419c3b4ea0adf393770f29e0c8e8a07a814dab3038";

const CONTEXT = createStairsConcreteVibrationContextS2723({
  catalogId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_CATALOG_ID,
  sourceId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_ID,
  normId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID,
  sourcePackSha256: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
  sharedTechnologySourcePackSha256: sourcePack.sharedTechnologySourcePackSha256,
  contextKey: sourcePack.contextKey,
  contextRu: sourcePack.contextRu,
  contextSlug: sourcePack.contextSlug,
  rowPrefix: sourcePack.rowPrefix,
  contextPolicy: sourcePack.contextPolicy,
  compilerVersion:
    "canonical-estimate-compiler.stairs-concrete-vibration-high-load-s27-23.v1",
});

export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_INPUT =
  CONTEXT.runtimeInput;
export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_CLASSIFICATION =
  CONTEXT.runtimeClassification;
export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_SOURCE_IDS =
  CONTEXT.runtimeSourceIds;
export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_FORMULAS = CONTEXT.formulas;

const PREFIX = "concrete-stairs-vibration-high-load";
const PROJECT_CONDITION_SOURCE_ID =
  "S27_23_HIGH_LOAD_STAIRS_PROJECT_CONDITION_CLASSIFICATION";
const SINGLE_FORMULA_ID = "stairs_concrete_vibration_single_s2723";

const conditionDefinitions = Object.freeze([
  {
    parameterId: "high_load_placement_continuity_plan_reference",
    title: "Ссылка на план укладки, непрерывности и резервирования",
    guide: "Укажите утверждённую последовательность захваток и решение по резервному оборудованию.",
    rowId: `${PREFIX}:01:control:placement-continuity-plan`,
    rowTitle: "Сверка операции с планом укладки и непрерывности",
    consumers: [
      `${PREFIX}:03:operation:internal-vibration`,
      `${PREFIX}:03:labor:vibration-crew`,
      `${PREFIX}:03:equipment:rental-shifts`,
      `${PREFIX}:03:equipment:backup-vibrator`,
      `${PREFIX}:05:control:quality-record`,
    ],
  },
  {
    parameterId: "high_load_geometry_reinforcement_layout_reference",
    title: "Ссылка на геометрию лестницы и раскладку арматуры",
    guide: "Подтвердите толщины, доступ между стержнями и допустимый диаметр вибробулавы.",
    rowId: `${PREFIX}:01:control:geometry-reinforcement-layout`,
    rowTitle: "Сверка метода и диаметра вибробулавы с геометрией и армированием",
    consumers: [
      `${PREFIX}:01:control:method-applicability`,
      `${PREFIX}:01:control:equipment-suitability`,
      `${PREFIX}:03:operation:internal-vibration`,
      `${PREFIX}:03:equipment:active-vibrator`,
    ],
  },
  {
    parameterId: "high_load_equipment_selection_plan_reference",
    title: "Ссылка на план выбора вибратора, числа машин и питания",
    guide: "Укажите выбранную модель, число одновременно работающих машин, питание и защиту.",
    rowId: `${PREFIX}:02:control:equipment-selection-plan`,
    rowTitle: "Сверка выбранного вибратора, количества машин и питания",
    consumers: [
      `${PREFIX}:02:operation:equipment-check`,
      `${PREFIX}:02:equipment:electrical-protection`,
      `${PREFIX}:02:equipment:extension-cable`,
      `${PREFIX}:03:equipment:active-vibrator`,
      `${PREFIX}:03:equipment:rental-shifts`,
      `${PREFIX}:03:equipment:backup-vibrator`,
      `${PREFIX}:03:material:electricity`,
      `${PREFIX}:04:operation:cleaning`,
      `${PREFIX}:04:labor:cleaning`,
      `${PREFIX}:04:consumable:cleaning-water`,
      `${PREFIX}:04:consumable:brush`,
      `${PREFIX}:04:consumable:wipes`,
      `${PREFIX}:04:equipment:wash-water-container`,
      `${PREFIX}:06:delivery:mobilization`,
      `${PREFIX}:06:delivery:wash-water`,
    ],
  },
]);

const conditionParameters: readonly CanonicalEstimateParameterDefinition[] =
  conditionDefinitions.map((condition, index) => ({
    parameter_id: condition.parameterId,
    ordinal: CONTEXT.parameters.length + index,
    value_type: "text",
    unit_id: null,
    title_ru: condition.title,
    required: true,
    default_value: null,
    constraints_json: { minLength: 1, maxLength: 1_000 },
    truth_metadata: {
      contract: "rik-expo-app.s27-23.stairs-concrete-vibration-high-load.v1",
      semantic_parameter_key:
        `stairs-concrete-vibration-high-load-s27-23:${condition.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "APPROVED_PROJECT_DOCUMENT_REFERENCE",
      input_origin_class: "PROJECT_HIGH_LOAD_STAIRS_CONDITION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: true,
      hidden_default_forbidden: true,
      synthetic: false,
      resource_branch_consumers: [...condition.consumers, condition.rowId],
      guide: {
        guide_kind: "PROJECT_DEFINED",
        guide_short_ru: condition.guide,
        source_role: "PROJECT_GEOMETRY_CONTINUITY_AND_EQUIPMENT_SELECTION",
        source_document: PROJECT_CONDITION_SOURCE_ID,
        source_locator: sourcePack.sources[2].exactLocator,
        guide_version: "stairs-concrete-vibration-high-load-s27-23-r1",
        source_snapshot_hash:
          STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
        applicability: sourcePack.contextPolicy,
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy:
          "KEEP_DEPENDENT_ROWS_VISIBLE_UNTIL_PROJECT_REFERENCE_IS_SUPPLIED",
      },
    },
  }));

export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze([
  ...CONTEXT.parameters,
  ...conditionParameters,
]);

function present(parameterId: string): Json {
  return { kind: "present", parameterId };
}

function bindProjectConditions(
  resource: CanonicalEstimateResourceDefinition,
): CanonicalEstimateResourceDefinition {
  const conditions = conditionDefinitions.filter((condition) =>
    condition.consumers.includes(resource.row_id));
  if (conditions.length === 0) return resource;
  const inclusionAst = conditions.length === 1
    ? present(conditions[0]!.parameterId)
    : { kind: "and", operands: conditions.map((condition) => present(condition.parameterId)) };
  const resourceGraph = {
    ...(resource.resource_graph as Json),
    contextParameterIds: [
      ...(((resource.resource_graph as Json).contextParameterIds as string[] | undefined) ?? []),
      ...conditions.map((condition) => condition.parameterId),
    ],
    projectConditionGate: true,
  };
  return {
    ...resource,
    inclusion_ast: inclusionAst,
    resource_graph: resourceGraph,
    row_sha256: estimateDeterministicHash({
      parentRowSha256: resource.row_sha256,
      inclusionAst,
      resourceGraph,
    }),
  };
}

function conditionResource(
  condition: (typeof conditionDefinitions)[number],
  ordinal: number,
): CanonicalEstimateResourceDefinition {
  const inclusionAst = present(condition.parameterId);
  const resourceGraph = {
    formulaId: SINGLE_FORMULA_ID,
    normalizedUom: "service",
    semanticOwnerId: `stairs-concrete-vibration-high-load-s27-23:${condition.rowId}`,
    resourceKind: "control",
    stage: "Контроль проектных условий лестницы высокой нагрузки",
    costOwner: "scope",
    costTreatment: "INFORMATIONAL_SCOPE",
    payable: false,
    noDoubleCount: true,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    preliminaryProfileId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID,
    contextParameterIds: [condition.parameterId],
    projectConditionGate: true,
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "PROJECT_HIGH_LOAD_STAIRS_CONDITION_CLASSIFICATION",
    sourcePackSha256: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId: PROJECT_CONDITION_SOURCE_ID,
      source_id: PROJECT_CONDITION_SOURCE_ID,
      normId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID,
      norm_id: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID,
      normVersion: "S27.23",
      source_title: sourcePack.sources[2].authority,
      source_url: null,
      exact_locator: sourcePack.sources[2].exactLocator,
      source_definition_hash:
        STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
    }],
    contextPolicy: sourcePack.contextPolicy,
  };
  return {
    id: `resource-${condition.rowId.replace(/:/gu, "-")}`,
    row_id: condition.rowId,
    ordinal,
    section: "01 · Контроль проектных условий высокой нагрузки",
    category: "service",
    title_ru: condition.rowTitle,
    unit_id: "service",
    formula_id: SINGLE_FORMULA_ID,
    inclusion_ast: inclusionAst,
    resource_graph: resourceGraph,
    procurement_eligible: false,
    cost_owner_id: condition.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ condition, resourceGraph, sourceMetadata }),
  };
}

const baseResources = CONTEXT.resources.map(bindProjectConditions);
const projectConditionResources = conditionDefinitions.map((condition, index) =>
  conditionResource(condition, baseResources.length + index));

export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  ...baseResources,
  ...projectConditionResources,
]);

const HIGH_LOAD_REQUIRED_ROW_IDS = Object.freeze(
  projectConditionResources.map((resource) => resource.row_id),
);

export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
    entries: [
      ...CONTEXT.independentCompletenessMap.entries,
      {
        semanticKey: "high_load_project_condition_controls",
        requiredRowIds: HIGH_LOAD_REQUIRED_ROW_IDS,
        expectedResourceIds: HIGH_LOAD_REQUIRED_ROW_IDS,
      },
    ],
  });

export function stairsConcreteVibrationHighLoadMissingRows(
  rowIds: ReadonlySet<string>,
): string[] {
  return STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SHORT_INPUT = Object.freeze({
  consolidated_concrete_volume_m3:
    sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
});

export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  consolidated_concrete_volume_m3:
    sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
  concrete_mix_reference: "PROJECT-CONCRETE-MIX-STAIRS-HIGH-LOAD-REV-A",
  placement_location: "Лестница для высокой нагрузки; STAIRS-VIB-HL-01",
  high_load_placement_continuity_plan_reference:
    sourcePack.acceptanceFixture.placementContinuityPlanReference,
  high_load_geometry_reinforcement_layout_reference:
    sourcePack.acceptanceFixture.geometryReinforcementLayoutReference,
  high_load_equipment_selection_plan_reference:
    sourcePack.acceptanceFixture.equipmentSelectionPlanReference,
});

export const STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_METADATA = Object.freeze({
  source_title:
    "High-load stair-concrete vibration with explicit geometry, continuity and equipment gates",
  source_authority:
    "American Concrete Institute; Wacker Neuson; project documentation required",
  source_document_version:
    "ACI_309R_05_WACKER_IRFU_HIGH_LOAD_PROJECT_CONDITIONS_2026_10_01",
  definition_hash: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
  source_kind: "SHARED_ATOMIC_TECHNOLOGY_PLUS_PROJECT_HIGH_LOAD_CONDITIONS",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
  effective_from: "2026-10-01",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join(" | "),
  use_restriction: sourcePack.contextPolicy,
  source_pack_path:
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-high-load-s27-23.json",
});

export async function compileStairsConcreteVibrationHighLoadS2723(
  submittedParameters: Record<string, unknown>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      "canonical-estimate-compiler.stairs-concrete-vibration-high-load-s27-23.v1",
    catalogId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_CATALOG_ID,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_PARAMETERS],
    formulaDefinitions: [...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_FORMULAS],
    resourceDefinitions: [...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
