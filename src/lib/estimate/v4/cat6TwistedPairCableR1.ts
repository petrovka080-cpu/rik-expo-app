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

export const CAT6_TWISTED_PAIR_CABLE_CATALOG_ID =
  "canonical-work:expanded:site_telecom_connection";
export const CAT6_TWISTED_PAIR_CABLE_SOURCE_ID =
  "s2724_krerm_guidance_and_project_cat6_cabling_package_v2";
export const CAT6_TWISTED_PAIR_CABLE_NORM_ID =
  "norm:kg:krerm-2015-guidance-2.9.2:project-cat6-package:v2";

export const CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA = Object.freeze({
  source_title: "КРЕРм-2015: Указания по применению; утверждённый журнал СКС, план трасс, ППР, узлы проходок и программа испытаний Cat.6",
  source_authority: "Министерство строительства Кыргызской Республики; проектная организация СКС и утверждающий инженер проекта",
  source_document_version:
    "KG_KRERM_2015_GUIDANCE_CAPTURE_2026_10_01_AND_PROJECT_CAT6_PACKAGE_REVISION_EXPLICIT",
  definition_hash: "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
  exact_locator: "КРЕРм-2015, Указания по применению, п. 2.9.2: проектно-зависимые материалы определяются по рабочим чертежам с учётом трудноустранимых потерь и отходов; длина и количество линий U/UTP Cat.6 4 пары LSZH; журнал СКС и схема маркировки; ведомость Velcro; узлы огнестойких проходок; ППР и программа сертификационных измерений",
  use_restriction: "Известная длина определяет чистую установленную длину; потери, сохраняемый резерв и кратность заказа показаны видимыми заменяемыми значениями 0%, 0 м и 1 м. Маркировка, Velcro, firestop, труд, механизмы и логистика берутся только из проекта, ППР и QA-документов; сетевой коммутатор, серверный шкаф и полная СКС не включаются.",
  source_kind: "OFFICIAL_NORMATIVE_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE",
  official_url:
    "https://minstroy.gov.kg/ru/state_program/download-pdf/montazoborudovania-62169004e91aaf866.70682138.pdf",
  artifact_sha256: "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
});

