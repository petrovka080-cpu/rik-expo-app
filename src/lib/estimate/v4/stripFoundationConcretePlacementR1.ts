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
  NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "./domainFactory";
import type { ProfessionalParameterValueV4 } from "./professionalProjectAssemblyV4";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_standard", titleRu: "Бетонирование ленточного фундамента в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_high_load", titleRu: "Бетонирование ленточного фундамента в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_large_area", titleRu: "Бетонирование ленточного фундамента на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_repair", titleRu: "Бетонирование ремонтного участка ленточного фундамента", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_small_area", titleRu: "Бетонирование ленточного фундамента на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_technical_room", titleRu: "Бетонирование ленточного фундамента технического помещения", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_wet_zone", titleRu: "Бетонирование ленточного фундамента во влажной зоне", contextRu: "влажная зона" },
] as const);

export type StripFoundationConcretePlacementContextKey =
  (typeof STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

const PARAMETER_SPECS = Object.freeze([
  ["product_profile_id", "Правило заказа товарного бетона", "enum", null, [NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID]],
  ["plan_dimension_concrete_volume_m3", "Проектный объём бетона по геометрии", "decimal", "m3", null],
  ["plan_volume_calculation_reference", "Расчёт проектного объёма", "text", null, null],
  ["mix_design_or_project_specification_reference", "Спецификация бетонной смеси", "text", null, null],
  ["mixture_designation", "Обозначение бетонной смеси", "text", null, null],
  ["placement_location", "Участок укладки бетона", "text", null, null],
  ["placement_method", "Способ подачи бетона", "enum", null, ["pump", "crane_bucket", "direct_chute"]],
  ["selected_contingency_percent", "Обоснованный резерв заказа бетона", "decimal", "percent", null],
  ["contingency_selection_justification", "Обоснование резерва бетона", "text", null, null],
  ["delivery_schedule_and_truck_capacity", "График поставки и вместимость миксеров", "text", null, null],
  ["producer_order_confirmation", "Подтверждение заказа производителем", "text", null, null],
  ["estimator_approval_reference", "Согласование расчёта сметчиком", "text", null, null],
  ["concrete_class", "Класс бетона", "text", null, null],
  ["watertightness", "Марка бетона по водонепроницаемости", "text", null, null],
  ["frost_resistance", "Марка бетона по морозостойкости", "text", null, null],
  ["mobility", "Подвижность бетонной смеси", "text", null, null],
  ["curing_method", "Способ ухода за бетоном", "enum", null, ["membrane", "water"]],
  ["curing_membrane_specification", "Плёнка для ухода за бетоном", "text", null, null],
  ["curing_membrane_area_m2", "Количество плёнки для ухода", "decimal", "m2", null],
  ["placement_worker_h", "Трудозатраты на укладку и уплотнение", "decimal", "man_hour", null],
  ["finishing_worker_h", "Трудозатраты на отделку поверхности", "decimal", "man_hour", null],
  ["curing_worker_h", "Трудозатраты на уход за бетоном", "decimal", "man_hour", null],
  ["pump_machine_h", "Работа автобетононасоса", "decimal", "machine_hour", null],
  ["crane_bucket_machine_h", "Работа крана с бадьёй", "decimal", "machine_hour", null],
  ["deep_vibrator_machine_h", "Работа глубинного вибратора", "decimal", "machine_hour", null],
  ["winter_mode", "Зимнее бетонирование", "boolean", null, null],
  ["winter_heating_cable_m", "Прогревочный кабель", "decimal", "m", null],
  ["winter_heating_worker_h", "Трудозатраты на электропрогрев", "decimal", "man_hour", null],
  ["heating_transformer_machine_h", "Работа трансформатора прогрева", "decimal", "machine_hour", null],
  ["quality_control_document_count", "Комплект приёмочного контроля и журнала бетонирования", "decimal", "document", null],
  ["delivery_pricing_mode", "Учёт доставки бетонной смеси", "enum", null, ["SEPARATE", "INCLUDED_IN_SUPPLY"]],
  ["concrete_delivery_distance_km", "Расстояние доставки бетонной смеси", "decimal", "km", null],
] as const);

const TEXT_PARAMETER_IDS = new Set(PARAMETER_SPECS
  .filter(([, , valueType]) => valueType === "text")
  .map(([parameterId]) => parameterId));

export const STRIP_FOUNDATION_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "plan_dimension_concrete_volume_m3",
  "plan_volume_calculation_reference",
  "mix_design_or_project_specification_reference",
  "mixture_designation",
  "placement_location",
  "placement_method",
  "selected_contingency_percent",
  "contingency_selection_justification",
  "delivery_schedule_and_truck_capacity",
  "producer_order_confirmation",
  "estimator_approval_reference",
] as const);

