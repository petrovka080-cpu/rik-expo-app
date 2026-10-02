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
type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "CONTROL_OR_DOCUMENT";

export const CAR_PARK_SMOKE_EXHAUST_CATALOG_ID =
  "canonical-work:expanded:smoke_exhaust_system";
export const CAR_PARK_SMOKE_EXHAUST_SOURCE_ID =
  "official_sp_kr_41_101_2025_car_park_smoke_control_v1";
export const CAR_PARK_SMOKE_EXHAUST_NORM_ID =
  "norm:kg:sp_kr_41_101_2025:car_park_smoke_control_project_inputs:v1";
export const CAR_PARK_SMOKE_EXHAUST_ARTIFACT_SHA256 =
  "23a857ff2c7311b8a98bce5681696576e10b4d67b713594a02632fa5d39e32e7";

export const CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 41-101:2025 «Системы струйной вентиляции и дымоудаления подземных и крытых автостоянок. Правила проектирования»",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
  source_document_version: "SP_KR_41_101_2025_ORDER_436_EFFECTIVE_2025_09_11",
  definition_hash: CAR_PARK_SMOKE_EXHAUST_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 41-101:2025: §§5.4–5.6 об исходных данных и режимах; §§7.1–7.5 о продольной противодымной вентиляции, критической скорости и производительности вытяжных вентиляторов; §§8.1–8.2 о струйных вентиляторах и их размещении; приложения Е и Ж о расчёте и примере системы",
  use_restriction:
    "Только система струйной вентиляции и дымоудаления подземной или крытой автостоянки. Документ задаёт проектные зависимости и границы применимости, но не даёт универсальных количеств оборудования, воздуховодов, креплений, трудозатрат или времени машин. Все сметные количества принимаются непосредственно из утверждённого проекта, спецификации, паспортов оборудования, ППР и программы испытаний.",
  source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
  official_url: "https://minstroy.gov.kg/ru/document/186/show",
  artifact_sha256: CAR_PARK_SMOKE_EXHAUST_ARTIFACT_SHA256,
  effective_from: "2025-09-11",
});

type ParameterSpec = readonly [
  parameterId: string,
  titleRu: string,
  valueType: "decimal" | "integer" | "text",
  unitId: string | null,
];

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  ["parking_area_m2", "Площадь подземной или крытой автостоянки", "decimal", "m2"],
  ["smoke_exhaust_fan_designation", "Вентилятор дымоудаления по спецификации", "text", null],
  ["smoke_exhaust_fan_count", "Количество вентиляторов дымоудаления", "integer", "pcs"],
  ["makeup_air_fan_designation", "Приточный вентилятор компенсации по спецификации", "text", null],
  ["makeup_air_fan_count", "Количество приточных вентиляторов компенсации", "integer", "pcs"],
  ["jet_fan_designation", "Струйный вентилятор по спецификации", "text", null],
  ["jet_fan_count", "Количество струйных вентиляторов", "integer", "pcs"],
  ["smoke_damper_designation", "Противопожарный дымовой клапан по спецификации", "text", null],
  ["smoke_damper_count", "Количество противопожарных дымовых клапанов", "integer", "pcs"],
  ["smoke_duct_designation", "Система воздуховодов дымоудаления по спецификации", "text", null],
  ["smoke_duct_area_m2", "Площадь поверхности воздуховодов дымоудаления", "decimal", "m2"],
  ["duct_fire_protection_designation", "Огнезащита воздуховодов по проекту", "text", null],
  ["duct_fire_protection_area_m2", "Площадь огнезащиты воздуховодов", "decimal", "m2"],
  ["support_system_designation", "Опоры и подвески системы по проекту", "text", null],
  ["support_set_count", "Количество комплектов опор и подвесок", "integer", "set"],
  ["control_panel_designation", "Шкаф управления дымоудалением по спецификации", "text", null],
  ["control_panel_count", "Количество шкафов управления дымоудалением", "integer", "pcs"],
  ["automation_interface_count", "Количество интерфейсов пожарной автоматики", "integer", "pcs"],
  ["installation_commissioning_labor_man_hour", "Трудоёмкость монтажа и пусконаладки", "decimal", "man_hour"],
  ["lifting_equipment_machine_hour", "Время подъёмного оборудования", "decimal", "machine_hour"],
  ["fan_functional_test_count", "Количество функциональных испытаний вентиляторов", "integer", "test"],
  ["damper_functional_test_count", "Количество функциональных испытаний клапанов", "integer", "test"],
  ["integrated_scenario_test_count", "Количество интегрированных пожарных сценариев", "integer", "test"],
  ["airflow_measurement_protocol_count", "Количество протоколов измерения расхода воздуха", "integer", "document"],
  ["executive_document_count", "Количество комплектов исполнительной документации", "integer", "document"],
]);

