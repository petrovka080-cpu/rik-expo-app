import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  CONCRETE_SLAB_REPAIR_FORMULAS,
  CONCRETE_SLAB_REPAIR_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_REPAIR_NORM_ID,
  CONCRETE_SLAB_REPAIR_PARAMETERS,
  CONCRETE_SLAB_REPAIR_RESOURCES,
  CONCRETE_SLAB_REPAIR_SOURCE_ID,
  CONCRETE_SLAB_REPAIR_SOURCE_METADATA,
  concreteSlabRepairAcceptanceInputR1,
  type ConcreteSlabRepairContextKey,
  type ConcreteSlabRepairFormulaR1,
  type ConcreteSlabRepairInputValueR1,
  type ConcreteSlabRepairParameterR1,
} from "./concreteSlabRepairR1";

type Json = Record<string, unknown>;
type InputValue = string | number | boolean;

export const ANCHOR_GROUP_REPAIR_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_repair_standard", titleRu: "Ремонт анкерной группы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_repair_high_load", titleRu: "Ремонт анкерной группы в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_repair_large_area", titleRu: "Ремонт анкерных групп на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_repair_repair", titleRu: "Ремонт анкерной группы на локальном ремонтном участке", contextRu: "локальный ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_repair_small_area", titleRu: "Ремонт анкерной группы на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_repair_technical_room", titleRu: "Ремонт анкерной группы в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_repair_wet_zone", titleRu: "Ремонт анкерной группы во влажной зоне", contextRu: "влажная зона" },
] as const);

export type AnchorGroupRepairContextKey =
  (typeof ANCHOR_GROUP_REPAIR_TARGETS)[number]["contextKey"];

export const ANCHOR_GROUP_REPAIR_SCOPE_MODES = Object.freeze([
  "CONCRETE_SUBSTRATE_ONLY",
  "ANCHOR_HARDWARE_ONLY",
  "COMBINED_CONCRETE_AND_ANCHOR_HARDWARE",
] as const);

const scopeIn = (values: readonly string[]): Json => ({
  kind: "in",
  parameterId: "anchor_group_repair_scope_mode",
  values: [...values],
});
const equals = (parameterId: string, value: string | boolean): Json => ({
  kind: "equals", parameterId, value,
});
const greaterThan = (parameterId: string, value: number): Json => ({
  kind: "greater_than", parameterId, value,
});
const and = (...operands: Json[]): Json => ({ kind: "and", operands });
const or = (...operands: Json[]): Json => ({ kind: "or", operands });
const not = (operand: Json): Json => ({ kind: "not", operand });
const literalTrue = Object.freeze({ kind: "literal", value: true });

const CONCRETE_SCOPE = scopeIn([
  "CONCRETE_SUBSTRATE_ONLY",
  "COMBINED_CONCRETE_AND_ANCHOR_HARDWARE",
]);
const HARDWARE_SCOPE = scopeIn([
  "ANCHOR_HARDWARE_ONLY",
  "COMBINED_CONCRETE_AND_ANCHOR_HARDWARE",
]);
const NOT_CONCRETE_SCOPE = not(CONCRETE_SCOPE);
const NOT_HARDWARE_SCOPE = not(HARDWARE_SCOPE);

const OPTIONAL_CONCRETE_DOCUMENTS = new Set<string>([
  "condition_assessment_reference",
  "approved_repair_design_reference",
  "approved_repair_method_designation",
  "repair_method_statement_reference",
  "repair_material_designation",
  "bonding_agent_designation",
  "reinforcement_treatment_designation",
  "curing_material_designation",
  "removal_equipment_designation",
  "mixing_equipment_designation",
  "dust_control_equipment_designation",
  "quality_plan_reference",
  "waste_route_reference",
]);

function anchorGroupText(value: string): string {
  return value
    .replaceAll("бетонной плиты", "бетонного основания анкерной группы")
    .replaceAll("бетона плиты", "бетона основания анкерной группы")
    .replaceAll("плиты", "основания анкерной группы")
    .replaceAll("concrete-slab-repair", "anchor-group-concrete-repair")
    .replaceAll("project_concrete_slab_repair_schedule", "project_anchor_group_repair_schedule")
    .replaceAll("slab-repair", "anchor-group-concrete-repair");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return anchorGroupText(value) as T;
  if (Array.isArray(value)) return value.map((item) => adaptJson(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).map(
      ([key, item]) => [key, adaptJson(item)],
    )) as T;
  }
  return value;
}

function concreteCondition(
  parameter: ConcreteSlabRepairParameterR1,
  documentary: boolean,
): Readonly<{ requiredWhen?: Json; forbiddenWhen: Json }> {
  const constraints = parameter.constraints_json ?? {};
  const existingRequired = constraints.requiredWhen as Json | undefined;
  const existingForbidden = constraints.forbiddenWhen as Json | undefined;
  const requiredWhen = documentary
    ? undefined
    : existingRequired
      ? and(CONCRETE_SCOPE, existingRequired)
      : CONCRETE_SCOPE;
  return {
    ...(requiredWhen ? { requiredWhen } : {}),
    forbiddenWhen: existingForbidden
      ? or(NOT_CONCRETE_SCOPE, existingForbidden)
      : NOT_CONCRETE_SCOPE,
  };
}

