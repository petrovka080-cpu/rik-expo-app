import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "./domainFactory";
import type { ProfessionalParameterValueV4 } from "./professionalProjectAssemblyV4";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const STRIP_FOUNDATION_REINFORCEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_standard", titleRu: "Армирование ленточного фундамента в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_high_load", titleRu: "Армирование ленточного фундамента в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_large_area", titleRu: "Армирование ленточного фундамента на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_repair", titleRu: "Армирование ремонтного участка ленточного фундамента", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_small_area", titleRu: "Армирование ленточного фундамента на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_technical_room", titleRu: "Армирование ленточного фундамента технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_wet_zone", titleRu: "Армирование ленточного фундамента во влажной зоне", contextRu: "влажная зона" },
] as const);

export type StripFoundationReinforcementContextKey =
  (typeof STRIP_FOUNDATION_REINFORCEMENT_TARGETS)[number]["contextKey"];

const PARAMETER_SPECS = Object.freeze([
  ["product_profile_id", "Правило определения массы арматуры", "enum", null, [REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID]],
  ["approved_reinforcement_schedule_weight_kg", "Масса по утверждённой ведомости стержней", "decimal", "kg", null],
  ["bar_bending_schedule_reference", "Утверждённая ведомость стержней", "text", null, null],
  ["structural_drawing_and_revision_reference", "Конструктивный чертёж и ревизия", "text", null, null],
  ["bar_standard_and_grade", "Стандарт и класс арматуры", "text", null, null],
  ["bar_size_designation", "Обозначение размера стержня", "text", null, null],
  ["nominal_diameter_mm", "Номинальный диаметр стержня", "decimal", "mm", null],
  ["shape_straight_bent_curved_or_link", "Форма стержня", "text", null, null],
  ["bar_count_and_cut_length_m", "Число стержней и длины резки", "text", null, null],
  ["selected_standard_mass_kg_per_m", "Масса погонного метра по выбранной таблице", "decimal", "kg_per_m", null],
  ["laps_hooks_chairs_connectors_and_accessories_scope", "Состав нахлёстов, крюков, фиксаторов и соединителей", "text", null, null],
  ["fabrication_allowance_if_documented", "Документированный запас изготовления", "text", null, null],
  ["supplier_bundle_or_length_constraints", "Ограничения поставщика по длинам и пакетам", "text", null, null],
  ["estimator_approval_reference", "Согласование ведомости сметчиком", "text", null, null],
  ["fabrication_mode", "Способ изготовления арматурных каркасов", "enum", null, ["READY_CAGES", "SITE_FABRICATED"]],
  ["binding_wire_specification", "Спецификация вязальной проволоки", "text", null, null],
  ["binding_wire_mass_kg", "Масса вязальной проволоки", "decimal", "kg", null],
  ["spacer_chair_designation", "Обозначение фиксаторов защитного слоя", "text", null, null],
  ["spacer_chair_quantity_piece", "Количество фиксаторов защитного слоя", "decimal", "piece", null],
  ["mechanical_couplers_applicable", "Механические муфты применяются", "boolean", null, null],
  ["mechanical_coupler_designation", "Обозначение механических муфт", "text", null, null],
  ["mechanical_coupler_quantity_piece", "Количество механических муфт", "decimal", "piece", null],
  ["unloading_and_storage_worker_h", "Трудозатраты на разгрузку и складирование", "decimal", "man_hour", null],
  ["site_cutting_worker_h", "Трудозатраты на резку стержней", "decimal", "man_hour", null],
  ["site_bending_worker_h", "Трудозатраты на гибку стержней", "decimal", "man_hour", null],
  ["cage_assembly_worker_h", "Трудозатраты на сборку каркасов", "decimal", "man_hour", null],
  ["installation_worker_h", "Трудозатраты на установку и вязку каркасов", "decimal", "man_hour", null],
  ["cover_control_worker_h", "Трудозатраты на контроль защитного слоя и геометрии", "decimal", "man_hour", null],
  ["rebar_cutting_machine_h", "Работа станка резки арматуры", "decimal", "machine_hour", null],
  ["rebar_bending_machine_h", "Работа станка гибки арматуры", "decimal", "machine_hour", null],
  ["lifting_equipment_applicable", "Подъёмное оборудование применяется", "boolean", null, null],
  ["lifting_equipment_designation", "Обозначение подъёмного оборудования", "text", null, null],
  ["lifting_machine_h", "Работа подъёмного оборудования", "decimal", "machine_hour", null],
  ["reinforcement_inspection_service_h", "Инженерный контроль армирования", "decimal", "service_hour", null],
  ["mill_certificate_package_count", "Комплект сертификатов на арматурную сталь", "decimal", "document", null],
  ["delivery_pricing_mode", "Учёт доставки арматуры", "enum", null, ["SEPARATE", "INCLUDED_IN_SUPPLY"]],
  ["reinforcement_delivery_distance_km", "Расстояние доставки арматуры", "decimal", "km", null],
] as const);

