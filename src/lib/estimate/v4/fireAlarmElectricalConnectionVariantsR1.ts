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

export const FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS = Object.freeze({
  high_load: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_connect_high_load",
    catalogVariant: "HIGH_LOAD_SEARCH_IDENTITY",
    canonicalNameRu: "Подключение электрических проводок пожарной сигнализации — высокая нагрузка",
  }),
  standard: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_connect_standard",
    catalogVariant: "STANDARD_SEARCH_IDENTITY",
    canonicalNameRu: "Подключение электрических проводок пожарной сигнализации",
  }),
  technical_room: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_connect_technical_room",
    catalogVariant: "TECHNICAL_ROOM_SEARCH_IDENTITY",
    canonicalNameRu: "Подключение электрических проводок пожарной сигнализации — техническое помещение",
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_connect_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Подключение электрических проводок пожарной сигнализации — влажная зона",
  }),
});

export type FireAlarmElectricalConnectionVariantKey =
  keyof typeof FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS;

export const FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID =
  "official_krerm_11_2015_table_11_08_001_electrical_connections_v1";
export const FIRE_ALARM_ELECTRICAL_CONNECTION_NORM_ID =
  "norm:kg:krerm_11_2015:11_08_001:electrical_connection_ends:v1";
export const FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256 =
  "bc7646110a1a29815881ee2cffe33e2288e3bde7a3183c2f3daa1e9f109e6550";

export const FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA = Object.freeze({
  source_title: "КРЕРм №11 «Приборы, средства автоматизации и вычислительной техники»",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "KRERM_11_2015_EFFECTIVE_2016_01_01",
  definition_hash: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
  exact_locator:
    "КРЕРм 11-08-001, PDF page 45: присоединение к приборам электрических проводок; измеритель 100 концов; варианты 01–04 и опубликованные нормы ресурсов",
  use_restriction:
    "Применять только к присоединению подтверждённого количества концов электрических проводок к техническим средствам автоматизации выбранным способом. Прокладка кабеля, поставка приборов, разделка вне состава таблицы, испытания системы и рыночные цены не включаются.",
  source_kind: "OFFICIAL_RESOURCE_RATE",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/369/show",
  artifact_sha256: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
  effective_from: "2016-01-01",
});

export const FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS = Object.freeze({
  SCREW_WITH_LUG: Object.freeze({
    normCode: "11-08-001-01",
    titleRu: "Под винт с оконцеванием наконечником",
    laborGrade: "4,3",
    laborRate: 11.3,
  }),
  SCREW_WITH_RING: Object.freeze({
    normCode: "11-08-001-02",
    titleRu: "Под винт с изготовлением колец",
    laborGrade: "4,1",
    laborRate: 9.27,
  }),
  SCREW_TINNED_NO_RING: Object.freeze({
    normCode: "11-08-001-03",
    titleRu: "Под винт без изготовления колец с обслуживанием",
    laborGrade: "4,4",
    laborRate: 10.3,
  }),
  SOLDERED: Object.freeze({
    normCode: "11-08-001-04",
    titleRu: "Пайкой",
    laborGrade: "4,4",
    laborRate: 10.3,
  }),
});

type ConnectionMethod = keyof typeof FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS;
const CONNECTION_METHODS = Object.keys(
  FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS,
) as ConnectionMethod[];
const NON_SOLDERED_METHODS: ConnectionMethod[] = [
  "SCREW_WITH_LUG",
  "SCREW_WITH_RING",
  "SCREW_TINNED_NO_RING",
];

