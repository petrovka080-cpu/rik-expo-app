import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  CONCRETE_SLAB_CURING_FORMULAS,
  CONCRETE_SLAB_CURING_PARAMETERS,
  CONCRETE_SLAB_CURING_RESOURCES,
  CONCRETE_SLAB_CURING_SOURCE_METADATA,
} from "./concreteSlabCuringR1";
import {
  STAIRS_COMPLETE_INSTALLATION_FORMULAS,
  STAIRS_COMPLETE_INSTALLATION_PARAMETERS,
  STAIRS_COMPLETE_INSTALLATION_RESOURCES,
  STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA,
  STAIRS_COMPLETE_INSTALLATION_TARGETS,
  stairsCompleteInstallationAcceptanceInputR1,
} from "./stairsCompleteInstallationR1";
import {
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_METADATA,
} from "./stairsConcreteVibrationStandardS2723";

type Json = Record<string, any>;
type InputValue = string | number | boolean;
type PublishedParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata?: Json;
};

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_CATALOG_ID =
  STAIRS_COMPLETE_INSTALLATION_TARGETS.find(
    (target) => target.contextKey === "standard",
  )!.catalogId;
export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_ID =
  "stairs_complete_installation_standard_s27_23";
export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_NORM_ID =
  "STAIRS-COMPLETE-STANDARD-S27-23-COMPOSED-R1";

const literalTrue: Json = Object.freeze({ kind: "literal", value: true });
const SELECTOR_PARAMETER_IDS = new Set([
  "reinforcement_applicable",
  "temporary_formwork_applicable",
]);
const REPLACED_PLACEMENT_PARAMETER_IDS = new Set([
  "placement_curing_method",
  "placement_curing_membrane_area_m2",
  "placement_curing_membrane_specification",
  "placement_curing_worker_h",
  "placement_deep_vibrator_machine_h",
  "placement_finishing_worker_h",
]);
const REPLACED_PLACEMENT_FORMULA_IDS = new Set([
  "curing_membrane_quantity_v1",
  "curing_labor_v1",
  "deep_vibrator_machine_time_v1",
  "finishing_labor_v1",
]);
const REPLACED_PLACEMENT_ROW_IDS = new Set([
  "material:concrete:curing-membrane",
  "work:concrete:finish-surface",
  "work:concrete:cure",
  "equipment:concrete:deep-vibrator",
]);

function deepRename(value: unknown, ids: Readonly<Record<string, string>>): unknown {
  if (typeof value === "string") return ids[value] ?? value;
  if (Array.isArray(value)) return value.map((entry) => deepRename(entry, ids));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .map(([key, child]) => [key, deepRename(child, ids)]));
  }
  return value;
}

function withoutRequiredWhen(constraints: unknown): Json | null {
  if (!constraints || typeof constraints !== "object" || Array.isArray(constraints)) {
    return constraints as Json | null;
  }
  const copy = { ...(constraints as Json) };
  delete copy.requiredWhen;
  return copy;
}

function stageParameterMap(
  parameters: readonly CanonicalEstimateParameterDefinition[],
  prefix: string,
  shared: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  return Object.fromEntries(parameters.map((parameter) => [
    parameter.parameter_id,
    shared[parameter.parameter_id] ?? `${prefix}_${parameter.parameter_id}`,
  ]));
}

function projectStageParameters(
  parameters: readonly CanonicalEstimateParameterDefinition[],
  ids: Readonly<Record<string, string>>,
): PublishedParameter[] {
  return parameters.map((parameter) => {
    const renamed = deepRename(parameter, ids) as CanonicalEstimateParameterDefinition
      & Partial<PublishedParameter>;
    return {
      ...renamed,
      parameter_id: ids[parameter.parameter_id]!,
      ordinal: Number(renamed.ordinal ?? 0),
      unit_id: typeof renamed.unit_id === "string" ? renamed.unit_id : null,
      title_ru: typeof renamed.title_ru === "string"
        ? renamed.title_ru
        : ids[parameter.parameter_id]!,
      required: false,
      default_value: null,
      constraints_json: withoutRequiredWhen(deepRename(parameter.constraints_json, ids)),
    };
  });
}

