import sourcePack from "../../../../data/estimate-benchmarks/source-packs/stairs-concrete-vibration-wet-zone-s27-23.json";

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
type WetZoneParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_stairs_concrete_vibrate_wet_zone";
export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_ID =
  "stairs_concrete_vibration_wet_zone_s27_23";
export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID =
  "ACI-309-WACKER-IRFU45-STAIRS-VIBRATION-WET-ZONE-S27-23-R1";
export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256 =
  "aff904971c9a60a9358b4b9bff05dc33b2f00eb2c5652554ce9fdefdd4e91d20";

const CONTEXT = createStairsConcreteVibrationContextS2723({
  catalogId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_CATALOG_ID,
  sourceId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_ID,
  normId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID,
  sourcePackSha256: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
  sharedTechnologySourcePackSha256: sourcePack.sharedTechnologySourcePackSha256,
  contextKey: sourcePack.contextKey,
  contextRu: sourcePack.contextRu,
  contextSlug: sourcePack.contextSlug,
  rowPrefix: sourcePack.rowPrefix,
  contextPolicy: sourcePack.contextPolicy,
  compilerVersion:
    "canonical-estimate-compiler.stairs-concrete-vibration-wet-zone-s27-23.v1",
});

export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_INPUT =
  CONTEXT.runtimeInput;
export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_CLASSIFICATION =
  CONTEXT.runtimeClassification;
export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_SOURCE_IDS =
  CONTEXT.runtimeSourceIds;
export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_FORMULAS = CONTEXT.formulas;

const ELECTRICAL_PLAN_PARAMETER_ID = "wet_zone_electrical_plan_reference";
const ELECTRICAL_PLAN_CONSUMERS = Object.freeze([
  "concrete-stairs-vibration-wet-zone:02:equipment:electrical-protection",
  "concrete-stairs-vibration-wet-zone:02:equipment:extension-cable",
]);

const electricalPlanParameter: WetZoneParameter = {
  parameter_id: ELECTRICAL_PLAN_PARAMETER_ID,
  ordinal: CONTEXT.parameters.length,
  value_type: "text",
  unit_id: null,
  title_ru: "Ссылка на схему временного электроснабжения влажной зоны",
  required: true,
  default_value: null,
  constraints_json: { minLength: 1, maxLength: 1_000 },
  truth_metadata: {
    contract: "rik-expo-app.s27-23.stairs-concrete-vibration-wet-zone.v1",
    semantic_parameter_key:
      "stairs-concrete-vibration-wet-zone-s27-23:wet-zone-electrical-plan-reference",
    visibility_role: "USER_INPUT",
    value_source_role: "APPROVED_PROJECT_TEMPORARY_ELECTRICAL_PLAN",
    input_origin_class: "PROJECT_WET_ZONE_ELECTRICAL_SAFETY",
    preliminary_compilation_allowed: true,
    source_confirmation_required: true,
    hidden_default_forbidden: true,
    synthetic: false,
    resource_branch_consumers: [...ELECTRICAL_PLAN_CONSUMERS],
    guide: {
      guide_kind: "PROJECT_DEFINED",
      guide_short_ru:
        "Укажите утверждённую схему временного питания и защит; IP67 и Bodyguard не подменяют проектную схему.",
      source_role: "PROJECT_TEMPORARY_ELECTRICAL_PLAN_WITH_MANUFACTURER_EQUIPMENT_FACTS",
      source_document: "WACKER_NEUSON_IRFU_BODYGUARD_2026_10_01",
      source_locator: sourcePack.sources.map((source) => source.exactLocator).join(" | "),
      guide_version: "stairs-concrete-vibration-wet-zone-s27-23-r1",
      source_snapshot_hash: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
      applicability: sourcePack.contextPolicy,
      verified_at: "2026-10-01T00:00:00+06:00",
      guide_validation_policy: "KEEP_DEPENDENT_ELECTRICAL_ROWS_VISIBLE_UNTIL_PLAN_REFERENCE_IS_SUPPLIED",
    },
  },
};

export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze([
  ...CONTEXT.parameters,
  electricalPlanParameter,
]);

const requiresElectricalPlan = Object.freeze({
  kind: "present",
  parameterId: ELECTRICAL_PLAN_PARAMETER_ID,
});

function bindElectricalPlan(
  resource: CanonicalEstimateResourceDefinition,
): CanonicalEstimateResourceDefinition {
  if (!ELECTRICAL_PLAN_CONSUMERS.includes(resource.row_id)) return resource;
  const resourceGraph = {
    ...(resource.resource_graph as Json),
    contextParameterIds: [
      ...(((resource.resource_graph as Json).contextParameterIds as string[] | undefined) ?? []),
      ELECTRICAL_PLAN_PARAMETER_ID,
    ],
  };
  return {
    ...resource,
    inclusion_ast: requiresElectricalPlan,
    resource_graph: resourceGraph,
    row_sha256: estimateDeterministicHash({
      parentRowSha256: resource.row_sha256,
      inclusionAst: requiresElectricalPlan,
      resourceGraph,
    }),
  };
}

const SOURCE_BY_ID = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));
const SINGLE_FORMULA_ID = "stairs_concrete_vibration_single_s2723";