function adaptConcreteParameter(
  parameter: ConcreteSlabRepairParameterR1,
  ordinal: number,
): ConcreteSlabRepairParameterR1 {
  const primaryMeasure = parameter.parameter_id === "repair_scope_volume_m3";
  const documentary = OPTIONAL_CONCRETE_DOCUMENTS.has(parameter.parameter_id);
  const constraints = adaptJson(parameter.constraints_json ?? {});
  const {
    requiredWhen: _requiredWhen,
    forbiddenWhen: _forbiddenWhen,
    ...baseConstraints
  } = constraints;
  const condition = concreteCondition(parameter, documentary);
  const truth = adaptJson(parameter.truth_metadata);
  const {
    required_when: _truthRequiredWhen,
    visible_when: _truthVisibleWhen,
    ...baseTruth
  } = truth;
  return {
    ...parameter,
    ordinal,
    title_ru: anchorGroupText(parameter.title_ru),
    required: primaryMeasure,
    constraints_json: primaryMeasure
      ? baseConstraints
      : { ...baseConstraints, ...condition },
    truth_metadata: {
      ...baseTruth,
      ...(!primaryMeasure && condition.requiredWhen
        ? { required_when: condition.requiredWhen }
        : {}),
      visible_when: primaryMeasure ? literalTrue : CONCRETE_SCOPE,
      preliminary_compilation_allowed: documentary,
      source_confirmation_required: !documentary,
    },
  };
}

type HardwareParameterSpec = Readonly<{
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "text" | "enum" | "boolean";
  unitId: string | null;
  requiredWhen?: Json;
  forbiddenWhen?: Json;
  constraints?: Json;
  documentary?: boolean;
}>;

const conditionalRequired = (flag: string): Readonly<{ requiredWhen: Json; forbiddenWhen: Json }> => ({
  requiredWhen: and(HARDWARE_SCOPE, equals(flag, true)),
  forbiddenWhen: or(NOT_HARDWARE_SCOPE, equals(flag, false)),
});
const hardwareRequired = Object.freeze({ requiredWhen: HARDWARE_SCOPE, forbiddenWhen: NOT_HARDWARE_SCOPE });

const HARDWARE_PARAMETER_SPECS: readonly HardwareParameterSpec[] = Object.freeze([
  { parameterId: "anchor_repair_design_reference", titleRu: "Проект ремонта анкерных компонентов", valueType: "text", unitId: null, forbiddenWhen: NOT_HARDWARE_SCOPE, constraints: { minLength: 1, maxLength: 1_000 }, documentary: true },
  { parameterId: "anchor_hardware_repair_worker_h", titleRu: "Трудозатраты на ремонт анкерных компонентов", valueType: "decimal", unitId: "man_hour", ...hardwareRequired, constraints: { min: 0.001 } },
  { parameterId: "anchor_rod_replacement_required", titleRu: "Требуется замена анкерных стержней или анкеров", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "replacement_anchor_designation", titleRu: "Марка заменяемых анкеров по проекту", valueType: "text", unitId: null, ...conditionalRequired("anchor_rod_replacement_required"), constraints: { minLength: 1, maxLength: 1_000 }, documentary: true },
  { parameterId: "replacement_anchor_quantity_piece", titleRu: "Количество заменяемых анкеров", valueType: "decimal", unitId: "piece", ...conditionalRequired("anchor_rod_replacement_required"), constraints: { min: 0.001 } },
  { parameterId: "nut_washer_replacement_required", titleRu: "Требуется замена гаек или шайб", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "replacement_nut_quantity_piece", titleRu: "Количество новых гаек", valueType: "decimal", unitId: "piece", ...conditionalRequired("nut_washer_replacement_required"), constraints: { min: 0.001 } },
  { parameterId: "replacement_washer_quantity_piece", titleRu: "Количество новых шайб", valueType: "decimal", unitId: "piece", ...conditionalRequired("nut_washer_replacement_required"), constraints: { min: 0.001 } },
  { parameterId: "post_installed_anchor_required", titleRu: "Применяются post-installed анкеры по проекту", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "post_installed_anchor_quantity_piece", titleRu: "Количество post-installed анкеров", valueType: "decimal", unitId: "piece", ...conditionalRequired("post_installed_anchor_required"), constraints: { min: 0.001 } },
  { parameterId: "drilling_equipment_machine_h", titleRu: "Машино-время бурового оборудования", valueType: "decimal", unitId: "machine_hour", ...conditionalRequired("post_installed_anchor_required"), constraints: { min: 0.001 } },
  { parameterId: "base_plate_grout_repair_required", titleRu: "Требуется ремонт подливки опорной плиты", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "base_plate_grout_designation", titleRu: "Ремонтный состав подливки по проекту", valueType: "text", unitId: null, ...conditionalRequired("base_plate_grout_repair_required"), constraints: { minLength: 1, maxLength: 1_000 }, documentary: true },
  { parameterId: "base_plate_grout_quantity_kg", titleRu: "Количество состава для ремонта подливки", valueType: "decimal", unitId: "kg", ...conditionalRequired("base_plate_grout_repair_required"), constraints: { min: 0.001 } },
  { parameterId: "corrosion_protection_required", titleRu: "Требуется защитная обработка анкерных компонентов", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "corrosion_protection_designation", titleRu: "Защитная система по проекту", valueType: "text", unitId: null, ...conditionalRequired("corrosion_protection_required"), constraints: { minLength: 1, maxLength: 1_000 }, documentary: true },
  { parameterId: "corrosion_protection_quantity_kg", titleRu: "Количество защитного материала", valueType: "decimal", unitId: "kg", ...conditionalRequired("corrosion_protection_required"), constraints: { min: 0.001 } },
  { parameterId: "welding_repair_required", titleRu: "Предусмотрены сварочные работы проектом ремонта", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "welding_consumable_quantity_kg", titleRu: "Количество сварочных расходных материалов", valueType: "decimal", unitId: "kg", ...conditionalRequired("welding_repair_required"), constraints: { min: 0.001 } },
  { parameterId: "welding_equipment_machine_h", titleRu: "Машино-время сварочного оборудования", valueType: "decimal", unitId: "machine_hour", ...conditionalRequired("welding_repair_required"), constraints: { min: 0.001 } },
  { parameterId: "lifting_equipment_required", titleRu: "Требуется подъёмное оборудование", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "lifting_equipment_machine_h", titleRu: "Машино-время подъёмного оборудования", valueType: "decimal", unitId: "machine_hour", ...conditionalRequired("lifting_equipment_required"), constraints: { min: 0.001 } },
  { parameterId: "temporary_support_required", titleRu: "Требуется временное закрепление или разгрузка узла", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "temporary_support_duration_day", titleRu: "Продолжительность временного закрепления", valueType: "decimal", unitId: "day", ...conditionalRequired("temporary_support_required"), constraints: { min: 0.001 } },
  { parameterId: "torque_control_required", titleRu: "Требуется контроль затяжки по проекту", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "torque_tool_machine_h", titleRu: "Машино-время тарированного инструмента", valueType: "decimal", unitId: "machine_hour", ...conditionalRequired("torque_control_required"), constraints: { min: 0.001 } },
  { parameterId: "torque_control_service_h", titleRu: "Инженерный контроль затяжки", valueType: "decimal", unitId: "service_hour", ...conditionalRequired("torque_control_required"), constraints: { min: 0.001 } },
  { parameterId: "survey_control_service_h", titleRu: "Геодезический контроль положения анкерной группы", valueType: "decimal", unitId: "service_hour", ...hardwareRequired, constraints: { min: 0.001 } },
  { parameterId: "anchor_inspection_document_count", titleRu: "Комплект записей инспекции анкерного ремонта", valueType: "decimal", unitId: "document", ...hardwareRequired, constraints: { min: 0.001 } },
  { parameterId: "hardware_delivery_trip_count", titleRu: "Рейсы доставки анкерных компонентов", valueType: "decimal", unitId: "trip", ...hardwareRequired, constraints: { min: 0 } },
  { parameterId: "hardware_waste_disposal_required", titleRu: "Требуется вывоз отходов анкерного ремонта", valueType: "boolean", unitId: null, ...hardwareRequired },
  { parameterId: "hardware_waste_volume_m3", titleRu: "Объём отходов анкерного ремонта", valueType: "decimal", unitId: "m3", ...conditionalRequired("hardware_waste_disposal_required"), constraints: { min: 0.001 } },
  { parameterId: "hardware_waste_transport_trip_count", titleRu: "Рейсы вывоза отходов анкерного ремонта", valueType: "decimal", unitId: "trip", ...conditionalRequired("hardware_waste_disposal_required"), constraints: { min: 0.001 } },
  { parameterId: "hardware_waste_route_reference", titleRu: "Маршрут и место размещения отходов анкерного ремонта", valueType: "text", unitId: null, ...conditionalRequired("hardware_waste_disposal_required"), constraints: { minLength: 1, maxLength: 1_000 }, documentary: true },
]);