function projectStageFormulas(
  formulas: readonly CanonicalEstimateFormulaDefinition[],
  ids: Readonly<Record<string, string>>,
): CanonicalEstimateFormulaDefinition[] {
  return formulas.map((formula) => {
    const renamed = deepRename(formula, ids) as CanonicalEstimateFormulaDefinition;
    const expressionSource = typeof formula.expression_source === "string"
      ? Object.entries(ids).reduce((expression, [sourceId, targetId]) =>
        expression.replace(
          new RegExp(`\\b${sourceId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "gu"),
          targetId,
        ), formula.expression_source)
      : formula.expression_source;
    return {
      ...renamed,
      expression_source: expressionSource,
      ast_sha256: estimateDeterministicHash(renamed.ast),
    };
  });
}

function projectStageResources(
  resources: readonly CanonicalEstimateResourceDefinition[],
  ids: Readonly<Record<string, string>>,
): CanonicalEstimateResourceDefinition[] {
  return resources.map((resource) => {
    const renamed = deepRename(resource, ids) as CanonicalEstimateResourceDefinition;
    const physicalBinding = renamed.resource_graph.professionalPhysicalNormBindingV1;
    if (physicalBinding && typeof physicalBinding === "object" && !Array.isArray(physicalBinding)) {
      const binding = physicalBinding as Json;
      const projection = binding.parameter_projection_v1
        && typeof binding.parameter_projection_v1 === "object"
        && !Array.isArray(binding.parameter_projection_v1)
        ? binding.parameter_projection_v1 as Json
        : {};
      binding.parameter_projection_v1 = {
        ...projection,
        aliases: {
          ...(projection.aliases && typeof projection.aliases === "object"
            && !Array.isArray(projection.aliases) ? projection.aliases as Json : {}),
          ...ids,
        },
      };
    }
    const projected = { ...renamed };
    const { row_sha256: _previousHash, ...hashInput } = projected;
    return { ...projected, row_sha256: estimateDeterministicHash(hashInput) };
  });
}

function stripFullWorkSelector(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) return literalTrue;
  const ast = value as Json;
  if (ast.kind === "parameter" && SELECTOR_PARAMETER_IDS.has(String(ast.id))) {
    return literalTrue;
  }
  if (ast.kind === "and" && Array.isArray(ast.operands)) {
    const operands = ast.operands
      .filter((operand: unknown) => !(operand && typeof operand === "object"
        && !Array.isArray(operand)
        && (operand as Json).kind === "parameter"
        && SELECTOR_PARAMETER_IDS.has(String((operand as Json).id))))
      .map((operand: unknown) => stripFullWorkSelector(operand));
    if (operands.length === 0) return literalTrue;
    if (operands.length === 1) return operands[0]!;
    return { kind: "and", operands };
  }
  return ast;
}

function rehashResource(
  resource: CanonicalEstimateResourceDefinition,
): CanonicalEstimateResourceDefinition {
  const { row_sha256: _previousHash, ...hashInput } = resource;
  return { ...resource, row_sha256: estimateDeterministicHash(hashInput) };
}

const baseParameters = STAIRS_COMPLETE_INSTALLATION_PARAMETERS
  .filter((parameter) => !SELECTOR_PARAMETER_IDS.has(parameter.parameter_id))
  .filter((parameter) => !REPLACED_PLACEMENT_PARAMETER_IDS.has(parameter.parameter_id))
  .map((parameter) => parameter.parameter_id === "placement_placement_worker_h"
    ? {
        ...parameter,
        title_ru: "Трудозатраты на укладку бетонной смеси без отдельной бригады виброуплотнения",
        truth_metadata: {
          ...(parameter.truth_metadata ?? {}),
          no_double_count_boundary:
            "EXCLUDES_DEDICATED_VIBRATION_CREW_AND_VIBRATOR_COST_OWNER",
        },
      }
    : parameter);

const baseFormulas = STAIRS_COMPLETE_INSTALLATION_FORMULAS
  .filter((formula) => !REPLACED_PLACEMENT_FORMULA_IDS.has(formula.formula_id));

const baseResources = STAIRS_COMPLETE_INSTALLATION_RESOURCES
  .filter((resource) => !REPLACED_PLACEMENT_ROW_IDS.has(resource.row_id))
  .map((resource) => {
    const withoutSelector = {
      ...resource,
      inclusion_ast: stripFullWorkSelector(resource.inclusion_ast),
    };
    if (resource.row_id !== "work:concrete:place-and-compact") {
      return rehashResource(withoutSelector);
    }
    const rowId = "work:concrete:place";
    const resourceGraph = {
      ...withoutSelector.resource_graph,
      semanticOwnerId: "stairs-complete-installation:work:concrete:place",
      noDoubleCountBoundary:
        "PLACEMENT_LABOR_EXCLUDES_DEDICATED_VIBRATION_LABOR_AND_EQUIPMENT",
    };
    return rehashResource({
      ...withoutSelector,
      id: "resource-work-concrete-place",
      row_id: rowId,
      title_ru: "Укладка бетонной смеси без отдельной бригады виброуплотнения",
      cost_owner_id: rowId,
      resource_graph: resourceGraph,
      source_metadata: {
        ...withoutSelector.source_metadata,
        noDoubleCountBoundary:
          "PLACEMENT_LABOR_EXCLUDES_DEDICATED_VIBRATION_LABOR_AND_EQUIPMENT",
      },
    });
  });

const BASE_PARAMETER_IDS = new Set(baseParameters.map((parameter) => parameter.parameter_id));
const VIBRATION_IDS = stageParameterMap(
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS,
  "vibration",
  {
    consolidated_concrete_volume_m3: "stairs_concrete_volume_m3",
    concrete_mix_reference: "placement_mix_design_or_project_specification_reference",
    placement_location: "placement_placement_location",
  },
);
const CURING_IDS = stageParameterMap(
  CONCRETE_SLAB_CURING_PARAMETERS,
  "external_curing",
  {
    cured_concrete_volume_m3: "stairs_concrete_volume_m3",
    concrete_mix_reference: "placement_mix_design_or_project_specification_reference",
    curing_location: "placement_placement_location",
  },
);

const vibrationParameters = projectStageParameters(
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS,
  VIBRATION_IDS,
).filter((parameter) => !BASE_PARAMETER_IDS.has(parameter.parameter_id));
const vibrationFormulas = projectStageFormulas(
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
  VIBRATION_IDS,
);
const vibrationResources = projectStageResources(
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES,
  VIBRATION_IDS,
);

const curingParameters = projectStageParameters(
  CONCRETE_SLAB_CURING_PARAMETERS,
  CURING_IDS,
).filter((parameter) => !BASE_PARAMETER_IDS.has(parameter.parameter_id))
  .map((parameter) => ({
    ...parameter,
    title_ru: parameter.title_ru
      .replaceAll("бетонной плиты", "бетонной лестницы")
      .replaceAll("плиты", "лестницы"),
    truth_metadata: {
      ...(parameter.truth_metadata ?? {}),
      contract: "rik-expo-app.s27-23.stairs-complete-external-curing.v1",
      semantic_parameter_key:
        `stairs-complete-external-curing:${parameter.parameter_id}`,
    },
  }));
const curingFormulas = projectStageFormulas(CONCRETE_SLAB_CURING_FORMULAS, CURING_IDS);
const CURING_ROW_IDS: Readonly<Record<string, string>> = Object.freeze({
  "work:concrete:slab-curing": "work:concrete:stairs-external-curing",
  "service:concrete:slab-curing-quality-control":
    "service:concrete:stairs-curing-quality-control",
});
const curingResources = projectStageResources(CONCRETE_SLAB_CURING_RESOURCES, CURING_IDS)
  .map((resource) => {
    const rowId = CURING_ROW_IDS[resource.row_id] ?? resource.row_id;
    const resourceGraph = {
      ...resource.resource_graph,
      semanticOwnerId: String(resource.resource_graph.semanticOwnerId ?? rowId)
        .replaceAll("concrete-slab-curing", "stairs-complete-external-curing")
        .replaceAll("work:concrete:slab-curing", rowId),
    };
    return rehashResource({
      ...resource,
      id: `resource-${rowId.replace(/:/gu, "-")}`,
      row_id: rowId,
      cost_owner_id: rowId,
      title_ru: resource.title_ru
        .replaceAll("бетонной плиты", "бетонной лестницы")
        .replaceAll("плиты", "лестницы"),
      resource_graph: resourceGraph,
      source_metadata: {
        ...resource.source_metadata,
        projectScopeOwner: "COMPLETE_MONOLITHIC_CONCRETE_STAIRS",
      },
    });
  });

type FinishingParameterSpec = Readonly<{
  id: string;
  title: string;
  unit: string | null;
  valueType: "decimal" | "integer" | "enum";
  constraints: Json;
  projectGeometry?: boolean;
}>;

const FINISHING_PARAMETER_SPECS: readonly FinishingParameterSpec[] = Object.freeze([
  { id: "finishing_exposed_surface_area_m2", title: "Площадь открытой поверхности лестницы для отделки", unit: "m2", valueType: "decimal", constraints: { min: 0.001 }, projectGeometry: true },
  { id: "finishing_method", title: "Способ первичной отделки монолитной поверхности", unit: null, valueType: "enum", constraints: { values: ["AS_CAST_HAND_TROWEL"] } },
  { id: "finishing_labor_productivity_m2_per_man_hour", title: "Плановая производительность ручной отделки", unit: "m2_per_man_hour", valueType: "decimal", constraints: { min: 0.001 } },
  { id: "finishing_tool_set_coverage_m2_per_set", title: "Площадь на один комплект ручного инструмента", unit: "m2_per_item", valueType: "decimal", constraints: { min: 0.001 } },
  { id: "finishing_quality_record_count", title: "Записей контроля отделки поверхности", unit: "document", valueType: "integer", constraints: { min: 1 } },
]);

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FINISHING_RUNTIME_INPUT =
  Object.freeze({
    finishing_method: "AS_CAST_HAND_TROWEL",
    finishing_labor_productivity_m2_per_man_hour: 2,
    finishing_tool_set_coverage_m2_per_set: 50,
    finishing_quality_record_count: 1,
  });

const finishingParameters: PublishedParameter[] = FINISHING_PARAMETER_SPECS.map(
  (spec, ordinal) => ({
    parameter_id: spec.id,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unit,
    title_ru: spec.title,
    required: false,
    default_value: null,
    constraints_json: spec.constraints,
    truth_metadata: {
      contract: "rik-expo-app.s27-23.stairs-complete-finishing.v1",
      semantic_parameter_key: `stairs-complete-finishing:${spec.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: spec.projectGeometry
        ? "USER_OR_PROJECT_MEASURED"
        : "VISIBLE_REPLACEABLE_PLANNING_PROFILE",
      input_origin_class: spec.projectGeometry
        ? "PROJECT_FINISHING_GEOMETRY"
        : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: !spec.projectGeometry,
      source_confirmation_required: false,
      hidden_default_forbidden: spec.projectGeometry === true,
      synthetic: false,
      guide: {
        guide_kind: spec.projectGeometry ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: spec.projectGeometry
          ? "Укажите открытую площадь проступей, площадок и иных поверхностей по геометрии проекта."
          : "Видимое плановое допущение; замените значением ППР или ведомости исполнителя.",
        source_role: spec.projectGeometry
          ? "PROJECT_FINISHING_GEOMETRY"
          : "VISIBLE_REPLACEABLE_PLANNING_ASSUMPTION",
        source_document: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_NORM_ID,
        guide_version: "stairs-complete-finishing-s27-23-r1",
        source_snapshot_hash: STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA.definition_hash,
        applicability:
          "Профиль относится только к первичной отделке монолитной поверхности без отдельного покрытия или ремонтного состава.",
        verified_at: "2026-10-01T00:00:00+06:00",
      },
    },
  }),
);

function finishingFormula(
  id: string,
  unit: string,
  expression: string,
): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: `stairs_complete_finishing_${id}_s2723`,
    output_unit_id: unit,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: estimateDeterministicHash(compiled.ast),
  };
}

const finishingFormulas: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  finishingFormula("area", "m2", "finishing_exposed_surface_area_m2"),
  finishingFormula("labor", "man_hour", "finishing_exposed_surface_area_m2/finishing_labor_productivity_m2_per_man_hour"),
  finishingFormula("tool_sets", "item", "ceil(finishing_exposed_surface_area_m2/finishing_tool_set_coverage_m2_per_set)"),
  finishingFormula("single", "service", "1"),
  finishingFormula("quality_records", "document", "finishing_quality_record_count"),
]);

