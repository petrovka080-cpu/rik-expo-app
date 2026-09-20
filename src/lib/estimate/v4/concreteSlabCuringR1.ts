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
export type ConcreteSlabCuringInputValueR1 = string | number | boolean;

export const CONCRETE_SLAB_CURING_SOURCE_ID =
  "src_professional_norm_pack_concrete_aci_spec_308_1_23_project_curing_schedule_v1";
export const CONCRETE_SLAB_CURING_NORM_ID =
  "concrete_aci_spec_308_1_23_project_curing_schedule_v1";
export const CONCRETE_SLAB_CURING_SOURCE_PDF_SHA256 =
  "6d113ae1664bf9b908d82f3fa1232594bb3275e9e20d12eff9c51e3e9532e98d";
const PROJECT_SCHEDULE_GUIDE_SHA256 =
  "1b9a2d4164301e64fb781c8918e5ad9d435de8458aaab66c342c644205add1c5";

export const CONCRETE_SLAB_CURING_SOURCE_METADATA = Object.freeze({
  source_id: CONCRETE_SLAB_CURING_SOURCE_ID,
  source_title: "ACI SPEC-308.1-23: External Curing of Cast-in-Place Concrete—Specification",
  source_document_version: "ACI SPEC-308.1-23",
  source_url:
    "https://www.concrete.org/Portals/0/Files/PDF/Previews/308.1-23_preview.pdf",
  product_url:
    "https://www.concrete.org/store/productdetail.aspx?ItemID=308123&Language=English&Units=US_Units",
  current_guide_url:
    "https://www.concrete.org/store/productdetail?ItemID=30826&Language=English&Units=US_AND_METRIC",
  exact_locator:
    "Public preview pp. 1-4: Scope, Products and Execution; the project specification selects and customizes the external-curing method, materials, initial/final curing and termination requirements.",
  definition_hash: CONCRETE_SLAB_CURING_SOURCE_PDF_SHA256,
  verified_at: "2026-09-18T00:00:00+06:00",
  universal_productivity_claimed: false,
  universal_consumption_claimed: false,
  quantity_basis: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
});

export const CONCRETE_SLAB_CURING_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_standard", titleRu: "Уход за бетонной плитой в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_high_load", titleRu: "Уход за бетонной плитой для высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_large_area", titleRu: "Уход за бетонной плитой на большой площади", contextRu: "большая площадь" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_small_area", titleRu: "Уход за бетонной плитой на малой площади", contextRu: "малая площадь" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_technical_room", titleRu: "Уход за бетонной плитой в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_wet_zone", titleRu: "Уход за бетонной плитой во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ConcreteSlabCuringContextKey =
  (typeof CONCRETE_SLAB_CURING_TARGETS)[number]["contextKey"];

export const CONCRETE_SLAB_CURING_METHODS = Object.freeze([
  "WATER_CURING",
  "WET_COVERING",
  "IMPERVIOUS_SHEET",
  "MEMBRANE_CURING_COMPOUND",
] as const);

type ParameterSpec = Readonly<{
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "text" | "enum" | "boolean";
  unitId: string | null;
  required: boolean;
  constraints: Json;
}>;

const methodEquals = (value: string): Json => ({
  kind: "equals",
  parameterId: "approved_external_curing_method",
  value,
});
const methodIn = (values: readonly string[]): Json => ({
  kind: "in",
  parameterId: "approved_external_curing_method",
  values: [...values],
});
const equipmentEquals = (value: boolean): Json => ({
  kind: "equals",
  parameterId: "application_equipment_required",
  value,
});
const pricingModeEquals = (value: string): Json => ({
  kind: "equals",
  parameterId: "equipment_mobilization_pricing_mode",
  value,
});
const and = (...operands: Json[]): Json => ({ kind: "and", operands });
const or = (...operands: Json[]): Json => ({ kind: "or", operands });