const KNOWN_SCOPE = new Set(["parking_area_m2"]);

export type CarParkSmokeExhaustParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CAR_PARK_SMOKE_EXHAUST_PARAMETERS:
readonly CarParkSmokeExhaustParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: valueType === "text"
      ? { minLength: 1, maxLength: 1_000 }
      : { min: valueType === "integer" ? 1 : 0.000_001 },
    truth_metadata: {
      contract: "rik-expo-app.car-park-smoke-exhaust-system-r1",
      semantic_parameter_key: `car-park-smoke-exhaust:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.has(parameterId) ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.has(parameterId)
        ? "KNOWN_CAR_PARK_SCOPE"
        : "APPROVED_SMOKE_CONTROL_PROJECT_SPECIFICATION_METHOD_OR_TEST_PROGRAM",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.has(parameterId)
          ? "Укажите подтверждённую площадь защищаемой подземной или крытой автостоянки."
          : `${titleRu}: укажите прямое значение по проекту, спецификации, паспорту, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.has(parameterId)
          ? "APPROVED_CAR_PARK_PLAN"
          : "APPROVED_SMOKE_CONTROL_PROJECT_SPECIFICATION_METHOD_OR_TEST_PROGRAM",
        source_document: CAR_PARK_SMOKE_EXHAUST_SOURCE_ID,
        source_locator: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.exact_locator,
        guide_version: "car-park-smoke-exhaust-system-r1",
        source_snapshot_hash: CAR_PARK_SMOKE_EXHAUST_ARTIFACT_SHA256,
        applicability:
          "Только струйная вентиляция и дымоудаление подземной или крытой автостоянки; отопление и иные общеобменные системы исключены.",
        verified_at: "2026-09-23T00:00:00+06:00",
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

export const CAR_PARK_SMOKE_EXHAUST_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("car_park_smoke_control_design_area_v1", "m2", "parking_area_m2"),
  formula("smoke_exhaust_fan_quantity_v1", "pcs", "smoke_exhaust_fan_count"),
  formula("makeup_air_fan_quantity_v1", "pcs", "makeup_air_fan_count"),
  formula("jet_fan_quantity_v1", "pcs", "jet_fan_count"),
  formula("smoke_damper_quantity_v1", "pcs", "smoke_damper_count"),
  formula("smoke_duct_area_v1", "m2", "smoke_duct_area_m2"),
  formula("duct_fire_protection_area_v1", "m2", "duct_fire_protection_area_m2"),
  formula("smoke_control_support_quantity_v1", "set", "support_set_count"),
  formula("smoke_control_panel_quantity_v1", "pcs", "control_panel_count"),
  formula("smoke_control_automation_interface_quantity_v1", "pcs", "automation_interface_count"),
  formula("smoke_control_installation_commissioning_labor_v1", "man_hour", "installation_commissioning_labor_man_hour"),
  formula("smoke_control_lifting_equipment_time_v1", "machine_hour", "lifting_equipment_machine_hour"),
  formula("smoke_control_fan_functional_test_quantity_v1", "test", "fan_functional_test_count"),
  formula("smoke_control_damper_functional_test_quantity_v1", "test", "damper_functional_test_count"),
  formula("smoke_control_integrated_scenario_test_quantity_v1", "test", "integrated_scenario_test_count"),
  formula("smoke_control_airflow_protocol_quantity_v1", "document", "airflow_measurement_protocol_count"),
  formula("smoke_control_executive_document_quantity_v1", "document", "executive_document_count"),
]);

