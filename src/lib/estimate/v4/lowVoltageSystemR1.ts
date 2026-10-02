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

export const LOW_VOLTAGE_SYSTEM_CATALOG_ID = "canonical-work:expanded:low_voltage_system";
export const LOW_VOLTAGE_SYSTEM_SOURCE_ID =
  "project_structured_cabling_outlet_patching_route_certification_v1";
export const LOW_VOLTAGE_SYSTEM_NORM_ID =
  "norm:project:low_voltage_system:outlet_patching_route_certification:v1";

export const LOW_VOLTAGE_SYSTEM_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый план информационных розеток, спецификация СКС, кабельный журнал, трассы, ППР и программа сертификации",
  source_authority: "Проектная организация связи, интегратор СКС, изготовитель компонентов, служба сертификации и утверждающий инженер проекта",
  source_document_version: "PROJECT_STRUCTURED_CABLING_OUTLET_PATCHING_ROUTE_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "4de2a7b7b4953208454f3ad16848c69fd11ee115317fb39d76eae09696b347b8",
  exact_locator: "Одна СКС, 48 выбранных модулей JACK-RJ45-CAT6 категории CAT6_LSZH и 2 патч-панели PP-24-CAT6; кабели, патч-корды, трассы, комплектующие, расходники, труд, тестирование и логистика — только по утверждённому проектному комплекту",
  use_restriction: "Площадь не определяет розетки, кабель или трассы. Шкафы, активное сетевое оборудование, оптика и uplink требуют прямого проектного основания. CCTV, СКУД, пожарная сигнализация и силовое распределение исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "4de2a7b7b4953208454f3ad16848c69fd11ee115317fb39d76eae09696b347b8",
});