function finishingResource(input: Readonly<{
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  title: string;
  unit: string;
  formulaId: string;
  procurement: boolean;
  informational?: boolean;
  inputIds: readonly string[];
}>): CanonicalEstimateResourceDefinition {
  const informational = input.informational === true;
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unit,
    semanticOwnerId: `stairs-complete-finishing:${input.rowId}`,
    stage: input.section,
    costOwner: informational ? "scope" : "resource",
    costTreatment: informational ? "INFORMATIONAL_SCOPE" : "OWN_COST",
    payable: !informational,
    noDoubleCount: true,
    inputParameterIds: [...input.inputIds],
    boundary:
      "PRIMARY_AS_CAST_FINISH_ONLY; SEPARATE_COATING_OR_REPAIR_PROFILE_REQUIRED_IF_SPECIFIED",
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "VISIBLE_PROJECT_FINISHING_PROFILE",
    quantitySourceRole: "PROJECT_GEOMETRY_AND_VISIBLE_REPLACEABLE_PRODUCTIVITY",
    universal_productivity_claimed: false,
    excludedUnownedAssumptions: [
      "automatic coating selection",
      "automatic repair compound selection",
      "hidden finishing area",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.title,
    unit_id: input.unit,
    formula_id: input.formulaId,
    inclusion_ast: literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurement,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const finishingResources: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  finishingResource({ rowId: "work:concrete:stairs-primary-surface-finishing", ordinal: 0, section: "Отделка поверхности", category: "construction_work", title: "Первичная ручная отделка открытой поверхности монолитной лестницы", unit: "m2", formulaId: "stairs_complete_finishing_area_s2723", procurement: false, informational: true, inputIds: ["finishing_exposed_surface_area_m2", "finishing_method"] }),
  finishingResource({ rowId: "labor:concrete:stairs-primary-surface-finishing", ordinal: 1, section: "Отделка поверхности", category: "labor", title: "Труд ручной отделки открытой поверхности лестницы", unit: "man_hour", formulaId: "stairs_complete_finishing_labor_s2723", procurement: false, inputIds: ["finishing_exposed_surface_area_m2", "finishing_labor_productivity_m2_per_man_hour"] }),
  finishingResource({ rowId: "equipment:concrete:stairs-finishing-hand-tools", ordinal: 2, section: "Отделка поверхности", category: "equipment", title: "Комплект ручного инструмента для первичной отделки", unit: "item", formulaId: "stairs_complete_finishing_tool_sets_s2723", procurement: true, inputIds: ["finishing_exposed_surface_area_m2", "finishing_tool_set_coverage_m2_per_set"] }),
  finishingResource({ rowId: "service:concrete:stairs-finishing-quality-record", ordinal: 3, section: "Отделка поверхности", category: "service", title: "Запись контроля первичной отделки поверхности", unit: "document", formulaId: "stairs_complete_finishing_quality_records_s2723", procurement: false, informational: true, inputIds: ["finishing_quality_record_count"] }),
  finishingResource({ rowId: "service:concrete:stairs-finishing-boundary", ordinal: 4, section: "Отделка поверхности", category: "service", title: "Отдельное покрытие или ремонтный состав не выбран скрыто и добавляется только по проекту", unit: "service", formulaId: "stairs_complete_finishing_single_s2723", procurement: false, informational: true, inputIds: ["finishing_method"] }),
]);

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_PARAMETERS:
readonly PublishedParameter[] = Object.freeze([
  ...baseParameters,
  ...vibrationParameters,
  ...curingParameters,
  ...finishingParameters,
].map((parameter, ordinal) => ({ ...parameter, ordinal })));

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  ...baseFormulas,
  ...vibrationFormulas,
  ...curingFormulas,
  ...finishingFormulas,
]);

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  ...baseResources,
  ...vibrationResources,
  ...curingResources,
  ...finishingResources,
].map((resource, ordinal) => rehashResource({ ...resource, ordinal })));

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP =
  Object.freeze({
    contract: "rik-expo-app.s27-23.stairs-complete-installation-completeness.v1",
    sourceKind: "INDEPENDENT_COMPLEX_WORK_TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256:
      "4589262a4344c1126813fe98a8d40a822a1643c8fd5ef8ab10cecb652e039036",
    entries: [
      {
        semanticKey: "temporary-formwork",
        requiredRowIds: [
          "work:formwork:stairs-measured-contact-area",
          "equipment:formwork:stairs-facing",
          "equipment:formwork:stairs-framing",
          "material:formwork:stairs-risers-edges",
          "equipment:formwork:stairs-temporary-shoring",
          "material:formwork:stairs-release-agent",
          "material:formwork:stairs-consumables",
          "labor:formwork:stairs-assembly",
          "labor:formwork:stairs-alignment",
          "labor:formwork:stairs-stripping",
          "service:formwork:stairs-inspection",
        ],
      },
      {
        semanticKey: "reinforcement",
        requiredRowIds: [
          "material:reinforcement:steel-approved-schedule",
          "material:reinforcement:binding-wire",
          "material:reinforcement:spacer-chairs",
          "work:reinforcement:unload-store",
          "work:reinforcement:install-fix",
          "work:reinforcement:cover-control",
          "service:reinforcement:inspection",
          "service:reinforcement:mill-certificates",
          "delivery:reinforcement:steel",
        ],
      },
      {
        semanticKey: "concrete-supply-and-placement",
        requiredRowIds: [
          "material:concrete:ready-mix",
          "work:concrete:place",
          "equipment:concrete:pump",
          "service:concrete:acceptance-control",
          "delivery:concrete:ready-mix",
        ],
      },
      {
        semanticKey: "internal-vibration",
        requiredRowIds: [
          "concrete-stairs-vibration:02:operation:equipment-check",
          "concrete-stairs-vibration:02:equipment:electrical-protection",
          "concrete-stairs-vibration:02:equipment:extension-cable",
          "concrete-stairs-vibration:03:operation:internal-vibration",
          "concrete-stairs-vibration:03:labor:vibration-crew",
          "concrete-stairs-vibration:03:equipment:active-vibrator",
          "concrete-stairs-vibration:03:equipment:rental-shifts",
          "concrete-stairs-vibration:03:equipment:backup-vibrator",
          "concrete-stairs-vibration:03:material:electricity",
          "concrete-stairs-vibration:04:operation:cleaning",
          "concrete-stairs-vibration:04:labor:cleaning",
          "concrete-stairs-vibration:04:consumable:cleaning-water",
          "concrete-stairs-vibration:04:consumable:brush",
          "concrete-stairs-vibration:04:consumable:wipes",
          "concrete-stairs-vibration:04:equipment:wash-water-container",
          "concrete-stairs-vibration:05:control:quality-record",
          "concrete-stairs-vibration:06:delivery:mobilization",
          "concrete-stairs-vibration:06:delivery:wash-water",
        ],
      },
      {
        semanticKey: "primary-surface-finishing",
        requiredRowIds: [
          "work:concrete:stairs-primary-surface-finishing",
          "labor:concrete:stairs-primary-surface-finishing",
          "equipment:concrete:stairs-finishing-hand-tools",
          "service:concrete:stairs-finishing-quality-record",
          "service:concrete:stairs-finishing-boundary",
        ],
      },
      {
        semanticKey: "external-curing",
        requiredRowIds: [
          "work:concrete:stairs-external-curing",
          "material:concrete:curing-water",
          "material:concrete:wet-curing-covering",
          "service:concrete:stairs-curing-quality-control",
        ],
      },
    ],
  });