const NORMATIVE_PARAMETER_IDS = new Set<string>(
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS,
);
const PROJECT_SCHEDULE_GUIDE_SHA256 =
  "e2f9581f930330995b67a4fe08cf264756fd3b5b606085062229fd12baf9e437";
const NRMCA_CIP31_GUIDE_SHA256 =
  "096bab3bb56d15d109fe9b00c8ec7bea9e09a0451ea198fb73738f0c72a23f14";

export type StripFoundationConcretePlacementParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS:
readonly StripFoundationConcretePlacementParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
        ? { min: parameterId === "selected_contingency_percent" ? 4 : 0,
          ...(parameterId === "selected_contingency_percent" ? { max: 10 } : {}) }
        : valueType === "text"
          ? { minLength: 1, maxLength: 1_000 }
          : {},
    truth_metadata: {
      contract: "rik-expo-app.strip-foundation-concrete-placement-r1",
      semantic_parameter_key: `strip-foundation-concrete-placement:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: NORMATIVE_PARAMETER_IDS.has(parameterId)
        || parameterId === "product_profile_id"
        ? "SELECTED_NORMATIVE_GUIDANCE_AND_PROJECT_CONFIRMATION"
        : TEXT_PARAMETER_IDS.has(parameterId)
          ? "PROJECT_DOCUMENTATION"
          : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: NORMATIVE_PARAMETER_IDS.has(parameterId)
          || parameterId === "product_profile_id"
          ? "MANDATORY_NORM_VALUE"
          : "PROJECT_DEFINED",
        guide_short_ru: `${titleRu}: укажите подтверждённое проектом или производственной ведомостью значение.`,
        source_role: NORMATIVE_PARAMETER_IDS.has(parameterId)
          || parameterId === "product_profile_id"
          ? "NRMCA_CIP31_AND_PROJECT_CONFIRMATION"
          : "APPROVED_PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
        source_document: NORMATIVE_PARAMETER_IDS.has(parameterId)
          || parameterId === "product_profile_id"
          ? NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID
          : null,
        source_locator: NORMATIVE_PARAMETER_IDS.has(parameterId)
          || parameterId === "product_profile_id"
          ? NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.exact_locator
          : null,
        guide_version: "strip-foundation-concrete-placement-r1",
        source_snapshot_hash: NORMATIVE_PARAMETER_IDS.has(parameterId)
          || parameterId === "product_profile_id"
          ? NRMCA_CIP31_GUIDE_SHA256
          : PROJECT_SCHEDULE_GUIDE_SHA256,
        applicability: NORMATIVE_PARAMETER_IDS.has(parameterId)
          || parameterId === "product_profile_id"
          ? "Только заказ товарного бетона по NRMCA CIP 31 при подтверждённом проектном объёме и явно выбранном резерве 4–10%."
          : "Значение относится к конкретной захватке ленточного фундамента и не выводится из универсальной нормы.",
        verified_at: "2026-09-16T00:00:00+06:00",
        guide_validation_policy: "REJECT_MISSING_PROJECT_SCHEDULE_OR_OUTSIDE_NRMCA_CIP31_APPLICABILITY",
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

export type StripFoundationConcretePlacementFormula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

export const STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS:
readonly StripFoundationConcretePlacementFormula[] = Object.freeze([
  formula("concrete_order_quantity_v1", "m3", "plan_dimension_concrete_volume_m3 * (1 + selected_contingency_percent / 100)"),
  formula("curing_membrane_quantity_v1", "m2", "curing_membrane_area_m2"),
  formula("placement_labor_v1", "man_hour", "placement_worker_h"),
  formula("finishing_labor_v1", "man_hour", "finishing_worker_h"),
  formula("curing_labor_v1", "man_hour", "curing_worker_h"),
  formula("pump_machine_time_v1", "machine_hour", "pump_machine_h"),
  formula("crane_bucket_machine_time_v1", "machine_hour", "crane_bucket_machine_h"),
  formula("deep_vibrator_machine_time_v1", "machine_hour", "deep_vibrator_machine_h"),
  formula("winter_heating_cable_v1", "m", "winter_heating_cable_m"),
  formula("winter_heating_labor_v1", "man_hour", "winter_heating_worker_h"),
  formula("heating_transformer_time_v1", "machine_hour", "heating_transformer_machine_h"),
  formula("quality_control_documents_v1", "document", "quality_control_document_count"),
  formula("concrete_delivery_v1", "m3_km", "plan_dimension_concrete_volume_m3 * (1 + selected_contingency_percent / 100) * concrete_delivery_distance_km"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
const greaterThan = (parameterId: string, value: number) => ({ kind: "greater_than", parameterId, value });
const and = (...operands: Json[]) => ({ kind: "and", operands });

const NRMCA_BINDING = Object.freeze({
  technology_class: "REINFORCED_CONCRETE_STRIP_FOUNDATION",
  operation_class: "ORDER_READY_MIX",
  material_system: "READY_MIX_CONCRETE",
  scope_mode: "FULL_APPLICABLE_SCOPE",
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  activation: { parameter_id: "product_profile_id", equals: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID },
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
      sourceId: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
      source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
      normId: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
      norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
      normVersion: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_document_version,
      source_title: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_title,
      source_url: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_url,
      exact_locator: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.exact_locator,
      source_definition_hash: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.definition_hash,
    }]
    : [{
      sourceId: "project_concrete_placement_schedule",
      sourceRole: input.sourceRole ?? "APPROVED_PROJECT_SCHEDULE",
    }];
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `strip-foundation-concrete-placement:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    ...(input.professionalPhysicalNorm ? { professionalPhysicalNormBindingV1: NRMCA_BINDING } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.professionalPhysicalNorm
      ? "PRIMARY_PUBLIC_ORDER_QUANTITY_GUIDANCE_AND_PROJECT_DOCUMENTATION"
      : input.sourceRole ?? "APPROVED_PROJECT_SCHEDULE",
    normativeTrace,
    excludedUnownedAssumptions: [
      "generic concrete volume allowance",
      "automatic equipment productivity",
      "automatic labor productivity",
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

export const STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "material:concrete:ready-mix", ordinal: 0, section: "Материалы", category: "material", titleRu: "Товарный бетон", unitId: "m3", formulaId: "concrete_order_quantity_v1", procurementEligible: true, professionalPhysicalNorm: true, titleParameterIds: ["concrete_class", "watertightness", "frost_resistance", "mobility"] }),
  resource({ rowId: "material:concrete:curing-membrane", ordinal: 1, section: "Материалы", category: "material", titleRu: "Плёнка для ухода за свежеуложенным бетоном", unitId: "m2", formulaId: "curing_membrane_quantity_v1", inclusionAst: equals("curing_method", "membrane"), procurementEligible: true, titleParameterIds: ["curing_membrane_specification"] }),
  resource({ rowId: "material:concrete:winter-heating-cable", ordinal: 2, section: "Материалы", category: "material", titleRu: "Прогревочный кабель для зимнего бетонирования", unitId: "m", formulaId: "winter_heating_cable_v1", inclusionAst: equals("winter_mode", true), procurementEligible: true }),
  resource({ rowId: "work:concrete:place-and-compact", ordinal: 3, section: "Работы", category: "construction_work", titleRu: "Укладка и уплотнение бетонной смеси", unitId: "man_hour", formulaId: "placement_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:concrete:finish-surface", ordinal: 4, section: "Работы", category: "construction_work", titleRu: "Отделка верхней поверхности бетона", unitId: "man_hour", formulaId: "finishing_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:concrete:cure", ordinal: 5, section: "Работы", category: "construction_work", titleRu: "Уход за бетоном выбранным способом", unitId: "man_hour", formulaId: "curing_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:concrete:winter-heating", ordinal: 6, section: "Работы", category: "construction_work", titleRu: "Монтаж и контроль системы электропрогрева бетона", unitId: "man_hour", formulaId: "winter_heating_labor_v1", inclusionAst: equals("winter_mode", true), procurementEligible: false }),
  resource({ rowId: "equipment:concrete:pump", ordinal: 7, section: "Оборудование", category: "equipment", titleRu: "Автобетононасос по производственной ведомости", unitId: "machine_hour", formulaId: "pump_machine_time_v1", inclusionAst: equals("placement_method", "pump"), procurementEligible: true }),
  resource({ rowId: "equipment:concrete:crane-bucket", ordinal: 8, section: "Оборудование", category: "equipment", titleRu: "Автомобильный кран с бадьёй по производственной ведомости", unitId: "machine_hour", formulaId: "crane_bucket_machine_time_v1", inclusionAst: equals("placement_method", "crane_bucket"), procurementEligible: true }),
  resource({ rowId: "equipment:concrete:deep-vibrator", ordinal: 9, section: "Оборудование", category: "equipment", titleRu: "Глубинный вибратор для уплотнения бетонной смеси", unitId: "machine_hour", formulaId: "deep_vibrator_machine_time_v1", procurementEligible: true }),
  resource({ rowId: "equipment:concrete:heating-transformer", ordinal: 10, section: "Оборудование", category: "equipment", titleRu: "Трансформатор для электропрогрева бетона", unitId: "machine_hour", formulaId: "heating_transformer_time_v1", inclusionAst: equals("winter_mode", true), procurementEligible: true }),
  resource({ rowId: "service:concrete:acceptance-control", ordinal: 11, section: "Услуги", category: "service", titleRu: "Приёмочный контроль бетонной смеси и ведение журнала бетонирования", unitId: "document", formulaId: "quality_control_documents_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "delivery:concrete:ready-mix", ordinal: 12, section: "Доставка", category: "delivery", titleRu: "Доставка товарного бетона автобетоносмесителями", unitId: "m3_km", formulaId: "concrete_delivery_v1", inclusionAst: and(equals("delivery_pricing_mode", "SEPARATE"), greaterThan("concrete_delivery_distance_km", 0)), procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_DELIVERY_SCHEDULE" }),
]);

