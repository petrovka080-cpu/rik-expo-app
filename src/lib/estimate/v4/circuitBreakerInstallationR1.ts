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

export const CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID =
  "canonical-work:base:electrical_interior_breaker_install_standard";
export const CIRCUIT_BREAKER_INSTALLATION_SOURCE_ID =
  "s2724_eaeu_krerm_and_project_circuit_breaker_package_v1";
export const CIRCUIT_BREAKER_INSTALLATION_NORM_ID =
  "norm:kg:q4:circuit-breaker-product-project-installation-package:v1";

export const CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_title:
    "ТР ТС 004/2011, КРЕРм-2015 и утверждённая проектная ведомость автоматических выключателей",
  source_authority:
    "ЕЭК, Министерство строительства Кыргызской Республики и утверждающий инженер проекта",
  source_document_version:
    "EAEU_TR_TS_004_2011_ACTIVE_WITH_2022_AMENDMENTS_AND_KG_KRERM_2015_CAPTURE_2026_10_01",
  definition_hash: "c548e94d39465ed0fcd68e4269d00ae7c1a44eaea9cccf5cdd81210d4da84ac4",
  exact_locator:
    "ТР ТС 004/2011, статья 4 и приложение: применимость конкретного низковольтного изделия подтверждается паспортом и документом соответствия; КРЕРм-2015, Указания по применению, п. 2.9.2: проектно-зависимые материалы принимаются по проектным данным с учётом трудноустранимых потерь и отходов; однолинейная схема и расчёт токов/КЗ задают аппарат, ведомость щита — его комплектующие, ППР — труд и инструмент, программа приёмки — проверки",
  use_restriction:
    "Профиль не выбирает защиту. Полюсность, характеристика, ток, отключающая способность, напряжение и конкретное изделие должны быть прямо заданы пользователем или утверждённой проектной документацией. Кабельные линии, корпус и сборка щита, УЗО и расчёт защиты не включаются.",
  source_kind: "OFFICIAL_PRODUCT_SAFETY_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE",
  official_url: "https://eec.eaeunion.org/upload/medialibrary/269/TR-TS-Downvolt.pdf",
  artifact_sha256: "c548e94d39465ed0fcd68e4269d00ae7c1a44eaea9cccf5cdd81210d4da84ac4",
  companion_krerm_sha256:
    "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
  electrical_acceptance_snapshot_sha256:
    "6e1880d275933e2d5d9873b74454f01e6cb0e86250fcb9510f64b29da6378e31",
});