export function stairsCompleteInstallationStandardMissingRowsS2723(
  rowIds: ReadonlySet<string>,
): string[] {
  return STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((entry) => entry.requiredRowIds)
    .filter((rowId) => !rowIds.has(rowId));
}

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_NORMATIVE_PARAMETER_IDS =
  Object.freeze([
    "stairs_concrete_volume_m3",
    "placement_mix_design_or_project_specification_reference",
    "placement_placement_location",
    "finishing_exposed_surface_area_m2",
  ] as const);

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_METADATA = Object.freeze({
  source_id: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_ID,
  source_title:
    "Полная монолитная лестница: композиция укладки, армирования, опалубки, виброуплотнения, первичной отделки и внешнего ухода",
  source_authority:
    "NRMCA; ACI; RICS; Wacker Neuson; утверждённые проектные ведомости",
  source_document_version: "S27.23 composed successor R1",
  source_url: STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA.source_url,
  official_url: STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA.source_url,
  source_kind: "COMPOSED_COMPLEX_WORK_TECHNOLOGY_AND_PROJECT_SCHEDULES",
  exact_locator: [
    STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA.exact_locator,
    STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_METADATA.exact_locator,
    CONCRETE_SLAB_CURING_SOURCE_METADATA.exact_locator,
  ].join(" | "),
  definition_hash:
    "0a59cb6af856eba6728d4c5721a7e6a1d3c9b915dac812b7aa44b1f982632ee3",
  artifact_sha256:
    "0a59cb6af856eba6728d4c5721a7e6a1d3c9b915dac812b7aa44b1f982632ee3",
  effective_from: "2026-10-01",
  use_restriction:
    "COMPLEX_STANDARD_STAIRS_ONLY; PROJECT_SCHEDULES_REMAIN_EDITABLE; NO_HIDDEN_UNIVERSAL_PRODUCTIVITY",
  verified_at: "2026-10-01T00:00:00+06:00",
  universal_productivity_claimed: false,
  universal_consumption_claimed: false,
  quantity_basis:
    "SHARED_GEOMETRY_PLUS_APPROVED_PROJECT_SCHEDULES_AND_VISIBLE_REPLACEABLE_OPERATION_PROFILES",
});

