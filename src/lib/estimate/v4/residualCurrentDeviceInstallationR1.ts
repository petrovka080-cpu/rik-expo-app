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

export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID =
  "canonical-work:base:electrical_interior_rcd_install_standard";
export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_ID =
  "s2724_eaeu_kg_acceptance_and_project_rcd_package_v1";
export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_NORM_ID =
  "norm:kg:q4:selected-rcd-project-installation-package:v1";

export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_title:
    "ТР ТС 004/2011, правила приёмки электрических сетей КР и проектный пакет выбранного УЗО/RCBO",
  source_authority:
    "ЕЭК, уполномоченные органы Кыргызской Республики и утверждающий инженер проекта",
  source_document_version:
    "EAEU_TR_TS_004_2011_ACTIVE_WITH_2022_AMENDMENTS_KG_ACCEPTANCE_2023_PROJECT_RCD_PACKAGE",
  definition_hash: "c548e94d39465ed0fcd68e4269d00ae7c1a44eaea9cccf5cdd81210d4da84ac4",
  exact_locator:
    "ТР ТС 004/2011, статья 4 и приложение: соответствие конкретного низковольтного изделия; Правила приёмки законченных строительством распределительных электрических сетей 0,38–10 кВ, приказ № 01-13/69 от 22.03.2023, пп. 4, 14, 20 и 22: соответствие проекту, испытания и протоколы; КРЕРм-2015, п. 2.9.2: проектные материальные количества; однолинейная схема и расчёт защиты задают выбранное УЗО/RCBO и его характеристики",
  use_restriction:
    "Профиль не выбирает тип дифференциальной защиты, чувствительность, номинал или селективность. Они должны быть заданы утверждённым расчётом и схемой. Кабельная линия, автоматический выключатель, корпус и комплектная сборка щита исключены.",
  source_kind: "OFFICIAL_PRODUCT_ACCEPTANCE_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE",
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
  ["rcd_count", "Количество устанавливаемых устройств дифференциальной защиты", "integer", "pcs", null],
  ["rcd_product_designation", "Конкретная марка и каталожное обозначение УЗО/RCBO", "text", null, null],
  ["rcd_device_type", "Тип устройства дифференциальной защиты", "enum", null, ["RCCB", "RCBO"]],
  ["pole_configuration", "Полюсность устройства", "enum", null, ["2P", "4P"]],
  ["rated_current_a", "Номинальный ток устройства", "decimal", "A", null],
  ["rated_residual_current_ma", "Номинальный отключающий дифференциальный ток", "decimal", "mA", null],
  ["residual_current_type", "Тип дифференциального тока", "enum", null, ["AC", "A", "F", "B"]],
  ["rated_voltage_v", "Номинальное напряжение", "decimal", "V", null],
  ["mounting_system", "Система установки устройства", "enum", null, ["EXISTING_DIN_RAIL"]],
  ["rcd_retained_spare_piece", "Сохраняемый резерв устройств", "decimal", "pcs", null],
  ["rcd_supplier_pack_size_piece", "Количество устройств в упаковке поставщика", "integer", "pcs", null],
  ["selection_basis_reference", "Ссылка на схему и расчёт дифференциальной защиты", "text", null, null],
  ["circuit_marker_designation", "Маркировка защищаемой цепи по ведомости", "text", null, null],
  ["circuit_marker_quantity_piece", "Количество маркировочных элементов", "decimal", "pcs", null],
  ["terminal_accessory_designation", "Наконечник или клеммная принадлежность по проводнику", "text", null, null],
  ["terminal_accessory_quantity_piece", "Количество наконечников или клеммных принадлежностей", "decimal", "pcs", null],
  ["torque_seal_designation", "Контрольная метка затяжки по ППР", "text", null, null],
  ["torque_seal_quantity_set", "Количество комплектов контрольной маркировки", "decimal", "set", null],
  ["rcd_trip_test_designation", "Проверка тока и времени срабатывания по программе", "text", null, null],
  ["rcd_trip_test_count", "Количество проверок срабатывания", "decimal", "test", null],
  ["rcd_installation_labor_h", "Труд электромонтажников по ППР", "decimal", "man_hour", null],
  ["rcd_testing_labor_h", "Труд электролаборатории по программе испытаний", "decimal", "man_hour", null],
  ["torque_screwdriver_machine_h", "Работа калиброванного динамометрического инструмента", "decimal", "machine_hour", null],
  ["rcd_installation_tool_machine_h", "Работа электромонтажного инструмента", "decimal", "machine_hour", null],
  ["rcd_tester_machine_h", "Работа измерителя параметров УЗО", "decimal", "machine_hour", null],
  ["rcd_delivery_trip_count", "Рейсы доставки устройств и комплектующих", "integer", "trip", null],
  ["rcd_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов", "integer", "trip", null],
  ["comb_bus_mode", "Совместимая гребенчатая шина требуется по схеме", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["comb_bus_designation", "Гребенчатая шина точного шага и исполнения", "text", null, null],
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
  "rcd_count", "rcd_product_designation", "rcd_device_type", "pole_configuration",
  "rated_current_a", "rated_residual_current_ma", "residual_current_type",
  "rated_voltage_v", "mounting_system",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "rcd_retained_spare_piece", "rcd_supplier_pack_size_piece",
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

export type ResidualCurrentDeviceInstallationParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
  };
