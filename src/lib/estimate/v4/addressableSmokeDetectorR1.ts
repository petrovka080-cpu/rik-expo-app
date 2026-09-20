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

export const ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID =
  "canonical-work:base:electrical_interior_fire_alarm_install_standard";
export const ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID =
  "project_addressable_smoke_detector_package_v1";
export const ADDRESSABLE_SMOKE_DETECTOR_NORM_ID =
  "norm:project:addressable_smoke_detector:package:v1";

export const ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость адресных извещателей, схема адресации, узлы крепления, ППР и программа пусконаладки пожарной сигнализации",
  source_authority: "Проектная организация пожарной автоматики, изготовитель адресной системы и утверждающий инженер проекта",
  source_document_version:
    "PROJECT_ADDRESSABLE_DETECTOR_DEVICE_BASE_FIXING_LABEL_TEST_REVISION_EXPLICIT",
  definition_hash: "eh_project_addressable_smoke_detector_package_r1",
  exact_locator: "Количество адресных оптико-электронных дымовых извещателей с совместимыми базами; ведомость устройств и адресов; узлы огнестойкого крепления; тип и расход тестового аэрозоля; трудоёмкость устройства подачи; программа и количество протоколов адресации и срабатывания; изоляторы шлейфа и огнестойкие коробки только по условным проектным ветвям",
  use_restriction: "Известное количество устройств определяет монтаж, количество извещателей, совместимых баз и индивидуальных адресных меток. Крепёж, тестовый аэрозоль, оборудование и протоколы берутся только из утверждённых проектных, PPR и QA-документов. Кабель шлейфа, приёмно-контрольный прибор, оповещатели, блок питания и полная система пожарной сигнализации не включаются.",
});