export const FIRE_ALARM_ELECTRICAL_CONNECTION_PARAMETERS:
readonly (CanonicalEstimateParameterDefinition & Json)[] = Object.freeze([
  {
    parameter_id: "connection_end_count",
    ordinal: 0,
    value_type: "integer",
    unit_id: "pcs",
    title_ru: "Количество присоединяемых концов электрических проводок",
    required: true,
    default_value: null,
    constraints_json: { min: 1 },
    truth_metadata: {
      contract: "rik-expo-app.fire-alarm-electrical-connection-r1",
      semantic_parameter_key: "fire-alarm-connection:connection-end-count",
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: "APPROVED_CONNECTION_OR_TERMINATION_SCHEDULE",
      preliminary_compilation_allowed: true,
      source_confirmation_required: true,
      hidden_default_forbidden: true,
      guide: {
        guide_kind: "MEASUREMENT_RULE",
        guide_short_ru:
          "Укажите число отдельных концов жил/проводников, реально присоединяемых к приборам или клеммам; не длину кабеля и не число приборов.",
        source_role: "APPROVED_CONNECTION_OR_TERMINATION_SCHEDULE",
        source_document: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
        source_locator: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA.exact_locator,
        guide_version: "krerm-11-08-001-fire-alarm-connection-r1",
        source_snapshot_hash: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
        applicability:
          "Только подтверждённое количество присоединяемых концов электрических проводок к техническим средствам автоматизации.",
        verified_at: "2026-09-23T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      synthetic: false,
    },
  },
  {
    parameter_id: "connection_method",
    ordinal: 1,
    value_type: "enum",
    unit_id: null,
    title_ru: "Способ присоединения проводок",
    required: true,
    default_value: null,
    constraints_json: { values: CONNECTION_METHODS },
    truth_metadata: {
      contract: "rik-expo-app.fire-alarm-electrical-connection-r1",
      semantic_parameter_key: "fire-alarm-connection:connection-method",
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: "APPROVED_CONNECTION_DETAIL_OR_MANUFACTURER_TERMINAL_REQUIREMENT",
      preliminary_compilation_allowed: true,
      source_confirmation_required: true,
      hidden_default_forbidden: true,
      guide: {
        guide_kind: "ENUM_DECISION_RULE",
        guide_short_ru:
          "Выберите способ по рабочей документации и требованиям клемм прибора: наконечник, кольцо, обслуживание без кольца или пайка.",
        source_role: "APPROVED_CONNECTION_DETAIL_OR_MANUFACTURER_TERMINAL_REQUIREMENT",
        source_document: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
        source_locator: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA.exact_locator,
        guide_version: "krerm-11-08-001-fire-alarm-connection-r1",
        source_snapshot_hash: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
        applicability:
          "Выбор одной из четырёх опубликованных колонок КРЕРм 11-08-001 по рабочей документации и типу клеммы.",
        verified_at: "2026-09-23T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      synthetic: false,
    },
  },
]);

function formula(formulaId: string, outputUnitId: string, ratePer100Ends: number) {
  const expression = `connection_end_count / 100 * ${ratePer100Ends}`;
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

const LABOR_FORMULAS = CONNECTION_METHODS.map((method) => formula(
  `fire_alarm_connection_labor_${method.toLowerCase()}_v1`,
  "man_hour",
  FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS[method].laborRate,
));

export const FIRE_ALARM_ELECTRICAL_CONNECTION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  ...LABOR_FORMULAS,
  formula("fire_alarm_connection_ethanol_regular_v1", "kg", 0.029),
  formula("fire_alarm_connection_ethanol_soldered_v1", "kg", 0.056),
  formula("fire_alarm_connection_lacquer_soldered_v1", "t", 0.00003),
  formula("fire_alarm_connection_dichloroethane_v1", "t", 0.00002),
  formula("fire_alarm_connection_rosin_regular_v1", "kg", 0.019),
  formula("fire_alarm_connection_rosin_soldered_v1", "kg", 0.032),
  formula("fire_alarm_connection_marking_tags_v1", "100_pcs", 1),
  formula("fire_alarm_connection_pvc_tube_v1", "kg", 0.04),
  formula("fire_alarm_connection_solder_regular_v1", "kg", 0.077),
  formula("fire_alarm_connection_solder_soldered_v1", "kg", 0.136),
]);

type Operation = Readonly<{
  operationId: string;
  rowId: string;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  procurementEligible: boolean;
  condition?: Json;
  normCodes: readonly string[];
}>;

const equals = (value: ConnectionMethod): Json => ({
  kind: "equals",
  parameterId: "connection_method",
  value,
});
const inMethods = (values: readonly ConnectionMethod[]): Json => ({
  kind: "in",
  parameterId: "connection_method",
  values,
});
const literalTrue: Json = Object.freeze({ kind: "literal", value: true });

const OPERATIONS: readonly Operation[] = Object.freeze([
  ...CONNECTION_METHODS.map((method): Operation => {
    const spec = FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS[method];
    return {
      operationId: `connection_labor_${method.toLowerCase()}`,
      rowId: `f09:fire_alarm_connection_labor_${method.toLowerCase()}`,
      section: "Работы по подключению",
      category: "labor",
      titleRu: `Присоединение проводок ${spec.titleRu.toLocaleLowerCase("ru-RU")} — монтажник разряда ${spec.laborGrade}`,
      unitId: "man_hour",
      formulaId: `fire_alarm_connection_labor_${method.toLowerCase()}_v1`,
      procurementEligible: false,
      condition: equals(method),
      normCodes: [spec.normCode],
    };
  }),
  { operationId: "ethanol_regular", rowId: "f09:fire_alarm_connection_ethanol_regular", section: "Нормативные материалы", category: "material", titleRu: "Спирт этиловый ректификованный технический, сорт I", unitId: "kg", formulaId: "fire_alarm_connection_ethanol_regular_v1", procurementEligible: true, condition: inMethods(NON_SOLDERED_METHODS), normCodes: ["11-08-001-01", "11-08-001-02", "11-08-001-03"] },
  { operationId: "ethanol_soldered", rowId: "f09:fire_alarm_connection_ethanol_soldered", section: "Нормативные материалы", category: "material", titleRu: "Спирт этиловый ректификованный технический, сорт I — соединение пайкой", unitId: "kg", formulaId: "fire_alarm_connection_ethanol_soldered_v1", procurementEligible: true, condition: equals("SOLDERED"), normCodes: ["11-08-001-04"] },
  { operationId: "lacquer_soldered", rowId: "f09:fire_alarm_connection_lacquer_soldered", section: "Нормативные материалы", category: "material", titleRu: "Лак нитроцеллюлозный НЦ-62", unitId: "t", formulaId: "fire_alarm_connection_lacquer_soldered_v1", procurementEligible: true, condition: equals("SOLDERED"), normCodes: ["11-08-001-04"] },
  { operationId: "dichloroethane", rowId: "f09:fire_alarm_connection_dichloroethane", section: "Нормативные материалы", category: "material", titleRu: "Дихлорэтан технический, сорт I", unitId: "t", formulaId: "fire_alarm_connection_dichloroethane_v1", procurementEligible: true, normCodes: CONNECTION_METHODS.map((method) => FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS[method].normCode) },
  { operationId: "rosin_regular", rowId: "f09:fire_alarm_connection_rosin_regular", section: "Нормативные материалы", category: "material", titleRu: "Канифоль сосновая", unitId: "kg", formulaId: "fire_alarm_connection_rosin_regular_v1", procurementEligible: true, condition: inMethods(NON_SOLDERED_METHODS), normCodes: ["11-08-001-01", "11-08-001-02", "11-08-001-03"] },
  { operationId: "rosin_soldered", rowId: "f09:fire_alarm_connection_rosin_soldered", section: "Нормативные материалы", category: "material", titleRu: "Канифоль сосновая — соединение пайкой", unitId: "kg", formulaId: "fire_alarm_connection_rosin_soldered_v1", procurementEligible: true, condition: equals("SOLDERED"), normCodes: ["11-08-001-04"] },
  { operationId: "marking_tags", rowId: "f09:fire_alarm_connection_marking_tags", section: "Нормативные материалы", category: "material", titleRu: "Бирки маркировочные пластмассовые", unitId: "100_pcs", formulaId: "fire_alarm_connection_marking_tags_v1", procurementEligible: true, normCodes: CONNECTION_METHODS.map((method) => FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS[method].normCode) },
  { operationId: "pvc_tube", rowId: "f09:fire_alarm_connection_pvc_tube", section: "Нормативные материалы", category: "material", titleRu: "Трубка полихлорвиниловая", unitId: "kg", formulaId: "fire_alarm_connection_pvc_tube_v1", procurementEligible: true, normCodes: CONNECTION_METHODS.map((method) => FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS[method].normCode) },
  { operationId: "solder_regular", rowId: "f09:fire_alarm_connection_solder_regular", section: "Нормативные материалы", category: "material", titleRu: "Припой оловянно-свинцовый бессурьмянистый ПОС61", unitId: "kg", formulaId: "fire_alarm_connection_solder_regular_v1", procurementEligible: true, condition: inMethods(NON_SOLDERED_METHODS), normCodes: ["11-08-001-01", "11-08-001-02", "11-08-001-03"] },
  { operationId: "solder_soldered", rowId: "f09:fire_alarm_connection_solder_soldered", section: "Нормативные материалы", category: "material", titleRu: "Припой оловянно-свинцовый бессурьмянистый ПОС61 — соединение пайкой", unitId: "kg", formulaId: "fire_alarm_connection_solder_soldered_v1", procurementEligible: true, condition: equals("SOLDERED"), normCodes: ["11-08-001-04"] },
]);

function resource(operation: Operation, ordinal: number): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: operation.formulaId,
    normalizedUom: operation.unitId,
    semanticOwnerId: `fire-alarm-electrical-connection:${operation.operationId}`,
    costOwner: "resource",
    primaryMeasureParameterId: "connection_end_count",
    quantityBasis: "KRERM_11_08_001_RATE_PER_100_CONNECTION_ENDS",
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_RESOURCE_RATE",
    normativeTrace: operation.normCodes.map((normCode) => ({
      sourceId: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
      source_id: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
      normId: FIRE_ALARM_ELECTRICAL_CONNECTION_NORM_ID,
      norm_id: FIRE_ALARM_ELECTRICAL_CONNECTION_NORM_ID,
      normCode,
      normVersion: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA.source_document_version,
      source_title: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA.source_title,
      exact_locator: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA.exact_locator,
      source_definition_hash: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
    })),
    quantityBasis: "PUBLISHED_RATE_PER_100_CONFIRMED_CONNECTION_ENDS",
    excludedAdjacentScope: [
      "fire-alarm cable supply or route installation",
      "fire-alarm device or control-panel supply and installation",
      "system commissioning, cause-effect testing and protocols",
      "hidden factor from high-load, area, room or wet-zone catalog suffix",
      "market price",
    ],
  };
  return {
    id: `resource-${operation.rowId.replace(/:/gu, "-")}`,
    row_id: operation.rowId,
    ordinal,
    section: operation.section,
    category: operation.category,
    title_ru: operation.titleRu,
    unit_id: operation.unitId,
    formula_id: operation.formulaId,
    inclusion_ast: operation.condition ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: operation.procurementEligible,
    cost_owner_id: operation.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ operation, resourceGraph, sourceMetadata }),
  };
}