const SCOPE_PARAMETER: CanonicalEstimateParameterDefinition & { ordinal: number; unit_id: null; title_ru: string; truth_metadata: Json } = {
  parameter_id: "anchor_group_repair_scope_mode",
  ordinal: 0,
  value_type: "enum",
  unit_id: null,
  title_ru: "Состав ремонта анкерной группы",
  required: true,
  default_value: null,
  constraints_json: { values: ANCHOR_GROUP_REPAIR_SCOPE_MODES },
  truth_metadata: {
    contract: "rik-expo-app.anchor-group-repair-r1",
    semantic_parameter_key: "anchor-group-repair:scope-mode",
    visibility_role: "USER_INPUT",
    value_source_role: "PROJECT_SPECIFIC_INPUT",
    input_origin_class: "APPROVED_REPAIR_SCOPE",
    preliminary_compilation_allowed: false,
    source_confirmation_required: true,
    guide: {
      guide_kind: "ENUM_DECISION_RULE",
      guide_short_ru: "Выберите состав ремонта: только бетонное основание, только анкерные компоненты либо обе ветви.",
      source_role: "ACI_562_ASSESSMENT_AND_APPROVED_PROJECT_REPAIR_SCOPE",
      source_document: CONCRETE_SLAB_REPAIR_SOURCE_ID,
      source_locator: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.exact_locator,
      guide_version: "anchor-group-repair-r1",
      source_snapshot_hash: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.definition_hash,
      applicability: "Состав ремонта определяется по обследованию и проектному решению; приложение не выбирает ветвь автоматически.",
      verified_at: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.verified_at,
    },
    hidden_default_forbidden: true,
    synthetic: false,
  },
};