const CONDITIONAL_DETAILS = new Set([
  "keystone_designation", "keystone_quantity_piece",
  "patch_panel_designation", "patch_panel_quantity_piece",
  "information_outlet_designation", "information_outlet_quantity_piece",
  "j_hook_designation", "j_hook_quantity_piece",
]);
const OPTIONAL_PRODUCT_DESIGNATIONS = new Set([
  "label_designation", "velcro_designation", "firestop_designation",
  "certifier_designation",
]);
const PARAMETER_SPECS = Object.freeze([
  ["length_m", "Длина трасс кабеля Cat.6", "decimal", "m", null],
  ["line_count", "Количество линий Cat.6", "integer", "pcs", null],
  ["cable_type", "Тип кабеля СКС", "enum", null, ["U_UTP_CAT6_4PAIR_LSZH"]],
  ["cable_expected_loss_ratio", "Ожидаемые технологические потери кабеля", "decimal", "ratio", null],
  ["cable_retained_reserve_m", "Сохраняемый резерв кабеля Cat.6", "decimal", "m", null],
  ["cable_supplier_cut_increment_m", "Кратность заказа кабеля у поставщика", "decimal", "m", null],
  ["label_designation", "Маркировочная этикетка по схеме маркировки", "text", null, null],
  ["label_quantity_piece", "Количество маркировочных этикеток", "decimal", "pcs", null],
  ["velcro_designation", "Многоразовая Velcro-лента по ведомости", "text", null, null],
  ["velcro_length_m", "Длина Velcro-ленты", "decimal", "m", null],
  ["firestop_designation", "Огнестойкий герметик по узлу проходки", "text", null, null],
  ["firestop_volume_l", "Объём огнестойкого герметика", "decimal", "l", null],
  ["certifier_designation", "Кабельный сертификационный тестер по программе", "text", null, null],
  ["certifier_shift", "Количество смен кабельного тестера", "decimal", "shift", null],
  ["keystone_mode", "Модули keystone входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["keystone_designation", "Модуль keystone Cat.6 по спецификации", "text", null, null],
  ["keystone_quantity_piece", "Количество модулей keystone Cat.6", "decimal", "pcs", null],
  ["patch_panel_mode", "Патч-панель входит в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["patch_panel_designation", "Патч-панель Cat.6 по спецификации", "text", null, null],
  ["patch_panel_quantity_piece", "Количество патч-панелей Cat.6", "decimal", "pcs", null],
  ["information_outlet_mode", "Информационные розетки входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["information_outlet_designation", "Информационная розетка Cat.6", "text", null, null],
  ["information_outlet_quantity_piece", "Количество информационных розеток", "decimal", "pcs", null],
  ["j_hook_mode", "J-hook крепления требуются по трассе", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["j_hook_designation", "Кабельный J-hook по проекту", "text", null, null],
  ["j_hook_quantity_piece", "Количество кабельных J-hook", "decimal", "pcs", null],
  ["cat6_installation_labor_h", "Труд монтажников по прокладке и креплению", "decimal", "man_hour", null],
  ["cat6_termination_labeling_labor_h", "Труд по маркировке и оконцеванию линий", "decimal", "man_hour", null],
  ["cat6_testing_labor_h", "Труд по проверке и сертификации линий", "decimal", "man_hour", null],
  ["cat6_payoff_equipment_machine_h", "Работа устройства размотки кабеля Cat.6", "decimal", "machine_hour", null],
  ["cat6_termination_tool_machine_h", "Работа инструмента оконцевания Cat.6", "decimal", "machine_hour", null],
  ["cat6_delivery_trip_count", "Рейсы доставки кабеля и комплектующих", "integer", "trip", null],
  ["cat6_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов", "integer", "trip", null],
] as const);
const KNOWN_SCOPE = ["length_m", "line_count", "cable_type"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "cable_expected_loss_ratio", "cable_retained_reserve_m", "cable_supplier_cut_increment_m",
]);

function conditionalConstraints(parameterId: string): Json {
  const prefix = ["keystone", "patch_panel", "information_outlet", "j_hook"]
    .find((candidate) => parameterId.startsWith(`${candidate}_`));
  const branch = prefix ? `${prefix}_mode` : null;
  if (!branch || parameterId === branch) return {};
  return { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } };
}

export type Cat6TwistedPairCableParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const CAT6_TWISTED_PAIR_CABLE_PARAMETERS:
readonly Cat6TwistedPairCableParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId)
      && !OPTIONAL_PRODUCT_DESIGNATIONS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            && parameterId !== "cable_supplier_cut_increment_m"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.cat6-twisted-pair-cable-r1",
      semantic_parameter_key: `cat6-twisted-pair-cable:${parameterId}`,
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
          : "APPROVED_CAT6_ROUTE_LABEL_FIRESTOP_SUPPORT_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "length_m"
          ? "Укажите чистую длину трасс по кабельному журналу без автоматического запаса."
          : parameterId === "line_count"
            ? "Укажите подтверждённое количество отдельных линий для проверки целостности."
            : KNOWN_SCOPE.includes(parameterId)
              ? `${titleRu}: укажите по маркировке выбранного кабеля.`
              : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
                ? `${titleRu}: предварительно принято видимое нейтральное значение; замените по проекту, раскрою и условиям поставщика.`
              : `${titleRu}: укажите по журналу СКС, узлу, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_CAT6_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PROJECT_CAT6_ROUTE_LABEL_FIRESTOP_SUPPORT_OR_QA_DOCUMENTATION",
        source_document: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID,
        source_locator: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.exact_locator,
        guide_version: "cat6-twisted-pair-cable-s27-24-r2",
        source_snapshot_hash: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для прокладки U/UTP Cat.6, 4 пары, LSZH по указанным трассам; сетевой коммутатор, серверный шкаф и полная СКС исключены.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT = Object.freeze({
  cable_expected_loss_ratio: 0,
  cable_retained_reserve_m: 0,
  cable_supplier_cut_increment_m: 1,
});
export const CAT6_TWISTED_PAIR_CABLE_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT).map((parameterId) => [
    parameterId, "ASSUMPTION",
  ])) as Readonly<Record<string, "ASSUMPTION">>,
);
export const CAT6_TWISTED_PAIR_CABLE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT).map((parameterId) => [
    parameterId, [CAT6_TWISTED_PAIR_CABLE_SOURCE_ID],
  ])) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}
export const CAT6_TWISTED_PAIR_CABLE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("cat6_cable_lay_length_v1", "m", "length_m"),
  formula("uutp_cat6_4pair_lszh_net_length_v1", "m", "length_m"),
  formula("cat6_cable_expected_loss_v2", "m", "length_m*cable_expected_loss_ratio"),
  formula("cat6_cable_retained_reserve_v2", "m", "cable_retained_reserve_m"),
  formula("cat6_cable_total_need_v2", "m",
    "length_m+length_m*cable_expected_loss_ratio+cable_retained_reserve_m"),
  formula("cat6_cable_order_length_v2", "m",
    "ceil((length_m+length_m*cable_expected_loss_ratio+cable_retained_reserve_m)/cable_supplier_cut_increment_m)*cable_supplier_cut_increment_m"),
  formula("cat6_cable_remainder_v2", "m",
    "ceil((length_m+length_m*cable_expected_loss_ratio+cable_retained_reserve_m)/cable_supplier_cut_increment_m)*cable_supplier_cut_increment_m-length_m-length_m*cable_expected_loss_ratio"),
  formula("cat6_cable_surplus_v2", "m",
    "max(0,ceil((length_m+length_m*cable_expected_loss_ratio+cable_retained_reserve_m)/cable_supplier_cut_increment_m)*cable_supplier_cut_increment_m-length_m-length_m*cable_expected_loss_ratio-cable_retained_reserve_m)"),
  formula("cat6_identification_label_quantity_v1", "pcs", "label_quantity_piece"),
  formula("reusable_velcro_length_v1", "m", "velcro_length_m"),
  formula("cat6_firestop_volume_v1", "l", "firestop_volume_l"),
  formula("structured_cable_certifier_shift_v1", "shift", "certifier_shift"),
  formula("cat6_route_continuity_check_count_v1", "test", "line_count"),
  formula("cat6_keystone_quantity_v1", "pcs", "keystone_quantity_piece"),
  formula("cat6_patch_panel_quantity_v1", "pcs", "patch_panel_quantity_piece"),
  formula("cat6_information_outlet_quantity_v1", "pcs", "information_outlet_quantity_piece"),
  formula("cable_j_hook_quantity_v1", "pcs", "j_hook_quantity_piece"),
  formula("cat6_installation_labor_v2", "man_hour", "cat6_installation_labor_h"),
  formula("cat6_termination_labeling_labor_v2", "man_hour",
    "cat6_termination_labeling_labor_h"),
  formula("cat6_testing_labor_v2", "man_hour", "cat6_testing_labor_h"),
  formula("cat6_payoff_equipment_v2", "machine_hour", "cat6_payoff_equipment_machine_h"),
  formula("cat6_termination_tool_v2", "machine_hour",
    "cat6_termination_tool_machine_h"),
  formula("cat6_delivery_v2", "trip", "cat6_delivery_trip_count"),
  formula("cat6_waste_removal_v2", "trip", "cat6_waste_removal_trip_count"),
]);
const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; inclusionAst?: Json; procurementEligible: boolean;
  titleParameterIds?: string[]; sourceRole: string;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
  parentRowId?: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = { formulaId: input.formulaId, normalizedUom: input.unitId,
    semanticOwnerId: `cat6-twisted-pair-cable:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
    ...(input.parentRowId ? { parentRowId: input.parentRowId } : {}),
  };
  const sourceMetadata = { truth_contract_version: "R3", synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{ sourceId: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID,
      source_id: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID, normId: CAT6_TWISTED_PAIR_CABLE_NORM_ID,
      norm_id: CAT6_TWISTED_PAIR_CABLE_NORM_ID,
      normVersion: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.source_document_version,
      source_title: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.source_title,
      exact_locator: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.exact_locator,
      source_definition_hash: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole }],
    excludedUnownedAssumptions: ["automatic cable reserve", "automatic label or Velcro rate",
      "automatic firestop consumption or certifier productivity", "automatic passive termination",
      "network switch, server rack or full structured cabling system", "invented price"] };
  return { id: `resource-${input.rowId.replace(/:/gu, "-")}`, row_id: input.rowId,
    ordinal: input.ordinal, section: input.section, category: input.category,
    title_ru: input.titleRu, unit_id: input.unitId, formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible, cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }) };
}