function mapInput(
  input: Readonly<Record<string, InputValue>>,
  ids: Readonly<Record<string, string>>,
): Record<string, InputValue> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [ids[key] ?? key, value]));
}

function omitKeys(
  input: Readonly<Record<string, InputValue>>,
  keys: ReadonlySet<string>,
): Record<string, InputValue> {
  return Object.fromEntries(Object.entries(input).filter(([key]) => !keys.has(key)));
}

const BASE_ACCEPTANCE_OMIT = new Set([
  ...SELECTOR_PARAMETER_IDS,
  ...REPLACED_PLACEMENT_PARAMETER_IDS,
]);

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SHORT_INPUT = Object.freeze({
  stairs_concrete_volume_m3: 10,
});

export function stairsCompleteInstallationStandardAcceptanceInputS2723():
Readonly<Record<string, InputValue>> {
  const base = omitKeys(
    stairsCompleteInstallationAcceptanceInputR1("standard"),
    BASE_ACCEPTANCE_OMIT,
  );
  const vibration = mapInput(
    STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
    VIBRATION_IDS,
  );
  const curing = mapInput({
    cured_concrete_volume_m3: 10,
    exposed_curing_surface_area_m2: 48,
    concrete_mix_reference: String(base.placement_mix_design_or_project_specification_reference),
    curing_location: String(base.placement_placement_location),
    approved_external_curing_method: "WET_COVERING",
    curing_method_statement_reference: "MS-STAIRS-CURE-STANDARD-REV-A",
    curing_duration_day: 7,
    curing_worker_h: 12,
    curing_water_m3: 2,
    curing_water_source_reference: "WATER-STAIRS-CURE-STANDARD-REV-A",
    wet_covering_material_designation: "COVER-STAIRS-CURE-STANDARD-REV-A",
    wet_covering_area_m2: 52,
    application_equipment_required: false,
    quality_plan_reference: "QP-STAIRS-CURE-STANDARD-REV-A",
    quality_control_document_count: 1,
  }, CURING_IDS);
  const merged = {
    ...base,
    ...vibration,
    ...curing,
    stairs_concrete_volume_m3: 10,
    placement_mix_design_or_project_specification_reference:
      base.placement_mix_design_or_project_specification_reference,
    placement_placement_location: base.placement_placement_location,
    finishing_exposed_surface_area_m2: 48,
    ...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FINISHING_RUNTIME_INPUT,
  };
  return Object.freeze(omitKeys(merged, BASE_ACCEPTANCE_OMIT));
}

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_INPUT = Object.freeze({
  ...mapInput(
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT,
  VIBRATION_IDS,
  ),
  ...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FINISHING_RUNTIME_INPUT,
});

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_CLASSIFICATION =
  Object.freeze({
    ...Object.fromEntries(Object.entries(
      STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION,
    ).map(([parameterId, classification]) => [
      VIBRATION_IDS[parameterId] ?? parameterId,
      classification,
    ])),
    ...Object.fromEntries(Object.keys(
      STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FINISHING_RUNTIME_INPUT,
    ).map((parameterId) => [parameterId, "ASSUMPTION"])),
  } as Readonly<Record<string, "NORMATIVE" | "ASSUMPTION">>);