const NORMATIVE_PARAMETER_IDS = new Set<string>(
  REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS,
);
NORMATIVE_PARAMETER_IDS.add("product_profile_id");

export const STRIP_FOUNDATION_REINFORCEMENT_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  ...REINFORCEMENT_BAR_SCHEDULE_REQUIRED_EXPLICIT_PARAMETER_IDS,
] as const);

export type StripFoundationReinforcementParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS:
readonly StripFoundationReinforcementParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      : valueType === "decimal"
        ? { min: parameterId === "approved_reinforcement_schedule_weight_kg"
          || parameterId === "nominal_diameter_mm"
          || parameterId === "selected_standard_mass_kg_per_m" ? 0.000_001 : 0 }
        : valueType === "text"
          ? { minLength: 1, maxLength: 1_000 }
          : {},
    truth_metadata: {
      contract: "rik-expo-app.strip-foundation-reinforcement-r1",
      semantic_parameter_key: `strip-foundation-reinforcement:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: NORMATIVE_PARAMETER_IDS.has(parameterId)
        ? "SELECTED_NORMATIVE_GUIDANCE_AND_PROJECT_CONFIRMATION"
        : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? "MANDATORY_NORM_VALUE"
          : "PROJECT_DEFINED",
        guide_short_ru: `${titleRu}: укажите подтверждённое проектом или производственной ведомостью значение.`,
        source_role: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? "FHWA_RICS_AND_APPROVED_BAR_SCHEDULE"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID
          : null,
        source_locator: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "strip-foundation-reinforcement-r1",
        source_snapshot_hash: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash
          : estimateDeterministicHash("strip-foundation-reinforcement-project-schedule-r1"),
        applicability: NORMATIVE_PARAMETER_IDS.has(parameterId)
          ? "Только утверждённая ведомость стержней с чертежом, выбранной таблицей массы и явным составом аксессуаров; это не норма кг/м³ бетона."
          : "Значение относится к конкретной захватке армирования и не выводится из универсальной производительности.",
        verified_at: "2026-09-16T00:00:00+06:00",
        guide_validation_policy: "REJECT_MISSING_APPROVED_BAR_SCHEDULE_OR_PROJECT_EXECUTION_SCHEDULE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  }),
));

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

export type StripFoundationReinforcementFormula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

export const STRIP_FOUNDATION_REINFORCEMENT_FORMULAS:
readonly StripFoundationReinforcementFormula[] = Object.freeze([
  formula("approved_rebar_schedule_weight_v1", "kg", "approved_reinforcement_schedule_weight_kg"),
  formula("binding_wire_quantity_v1", "kg", "binding_wire_mass_kg"),
  formula("spacer_chair_quantity_v1", "piece", "spacer_chair_quantity_piece"),
  formula("mechanical_coupler_quantity_v1", "piece", "mechanical_coupler_quantity_piece"),
  formula("unloading_and_storage_labor_v1", "man_hour", "unloading_and_storage_worker_h"),
  formula("site_cutting_labor_v1", "man_hour", "site_cutting_worker_h"),
  formula("site_bending_labor_v1", "man_hour", "site_bending_worker_h"),
  formula("cage_assembly_labor_v1", "man_hour", "cage_assembly_worker_h"),
  formula("installation_labor_v1", "man_hour", "installation_worker_h"),
  formula("cover_control_labor_v1", "man_hour", "cover_control_worker_h"),
  formula("rebar_cutting_machine_time_v1", "machine_hour", "rebar_cutting_machine_h"),
  formula("rebar_bending_machine_time_v1", "machine_hour", "rebar_bending_machine_h"),
  formula("lifting_machine_time_v1", "machine_hour", "lifting_machine_h"),
  formula("reinforcement_inspection_service_v1", "service_hour", "reinforcement_inspection_service_h"),
  formula("mill_certificate_package_v1", "document", "mill_certificate_package_count"),
  formula("reinforcement_delivery_v1", "t_km", "approved_reinforcement_schedule_weight_kg / 1000 * reinforcement_delivery_distance_km"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
const greaterThan = (parameterId: string, value: number) => ({ kind: "greater_than", parameterId, value });
const and = (...operands: Json[]) => ({ kind: "and", operands });

const REINFORCEMENT_BINDING = Object.freeze({
  technology_class: "REINFORCEMENT_SCHEDULE_MEASUREMENT",
  operation_class: "MEASURE",
  material_system: "APPROVED_REINFORCEMENT_BAR_SCHEDULE",
  scope_mode: "FULL_APPLICABLE_SCOPE",
  product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  activation: {
    parameter_id: "product_profile_id",
    equals: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  },
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
  professionalPhysicalNorm?: boolean;
  sourceRole?: string;
}): CanonicalEstimateResourceDefinition {
  const normativeTrace = input.professionalPhysicalNorm
    ? [{
      sourceId: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
      source_id: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
      normId: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
      norm_id: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
      normVersion: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_document_version,
      source_title: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_title,
      source_url: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_url,
      exact_locator: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.exact_locator,
      source_definition_hash: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash,
    }]
    : [{
      sourceId: "project_reinforcement_execution_schedule",
      sourceRole: input.sourceRole ?? "APPROVED_PROJECT_SCHEDULE",
    }];
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `strip-foundation-reinforcement:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    ...(input.professionalPhysicalNorm
      ? { professionalPhysicalNormBindingV1: REINFORCEMENT_BINDING }
      : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.professionalPhysicalNorm
      ? "PRIMARY_PUBLIC_MEASUREMENT_GUIDANCE_AND_APPROVED_PROJECT_BAR_SCHEDULE"
      : input.sourceRole ?? "APPROVED_PROJECT_SCHEDULE",
    normativeTrace,
    excludedUnownedAssumptions: [
      "generic reinforcement kg per m3",
      "automatic diameter squared over 162 takeoff",
      "automatic fabrication waste",
      "automatic labor or equipment productivity",
      "hidden delivery distance",
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

const siteFabricated = equals("fabrication_mode", "SITE_FABRICATED");

export const STRIP_FOUNDATION_REINFORCEMENT_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "material:reinforcement:steel-approved-schedule", ordinal: 0, section: "Материалы", category: "material", titleRu: "Арматурная сталь по утверждённой ведомости стержней", unitId: "kg", formulaId: "approved_rebar_schedule_weight_v1", procurementEligible: true, professionalPhysicalNorm: true, titleParameterIds: ["bar_standard_and_grade", "bar_size_designation"] }),
  resource({ rowId: "material:reinforcement:binding-wire", ordinal: 1, section: "Материалы", category: "material", titleRu: "Проволока вязальная отожжённая", unitId: "kg", formulaId: "binding_wire_quantity_v1", procurementEligible: true, titleParameterIds: ["binding_wire_specification"] }),
  resource({ rowId: "material:reinforcement:spacer-chairs", ordinal: 2, section: "Материалы", category: "material", titleRu: "Фиксаторы защитного слоя и опорные элементы", unitId: "piece", formulaId: "spacer_chair_quantity_v1", procurementEligible: true, titleParameterIds: ["spacer_chair_designation"] }),
  resource({ rowId: "material:reinforcement:mechanical-couplers", ordinal: 3, section: "Материалы", category: "material", titleRu: "Механические соединительные муфты арматуры", unitId: "piece", formulaId: "mechanical_coupler_quantity_v1", inclusionAst: equals("mechanical_couplers_applicable", true), procurementEligible: true, titleParameterIds: ["mechanical_coupler_designation"] }),
  resource({ rowId: "work:reinforcement:unload-store", ordinal: 4, section: "Работы", category: "construction_work", titleRu: "Разгрузка, сортировка и складирование арматуры", unitId: "man_hour", formulaId: "unloading_and_storage_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:reinforcement:site-cut", ordinal: 5, section: "Работы", category: "construction_work", titleRu: "Резка арматурных стержней по ведомости", unitId: "man_hour", formulaId: "site_cutting_labor_v1", inclusionAst: siteFabricated, procurementEligible: false }),
  resource({ rowId: "work:reinforcement:site-bend", ordinal: 6, section: "Работы", category: "construction_work", titleRu: "Гибка арматурных стержней по ведомости", unitId: "man_hour", formulaId: "site_bending_labor_v1", inclusionAst: siteFabricated, procurementEligible: false }),
  resource({ rowId: "work:reinforcement:cage-assembly", ordinal: 7, section: "Работы", category: "construction_work", titleRu: "Сборка арматурных каркасов на объекте", unitId: "man_hour", formulaId: "cage_assembly_labor_v1", inclusionAst: siteFabricated, procurementEligible: false }),
  resource({ rowId: "work:reinforcement:install-fix", ordinal: 8, section: "Работы", category: "construction_work", titleRu: "Установка и фиксация арматурных каркасов", unitId: "man_hour", formulaId: "installation_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:reinforcement:cover-control", ordinal: 9, section: "Работы", category: "construction_work", titleRu: "Контроль защитного слоя, выпусков и геометрии армирования", unitId: "man_hour", formulaId: "cover_control_labor_v1", procurementEligible: false }),
  resource({ rowId: "equipment:reinforcement:cutting-machine", ordinal: 10, section: "Оборудование", category: "equipment", titleRu: "Станок резки арматуры по производственной ведомости", unitId: "machine_hour", formulaId: "rebar_cutting_machine_time_v1", inclusionAst: siteFabricated, procurementEligible: true }),
  resource({ rowId: "equipment:reinforcement:bending-machine", ordinal: 11, section: "Оборудование", category: "equipment", titleRu: "Станок гибки арматуры по производственной ведомости", unitId: "machine_hour", formulaId: "rebar_bending_machine_time_v1", inclusionAst: siteFabricated, procurementEligible: true }),
  resource({ rowId: "equipment:reinforcement:lifting", ordinal: 12, section: "Оборудование", category: "equipment", titleRu: "Подъёмное оборудование для арматурных каркасов", unitId: "machine_hour", formulaId: "lifting_machine_time_v1", inclusionAst: equals("lifting_equipment_applicable", true), procurementEligible: true, titleParameterIds: ["lifting_equipment_designation"] }),
  resource({ rowId: "service:reinforcement:inspection", ordinal: 13, section: "Услуги", category: "service", titleRu: "Инженерный контроль армирования до бетонирования", unitId: "service_hour", formulaId: "reinforcement_inspection_service_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "service:reinforcement:mill-certificates", ordinal: 14, section: "Услуги", category: "service", titleRu: "Комплект сертификатов и исполнительных документов на арматуру", unitId: "document", formulaId: "mill_certificate_package_v1", procurementEligible: true, sourceRole: "SUPPLIER_CERTIFICATES_AND_PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "delivery:reinforcement:steel", ordinal: 15, section: "Доставка", category: "delivery", titleRu: "Доставка арматурной стали или готовых каркасов", unitId: "t_km", formulaId: "reinforcement_delivery_v1", inclusionAst: and(equals("delivery_pricing_mode", "SEPARATE"), greaterThan("reinforcement_delivery_distance_km", 0)), procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_DELIVERY_SCHEDULE" }),
]);

const BASE_INPUT: Readonly<Record<string, InputValue>> = Object.freeze({
  product_profile_id: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  bar_standard_and_grade: "ASTM A615 Grade 60",
  bar_size_designation: "No. 5",
  nominal_diameter_mm: 15.875,
  shape_straight_bent_curved_or_link: "BENT:PROJECT-BBS",
  selected_standard_mass_kg_per_m: 1.552,
  laps_hooks_chairs_connectors_and_accessories_scope:
    "PROJECT_SCOPE:all BBS laps and hooks; chairs and couplers scheduled separately",
  fabrication_allowance_if_documented: "NONE:INCLUDED_IN_APPROVED_SCHEDULE",
  supplier_bundle_or_length_constraints: "NONE:NO_AUTOMATIC_BUNDLE_ROUNDING",
  binding_wire_specification: "Проволока вязальная отожжённая по проектной ведомости",
  mechanical_couplers_applicable: false,
  mechanical_coupler_designation: "NOT_APPLICABLE:PROJECT_BBS_HAS_NO_MECHANICAL_COUPLERS",
  mechanical_coupler_quantity_piece: 0,
  lifting_equipment_applicable: false,
  lifting_equipment_designation: "NOT_APPLICABLE:MANUAL_HANDLING_CONFIRMED_BY_METHOD_STATEMENT",
  lifting_machine_h: 0,
  fabrication_mode: "READY_CAGES",
  site_cutting_worker_h: 0,
  site_bending_worker_h: 0,
  cage_assembly_worker_h: 0,
  rebar_cutting_machine_h: 0,
  rebar_bending_machine_h: 0,
  mill_certificate_package_count: 1,
  delivery_pricing_mode: "SEPARATE",
});

const PROJECT_SCHEDULES: Readonly<Record<
StripFoundationReinforcementContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { approved_reinforcement_schedule_weight_kg: 2_400, binding_wire_mass_kg: 28.8, spacer_chair_designation: "SF-SPACER-50", spacer_chair_quantity_piece: 320, unloading_and_storage_worker_h: 10, installation_worker_h: 74, cover_control_worker_h: 8, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 18 },
  high_load: { approved_reinforcement_schedule_weight_kg: 8_600, binding_wire_mass_kg: 112, spacer_chair_designation: "SF-HD-SPACER-60", spacer_chair_quantity_piece: 1_240, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "SF-HD-COUPLER-NO5", mechanical_coupler_quantity_piece: 188, unloading_and_storage_worker_h: 32, site_cutting_worker_h: 46, site_bending_worker_h: 58, cage_assembly_worker_h: 174, installation_worker_h: 226, cover_control_worker_h: 26, rebar_cutting_machine_h: 18, rebar_bending_machine_h: 22, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР SF-HD-LIFT", lifting_machine_h: 16, reinforcement_inspection_service_h: 12, mill_certificate_package_count: 3, reinforcement_delivery_distance_km: 32 },
  large_area: { approved_reinforcement_schedule_weight_kg: 16_800, binding_wire_mass_kg: 206, spacer_chair_designation: "SF-LA-SPACER-50", spacer_chair_quantity_piece: 2_640, fabrication_mode: "SITE_FABRICATED", unloading_and_storage_worker_h: 58, site_cutting_worker_h: 88, site_bending_worker_h: 104, cage_assembly_worker_h: 336, installation_worker_h: 420, cover_control_worker_h: 42, rebar_cutting_machine_h: 34, rebar_bending_machine_h: 40, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР SF-LA-LIFT", lifting_machine_h: 34, reinforcement_inspection_service_h: 20, mill_certificate_package_count: 5, reinforcement_delivery_distance_km: 45 },
  repair: { approved_reinforcement_schedule_weight_kg: 780, binding_wire_mass_kg: 12, spacer_chair_designation: "SF-REPAIR-SPACER-40", spacer_chair_quantity_piece: 126, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "SF-REPAIR-COUPLER-NO5", mechanical_coupler_quantity_piece: 24, unloading_and_storage_worker_h: 5, site_cutting_worker_h: 12, site_bending_worker_h: 10, cage_assembly_worker_h: 28, installation_worker_h: 38, cover_control_worker_h: 6, rebar_cutting_machine_h: 4, rebar_bending_machine_h: 4, reinforcement_inspection_service_h: 4, reinforcement_delivery_distance_km: 14 },
  small_area: { approved_reinforcement_schedule_weight_kg: 420, binding_wire_mass_kg: 6.5, spacer_chair_designation: "SF-SA-SPACER-40", spacer_chair_quantity_piece: 72, unloading_and_storage_worker_h: 3, installation_worker_h: 22, cover_control_worker_h: 4, reinforcement_inspection_service_h: 2, reinforcement_delivery_distance_km: 10 },
  technical_room: { approved_reinforcement_schedule_weight_kg: 1_950, binding_wire_mass_kg: 25, spacer_chair_designation: "SF-TR-SPACER-50", spacer_chair_quantity_piece: 286, fabrication_mode: "SITE_FABRICATED", mechanical_couplers_applicable: true, mechanical_coupler_designation: "SF-TR-COUPLER-NO5", mechanical_coupler_quantity_piece: 42, unloading_and_storage_worker_h: 9, site_cutting_worker_h: 16, site_bending_worker_h: 18, cage_assembly_worker_h: 54, installation_worker_h: 68, cover_control_worker_h: 10, rebar_cutting_machine_h: 6, rebar_bending_machine_h: 7, reinforcement_inspection_service_h: 5, reinforcement_delivery_distance_km: 20 },
  wet_zone: { approved_reinforcement_schedule_weight_kg: 3_900, binding_wire_mass_kg: 52, spacer_chair_designation: "SF-WZ-NONABSORBENT-SPACER-60", spacer_chair_quantity_piece: 620, bar_standard_and_grade: "ASTM A615 Grade 60; wet-zone project protection system", unloading_and_storage_worker_h: 16, installation_worker_h: 118, cover_control_worker_h: 18, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР SF-WZ-LIFT", lifting_machine_h: 8, reinforcement_inspection_service_h: 9, mill_certificate_package_count: 2, reinforcement_delivery_distance_km: 28 },
});

export function stripFoundationReinforcementAcceptanceInputR1(
  contextKey: StripFoundationReinforcementContextKey,
): Readonly<Record<string, InputValue>> {
  const target = STRIP_FOUNDATION_REINFORCEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`STRIP_FOUNDATION_REINFORCEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const schedule = PROJECT_SCHEDULES[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...schedule,
    bar_bending_schedule_reference: `BBS-SF-${reference}-REV-A`,
    structural_drawing_and_revision_reference: `STR-SF-${reference}-REV-A`,
    bar_count_and_cut_length_m:
      `PROJECT_BBS:BBS-SF-${reference}-REV-A; ${schedule.approved_reinforcement_schedule_weight_kg} kg aggregate approved mass across all bar marks`,
    estimator_approval_reference: `EST-SF-${reference}-REBAR-REV-A`,
  });
}

function explicitParameters(values: Readonly<Record<string, InputValue>>) {
  return Object.fromEntries(Object.entries(values).map(([parameterId, value]) => [
    parameterId,
    {
      value,
      unit_id: STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS.find(
        (parameter) => parameter.parameter_id === parameterId,
      )?.unit_id ?? null,
      source_type: "USER_EXPLICIT",
      source_id: `strip-foundation-reinforcement:${parameterId}`,
      captured_at: "2026-09-16T00:00:00.000Z",
      confidence: "high",
      applicability: "Approved project reinforcement schedule and execution plan.",
    } satisfies ProfessionalParameterValueV4,
  ]));
}

export async function compileStripFoundationReinforcementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? STRIP_FOUNDATION_REINFORCEMENT_TARGETS[0].catalogId;
  if (!STRIP_FOUNDATION_REINFORCEMENT_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`STRIP_FOUNDATION_REINFORCEMENT_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const values = submittedParameters as Readonly<Record<string, InputValue>>;
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "REINFORCEMENT_SCHEDULE_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "APPROVED_REINFORCEMENT_BAR_SCHEDULE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameters(values),
  });
  if (resolution.status !== "APPLIED") {
    throw Object.assign(new Error(
      `STRIP_FOUNDATION_REINFORCEMENT_${resolution.status}:${resolution.blockers.join("|")}`,
    ), { code: "PARAMETER_VALIDATION_FAILED" });
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.strip-foundation-reinforcement-r1",
    catalogId,
    primaryMeasureParameterId: "approved_reinforcement_schedule_weight_kg",
    parameterDefinitions: [...STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS],
    formulaDefinitions: [...STRIP_FOUNDATION_REINFORCEMENT_FORMULAS],
    resourceDefinitions: [...STRIP_FOUNDATION_REINFORCEMENT_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 24,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const STRIP_FOUNDATION_REINFORCEMENT_SOURCE_METADATA = Object.freeze({
  sourceId: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  normId: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  productProfileId: REINFORCEMENT_BAR_SCHEDULE_PRODUCT_PROFILE_ID,
  sourceVersion: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.source_document_version,
  sourceDefinitionHash: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash,
  formula: "approved_reinforcement_schedule_weight_kg * 1",
  previousGenericKgPerM3FactorRejected: true,
  automaticDiameterSquaredOver162Rejected: true,
  automaticFabricationWasteRejected: true,
  automaticEquipmentProductivityRejected: true,
  automaticLaborProductivityRejected: true,
});