export const CAT6_TWISTED_PAIR_CABLE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:cat6_cable_lay", ordinal: 0, section: "Технологическая операция", category: "construction_work", titleRu: "Комплекс прокладки линий U/UTP Cat.6 LSZH: размотка, прокладка, крепление, маркировка, оконцевание и контроль", unitId: "m", formulaId: "cat6_cable_lay_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_CAT6_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:uutp_cat6_4pair_lszh", ordinal: 1, section: "Закупка кабеля", category: "material", titleRu: "Кабель витая пара U/UTP Cat.6, 4 пары, LSZH — заказная длина", unitId: "m", formulaId: "cat6_cable_order_length_v2", procurementEligible: true, sourceRole: "VISIBLE_PROCUREMENT_BALANCE" }),
  resource({ rowId: "rc09:cat6_cable_identification_label", ordinal: 2, section: "Материалы", category: "material", titleRu: "Этикетка для маркировки линии СКС", unitId: "pcs", formulaId: "cat6_identification_label_quantity_v1", procurementEligible: true, titleParameterIds: ["label_designation"], sourceRole: "APPROVED_CABLE_SCHEDULE" }),
  resource({ rowId: "rc09:reusable_velcro_cable_tie", ordinal: 3, section: "Материалы", category: "material", titleRu: "Многоразовая Velcro-лента для формирования кабельного пучка", unitId: "m", formulaId: "reusable_velcro_length_v1", procurementEligible: true, titleParameterIds: ["velcro_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:cat6_firestop_penetration", ordinal: 4, section: "Материалы", category: "material", titleRu: "Огнестойкий герметик проходки кабеля СКС", unitId: "l", formulaId: "cat6_firestop_volume_v1", procurementEligible: true, titleParameterIds: ["firestop_designation"], sourceRole: "APPROVED_FIRESTOP_DETAIL" }),
  resource({ rowId: "rc09:structured_cable_certifier", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Кабельный сертификационный тестер категории 6", unitId: "shift", formulaId: "structured_cable_certifier_shift_v1", procurementEligible: true, titleParameterIds: ["certifier_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:cat6_route_continuity_check", ordinal: 6, section: "Контроль", category: "service", titleRu: "Проверка целостности и маркировки линии Cat.6", unitId: "test", formulaId: "cat6_route_continuity_check_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_CAT6_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cat6_keystone", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Модуль keystone Cat.6", unitId: "pcs", formulaId: "cat6_keystone_quantity_v1", inclusionAst: equals("keystone_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["keystone_designation"], sourceRole: "APPROVED_PASSIVE_COMPONENT_SCHEDULE" }),
  resource({ rowId: "rc09:cat6_patch_panel", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Патч-панель Cat.6", unitId: "pcs", formulaId: "cat6_patch_panel_quantity_v1", inclusionAst: equals("patch_panel_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["patch_panel_designation"], sourceRole: "APPROVED_PASSIVE_COMPONENT_SCHEDULE" }),
  resource({ rowId: "rc09:cat6_information_outlet", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Информационная розетка Cat.6", unitId: "pcs", formulaId: "cat6_information_outlet_quantity_v1", inclusionAst: equals("information_outlet_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["information_outlet_designation"], sourceRole: "APPROVED_PASSIVE_COMPONENT_SCHEDULE" }),
  resource({ rowId: "rc09:cable_j_hook", ordinal: 10, section: "Условные материалы", category: "material", titleRu: "Кабельный J-hook по проекту трассы", unitId: "pcs", formulaId: "cable_j_hook_quantity_v1", inclusionAst: equals("j_hook_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["j_hook_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "cat6:balance:installed-net-length", ordinal: 11, section: "Баланс кабеля", category: "material", titleRu: "Чистая установленная длина кабеля Cat.6", unitId: "m", formulaId: "uutp_cat6_4pair_lszh_net_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_CAT6_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "cat6:balance:expected-loss", ordinal: 12, section: "Баланс кабеля", category: "material", titleRu: "Ожидаемые технологические потери кабеля Cat.6", unitId: "m", formulaId: "cat6_cable_expected_loss_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "cat6:balance:retained-reserve", ordinal: 13, section: "Баланс кабеля", category: "material", titleRu: "Сохраняемый резерв кабеля Cat.6", unitId: "m", formulaId: "cat6_cable_retained_reserve_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "cat6:balance:total-need", ordinal: 14, section: "Баланс кабеля", category: "material", titleRu: "Общая потребность: монтаж + потери + сохраняемый резерв", unitId: "m", formulaId: "cat6_cable_total_need_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "cat6:balance:remainder-after-installation-loss", ordinal: 15, section: "Баланс кабеля", category: "material", titleRu: "Остаток после монтажа и ожидаемых потерь", unitId: "m", formulaId: "cat6_cable_remainder_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "cat6:balance:surplus-beyond-reserve", ordinal: 16, section: "Баланс кабеля", category: "material", titleRu: "Свободный остаток сверх сохраняемого резерва", unitId: "m", formulaId: "cat6_cable_surplus_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "cat6:labor:installation", ordinal: 17, section: "Труд", category: "construction_work", titleRu: "Труд монтажников: подготовка, прокладка, крепление и проходки линий Cat.6", unitId: "man_hour", formulaId: "cat6_installation_labor_v2", procurementEligible: false, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "cat6:labor:termination-labeling", ordinal: 18, section: "Труд", category: "construction_work", titleRu: "Труд по маркировке и оконцеванию линий Cat.6", unitId: "man_hour", formulaId: "cat6_termination_labeling_labor_v2", procurementEligible: false, sourceRole: "APPROVED_CABLE_SCHEDULE" }),
  resource({ rowId: "cat6:labor:testing", ordinal: 19, section: "Труд", category: "construction_work", titleRu: "Труд по проверке и сертификации линий Cat.6", unitId: "man_hour", formulaId: "cat6_testing_labor_v2", procurementEligible: false, sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "cat6:equipment:payoff", ordinal: 20, section: "Машины и механизмы", category: "equipment", titleRu: "Устройство контролируемой размотки кабеля Cat.6", unitId: "machine_hour", formulaId: "cat6_payoff_equipment_v2", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "cat6:equipment:termination-tool", ordinal: 21, section: "Инструмент", category: "equipment", titleRu: "Инструмент оконцевания модулей и панелей Cat.6", unitId: "machine_hour", formulaId: "cat6_termination_tool_v2", procurementEligible: true, sourceRole: "APPROVED_TERMINATION_SCHEDULE" }),
  resource({ rowId: "cat6:logistics:delivery", ordinal: 22, section: "Логистика", category: "service", titleRu: "Доставка кабеля, пассивных компонентов и инструмента", unitId: "trip", formulaId: "cat6_delivery_v2", procurementEligible: true, sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "cat6:logistics:waste-removal", ordinal: 23, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки, обрезков и отходов кабельных работ", unitId: "trip", formulaId: "cat6_waste_removal_v2", procurementEligible: true, sourceRole: "APPROVED_WASTE_PLAN" }),
]);

export const CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT = Object.freeze({
  length_m: 300, line_count: 12, cable_type: "U_UTP_CAT6_4PAIR_LSZH",
});
export const CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT = Object.freeze({
  ...CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
  ...CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT,
  label_designation: "Этикетка по схеме маркировки СКС", label_quantity_piece: 24,
  velcro_designation: "Velcro-лента по ведомости кабельных пучков", velcro_length_m: 18,
  firestop_designation: "Огнестойкий герметик по узлам проходок", firestop_volume_l: 3.6,
  certifier_designation: "Сертификационный тестер Cat.6 по программе QA", certifier_shift: 3,
  keystone_mode: "NOT_REQUIRED", patch_panel_mode: "NOT_REQUIRED",
  information_outlet_mode: "NOT_REQUIRED", j_hook_mode: "NOT_REQUIRED",
  cat6_installation_labor_h: 32,
  cat6_termination_labeling_labor_h: 12,
  cat6_testing_labor_h: 8,
  cat6_payoff_equipment_machine_h: 4,
  cat6_termination_tool_machine_h: 6,
  cat6_delivery_trip_count: 1,
  cat6_waste_removal_trip_count: 1,
});

export async function compileCat6TwistedPairCableR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CAT6_TWISTED_PAIR_CABLE_CATALOG_ID;
  if (catalogId !== CAT6_TWISTED_PAIR_CABLE_CATALOG_ID) {
    throw new Error(`CAT6_TWISTED_PAIR_CABLE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.cat6-twisted-pair-cable-r1", catalogId,
    primaryMeasureParameterId: "length_m",
    parameterDefinitions: [...CAT6_TWISTED_PAIR_CABLE_PARAMETERS],
    formulaDefinitions: [...CAT6_TWISTED_PAIR_CABLE_FORMULAS],
    resourceDefinitions: [...CAT6_TWISTED_PAIR_CABLE_RESOURCES], submittedParameters,
    confirmedParameters: { ...CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT },
    currencyCode: "KGS", priceItems: [], maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value) });
}
