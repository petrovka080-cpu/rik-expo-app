import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const FIRE_ALARM_CABLE_LAYING_VARIANTS = Object.freeze({
  high_load: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_lay_high_load",
    catalogVariant: "HIGH_LOAD_SEARCH_IDENTITY",
    canonicalNameRu: "Прокладка линии пожарной сигнализации — высокая нагрузка",
  }),
  large_area: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_lay_large_area",
    catalogVariant: "LARGE_AREA_SEARCH_IDENTITY",
    canonicalNameRu: "Прокладка линии пожарной сигнализации — большая площадь",
  }),
  small_area: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_lay_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY",
    canonicalNameRu: "Прокладка линии пожарной сигнализации — небольшая площадь",
  }),
  standard: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_lay_standard",
    catalogVariant: "STANDARD_SEARCH_IDENTITY",
    canonicalNameRu: "Прокладка линии пожарной сигнализации",
  }),
  technical_room: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_lay_technical_room",
    catalogVariant: "TECHNICAL_ROOM_SEARCH_IDENTITY",
    canonicalNameRu: "Прокладка линии пожарной сигнализации — техническое помещение",
  }),
  wet_zone: Object.freeze({
    catalogId: "canonical-work:base:electrical_interior_fire_alarm_lay_wet_zone",
    catalogVariant: "WET_ZONE_SEARCH_IDENTITY",
    canonicalNameRu: "Прокладка линии пожарной сигнализации — влажная зона",
  }),
});

export type FireAlarmCableLayingVariantKey =
  keyof typeof FIRE_ALARM_CABLE_LAYING_VARIANTS;

export const FIRE_ALARM_CABLE_LAYING_SOURCE_ID =
  "official_sp_kr_21_101_2024_fire_alarm_lines_v1";
export const FIRE_ALARM_CABLE_LAYING_NORM_ID =
  "norm:kg:sp_kr_21_101_2024:12_57_12_72:fire_alarm_line_route:v1";
export const FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256 =
  "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c";

export const FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений»",
  source_authority:
    "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой)",
  source_document_version: "SP_KR_21_101_2024_EFFECTIVE_2024_07_05",
  definition_hash: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 21-101:2024 §§12.57–12.72, printed pages 60–62 / PDF pages 168–170: выбор медных проводов и кабелей и способа прокладки; контроль целостности; раздельная прокладка; защита от наводок; наружные трассы; соединительные коробки",
  use_restriction:
    "Источник задаёт технические требования к линии, но не универсальный запас кабеля, шаг крепежа, число коробок, длину металлической защиты, количество заземлений, трудозатраты или цены. Чистая длина кабеля равна подтверждённой длине маршрута; остальные количества принимаются только из утверждённого проекта, кабельного журнала, схемы трассы и плана контроля.",
  source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
  artifact_sha256: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
  effective_from: "2024-07-05",
});

const CONDITIONAL_DETAILS = new Set([
  "label_designation",
  "label_quantity_piece",
  "junction_box_designation",
  "junction_box_quantity_piece",
  "metallic_protection_designation",
  "metallic_protection_length_m",
  "grounding_connection_count",
]);