const CONDITIONAL_DETAILS = new Set([
  "loop_isolator_designation",
  "loop_isolator_quantity_piece",
  "junction_box_designation",
  "junction_box_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["detector_count", "Количество адресных дымовых извещателей", "integer", "pcs", null],
  ["detector_type", "Тип адресного дымового извещателя", "enum", null,
    ["ADDRESSABLE_OPTICAL_SMOKE"]],
  ["base_type", "Тип совместимой монтажной базы", "enum", null,
    ["MATCHED_ADDRESSABLE_DETECTOR_BASE"]],
  ["fastener_designation", "Комплект огнестойкого крепежа по узлу", "text", null, null],
  ["fastener_quantity_set", "Количество комплектов огнестойкого крепежа", "decimal", "set", null],
  ["aerosol_designation", "Тестовый аэрозоль по программе пусконаладки", "text", null, null],
  ["aerosol_volume_l", "Объём тестового аэрозоля", "decimal", "l", null],
  ["dispenser_designation", "Устройство подачи тестового аэрозоля по ППР", "text", null, null],
  ["dispenser_machine_hour", "Машино-часы устройства подачи аэрозоля", "decimal", "machine_hour", null],
  ["activation_protocol_designation", "Протокол адресации и проверки срабатывания", "text", null, null],
  ["activation_protocol_quantity_document", "Количество протоколов адресации и срабатывания", "decimal", "document", null],
  ["loop_isolator_mode", "Изоляторы шлейфа входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["loop_isolator_designation", "Адресный изолятор шлейфа по проекту", "text", null, null],
  ["loop_isolator_quantity_piece", "Количество адресных изоляторов шлейфа", "decimal", "pcs", null],
  ["junction_box_mode", "Огнестойкие ответвительные коробки входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["junction_box_designation", "Огнестойкая ответвительная коробка по проекту", "text", null, null],
  ["junction_box_quantity_piece", "Количество огнестойких ответвительных коробок", "decimal", "pcs", null],
] as const);

const KNOWN_SCOPE = ["detector_count", "detector_type", "base_type"];

function conditionalConstraints(parameterId: string): Json {
  const prefix = ["loop_isolator", "junction_box"]
    .find((candidate) => parameterId.startsWith(`${candidate}_`));
  const branch = prefix ? `${prefix}_mode` : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type AddressableSmokeDetectorParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS:
readonly AddressableSmokeDetectorParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.addressable-smoke-detector-r1",
      semantic_parameter_key: `addressable-smoke-detector:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_FIRE_ALARM_DEVICE_FIXING_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "detector_count"
          ? "Укажите подтверждённое количество отдельных адресных дымовых извещателей."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по выбранной адресной системе и совместимой базе.`
            : `${titleRu}: укажите по ведомости, узлу, ППР или программе пусконаладки.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_ADDRESSABLE_DETECTOR_SCOPE"
          : "APPROVED_PROJECT_FIRE_ALARM_DEVICE_FIXING_METHOD_OR_QA_DOCUMENTATION",
        source_document: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
        source_locator: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.exact_locator,
        guide_version: "addressable-smoke-detector-r1",
        source_snapshot_hash: "297ea76f5181dbd2b7c902deea3b8910f6da9a8591581d0495b20dc06a188a33",
        applicability: "Только для установки адресных оптико-электронных дымовых извещателей с совместимыми базами; кабель шлейфа, ППКП, оповещатели, питание и полная система исключены.",
        verified_at: "2026-09-19T00:00:00+06:00",
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

export const ADDRESSABLE_SMOKE_DETECTOR_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("addressable_smoke_detector_install_count_v1", "pcs", "detector_count"),
  formula("addressable_optical_smoke_detector_count_v1", "pcs", "detector_count"),
  formula("addressable_detector_base_count_v1", "pcs", "detector_count"),
  formula("detector_address_label_count_v1", "pcs", "detector_count"),
  formula("detector_fire_resistant_fastener_quantity_v1", "set", "fastener_quantity_set"),
  formula("smoke_detector_test_aerosol_volume_v1", "l", "aerosol_volume_l"),
  formula("smoke_detector_test_dispenser_time_v1", "machine_hour", "dispenser_machine_hour"),
  formula("smoke_detector_activation_protocol_quantity_v1", "document",
    "activation_protocol_quantity_document"),
  formula("addressable_loop_isolator_quantity_v1", "pcs", "loop_isolator_quantity_piece"),
  formula("fire_resistant_junction_box_quantity_v1", "pcs", "junction_box_quantity_piece"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: string[];
  sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `addressable-smoke-detector:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
      source_id: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
      normId: ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
      norm_id: ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
      normVersion: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.source_document_version,
      source_title: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.source_title,
      exact_locator: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.exact_locator,
      source_definition_hash: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical aerosol, equipment-time or protocol rates",
      "automatic fastener type or quantity",
      "automatic loop-isolator or junction-box quantities",
      "fire-alarm loop cable, control panel, sounder, power supply or full system",
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
    inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const ADDRESSABLE_SMOKE_DETECTOR_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:addressable_smoke_detector_install", ordinal: 0,
    section: "Работы", category: "construction_work",
    titleRu: "Монтаж, адресация и проверка дымового пожарного извещателя", unitId: "pcs",
    formulaId: "addressable_smoke_detector_install_count_v1", procurementEligible: false,
    sourceRole: "USER_SUPPLIED_OR_APPROVED_ADDRESSABLE_DETECTOR_SCOPE" }),
  resource({ rowId: "rc09:addressable_optical_smoke_detector", ordinal: 1,
    section: "Оборудование системы", category: "material",
    titleRu: "Извещатель пожарный дымовой оптико-электронный адресный", unitId: "pcs",
    formulaId: "addressable_optical_smoke_detector_count_v1", procurementEligible: true,
    titleParameterIds: ["detector_type"],
    sourceRole: "USER_SUPPLIED_OR_APPROVED_ADDRESSABLE_DETECTOR_SCOPE" }),
  resource({ rowId: "rc09:addressable_detector_base", ordinal: 2,
    section: "Оборудование системы", category: "material",
    titleRu: "База монтажная, совместимая с адресным пожарным извещателем", unitId: "pcs",
    formulaId: "addressable_detector_base_count_v1", procurementEligible: true,
    titleParameterIds: ["base_type"],
    sourceRole: "USER_SUPPLIED_OR_APPROVED_ADDRESSABLE_DETECTOR_SCOPE" }),
  resource({ rowId: "rc09:detector_address_label", ordinal: 3,
    section: "Материалы", category: "material",
    titleRu: "Индивидуальная этикетка адреса пожарного извещателя", unitId: "pcs",
    formulaId: "detector_address_label_count_v1", procurementEligible: true,
    sourceRole: "USER_SUPPLIED_OR_APPROVED_ADDRESSABLE_DETECTOR_SCOPE" }),
  resource({ rowId: "rc09:detector_fire_resistant_fastener", ordinal: 4,
    section: "Материалы", category: "material", titleRu: "Комплект огнестойкого крепежа базы извещателя",
    unitId: "set", formulaId: "detector_fire_resistant_fastener_quantity_v1",
    procurementEligible: true, titleParameterIds: ["fastener_designation"],
    sourceRole: "APPROVED_DETECTOR_MOUNTING_DETAIL" }),
  resource({ rowId: "rc09:smoke_detector_test_aerosol", ordinal: 5,
    section: "Материалы", category: "material", titleRu: "Аэрозоль для функциональной проверки дымового извещателя",
    unitId: "l", formulaId: "smoke_detector_test_aerosol_volume_v1", procurementEligible: true,
    titleParameterIds: ["aerosol_designation"], sourceRole: "APPROVED_COMMISSIONING_PROGRAM" }),
  resource({ rowId: "rc09:smoke_detector_test_dispenser", ordinal: 6,
    section: "Оборудование", category: "equipment", titleRu: "Устройство подачи тестового аэрозоля к извещателю",
    unitId: "machine_hour", formulaId: "smoke_detector_test_dispenser_time_v1",
    procurementEligible: true, titleParameterIds: ["dispenser_designation"],
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:smoke_detector_activation_record", ordinal: 7,
    section: "Контроль", category: "service", titleRu: "Протокол адресации и проверки срабатывания извещателей",
    unitId: "document", formulaId: "smoke_detector_activation_protocol_quantity_v1",
    procurementEligible: true, titleParameterIds: ["activation_protocol_designation"],
    sourceRole: "APPROVED_COMMISSIONING_PROGRAM" }),
  resource({ rowId: "rc09:addressable_loop_isolator", ordinal: 8,
    section: "Условные материалы", category: "material", titleRu: "Адресный изолятор шлейфа пожарной сигнализации",
    unitId: "pcs", formulaId: "addressable_loop_isolator_quantity_v1",
    inclusionAst: equals("loop_isolator_mode", "REQUIRED"), procurementEligible: true,
    titleParameterIds: ["loop_isolator_designation"], sourceRole: "APPROVED_FIRE_ALARM_LOOP_SCHEME" }),
  resource({ rowId: "rc09:fire_resistant_junction_box", ordinal: 9,
    section: "Условные материалы", category: "material", titleRu: "Огнестойкая ответвительная коробка пожарной сигнализации",
    unitId: "pcs", formulaId: "fire_resistant_junction_box_quantity_v1",
    inclusionAst: equals("junction_box_mode", "REQUIRED"), procurementEligible: true,
    titleParameterIds: ["junction_box_designation"], sourceRole: "APPROVED_FIRE_ALARM_LOOP_SCHEME" }),
]);