function wetResource(input: Readonly<{
  rowId: string;
  ordinal: number;
  title: string;
  sourceId: string;
  category?: string;
}>): CanonicalEstimateResourceDefinition {
  const source = SOURCE_BY_ID.get(input.sourceId);
  const resourceGraph = {
    formulaId: SINGLE_FORMULA_ID,
    normalizedUom: "service",
    semanticOwnerId: `stairs-concrete-vibration-wet-zone-s27-23:${input.rowId}`,
    resourceKind: input.category === "construction_work" ? "operation" : "control",
    stage: "02 · Подготовка оборудования · влажная зона",
    costOwner: "scope",
    costTreatment: "INFORMATIONAL_SCOPE",
    payable: false,
    noDoubleCount: true,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    preliminaryProfileId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID,
    contextParameterIds: [ELECTRICAL_PLAN_PARAMETER_ID],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "MANUFACTURER_WET_ENVIRONMENT_ELECTRICAL_EQUIPMENT_FACT",
    sourcePackSha256: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId: input.sourceId,
      source_id: input.sourceId,
      normId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID,
      norm_id: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID,
      normVersion: "S27.23",
      source_title: source?.authority ?? input.sourceId,
      source_url: source?.officialUrl ?? null,
      exact_locator: source?.exactLocator ?? sourcePack.contextPolicy,
      source_definition_hash: source?.artifactSha256
        ?? STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
    }],
    contextPolicy: sourcePack.contextPolicy,
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: "02 · Подготовка оборудования · влажная зона",
    category: input.category ?? "service",
    title_ru: input.title,
    unit_id: "service",
    formula_id: SINGLE_FORMULA_ID,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: resourceGraph,
    procurement_eligible: false,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const baseResources = CONTEXT.resources.map(bindElectricalPlan);
const wetResources = [
  wetResource({
    rowId: "concrete-stairs-vibration-wet-zone:02:control:ip67-class-i",
    ordinal: baseResources.length,
    title: "Подтверждение IP67 и класса I с защитным заземлением выбранного IRFU45",
    sourceId: "WACKER_NEUSON_IRFU_TECHNICAL_DATA_2026_10_01",
  }),
  wetResource({
    rowId: "concrete-stairs-vibration-wet-zone:02:control:bodyguard-integrated",
    ordinal: baseResources.length + 1,
    title: "Подтверждение встроенного выключателя персональной защиты Bodyguard",
    sourceId: "WACKER_NEUSON_IRFU_MODEL_VARIATIONS_2026_10_01",
  }),
  wetResource({
    rowId: "concrete-stairs-vibration-wet-zone:02:operation:bodyguard-check",
    ordinal: baseResources.length + 2,
    title: "Предпусковой контроль Bodyguard, кабеля, вилки и защитного проводника",
    sourceId: "WACKER_NEUSON_IRFU_BODYGUARD_2026_10_01",
    category: "construction_work",
  }),
  wetResource({
    rowId: "concrete-stairs-vibration-wet-zone:02:control:project-electrical-plan",
    ordinal: baseResources.length + 3,
    title: "Сверка подключения с проектной схемой временного электроснабжения влажной зоны",
    sourceId: "WACKER_NEUSON_IRFU_BODYGUARD_2026_10_01",
  }),
];

export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  ...baseResources,
  ...wetResources,
]);

const WET_REQUIRED_ROW_IDS = Object.freeze(wetResources.map((resource) => resource.row_id));
export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s27-23.stairs-concrete-vibration-wet-zone-completeness.v1",
    sourceKind: "INDEPENDENT_SHARED_ATOMIC_TECHNOLOGY_CONTEXT_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
    entries: [
      ...CONTEXT.independentCompletenessMap.entries,
      {
        semanticKey: "wet_zone_electrical_controls",
        requiredRowIds: WET_REQUIRED_ROW_IDS,
        expectedResourceIds: WET_REQUIRED_ROW_IDS,
      },
    ],
  });

export function stairsConcreteVibrationWetZoneMissingRows(
  rowIds: ReadonlySet<string>,
): string[] {
  return STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SHORT_INPUT = Object.freeze({
  consolidated_concrete_volume_m3: sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
});

export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_ACCEPTANCE_INPUT = Object.freeze({
  ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  consolidated_concrete_volume_m3: sourcePack.acceptanceFixture.consolidatedConcreteVolumeM3,
  concrete_mix_reference: "PROJECT-CONCRETE-MIX-STAIRS-WET-ZONE-REV-A",
  placement_location: "Влажная зона лестничного марша или площадки; STAIRS-VIB-WZ-01",
  wet_zone_electrical_plan_reference: sourcePack.acceptanceFixture.wetZoneElectricalPlanReference,
});

export const STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_METADATA = Object.freeze({
  source_title: "Wet-zone stair-concrete vibration with IRFU IP67, class I and Bodyguard controls",
  source_authority: "American Concrete Institute; Wacker Neuson; контекст S27.23",
  source_document_version: "ACI_309R_05_WACKER_IRFU_WET_ZONE_CAPTURE_2026_10_01",
  definition_hash: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
  source_kind: "SHARED_ATOMIC_TECHNOLOGY_PLUS_WET_ZONE_EQUIPMENT_CONTROLS",
  official_url: sourcePack.sources[0].officialUrl,
  artifact_sha256: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
  effective_from: "2026-10-01",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join(" | "),
  use_restriction: sourcePack.contextPolicy,
  source_pack_path:
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-wet-zone-s27-23.json",
});

export async function compileStairsConcreteVibrationWetZoneS2723(
  submittedParameters: Record<string, unknown>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      "canonical-estimate-compiler.stairs-concrete-vibration-wet-zone-s27-23.v1",
    catalogId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_CATALOG_ID,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_PARAMETERS],
    formulaDefinitions: [...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_FORMULAS],
    resourceDefinitions: [...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
