import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type Json = Record<string, unknown>;

export const FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID =
  "official_sp_kr_21_101_2024_fire_alarm_project_preparation_v1";
export const FIRE_ALARM_PROJECT_PREPARATION_NORM_ID =
  "norm:kg:sp_kr_21_101_2024:fire_alarm_project_preparation_direct_inputs:v1";

export const FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений»",
  source_authority:
    "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой)",
  source_document_version: "SP_KR_21_101_2024_EFFECTIVE_2024_07_05",
  definition_hash: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
  exact_locator:
    "СП КР 21-101:2024: §3, термины 6, 77 и 80; §§12.13–12.17 о зонах контроля и размещении извещателей; §§12.23–12.24 об адресации, шлейфах, доступе и технической документации изготовителя",
  use_restriction:
    "Источник задаёт техническую область подготовки проекта пожарной сигнализации, но не устанавливает универсальные нормы обследования, проектирования, согласования, количества помещений, разделов или трудоёмкости. Все количества, кроме известной защищаемой площади, принимаются только из утверждённого задания, обследования и проектного комплекта.",
  source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
  artifact_sha256: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
  effective_from: "2024-07-05",
});

export const FIRE_ALARM_PROJECT_PREPARATION_VARIANTS = Object.freeze({
  standard: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_prepare_standard",
    catalogVariant: "STANDARD_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Подготовка проекта пожарной сигнализации стандартной зоны",
    aliasesRu: ["подготовка проекта АПС", "подготовка исходных данных пожарной сигнализации"],
  }),
  technical_room: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_prepare_technical_room",
    catalogVariant: "TECHNICAL_ROOM_SEARCH_IDENTITY",
    canonicalNameRu: "Подготовка проекта пожарной сигнализации технического помещения",
    aliasesRu: ["подготовка проекта АПС техпомещения", "исходные данные АПС технического помещения"],
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_prepare_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Подготовка проекта пожарной сигнализации влажной зоны",
    aliasesRu: ["подготовка проекта АПС влажной зоны", "исходные данные АПС влажного помещения"],
  }),
});

export type FireAlarmProjectPreparationVariantKey =
  keyof typeof FIRE_ALARM_PROJECT_PREPARATION_VARIANTS;

const PARAMETER_SPECS = Object.freeze([
  ["protected_area_m2", "Защищаемая площадь для подготовки проекта", "decimal", "m2"],
  ["room_count", "Количество обследуемых помещений", "integer", "pcs"],
  ["fire_compartment_count", "Количество учитываемых пожарных отсеков", "integer", "pcs"],
  ["detector_point_count", "Количество точек в ведомости размещения извещателей", "integer", "pcs"],
  ["loop_count", "Количество шлейфов в проектной схеме", "integer", "circuit"],
  ["interface_count", "Количество внешних интерфейсов в задании", "integer", "pcs"],
  ["survey_labor_man_hour", "Трудоёмкость обследования и сбора исходных данных", "decimal", "man_hour"],
  ["design_labor_man_hour", "Трудоёмкость подготовки проектного комплекта", "decimal", "man_hour"],
  ["coordination_labor_man_hour", "Трудоёмкость координации проектных решений", "decimal", "man_hour"],
  ["input_data_register_document_count", "Количество реестров исходных данных", "integer", "document"],
  ["design_package_document_count", "Количество листов или документов проектного комплекта", "integer", "document"],
  ["coordination_protocol_document_count", "Количество протоколов координации", "integer", "document"],
] as const);

const KNOWN_SCOPE = new Set(["protected_area_m2"]);

export type FireAlarmProjectPreparationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string;
  title_ru: string;
  truth_metadata: Json;
};