const BASE_INPUT: Readonly<Record<string, InputValue>> = Object.freeze({
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  concrete_class: "B25",
  watertightness: "W6",
  frost_resistance: "F150",
  mobility: "P4",
  placement_method: "pump",
  selected_contingency_percent: 6,
  curing_method: "membrane",
  curing_membrane_specification: "Плёнка полиэтиленовая для ухода за бетоном по проектной ведомости",
  winter_mode: false,
  winter_heating_cable_m: 0,
  winter_heating_worker_h: 0,
  heating_transformer_machine_h: 0,
  crane_bucket_machine_h: 0,
  quality_control_document_count: 1,
  delivery_pricing_mode: "SEPARATE",
});

const PROJECT_SCHEDULES: Readonly<Record<StripFoundationConcretePlacementContextKey, Readonly<Record<string, InputValue>>>> = Object.freeze({
  standard: { plan_dimension_concrete_volume_m3: 30, curing_membrane_area_m2: 44, placement_worker_h: 54, finishing_worker_h: 12, curing_worker_h: 10, pump_machine_h: 4, deep_vibrator_machine_h: 8, concrete_delivery_distance_km: 24 },
  high_load: { plan_dimension_concrete_volume_m3: 72, curing_membrane_area_m2: 0, placement_worker_h: 142, finishing_worker_h: 28, curing_worker_h: 24, pump_machine_h: 10, deep_vibrator_machine_h: 22, concrete_delivery_distance_km: 32, selected_contingency_percent: 10, curing_method: "water", winter_mode: true, winter_heating_cable_m: 540, winter_heating_worker_h: 46, heating_transformer_machine_h: 36 },
  large_area: { plan_dimension_concrete_volume_m3: 240, curing_membrane_area_m2: 286, placement_worker_h: 410, finishing_worker_h: 82, curing_worker_h: 70, pump_machine_h: 28, deep_vibrator_machine_h: 64, concrete_delivery_distance_km: 45, selected_contingency_percent: 8, quality_control_document_count: 3 },
  repair: { plan_dimension_concrete_volume_m3: 12, curing_membrane_area_m2: 0, placement_worker_h: 30, finishing_worker_h: 8, curing_worker_h: 6, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 4, concrete_delivery_distance_km: 14, curing_method: "water", selected_contingency_percent: 4 },
  small_area: { plan_dimension_concrete_volume_m3: 6, curing_membrane_area_m2: 11, placement_worker_h: 18, finishing_worker_h: 5, curing_worker_h: 4, placement_method: "direct_chute", pump_machine_h: 0, deep_vibrator_machine_h: 2, concrete_delivery_distance_km: 10, selected_contingency_percent: 4 },
  technical_room: { plan_dimension_concrete_volume_m3: 24, curing_membrane_area_m2: 0, placement_worker_h: 50, finishing_worker_h: 12, curing_worker_h: 9, pump_machine_h: 4, deep_vibrator_machine_h: 7, concrete_delivery_distance_km: 20, curing_method: "water", selected_contingency_percent: 5 },
  wet_zone: { plan_dimension_concrete_volume_m3: 45, curing_membrane_area_m2: 68, placement_worker_h: 90, finishing_worker_h: 22, curing_worker_h: 18, pump_machine_h: 7, deep_vibrator_machine_h: 14, concrete_delivery_distance_km: 28, selected_contingency_percent: 7, watertightness: "W8", quality_control_document_count: 2 },
});