export const FIRE_ALARM_ELECTRICAL_CONNECTION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  OPERATIONS.map((operation, ordinal) => resource(operation, ordinal)),
);

export function fireAlarmElectricalConnectionCompletenessMap(
  variantKey: FireAlarmElectricalConnectionVariantKey,
) {
  const variant = FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "KRERM_11_08_001",
    generatedFromCurrentRows: false,
    evidenceSha256: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
    evidenceReferences: [
      FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA.official_url,
      "КРЕРм 11-08-001, PDF page 45",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: OPERATIONS.map((operation) => ({
      operationId: operation.operationId,
      expectedResourceId: `required-operation:${operation.operationId}`,
      category: operation.category,
      specification: operation.titleRu,
      condition: operation.condition ?? "all_connection_methods",
      sourceId: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
      unitId: operation.unitId,
      quantityRule: "PUBLISHED_RATE_PER_100_CONFIRMED_CONNECTION_ENDS",
      detailPrinciple: "CONNECTION_ONLY_ADJACENT_INSTALLATION_AND_COMMISSIONING_EXCLUDED",
      priceRelation: "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId: operation.formulaId,
      resolution: { kind: "ROW", rowId: operation.rowId },
    })),
  });
}

export function resolveFireAlarmElectricalConnectionVariant(variantKey: string) {
  if (!Object.prototype.hasOwnProperty.call(FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS, variantKey)) {
    throw new Error(`FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS[
    variantKey as FireAlarmElectricalConnectionVariantKey
  ];
}

export const FIRE_ALARM_ELECTRICAL_CONNECTION_SHORT_INPUT = Object.freeze({
  connection_end_count: 100,
});
export const FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT = Object.freeze({
  connection_end_count: 100,
  connection_method: "SCREW_WITH_LUG",
});

export async function compileFireAlarmElectricalConnectionVariantR1(
  variantKey: FireAlarmElectricalConnectionVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`FIRE_ALARM_ELECTRICAL_CONNECTION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: `canonical-estimate-compiler.fire-alarm-electrical-connection-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "connection_end_count",
    parameterDefinitions: [...FIRE_ALARM_ELECTRICAL_CONNECTION_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_ELECTRICAL_CONNECTION_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_ELECTRICAL_CONNECTION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