const COMMON_PARAMETERS: readonly ConcreteSlabRepairParameterR1[] = Object.freeze([
  {
    parameter_id: "condition_assessment_service_h",
    ordinal: 1,
    value_type: "decimal",
    unit_id: "service_hour",
    title_ru: "Трудоёмкость обследования состояния анкерной группы",
    required: true,
    default_value: null,
    constraints_json: { min: 0.001 },
    truth_metadata: {
      contract: "rik-expo-app.anchor-group-repair-r1",
      semantic_parameter_key: "anchor-group-repair:condition-assessment-service-h",
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: "APPROVED_ASSESSMENT_SCHEDULE",
      visible_when: literalTrue,
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: "PROJECT_DEFINED",
        guide_short_ru: "Укажите часы обследования из задания или ведомости. Универсальная производительность не подставляется.",
        source_role: "ACI_562_ASSESSMENT_AND_APPROVED_PROJECT_SCHEDULE",
        source_document: CONCRETE_SLAB_REPAIR_SOURCE_ID,
        source_locator: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.exact_locator,
        guide_version: "anchor-group-repair-r1",
        source_snapshot_hash: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.definition_hash,
        applicability: "Состав ремонта определяется после оценки существующего состояния.",
        verified_at: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.verified_at,
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  },
  {
    parameter_id: "repair_scope_document_count",
    ordinal: 2,
    value_type: "decimal",
    unit_id: "document",
    title_ru: "Количество документов обследования и границ ремонта",
    required: true,
    default_value: null,
    constraints_json: { min: 0.001 },
    truth_metadata: {
      contract: "rik-expo-app.anchor-group-repair-r1",
      semantic_parameter_key: "anchor-group-repair:scope-document-count",
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: "APPROVED_ASSESSMENT_SCHEDULE",
      visible_when: literalTrue,
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: "PROJECT_DEFINED",
        guide_short_ru: "Укажите количество фактически предусмотренных документов обследования и фиксации границ ремонта.",
        source_role: "ACI_562_ASSESSMENT_AND_APPROVED_PROJECT_SCHEDULE",
        source_document: CONCRETE_SLAB_REPAIR_SOURCE_ID,
        source_locator: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.exact_locator,
        guide_version: "anchor-group-repair-r1",
        source_snapshot_hash: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.definition_hash,
        applicability: "ACI 562 связывает выбор ремонта с оценкой состояния и проектным решением.",
        verified_at: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.verified_at,
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  },
]);

const CONCRETE_PARAMETERS = CONCRETE_SLAB_REPAIR_PARAMETERS.map(
  (parameter, index) => adaptConcreteParameter(
    parameter,
    index + 1 + COMMON_PARAMETERS.length,
  ),
);

const HARDWARE_PARAMETERS = HARDWARE_PARAMETER_SPECS.map((spec, index) => ({
  parameter_id: spec.parameterId,
  ordinal: 1 + COMMON_PARAMETERS.length + CONCRETE_PARAMETERS.length + index,
  value_type: spec.valueType,
  unit_id: spec.unitId,
  title_ru: spec.titleRu,
  required: false,
  default_value: null,
  constraints_json: {
    ...(spec.constraints ?? {}),
    ...(spec.requiredWhen && !spec.documentary ? { requiredWhen: spec.requiredWhen } : {}),
    ...(spec.forbiddenWhen ? { forbiddenWhen: spec.forbiddenWhen } : {}),
  },
  truth_metadata: {
    contract: "rik-expo-app.anchor-group-repair-r1",
    semantic_parameter_key: `anchor-group-repair:${spec.parameterId}`,
    visibility_role: "USER_INPUT",
    value_source_role: "PROJECT_SPECIFIC_INPUT",
    input_origin_class: spec.documentary
      ? "OPTIONAL_PROJECT_DOCUMENTATION"
      : "APPROVED_PROJECT_SCHEDULE_OR_SUPPLIER_QUOTE",
    ...(spec.requiredWhen && !spec.documentary ? { required_when: spec.requiredWhen } : {}),
    visible_when: HARDWARE_SCOPE,
    preliminary_compilation_allowed: spec.documentary === true,
    source_confirmation_required: spec.documentary !== true,
    guide: {
      guide_kind: "PROJECT_DEFINED",
      guide_short_ru: spec.documentary
        ? `${spec.titleRu}: можно оставить пустым, если ссылка или обозначение пока неизвестны.`
        : `${spec.titleRu}: укажите прямое количество из проекта ремонта или ведомости; значение не рассчитывается автоматически.`,
      source_role: spec.documentary
        ? "OPTIONAL_APPROVED_PROJECT_REPAIR_REFERENCE"
        : "APPROVED_PROJECT_REPAIR_SCHEDULE_OR_SUPPLIER_QUOTE",
      source_document: CONCRETE_SLAB_REPAIR_SOURCE_ID,
      source_locator: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.exact_locator,
      guide_version: "anchor-group-repair-r1",
      source_snapshot_hash: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.definition_hash,
      applicability: "ACI 562 требует оценку и проект ремонта; состав анкерных работ и количества задаются только проектом.",
      verified_at: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.verified_at,
    },
    hidden_default_forbidden: true,
    synthetic: false,
  },
}));

export const ANCHOR_GROUP_REPAIR_PARAMETERS = Object.freeze([
  SCOPE_PARAMETER,
  ...COMMON_PARAMETERS,
  ...CONCRETE_PARAMETERS,
  ...HARDWARE_PARAMETERS,
]);

function formula(
  formulaId: string,
  unitId: string,
  expression: string,
): ConcreteSlabRepairFormulaR1 {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: unitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

const HARDWARE_FORMULAS = Object.freeze([
  formula("anchor_repair_condition_assessment_v1", "service_hour", "condition_assessment_service_h"),
  formula("anchor_repair_scope_documents_v1", "document", "repair_scope_document_count"),
  formula("anchor_repair_labor_v1", "man_hour", "anchor_hardware_repair_worker_h"),
  formula("anchor_repair_anchor_quantity_v1", "piece", "replacement_anchor_quantity_piece"),
  formula("anchor_repair_nut_quantity_v1", "piece", "replacement_nut_quantity_piece"),
  formula("anchor_repair_washer_quantity_v1", "piece", "replacement_washer_quantity_piece"),
  formula("anchor_repair_post_installed_quantity_v1", "piece", "post_installed_anchor_quantity_piece"),
  formula("anchor_repair_drilling_equipment_v1", "machine_hour", "drilling_equipment_machine_h"),
  formula("anchor_repair_grout_v1", "kg", "base_plate_grout_quantity_kg"),
  formula("anchor_repair_corrosion_protection_v1", "kg", "corrosion_protection_quantity_kg"),
  formula("anchor_repair_welding_consumables_v1", "kg", "welding_consumable_quantity_kg"),
  formula("anchor_repair_welding_equipment_v1", "machine_hour", "welding_equipment_machine_h"),
  formula("anchor_repair_lifting_equipment_v1", "machine_hour", "lifting_equipment_machine_h"),
  formula("anchor_repair_temporary_support_v1", "day", "temporary_support_duration_day"),
  formula("anchor_repair_torque_tool_v1", "machine_hour", "torque_tool_machine_h"),
  formula("anchor_repair_torque_control_v1", "service_hour", "torque_control_service_h"),
  formula("anchor_repair_survey_control_v1", "service_hour", "survey_control_service_h"),
  formula("anchor_repair_inspection_documents_v1", "document", "anchor_inspection_document_count"),
  formula("anchor_repair_delivery_v1", "trip", "hardware_delivery_trip_count"),
  formula("anchor_repair_waste_disposal_v1", "m3", "hardware_waste_volume_m3"),
  formula("anchor_repair_waste_transport_v1", "trip", "hardware_waste_transport_trip_count"),
]);

export const ANCHOR_GROUP_REPAIR_FORMULAS = Object.freeze([
  ...CONCRETE_SLAB_REPAIR_FORMULAS,
  ...HARDWARE_FORMULAS,
]);

function adaptConcreteResource(resource: CanonicalEstimateResourceDefinition): CanonicalEstimateResourceDefinition {
  const adapted = adaptJson(resource);
  return {
    ...adapted,
    row_id: resource.row_id.replaceAll("slab-repair", "anchor-group-concrete-repair"),
    title_ru: anchorGroupText(resource.title_ru),
    inclusion_ast: and(CONCRETE_SCOPE, adaptJson(resource.inclusion_ast ?? literalTrue)),
  };
}

const REPAIR_TRACE = Object.freeze({
  sourceId: CONCRETE_SLAB_REPAIR_SOURCE_ID,
  source_id: CONCRETE_SLAB_REPAIR_SOURCE_ID,
  normId: CONCRETE_SLAB_REPAIR_NORM_ID,
  norm_id: CONCRETE_SLAB_REPAIR_NORM_ID,
  source_title: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.source_title,
  source_url: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.source_url,
  exact_locator: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.exact_locator,
  source_definition_hash: CONCRETE_SLAB_REPAIR_SOURCE_METADATA.definition_hash,
  sourceRole: "REPAIR_ASSESSMENT_DESIGN_CONSTRUCTION_AND_INSPECTION_APPLICABILITY",
});

function hardwareResource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  parameterIds: readonly string[];
  inclusionAst?: Json;
  scopeAst?: Json;
  procurementEligible: boolean;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `anchor-group-repair:${input.rowId}`,
    costOwner: "resource",
    inputParameterIds: [...input.parameterIds],
    normativeMethodGuidanceV1: {
      source_id: CONCRETE_SLAB_REPAIR_SOURCE_ID,
      norm_id: CONCRETE_SLAB_REPAIR_NORM_ID,
      operation_class: "PROJECT_SPECIFIED_ANCHOR_GROUP_REPAIR",
      scope_mode: "DIRECT_APPROVED_PROJECT_REPAIR_SCHEDULE",
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
    },
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    quantitySourceRole: "DIRECT_APPROVED_PROJECT_REPAIR_SCHEDULE",
    normativeTrace: [REPAIR_TRACE, {
      sourceId: "project_anchor_group_repair_schedule",
      sourceRole: "PROJECT_REPAIR_DESIGN_AND_DIRECT_QUANTITY",
    }],
    excludedUnownedAssumptions: [
      "automatic anchor repair method",
      "automatic anchor or hardware quantity",
      "automatic labor or equipment productivity",
      "automatic testing frequency",
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
    inclusion_ast: and(input.scopeAst ?? HARDWARE_SCOPE, input.inclusionAst ?? literalTrue),
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const hr = (
  rowId: string, ordinal: number, section: string, category: string, titleRu: string,
  unitId: string, formulaId: string, parameterIds: readonly string[],
  inclusionAst: Json | undefined, procurementEligible: boolean,
) => hardwareResource({ rowId, ordinal, section, category, titleRu, unitId, formulaId, parameterIds, inclusionAst, procurementEligible });

const HARDWARE_RESOURCES = Object.freeze([
  hardwareResource({ rowId: "service:anchor-group:condition-assessment", ordinal: 90, section: "Услуги", category: "service", titleRu: "Обследование состояния анкерной группы и границ ремонта", unitId: "service_hour", formulaId: "anchor_repair_condition_assessment_v1", parameterIds: ["anchor_group_repair_scope_mode", "repair_scope_volume_m3", "condition_assessment_service_h"], scopeAst: literalTrue, procurementEligible: true }),
  hardwareResource({ rowId: "service:anchor-group:repair-scope-documentation", ordinal: 91, section: "Услуги", category: "service", titleRu: "Документирование обследования и границ ремонта", unitId: "document", formulaId: "anchor_repair_scope_documents_v1", parameterIds: ["anchor_group_repair_scope_mode", "repair_scope_document_count"], scopeAst: literalTrue, procurementEligible: true }),
  hr("work:anchor-group:repair-hardware", 100, "Работы", "construction_work", "Ремонт анкерных компонентов по утверждённому проекту", "man_hour", "anchor_repair_labor_v1", ["anchor_hardware_repair_worker_h", "anchor_repair_design_reference"], undefined, false),
  hr("material:anchor-group:replacement-anchors", 101, "Материалы", "material", "Заменяемые анкерные стержни или анкеры по проекту", "piece", "anchor_repair_anchor_quantity_v1", ["anchor_rod_replacement_required", "replacement_anchor_designation", "replacement_anchor_quantity_piece"], equals("anchor_rod_replacement_required", true), true),
  hr("material:anchor-group:replacement-nuts", 102, "Материалы", "material", "Новые гайки анкерной группы", "piece", "anchor_repair_nut_quantity_v1", ["nut_washer_replacement_required", "replacement_nut_quantity_piece"], equals("nut_washer_replacement_required", true), true),
  hr("material:anchor-group:replacement-washers", 103, "Материалы", "material", "Новые шайбы анкерной группы", "piece", "anchor_repair_washer_quantity_v1", ["nut_washer_replacement_required", "replacement_washer_quantity_piece"], equals("nut_washer_replacement_required", true), true),
  hr("material:anchor-group:post-installed-anchors", 104, "Материалы", "material", "Post-installed анкеры подтверждённой проектом системы", "piece", "anchor_repair_post_installed_quantity_v1", ["post_installed_anchor_required", "post_installed_anchor_quantity_piece"], equals("post_installed_anchor_required", true), true),
  hr("equipment:anchor-group:drilling", 105, "Техника", "equipment", "Буровое оборудование для post-installed анкеров", "machine_hour", "anchor_repair_drilling_equipment_v1", ["post_installed_anchor_required", "drilling_equipment_machine_h"], equals("post_installed_anchor_required", true), true),
  hr("material:anchor-group:base-plate-grout", 106, "Материалы", "material", "Состав для ремонта подливки опорной плиты", "kg", "anchor_repair_grout_v1", ["base_plate_grout_repair_required", "base_plate_grout_designation", "base_plate_grout_quantity_kg"], equals("base_plate_grout_repair_required", true), true),
  hr("material:anchor-group:corrosion-protection", 107, "Материалы", "material", "Защитный материал анкерных компонентов", "kg", "anchor_repair_corrosion_protection_v1", ["corrosion_protection_required", "corrosion_protection_designation", "corrosion_protection_quantity_kg"], equals("corrosion_protection_required", true), true),
  hr("material:anchor-group:welding-consumables", 108, "Материалы", "material", "Сварочные расходные материалы по проекту ремонта", "kg", "anchor_repair_welding_consumables_v1", ["welding_repair_required", "welding_consumable_quantity_kg"], equals("welding_repair_required", true), true),
  hr("equipment:anchor-group:welding", 109, "Техника", "equipment", "Сварочное оборудование для проектного ремонта", "machine_hour", "anchor_repair_welding_equipment_v1", ["welding_repair_required", "welding_equipment_machine_h"], equals("welding_repair_required", true), true),
  hr("equipment:anchor-group:lifting", 110, "Техника", "equipment", "Подъёмное оборудование для ремонта анкерной группы", "machine_hour", "anchor_repair_lifting_equipment_v1", ["lifting_equipment_required", "lifting_equipment_machine_h"], equals("lifting_equipment_required", true), true),
  hr("service:anchor-group:temporary-support", 111, "Услуги", "service", "Временное закрепление или разгрузка ремонтируемого узла", "day", "anchor_repair_temporary_support_v1", ["temporary_support_required", "temporary_support_duration_day"], equals("temporary_support_required", true), true),
  hr("equipment:anchor-group:torque-tool", 112, "Техника", "equipment", "Тарированный инструмент для контроля затяжки", "machine_hour", "anchor_repair_torque_tool_v1", ["torque_control_required", "torque_tool_machine_h"], equals("torque_control_required", true), true),
  hr("service:anchor-group:torque-control", 113, "Услуги", "service", "Инженерный контроль затяжки соединений", "service_hour", "anchor_repair_torque_control_v1", ["torque_control_required", "torque_control_service_h"], equals("torque_control_required", true), true),
  hr("service:anchor-group:survey-control", 114, "Услуги", "service", "Геодезический контроль положения анкерной группы", "service_hour", "anchor_repair_survey_control_v1", ["survey_control_service_h"], undefined, true),
  hr("service:anchor-group:repair-inspection", 115, "Услуги", "service", "Инспекция и записи ремонта анкерной группы", "document", "anchor_repair_inspection_documents_v1", ["anchor_inspection_document_count"], undefined, true),
  hr("delivery:anchor-group:repair-components", 116, "Логистика", "delivery", "Доставка компонентов ремонта анкерной группы", "trip", "anchor_repair_delivery_v1", ["hardware_delivery_trip_count"], greaterThan("hardware_delivery_trip_count", 0), true),
  hr("service:anchor-group:repair-waste-disposal", 117, "Услуги", "service", "Приём и размещение отходов анкерного ремонта", "m3", "anchor_repair_waste_disposal_v1", ["hardware_waste_disposal_required", "hardware_waste_volume_m3", "hardware_waste_route_reference"], equals("hardware_waste_disposal_required", true), true),
  hr("delivery:anchor-group:repair-waste", 118, "Логистика", "delivery", "Вывоз отходов анкерного ремонта", "trip", "anchor_repair_waste_transport_v1", ["hardware_waste_disposal_required", "hardware_waste_transport_trip_count", "hardware_waste_route_reference"], equals("hardware_waste_disposal_required", true), true),
]);

export const ANCHOR_GROUP_REPAIR_RESOURCES = Object.freeze([
  ...CONCRETE_SLAB_REPAIR_RESOURCES.map(adaptConcreteResource),
  ...HARDWARE_RESOURCES,
]);

export const ANCHOR_GROUP_REPAIR_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "anchor_group_repair_scope_mode",
  "condition_assessment_service_h",
  "repair_scope_document_count",
  ...CONCRETE_SLAB_REPAIR_NORMATIVE_PARAMETER_IDS,
  "anchor_repair_design_reference",
] as const);
export const ANCHOR_GROUP_REPAIR_SOURCE_ID = CONCRETE_SLAB_REPAIR_SOURCE_ID;
export const ANCHOR_GROUP_REPAIR_NORM_ID = CONCRETE_SLAB_REPAIR_NORM_ID;
export const ANCHOR_GROUP_REPAIR_SOURCE_METADATA = Object.freeze({
  ...CONCRETE_SLAB_REPAIR_SOURCE_METADATA,
  operation_class: "ASSESS_AND_REPAIR_EXISTING_ANCHOR_GROUP_SYSTEM",
  scope_selection_required: true,
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
  anchor_hardware_quantity_basis: "DIRECT_APPROVED_PROJECT_REPAIR_SCHEDULE",
});

const HARDWARE_SCHEDULES: Readonly<Record<AnchorGroupRepairContextKey, Readonly<Record<string, InputValue>>>> = Object.freeze({
  standard: { anchor_hardware_repair_worker_h: 18, anchor_rod_replacement_required: true, replacement_anchor_designation: "AG-REPAIR-STD-ANCHOR", replacement_anchor_quantity_piece: 4, nut_washer_replacement_required: true, replacement_nut_quantity_piece: 8, replacement_washer_quantity_piece: 8, post_installed_anchor_required: false, base_plate_grout_repair_required: true, base_plate_grout_designation: "AG-REPAIR-STD-GROUT", base_plate_grout_quantity_kg: 40, corrosion_protection_required: true, corrosion_protection_designation: "AG-REPAIR-STD-PROTECT", corrosion_protection_quantity_kg: 2, welding_repair_required: false, lifting_equipment_required: false, temporary_support_required: false, torque_control_required: true, torque_tool_machine_h: 2, torque_control_service_h: 2, survey_control_service_h: 3, anchor_inspection_document_count: 2, hardware_delivery_trip_count: 1, hardware_waste_disposal_required: false },
  high_load: { anchor_hardware_repair_worker_h: 34, anchor_rod_replacement_required: true, replacement_anchor_designation: "AG-REPAIR-HL-ANCHOR", replacement_anchor_quantity_piece: 8, nut_washer_replacement_required: true, replacement_nut_quantity_piece: 16, replacement_washer_quantity_piece: 16, post_installed_anchor_required: true, post_installed_anchor_quantity_piece: 4, drilling_equipment_machine_h: 6, base_plate_grout_repair_required: true, base_plate_grout_designation: "AG-REPAIR-HL-GROUT", base_plate_grout_quantity_kg: 85, corrosion_protection_required: true, corrosion_protection_designation: "AG-REPAIR-HL-PROTECT", corrosion_protection_quantity_kg: 4, welding_repair_required: true, welding_consumable_quantity_kg: 3, welding_equipment_machine_h: 5, lifting_equipment_required: true, lifting_equipment_machine_h: 5, temporary_support_required: true, temporary_support_duration_day: 2, torque_control_required: true, torque_tool_machine_h: 4, torque_control_service_h: 4, survey_control_service_h: 5, anchor_inspection_document_count: 3, hardware_delivery_trip_count: 2, hardware_waste_disposal_required: true, hardware_waste_volume_m3: 0.5, hardware_waste_transport_trip_count: 1, hardware_waste_route_reference: "AG-REPAIR-HL-WASTE" },
  large_area: { anchor_hardware_repair_worker_h: 48, anchor_rod_replacement_required: true, replacement_anchor_designation: "AG-REPAIR-LA-ANCHOR", replacement_anchor_quantity_piece: 12, nut_washer_replacement_required: true, replacement_nut_quantity_piece: 24, replacement_washer_quantity_piece: 24, post_installed_anchor_required: false, base_plate_grout_repair_required: true, base_plate_grout_designation: "AG-REPAIR-LA-GROUT", base_plate_grout_quantity_kg: 130, corrosion_protection_required: true, corrosion_protection_designation: "AG-REPAIR-LA-PROTECT", corrosion_protection_quantity_kg: 7, welding_repair_required: false, lifting_equipment_required: true, lifting_equipment_machine_h: 7, temporary_support_required: false, torque_control_required: true, torque_tool_machine_h: 6, torque_control_service_h: 6, survey_control_service_h: 8, anchor_inspection_document_count: 4, hardware_delivery_trip_count: 2, hardware_waste_disposal_required: false },
  repair: { anchor_hardware_repair_worker_h: 12, anchor_rod_replacement_required: false, nut_washer_replacement_required: true, replacement_nut_quantity_piece: 4, replacement_washer_quantity_piece: 4, post_installed_anchor_required: false, base_plate_grout_repair_required: true, base_plate_grout_designation: "AG-REPAIR-LOCAL-GROUT", base_plate_grout_quantity_kg: 18, corrosion_protection_required: true, corrosion_protection_designation: "AG-REPAIR-LOCAL-PROTECT", corrosion_protection_quantity_kg: 1, welding_repair_required: false, lifting_equipment_required: false, temporary_support_required: false, torque_control_required: true, torque_tool_machine_h: 1, torque_control_service_h: 1, survey_control_service_h: 2, anchor_inspection_document_count: 2, hardware_delivery_trip_count: 1, hardware_waste_disposal_required: false },
  small_area: { anchor_hardware_repair_worker_h: 8, anchor_rod_replacement_required: false, nut_washer_replacement_required: true, replacement_nut_quantity_piece: 2, replacement_washer_quantity_piece: 2, post_installed_anchor_required: false, base_plate_grout_repair_required: false, corrosion_protection_required: true, corrosion_protection_designation: "AG-REPAIR-SA-PROTECT", corrosion_protection_quantity_kg: 0.5, welding_repair_required: false, lifting_equipment_required: false, temporary_support_required: false, torque_control_required: true, torque_tool_machine_h: 1, torque_control_service_h: 1, survey_control_service_h: 1, anchor_inspection_document_count: 1, hardware_delivery_trip_count: 0, hardware_waste_disposal_required: false },
  technical_room: { anchor_hardware_repair_worker_h: 20, anchor_rod_replacement_required: true, replacement_anchor_designation: "AG-REPAIR-TR-ANCHOR", replacement_anchor_quantity_piece: 4, nut_washer_replacement_required: true, replacement_nut_quantity_piece: 8, replacement_washer_quantity_piece: 8, post_installed_anchor_required: true, post_installed_anchor_quantity_piece: 2, drilling_equipment_machine_h: 3, base_plate_grout_repair_required: true, base_plate_grout_designation: "AG-REPAIR-TR-GROUT", base_plate_grout_quantity_kg: 35, corrosion_protection_required: true, corrosion_protection_designation: "AG-REPAIR-TR-PROTECT", corrosion_protection_quantity_kg: 2, welding_repair_required: false, lifting_equipment_required: false, temporary_support_required: true, temporary_support_duration_day: 1, torque_control_required: true, torque_tool_machine_h: 2, torque_control_service_h: 2, survey_control_service_h: 3, anchor_inspection_document_count: 2, hardware_delivery_trip_count: 1, hardware_waste_disposal_required: false },
  wet_zone: { anchor_hardware_repair_worker_h: 24, anchor_rod_replacement_required: true, replacement_anchor_designation: "AG-REPAIR-WZ-ANCHOR", replacement_anchor_quantity_piece: 4, nut_washer_replacement_required: true, replacement_nut_quantity_piece: 8, replacement_washer_quantity_piece: 8, post_installed_anchor_required: false, base_plate_grout_repair_required: true, base_plate_grout_designation: "AG-REPAIR-WZ-GROUT", base_plate_grout_quantity_kg: 45, corrosion_protection_required: true, corrosion_protection_designation: "AG-REPAIR-WZ-PROTECT", corrosion_protection_quantity_kg: 4, welding_repair_required: false, lifting_equipment_required: false, temporary_support_required: false, torque_control_required: true, torque_tool_machine_h: 2, torque_control_service_h: 2, survey_control_service_h: 3, anchor_inspection_document_count: 3, hardware_delivery_trip_count: 1, hardware_waste_disposal_required: false },
});

const SCOPE_BY_CONTEXT: Readonly<Record<AnchorGroupRepairContextKey, (typeof ANCHOR_GROUP_REPAIR_SCOPE_MODES)[number]>> = Object.freeze({
  standard: "COMBINED_CONCRETE_AND_ANCHOR_HARDWARE",
  high_load: "COMBINED_CONCRETE_AND_ANCHOR_HARDWARE",
  large_area: "CONCRETE_SUBSTRATE_ONLY",
  repair: "COMBINED_CONCRETE_AND_ANCHOR_HARDWARE",
  small_area: "ANCHOR_HARDWARE_ONLY",
  technical_room: "COMBINED_CONCRETE_AND_ANCHOR_HARDWARE",
  wet_zone: "COMBINED_CONCRETE_AND_ANCHOR_HARDWARE",
});

export function anchorGroupRepairAcceptanceInputR1(
  contextKey: AnchorGroupRepairContextKey,
): Readonly<Record<string, InputValue>> {
  const target = ANCHOR_GROUP_REPAIR_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`ANCHOR_GROUP_REPAIR_CONTEXT_UNSUPPORTED:${contextKey}`);
  const scope = SCOPE_BY_CONTEXT[contextKey];
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const concrete = concreteSlabRepairAcceptanceInputR1(contextKey as ConcreteSlabRepairContextKey);
  const includeConcrete = scope !== "ANCHOR_HARDWARE_ONLY";
  const includeHardware = scope !== "CONCRETE_SUBSTRATE_ONLY";
  return Object.freeze({
    anchor_group_repair_scope_mode: scope,
    repair_scope_volume_m3: concrete.repair_scope_volume_m3,
    condition_assessment_service_h: 2 + ANCHOR_GROUP_REPAIR_TARGETS.indexOf(target),
    repair_scope_document_count: contextKey === "high_load" || contextKey === "large_area" ? 2 : 1,
    ...(includeConcrete ? {
      ...concrete,
      condition_assessment_reference: `ASSESS-AG-REPAIR-${reference}-REV-A`,
      approved_repair_design_reference: `DESIGN-AG-REPAIR-${reference}-REV-A`,
      approved_repair_method_designation: `METHOD-AG-REPAIR-${reference}`,
      repair_method_statement_reference: `MS-AG-REPAIR-${reference}-REV-A`,
      quality_plan_reference: `QP-AG-REPAIR-${reference}-REV-A`,
    } : {}),
    ...(includeHardware ? {
      anchor_repair_design_reference: `ANCHOR-DESIGN-AG-REPAIR-${reference}-REV-A`,
      ...HARDWARE_SCHEDULES[contextKey],
    } : {}),
  });
}

export async function compileAnchorGroupRepairR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ANCHOR_GROUP_REPAIR_TARGETS[0].catalogId;
  if (!ANCHOR_GROUP_REPAIR_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`ANCHOR_GROUP_REPAIR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.anchor-group-repair-r1",
    catalogId,
    primaryMeasureParameterId: "repair_scope_volume_m3",
    parameterDefinitions: [...ANCHOR_GROUP_REPAIR_PARAMETERS],
    formulaDefinitions: [...ANCHOR_GROUP_REPAIR_FORMULAS],
    resourceDefinitions: [...ANCHOR_GROUP_REPAIR_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 48,
    hashJson: async (value) => JSON.stringify(value),
  });
}
