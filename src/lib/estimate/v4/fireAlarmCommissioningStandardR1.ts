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

export const FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_ID =
  "canonical-work:base:electrical_interior_fire_alarm_commission_standard";
export const FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID =
  "official_sp_kr_21_101_2024_fire_alarm_commissioning_v1";
export const FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID =
  "norm:kg:sp_kr_21_101_2024:fire_alarm_commissioning_project_inputs:v1";

export const FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений»",
  source_authority:
    "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой)",
  source_document_version: "SP_KR_21_101_2024_EFFECTIVE_2024_07_05",
  definition_hash: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
  exact_locator:
    "СП КР 21-101:2024: §3, термины 6, 77 и 80; §§12.13–12.17 о зонах контроля, адресных шлейфах, количестве и контроле извещателей; §§12.23–12.24 об адресации, отдельных шлейфах, доступе и соблюдении технической документации изготовителя",
  use_restriction:
    "Источник подтверждает техническую область и границы системной проверки, но не устанавливает универсальную производительность, трудоёмкость, время приборов или количество программных сценариев. Количества и часы принимаются только из утверждённой рабочей документации, адресной ведомости, матрицы причинно-следственных связей, документации изготовителя и программы пусконаладки.",
  source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
  artifact_sha256: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
  effective_from: "2024-07-05",
});

const PARAMETER_SPECS = Object.freeze([
  ["device_point_count", "Количество адресных точек для системной идентификации", "integer", "pcs"],
  ["panel_count", "Количество приёмно-контрольных приборов для настройки", "integer", "pcs"],
  ["loop_count", "Количество шлейфов для проверки контроля неисправностей", "integer", "circuit"],
  ["cause_effect_scenario_count", "Количество сценариев матрицы причинно-следственных связей", "integer", "test"],
  ["interface_count", "Количество внешних интерфейсов для системной проверки", "integer", "pcs"],
  ["commissioning_labor_man_hour", "Трудоёмкость системной пусконаладки", "decimal", "man_hour"],
  ["test_equipment_machine_hour", "Время применения измерительного и тестового оборудования", "decimal", "machine_hour"],
  ["commissioning_protocol_document_count", "Количество итоговых протоколов пусконаладки", "integer", "document"],
] as const);

const KNOWN_SCOPE = new Set(["device_point_count"]);

export type FireAlarmCommissioningStandardParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string;
  title_ru: string;
  truth_metadata: Json;
};