const LABOR_ROW_ID = "f09:smoke_control_installation_commissioning_labor";

type IndependentOperation = Readonly<{
  operationId: string;
  rowId: string;
  formulaId: string;
  unitId: string;
  resolutionKind?: "ROW" | "INCLUDED_COMPONENT_ROW";
  parentRowId?: string;
}>;

const INDEPENDENT_REQUIRED_OPERATIONS: readonly IndependentOperation[] = Object.freeze([
  { operationId: "design_basis_review", rowId: "f09:smoke_control_design_basis_review", formulaId: "car_park_smoke_control_design_area_v1", unitId: "m2" },
  { operationId: "smoke_exhaust_fan_product", rowId: "f09:smoke_exhaust_fan", formulaId: "smoke_exhaust_fan_quantity_v1", unitId: "pcs" },
  { operationId: "makeup_air_fan_product", rowId: "f09:smoke_control_makeup_air_fan", formulaId: "makeup_air_fan_quantity_v1", unitId: "pcs" },
  { operationId: "jet_fan_product", rowId: "f09:smoke_control_jet_fan", formulaId: "jet_fan_quantity_v1", unitId: "pcs" },
  { operationId: "smoke_damper_product", rowId: "f09:smoke_control_damper", formulaId: "smoke_damper_quantity_v1", unitId: "pcs" },
  { operationId: "smoke_duct_product", rowId: "f09:smoke_control_duct", formulaId: "smoke_duct_area_v1", unitId: "m2" },
  { operationId: "duct_fire_protection_product", rowId: "f09:smoke_control_duct_fire_protection", formulaId: "duct_fire_protection_area_v1", unitId: "m2" },
  { operationId: "supports_product", rowId: "f09:smoke_control_supports", formulaId: "smoke_control_support_quantity_v1", unitId: "set" },
  { operationId: "control_panel_product", rowId: "f09:smoke_control_panel", formulaId: "smoke_control_panel_quantity_v1", unitId: "pcs" },
  { operationId: "installation_commissioning_labor", rowId: LABOR_ROW_ID, formulaId: "smoke_control_installation_commissioning_labor_v1", unitId: "man_hour" },
  { operationId: "lifting_equipment", rowId: "f09:smoke_control_lifting_equipment", formulaId: "smoke_control_lifting_equipment_time_v1", unitId: "machine_hour" },
  ...[
    ["smoke_exhaust_fan_install", "f09:smoke_exhaust_fan_install", "smoke_exhaust_fan_quantity_v1", "pcs"],
    ["makeup_air_fan_install", "f09:smoke_control_makeup_air_fan_install", "makeup_air_fan_quantity_v1", "pcs"],
    ["jet_fan_install", "f09:smoke_control_jet_fan_install", "jet_fan_quantity_v1", "pcs"],
    ["smoke_damper_install", "f09:smoke_control_damper_install", "smoke_damper_quantity_v1", "pcs"],
    ["smoke_duct_install", "f09:smoke_control_duct_install", "smoke_duct_area_v1", "m2"],
    ["duct_fire_protection_install", "f09:smoke_control_duct_fire_protection_install", "duct_fire_protection_area_v1", "m2"],
    ["supports_install", "f09:smoke_control_supports_install", "smoke_control_support_quantity_v1", "set"],
    ["control_panel_install", "f09:smoke_control_panel_install", "smoke_control_panel_quantity_v1", "pcs"],
    ["automation_interface_configuration", "f09:smoke_control_automation_interface", "smoke_control_automation_interface_quantity_v1", "pcs"],
    ["fan_functional_test", "f09:smoke_control_fan_functional_test", "smoke_control_fan_functional_test_quantity_v1", "test"],
    ["damper_functional_test", "f09:smoke_control_damper_functional_test", "smoke_control_damper_functional_test_quantity_v1", "test"],
    ["integrated_scenario_test", "f09:smoke_control_integrated_scenario_test", "smoke_control_integrated_scenario_test_quantity_v1", "test"],
  ].map(([operationId, rowId, formulaId, unitId]) => ({
    operationId: operationId!, rowId: rowId!, formulaId: formulaId!, unitId: unitId!,
    resolutionKind: "INCLUDED_COMPONENT_ROW" as const, parentRowId: LABOR_ROW_ID,
  })),
  { operationId: "airflow_measurement_protocol", rowId: "f09:smoke_control_airflow_measurement_protocol", formulaId: "smoke_control_airflow_protocol_quantity_v1", unitId: "document" },
  { operationId: "executive_documentation", rowId: "f09:smoke_control_executive_documentation", formulaId: "smoke_control_executive_document_quantity_v1", unitId: "document" },
]);