const WATER_METHODS = Object.freeze(["WATER_CURING", "WET_COVERING"] as const);
const NOT_WATER_METHOD = Object.freeze({
  kind: "not",
  operand: methodIn(WATER_METHODS),
});

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { parameterId: "cured_concrete_volume_m3", titleRu: "Объём бетонной плиты в границе ухода", valueType: "decimal", unitId: "m3", required: true, constraints: { min: 0.001 } },
  { parameterId: "exposed_curing_surface_area_m2", titleRu: "Открытая площадь поверхности бетонной плиты для ухода", valueType: "decimal", unitId: "m2", required: true, constraints: { min: 0.001 } },
  { parameterId: "concrete_mix_reference", titleRu: "Проектная спецификация бетонной смеси", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "curing_location", titleRu: "Участок ухода за бетонной плитой", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "approved_external_curing_method", titleRu: "Утверждённый способ внешнего ухода за бетоном", valueType: "enum", unitId: null, required: true, constraints: { values: CONCRETE_SLAB_CURING_METHODS } },
  { parameterId: "curing_method_statement_reference", titleRu: "Утверждённая технологическая карта ухода за бетоном", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "curing_duration_day", titleRu: "Продолжительность ухода по проектной спецификации", valueType: "decimal", unitId: "day", required: true, constraints: { min: 0.001 } },
  { parameterId: "curing_worker_h", titleRu: "Трудозатраты на уход за бетонной плитой", valueType: "decimal", unitId: "man_hour", required: true, constraints: { min: 0.001 } },
  { parameterId: "curing_water_m3", titleRu: "Вода для утверждённого способа ухода", valueType: "decimal", unitId: "m3", required: false, constraints: { min: 0.001, requiredWhen: methodIn(WATER_METHODS), forbiddenWhen: NOT_WATER_METHOD } },
  { parameterId: "curing_water_source_reference", titleRu: "Источник и требуемое качество воды для ухода", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: methodIn(WATER_METHODS), forbiddenWhen: NOT_WATER_METHOD } },
  { parameterId: "wet_covering_material_designation", titleRu: "Материал влажного покрытия по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: methodEquals("WET_COVERING"), forbiddenWhen: { kind: "not", operand: methodEquals("WET_COVERING") } } },
  { parameterId: "wet_covering_area_m2", titleRu: "Количество влажного покрытия по проектной ведомости", valueType: "decimal", unitId: "m2", required: false, constraints: { min: 0.001, requiredWhen: methodEquals("WET_COVERING"), forbiddenWhen: { kind: "not", operand: methodEquals("WET_COVERING") } } },
  { parameterId: "impervious_sheet_designation", titleRu: "Влагонепроницаемый листовой материал по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: methodEquals("IMPERVIOUS_SHEET"), forbiddenWhen: { kind: "not", operand: methodEquals("IMPERVIOUS_SHEET") } } },
  { parameterId: "impervious_sheet_area_m2", titleRu: "Количество влагонепроницаемого листового материала", valueType: "decimal", unitId: "m2", required: false, constraints: { min: 0.001, requiredWhen: methodEquals("IMPERVIOUS_SHEET"), forbiddenWhen: { kind: "not", operand: methodEquals("IMPERVIOUS_SHEET") } } },
  { parameterId: "curing_compound_product_designation", titleRu: "Мембранный состав для ухода по проектной спецификации", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: methodEquals("MEMBRANE_CURING_COMPOUND"), forbiddenWhen: { kind: "not", operand: methodEquals("MEMBRANE_CURING_COMPOUND") } } },
  { parameterId: "curing_compound_quantity_l", titleRu: "Количество мембранного состава по проектной ведомости", valueType: "decimal", unitId: "l", required: false, constraints: { min: 0.001, requiredWhen: methodEquals("MEMBRANE_CURING_COMPOUND"), forbiddenWhen: { kind: "not", operand: methodEquals("MEMBRANE_CURING_COMPOUND") } } },
  { parameterId: "application_equipment_required", titleRu: "Требуется отдельное оборудование для нанесения или подачи", valueType: "boolean", unitId: null, required: true, constraints: {} },
  { parameterId: "application_equipment_designation", titleRu: "Оборудование по утверждённой ведомости", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: equipmentEquals(true), forbiddenWhen: equipmentEquals(false) } },
  { parameterId: "application_equipment_machine_h", titleRu: "Машино-время оборудования для ухода", valueType: "decimal", unitId: "machine_hour", required: false, constraints: { min: 0.001, requiredWhen: equipmentEquals(true), forbiddenWhen: equipmentEquals(false) } },
  { parameterId: "quality_plan_reference", titleRu: "План контроля качества ухода за бетоном", valueType: "text", unitId: null, required: true, constraints: { minLength: 1, maxLength: 1_000 } },
  { parameterId: "quality_control_document_count", titleRu: "Комплект записей контроля ухода за бетоном", valueType: "decimal", unitId: "document", required: true, constraints: { min: 0.001 } },
  { parameterId: "equipment_mobilization_pricing_mode", titleRu: "Учёт доставки и возврата оборудования для ухода", valueType: "enum", unitId: null, required: false, constraints: { values: ["SEPARATE", "INCLUDED_IN_EQUIPMENT_RATE"], requiredWhen: equipmentEquals(true), forbiddenWhen: equipmentEquals(false) } },
  { parameterId: "equipment_mobilization_trip_count", titleRu: "Рейсы доставки и возврата оборудования для ухода", valueType: "decimal", unitId: "trip", required: false, constraints: { min: 0.001, requiredWhen: and(equipmentEquals(true), pricingModeEquals("SEPARATE")), forbiddenWhen: or(equipmentEquals(false), pricingModeEquals("INCLUDED_IN_EQUIPMENT_RATE")) } },
  { parameterId: "mobilization_scope_reference", titleRu: "Маршрут и граница мобилизации оборудования для ухода", valueType: "text", unitId: null, required: false, constraints: { minLength: 1, maxLength: 1_000, requiredWhen: and(equipmentEquals(true), pricingModeEquals("SEPARATE")), forbiddenWhen: or(equipmentEquals(false), pricingModeEquals("INCLUDED_IN_EQUIPMENT_RATE")) } },
]);

