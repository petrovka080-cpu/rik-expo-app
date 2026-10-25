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

export const FIRE_ALARM_LINE_MARKING_VARIANTS = Object.freeze({
  high_load: Object.freeze({ catalogId: "canonical-work:base:electrical_interior_fire_alarm_mark_high_load", catalogVariant: "HIGH_LOAD_SEARCH_IDENTITY", canonicalNameRu: "Маркировка линий пожарной сигнализации — высокая нагрузка" }),
  standard: Object.freeze({ catalogId: "canonical-work:base:electrical_interior_fire_alarm_mark_standard", catalogVariant: "STANDARD_SEARCH_IDENTITY", canonicalNameRu: "Маркировка линий пожарной сигнализации" }),
  technical_room: Object.freeze({ catalogId: "canonical-work:base:electrical_interior_fire_alarm_mark_technical_room", catalogVariant: "TECHNICAL_ROOM_SEARCH_IDENTITY", canonicalNameRu: "Маркировка линий пожарной сигнализации — техническое помещение" }),
  wet_zone: Object.freeze({ catalogId: "canonical-work:base:electrical_interior_fire_alarm_mark_wet_zone", catalogVariant: "WET_ZONE_SEARCH_IDENTITY", canonicalNameRu: "Маркировка линий пожарной сигнализации — влажная зона" }),
});

export type FireAlarmLineMarkingVariantKey = keyof typeof FIRE_ALARM_LINE_MARKING_VARIANTS;

export const FIRE_ALARM_LINE_MARKING_SOURCE_ID =
  "official_sp_kr_21_101_2024_fire_alarm_line_marking_project_schedule_v1";
export const FIRE_ALARM_LINE_MARKING_NORM_ID =
  "norm:kg:sp_kr_21_101_2024:12_60:fire_alarm_line_marking_project_inputs:v1";
export const FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256 =
  "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c";

export const FIRE_ALARM_LINE_MARKING_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 21-101:2024 и утверждённый кабельный журнал/схема маркировки пожарной сигнализации",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики; проектная организация пожарной автоматики",
  source_document_version: "SP_KR_21_101_2024_EFFECTIVE_2024_07_05_PLUS_APPROVED_MARKING_SCHEDULE",
  definition_hash: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 21-101:2024 §12.60, printed page 60 / PDF page 168: выделенные свободные пары группируются и маркируются красной краской; фактические объекты, способ, материал, труд и контроль — только по утверждённому кабельному журналу и схеме маркировки",
  use_restriction:
    "Пункт 12.60 не является универсальной нормой расхода бирок, краски или труда для любой линии. Известное число маркируемых объектов определяет только объём операции; материал маркировки, его количество, труд и контроль принимаются прямыми проектными значениями без коэффициента зоны.",
  source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
  artifact_sha256: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
  effective_from: "2024-07-05",
});

const MARKING_SCOPES = [
  "CABLE_OR_WIRE",
  "RESERVE_PAIR",
  "JUNCTION_BOX_OR_TERMINAL",
  "PROJECT_SPECIFIED_OBJECT",
] as const;

const PARAMETER_SPECS = Object.freeze([
  ["marked_object_count", "Количество маркируемых объектов", "integer", "pcs", null],
  ["marking_scope", "Объект маркировки", "enum", null, MARKING_SCOPES],
  ["marker_designation", "Материал или изделие маркировки по проекту", "text", null, null],
  ["marker_quantity", "Количество материала или изделий маркировки", "decimal", "pcs", null],
  ["marking_labor_man_hour", "Трудоёмкость маркировки", "decimal", "man_hour", null],
  ["marking_inspection_record_count", "Количество записей контроля маркировки", "integer", "document", null],
] as const);

const KNOWN_SCOPE = new Set(["marked_object_count", "marking_scope"]);

export type FireAlarmLineMarkingParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const FIRE_ALARM_LINE_MARKING_PARAMETERS:
readonly FireAlarmLineMarkingParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: enumValues
      ? { values: enumValues }
      : valueType === "integer" || valueType === "decimal"
        ? { min: valueType === "integer" ? 1 : 0.000_001 }
        : { minLength: 1, maxLength: 1_000 },
    truth_metadata: {
      contract: "rik-expo-app.fire-alarm-line-marking-r1",
      semantic_parameter_key: `fire-alarm-line-marking:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.has(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.has(parameterId)
        ? "KNOWN_OR_APPROVED_MARKING_SCOPE"
        : "APPROVED_FIRE_ALARM_CABLE_SCHEDULE_OR_MARKING_SCHEME",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
      guide: {
        guide_kind: enumValues
          ? "ENUM_DECISION_RULE"
          : KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "marked_object_count"
          ? "Укажите фактическое число отдельных линий, пар, коробок или клемм, которые требуется маркировать."
          : KNOWN_SCOPE.has(parameterId)
            ? `${titleRu}: выберите по кабельному журналу и схеме маркировки.`
            : `${titleRu}: укажите прямое значение по кабельному журналу, схеме маркировки или плану контроля.`,
        source_role: KNOWN_SCOPE.has(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_MARKING_SCOPE"
          : "APPROVED_FIRE_ALARM_CABLE_SCHEDULE_OR_MARKING_SCHEME",
        source_document: FIRE_ALARM_LINE_MARKING_SOURCE_ID,
        source_locator: FIRE_ALARM_LINE_MARKING_SOURCE_METADATA.exact_locator,
        guide_version: "sp-kr-21-101-2024-fire-alarm-marking-r1",
        source_snapshot_hash: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
        applicability:
          "Только к отдельной операции маркировки подтверждённых объектов пожарной сигнализации; прокладка, подключение, монтаж приборов и ПНР исключены.",
        verified_at: "2026-09-24T00:00:00+06:00",
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

export const FIRE_ALARM_LINE_MARKING_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("fire_alarm_marked_object_count_v1", "pcs", "marked_object_count"),
  formula("fire_alarm_marker_quantity_v1", "pcs", "marker_quantity"),
  formula("fire_alarm_marking_labor_v1", "man_hour", "marking_labor_man_hour"),
  formula("fire_alarm_marking_inspection_record_count_v1", "document", "marking_inspection_record_count"),
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
  sourceRole: string;
  quantityRule: string;
  titleParameterIds?: string[];
}>;

const OPERATIONS: readonly Operation[] = Object.freeze([
  { operationId: "mark_objects", rowId: "f09:fire_alarm_mark_objects", section: "Работы", category: "construction_work", titleRu: "Маркировка объектов линии пожарной сигнализации", unitId: "pcs", formulaId: "fire_alarm_marked_object_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_MARKING_SCOPE", quantityRule: "CONFIRMED_MARKED_OBJECT_COUNT" },
  { operationId: "marker_material", rowId: "f09:fire_alarm_marker_material", section: "Материалы", category: "material", titleRu: "Материал или изделие маркировки пожарной сигнализации", unitId: "pcs", formulaId: "fire_alarm_marker_quantity_v1", procurementEligible: true, sourceRole: "APPROVED_FIRE_ALARM_MARKING_SCHEME", quantityRule: "DIRECT_APPROVED_PROJECT_INPUT", titleParameterIds: ["marker_designation"] },
  { operationId: "marking_labor", rowId: "f09:fire_alarm_marking_labor", section: "Труд", category: "labor", titleRu: "Труд по маркировке линий пожарной сигнализации", unitId: "man_hour", formulaId: "fire_alarm_marking_labor_v1", procurementEligible: false, sourceRole: "APPROVED_METHOD_STATEMENT_OR_ESTIMATE_NORM", quantityRule: "DIRECT_APPROVED_PROJECT_INPUT" },
  { operationId: "marking_inspection", rowId: "f09:fire_alarm_marking_inspection", section: "Контроль", category: "service", titleRu: "Запись контроля соответствия маркировки кабельному журналу", unitId: "document", formulaId: "fire_alarm_marking_inspection_record_count_v1", procurementEligible: true, sourceRole: "APPROVED_FIRE_ALARM_QA_PLAN", quantityRule: "DIRECT_APPROVED_PROJECT_INPUT" },
]);

function resource(operation: Operation, ordinal: number): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: operation.formulaId,
    normalizedUom: operation.unitId,
    semanticOwnerId: `fire-alarm-line-marking:${operation.operationId}`,
    costOwner: "resource",
    primaryMeasureParameterId: "marked_object_count",
    quantityBasis: operation.quantityRule,
    scopeContextParameterIds: [...KNOWN_SCOPE],
    ...(operation.titleParameterIds ? {
      titleSpecificationParameterIds: operation.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: operation.sourceRole,
    normativeTrace: [{
      sourceId: FIRE_ALARM_LINE_MARKING_SOURCE_ID,
      source_id: FIRE_ALARM_LINE_MARKING_SOURCE_ID,
      normId: FIRE_ALARM_LINE_MARKING_NORM_ID,
      norm_id: FIRE_ALARM_LINE_MARKING_NORM_ID,
      normVersion: FIRE_ALARM_LINE_MARKING_SOURCE_METADATA.source_document_version,
      source_title: FIRE_ALARM_LINE_MARKING_SOURCE_METADATA.source_title,
      exact_locator: FIRE_ALARM_LINE_MARKING_SOURCE_METADATA.exact_locator,
      source_definition_hash: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
      sourceRole: operation.sourceRole,
    }],
    quantityBasis: operation.quantityRule,
    excludedUnownedAssumptions: [
      "one universal marker product per marked object",
      "universal paint or label consumption",
      "universal labor productivity or inspection count",
      "cable laying, electrical connection, device installation or commissioning",
      "hidden factor from high-load, area, room or wet-zone suffix",
      "invented market price",
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
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: resourceGraph,
    procurement_eligible: operation.procurementEligible,
    cost_owner_id: operation.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ operation, resourceGraph, sourceMetadata }),
  };
}

export const FIRE_ALARM_LINE_MARKING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  OPERATIONS.map((operation, ordinal) => resource(operation, ordinal)),
);

export function fireAlarmLineMarkingCompletenessMap(variantKey: FireAlarmLineMarkingVariantKey) {
  const variant = FIRE_ALARM_LINE_MARKING_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "SP_KR_21_101_2024_CLAUSE_12_60_PLUS_APPROVED_MARKING_SCHEDULE",
    generatedFromCurrentRows: false,
    evidenceSha256: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
    evidenceReferences: [
      FIRE_ALARM_LINE_MARKING_SOURCE_METADATA.official_url,
      "СП КР 21-101:2024 §12.60, printed page 60 / PDF page 168",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: OPERATIONS.map((operation) => ({
      operationId: operation.operationId,
      expectedResourceId: `required-operation:${operation.operationId}`,
      category: operation.category,
      specification: operation.titleRu,
      condition: "selected_marking_scope",
      sourceId: FIRE_ALARM_LINE_MARKING_SOURCE_ID,
      unitId: operation.unitId,
      quantityRule: operation.quantityRule,
      detailPrinciple: "CONFIRMED_SCOPE_OR_DIRECT_APPROVED_PROJECT_INPUT",
      priceRelation: "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId: operation.formulaId,
      resolution: { kind: "ROW", rowId: operation.rowId },
    })),
  });
}

export function resolveFireAlarmLineMarkingVariant(variantKey: string) {
  if (!Object.prototype.hasOwnProperty.call(FIRE_ALARM_LINE_MARKING_VARIANTS, variantKey)) {
    throw new Error(`FIRE_ALARM_LINE_MARKING_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return FIRE_ALARM_LINE_MARKING_VARIANTS[variantKey as FireAlarmLineMarkingVariantKey];
}

export const FIRE_ALARM_LINE_MARKING_SHORT_INPUT = Object.freeze({
  marked_object_count: 40,
  marking_scope: "CABLE_OR_WIRE",
});

export const FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT = Object.freeze({
  ...FIRE_ALARM_LINE_MARKING_SHORT_INPUT,
  marker_designation: "Негорючий маркер по кабельному журналу",
  marker_quantity: 80,
  marking_labor_man_hour: 6.5,
  marking_inspection_record_count: 2,
});

export async function compileFireAlarmLineMarkingVariantR1(
  variantKey: FireAlarmLineMarkingVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = FIRE_ALARM_LINE_MARKING_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`FIRE_ALARM_LINE_MARKING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: `canonical-estimate-compiler.fire-alarm-line-marking-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "marked_object_count",
    parameterDefinitions: [...FIRE_ALARM_LINE_MARKING_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_LINE_MARKING_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_LINE_MARKING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