export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS:
readonly ResidualCurrentDeviceInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
            && parameterId !== "rcd_supplier_pack_size_piece"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.residual-current-device-installation-r1",
      semantic_parameter_key: `residual-current-device-installation:${parameterId}`,
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
          : "APPROVED_PROTECTION_CALCULATION_PANEL_SCHEDULE_METHOD_OR_TEST_PROGRAM",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "rcd_count"
          ? "Укажите количество уже выбранных устройств одного точного типа."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по утверждённой схеме, расчёту защиты и паспорту; приложение не выбирает устройство.`
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? `${titleRu}: нейтральное предварительное значение видно в смете; замените по ведомости и упаковке поставщика.`
              : `${titleRu}: укажите по схеме, ведомости щита, ППР, программе испытаний или плану логистики.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_SELECTED_RCD_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PROTECTION_PANEL_METHOD_TEST_OR_LOGISTICS_DOCUMENT",
        source_document: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_ID,
        source_locator: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.exact_locator,
        guide_version: "residual-current-device-installation-s27-24-r1",
        source_snapshot_hash: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.artifact_sha256,
        applicability:
          "Монтаж уже выбранного УЗО/RCBO на существующей DIN-рейке; расчёт защиты, кабельная линия, отдельный автомат и комплектная сборка щита исключены.",
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