const KNOWN_SCOPE = [
  "lvs_system_count", "lvs_information_outlet_count", "lvs_outlet_designation",
  "lvs_copper_cable_category", "lvs_patch_panel_count", "lvs_patch_panel_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "lvs_outlet_retained_spare_piece", "lvs_outlet_supplier_pack_size_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "lvs_fiber_cable_designation", "lvs_fiber_cable_length_m",
  "lvs_fiber_termination_designation", "lvs_fiber_termination_quantity_piece",
  "lvs_active_uplink_designation", "lvs_active_uplink_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["lvs_system_count", "Количество структурированных кабельных систем", "integer", "system", null],
  ["lvs_information_outlet_count", "Количество информационных розеток СКС", "integer", "pcs", null],
  ["lvs_outlet_designation", "Марка и обозначение модуля информационной розетки", "text", null, null],
  ["lvs_copper_cable_category", "Категория медной подсистемы СКС", "enum", null, ["CAT6_LSZH", "CAT6A_LSZH"]],
  ["lvs_patch_panel_count", "Количество патч-панелей СКС", "integer", "pcs", null],
  ["lvs_patch_panel_designation", "Марка и обозначение патч-панели СКС", "text", null, null],
  ["lvs_outlet_retained_spare_piece", "Сохраняемый резерв модулей розеток", "decimal", "pcs", null],
  ["lvs_outlet_supplier_pack_size_piece", "Количество модулей розеток в упаковке", "decimal", "pcs", null],
  ["lvs_copper_cable_designation", "Горизонтальный кабель СКС по журналу", "text", null, null],
  ["lvs_copper_cable_length_m", "Длина горизонтального кабеля СКС", "decimal", "m", null],
  ["lvs_patch_cord_designation", "Патч-корд СКС по спецификации", "text", null, null],
  ["lvs_patch_cord_quantity_piece", "Количество патч-кордов СКС", "decimal", "pcs", null],
  ["lvs_cable_manager_designation", "Кабельный организатор СКС", "text", null, null],
  ["lvs_cable_manager_quantity_piece", "Количество кабельных организаторов", "decimal", "pcs", null],
  ["lvs_faceplate_backbox_designation", "Рамка и монтажная коробка информационной розетки", "text", null, null],
  ["lvs_faceplate_backbox_quantity_piece", "Количество рамок и коробок розеток", "decimal", "pcs", null],
  ["lvs_containment_designation", "Кабеленесущая система СКС по трассам", "text", null, null],
  ["lvs_containment_length_m", "Длина кабеленесущей системы СКС", "decimal", "m", null],
  ["lvs_firestop_designation", "Противопожарная заделка проходок СКС", "text", null, null],
  ["lvs_firestop_quantity_piece", "Количество противопожарных заделок", "decimal", "pcs", null],
  ["lvs_termination_designation", "Оконцевание медных линий СКС", "text", null, null],
  ["lvs_termination_quantity_piece", "Количество окончаний медных линий", "decimal", "pcs", null],
  ["lvs_label_designation", "Маркировка розеток, портов и кабелей СКС", "text", null, null],
  ["lvs_label_quantity_piece", "Количество элементов маркировки СКС", "decimal", "pcs", null],
  ["lvs_fastening_designation", "Крепёж кабелей и компонентов СКС", "text", null, null],
  ["lvs_fastening_quantity_set", "Количество комплектов крепежа СКС", "decimal", "set", null],
  ["lvs_consumable_designation", "Монтажные расходники СКС", "text", null, null],
  ["lvs_consumable_quantity_kg", "Масса монтажных расходников СКС", "decimal", "kg", null],
  ["lvs_grounding_conductor_designation", "Защитный проводник панелей и трасс СКС", "text", null, null],
  ["lvs_grounding_conductor_length_m", "Длина защитного проводника СКС", "decimal", "m", null],
  ["lvs_test_report_designation", "Протокол сертификации постоянных линий СКС", "text", null, null],
  ["lvs_test_report_quantity_document", "Количество комплектов протоколов СКС", "decimal", "document", null],
  ["lvs_cable_component_install_labor_h", "Труд по прокладке кабелей и монтажу компонентов СКС", "decimal", "man_hour", null],
  ["lvs_termination_labeling_labor_h", "Труд по окончанию и маркировке линий СКС", "decimal", "man_hour", null],
  ["lvs_certification_documentation_labor_h", "Труд по сертификации и исполнительной документации СКС", "decimal", "man_hour", null],
  ["lvs_access_equipment_machine_h", "Работа подъёмного средства для монтажа СКС", "decimal", "machine_hour", null],
  ["lvs_certification_tester_machine_h", "Работа сертификационного тестера СКС", "decimal", "machine_hour", null],
  ["lvs_delivery_trip_count", "Рейсы доставки материалов СКС", "integer", "trip", null],
  ["lvs_packaging_removal_trip_count", "Рейсы вывоза упаковки и монтажных отходов СКС", "integer", "trip", null],
  ["lvs_fiber_backbone_mode", "Оптическая магистраль входит в объём СКС", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["lvs_fiber_cable_designation", "Оптический кабель магистрали СКС", "text", null, null],
  ["lvs_fiber_cable_length_m", "Длина оптического кабеля магистрали", "decimal", "m", null],
  ["lvs_fiber_termination_designation", "Оконцевание оптической магистрали", "text", null, null],
  ["lvs_fiber_termination_quantity_piece", "Количество окончаний оптической магистрали", "decimal", "pcs", null],
  ["lvs_active_uplink_mode", "Активный uplink входит в объём СКС", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["lvs_active_uplink_designation", "Активное оборудование uplink по архитектуре", "text", null, null],
  ["lvs_active_uplink_quantity_piece", "Количество активных устройств uplink", "decimal", "pcs", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("lvs_fiber_")
    && parameterId !== "lvs_fiber_backbone_mode"
    ? "lvs_fiber_backbone_mode"
    : parameterId.startsWith("lvs_active_uplink_")
      && parameterId !== "lvs_active_uplink_mode"
      ? "lvs_active_uplink_mode"
      : null;
  if (!branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type LowVoltageSystemParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};

export const LOW_VOLTAGE_SYSTEM_PARAMETERS: readonly LowVoltageSystemParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "lvs_outlet_retained_spare_piece"
            ? 0 : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.low-voltage-system-r1",
      semantic_parameter_key: `low-voltage-system:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_STRUCTURED_CABLING_LAYOUT_ROUTE_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, плану розеток или спецификации СКС.`
          : `${titleRu}: укажите по проекту СКС, кабельному журналу, трассам, ППР или программе сертификации.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_STRUCTURED_CABLING_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_STRUCTURED_CABLING_LAYOUT_ROUTE_METHOD_OR_QA_DOCUMENTATION",
        source_document: LOW_VOLTAGE_SYSTEM_SOURCE_ID,
        source_locator: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.exact_locator,
        guide_version: "low-voltage-system-r1",
        source_snapshot_hash: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённой СКС; активная сеть, CCTV, СКУД, пожарная сигнализация и силовое распределение исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT = Object.freeze({
  lvs_outlet_retained_spare_piece: 0,
  lvs_outlet_supplier_pack_size_piece: 1,
});
export const LOW_VOLTAGE_SYSTEM_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const LOW_VOLTAGE_SYSTEM_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [LOW_VOLTAGE_SYSTEM_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}

export const LOW_VOLTAGE_SYSTEM_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("lvs_system_install_count_v1", "system", "lvs_system_count"),
  formula("lvs_outlet_order_v1", "pcs", "ceil((lvs_information_outlet_count+lvs_outlet_retained_spare_piece)/lvs_outlet_supplier_pack_size_piece)*lvs_outlet_supplier_pack_size_piece"),
  formula("lvs_patch_panel_quantity_v1", "pcs", "lvs_patch_panel_count"),
  formula("lvs_copper_cable_length_v1", "m", "lvs_copper_cable_length_m"),
  formula("lvs_patch_cord_quantity_v1", "pcs", "lvs_patch_cord_quantity_piece"),
  formula("lvs_cable_manager_quantity_v1", "pcs", "lvs_cable_manager_quantity_piece"),
  formula("lvs_faceplate_backbox_quantity_v1", "pcs", "lvs_faceplate_backbox_quantity_piece"),
  formula("lvs_containment_length_v1", "m", "lvs_containment_length_m"),
  formula("lvs_firestop_quantity_v1", "pcs", "lvs_firestop_quantity_piece"),
  formula("lvs_termination_quantity_v1", "pcs", "lvs_termination_quantity_piece"),
  formula("lvs_label_quantity_v1", "pcs", "lvs_label_quantity_piece"),
  formula("lvs_fastening_quantity_v1", "set", "lvs_fastening_quantity_set"),
  formula("lvs_consumable_quantity_v1", "kg", "lvs_consumable_quantity_kg"),
  formula("lvs_grounding_conductor_length_v1", "m", "lvs_grounding_conductor_length_m"),
  formula("lvs_permanent_link_test_count_v1", "test", "lvs_information_outlet_count"),
  formula("lvs_outlet_register_count_v1", "outlet", "lvs_information_outlet_count"),
  formula("lvs_fiber_cable_length_v1", "m", "lvs_fiber_cable_length_m"),
  formula("lvs_fiber_termination_quantity_v1", "pcs", "lvs_fiber_termination_quantity_piece"),
  formula("lvs_active_uplink_quantity_v1", "pcs", "lvs_active_uplink_quantity_piece"),
  formula("lvs_outlet_installed_net_v1", "pcs", "lvs_information_outlet_count"),
  formula("lvs_outlet_retained_spare_v1", "pcs", "lvs_outlet_retained_spare_piece"),
  formula("lvs_outlet_total_need_v1", "pcs", "lvs_information_outlet_count+lvs_outlet_retained_spare_piece"),
  formula("lvs_outlet_package_count_v1", "package", "ceil((lvs_information_outlet_count+lvs_outlet_retained_spare_piece)/lvs_outlet_supplier_pack_size_piece)"),
  formula("lvs_outlet_remainder_v1", "pcs", "ceil((lvs_information_outlet_count+lvs_outlet_retained_spare_piece)/lvs_outlet_supplier_pack_size_piece)*lvs_outlet_supplier_pack_size_piece-lvs_information_outlet_count"),
  formula("lvs_outlet_surplus_v1", "pcs", "max(0,ceil((lvs_information_outlet_count+lvs_outlet_retained_spare_piece)/lvs_outlet_supplier_pack_size_piece)*lvs_outlet_supplier_pack_size_piece-lvs_information_outlet_count-lvs_outlet_retained_spare_piece)"),
  formula("lvs_test_report_quantity_v1", "document", "lvs_test_report_quantity_document"),
  formula("lvs_cable_component_install_labor_v1", "man_hour", "lvs_cable_component_install_labor_h"),
  formula("lvs_termination_labeling_labor_v1", "man_hour", "lvs_termination_labeling_labor_h"),
  formula("lvs_certification_documentation_labor_v1", "man_hour", "lvs_certification_documentation_labor_h"),
  formula("lvs_access_equipment_v1", "machine_hour", "lvs_access_equipment_machine_h"),
  formula("lvs_certification_tester_v1", "machine_hour", "lvs_certification_tester_machine_h"),
  formula("lvs_delivery_v1", "trip", "lvs_delivery_trip_count"),
  formula("lvs_packaging_removal_v1", "trip", "lvs_packaging_removal_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: { rowId: string; ordinal: number; section: string; category: string;
  titleRu: string; unitId: string; formulaId: string; sourceRole: string;
  procurementEligible: boolean; inclusionAst?: Json; titleParameterIds?: string[];
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = { formulaId: input.formulaId, normalizedUom: input.unitId,
    semanticOwnerId: `low-voltage-system:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE, costTreatment: input.costTreatment ?? "OWN_COST" };
  const sourceMetadata = { truth_contract_version: "R3", synthetic: false,
    sourceRole: input.sourceRole, normativeTrace: [{
      sourceId: LOW_VOLTAGE_SYSTEM_SOURCE_ID, source_id: LOW_VOLTAGE_SYSTEM_SOURCE_ID,
      normId: LOW_VOLTAGE_SYSTEM_NORM_ID, norm_id: LOW_VOLTAGE_SYSTEM_NORM_ID,
      normVersion: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.source_document_version,
      source_title: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.source_title,
      exact_locator: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.exact_locator,
      source_definition_hash: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }], excludedUnownedAssumptions: [
      "floor-area-derived outlet, cable or containment quantity",
      "static 432-m route or generic electrical productivity",
      "automatic rack, active-network, fiber or uplink selection",
      "automatic retained spare or supplier package",
      "CCTV, access control, fire alarm or electrical distribution", "invented price",
    ] };
  return { id: `resource-${input.rowId.replace(/:/gu, "-")}`, row_id: input.rowId,
    ordinal: input.ordinal, section: input.section, category: input.category,
    title_ru: input.titleRu, unit_id: input.unitId, formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible, cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }) };
}