export const CAR_PARK_SMOKE_EXHAUST_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "PROJECT_SYSTEM",
  generatedFromCurrentRows: false,
  evidenceSha256: CAR_PARK_SMOKE_EXHAUST_ARTIFACT_SHA256,
  evidenceReferences: [
    CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.official_url,
    "approved smoke-control project and equipment schedule",
    "approved method statement and commissioning program",
  ],
  entries: INDEPENDENT_REQUIRED_OPERATIONS.map((operation) => ({
    operationId: operation.operationId,
    expectedResourceId: `required-operation:${operation.operationId}`,
    category: "smoke_control_system",
    specification: "Direct approved project quantity; no universal consumption or productivity",
    condition: "enclosed_or_covered_car_park_jet_smoke_control_selected",
    sourceId: CAR_PARK_SMOKE_EXHAUST_SOURCE_ID,
    unitId: operation.unitId,
    quantityRule: "DIRECT_APPROVED_PROJECT_INPUT",
    detailPrinciple: "SYSTEM_SPECIFIC_NO_HEATING_OR_GENERAL_HVAC_SUBSTITUTION",
    priceRelation: operation.resolutionKind === "INCLUDED_COMPONENT_ROW"
      ? "INCLUDED_IN_INSTALLATION_AND_COMMISSIONING_LABOR"
      : "OWN_COST_OR_CONTROL_DOCUMENT",
    formulaId: operation.formulaId,
    resolution: operation.resolutionKind === "INCLUDED_COMPONENT_ROW"
      ? { kind: "INCLUDED_COMPONENT_ROW", rowId: operation.rowId, parentRowId: LABOR_ROW_ID }
      : { kind: "ROW", rowId: operation.rowId },
  })),
});

const literalTrue = Object.freeze({ kind: "literal", value: true });