export const ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT = Object.freeze({
  detector_count: 25,
  detector_type: "ADDRESSABLE_OPTICAL_SMOKE",
  base_type: "MATCHED_ADDRESSABLE_DETECTOR_BASE",
});

export const ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT = Object.freeze({
  ...ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  fastener_designation: "Комплект крепежа по узлу для фактического основания",
  fastener_quantity_set: 25,
  aerosol_designation: "Тестовый аэрозоль по программе пусконаладки", aerosol_volume_l: 0.18,
  dispenser_designation: "Устройство подачи аэрозоля по ППР", dispenser_machine_hour: 1.5,
  activation_protocol_designation: "Протокол адресации и проверки срабатывания по программе ПНР",
  activation_protocol_quantity_document: 1,
  loop_isolator_mode: "NOT_REQUIRED",
  junction_box_mode: "NOT_REQUIRED",
});

export async function compileAddressableSmokeDetectorR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID;
  if (catalogId !== ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID) {
    throw new Error(`ADDRESSABLE_SMOKE_DETECTOR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.addressable-smoke-detector-r1",
    catalogId,
    primaryMeasureParameterId: "detector_count",
    parameterDefinitions: [...ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS],
    formulaDefinitions: [...ADDRESSABLE_SMOKE_DETECTOR_FORMULAS],
    resourceDefinitions: [...ADDRESSABLE_SMOKE_DETECTOR_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 15,
    hashJson: async (value) => JSON.stringify(value),
  });
}