export const FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS:
readonly FireAlarmProjectPreparationParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: {
      min: valueType === "integer" ? 1 : 0.000_001,
    },
    truth_metadata: {
      contract: "rik-expo-app.fire-alarm-project-preparation-variants-r1",
      semantic_parameter_key: `fire-alarm-project-preparation:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.has(parameterId)
        ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.has(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_DESIGN_BRIEF_SURVEY_OR_PROJECT_PACKAGE",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.has(parameterId)
          ? "Укажите подтверждённую защищаемую площадь без автоматического пересчёта в устройства или труд."
          : `${titleRu}: укажите прямое значение по заданию, акту обследования или проектному комплекту.`,
        source_role: KNOWN_SCOPE.has(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_PROTECTED_AREA"
          : "APPROVED_DESIGN_BRIEF_SURVEY_OR_PROJECT_PACKAGE",
        source_document: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID,
        source_locator: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.exact_locator,
        guide_version: "fire-alarm-project-preparation-r1",
        source_snapshot_hash: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.artifact_sha256,
        applicability:
          "Только обследование, сбор исходных данных и подготовка проектного комплекта АПС; монтаж, кабель, оборудование, пусконаладка и исполнительная документация исключены.",
        verified_at: "2026-09-25T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

function formula(formulaId: string, outputUnitId: string, parameterId: string) {
  const compiled = compileFormulaGraph(parameterId);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: parameterId,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const FIRE_ALARM_PROJECT_PREPARATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, , , unitId]) => formula(
    `fire_alarm_project_preparation_${parameterId}_v1`,
    unitId,
    parameterId,
  )),
);

const ROW_SPECS = Object.freeze([
  ["f09:fire_alarm_preparation_protected_area_survey", "Исходные данные", "service", "Обследование защищаемой площади и сбор исходных данных", false],
  ["f09:fire_alarm_preparation_room_inventory", "Исходные данные", "service", "Инвентаризация помещений для задания на пожарную сигнализацию", false],
  ["f09:fire_alarm_preparation_fire_compartment_review", "Исходные данные", "service", "Проверка пожарных отсеков для проектных решений АПС", false],
  ["f09:fire_alarm_preparation_detector_schedule", "Проектные ведомости", "service", "Подготовка ведомости размещения точек пожарных извещателей", true],
  ["f09:fire_alarm_preparation_loop_schedule", "Проектные ведомости", "service", "Подготовка проектной схемы шлейфов пожарной сигнализации", true],
  ["f09:fire_alarm_preparation_interface_schedule", "Проектные ведомости", "service", "Подготовка задания на внешние интерфейсы пожарной автоматики", true],
  ["f09:fire_alarm_preparation_survey_labor", "Труд", "construction_work", "Труд специалистов по обследованию и сбору исходных данных", false],
  ["f09:fire_alarm_preparation_design_labor", "Труд", "construction_work", "Труд специалистов по подготовке проектного комплекта АПС", false],
  ["f09:fire_alarm_preparation_coordination_labor", "Труд", "construction_work", "Труд по координации проектных решений пожарной автоматики", false],
  ["f09:fire_alarm_preparation_input_data_register", "Документация", "service", "Реестр исходных данных для проекта пожарной сигнализации", true],
  ["f09:fire_alarm_preparation_design_package", "Документация", "service", "Проектный документ или лист комплекта пожарной сигнализации", true],
  ["f09:fire_alarm_preparation_coordination_protocol", "Документация", "service", "Протокол координации проектных решений пожарной автоматики", true],
] as const);

const literalTrue = Object.freeze({ kind: "literal", value: true });

export const FIRE_ALARM_PROJECT_PREPARATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ([rowId, section, category, titleRu, procurementEligible], ordinal) => {
    const [parameterId, , , unitId] = PARAMETER_SPECS[ordinal];
    const formulaId = `fire_alarm_project_preparation_${parameterId}_v1`;
    const sourceRole = KNOWN_SCOPE.has(parameterId)
      ? "USER_SUPPLIED_OR_APPROVED_PROTECTED_AREA"
      : "APPROVED_DESIGN_BRIEF_SURVEY_OR_PROJECT_PACKAGE";
    const resourceGraph = {
      formulaId,
      normalizedUom: unitId,
      semanticOwnerId: `fire-alarm-project-preparation:${rowId}`,
      costOwner: "resource",
      scopeContextParameterIds: ["protected_area_m2"],
    };
    const sourceMetadata = {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole,
      normativeTrace: [{
        sourceId: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID,
        source_id: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID,
        normId: FIRE_ALARM_PROJECT_PREPARATION_NORM_ID,
        norm_id: FIRE_ALARM_PROJECT_PREPARATION_NORM_ID,
        normVersion: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.source_document_version,
        source_title: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.source_title,
        exact_locator: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.exact_locator,
        source_definition_hash: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.definition_hash,
        sourceRole,
      }],
      quantityBasis: KNOWN_SCOPE.has(parameterId)
        ? "KNOWN_PROTECTED_AREA"
        : "DIRECT_APPROVED_DESIGN_BRIEF_SURVEY_OR_PROJECT_INPUT",
      excludedUnownedAssumptions: [
        "area-to-detector, room, loop, interface, document or labor conversion",
        "classification suffix productivity factor",
        "installation, cable, device, panel, power-supply or commissioning scope",
        "invented price",
      ],
    };
    return {
      id: `resource-${rowId.replace(/:/gu, "-")}`,
      row_id: rowId,
      ordinal,
      section,
      category,
      title_ru: titleRu,
      unit_id: unitId,
      formula_id: formulaId,
      inclusion_ast: literalTrue,
      resource_graph: resourceGraph,
      procurement_eligible: procurementEligible,
      cost_owner_id: rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({
        rowId, ordinal, section, category, titleRu, unitId, formulaId,
        procurementEligible, resourceGraph, sourceMetadata,
      }),
    };
  },
));

export const FIRE_ALARM_PROJECT_PREPARATION_SHORT_INPUT = Object.freeze({
  protected_area_m2: 800,
});

export const FIRE_ALARM_PROJECT_PREPARATION_ACCEPTANCE_INPUT = Object.freeze({
  ...FIRE_ALARM_PROJECT_PREPARATION_SHORT_INPUT,
  room_count: 24,
  fire_compartment_count: 3,
  detector_point_count: 96,
  loop_count: 8,
  interface_count: 4,
  survey_labor_man_hour: 16,
  design_labor_man_hour: 60,
  coordination_labor_man_hour: 8,
  input_data_register_document_count: 1,
  design_package_document_count: 12,
  coordination_protocol_document_count: 2,
});

export function resolveFireAlarmProjectPreparationVariant(
  variantKey: string,
): (typeof FIRE_ALARM_PROJECT_PREPARATION_VARIANTS)[FireAlarmProjectPreparationVariantKey] {
  if (!Object.prototype.hasOwnProperty.call(
    FIRE_ALARM_PROJECT_PREPARATION_VARIANTS,
    variantKey,
  )) {
    throw new Error(`FIRE_ALARM_PROJECT_PREPARATION_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return FIRE_ALARM_PROJECT_PREPARATION_VARIANTS[
    variantKey as FireAlarmProjectPreparationVariantKey
  ];
}