export const FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS:
readonly FireAlarmCommissioningStandardParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: { min: valueType === "integer" ? 1 : 0.000_001 },
    truth_metadata: {
      contract: "rik-expo-app.fire-alarm-commissioning-standard-r1",
      semantic_parameter_key: `fire-alarm-commissioning:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.has(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.has(parameterId)
        ? "KNOWN_FIRE_ALARM_POINT_SCOPE"
        : "APPROVED_FIRE_ALARM_PROJECT_OR_COMMISSIONING_PROGRAM",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.has(parameterId)
          ? "Укажите подтверждённое количество адресных точек по адресной ведомости; это не количество поставляемых извещателей."
          : `${titleRu}: укажите прямое значение по проекту, матрице причинно-следственных связей, документации изготовителя или программе пусконаладки.`,
        source_role: KNOWN_SCOPE.has(parameterId)
          ? "APPROVED_FIRE_ALARM_ADDRESS_SCHEDULE"
          : "APPROVED_PROJECT_MANUFACTURER_DOCUMENTATION_OR_COMMISSIONING_PROGRAM",
        source_document: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
        source_locator: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.exact_locator,
        guide_version: "fire-alarm-commissioning-standard-r1",
        source_snapshot_hash: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.artifact_sha256,
        applicability:
          "Только системная пусконаладка пожарной сигнализации: конфигурация, отображение адресных точек, контроль шлейфов, сценарии, интерфейсы и итоговые протоколы. Монтаж устройств и закупка материалов исключены.",
        verified_at: "2026-09-23T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("fire_alarm_system_point_identification_count_v1", "test", "device_point_count"),
  formula("fire_alarm_panel_configuration_count_v1", "pcs", "panel_count"),
  formula("fire_alarm_loop_fault_monitoring_test_count_v1", "test", "loop_count"),
  formula("fire_alarm_cause_effect_test_count_v1", "test", "cause_effect_scenario_count"),
  formula("fire_alarm_external_interface_test_count_v1", "test", "interface_count"),
  formula("fire_alarm_commissioning_labor_time_v1", "man_hour", "commissioning_labor_man_hour"),
  formula("fire_alarm_test_equipment_time_v1", "machine_hour", "test_equipment_machine_hour"),
  formula("fire_alarm_commissioning_protocol_count_v1", "document", "commissioning_protocol_document_count"),
]);

const INDEPENDENT_REQUIRED_OPERATIONS = Object.freeze([
  ["system_point_identification", "f09:fire_alarm_system_point_identification", "test", "fire_alarm_system_point_identification_count_v1"],
  ["panel_configuration", "f09:fire_alarm_panel_configuration", "pcs", "fire_alarm_panel_configuration_count_v1"],
  ["loop_fault_monitoring_test", "f09:fire_alarm_loop_fault_monitoring_test", "test", "fire_alarm_loop_fault_monitoring_test_count_v1"],
  ["cause_effect_test", "f09:fire_alarm_cause_effect_test", "test", "fire_alarm_cause_effect_test_count_v1"],
  ["external_interface_test", "f09:fire_alarm_external_interface_test", "test", "fire_alarm_external_interface_test_count_v1"],
  ["commissioning_labor", "f09:fire_alarm_commissioning_labor", "man_hour", "fire_alarm_commissioning_labor_time_v1"],
  ["test_equipment", "f09:fire_alarm_test_equipment", "machine_hour", "fire_alarm_test_equipment_time_v1"],
  ["commissioning_protocol", "f09:fire_alarm_commissioning_protocol", "document", "fire_alarm_commissioning_protocol_count_v1"],
] as const);

export const FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP =
Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "PROJECT_SYSTEM",
  generatedFromCurrentRows: false,
  evidenceSha256: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.artifact_sha256,
  evidenceReferences: [
    FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.official_url,
    "approved fire-alarm address schedule",
    "approved cause-effect matrix and interface schedule",
    "manufacturer documentation and commissioning program",
  ],
  entries: INDEPENDENT_REQUIRED_OPERATIONS.map(
    ([operationId, rowId, unitId, formulaId]) => ({
      operationId,
      expectedResourceId: `required-operation:${operationId}`,
      category: operationId === "test_equipment" ? "equipment" : "commissioning",
      specification: "Direct approved project or commissioning-program input; no universal rate",
      condition: "fire_alarm_system_commissioning_selected",
      sourceId: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
      unitId,
      quantityRule: "DIRECT_APPROVED_PROJECT_INPUT",
      detailPrinciple: "SYSTEM_LEVEL_NO_DEVICE_INSTALLATION_OR_MATERIAL_PROCUREMENT",
      priceRelation: "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId,
      resolution: { kind: "ROW", rowId },
    }),
  ),
});

const literalTrue = Object.freeze({ kind: "literal", value: true });

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  procurementEligible: boolean;
  sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `fire-alarm-commissioning:${input.rowId}`,
    costOwner: "resource",
    scopeContextParameterIds: ["device_point_count"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
      source_id: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_ID,
      normId: FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID,
      norm_id: FIRE_ALARM_COMMISSIONING_STANDARD_NORM_ID,
      normVersion: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.source_document_version,
      source_title: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.source_title,
      exact_locator: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.exact_locator,
      source_definition_hash: FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    quantityBasis: "DIRECT_APPROVED_PROJECT_OR_COMMISSIONING_PROGRAM_INPUT",
    excludedUnownedAssumptions: [
      "universal productivity or labor rate",
      "universal test-equipment time",
      "automatic cause-effect scenario or interface count",
      "detector installation or device-level activation already owned by installation profiles",
      "fire-alarm cable, conduit, detector, control-panel product, sounder or power-supply material",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    rowId: "f09:fire_alarm_system_point_identification",
    ordinal: 0,
    section: "Системные проверки",
    category: "construction_work",
    titleRu: "Системная идентификация и проверка отображения адресной точки пожарной сигнализации",
    unitId: "test",
    formulaId: "fire_alarm_system_point_identification_count_v1",
    procurementEligible: false,
    sourceRole: "APPROVED_FIRE_ALARM_ADDRESS_SCHEDULE",
  }),
  resource({
    rowId: "f09:fire_alarm_panel_configuration",
    ordinal: 1,
    section: "Настройка системы",
    category: "construction_work",
    titleRu: "Настройка конфигурации приёмно-контрольного прибора пожарной сигнализации",
    unitId: "pcs",
    formulaId: "fire_alarm_panel_configuration_count_v1",
    procurementEligible: false,
    sourceRole: "APPROVED_PROJECT_AND_MANUFACTURER_DOCUMENTATION",
  }),
  resource({
    rowId: "f09:fire_alarm_loop_fault_monitoring_test",
    ordinal: 2,
    section: "Системные проверки",
    category: "construction_work",
    titleRu: "Проверка целостности шлейфа и системного контроля неисправностей",
    unitId: "test",
    formulaId: "fire_alarm_loop_fault_monitoring_test_count_v1",
    procurementEligible: false,
    sourceRole: "APPROVED_FIRE_ALARM_LOOP_SCHEME_AND_MANUFACTURER_DOCUMENTATION",
  }),
  resource({
    rowId: "f09:fire_alarm_cause_effect_test",
    ordinal: 3,
    section: "Системные проверки",
    category: "construction_work",
    titleRu: "Проверка сценария матрицы причинно-следственных связей пожарной автоматики",
    unitId: "test",
    formulaId: "fire_alarm_cause_effect_test_count_v1",
    procurementEligible: false,
    sourceRole: "APPROVED_CAUSE_EFFECT_MATRIX",
  }),
  resource({
    rowId: "f09:fire_alarm_external_interface_test",
    ordinal: 4,
    section: "Системные проверки",
    category: "construction_work",
    titleRu: "Системная проверка внешнего интерфейса пожарной автоматики",
    unitId: "test",
    formulaId: "fire_alarm_external_interface_test_count_v1",
    procurementEligible: false,
    sourceRole: "APPROVED_INTERFACE_SCHEDULE_AND_COMMISSIONING_PROGRAM",
  }),
  resource({
    rowId: "f09:fire_alarm_commissioning_labor",
    ordinal: 5,
    section: "Труд",
    category: "construction_work",
    titleRu: "Труд специалистов по системной пусконаладке пожарной сигнализации",
    unitId: "man_hour",
    formulaId: "fire_alarm_commissioning_labor_time_v1",
    procurementEligible: false,
    sourceRole: "APPROVED_COMMISSIONING_WORK_PLAN",
  }),
  resource({
    rowId: "f09:fire_alarm_test_equipment",
    ordinal: 6,
    section: "Оборудование",
    category: "equipment",
    titleRu: "Измерительное и тестовое оборудование для системной пусконаладки",
    unitId: "machine_hour",
    formulaId: "fire_alarm_test_equipment_time_v1",
    procurementEligible: true,
    sourceRole: "APPROVED_COMMISSIONING_METHOD_STATEMENT",
  }),
  resource({
    rowId: "f09:fire_alarm_commissioning_protocol",
    ordinal: 7,
    section: "Документация",
    category: "service",
    titleRu: "Итоговый протокол системной пусконаладки пожарной сигнализации",
    unitId: "document",
    formulaId: "fire_alarm_commissioning_protocol_count_v1",
    procurementEligible: true,
    sourceRole: "APPROVED_COMMISSIONING_PROGRAM_AND_QA_REQUIREMENTS",
  }),
]);

export const FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT = Object.freeze({
  device_point_count: 100,
});

export const FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT = Object.freeze({
  ...FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT,
  panel_count: 2,
  loop_count: 8,
  cause_effect_scenario_count: 12,
  interface_count: 5,
  commissioning_labor_man_hour: 96,
  test_equipment_machine_hour: 24,
  commissioning_protocol_document_count: 4,
});

export async function compileFireAlarmCommissioningStandardR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_ID;
  if (catalogId !== FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_ID) {
    throw new Error(`FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.fire-alarm-commissioning-standard-r1",
    catalogId,
    primaryMeasureParameterId: "device_point_count",
    parameterDefinitions: [...FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