export function stripFoundationConcretePlacementAcceptanceInputR1(
  contextKey: StripFoundationConcretePlacementContextKey,
): Readonly<Record<string, InputValue>> {
  const target = STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`STRIP_FOUNDATION_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    plan_volume_calculation_reference: `SF-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `SF-POUR-${reference}-MIX-B25-REV-A`,
    mixture_designation: `B25 ${contextKey === "wet_zone" ? "W8" : "W6"} F150 P4`,
    placement_location: `Ленточный фундамент; ${target.contextRu}; захватка SF-POUR-${reference}`,
    contingency_selection_justification: `Резерв подтверждён сметчиком для захватки SF-POUR-${reference}`,
    delivery_schedule_and_truck_capacity: `График SF-POUR-${reference}; автобетоносмесители 8 м³`,
    producer_order_confirmation: `RMC-SF-POUR-${reference}-CONFIRMED`,
    estimator_approval_reference: `EST-SF-POUR-${reference}-REV-A`,
  });
}

function explicitParameters(values: Readonly<Record<string, InputValue>>) {
  return Object.fromEntries(Object.entries(values).map(([parameterId, value]) => [
    parameterId,
    {
      value,
      unit_id: STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS.find(
        (parameter) => parameter.parameter_id === parameterId,
      )?.unit_id ?? null,
      source_type: "USER_EXPLICIT",
      source_id: `strip-foundation-concrete-placement:${parameterId}`,
      captured_at: "2026-09-16T00:00:00.000Z",
      confidence: "high",
      applicability: "Approved project concrete placement schedule.",
    } satisfies ProfessionalParameterValueV4,
  ]));
}

