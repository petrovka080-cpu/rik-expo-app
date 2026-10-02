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
    "PROJECT_ADDRESSABLE_DETECTOR_DEVICE_BASE_FIXING_LABEL_TEST_LABOR_LOGISTICS_BALANCE_S27_24",
  definition_hash: "b5566ba12a77235be0798663503c80231818941518e73f7bbc06de2aa8994ab2",
  exact_locator: "Количество и точные обозначения адресных оптико-электронных дымовых извещателей и совместимых баз; ведомость устройств и адресов; узлы огнестойкого крепления; тип и расход тестового аэрозоля; труд, монтажный инструмент, устройство подачи аэрозоля и программатор по ППР и программе ПНР; протоколы адресации и срабатывания; логистика; резерв и упаковка поставщика; изоляторы шлейфа и огнестойкие коробки только по условным проектным ветвям",
  use_restriction: "Приложение не выбирает извещатель, базу или топологию системы. Видимый нейтральный баланс резерва и упаковки заменяется по проекту и поставщику. Крепёж, тестовый аэрозоль, труд, оборудование, логистика и протоколы берутся только из утверждённых проектных, ППР и QA-документов. Кабель шлейфа, приёмно-контрольный прибор, оповещатели, блок питания и полная система пожарной сигнализации не включаются.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "b5566ba12a77235be0798663503c80231818941518e73f7bbc06de2aa8994ab2",
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
  ["detector_product_designation", "Марка и каталожное обозначение выбранного извещателя", "text", null, null],
  ["base_product_designation", "Марка и каталожное обозначение совместимой базы", "text", null, null],
  ["detector_retained_spare_piece", "Сохраняемый резерв извещателей", "decimal", "pcs", null],
  ["detector_supplier_pack_size_piece", "Количество извещателей в упаковке поставщика", "integer", "pcs", null],
  ["base_retained_spare_piece", "Сохраняемый резерв монтажных баз", "decimal", "pcs", null],
  ["base_supplier_pack_size_piece", "Количество монтажных баз в упаковке поставщика", "integer", "pcs", null],
  ["fastener_designation", "Комплект огнестойкого крепежа по узлу", "text", null, null],
  ["fastener_quantity_set", "Количество комплектов огнестойкого крепежа", "decimal", "set", null],
  ["aerosol_designation", "Тестовый аэрозоль по программе пусконаладки", "text", null, null],
  ["aerosol_volume_l", "Объём тестового аэрозоля", "decimal", "l", null],
  ["dispenser_designation", "Устройство подачи тестового аэрозоля по ППР", "text", null, null],
  ["dispenser_machine_hour", "Машино-часы устройства подачи аэрозоля", "decimal", "machine_hour", null],
  ["activation_protocol_designation", "Протокол адресации и проверки срабатывания", "text", null, null],
  ["activation_protocol_quantity_document", "Количество протоколов адресации и срабатывания", "decimal", "document", null],
  ["detector_installation_labor_h", "Труд монтажников пожарной автоматики по ППР", "decimal", "man_hour", null],
  ["detector_programming_testing_labor_h", "Труд наладчиков по адресации и функциональной проверке", "decimal", "man_hour", null],
  ["detector_mounting_tool_machine_h", "Работа монтажного инструмента", "decimal", "machine_hour", null],
  ["addressable_loop_programmer_machine_h", "Работа программатора адресного шлейфа", "decimal", "machine_hour", null],
  ["detector_delivery_trip_count", "Рейсы доставки извещателей и комплектующих", "integer", "trip", null],
  ["detector_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов монтажа", "integer", "trip", null],
  ["loop_isolator_mode", "Изоляторы шлейфа входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["loop_isolator_designation", "Адресный изолятор шлейфа по проекту", "text", null, null],
  ["loop_isolator_quantity_piece", "Количество адресных изоляторов шлейфа", "decimal", "pcs", null],
  ["junction_box_mode", "Огнестойкие ответвительные коробки входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["junction_box_designation", "Огнестойкая ответвительная коробка по проекту", "text", null, null],
  ["junction_box_quantity_piece", "Количество огнестойких ответвительных коробок", "decimal", "pcs", null],
] as const);