export const STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_SOURCE_IDS =
  Object.freeze({
    ...Object.fromEntries(Object.keys(
      STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_INPUT,
    ).map((parameterId) => [parameterId, [
      STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SOURCE_ID,
    ]])),
  } as Readonly<Record<string, readonly string[]>>);

function assertUnique(values: readonly string[], code: string): void {
  if (new Set(values).size !== values.length) throw new Error(code);
}
assertUnique(
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_PARAMETERS.map(
    (parameter) => parameter.parameter_id,
  ),
  "STAIRS_COMPLETE_STANDARD_S2723_PARAMETER_DUPLICATE",
);
assertUnique(
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FORMULAS.map(
    (formula) => formula.formula_id,
  ),
  "STAIRS_COMPLETE_STANDARD_S2723_FORMULA_DUPLICATE",
);
assertUnique(
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES.map(
    (resource) => resource.row_id,
  ),
  "STAIRS_COMPLETE_STANDARD_S2723_ROW_DUPLICATE",
);

export async function compileStairsCompleteInstallationStandardS2723(
  submittedParameters: Record<string, unknown>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      "canonical-estimate-compiler.stairs-complete-installation-standard-s27-23.v1",
    catalogId: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_CATALOG_ID,
    primaryMeasureParameterId: "stairs_concrete_volume_m3",
    parameterDefinitions: [...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_PARAMETERS],
    formulaDefinitions: [...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FORMULAS],
    resourceDefinitions: [...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES],
    submittedParameters,
    confirmedParameters: {
      ...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RUNTIME_INPUT,
    },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
