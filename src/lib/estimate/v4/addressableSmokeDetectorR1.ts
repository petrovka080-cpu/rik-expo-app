import smokeWholeSource from "../../../../data/estimate-benchmarks/source-packs/addressable-smoke-detector-balanced-s27-24.json";
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition}from"./automaticConstructionOwnerR1";
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

export const SMOKE_WHOLE_SOURCE_R1=smokeWholeSource.wholeDeviceMethodR1;
/** Exact atomic device cycle over the actual saved parent. This method does
 * not select a fire system, external loop, supply or object safety design. */
export function addressableSmokeWholeDeviceModelR1():AutomaticOwnerDefinition{
 const s=SMOKE_WHOLE_SOURCE_R1,p=s.actualParentModel,scopeId='rc09:addressable_smoke_detector_install',headId='rc09:addressable_optical_smoke_detector',baseId='rc09:addressable_detector_base',active={kind:'greater_than' as const,parameterId:'detector_count',value:0},facts=[s.decisionId,s.mountId,s.supplyId,s.programmeId,s.addressId,s.cageId,...s.actualRecords.map(f=>f.id)],eq=(id:string,value:string)=>({kind:'equals' as const,parameterId:id,value}),conditional=(id:string)=>({kind:'and' as const,operands:[active,eq(id,'REQUIRED')]});
 const part=buildAutomaticConstructionOwnerR1({contract:s.contract,semanticOwner:s.catalogId,sourceId:s.sourceId,normId:'PROJECT_EXACT_ADDRESSABLE_SMOKE_DEVICE_CYCLE_NOT_UNIVERSAL_NORM',sourceMetadata:{source_title:s.titleRu,source_document_version:s.contract,definition_hash:s.projectMethod.sha256,artifact_sha256:s.projectMethod.sha256,exact_locator:'DIP34A03 Rev14 physicalPDF6/8/9/11-17; compatiblebase/currentKDLv1.36 captures'},applicabilityRu:'Только документированный выбранный извещатель, новая совместимая база, принятая групповая поставка и реальный контроллер/схема/программа. Кабель шлейфа, ППКП, БП и полная АПС вне границы.',ordinary:[{id:'detector_supplier_pack_size_piece',title:'Документированная кратность фактической поставки',kind:'internal',valueType:'integer',unitId:'pcs',min:1},{id:'detector_count',title:'Подтверждённые устанавливаемые извещатели',kind:'internal',valueType:'integer',unitId:'pcs',min:1},{id:'loop_isolator_mode',title:'Фактическая применимость изолятора',kind:'internal',valueType:'enum',unitId:null,values:['NOT_REQUIRED','REQUIRED']},{id:'junction_box_mode',title:'Фактическая применимость коробки',kind:'internal',valueType:'enum',unitId:null,values:['NOT_REQUIRED','REQUIRED']},...s.additionalResources.map(r=>({id:r.quantityParameterId,title:r.nameRu,kind:'ordinary' as const,valueType:['pcs','pair','document','test'].includes(r.unitId)?'integer' as const:'decimal' as const,unitId:r.unitId,min:0}))],profile:[],conditional:[...s.actualRecords.map(f=>({id:f.id,title:f.titleRu,kind:'conditional' as const,valueType:'text' as const,unitId:null,resourceBranchConsumers:[scopeId]})),...[{id:s.decisionId,title:'Допуск выбранного приборного метода',values:['DOCUMENTED_COMPATIBLE','UNSUPPORTED','UNKNOWN']},{id:s.mountId,title:'Фактический способ монтажа базы',values:['DIRECT_BASE_REVIEWED','MK2_SOURCE_HELD','MK3_SOURCE_HELD','UNKNOWN']},{id:s.supplyId,title:'Фактический комплект поставки',values:['SEALED_GROUP10_REVIEWED','PARTIAL_CONTENTS_HELD','UNKNOWN']},{id:s.programmeId,title:'Программа полного дымового контроля',values:['FULL_SMOKE_RESTORE_REVIEWED','SIMPLIFIED_ONLY_UNSUPPORTED','UNKNOWN']},{id:s.addressId,title:'Фактический метод задания адреса',values:['KDL_PC_LIGHTGUIDE_REVIEWED','APA_SOURCE_HELD','KDL_PC_LASER_SOURCE_HELD','UNKNOWN']},{id:s.cageId,title:'Применимость защитного кожуха',values:['NOT_REQUIRED','REQUIRED','UNKNOWN']}].map(f=>({...f,kind:'conditional' as const,valueType:'enum' as const,unitId:null,resourceBranchConsumers:[scopeId]}))],deferMissingProjectFactsToRows:true,
  rows:[{rowId:headId,formulaId:'smoke_shadow_effective_head_order_r1',title:'Извещатель пожарный дымовой адресный',section:'Оборудование',category:'material',unitId:'pcs',expression:'detector_count',inclusion:active,procurement:true,costTreatment:'OWN_COST',effectiveQuantityOutput:{parameterId:s.effectiveDetectorOrderId,unitId:'pcs'}},{rowId:baseId,formulaId:'smoke_bundled_base_stock_r1',title:'Совместимая монтажная база в поставке извещателя',section:'Состав поставки',category:'material',unitId:'pcs',expression:s.effectiveDetectorOrderId,inclusion:active,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',purchaseBalanceOwnerRowId:headId},...s.additionalResources.map(r=>{const key=r.rowId.split(':').slice(-1)[0]!,inclusion=key==='programmer-stock'?{kind:'and' as const,operands:[active,eq(s.addressId,'APA_SOURCE_HELD')]}:key==='laser-tester'?{kind:'and' as const,operands:[active,eq(s.addressId,'KDL_PC_LASER_SOURCE_HELD')]}:key==='protective-cage'?conditional(s.cageId):key==='box-end'?conditional('junction_box_mode'):key==='isolator-end'?conditional('loop_isolator_mode'):key==='mount-kit'?{kind:'and' as const,operands:[active,{kind:'or' as const,operands:[eq(s.mountId,'MK2_SOURCE_HELD'),eq(s.mountId,'MK3_SOURCE_HELD')]}]}:active;return{rowId:r.rowId,formulaId:r.formulaId,title:r.nameRu,section:'Обеспечение монтажного цикла извещателя',category:r.category,unitId:r.unitId,expression:r.quantityParameterId,inclusion,procurement:r.costTreatment==='OWN_COST'&&r.resourceKind!=='LABOR',costTreatment:r.costTreatment as 'OWN_COST'|'INCLUDED_IN_RESOURCE_ROWS',...(r.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'?{purchaseBalanceOwnerRowId:r.costOwnerRowId}:{})};}),...s.factoryInventory.map(r=>({rowId:r.rowId,formulaId:r.formulaId,title:r.nameRu,section:'Комплектность поставки извещателя',category:r.category,unitId:r.unitId,expression:r.expression,inclusion:r.unitId==='document'?{kind:'and' as const,operands:[active,eq(s.supplyId,'SEALED_GROUP10_REVIEWED'),{kind:'formula_greater_than' as const,expression:'1-ceil(detector_supplier_pack_size_piece-10*floor(detector_supplier_pack_size_piece/10))',unitId:'pcs',value:0},{kind:'formula_greater_than' as const,expression:'1-ceil('+s.effectiveDetectorOrderId+'-10*floor('+s.effectiveDetectorOrderId+'/10))',unitId:'pcs',value:0}]}:active,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,purchaseBalanceOwnerRowId:r.costOwnerRowId}))],excludedUnownedAssumptions:['No area/radiusderived detectorcount or fixture25','No direct24V/200ohmcontrolleronly authority withoutactualcompatibleloop','No twoholes=2universalM4screws/dowels','No PH1orPH2fromcross2 specification','No aerosolml/head, paidseconds fromtechnicaldelay, testcountfromdetectorN','No default1tool/post/box/isolator or lifespanconsumption','No freewholesupplyfrompartialcontents','No secondpaidbase/addresslabel or sharedcontroller/loop/supplyowner','No simplifiedlaser/visualtest asfullsmoketest or wholeFASpass']});
 const nativeIds=new Set(p.parameters.map(x=>x.parameter_id)),balance=new Set(['detector_retained_spare_piece','detector_supplier_pack_size_piece']),historicalBaseBalance=new Set(['base_retained_spare_piece','base_supplier_pack_size_piece']),unknown=(x:AutomaticOwnerDefinition['parameters'][number])=>({...x,required:false,default_value:null,truth_metadata:{...unresolvedApplicationNormTruthR1(x.truth_metadata,'Нет применимого количественного источника/нормы или фактического оснащения. Число приборов, характеристика, пример и срок службы не заменяют норму.'),visible_when:{kind:'literal',value:false},runtime_profile_value:false,hidden_default_forbidden:true}}),actual=(x:AutomaticOwnerDefinition['parameters'][number])=>({...x,required:false,default_value:null,truth_metadata:{...x.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'INTERNAL_ONLY',runtime_profile_value:false,hidden_default_forbidden:true,provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'}}});
 const nativeParameters:AutomaticOwnerDefinition['parameters']=p.parameters.map(x=>{if(typeof x.title_ru!=='string'||!Number.isInteger(x.ordinal)||(x.unit_id!==null&&typeof x.unit_id!=='string')||x.truth_metadata===null||typeof x.truth_metadata!=='object'||Array.isArray(x.truth_metadata))throw Error('SMOKE_WHOLE_NATIVE_PARAMETER_METADATA_REQUIRED_R911');return{...x,unit_id:x.unit_id,truth_metadata:x.truth_metadata};});
 const parameters:AutomaticOwnerDefinition['parameters']=[...nativeParameters.map(x=>x.parameter_id==='detector_count'?{...x,required:false,default_value:null}:balance.has(x.parameter_id)?{...actual(x),constraints_json:{...x.constraints_json,min:x.parameter_id.endsWith('spare_piece')?0:1,conditionalWholeIntegerV1:{contractVersion:'canonical-conditional-whole-integer/v1',when:eq(s.decisionId,'DOCUMENTED_COMPATIBLE')}}}:historicalBaseBalance.has(x.parameter_id)?{...unknown(x),truth_metadata:{...unknown(x).truth_metadata,historicalSeparateBaseBalanceInactiveInBundledMethodR1:true}}:['integer','decimal'].includes(x.value_type)?unknown(x):actual(x)),...part.parameters.filter(x=>!nativeIds.has(x.parameter_id)).map(x=>{
  if(x.parameter_id===s.effectiveDetectorOrderId)return{...x,required:false,default_value:null,truth_metadata:{...x.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}};
  if(s.additionalResources.some(r=>r.quantityParameterId===x.parameter_id))return unknown(x);
  return{...actual(x),constraints_json:{...x.constraints_json,requiredWhen:active},truth_metadata:{...actual(x).truth_metadata,...([s.decisionId,s.mountId,s.supplyId,s.programmeId,s.addressId,s.cageId].includes(x.parameter_id)?{unknown_enum_values:x.parameter_id===s.decisionId?['UNKNOWN','UNSUPPORTED']:x.parameter_id===s.mountId?['UNKNOWN','MK2_SOURCE_HELD','MK3_SOURCE_HELD']:x.parameter_id===s.supplyId?['UNKNOWN','PARTIAL_CONTENTS_HELD']:x.parameter_id===s.programmeId?['UNKNOWN','SIMPLIFIED_ONLY_UNSUPPORTED']:x.parameter_id===s.addressId?['UNKNOWN','APA_SOURCE_HELD','KDL_PC_LASER_SOURCE_HELD']:['UNKNOWN']}:{})}};
 })].map((x,i)=>({...x,ordinal:i})),formulas=[...p.formulas as unknown as readonly CanonicalEstimateFormulaDefinition[],...part.formulas.filter(f=>f.formula_id!=='smoke_shadow_effective_head_order_r1')],decl=new Map(s.resourceDeclarations.map(d=>[d.rowId,d])),ops=new Map(s.operationRoster.map(o=>[o.operationId,o])),base=part.resources.find(r=>r.row_id===baseId)!;
 const resources=[...(p.resources as unknown as readonly CanonicalEstimateResourceDefinition[]).map(r=>r.row_id===baseId?{...r,formula_id:base.formula_id,resource_graph:{...r.resource_graph,...base.resource_graph},cost_owner_id:headId,procurement_eligible:false}:r),...part.resources.filter(r=>r.row_id!==headId&&r.row_id!==baseId)].map((r,i)=>{
  const d=decl.get(r.row_id);if(!d||d.formulaId!==r.formula_id||d.unitId!==r.unit_id||d.category!==r.category)throw Error('SMOKE_WHOLE_EXACT_DECLARATION_REQUIRED:'+r.row_id);const linked=d.operationIds.map(id=>ops.get(id)!),physical=s.additionalResources.find(x=>x.rowId===r.row_id),graph:Record<string,unknown>={...r.resource_graph,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:d.publicNameRu,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:d.resourceKind,...(d.rowKind==='RESOURCE'?{}:{rowKind:d.rowKind})},operationCompositionV1:{...linked[0]!,...(linked.length>1?{additionalOperations:linked.slice(1)}:{})},sourceWholeSmokeBoundaryR1:{sourceAdmission:false,actualProjectApproved:false,physicalQuantityAccepted:false,labourNormAccepted:false,actualSmokeProgrammeExecuted:false,wholeFASPass:false,FULL:false}};
  let cost_owner_id=r.cost_owner_id,procurement_eligible=r.procurement_eligible,inclusion_ast=r.inclusion_ast;
  if(r.row_id===headId)graph.effectiveQuantityOutputV1={parameterId:s.effectiveDetectorOrderId,unitId:'pcs'};
  if(r.row_id===baseId||r.row_id==='rc09:detector_address_label'){cost_owner_id=headId;procurement_eligible=false;graph.costTreatment='INCLUDED_IN_RESOURCE_ROWS';graph.costOwner='resource';graph.purchaseBalanceOwnerRowId=headId;graph.sourceBundledCoverageR1={sourceCountPerHead:1,locator:'Rev14PDF6table1.3.1',priceScopeAccepted:false,oldFinancialAndManualHistoryRetained:true,separateBaseBalanceNotCurrentSupply:true};}
  if(r.row_id.startsWith('rc09:base-balance:')&&r.row_id!=='rc09:base-balance:installed-net'){inclusion_ast={kind:'literal',value:false};graph.historicalSeparateBaseBalanceR1={retained:true,inactiveOnlyInExactBundledMethod:true,originalInclusionAst:r.inclusion_ast,reasonRu:'База поставляется с извещателем; прежний независимый баланс не является второй закупкой этой поставки.'};}
  if(physical)cost_owner_id=physical.costOwnerRowId;const factory=s.factoryInventory.find(x=>x.rowId===r.row_id);if(factory)cost_owner_id=factory.costOwnerRowId;
  if(physical)graph.physicalResourceCoverageHoldR1={oneCostOwnerRowId:physical.costOwnerRowId,ownerPriceScopeAccepted:false,nativeOverlapAccepted:false,quantityAuthority:physical.quantityAuthority};
  if(s.factoryInventory.some(x=>x.rowId===r.row_id))graph.sourceFactoryStockR1={actualSupplierContentsConfirmed:false,factorySupplyGuardAccepted:false,notConsumptionOrPerTest:true,partialSupplyNotAssumedWholeKit:true};
  if(r.row_id===scopeId){graph.inputParameterIds=[...new Set([...(r.resource_graph.inputParameterIds as string[]??[]),...facts,s.effectiveDetectorOrderId,'detector_supplier_pack_size_piece'])];graph.scopeRequirementV1={contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',objectFactMode:'PROJECT_APPLICABILITY_ONLY',groupId:'smoke-whole-device-actual-r1',groupTitleRu:'Монтаж выбранного адресного дымового извещателя',titleRu:'Применимость совместимых приборов и полной программы проверки',reasonRu:'Известное число приборов и ручное количество не подтверждают протокол, базу, комплектность, внешнюю ДПЛС, безопасность и дымовую проверку.',exactScopeWhen:{kind:'and',operands:[active,eq(s.decisionId,'DOCUMENTED_COMPATIBLE'),eq(s.mountId,'DIRECT_BASE_REVIEWED'),eq(s.supplyId,'SEALED_GROUP10_REVIEWED'),eq(s.programmeId,'FULL_SMOKE_RESTORE_REVIEWED')]},objectFactParameterId:s.decisionId,unknownObjectValues:['UNKNOWN','UNSUPPORTED'],requiredFactParameterIds:facts,coveringRowIds:[],originalRowIds:s.resourceDeclarations.filter(d=>d.rowId!==scopeId).map(d=>d.rowId),projectOperationContextsV1:[{when:active,resourceRowIds:s.resourceDeclarations.filter(d=>d.rowKind==='RESOURCE').map(d=>d.rowId),applicabilityWhen:{kind:'and',operands:[active,{kind:'formula_greater_than',expression:'1-ceil(detector_supplier_pack_size_piece-10*floor(detector_supplier_pack_size_piece/10))',unitId:'pcs',value:0},{kind:'formula_greater_than',expression:'1-ceil('+s.effectiveDetectorOrderId+'-10*floor('+s.effectiveDetectorOrderId+'/10))',unitId:'pcs',value:0}]},requiredFactParameterIds:facts,unknownFactValues:{[s.decisionId]:['UNKNOWN','UNSUPPORTED'],[s.mountId]:['UNKNOWN','MK2_SOURCE_HELD','MK3_SOURCE_HELD'],[s.supplyId]:['UNKNOWN','PARTIAL_CONTENTS_HELD'],[s.programmeId]:['UNKNOWN','SIMPLIFIED_ONLY_UNSUPPORTED'],[s.addressId]:['UNKNOWN','APA_SOURCE_HELD','KDL_PC_LASER_SOURCE_HELD'],[s.cageId]:['UNKNOWN']}}],sourceEvidence:[{sha256:s.projectMethod.sha256,locator:'Complete12operation devicecycle with exact manufacturerbytes; notobjectproject/fullFAS/physicaltestresult'}]};}
  const{row_sha256:_old,...old}=r,next={...old,ordinal:i,inclusion_ast,cost_owner_id,procurement_eligible,resource_graph:graph,source_metadata:r.row_id===baseId||r.row_id==='rc09:detector_address_label'?{...r.source_metadata,sourceOwnedBundledDeltaR1:{priorFormulaId:p.resources.find(x=>x.row_id===r.row_id)!.formula_id,priorCostOwnerRowId:r.row_id,priorProcurementEligible:true,priorSourceMetadataPreserved:true,sourceId:s.sourceId,sourceSha256:s.projectMethod.sha256,physicalResourceNotHidden:true,manualHistoryRetained:true}}:r.source_metadata};return{...next,row_sha256:estimateDeterministicHash(next)};
 });
 if(new Set(parameters.map(p=>p.parameter_id)).size!==parameters.length||new Set(formulas.map(f=>f.formula_id)).size!==formulas.length||new Set(resources.map(r=>r.row_id)).size!==resources.length)throw Error('SMOKE_WHOLE_ID_COLLISION');
 return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['detector_count']};
}

export function assessAddressableSmokeWholeDeviceR1(value:unknown){
 const rec=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x),a=rec(value)?value:{},s=SMOKE_WHOLE_SOURCE_R1,docs=rec(a.records)?a.records:{},missing=s.actualRecords.filter(f=>typeof docs[f.id]!=='string'||!String(docs[f.id]).trim()).map(f=>f.id),issues:string[]=[];
 if(a.bindingChannel!=='SERVER_REVIEWED_PROJECT_RECORDS'||a.methodId!==s.candidateMethodId||a.detectorModel!=='DIP-34A-03'||a.detectorManualRevision!==14||a.baseMode!=='MATCHED_NEW_SUPPLIED_BASE'||a.controllerModel!=='S2000-KDL-2I-01'||a.controllerVersion!=='1.36')issues.push('EXACT_DEVICE_BASE_PROTOCOL_VERSION_REQUIRED');
 const pins=rec(a.sourceBindings)?a.sourceBindings:{};for(const p of s.primaryPins)if(pins[p.path.split(/[\\/]/).slice(-1)[0]!]!==p.sha256)issues.push('EXACT_SMOKE_PRIMARY_BINDING_REQUIRED:'+p.path);
 for(const flag of['actualProjectLocationReviewed','actualExternalLoopAndOwnerReviewed','actualPolarityScreenAndLocalEndsReviewed','actualMountAndSubstrateReviewed','actualSafeAccessAndQualifiedWorkersReviewed','actualUniqueAddressAndType21ParametersReviewed','actualSafeOutputsAndSmokeRestoreProgrammeReviewed','actualSupplierKitAndPriceCoverageReviewed','actualMetersAndSharedStockReviewed','actualHandoverAndWasteReviewed'])if(a[flag]!==true)issues.push('ACTUAL_SMOKE_CONDITION_REQUIRED:'+flag);
 const m=rec(a.measurements)?a.measurements:{},number=(k:string)=>typeof m[k]==='number'&&Number.isFinite(m[k])?m[k]as number:null,n=number('installedDetectors'),pack=number('supplierPackPieces'),reserve=number('retainedSparePieces'),minV=number('minimumLocalLoopV'),maxV=number('maximumLocalLoopV'),speed=number('airVelocityMaxMps');
 if(n===null||!Number.isSafeInteger(n)||n<1||pack===null||!Number.isSafeInteger(pack)||pack<10||pack%10!==0||reserve===null||!Number.isSafeInteger(reserve)||reserve<0||a.supplyMode!=='SEALED_GROUP10_REVIEWED')issues.push('ACTUAL_WHOLE_GROUP10_SUPPLY_AND_BALANCE_REQUIRED');
 const resistance=number('maximumActiveLoopResistanceOhm'),insulation=number('minimumLoopInsulationKohm'),tmin=number('ambientMinC'),tmax=number('ambientMaxC'),rh=number('humidityMaxPct');if(minV===null||maxV===null||minV<8||maxV>11||minV>maxV||resistance===null||resistance<0||resistance>100||insulation===null||insulation<50||a.completeActualLoopLoadReviewed!==true)issues.push('ACTUAL_COMPATIBLE_LOCAL_DPLS_POWER_REQUIRED');
 if(tmin===null||tmax===null||tmin< -30||tmax>55||tmin>tmax||rh===null||rh<0||rh>95||speed===null||speed<0||speed>15||a.nonAggressiveNonExplosiveEnvironment!==true||a.mountMode!=='DIRECT_BASE_REVIEWED')issues.push('ACTUAL_SUPPORTED_ENVIRONMENT_AND_MOUNT_REQUIRED');
 if(a.programmeMode!=='FULL_SMOKE_RESTORE_REVIEWED'||a.recordedCorrectAddressAndNormalRestore!==true||a.simplifiedTestAsFullSmoke===true||a.oneHeadAsWholeFasPass===true)issues.push('FULL_SMOKE_CHANNEL_ADDRESS_AND_RESTORE_PROGRAMME_REQUIRED');
 if(a.cableMetresFromDetectorCount===true||a.holesAsUniversalFastenerRate===true||a.toolsPerDetector===true||a.partialSupplyAsWholeKit===true||a.sharedLoopPanelOrSupplyDoubleCharged===true)issues.push('FALSE_QUANTITY_OR_DOUBLE_OWNER_FORBIDDEN');
 return{status:issues.length||missing.length?'BLOCKED':'COMPATIBILITY_INPUTS_PRESENT',issues,missingActualRecordIds:missing,sourceAdmission:false,projectApproval:false,physicalProvisionAccepted:false,actualSmokeProgrammeExecuted:false,wholeFASPass:false,estimateCompilationAllowed:false,FULL:false}as const;
}