export const CONCRETE_SLAB_CURING_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "cured_concrete_volume_m3",
  "exposed_curing_surface_area_m2",
  "concrete_mix_reference",
  "curing_location",
  "approved_external_curing_method",
  "curing_method_statement_reference",
  "curing_duration_day",
] as const);

const NORMATIVE_PARAMETER_IDS = new Set<string>(
  CONCRETE_SLAB_CURING_NORMATIVE_PARAMETER_IDS,
);

export type ConcreteSlabCuringParameterR1 = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CONCRETE_SLAB_CURING_PARAMETERS:
readonly ConcreteSlabCuringParameterR1[] = Object.freeze(
  PARAMETER_SPECS.map((spec, ordinal) => ({
    parameter_id: spec.parameterId,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId,
    title_ru: spec.titleRu,
    required: spec.required,
    default_value: null,
    constraints_json: spec.constraints,
    truth_metadata: {
      contract: "rik-expo-app.concrete-slab-curing-r1",
      semantic_parameter_key: `concrete-slab-curing:${spec.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
        ? "ACI_APPLICABILITY_AND_APPROVED_PROJECT_METHOD"
        : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
      ...(spec.constraints.requiredWhen
        ? { required_when: spec.constraints.requiredWhen, visible_when: spec.constraints.requiredWhen }
        : {}),
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? "PRACTICE_REFERENCE"
          : "PROJECT_DEFINED",
        guide_short_ru: `${spec.titleRu}: укажите значение из утверждённой проектной спецификации, технологической карты, ведомости ресурсов или коммерческого предложения.`,
        source_role: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? "ACI_308_EXTERNAL_CURING_APPLICABILITY_AND_PROJECT_METHOD"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_CURING_SOURCE_ID
          : null,
        source_locator: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_CURING_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "concrete-slab-curing-r1",
        source_snapshot_hash: NORMATIVE_PARAMETER_IDS.has(spec.parameterId)
          ? CONCRETE_SLAB_CURING_SOURCE_PDF_SHA256
          : PROJECT_SCHEDULE_GUIDE_SHA256,
        applicability:
          "ACI SPEC-308.1-23 задаёт требования к различным способам внешнего ухода, но не делает их равноценными и не задаёт универсальные нормы расхода или производительности; метод и количества подтверждаются проектом.",
        verified_at: CONCRETE_SLAB_CURING_SOURCE_METADATA.verified_at,
        guide_validation_policy:
          "REJECT_MISSING_PROJECT_CURING_METHOD_METHOD_SPECIFIC_MATERIALS_OR_DIRECT_SCHEDULE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

export type ConcreteSlabCuringFormulaR1 = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

function formula(
  formulaId: string,
  outputUnitId: string,
  expressionSource: string,
): ConcreteSlabCuringFormulaR1 {
  const compiled = compileFormulaGraph(expressionSource);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expressionSource,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const CONCRETE_SLAB_CURING_FORMULAS:
readonly ConcreteSlabCuringFormulaR1[] = Object.freeze([
  formula("slab_curing_scope_volume_v1", "m3", "cured_concrete_volume_m3"),
  formula("slab_curing_labor_v1", "man_hour", "curing_worker_h"),
  formula("slab_curing_water_v1", "m3", "curing_water_m3"),
  formula("slab_curing_wet_covering_v1", "m2", "wet_covering_area_m2"),
  formula("slab_curing_impervious_sheet_v1", "m2", "impervious_sheet_area_m2"),
  formula("slab_curing_compound_v1", "l", "curing_compound_quantity_l"),
  formula("slab_curing_application_equipment_v1", "machine_hour", "application_equipment_machine_h"),
  formula("slab_curing_quality_documents_v1", "document", "quality_control_document_count"),
  formula("slab_curing_equipment_mobilization_v1", "trip", "equipment_mobilization_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const greaterThan = (parameterId: string, value: number): Json => ({
  kind: "greater_than",
  parameterId,
  value,
});

const ACI_TRACE = Object.freeze({
  sourceId: CONCRETE_SLAB_CURING_SOURCE_ID,
  source_id: CONCRETE_SLAB_CURING_SOURCE_ID,
  normId: CONCRETE_SLAB_CURING_NORM_ID,
  norm_id: CONCRETE_SLAB_CURING_NORM_ID,
  normVersion: CONCRETE_SLAB_CURING_SOURCE_METADATA.source_document_version,
  source_title: CONCRETE_SLAB_CURING_SOURCE_METADATA.source_title,
  source_url: CONCRETE_SLAB_CURING_SOURCE_METADATA.source_url,
  exact_locator: CONCRETE_SLAB_CURING_SOURCE_METADATA.exact_locator,
  source_definition_hash: CONCRETE_SLAB_CURING_SOURCE_METADATA.definition_hash,
  sourceRole: "METHOD_APPLICABILITY_NOT_UNIVERSAL_CONSUMPTION_OR_PRODUCTIVITY",
});

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  procurementEligible: boolean;
  sourceRole: string;
  inclusionAst?: Json;
  consumerParameterIds: readonly string[];
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `concrete-slab-curing:${input.rowId}`,
    costOwner: "resource",
    inputParameterIds: [...input.consumerParameterIds],
    normativeMethodGuidanceV1: {
      source_id: CONCRETE_SLAB_CURING_SOURCE_ID,
      norm_id: CONCRETE_SLAB_CURING_NORM_ID,
      operation_class: "EXTERNAL_CURING_OF_CAST_IN_PLACE_CONCRETE",
      scope_mode: "PROJECT_METHOD_AND_DIRECT_SCHEDULE_QUANTITIES",
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
    },
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    quantitySourceRole: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
    normativeTrace: [ACI_TRACE, {
      sourceId: "project_concrete_slab_curing_schedule",
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic curing duration multiplier",
      "automatic labor productivity",
      "automatic material consumption rate",
      "automatic equipment rental duration",
      "hidden mobilization trips",
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

export const CONCRETE_SLAB_CURING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "work:concrete:slab-curing", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Уход за поверхностью бетонной плиты по утверждённому способу", unitId: "man_hour", formulaId: "slab_curing_labor_v1", procurementEligible: false, sourceRole: "APPROVED_CURING_METHOD_LABOR_SCHEDULE", consumerParameterIds: ["cured_concrete_volume_m3", "exposed_curing_surface_area_m2", "concrete_mix_reference", "curing_location", "approved_external_curing_method", "curing_method_statement_reference", "curing_duration_day", "curing_worker_h"] }),
  resource({ rowId: "material:concrete:curing-water", ordinal: 1, section: "Материалы", category: "material", titleRu: "Вода для ухода за бетоном по проектной спецификации", unitId: "m3", formulaId: "slab_curing_water_v1", inclusionAst: methodIn(WATER_METHODS), procurementEligible: true, sourceRole: "APPROVED_PROJECT_WATER_TAKEOFF", consumerParameterIds: ["approved_external_curing_method", "curing_water_m3", "curing_water_source_reference"] }),
  resource({ rowId: "material:concrete:wet-curing-covering", ordinal: 2, section: "Материалы", category: "material", titleRu: "Влажное покрытие для ухода за бетоном по проектной спецификации", unitId: "m2", formulaId: "slab_curing_wet_covering_v1", inclusionAst: methodEquals("WET_COVERING"), procurementEligible: true, sourceRole: "APPROVED_PROJECT_WET_COVERING_TAKEOFF", consumerParameterIds: ["approved_external_curing_method", "wet_covering_material_designation", "wet_covering_area_m2"] }),
  resource({ rowId: "material:concrete:impervious-curing-sheet", ordinal: 3, section: "Материалы", category: "material", titleRu: "Влагонепроницаемый листовой материал для ухода за бетоном", unitId: "m2", formulaId: "slab_curing_impervious_sheet_v1", inclusionAst: methodEquals("IMPERVIOUS_SHEET"), procurementEligible: true, sourceRole: "APPROVED_PROJECT_IMPERVIOUS_SHEET_TAKEOFF", consumerParameterIds: ["approved_external_curing_method", "impervious_sheet_designation", "impervious_sheet_area_m2"] }),
  resource({ rowId: "material:concrete:membrane-curing-compound", ordinal: 4, section: "Материалы", category: "material", titleRu: "Мембранный состав для ухода за бетоном по проектной спецификации", unitId: "l", formulaId: "slab_curing_compound_v1", inclusionAst: methodEquals("MEMBRANE_CURING_COMPOUND"), procurementEligible: true, sourceRole: "APPROVED_PROJECT_CURING_COMPOUND_TAKEOFF", consumerParameterIds: ["approved_external_curing_method", "curing_compound_product_designation", "curing_compound_quantity_l"] }),
  resource({ rowId: "equipment:concrete:curing-application", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Оборудование для нанесения или подачи материалов ухода", unitId: "machine_hour", formulaId: "slab_curing_application_equipment_v1", inclusionAst: and(equipmentEquals(true), greaterThan("application_equipment_machine_h", 0)), procurementEligible: true, sourceRole: "APPROVED_PROJECT_EQUIPMENT_SCHEDULE", consumerParameterIds: ["application_equipment_required", "application_equipment_designation", "application_equipment_machine_h"] }),
  resource({ rowId: "service:concrete:slab-curing-quality-control", ordinal: 6, section: "Услуги", category: "service", titleRu: "Контроль и запись выполнения ухода за бетонной плитой", unitId: "document", formulaId: "slab_curing_quality_documents_v1", procurementEligible: true, sourceRole: "APPROVED_PROJECT_QUALITY_PLAN", consumerParameterIds: ["curing_duration_day", "quality_plan_reference", "quality_control_document_count"] }),
  resource({ rowId: "delivery:concrete:curing-equipment-mobilization", ordinal: 7, section: "Логистика", category: "delivery", titleRu: "Доставка и возврат оборудования для ухода за бетоном", unitId: "trip", formulaId: "slab_curing_equipment_mobilization_v1", inclusionAst: and(equipmentEquals(true), pricingModeEquals("SEPARATE"), greaterThan("equipment_mobilization_trip_count", 0)), procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_MOBILIZATION_QUOTE", consumerParameterIds: ["application_equipment_required", "equipment_mobilization_pricing_mode", "equipment_mobilization_trip_count", "mobilization_scope_reference"] }),
]);

const PROJECT_SCHEDULES: Readonly<Record<
ConcreteSlabCuringContextKey,
Readonly<Record<string, ConcreteSlabCuringInputValueR1>>
>> = Object.freeze({
  standard: { cured_concrete_volume_m3: 12, exposed_curing_surface_area_m2: 80, approved_external_curing_method: "WET_COVERING", curing_duration_day: 7, curing_worker_h: 20, curing_water_m3: 3.2, curing_water_source_reference: "WATER-CS-CURE-STANDARD-REV-A", wet_covering_material_designation: "COVER-CS-CURE-STANDARD-REV-A", wet_covering_area_m2: 92, application_equipment_required: true, application_equipment_designation: "EQ-CS-CURE-STANDARD-REV-A", application_equipment_machine_h: 4, quality_control_document_count: 2, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-CS-CURE-STANDARD-RETURN-INCLUDED" },
  high_load: { cured_concrete_volume_m3: 26, exposed_curing_surface_area_m2: 150, approved_external_curing_method: "WATER_CURING", curing_duration_day: 10, curing_worker_h: 34, curing_water_m3: 8.5, curing_water_source_reference: "WATER-CS-CURE-HIGH-LOAD-REV-A", application_equipment_required: true, application_equipment_designation: "EQ-CS-CURE-HIGH-LOAD-REV-A", application_equipment_machine_h: 8, quality_control_document_count: 3, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-CS-CURE-HIGH-LOAD-RETURN-INCLUDED" },
  large_area: { cured_concrete_volume_m3: 54, exposed_curing_surface_area_m2: 330, approved_external_curing_method: "MEMBRANE_CURING_COMPOUND", curing_duration_day: 7, curing_worker_h: 46, curing_compound_product_designation: "COMPOUND-CS-CURE-LARGE-AREA-REV-A", curing_compound_quantity_l: 82.5, application_equipment_required: true, application_equipment_designation: "SPRAYER-CS-CURE-LARGE-AREA-REV-A", application_equipment_machine_h: 12, quality_control_document_count: 3, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-CS-CURE-LARGE-AREA-RETURN-INCLUDED" },
  small_area: { cured_concrete_volume_m3: 3, exposed_curing_surface_area_m2: 18, approved_external_curing_method: "IMPERVIOUS_SHEET", curing_duration_day: 7, curing_worker_h: 7, impervious_sheet_designation: "SHEET-CS-CURE-SMALL-AREA-REV-A", impervious_sheet_area_m2: 22, application_equipment_required: false, quality_control_document_count: 1 },
  technical_room: { cured_concrete_volume_m3: 8, exposed_curing_surface_area_m2: 48, approved_external_curing_method: "MEMBRANE_CURING_COMPOUND", curing_duration_day: 7, curing_worker_h: 13, curing_compound_product_designation: "COMPOUND-CS-CURE-TECHNICAL-ROOM-REV-A", curing_compound_quantity_l: 12, application_equipment_required: true, application_equipment_designation: "SPRAYER-CS-CURE-TECHNICAL-ROOM-REV-A", application_equipment_machine_h: 3, quality_control_document_count: 2, equipment_mobilization_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE" },
  wet_zone: { cured_concrete_volume_m3: 15, exposed_curing_surface_area_m2: 95, approved_external_curing_method: "WET_COVERING", curing_duration_day: 10, curing_worker_h: 27, curing_water_m3: 5.5, curing_water_source_reference: "WATER-CS-CURE-WET-ZONE-REV-A", wet_covering_material_designation: "COVER-CS-CURE-WET-ZONE-REV-A", wet_covering_area_m2: 110, application_equipment_required: true, application_equipment_designation: "EQ-CS-CURE-WET-ZONE-REV-A", application_equipment_machine_h: 6, quality_control_document_count: 3, equipment_mobilization_pricing_mode: "SEPARATE", equipment_mobilization_trip_count: 2, mobilization_scope_reference: "LOG-CS-CURE-WET-ZONE-RETURN-INCLUDED" },
});

export function concreteSlabCuringAcceptanceInputR1(
  contextKey: ConcreteSlabCuringContextKey,
): Readonly<Record<string, ConcreteSlabCuringInputValueR1>> {
  const target = CONCRETE_SLAB_CURING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`CONCRETE_SLAB_CURING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    concrete_mix_reference: `CS-CURE-${reference}-MIX-REV-A`,
    curing_location: `Бетонная плита; ${target.contextRu}; захватка CS-CURE-${reference}`,
    curing_method_statement_reference: `MS-CS-CURE-${reference}-REV-A`,
    quality_plan_reference: `QP-CS-CURE-${reference}-REV-A`,
    ...PROJECT_SCHEDULES[contextKey],
  });
}

export async function compileConcreteSlabCuringR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CONCRETE_SLAB_CURING_TARGETS[0].catalogId;
  if (!CONCRETE_SLAB_CURING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`CONCRETE_SLAB_CURING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.concrete-slab-curing-r1",
    catalogId,
    primaryMeasureParameterId: "cured_concrete_volume_m3",
    parameterDefinitions: [...CONCRETE_SLAB_CURING_PARAMETERS],
    formulaDefinitions: [...CONCRETE_SLAB_CURING_FORMULAS],
    resourceDefinitions: [...CONCRETE_SLAB_CURING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