function resource(input: Readonly<{
  rowId: string;
  ordinal: number;
  section: string;
  category: "material" | "equipment" | "service" | "construction_work";
  titleRu: string;
  unitId: string;
  formulaId: string;
  costTreatment: CostTreatment;
  procurementEligible?: boolean;
  parentRowId?: string;
  titleParameterIds?: string[];
}>): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `car-park-smoke-exhaust:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "parking_area_m2",
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_APPROVED_PROJECT_QUANTITY",
    normativeTrace: [{
      sourceId: CAR_PARK_SMOKE_EXHAUST_SOURCE_ID,
      source_id: CAR_PARK_SMOKE_EXHAUST_SOURCE_ID,
      normId: CAR_PARK_SMOKE_EXHAUST_NORM_ID,
      norm_id: CAR_PARK_SMOKE_EXHAUST_NORM_ID,
      normVersion: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.source_document_version,
      source_title: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.source_title,
      exact_locator: CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA.exact_locator,
      source_definition_hash: CAR_PARK_SMOKE_EXHAUST_ARTIFACT_SHA256,
    }],
    quantityBasis: "DIRECT_APPROVED_PROJECT_SPECIFICATION_METHOD_OR_TEST_PROGRAM_INPUT",
    excludedAdjacentScope: [
      "heating pipes, radiators, boilers or general heating equipment",
      "general comfort ventilation outside the selected smoke-control system",
      "automatic fire-alarm detector installation and fire-safety logic ownership",
      "incoming electrical feeders and building-level emergency power equipment",
      "invented consumption, productivity or price",
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
    inclusion_ast: literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible ?? false,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const ROWS: Omit<Parameters<typeof resource>[0], "ordinal">[] = [
  { rowId: "f09:smoke_control_design_basis_review", section: "Проектная проверка", category: "construction_work", titleRu: "Проверка проектной основы системы дымоудаления автостоянки", unitId: "m2", formulaId: "car_park_smoke_control_design_area_v1", costTreatment: "OWN_COST" },
  { rowId: "f09:smoke_exhaust_fan", section: "Оборудование", category: "equipment", titleRu: "Вентилятор дымоудаления", unitId: "pcs", formulaId: "smoke_exhaust_fan_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["smoke_exhaust_fan_designation"] },
  { rowId: "f09:smoke_control_makeup_air_fan", section: "Оборудование", category: "equipment", titleRu: "Приточный вентилятор компенсации", unitId: "pcs", formulaId: "makeup_air_fan_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["makeup_air_fan_designation"] },
  { rowId: "f09:smoke_control_jet_fan", section: "Оборудование", category: "equipment", titleRu: "Струйный вентилятор автостоянки", unitId: "pcs", formulaId: "jet_fan_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["jet_fan_designation"] },
  { rowId: "f09:smoke_control_damper", section: "Оборудование", category: "equipment", titleRu: "Противопожарный дымовой клапан", unitId: "pcs", formulaId: "smoke_damper_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["smoke_damper_designation"] },
  { rowId: "f09:smoke_control_duct", section: "Материалы", category: "material", titleRu: "Воздуховоды системы дымоудаления", unitId: "m2", formulaId: "smoke_duct_area_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["smoke_duct_designation"] },
  { rowId: "f09:smoke_control_duct_fire_protection", section: "Материалы", category: "material", titleRu: "Огнезащита воздуховодов дымоудаления", unitId: "m2", formulaId: "duct_fire_protection_area_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["duct_fire_protection_designation"] },
  { rowId: "f09:smoke_control_supports", section: "Материалы", category: "material", titleRu: "Опоры и подвески системы дымоудаления", unitId: "set", formulaId: "smoke_control_support_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["support_system_designation"] },
  { rowId: "f09:smoke_control_panel", section: "Оборудование", category: "equipment", titleRu: "Шкаф управления системой дымоудаления", unitId: "pcs", formulaId: "smoke_control_panel_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["control_panel_designation"] },
  { rowId: LABOR_ROW_ID, section: "Труд", category: "construction_work", titleRu: "Труд по монтажу и системной пусконаладке дымоудаления", unitId: "man_hour", formulaId: "smoke_control_installation_commissioning_labor_v1", costTreatment: "OWN_COST" },
  { rowId: "f09:smoke_control_lifting_equipment", section: "Машины и механизмы", category: "equipment", titleRu: "Подъёмное оборудование для монтажа системы дымоудаления", unitId: "machine_hour", formulaId: "smoke_control_lifting_equipment_time_v1", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "f09:smoke_exhaust_fan_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж вентилятора дымоудаления", unitId: "pcs", formulaId: "smoke_exhaust_fan_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_makeup_air_fan_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж приточного вентилятора компенсации", unitId: "pcs", formulaId: "makeup_air_fan_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_jet_fan_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж струйного вентилятора автостоянки", unitId: "pcs", formulaId: "jet_fan_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_damper_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж противопожарного дымового клапана", unitId: "pcs", formulaId: "smoke_damper_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_duct_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж воздуховодов системы дымоудаления", unitId: "m2", formulaId: "smoke_duct_area_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_duct_fire_protection_install", section: "Состав работ", category: "construction_work", titleRu: "Нанесение или монтаж огнезащиты воздуховодов", unitId: "m2", formulaId: "duct_fire_protection_area_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_supports_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж опор и подвесок системы дымоудаления", unitId: "set", formulaId: "smoke_control_support_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_panel_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж шкафа управления дымоудалением", unitId: "pcs", formulaId: "smoke_control_panel_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_automation_interface", section: "Системные интерфейсы", category: "construction_work", titleRu: "Настройка интерфейса системы дымоудаления с пожарной автоматикой", unitId: "pcs", formulaId: "smoke_control_automation_interface_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_fan_functional_test", section: "Испытания", category: "construction_work", titleRu: "Функциональное испытание вентилятора дымоудаления", unitId: "test", formulaId: "smoke_control_fan_functional_test_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_damper_functional_test", section: "Испытания", category: "construction_work", titleRu: "Функциональное испытание противопожарного дымового клапана", unitId: "test", formulaId: "smoke_control_damper_functional_test_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_integrated_scenario_test", section: "Испытания", category: "construction_work", titleRu: "Интегрированное испытание пожарного сценария дымоудаления", unitId: "test", formulaId: "smoke_control_integrated_scenario_test_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { rowId: "f09:smoke_control_airflow_measurement_protocol", section: "Документация", category: "service", titleRu: "Протокол измерения расхода воздуха системы дымоудаления", unitId: "document", formulaId: "smoke_control_airflow_protocol_quantity_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "f09:smoke_control_executive_documentation", section: "Документация", category: "service", titleRu: "Комплект исполнительной документации системы дымоудаления", unitId: "document", formulaId: "smoke_control_executive_document_quantity_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
];

export const CAR_PARK_SMOKE_EXHAUST_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROWS.map((row, ordinal) => resource({ ...row, ordinal })),
);

export const CAR_PARK_SMOKE_EXHAUST_SHORT_INPUT = Object.freeze({
  parking_area_m2: 4_870,
});

export const CAR_PARK_SMOKE_EXHAUST_ACCEPTANCE_INPUT = Object.freeze({
  ...CAR_PARK_SMOKE_EXHAUST_SHORT_INPUT,
  smoke_exhaust_fan_designation: "Вентилятор дымоудаления по утверждённой спецификации",
  smoke_exhaust_fan_count: 2,
  makeup_air_fan_designation: "Приточный вентилятор компенсации по утверждённой спецификации",
  makeup_air_fan_count: 2,
  jet_fan_designation: "Реверсивный струйный вентилятор по утверждённой спецификации",
  jet_fan_count: 12,
  smoke_damper_designation: "Противопожарный дымовой клапан по утверждённой спецификации",
  smoke_damper_count: 8,
  smoke_duct_designation: "Воздуховоды дымоудаления по рабочей документации",
  smoke_duct_area_m2: 1_200,
  duct_fire_protection_designation: "Огнезащита воздуховодов по проекту",
  duct_fire_protection_area_m2: 1_050,
  support_system_designation: "Опоры и подвески по рабочим узлам",
  support_set_count: 180,
  control_panel_designation: "Шкаф управления по спецификации автоматики",
  control_panel_count: 2,
  automation_interface_count: 10,
  installation_commissioning_labor_man_hour: 1_600,
  lifting_equipment_machine_hour: 96,
  fan_functional_test_count: 16,
  damper_functional_test_count: 8,
  integrated_scenario_test_count: 6,
  airflow_measurement_protocol_count: 4,
  executive_document_count: 1,
});

export async function compileCarParkSmokeExhaustSystemR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CAR_PARK_SMOKE_EXHAUST_CATALOG_ID;
  if (catalogId !== CAR_PARK_SMOKE_EXHAUST_CATALOG_ID) {
    throw new Error(`CAR_PARK_SMOKE_EXHAUST_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.car-park-smoke-exhaust-system-r1",
    catalogId,
    primaryMeasureParameterId: "parking_area_m2",
    parameterDefinitions: [...CAR_PARK_SMOKE_EXHAUST_PARAMETERS],
    formulaDefinitions: [...CAR_PARK_SMOKE_EXHAUST_FORMULAS],
    resourceDefinitions: [...CAR_PARK_SMOKE_EXHAUST_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 30,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