const CONDITIONAL_DETAILS = new Set([
  "comb_bus_designation", "comb_bus_length_m", "comb_bus_end_cap_designation",
  "comb_bus_end_cap_quantity_piece", "auxiliary_contact_designation",
  "auxiliary_contact_quantity_piece", "din_rail_segment_designation",
  "din_rail_segment_length_m",
]);
const PARAMETER_SPECS = Object.freeze([
  ["breaker_count", "Количество устанавливаемых автоматических выключателей", "integer", "pcs", null],
  ["breaker_product_designation", "Конкретная марка и каталожное обозначение выключателя", "text", null, null],
  ["pole_configuration", "Полюсность выключателя", "enum", null, ["1P", "2P", "3P", "4P"]],
  ["trip_curve", "Время-токовая характеристика выключателя", "enum", null, ["B", "C", "D"]],
  ["rated_current_a", "Номинальный ток выключателя", "decimal", "A", null],
  ["breaking_capacity_ka", "Номинальная отключающая способность", "decimal", "kA", null],
  ["rated_voltage_v", "Номинальное напряжение", "decimal", "V", null],
  ["mounting_system", "Система установки аппарата", "enum", null, ["EXISTING_DIN_RAIL"]],
  ["breaker_retained_spare_piece", "Сохраняемый резерв автоматических выключателей", "decimal", "pcs", null],
  ["breaker_supplier_pack_size_piece", "Количество выключателей в упаковке поставщика", "integer", "pcs", null],
  ["selection_basis_reference", "Ссылка на однолинейную схему и расчёт выбора защиты", "text", null, null],
  ["circuit_marker_designation", "Маркировка групповой цепи по ведомости", "text", null, null],
  ["circuit_marker_quantity_piece", "Количество маркировочных элементов", "decimal", "pcs", null],
  ["terminal_accessory_designation", "Наконечник или клеммная принадлежность по типу проводника", "text", null, null],
  ["terminal_accessory_quantity_piece", "Количество наконечников или клеммных принадлежностей", "decimal", "pcs", null],
  ["torque_seal_designation", "Контрольная метка затяжки по ППР", "text", null, null],
  ["torque_seal_quantity_set", "Количество комплектов контрольной маркировки затяжки", "decimal", "set", null],
  ["breaker_test_designation", "Проверка аппарата по программе приёмки", "text", null, null],
  ["breaker_test_count", "Количество проверок автоматических выключателей", "decimal", "test", null],
  ["breaker_installation_labor_h", "Труд электромонтажников по ППР", "decimal", "man_hour", null],
  ["breaker_testing_labor_h", "Труд электролаборатории по программе приёмки", "decimal", "man_hour", null],
  ["torque_screwdriver_machine_h", "Работа калиброванного динамометрического инструмента", "decimal", "machine_hour", null],
  ["breaker_installation_tool_machine_h", "Работа электромонтажного инструмента", "decimal", "machine_hour", null],
  ["breaker_tester_machine_h", "Работа измерительного комплекта", "decimal", "machine_hour", null],
  ["breaker_delivery_trip_count", "Рейсы доставки аппаратов и комплектующих", "integer", "trip", null],
  ["breaker_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов", "integer", "trip", null],
  ["comb_bus_mode", "Гребенчатая шина требуется по схеме щита", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["comb_bus_designation", "Гребенчатая шина точного шага и сечения", "text", null, null],
  ["comb_bus_length_m", "Длина гребенчатой шины", "decimal", "m", null],
  ["comb_bus_end_cap_designation", "Торцевая заглушка гребенчатой шины", "text", null, null],
  ["comb_bus_end_cap_quantity_piece", "Количество торцевых заглушек", "decimal", "pcs", null],
  ["auxiliary_contact_mode", "Вспомогательный контакт требуется по схеме", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["auxiliary_contact_designation", "Вспомогательный контакт совместимой серии", "text", null, null],
  ["auxiliary_contact_quantity_piece", "Количество вспомогательных контактов", "decimal", "pcs", null],
  ["din_rail_segment_mode", "Дополнительный участок DIN-рейки требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["din_rail_segment_designation", "DIN-рейка по проектному узлу", "text", null, null],
  ["din_rail_segment_length_m", "Длина дополнительной DIN-рейки", "decimal", "m", null],
] as const);
const KNOWN_SCOPE = [
  "breaker_count", "breaker_product_designation", "pole_configuration", "trip_curve",
  "rated_current_a", "breaking_capacity_ka", "rated_voltage_v", "mounting_system",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "breaker_retained_spare_piece", "breaker_supplier_pack_size_piece",
]);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("comb_bus_")
    ? "comb_bus_mode"
    : parameterId.startsWith("auxiliary_contact_")
      ? "auxiliary_contact_mode"
      : parameterId.startsWith("din_rail_segment_")
        ? "din_rail_segment_mode"
        : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type CircuitBreakerInstallationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const CIRCUIT_BREAKER_INSTALLATION_PARAMETERS:
readonly CircuitBreakerInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
          ? { min: VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            && parameterId !== "breaker_supplier_pack_size_piece"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.circuit-breaker-installation-r1",
      semantic_parameter_key: `circuit-breaker-installation:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "EXPLICIT_SELECTED_DEVICE_AND_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_SINGLE_LINE_PANEL_SCHEDULE_METHOD_STATEMENT_OR_TEST_PROGRAM",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "breaker_count"
          ? "Укажите подтверждённое количество аппаратов одного точного типа."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите прямо по однолинейной схеме, расчёту защиты и паспорту выбранного изделия; приложение не подбирает аппарат.`
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? `${titleRu}: нейтральное предварительное значение видно в смете; замените по ведомости запаса и упаковке поставщика.`
              : `${titleRu}: укажите по однолинейной схеме, ведомости щита, ППР, программе приёмки или плану логистики.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_SELECTED_DEVICE_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PROJECT_PANEL_SCHEDULE_METHOD_STATEMENT_TEST_OR_LOGISTICS_DOCUMENT",
        source_document: CIRCUIT_BREAKER_INSTALLATION_SOURCE_ID,
        source_locator: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.exact_locator,
        guide_version: "circuit-breaker-installation-s27-24-r1",
        source_snapshot_hash: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.artifact_sha256,
        applicability:
          "Монтаж уже выбранного низковольтного автоматического выключателя на существующей DIN-рейке; расчёт выбора защиты, кабельная линия, УЗО, корпус и сборка щита исключены.",
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

export const CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT = Object.freeze({
  breaker_retained_spare_piece: 0,
  breaker_supplier_pack_size_piece: 1,
});
export const CIRCUIT_BREAKER_INSTALLATION_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const CIRCUIT_BREAKER_INSTALLATION_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [CIRCUIT_BREAKER_INSTALLATION_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}
export const CIRCUIT_BREAKER_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("circuit_breaker_install_count_v1", "pcs", "breaker_count"),
  formula("circuit_breaker_order_quantity_v1", "pcs",
    "ceil((breaker_count+breaker_retained_spare_piece)/breaker_supplier_pack_size_piece)*breaker_supplier_pack_size_piece"),
  formula("circuit_breaker_selection_basis_count_v1", "pcs", "breaker_count"),
  formula("circuit_breaker_marker_quantity_v1", "pcs", "circuit_marker_quantity_piece"),
  formula("circuit_breaker_terminal_accessory_quantity_v1", "pcs", "terminal_accessory_quantity_piece"),
  formula("circuit_breaker_torque_seal_quantity_v1", "set", "torque_seal_quantity_set"),
  formula("circuit_breaker_test_count_v1", "test", "breaker_test_count"),
  formula("circuit_breaker_installed_net_v1", "pcs", "breaker_count"),
  formula("circuit_breaker_retained_spare_v1", "pcs", "breaker_retained_spare_piece"),
  formula("circuit_breaker_total_need_v1", "pcs", "breaker_count+breaker_retained_spare_piece"),
  formula("circuit_breaker_package_count_v1", "package",
    "ceil((breaker_count+breaker_retained_spare_piece)/breaker_supplier_pack_size_piece)"),
  formula("circuit_breaker_remainder_v1", "pcs",
    "ceil((breaker_count+breaker_retained_spare_piece)/breaker_supplier_pack_size_piece)*breaker_supplier_pack_size_piece-breaker_count"),
  formula("circuit_breaker_surplus_v1", "pcs",
    "max(0,ceil((breaker_count+breaker_retained_spare_piece)/breaker_supplier_pack_size_piece)*breaker_supplier_pack_size_piece-breaker_count-breaker_retained_spare_piece)"),
  formula("circuit_breaker_installation_labor_v1", "man_hour", "breaker_installation_labor_h"),
  formula("circuit_breaker_testing_labor_v1", "man_hour", "breaker_testing_labor_h"),
  formula("circuit_breaker_torque_screwdriver_v1", "machine_hour", "torque_screwdriver_machine_h"),
  formula("circuit_breaker_installation_tool_v1", "machine_hour", "breaker_installation_tool_machine_h"),
  formula("circuit_breaker_tester_v1", "machine_hour", "breaker_tester_machine_h"),
  formula("circuit_breaker_delivery_v1", "trip", "breaker_delivery_trip_count"),
  formula("circuit_breaker_waste_removal_v1", "trip", "breaker_waste_removal_trip_count"),
  formula("circuit_breaker_comb_bus_length_v1", "m", "comb_bus_length_m"),
  formula("circuit_breaker_comb_bus_end_cap_quantity_v1", "pcs", "comb_bus_end_cap_quantity_piece"),
  formula("circuit_breaker_auxiliary_contact_quantity_v1", "pcs", "auxiliary_contact_quantity_piece"),
  formula("circuit_breaker_din_rail_segment_length_v1", "m", "din_rail_segment_length_m"),
]);
const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; inclusionAst?: Json; procurementEligible: boolean;
  titleParameterIds?: string[]; sourceRole: string;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId, normalizedUom: input.unitId,
    semanticOwnerId: `circuit-breaker-installation:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
  };
  const sourceMetadata = {
    truth_contract_version: "R3", synthetic: false, sourceRole: input.sourceRole,
    normativeTrace: [{ sourceId: CIRCUIT_BREAKER_INSTALLATION_SOURCE_ID,
      source_id: CIRCUIT_BREAKER_INSTALLATION_SOURCE_ID,
      normId: CIRCUIT_BREAKER_INSTALLATION_NORM_ID,
      norm_id: CIRCUIT_BREAKER_INSTALLATION_NORM_ID,
      normVersion: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.source_document_version,
      source_title: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.source_title,
      exact_locator: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: CIRCUIT_BREAKER_INSTALLATION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole }],
    excludedUnownedAssumptions: [
      "automatic selection of pole count, trip curve, rated current or breaking capacity",
      "automatic comb bus, auxiliary contact, DIN rail or terminal quantity",
      "historical labor, tool, test or logistics rate",
      "cable line, RCD, panel enclosure or complete switchboard assembly",
      "invented price",
    ],
  };
  return { id: `resource-${input.rowId.replace(/:/gu, "-")}`, row_id: input.rowId,
    ordinal: input.ordinal, section: input.section, category: input.category,
    title_ru: input.titleRu, unit_id: input.unitId, formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible, cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }) };
}