export function fireAlarmProjectPreparationCompletenessMap(
  variantKey: FireAlarmProjectPreparationVariantKey,
) {
  const variant = FIRE_ALARM_PROJECT_PREPARATION_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PROJECT_SYSTEM",
    generatedFromCurrentRows: false,
    evidenceSha256: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.artifact_sha256,
    evidenceReferences: [
      FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA.official_url,
      "approved fire-alarm design brief",
      "approved site survey and coordinated project package",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: ROW_SPECS.map(([rowId, , category, titleRu], ordinal) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category,
      specification: titleRu,
      condition: "fire_alarm_project_preparation_selected",
      sourceId: FIRE_ALARM_PROJECT_PREPARATION_SOURCE_ID,
      unitId: PARAMETER_SPECS[ordinal][3],
      quantityRule: ordinal === 0
        ? "KNOWN_PROTECTED_AREA"
        : "DIRECT_APPROVED_DESIGN_BRIEF_SURVEY_OR_PROJECT_INPUT",
      detailPrinciple:
        "PROJECT_PREPARATION_ONLY_NO_INSTALLATION_MATERIAL_OR_COMMISSIONING_SCOPE",
      priceRelation: "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId: `fire_alarm_project_preparation_${PARAMETER_SPECS[ordinal][0]}_v1`,
      resolution: { kind: "ROW", rowId },
    })),
  });
}

export async function compileFireAlarmProjectPreparationVariantR1(
  variantKey: FireAlarmProjectPreparationVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = FIRE_ALARM_PROJECT_PREPARATION_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`FIRE_ALARM_PROJECT_PREPARATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      `canonical-estimate-compiler.fire-alarm-project-preparation-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "protected_area_m2",
    parameterDefinitions: [...FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_PROJECT_PREPARATION_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_PROJECT_PREPARATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 16,
    hashJson: async (value) => JSON.stringify(value),
  });
}