export async function compileStripFoundationConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS[0].catalogId;
  if (!STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`STRIP_FOUNDATION_CONCRETE_PLACEMENT_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const values = submittedParameters as Readonly<Record<string, InputValue>>;
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "REINFORCED_CONCRETE_STRIP_FOUNDATION",
    operation_class: "ORDER_READY_MIX",
    material_system: "READY_MIX_CONCRETE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitParameters(values),
  });
  if (resolution.status !== "APPLIED") {
    throw Object.assign(new Error(
      `STRIP_FOUNDATION_CONCRETE_NRMCA_${resolution.status}:${resolution.blockers.join("|")}`,
    ), { code: "PARAMETER_VALIDATION_FAILED" });
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.strip-foundation-concrete-placement-r1",
    catalogId,
    primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
    parameterDefinitions: [...STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS],
    formulaDefinitions: [...STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS],
    resourceDefinitions: [...STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA = Object.freeze({
  sourceId: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  normId: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  productProfileId: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  sourceVersion: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_document_version,
  sourceDefinitionHash: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.definition_hash,
  formula: "plan_dimension_concrete_volume_m3 * (1 + selected_contingency_percent / 100)",
  previousGenericReadyMixFactorRejected: true,
  automaticEquipmentProductivityRejected: true,
  automaticLaborProductivityRejected: true,
});