export const LOW_VOLTAGE_SYSTEM_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:lvs_system_install_certification", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж и сертификация структурированной кабельной системы", unitId: "system", formulaId: "lvs_system_install_count_v1", sourceRole: "USER_SUPPLIED_OR_APPROVED_STRUCTURED_CABLING_SCOPE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs_information_outlet", ordinal: 1, section: "Оборудование", category: "equipment", titleRu: "Модуль информационной розетки СКС", unitId: "pcs", formulaId: "lvs_outlet_order_v1", titleParameterIds: ["lvs_outlet_designation", "lvs_copper_cable_category"], sourceRole: "USER_SELECTED_AND_APPROVED_INFORMATION_OUTLET", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_patch_panel", ordinal: 2, section: "Оборудование", category: "equipment", titleRu: "Патч-панель СКС", unitId: "pcs", formulaId: "lvs_patch_panel_quantity_v1", titleParameterIds: ["lvs_patch_panel_designation"], sourceRole: "USER_SELECTED_AND_APPROVED_PATCH_PANEL", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_copper_cable", ordinal: 3, section: "Материалы", category: "material", titleRu: "Горизонтальный медный кабель СКС", unitId: "m", formulaId: "lvs_copper_cable_length_v1", titleParameterIds: ["lvs_copper_cable_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_CABLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_patch_cord", ordinal: 4, section: "Комплектующие", category: "material", titleRu: "Патч-корд СКС", unitId: "pcs", formulaId: "lvs_patch_cord_quantity_v1", titleParameterIds: ["lvs_patch_cord_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_COMPONENT_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_cable_manager", ordinal: 5, section: "Комплектующие", category: "material", titleRu: "Кабельный организатор СКС", unitId: "pcs", formulaId: "lvs_cable_manager_quantity_v1", titleParameterIds: ["lvs_cable_manager_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_RACK_SIDE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_faceplate_backbox", ordinal: 6, section: "Комплектующие", category: "material", titleRu: "Рамка и монтажная коробка информационной розетки", unitId: "pcs", formulaId: "lvs_faceplate_backbox_quantity_v1", titleParameterIds: ["lvs_faceplate_backbox_designation"], sourceRole: "APPROVED_INFORMATION_OUTLET_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_containment", ordinal: 7, section: "Материалы", category: "material", titleRu: "Кабеленесущая система СКС", unitId: "m", formulaId: "lvs_containment_length_v1", titleParameterIds: ["lvs_containment_designation"], sourceRole: "APPROVED_TELECOMMUNICATION_ROUTE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_firestop", ordinal: 8, section: "Материалы", category: "material", titleRu: "Противопожарная заделка проходок СКС", unitId: "pcs", formulaId: "lvs_firestop_quantity_v1", titleParameterIds: ["lvs_firestop_designation"], sourceRole: "APPROVED_TELECOMMUNICATION_PENETRATION_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_termination", ordinal: 9, section: "Комплектующие", category: "material", titleRu: "Оконцевание медных линий СКС", unitId: "pcs", formulaId: "lvs_termination_quantity_v1", titleParameterIds: ["lvs_termination_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_CABLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_label", ordinal: 10, section: "Комплектующие", category: "material", titleRu: "Маркировка розеток, портов и кабелей СКС", unitId: "pcs", formulaId: "lvs_label_quantity_v1", titleParameterIds: ["lvs_label_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_LABELING_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_fastening", ordinal: 11, section: "Крепёж", category: "material", titleRu: "Комплект крепления кабелей и компонентов СКС", unitId: "set", formulaId: "lvs_fastening_quantity_v1", titleParameterIds: ["lvs_fastening_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_INSTALLATION_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_consumable", ordinal: 12, section: "Расходники", category: "material", titleRu: "Монтажные расходники СКС", unitId: "kg", formulaId: "lvs_consumable_quantity_v1", titleParameterIds: ["lvs_consumable_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_RESOURCE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_grounding_conductor", ordinal: 13, section: "Материалы", category: "material", titleRu: "Защитный проводник панелей и трасс СКС", unitId: "m", formulaId: "lvs_grounding_conductor_length_v1", titleParameterIds: ["lvs_grounding_conductor_designation"], sourceRole: "APPROVED_TELECOMMUNICATION_GROUNDING_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_permanent_link_test", ordinal: 14, section: "Контроль", category: "service", titleRu: "Сертификационное испытание постоянной линии СКС", unitId: "test", formulaId: "lvs_permanent_link_test_count_v1", sourceRole: "USER_SUPPLIED_OUTLET_COUNT_AND_APPROVED_CERTIFICATION_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs_outlet_register", ordinal: 15, section: "Документы", category: "service", titleRu: "Запись розетки и порта в исполнительном реестре СКС", unitId: "outlet", formulaId: "lvs_outlet_register_count_v1", sourceRole: "USER_SUPPLIED_OUTLET_COUNT_AND_APPROVED_ASBUILT_REGISTER", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs_fiber_cable", ordinal: 16, section: "Условные материалы", category: "material", titleRu: "Оптический кабель магистрали СКС", unitId: "m", formulaId: "lvs_fiber_cable_length_v1", inclusionAst: equals("lvs_fiber_backbone_mode", "REQUIRED"), titleParameterIds: ["lvs_fiber_cable_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_FIBER_BACKBONE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_fiber_termination", ordinal: 17, section: "Условные комплектующие", category: "material", titleRu: "Оконцевание оптической магистрали СКС", unitId: "pcs", formulaId: "lvs_fiber_termination_quantity_v1", inclusionAst: equals("lvs_fiber_backbone_mode", "REQUIRED"), titleParameterIds: ["lvs_fiber_termination_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_FIBER_BACKBONE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs_active_uplink", ordinal: 18, section: "Условное оборудование", category: "equipment", titleRu: "Активное оборудование uplink СКС", unitId: "pcs", formulaId: "lvs_active_uplink_quantity_v1", inclusionAst: equals("lvs_active_uplink_mode", "REQUIRED"), titleParameterIds: ["lvs_active_uplink_designation"], sourceRole: "APPROVED_ACTIVE_NETWORK_ARCHITECTURE", procurementEligible: true }),
  resource({ rowId: "rc09:lvs-outlet-balance:installed-net", ordinal: 19, section: "Баланс модулей розеток", category: "equipment", titleRu: "Количество устанавливаемых модулей розеток", unitId: "pcs", formulaId: "lvs_outlet_installed_net_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs-outlet-balance:retained-spare", ordinal: 20, section: "Баланс модулей розеток", category: "equipment", titleRu: "Сохраняемый резерв модулей розеток", unitId: "pcs", formulaId: "lvs_outlet_retained_spare_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs-outlet-balance:total-need", ordinal: 21, section: "Баланс модулей розеток", category: "equipment", titleRu: "Общая потребность в модулях розеток", unitId: "pcs", formulaId: "lvs_outlet_total_need_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs-outlet-balance:package-count", ordinal: 22, section: "Баланс модулей розеток", category: "equipment", titleRu: "Количество упаковок модулей розеток", unitId: "package", formulaId: "lvs_outlet_package_count_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs-outlet-balance:remainder", ordinal: 23, section: "Баланс модулей розеток", category: "equipment", titleRu: "Остаток модулей розеток после монтажа", unitId: "pcs", formulaId: "lvs_outlet_remainder_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs-outlet-balance:surplus-beyond-spare", ordinal: 24, section: "Баланс модулей розеток", category: "equipment", titleRu: "Свободный остаток модулей сверх резерва", unitId: "pcs", formulaId: "lvs_outlet_surplus_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:lvs_test_report", ordinal: 25, section: "Контроль", category: "service", titleRu: "Комплект протоколов сертификации СКС", unitId: "document", formulaId: "lvs_test_report_quantity_v1", titleParameterIds: ["lvs_test_report_designation"], sourceRole: "APPROVED_STRUCTURED_CABLING_CERTIFICATION_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:lvs-cable-component-install", ordinal: 26, section: "Труд", category: "construction_work", titleRu: "Труд по прокладке кабелей и монтажу компонентов СКС", unitId: "man_hour", formulaId: "lvs_cable_component_install_labor_v1", sourceRole: "APPROVED_STRUCTURED_CABLING_INSTALLATION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:lvs-termination-labeling", ordinal: 27, section: "Труд", category: "construction_work", titleRu: "Труд по окончанию и маркировке линий СКС", unitId: "man_hour", formulaId: "lvs_termination_labeling_labor_v1", sourceRole: "APPROVED_STRUCTURED_CABLING_INSTALLATION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:lvs-certification-documentation", ordinal: 28, section: "Труд", category: "construction_work", titleRu: "Труд по сертификации и исполнительной документации СКС", unitId: "man_hour", formulaId: "lvs_certification_documentation_labor_v1", sourceRole: "APPROVED_STRUCTURED_CABLING_CERTIFICATION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:equipment:lvs-access", ordinal: 29, section: "Механизмы и инструмент", category: "equipment", titleRu: "Подъёмное средство для монтажа СКС", unitId: "machine_hour", formulaId: "lvs_access_equipment_v1", sourceRole: "APPROVED_STRUCTURED_CABLING_INSTALLATION_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:equipment:lvs-certification-tester", ordinal: 30, section: "Механизмы и инструмент", category: "equipment", titleRu: "Сертификационный тестер СКС", unitId: "machine_hour", formulaId: "lvs_certification_tester_v1", sourceRole: "APPROVED_STRUCTURED_CABLING_CERTIFICATION_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:logistics:lvs-delivery", ordinal: 31, section: "Логистика", category: "service", titleRu: "Доставка материалов и компонентов СКС", unitId: "trip", formulaId: "lvs_delivery_v1", sourceRole: "APPROVED_STRUCTURED_CABLING_LOGISTICS_PLAN", procurementEligible: true }),
  resource({ rowId: "rc09:logistics:lvs-packaging-removal", ordinal: 32, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и монтажных отходов СКС", unitId: "trip", formulaId: "lvs_packaging_removal_v1", sourceRole: "APPROVED_STRUCTURED_CABLING_WASTE_PLAN", procurementEligible: true }),
]);

export const LOW_VOLTAGE_SYSTEM_SHORT_INPUT = Object.freeze({
  lvs_system_count: 1,
  lvs_information_outlet_count: 48,
  lvs_outlet_designation: "JACK-RJ45-CAT6",
  lvs_copper_cable_category: "CAT6_LSZH",
  lvs_patch_panel_count: 2,
  lvs_patch_panel_designation: "PP-24-CAT6",
  ...LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT,
});

export const LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT = Object.freeze({
  ...LOW_VOLTAGE_SYSTEM_SHORT_INPUT,
  lvs_copper_cable_designation: "U/UTP Cat6 LSZH по кабельному журналу",
  lvs_copper_cable_length_m: 2400,
  lvs_patch_cord_designation: "Патч-корд Cat6 LSZH по спецификации",
  lvs_patch_cord_quantity_piece: 96,
  lvs_cable_manager_designation: "Организатор 19 дюймов 1U",
  lvs_cable_manager_quantity_piece: 4,
  lvs_faceplate_backbox_designation: "Рамка и коробка информационной розетки",
  lvs_faceplate_backbox_quantity_piece: 48,
  lvs_containment_designation: "Лоток и кабель-канал СКС по трассам",
  lvs_containment_length_m: 500,
  lvs_firestop_designation: "Сертифицированная заделка проходки СКС",
  lvs_firestop_quantity_piece: 20,
  lvs_termination_designation: "Оконцевание RJ45 Cat6 permanent link",
  lvs_termination_quantity_piece: 96,
  lvs_label_designation: "Маркировка розеток, портов и кабелей по проекту",
  lvs_label_quantity_piece: 144,
  lvs_fastening_designation: "Крепёж кабеля и компонентов по узлам",
  lvs_fastening_quantity_set: 400,
  lvs_consumable_designation: "Стяжки, липучки, термоусадка и монтажная мелочёвка",
  lvs_consumable_quantity_kg: 12,
  lvs_grounding_conductor_designation: "Проводник уравнивания потенциалов панелей и трасс",
  lvs_grounding_conductor_length_m: 20,
  lvs_test_report_designation: "Комплект протоколов permanent-link Cat6",
  lvs_test_report_quantity_document: 1,
  lvs_cable_component_install_labor_h: 160,
  lvs_termination_labeling_labor_h: 96,
  lvs_certification_documentation_labor_h: 64,
  lvs_access_equipment_machine_h: 32,
  lvs_certification_tester_machine_h: 40,
  lvs_delivery_trip_count: 3,
  lvs_packaging_removal_trip_count: 1,
  lvs_fiber_backbone_mode: "NOT_REQUIRED",
  lvs_active_uplink_mode: "NOT_REQUIRED",
});

export async function compileLowVoltageSystemR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? LOW_VOLTAGE_SYSTEM_CATALOG_ID;
  if (catalogId !== LOW_VOLTAGE_SYSTEM_CATALOG_ID) {
    throw new Error(`LOW_VOLTAGE_SYSTEM_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile", compilerVersion: "canonical-estimate-compiler.low-voltage-system-r1",
    catalogId, primaryMeasureParameterId: "lvs_system_count",
    parameterDefinitions: [...LOW_VOLTAGE_SYSTEM_PARAMETERS],
    formulaDefinitions: [...LOW_VOLTAGE_SYSTEM_FORMULAS],
    resourceDefinitions: [...LOW_VOLTAGE_SYSTEM_RESOURCES], submittedParameters,
    confirmedParameters: { ...LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value),
  });
}