const KNOWN_SCOPE = [
  "detector_count", "detector_type", "base_type",
  "detector_product_designation", "base_product_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "detector_retained_spare_piece", "detector_supplier_pack_size_piece",
  "base_retained_spare_piece", "base_supplier_pack_size_piece",
]);

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
          ? { min: VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            && !parameterId.endsWith("supplier_pack_size_piece")
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.addressable-smoke-detector-r1",
      semantic_parameter_key: `addressable-smoke-detector:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_FIRE_ALARM_DEVICE_FIXING_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "detector_count"
          ? "Укажите подтверждённое количество отдельных адресных дымовых извещателей."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по выбранной адресной системе и совместимой базе.`
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? `${titleRu}: нейтральное предварительное значение видно в смете; замените по резерву и упаковке поставщика.`
              : `${titleRu}: укажите по ведомости, узлу, ППР или программе пусконаладки.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_ADDRESSABLE_DETECTOR_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PROJECT_FIRE_ALARM_DEVICE_FIXING_METHOD_OR_QA_DOCUMENTATION",
        source_document: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
        source_locator: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.exact_locator,
        guide_version: "addressable-smoke-detector-r1",
        source_snapshot_hash: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для установки адресных оптико-электронных дымовых извещателей с совместимыми базами; кабель шлейфа, ППКП, оповещатели, питание и полная система исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT = Object.freeze({
  detector_retained_spare_piece: 0,
  detector_supplier_pack_size_piece: 1,
  base_retained_spare_piece: 0,
  base_supplier_pack_size_piece: 1,
});
export const ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
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
  formula("addressable_optical_smoke_detector_order_v2", "pcs",
    "ceil((detector_count+detector_retained_spare_piece)/detector_supplier_pack_size_piece)*detector_supplier_pack_size_piece"),
  formula("addressable_detector_base_order_v2", "pcs",
    "ceil((detector_count+base_retained_spare_piece)/base_supplier_pack_size_piece)*base_supplier_pack_size_piece"),
  formula("detector_address_label_count_v1", "pcs", "detector_count"),
  formula("detector_fire_resistant_fastener_quantity_v1", "set", "fastener_quantity_set"),
  formula("smoke_detector_test_aerosol_volume_v1", "l", "aerosol_volume_l"),
  formula("smoke_detector_test_dispenser_time_v1", "machine_hour", "dispenser_machine_hour"),
  formula("smoke_detector_activation_protocol_quantity_v1", "document",
    "activation_protocol_quantity_document"),
  formula("addressable_loop_isolator_quantity_v1", "pcs", "loop_isolator_quantity_piece"),
  formula("fire_resistant_junction_box_quantity_v1", "pcs", "junction_box_quantity_piece"),
  formula("addressable_detector_installed_net_v2", "pcs", "detector_count"),
  formula("addressable_detector_retained_spare_v2", "pcs", "detector_retained_spare_piece"),
  formula("addressable_detector_total_need_v2", "pcs", "detector_count+detector_retained_spare_piece"),
  formula("addressable_detector_package_count_v2", "package",
    "ceil((detector_count+detector_retained_spare_piece)/detector_supplier_pack_size_piece)"),
  formula("addressable_detector_remainder_v2", "pcs",
    "ceil((detector_count+detector_retained_spare_piece)/detector_supplier_pack_size_piece)*detector_supplier_pack_size_piece-detector_count"),
  formula("addressable_detector_surplus_v2", "pcs",
    "max(0,ceil((detector_count+detector_retained_spare_piece)/detector_supplier_pack_size_piece)*detector_supplier_pack_size_piece-detector_count-detector_retained_spare_piece)"),
  formula("addressable_base_installed_net_v2", "pcs", "detector_count"),
  formula("addressable_base_retained_spare_v2", "pcs", "base_retained_spare_piece"),
  formula("addressable_base_total_need_v2", "pcs", "detector_count+base_retained_spare_piece"),
  formula("addressable_base_package_count_v2", "package",
    "ceil((detector_count+base_retained_spare_piece)/base_supplier_pack_size_piece)"),
  formula("addressable_base_remainder_v2", "pcs",
    "ceil((detector_count+base_retained_spare_piece)/base_supplier_pack_size_piece)*base_supplier_pack_size_piece-detector_count"),
  formula("addressable_base_surplus_v2", "pcs",
    "max(0,ceil((detector_count+base_retained_spare_piece)/base_supplier_pack_size_piece)*base_supplier_pack_size_piece-detector_count-base_retained_spare_piece)"),
  formula("addressable_detector_installation_labor_v2", "man_hour", "detector_installation_labor_h"),
  formula("addressable_detector_programming_testing_labor_v2", "man_hour", "detector_programming_testing_labor_h"),
  formula("addressable_detector_mounting_tool_v2", "machine_hour", "detector_mounting_tool_machine_h"),
  formula("addressable_loop_programmer_v2", "machine_hour", "addressable_loop_programmer_machine_h"),
  formula("addressable_detector_delivery_v2", "trip", "detector_delivery_trip_count"),
  formula("addressable_detector_waste_removal_v2", "trip", "detector_waste_removal_trip_count"),
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
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
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
    costTreatment: input.costTreatment ?? "OWN_COST",
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
      "automatic retained spare or supplier package",
      "automatic labor, tool or logistics quantity",
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
    sourceRole: "USER_SUPPLIED_OR_APPROVED_ADDRESSABLE_DETECTOR_SCOPE",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:addressable_optical_smoke_detector", ordinal: 1,
    section: "Оборудование системы", category: "material",
    titleRu: "Извещатель пожарный дымовой оптико-электронный адресный", unitId: "pcs",
    formulaId: "addressable_optical_smoke_detector_order_v2", procurementEligible: true,
    titleParameterIds: ["detector_product_designation"],
    sourceRole: "USER_SUPPLIED_OR_APPROVED_ADDRESSABLE_DETECTOR_SCOPE" }),
  resource({ rowId: "rc09:addressable_detector_base", ordinal: 2,
    section: "Оборудование системы", category: "material",
    titleRu: "База монтажная, совместимая с адресным пожарным извещателем", unitId: "pcs",
    formulaId: "addressable_detector_base_order_v2", procurementEligible: true,
    titleParameterIds: ["base_product_designation"],
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
    sourceRole: "APPROVED_COMMISSIONING_PROGRAM", costTreatment: "INFORMATIONAL_SCOPE" }),
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
  resource({ rowId: "rc09:detector-balance:installed-net", ordinal: 10,
    section: "Баланс извещателей", category: "material", titleRu: "Чистое количество установленных извещателей",
    unitId: "pcs", formulaId: "addressable_detector_installed_net_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:detector-balance:retained-spare", ordinal: 11,
    section: "Баланс извещателей", category: "material", titleRu: "Сохраняемый резерв извещателей",
    unitId: "pcs", formulaId: "addressable_detector_retained_spare_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:detector-balance:total-need", ordinal: 12,
    section: "Баланс извещателей", category: "material", titleRu: "Общая потребность в извещателях",
    unitId: "pcs", formulaId: "addressable_detector_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:detector-balance:package-count", ordinal: 13,
    section: "Баланс извещателей", category: "material", titleRu: "Количество упаковок извещателей",
    unitId: "package", formulaId: "addressable_detector_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:detector-balance:remainder", ordinal: 14,
    section: "Баланс извещателей", category: "material", titleRu: "Остаток извещателей после установки",
    unitId: "pcs", formulaId: "addressable_detector_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:detector-balance:surplus-beyond-reserve", ordinal: 15,
    section: "Баланс извещателей", category: "material", titleRu: "Свободный остаток извещателей сверх резерва",
    unitId: "pcs", formulaId: "addressable_detector_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:base-balance:installed-net", ordinal: 16,
    section: "Баланс монтажных баз", category: "material", titleRu: "Чистое количество установленных монтажных баз",
    unitId: "pcs", formulaId: "addressable_base_installed_net_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:base-balance:retained-spare", ordinal: 17,
    section: "Баланс монтажных баз", category: "material", titleRu: "Сохраняемый резерв монтажных баз",
    unitId: "pcs", formulaId: "addressable_base_retained_spare_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:base-balance:total-need", ordinal: 18,
    section: "Баланс монтажных баз", category: "material", titleRu: "Общая потребность в монтажных базах",
    unitId: "pcs", formulaId: "addressable_base_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:base-balance:package-count", ordinal: 19,
    section: "Баланс монтажных баз", category: "material", titleRu: "Количество упаковок монтажных баз",
    unitId: "package", formulaId: "addressable_base_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:base-balance:remainder", ordinal: 20,
    section: "Баланс монтажных баз", category: "material", titleRu: "Остаток монтажных баз после установки",
    unitId: "pcs", formulaId: "addressable_base_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:base-balance:surplus-beyond-reserve", ordinal: 21,
    section: "Баланс монтажных баз", category: "material", titleRu: "Свободный остаток монтажных баз сверх резерва",
    unitId: "pcs", formulaId: "addressable_base_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:installation", ordinal: 22,
    section: "Труд", category: "construction_work", titleRu: "Труд монтажников пожарной автоматики",
    unitId: "man_hour", formulaId: "addressable_detector_installation_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:labor:programming-testing", ordinal: 23,
    section: "Труд", category: "construction_work", titleRu: "Труд наладчиков: адресация и функциональная проверка",
    unitId: "man_hour", formulaId: "addressable_detector_programming_testing_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_COMMISSIONING_PROGRAM" }),
  resource({ rowId: "rc09:equipment:mounting-tool", ordinal: 24,
    section: "Инструмент и оборудование", category: "equipment", titleRu: "Монтажный инструмент пожарной автоматики",
    unitId: "machine_hour", formulaId: "addressable_detector_mounting_tool_v2", procurementEligible: true,
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:equipment:loop-programmer", ordinal: 25,
    section: "Инструмент и оборудование", category: "equipment", titleRu: "Программатор адресного шлейфа",
    unitId: "machine_hour", formulaId: "addressable_loop_programmer_v2", procurementEligible: true,
    sourceRole: "APPROVED_COMMISSIONING_PROGRAM" }),
  resource({ rowId: "rc09:logistics:delivery", ordinal: 26,
    section: "Логистика", category: "service", titleRu: "Доставка извещателей, баз, материалов и инструмента",
    unitId: "trip", formulaId: "addressable_detector_delivery_v2", procurementEligible: true,
    sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "rc09:logistics:waste-removal", ordinal: 27,
    section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и отходов монтажа",
    unitId: "trip", formulaId: "addressable_detector_waste_removal_v2", procurementEligible: true,
    sourceRole: "APPROVED_WASTE_PLAN" }),
]);

export const ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT = Object.freeze({
  detector_count: 25,
  detector_type: "ADDRESSABLE_OPTICAL_SMOKE",
  base_type: "MATCHED_ADDRESSABLE_DETECTOR_BASE",
  detector_product_designation: "DET-A25-OPT",
  base_product_designation: "BASE-A25",
});

export const ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT = Object.freeze({
  ...ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  ...ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT,
  fastener_designation: "Комплект крепежа по узлу для фактического основания",
  fastener_quantity_set: 25,
  aerosol_designation: "Тестовый аэрозоль по программе пусконаладки", aerosol_volume_l: 0.18,
  dispenser_designation: "Устройство подачи аэрозоля по ППР", dispenser_machine_hour: 1.5,
  activation_protocol_designation: "Протокол адресации и проверки срабатывания по программе ПНР",
  activation_protocol_quantity_document: 1,
  detector_installation_labor_h: 15,
  detector_programming_testing_labor_h: 10,
  detector_mounting_tool_machine_h: 5,
  addressable_loop_programmer_machine_h: 4,
  detector_delivery_trip_count: 1,
  detector_waste_removal_trip_count: 1,
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
    confirmedParameters: { ...ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 35,
    hashJson: async (value) => JSON.stringify(value),
  });
}