const PARAMETER_SPECS = Object.freeze([
  ["route_length_m", "Чистая длина маршрута линии", "decimal", "m", null],
  ["cable_designation", "Марка кабеля пожарной сигнализации по проекту", "text", null, null],
  ["conductor_material", "Материал жил", "enum", null, ["COPPER"]],
  ["conductor_diameter_mm", "Диаметр медной жилы", "decimal", "mm", null],
  ["line_class", "Назначение линии", "enum", null,
    ["FIRE_ALARM_LOOP", "CONNECTING_LINE", "CONTROL_LINE", "POWER_SUPPLY_LINE"]],
  ["routing_method", "Способ прокладки по проекту", "enum", null,
    ["OPEN_SEPARATED", "SEPARATED_TRAY_COMPARTMENT", "METALLIC_PIPE_OR_DUCT", "UNDERGROUND_OR_CABLE_DUCT"]],
  ["fastener_designation", "Крепление линии по узлу трассы", "text", null, null],
  ["fastener_quantity_piece", "Количество креплений линии", "decimal", "pcs", null],
  ["integrity_test_count", "Количество проверок контроля целостности линии", "integer", "test", null],
  ["labeling_mode", "Маркировка линии входит в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["label_designation", "Маркер линии по кабельному журналу", "text", null, null],
  ["label_quantity_piece", "Количество маркеров линии", "decimal", "pcs", null],
  ["junction_box_mode", "Соединительные коробки входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["junction_box_designation", "Соединительная коробка по схеме линии", "text", null, null],
  ["junction_box_quantity_piece", "Количество соединительных коробок", "decimal", "pcs", null],
  ["emi_protection_mode", "Металлическая защита от наводок требуется", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["metallic_protection_designation", "Металлическая труба или короб по проекту", "text", null, null],
  ["metallic_protection_length_m", "Длина металлической защиты", "decimal", "m", null],
  ["grounding_connection_count", "Количество заземлений экранирующих элементов", "integer", "pcs", null],
] as const);

const KNOWN_SCOPE = new Set([
  "route_length_m",
  "cable_designation",
  "conductor_material",
  "conductor_diameter_mm",
  "line_class",
  "routing_method",
]);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("label_")
    ? "labeling_mode"
    : parameterId.startsWith("junction_box_")
      ? "junction_box_mode"
      : parameterId.startsWith("metallic_protection_")
        || parameterId === "grounding_connection_count"
        ? "emi_protection_mode"
        : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type FireAlarmCableLayingParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const FIRE_ALARM_CABLE_LAYING_PARAMETERS:
readonly FireAlarmCableLayingParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues
        ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "conductor_diameter_mm" ? 0.5 : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.fire-alarm-cable-laying-r1",
      semantic_parameter_key: `fire-alarm-cable-laying:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.has(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.has(parameterId)
        ? "KNOWN_OR_APPROVED_FIRE_ALARM_LINE_SCOPE"
        : "APPROVED_FIRE_ALARM_CABLE_SCHEDULE_ROUTE_DETAIL_OR_QA_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
      guide: {
        guide_kind: enumValues
          ? "ENUM_DECISION_RULE"
          : KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "route_length_m"
          ? "Укажите чистую длину фактического маршрута; не добавляйте скрытый запас."
          : parameterId === "conductor_diameter_mm"
            ? "Укажите диаметр медной жилы по проекту; СП КР 21-101:2024 §12.64 требует не менее 0,5 мм."
            : KNOWN_SCOPE.has(parameterId)
              ? `${titleRu}: укажите по кабельному журналу и схеме трассы.`
              : `${titleRu}: укажите прямое значение по проекту, узлу трассы или плану контроля.`,
        source_role: KNOWN_SCOPE.has(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_FIRE_ALARM_LINE_SCOPE"
          : "APPROVED_FIRE_ALARM_CABLE_SCHEDULE_ROUTE_DETAIL_OR_QA_PLAN",
        source_document: FIRE_ALARM_CABLE_LAYING_SOURCE_ID,
        source_locator: FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA.exact_locator,
        guide_version: "sp-kr-21-101-2024-fire-alarm-line-r1",
        source_snapshot_hash: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
        applicability:
          "Только к выбранной линии пожарной сигнализации по подтверждённому маршруту; подключение концов, монтаж приборов и системная пусконаладка исключены.",
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

export const FIRE_ALARM_CABLE_LAYING_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("fire_alarm_line_laying_length_v1", "m", "route_length_m"),
  formula("fire_alarm_line_cable_net_length_v1", "m", "route_length_m"),
  formula("fire_alarm_line_fastener_quantity_v1", "pcs", "fastener_quantity_piece"),
  formula("fire_alarm_line_integrity_test_count_v1", "test", "integrity_test_count"),
  formula("fire_alarm_line_label_quantity_v1", "pcs", "label_quantity_piece"),
  formula("fire_alarm_line_junction_box_quantity_v1", "pcs", "junction_box_quantity_piece"),
  formula("fire_alarm_line_metallic_protection_length_v1", "m", "metallic_protection_length_m"),
  formula("fire_alarm_line_grounding_connection_count_v1", "pcs", "grounding_connection_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

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
  inclusionAst?: Json;
  titleParameterIds?: string[];
  quantityRule: string;
}>;

const OPERATIONS: readonly Operation[] = Object.freeze([
  { operationId: "line_laying", rowId: "f09:fire_alarm_line_laying", section: "Работы", category: "construction_work", titleRu: "Прокладка линии пожарной сигнализации по подтверждённому маршруту", unitId: "m", formulaId: "fire_alarm_line_laying_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_FIRE_ALARM_LINE_SCOPE", quantityRule: "CONFIRMED_ROUTE_LENGTH" },
  { operationId: "line_cable", rowId: "f09:fire_alarm_line_cable", section: "Материалы", category: "material", titleRu: "Кабель пожарной сигнализации — чистая длина без неуказанного запаса", unitId: "m", formulaId: "fire_alarm_line_cable_net_length_v1", procurementEligible: true, sourceRole: "APPROVED_FIRE_ALARM_CABLE_SCHEDULE", titleParameterIds: ["cable_designation"], quantityRule: "CONFIRMED_ROUTE_LENGTH_NO_HIDDEN_RESERVE" },
  { operationId: "line_fastener", rowId: "f09:fire_alarm_line_fastener", section: "Материалы", category: "material", titleRu: "Крепление линии пожарной сигнализации по узлу трассы", unitId: "pcs", formulaId: "fire_alarm_line_fastener_quantity_v1", procurementEligible: true, sourceRole: "APPROVED_FIRE_ALARM_ROUTE_DETAIL", titleParameterIds: ["fastener_designation"], quantityRule: "DIRECT_APPROVED_PROJECT_INPUT" },
  { operationId: "line_integrity_test", rowId: "f09:fire_alarm_line_integrity_test", section: "Контроль", category: "service", titleRu: "Проверка контроля целостности линии пожарной сигнализации", unitId: "test", formulaId: "fire_alarm_line_integrity_test_count_v1", procurementEligible: true, sourceRole: "APPROVED_FIRE_ALARM_QA_PLAN", quantityRule: "DIRECT_APPROVED_PROJECT_INPUT" },
  { operationId: "line_label", rowId: "f09:fire_alarm_line_label", section: "Условные материалы", category: "material", titleRu: "Маркер линии пожарной сигнализации", unitId: "pcs", formulaId: "fire_alarm_line_label_quantity_v1", procurementEligible: true, sourceRole: "APPROVED_FIRE_ALARM_CABLE_SCHEDULE", inclusionAst: equals("labeling_mode", "REQUIRED"), titleParameterIds: ["label_designation"], quantityRule: "DIRECT_APPROVED_PROJECT_INPUT" },
  { operationId: "line_junction_box", rowId: "f09:fire_alarm_line_junction_box", section: "Условные материалы", category: "material", titleRu: "Соединительная коробка линии пожарной сигнализации", unitId: "pcs", formulaId: "fire_alarm_line_junction_box_quantity_v1", procurementEligible: true, sourceRole: "APPROVED_FIRE_ALARM_LINE_SCHEME", inclusionAst: equals("junction_box_mode", "REQUIRED"), titleParameterIds: ["junction_box_designation"], quantityRule: "DIRECT_APPROVED_PROJECT_INPUT" },
  { operationId: "line_metallic_protection", rowId: "f09:fire_alarm_line_metallic_protection", section: "Условные материалы", category: "material", titleRu: "Металлическая защита линии от электромагнитных наводок", unitId: "m", formulaId: "fire_alarm_line_metallic_protection_length_v1", procurementEligible: true, sourceRole: "APPROVED_EMI_PROTECTION_DETAIL", inclusionAst: equals("emi_protection_mode", "REQUIRED"), titleParameterIds: ["metallic_protection_designation"], quantityRule: "DIRECT_APPROVED_PROJECT_INPUT" },
  { operationId: "line_protection_grounding", rowId: "f09:fire_alarm_line_protection_grounding", section: "Условные работы", category: "construction_work", titleRu: "Заземление экранирующих элементов защиты линии", unitId: "pcs", formulaId: "fire_alarm_line_grounding_connection_count_v1", procurementEligible: false, sourceRole: "APPROVED_EMI_PROTECTION_DETAIL", inclusionAst: equals("emi_protection_mode", "REQUIRED"), quantityRule: "DIRECT_APPROVED_PROJECT_INPUT" },
]);

function resource(operation: Operation, ordinal: number): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: operation.formulaId,
    normalizedUom: operation.unitId,
    semanticOwnerId: `fire-alarm-cable-laying:${operation.operationId}`,
    costOwner: "resource",
    primaryMeasureParameterId: "route_length_m",
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
      sourceId: FIRE_ALARM_CABLE_LAYING_SOURCE_ID,
      source_id: FIRE_ALARM_CABLE_LAYING_SOURCE_ID,
      normId: FIRE_ALARM_CABLE_LAYING_NORM_ID,
      norm_id: FIRE_ALARM_CABLE_LAYING_NORM_ID,
      normVersion: FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA.source_document_version,
      source_title: FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA.source_title,
      exact_locator: FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA.exact_locator,
      source_definition_hash: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
      sourceRole: operation.sourceRole,
    }],
    quantityBasis: operation.quantityRule,
    excludedUnownedAssumptions: [
      "automatic cable reserve or waste factor",
      "automatic fastener spacing or junction-box count",
      "automatic EMI-protection length or grounding count",
      "connection of cable ends or device installation",
      "system commissioning or invented market price",
      "hidden factor from high-load, area, room or wet-zone suffix",
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
    inclusion_ast: operation.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: operation.procurementEligible,
    cost_owner_id: operation.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ operation, resourceGraph, sourceMetadata }),
  };
}

export const FIRE_ALARM_CABLE_LAYING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  OPERATIONS.map((operation, ordinal) => resource(operation, ordinal)),
);

export function fireAlarmCableLayingCompletenessMap(
  variantKey: FireAlarmCableLayingVariantKey,
) {
  const variant = FIRE_ALARM_CABLE_LAYING_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "NORMATIVE_OPERATION_MAP",
    rateTable: "SP_KR_21_101_2024_CLAUSES_12_57_TO_12_72",
    generatedFromCurrentRows: false,
    evidenceSha256: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
    evidenceReferences: [
      FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA.official_url,
      "СП КР 21-101:2024 §§12.57–12.72, printed pages 60–62 / PDF pages 168–170",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: OPERATIONS.map((operation) => ({
      operationId: operation.operationId,
      expectedResourceId: `required-operation:${operation.operationId}`,
      category: operation.category,
      specification: operation.titleRu,
      condition: operation.inclusionAst ?? "selected_fire_alarm_line",
      sourceId: FIRE_ALARM_CABLE_LAYING_SOURCE_ID,
      unitId: operation.unitId,
      quantityRule: operation.quantityRule,
      detailPrinciple: "DIRECT_ROUTE_OR_APPROVED_PROJECT_INPUT_NO_HIDDEN_RATE",
      priceRelation: "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId: operation.formulaId,
      resolution: { kind: "ROW", rowId: operation.rowId },
    })),
  });
}

export function resolveFireAlarmCableLayingVariant(variantKey: string) {
  if (!Object.prototype.hasOwnProperty.call(FIRE_ALARM_CABLE_LAYING_VARIANTS, variantKey)) {
    throw new Error(`FIRE_ALARM_CABLE_LAYING_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return FIRE_ALARM_CABLE_LAYING_VARIANTS[variantKey as FireAlarmCableLayingVariantKey];
}

export const FIRE_ALARM_CABLE_LAYING_SHORT_INPUT = Object.freeze({
  route_length_m: 120,
  cable_designation: "Кабель пожарной сигнализации по утверждённому проекту",
  conductor_material: "COPPER",
  conductor_diameter_mm: 0.5,
  line_class: "FIRE_ALARM_LOOP",
  routing_method: "OPEN_SEPARATED",
});

export const FIRE_ALARM_CABLE_LAYING_ACCEPTANCE_INPUT = Object.freeze({
  ...FIRE_ALARM_CABLE_LAYING_SHORT_INPUT,
  fastener_designation: "Крепление по утверждённому узлу трассы",
  fastener_quantity_piece: 240,
  integrity_test_count: 2,
  labeling_mode: "REQUIRED",
  label_designation: "Маркер линии по кабельному журналу",
  label_quantity_piece: 12,
  junction_box_mode: "REQUIRED",
  junction_box_designation: "Соединительная коробка по схеме линии",
  junction_box_quantity_piece: 4,
  emi_protection_mode: "REQUIRED",
  metallic_protection_designation: "Стальная труба по узлу защиты от наводок",
  metallic_protection_length_m: 15,
  grounding_connection_count: 2,
});

export async function compileFireAlarmCableLayingVariantR1(
  variantKey: FireAlarmCableLayingVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = FIRE_ALARM_CABLE_LAYING_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`FIRE_ALARM_CABLE_LAYING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: `canonical-estimate-compiler.fire-alarm-cable-laying-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "route_length_m",
    parameterDefinitions: [...FIRE_ALARM_CABLE_LAYING_PARAMETERS],
    formulaDefinitions: [...FIRE_ALARM_CABLE_LAYING_FORMULAS],
    resourceDefinitions: [...FIRE_ALARM_CABLE_LAYING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