export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT = Object.freeze({
  rcd_retained_spare_piece: 0,
  rcd_supplier_pack_size_piece: 1,
});
export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}
export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("rcd_install_count_v1", "pcs", "rcd_count"),
  formula("rcd_order_quantity_v1", "pcs",
    "ceil((rcd_count+rcd_retained_spare_piece)/rcd_supplier_pack_size_piece)*rcd_supplier_pack_size_piece"),
  formula("rcd_selection_basis_count_v1", "pcs", "rcd_count"),
  formula("rcd_marker_quantity_v1", "pcs", "circuit_marker_quantity_piece"),
  formula("rcd_terminal_accessory_quantity_v1", "pcs", "terminal_accessory_quantity_piece"),
  formula("rcd_torque_seal_quantity_v1", "set", "torque_seal_quantity_set"),
  formula("rcd_trip_test_count_v1", "test", "rcd_trip_test_count"),
  formula("rcd_installed_net_v1", "pcs", "rcd_count"),
  formula("rcd_retained_spare_v1", "pcs", "rcd_retained_spare_piece"),
  formula("rcd_total_need_v1", "pcs", "rcd_count+rcd_retained_spare_piece"),
  formula("rcd_package_count_v1", "package",
    "ceil((rcd_count+rcd_retained_spare_piece)/rcd_supplier_pack_size_piece)"),
  formula("rcd_remainder_v1", "pcs",
    "ceil((rcd_count+rcd_retained_spare_piece)/rcd_supplier_pack_size_piece)*rcd_supplier_pack_size_piece-rcd_count"),
  formula("rcd_surplus_v1", "pcs",
    "max(0,ceil((rcd_count+rcd_retained_spare_piece)/rcd_supplier_pack_size_piece)*rcd_supplier_pack_size_piece-rcd_count-rcd_retained_spare_piece)"),
  formula("rcd_installation_labor_v1", "man_hour", "rcd_installation_labor_h"),
  formula("rcd_testing_labor_v1", "man_hour", "rcd_testing_labor_h"),
  formula("rcd_torque_screwdriver_v1", "machine_hour", "torque_screwdriver_machine_h"),
  formula("rcd_installation_tool_v1", "machine_hour", "rcd_installation_tool_machine_h"),
  formula("rcd_tester_v1", "machine_hour", "rcd_tester_machine_h"),
  formula("rcd_delivery_v1", "trip", "rcd_delivery_trip_count"),
  formula("rcd_waste_removal_v1", "trip", "rcd_waste_removal_trip_count"),
  formula("rcd_comb_bus_length_v1", "m", "comb_bus_length_m"),
  formula("rcd_comb_bus_end_cap_quantity_v1", "pcs", "comb_bus_end_cap_quantity_piece"),
  formula("rcd_auxiliary_contact_quantity_v1", "pcs", "auxiliary_contact_quantity_piece"),
  formula("rcd_din_rail_segment_length_v1", "m", "din_rail_segment_length_m"),
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
    semanticOwnerId: `residual-current-device-installation:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
  };
  const sourceMetadata = {
    truth_contract_version: "R3", synthetic: false, sourceRole: input.sourceRole,
    normativeTrace: [{ sourceId: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_ID,
      source_id: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_ID,
      normId: RESIDUAL_CURRENT_DEVICE_INSTALLATION_NORM_ID,
      norm_id: RESIDUAL_CURRENT_DEVICE_INSTALLATION_NORM_ID,
      normVersion: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.source_document_version,
      source_title: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.source_title,
      exact_locator: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: RESIDUAL_CURRENT_DEVICE_INSTALLATION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole }],
    excludedUnownedAssumptions: [
      "automatic selection of RCCB/RCBO, residual current type, sensitivity or selectivity",
      "automatic comb bus, auxiliary contact, DIN rail or terminal quantity",
      "historical labor, tool, trip-test or logistics rate",
      "cable line, separate circuit breaker, panel enclosure or complete switchboard",
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

export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "q4:rcd:install", ordinal: 0, section: "Технологическая операция", category: "construction_work", titleRu: "Монтаж и подключение выбранного устройства дифференциальной защиты на существующей DIN-рейке", unitId: "pcs", formulaId: "rcd_install_count_v1", procurementEligible: false, titleParameterIds: ["rcd_product_designation"], sourceRole: "USER_SUPPLIED_OR_APPROVED_SELECTED_RCD_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:device-order", ordinal: 1, section: "Закупка устройств", category: "material", titleRu: "УЗО или RCBO — заказ", unitId: "pcs", formulaId: "rcd_order_quantity_v1", procurementEligible: true, titleParameterIds: ["rcd_product_designation"], sourceRole: "VISIBLE_PROCUREMENT_BALANCE" }),
  resource({ rowId: "q4:rcd:selection-basis", ordinal: 2, section: "Проектное основание", category: "documentation", titleRu: "Схема и расчёт выбора дифференциальной защиты", unitId: "pcs", formulaId: "rcd_selection_basis_count_v1", procurementEligible: false, titleParameterIds: ["selection_basis_reference"], sourceRole: "APPROVED_PROTECTION_CALCULATION", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:circuit-marker", ordinal: 3, section: "Комплектующие и расходники", category: "material", titleRu: "Маркировка защищаемой цепи", unitId: "pcs", formulaId: "rcd_marker_quantity_v1", procurementEligible: true, titleParameterIds: ["circuit_marker_designation"], sourceRole: "APPROVED_PANEL_SCHEDULE" }),
  resource({ rowId: "q4:rcd:terminal-accessory", ordinal: 4, section: "Комплектующие и расходники", category: "material", titleRu: "Наконечник или клеммная принадлежность проводника", unitId: "pcs", formulaId: "rcd_terminal_accessory_quantity_v1", procurementEligible: true, titleParameterIds: ["terminal_accessory_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "q4:rcd:torque-seal", ordinal: 5, section: "Комплектующие и расходники", category: "material", titleRu: "Контрольная маркировка затяжки", unitId: "set", formulaId: "rcd_torque_seal_quantity_v1", procurementEligible: true, titleParameterIds: ["torque_seal_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "q4:rcd:trip-test", ordinal: 6, section: "Контроль", category: "service", titleRu: "Измерение тока и времени срабатывания устройства", unitId: "test", formulaId: "rcd_trip_test_count_v1", procurementEligible: false, titleParameterIds: ["rcd_trip_test_designation"], sourceRole: "APPROVED_TEST_PROGRAM", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:balance:installed-net", ordinal: 7, section: "Баланс устройств", category: "material", titleRu: "Чистое количество установленных устройств", unitId: "pcs", formulaId: "rcd_installed_net_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_SELECTED_RCD_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:balance:retained-spare", ordinal: 8, section: "Баланс устройств", category: "material", titleRu: "Сохраняемый резерв устройств", unitId: "pcs", formulaId: "rcd_retained_spare_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:balance:total-need", ordinal: 9, section: "Баланс устройств", category: "material", titleRu: "Общая потребность: монтаж плюс резерв", unitId: "pcs", formulaId: "rcd_total_need_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:balance:package-count", ordinal: 10, section: "Баланс устройств", category: "material", titleRu: "Количество упаковок поставщика", unitId: "package", formulaId: "rcd_package_count_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:balance:remainder", ordinal: 11, section: "Баланс устройств", category: "material", titleRu: "Остаток после установки", unitId: "pcs", formulaId: "rcd_remainder_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:balance:surplus-beyond-reserve", ordinal: 12, section: "Баланс устройств", category: "material", titleRu: "Свободный остаток сверх резерва", unitId: "pcs", formulaId: "rcd_surplus_v1", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "q4:rcd:labor:installation", ordinal: 13, section: "Труд", category: "construction_work", titleRu: "Труд электромонтажников: установка, подключение и маркировка", unitId: "man_hour", formulaId: "rcd_installation_labor_v1", procurementEligible: false, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "q4:rcd:labor:testing", ordinal: 14, section: "Труд", category: "construction_work", titleRu: "Труд электролаборатории: измерение параметров срабатывания", unitId: "man_hour", formulaId: "rcd_testing_labor_v1", procurementEligible: false, sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "q4:rcd:equipment:torque-screwdriver", ordinal: 15, section: "Инструмент и оборудование", category: "equipment", titleRu: "Калиброванный динамометрический инструмент", unitId: "machine_hour", formulaId: "rcd_torque_screwdriver_v1", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "q4:rcd:equipment:installation-tool", ordinal: 16, section: "Инструмент и оборудование", category: "equipment", titleRu: "Электромонтажный инструмент для установки и оконцевания", unitId: "machine_hour", formulaId: "rcd_installation_tool_v1", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "q4:rcd:equipment:tester", ordinal: 17, section: "Контроль", category: "equipment", titleRu: "Измеритель параметров срабатывания УЗО", unitId: "machine_hour", formulaId: "rcd_tester_v1", procurementEligible: true, sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "q4:rcd:logistics:delivery", ordinal: 18, section: "Логистика", category: "service", titleRu: "Доставка устройств, комплектующих и инструмента", unitId: "trip", formulaId: "rcd_delivery_v1", procurementEligible: true, sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "q4:rcd:logistics:waste-removal", ordinal: 19, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и отходов монтажа", unitId: "trip", formulaId: "rcd_waste_removal_v1", procurementEligible: true, sourceRole: "APPROVED_WASTE_PLAN" }),
  resource({ rowId: "q4:rcd:conditional:comb-bus", ordinal: 20, section: "Условные комплектующие", category: "material", titleRu: "Совместимая гребенчатая шина", unitId: "m", formulaId: "rcd_comb_bus_length_v1", inclusionAst: equals("comb_bus_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["comb_bus_designation"], sourceRole: "APPROVED_PANEL_SCHEDULE" }),
  resource({ rowId: "q4:rcd:conditional:comb-bus-end-cap", ordinal: 21, section: "Условные комплектующие", category: "material", titleRu: "Торцевая заглушка гребенчатой шины", unitId: "pcs", formulaId: "rcd_comb_bus_end_cap_quantity_v1", inclusionAst: equals("comb_bus_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["comb_bus_end_cap_designation"], sourceRole: "APPROVED_PANEL_SCHEDULE" }),
  resource({ rowId: "q4:rcd:conditional:auxiliary-contact", ordinal: 22, section: "Условные комплектующие", category: "material", titleRu: "Вспомогательный контакт совместимой серии", unitId: "pcs", formulaId: "rcd_auxiliary_contact_quantity_v1", inclusionAst: equals("auxiliary_contact_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["auxiliary_contact_designation"], sourceRole: "APPROVED_CONTROL_SCHEME" }),
  resource({ rowId: "q4:rcd:conditional:din-rail-segment", ordinal: 23, section: "Условные комплектующие", category: "material", titleRu: "Дополнительный участок DIN-рейки", unitId: "m", formulaId: "rcd_din_rail_segment_length_v1", inclusionAst: equals("din_rail_segment_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["din_rail_segment_designation"], sourceRole: "APPROVED_PANEL_LAYOUT" }),
]);

export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT = Object.freeze({
  rcd_count: 8,
  rcd_product_designation: "ABB F202",
  rcd_device_type: "RCCB",
  pole_configuration: "2P",
  rated_current_a: 40,
  rated_residual_current_ma: 30,
  residual_current_type: "A",
  rated_voltage_v: 230,
  mounting_system: "EXISTING_DIN_RAIL",
});
export const RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT = Object.freeze({
  ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT,
  ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT,
  selection_basis_reference: "Однолинейная схема ЭОМ-5 и расчёт дифференциальной защиты ЭОМ-Р2",
  circuit_marker_designation: "Маркер защищаемой цепи по ведомости щита",
  circuit_marker_quantity_piece: 8,
  terminal_accessory_designation: "НШВИ по типу и сечению проводника схемы",
  terminal_accessory_quantity_piece: 16,
  torque_seal_designation: "Контрольный лак затяжки по ППР",
  torque_seal_quantity_set: 1,
  rcd_trip_test_designation: "Измерение тока и времени срабатывания по программе ЭЛ-Р2",
  rcd_trip_test_count: 8,
  rcd_installation_labor_h: 5.6,
  rcd_testing_labor_h: 4,
  torque_screwdriver_machine_h: 0.8,
  rcd_installation_tool_machine_h: 2.8,
  rcd_tester_machine_h: 4,
  rcd_delivery_trip_count: 1,
  rcd_waste_removal_trip_count: 1,
  comb_bus_mode: "NOT_REQUIRED",
  auxiliary_contact_mode: "NOT_REQUIRED",
  din_rail_segment_mode: "NOT_REQUIRED",
});

export async function compileResidualCurrentDeviceInstallationR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID;
  if (catalogId !== RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID) {
    throw new Error(`RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.residual-current-device-installation-r1",
    catalogId, primaryMeasureParameterId: "rcd_count",
    parameterDefinitions: [...RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...RESIDUAL_CURRENT_DEVICE_INSTALLATION_FORMULAS],
    resourceDefinitions: [...RESIDUAL_CURRENT_DEVICE_INSTALLATION_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT },
    currencyCode: "KGS", priceItems: [], maximumResourceRows: 30,
    hashJson: async (value) => JSON.stringify(value) });
}