export const CIRCUIT_BREAKER_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "q4:breaker:install", ordinal: 0, section: "Технологическая операция", category: "construction_work", titleRu: "Монтаж и подключение выбранного автоматического выключателя на существующей DIN-рейке", unitId: "pcs", formulaId: "circuit_breaker_install_count_v1", procurementEligible: false, titleParameterIds: ["breaker_product_designation"], sourceRole: "USER_SUPPLIED_OR_APPROVED_SELECTED_DEVICE_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:device-order", ordinal: 1, section: "Закупка аппаратов", category: "material", titleRu: "Автоматический выключатель — заказ", unitId: "pcs", formulaId: "circuit_breaker_order_quantity_v1", procurementEligible: true, titleParameterIds: ["breaker_product_designation"], sourceRole: "VISIBLE_PROCUREMENT_BALANCE" }),
  resource({ rowId: "q4:breaker:selection-basis", ordinal: 2, section: "Проектное основание", category: "documentation", titleRu: "Однолинейная схема и расчёт выбора аппарата", unitId: "pcs", formulaId: "circuit_breaker_selection_basis_count_v1", procurementEligible: false, titleParameterIds: ["selection_basis_reference"], sourceRole: "APPROVED_PROTECTION_CALCULATION", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:circuit-marker", ordinal: 3, section: "Комплектующие и расходники", category: "material", titleRu: "Маркировка групповой цепи", unitId: "pcs", formulaId: "circuit_breaker_marker_quantity_v1", procurementEligible: true, titleParameterIds: ["circuit_marker_designation"], sourceRole: "APPROVED_PANEL_SCHEDULE" }),
  resource({ rowId: "q4:breaker:terminal-accessory", ordinal: 4, section: "Комплектующие и расходники", category: "material", titleRu: "Наконечник или клеммная принадлежность проводника", unitId: "pcs", formulaId: "circuit_breaker_terminal_accessory_quantity_v1", procurementEligible: true, titleParameterIds: ["terminal_accessory_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "q4:breaker:torque-seal", ordinal: 5, section: "Комплектующие и расходники", category: "material", titleRu: "Контрольная маркировка затяжки", unitId: "set", formulaId: "circuit_breaker_torque_seal_quantity_v1", procurementEligible: true, titleParameterIds: ["torque_seal_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "q4:breaker:test", ordinal: 6, section: "Контроль", category: "service", titleRu: "Проверка установленного автоматического выключателя", unitId: "test", formulaId: "circuit_breaker_test_count_v1", procurementEligible: false, titleParameterIds: ["breaker_test_designation"], sourceRole: "APPROVED_TEST_PROGRAM", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:balance:installed-net", ordinal: 7, section: "Баланс аппаратов", category: "material", titleRu: "Чистое количество установленных выключателей", unitId: "pcs", formulaId: "circuit_breaker_installed_net_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_SELECTED_DEVICE_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:balance:retained-spare", ordinal: 8, section: "Баланс аппаратов", category: "material", titleRu: "Сохраняемый резерв выключателей", unitId: "pcs", formulaId: "circuit_breaker_retained_spare_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:balance:total-need", ordinal: 9, section: "Баланс аппаратов", category: "material", titleRu: "Общая потребность: монтаж плюс резерв", unitId: "pcs", formulaId: "circuit_breaker_total_need_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:balance:package-count", ordinal: 10, section: "Баланс аппаратов", category: "material", titleRu: "Количество упаковок поставщика", unitId: "package", formulaId: "circuit_breaker_package_count_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:balance:remainder", ordinal: 11, section: "Баланс аппаратов", category: "material", titleRu: "Остаток после установки", unitId: "pcs", formulaId: "circuit_breaker_remainder_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:balance:surplus-beyond-reserve", ordinal: 12, section: "Баланс аппаратов", category: "material", titleRu: "Свободный остаток сверх сохраняемого резерва", unitId: "pcs", formulaId: "circuit_breaker_surplus_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:breaker:labor:installation", ordinal: 13, section: "Труд", category: "construction_work", titleRu: "Труд электромонтажников: установка, подключение и маркировка аппаратов", unitId: "man_hour", formulaId: "circuit_breaker_installation_labor_v1", procurementEligible: false, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "q4:breaker:labor:testing", ordinal: 14, section: "Труд", category: "construction_work", titleRu: "Труд электролаборатории по программе приёмки", unitId: "man_hour", formulaId: "circuit_breaker_testing_labor_v1", procurementEligible: false, sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "q4:breaker:equipment:torque-screwdriver", ordinal: 15, section: "Инструмент и оборудование", category: "equipment", titleRu: "Калиброванный динамометрический инструмент", unitId: "machine_hour", formulaId: "circuit_breaker_torque_screwdriver_v1", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "q4:breaker:equipment:installation-tool", ordinal: 16, section: "Инструмент и оборудование", category: "equipment", titleRu: "Электромонтажный инструмент для установки и оконцевания", unitId: "machine_hour", formulaId: "circuit_breaker_installation_tool_v1", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "q4:breaker:equipment:tester", ordinal: 17, section: "Контроль", category: "equipment", titleRu: "Измерительный комплект по программе проверки аппарата", unitId: "machine_hour", formulaId: "circuit_breaker_tester_v1", procurementEligible: true, sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "q4:breaker:logistics:delivery", ordinal: 18, section: "Логистика", category: "service", titleRu: "Доставка аппаратов, комплектующих и инструмента", unitId: "trip", formulaId: "circuit_breaker_delivery_v1", procurementEligible: true, sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "q4:breaker:logistics:waste-removal", ordinal: 19, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и отходов монтажа", unitId: "trip", formulaId: "circuit_breaker_waste_removal_v1", procurementEligible: true, sourceRole: "APPROVED_WASTE_PLAN" }),
  resource({ rowId: "q4:breaker:conditional:comb-bus", ordinal: 20, section: "Условные комплектующие", category: "material", titleRu: "Гребенчатая шина точного шага и сечения", unitId: "m", formulaId: "circuit_breaker_comb_bus_length_v1", inclusionAst: equals("comb_bus_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["comb_bus_designation"], sourceRole: "APPROVED_PANEL_SCHEDULE" }),
  resource({ rowId: "q4:breaker:conditional:comb-bus-end-cap", ordinal: 21, section: "Условные комплектующие", category: "material", titleRu: "Торцевая заглушка гребенчатой шины", unitId: "pcs", formulaId: "circuit_breaker_comb_bus_end_cap_quantity_v1", inclusionAst: equals("comb_bus_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["comb_bus_end_cap_designation"], sourceRole: "APPROVED_PANEL_SCHEDULE" }),
  resource({ rowId: "q4:breaker:conditional:auxiliary-contact", ordinal: 22, section: "Условные комплектующие", category: "material", titleRu: "Вспомогательный контакт совместимой серии", unitId: "pcs", formulaId: "circuit_breaker_auxiliary_contact_quantity_v1", inclusionAst: equals("auxiliary_contact_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["auxiliary_contact_designation"], sourceRole: "APPROVED_CONTROL_SCHEME" }),
  resource({ rowId: "q4:breaker:conditional:din-rail-segment", ordinal: 23, section: "Условные комплектующие", category: "material", titleRu: "Дополнительный участок DIN-рейки", unitId: "m", formulaId: "circuit_breaker_din_rail_segment_length_v1", inclusionAst: equals("din_rail_segment_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["din_rail_segment_designation"], sourceRole: "APPROVED_PANEL_LAYOUT" }),
]);

export const CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT = Object.freeze({
  breaker_count: 12,
  breaker_product_designation: "IEK BA47-29",
  pole_configuration: "1P",
  trip_curve: "C",
  rated_current_a: 16,
  breaking_capacity_ka: 6,
  rated_voltage_v: 230,
  mounting_system: "EXISTING_DIN_RAIL",
});
export const CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT = Object.freeze({
  ...CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT,
  ...CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT,
  selection_basis_reference: "Однолинейная схема ЭОМ-5 и расчёт токов КЗ ЭОМ-Р1",
  circuit_marker_designation: "Маркер групповой цепи по ведомости щита",
  circuit_marker_quantity_piece: 12,
  terminal_accessory_designation: "НШВИ по типу и сечению проводника схемы",
  terminal_accessory_quantity_piece: 24,
  torque_seal_designation: "Контрольный лак затяжки по ППР",
  torque_seal_quantity_set: 1,
  breaker_test_designation: "Проверка механического включения, маркировки и цепи по программе",
  breaker_test_count: 12,
  breaker_installation_labor_h: 7.2,
  breaker_testing_labor_h: 2.4,
  torque_screwdriver_machine_h: 1.2,
  breaker_installation_tool_machine_h: 3.6,
  breaker_tester_machine_h: 2.4,
  breaker_delivery_trip_count: 1,
  breaker_waste_removal_trip_count: 1,
  comb_bus_mode: "NOT_REQUIRED",
  auxiliary_contact_mode: "NOT_REQUIRED",
  din_rail_segment_mode: "NOT_REQUIRED",
});

export async function compileCircuitBreakerInstallationR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID;
  if (catalogId !== CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID) {
    throw new Error(`CIRCUIT_BREAKER_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.circuit-breaker-installation-r1", catalogId,
    primaryMeasureParameterId: "breaker_count",
    parameterDefinitions: [...CIRCUIT_BREAKER_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...CIRCUIT_BREAKER_INSTALLATION_FORMULAS],
    resourceDefinitions: [...CIRCUIT_BREAKER_INSTALLATION_RESOURCES], submittedParameters,
    confirmedParameters: { ...CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT },
    currencyCode: "KGS", priceItems: [], maximumResourceRows: 30,
    hashJson: async (value) => JSON.stringify(value) });
}
