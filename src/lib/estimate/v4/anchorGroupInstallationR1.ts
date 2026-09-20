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

export const ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID =
  "project_anchor_group_schedule_drawing_method_statement_v1";
export const ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID =
  "norm:project:anchor_group:schedule_drawing_method_statement:v1";
export const ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID =
  "anchor_group_approved_project_schedule_v1";

export const ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая спецификация анкерной группы, рабочий чертёж и ППР",
  source_authority: "Проектная организация и утверждающий инженер проекта",
  source_document_version: "PROJECT_REVISION_EXPLICIT",
  definition_hash: "eh_anchor_group_project_schedule_r1",
  exact_locator:
    "Маркировочная ведомость анкерной группы, узел рабочего чертежа и раздел ППР, указанные пользователем",
  use_restriction:
    "Только явно утверждённые проектом количества и трудозатраты; универсальные нормы расхода и производительности запрещены",
});

export const ANCHOR_GROUP_INSTALLATION_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_standard", titleRu: "Установка анкерной группы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_high_load", titleRu: "Установка анкерной группы в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_large_area", titleRu: "Установка анкерных групп на большом участке", contextRu: "большой участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_small_area", titleRu: "Установка анкерной группы на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_technical_room", titleRu: "Установка анкерной группы в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_wet_zone", titleRu: "Установка анкерной группы во влажной зоне", contextRu: "влажная зона" },
] as const);

export type AnchorGroupInstallationContextKey =
  (typeof ANCHOR_GROUP_INSTALLATION_TARGETS)[number]["contextKey"];

const PARAMETER_SPECS = Object.freeze([
  ["product_profile_id", "Правило комплектации анкерной группы", "enum", null, [ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID]],
  ["anchor_group_count", "Количество анкерных групп", "integer", "piece", null],
  ["bolts_per_group", "Количество анкерных болтов в одной группе", "integer", "piece", null],
  ["approved_anchor_group_schedule_reference", "Утверждённая спецификация анкерной группы", "text", null, null],
  ["structural_drawing_revision_reference", "Рабочий чертёж и ревизия узла", "text", null, null],
  ["method_statement_reference", "Утверждённый ППР на установку", "text", null, null],
  ["anchor_bolt_designation", "Марка анкерных болтов", "text", null, null],
  ["anchor_bolt_quantity_piece", "Количество анкерных болтов", "decimal", "piece", null],
  ["thread_protection_cap_designation", "Тип защитных колпачков резьбы", "text", null, null],
  ["thread_protection_cap_quantity_piece", "Количество защитных колпачков резьбы", "decimal", "piece", null],
  ["nut_designation", "Марка гаек", "text", null, null],
  ["nut_quantity_piece", "Количество гаек", "decimal", "piece", null],
  ["washer_designation", "Марка шайб", "text", null, null],
  ["washer_quantity_piece", "Количество шайб", "decimal", "piece", null],
  ["installation_template_designation", "Марка установочного шаблона", "text", null, null],
  ["installation_template_quantity_piece", "Количество установочных шаблонов", "decimal", "piece", null],
  ["fixing_accessory_designation", "Марка фиксаторов и крепёжных приспособлений", "text", null, null],
  ["fixing_accessory_quantity_set", "Количество комплектов фиксаторов", "decimal", "set", null],
  ["protective_system_applicable", "Защитная система применяется", "boolean", null, null],
  ["protective_system_designation", "Марка защитной системы", "text", null, null],
  ["protective_material_quantity_kg", "Количество защитного материала", "decimal", "kg", null],
  ["welded_fixing_applicable", "Сварочная фиксация предусмотрена ППР", "boolean", null, null],
  ["welding_consumable_designation", "Марка сварочных расходных материалов", "text", null, null],
  ["welding_consumable_quantity_kg", "Количество сварочных расходных материалов", "decimal", "kg", null],
  ["survey_setout_worker_h", "Трудозатраты на геодезическую разбивку", "decimal", "man_hour", null],
  ["template_assembly_worker_h", "Трудозатраты на сборку и установку шаблона", "decimal", "man_hour", null],
  ["anchor_installation_alignment_worker_h", "Трудозатраты на установку и выверку анкеров", "decimal", "man_hour", null],
  ["fixing_worker_h", "Трудозатраты на фиксацию анкерной группы", "decimal", "man_hour", null],
  ["protective_application_worker_h", "Трудозатраты на защитную обработку", "decimal", "man_hour", null],
  ["lifting_equipment_applicable", "Подъёмное оборудование применяется", "boolean", null, null],
  ["lifting_equipment_designation", "Обозначение подъёмного оборудования", "text", null, null],
  ["lifting_machine_h", "Работа подъёмного оборудования", "decimal", "machine_hour", null],
  ["welding_equipment_h", "Работа сварочного оборудования", "decimal", "machine_hour", null],
  ["survey_equipment_h", "Работа геодезического оборудования", "decimal", "machine_hour", null],
  ["geometry_control_service_h", "Геодезический контроль положения анкеров", "decimal", "service_hour", null],
  ["acceptance_inspection_service_h", "Инженерная приёмка анкерной группы", "decimal", "service_hour", null],
  ["documentation_package_count", "Комплект исполнительной документации", "decimal", "document", null],
  ["delivery_pricing_mode", "Учёт доставки анкерной группы", "enum", null, ["SEPARATE", "INCLUDED_IN_SUPPLY"]],
  ["delivered_anchor_group_mass_kg", "Масса поставки анкерной группы", "decimal", "kg", null],
  ["delivery_distance_km", "Расстояние доставки анкерной группы", "decimal", "km", null],
  ["torque_control_applicable", "Контроль затяжки предусмотрен проектом", "boolean", null, null],
  ["torque_tool_machine_h", "Работа тарированного динамометрического инструмента", "decimal", "machine_hour", null],
  ["torque_control_service_h", "Контроль затяжки соединений", "decimal", "service_hour", null],
  ["temporary_brace_mode", "Временные раскосы анкерной группы по ППР", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["temporary_brace_designation", "Тип временного раскоса анкерной группы", "text", null, null],
  ["temporary_brace_quantity_piece", "Количество временных раскосов анкерной группы", "decimal", "piece", null],
  ["temporary_brace_worker_h", "Трудозатраты на установку и снятие временных раскосов", "decimal", "man_hour", null],
  ["base_grout_mode", "Безусадочная подливка под опорной деталью по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["base_grout_designation", "Марка безусадочной подливочной смеси", "text", null, null],
  ["base_grout_quantity_kg", "Количество безусадочной подливочной смеси", "decimal", "kg", null],
  ["base_grout_worker_h", "Трудозатраты на устройство безусадочной подливки", "decimal", "man_hour", null],
] as const);

const TEMPORARY_BRACE_DETAIL_PARAMETER_IDS = new Set([
  "temporary_brace_designation",
  "temporary_brace_quantity_piece",
  "temporary_brace_worker_h",
]);
const BASE_GROUT_DETAIL_PARAMETER_IDS = new Set([
  "base_grout_designation",
  "base_grout_quantity_kg",
  "base_grout_worker_h",
]);
const CONDITIONAL_DETAIL_PARAMETER_IDS = new Set([
  ...TEMPORARY_BRACE_DETAIL_PARAMETER_IDS,
  ...BASE_GROUT_DETAIL_PARAMETER_IDS,
]);

function conditionalParameterConstraints(parameterId: string): Json {
  if (TEMPORARY_BRACE_DETAIL_PARAMETER_IDS.has(parameterId)) {
    return {
      requiredWhen: { kind: "equals", parameterId: "temporary_brace_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "temporary_brace_mode", value: "NOT_REQUIRED" },
    };
  }
  if (BASE_GROUT_DETAIL_PARAMETER_IDS.has(parameterId)) {
    return {
      requiredWhen: { kind: "equals", parameterId: "base_grout_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "base_grout_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type AnchorGroupInstallationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const ANCHOR_GROUP_INSTALLATION_PARAMETERS:
readonly AnchorGroupInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAIL_PARAMETER_IDS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues
        ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId.endsWith("quantity_piece")
            || parameterId === "anchor_bolt_quantity_piece"
            || parameterId === "anchor_group_count"
            || parameterId === "bolts_per_group" ? 0.000_001 : 0 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalParameterConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.anchor-group-installation-r1",
      semantic_parameter_key: `anchor-group-installation:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: "APPROVED_PROJECT_SCHEDULE_DRAWING_OR_METHOD_STATEMENT",
      preliminary_compilation_allowed: true,
      source_confirmation_required: true,
      guide: {
        guide_kind: "PROJECT_DEFINED",
        guide_short_ru: `${titleRu}: укажите подтверждённое проектом, спецификацией поставщика или ППР значение.`,
        source_role: "APPROVED_PROJECT_DOCUMENTATION",
        source_document: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
        source_locator: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.exact_locator,
        guide_version: "anchor-group-installation-r1",
        source_snapshot_hash: "b70192258885889ce40b1082d03273e06bc98a873b0a462456d125b98acf2fc0",
        applicability: "Только для указанной анкерной группы; значения не выводятся из объёма бетонного основания.",
        verified_at: "2026-09-17T00:00:00+06:00",
        guide_validation_policy: "REJECT_MISSING_PROJECT_SCHEDULE_DRAWING_OR_METHOD_STATEMENT_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  }),
));

export const ANCHOR_GROUP_INSTALLATION_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  "approved_anchor_group_schedule_reference",
  "structural_drawing_revision_reference",
  "method_statement_reference",
] as const);

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

export type AnchorGroupInstallationFormula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

export const ANCHOR_GROUP_INSTALLATION_FORMULAS:
readonly AnchorGroupInstallationFormula[] = Object.freeze([
  formula("anchor_group_count_v1", "piece", "anchor_group_count"),
  formula("anchor_bolt_quantity_v1", "piece", "anchor_group_count * bolts_per_group"),
  formula("thread_protection_cap_quantity_v1", "piece", "thread_protection_cap_quantity_piece"),
  formula("nut_quantity_v1", "piece", "nut_quantity_piece"),
  formula("washer_quantity_v1", "piece", "washer_quantity_piece"),
  formula("installation_template_quantity_v1", "piece", "installation_template_quantity_piece"),
  formula("fixing_accessory_quantity_v1", "set", "fixing_accessory_quantity_set"),
  formula("protective_material_quantity_v1", "kg", "protective_material_quantity_kg"),
  formula("welding_consumable_quantity_v1", "kg", "welding_consumable_quantity_kg"),
  formula("survey_setout_labor_v1", "man_hour", "survey_setout_worker_h"),
  formula("template_assembly_labor_v1", "man_hour", "template_assembly_worker_h"),
  formula("anchor_installation_alignment_labor_v1", "man_hour", "anchor_installation_alignment_worker_h"),
  formula("fixing_labor_v1", "man_hour", "fixing_worker_h"),
  formula("protective_application_labor_v1", "man_hour", "protective_application_worker_h"),
  formula("lifting_machine_time_v1", "machine_hour", "lifting_machine_h"),
  formula("welding_equipment_time_v1", "machine_hour", "welding_equipment_h"),
  formula("survey_equipment_time_v1", "machine_hour", "survey_equipment_h"),
  formula("geometry_control_service_v1", "service_hour", "geometry_control_service_h"),
  formula("acceptance_inspection_service_v1", "service_hour", "acceptance_inspection_service_h"),
  formula("documentation_package_v1", "document", "documentation_package_count"),
  formula("torque_tool_time_v1", "machine_hour", "torque_tool_machine_h"),
  formula("torque_control_service_v1", "service_hour", "torque_control_service_h"),
  formula("anchor_group_delivery_v1", "t_km", "delivered_anchor_group_mass_kg / 1000 * delivery_distance_km"),
  formula("temporary_brace_quantity_v1", "piece", "temporary_brace_quantity_piece"),
  formula("temporary_brace_labor_v1", "man_hour", "temporary_brace_worker_h"),
  formula("base_grout_quantity_v1", "kg", "base_grout_quantity_kg"),
  formula("base_grout_labor_v1", "man_hour", "base_grout_worker_h"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
const greaterThan = (parameterId: string, value: number) => ({ kind: "greater_than", parameterId, value });
const and = (...operands: Json[]) => ({ kind: "and", operands });

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
  derivedInputParameterIds?: string[];
  validationInputParameterIds?: string[];
  sourceRole?: string;
}): CanonicalEstimateResourceDefinition {
  const normativeTrace = [{
    sourceId: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
    source_id: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
    normId: ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
    norm_id: ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
    normVersion: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.source_document_version,
    source_title: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.source_title,
    exact_locator: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.exact_locator,
    source_definition_hash: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.definition_hash,
    sourceRole: input.sourceRole ?? "APPROVED_PROJECT_DOCUMENTATION",
  }];
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `anchor-group-installation:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    ...(input.derivedInputParameterIds ? {
      derivedInputParameterIds: input.derivedInputParameterIds,
    } : {}),
    ...(input.validationInputParameterIds ? {
      validationInputParameterIds: input.validationInputParameterIds,
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole ?? "APPROVED_PROJECT_DOCUMENTATION",
    normativeTrace,
    excludedUnownedAssumptions: [
      "ready-mix concrete quantity or contingency",
      "reinforcement kilograms per cubic metre",
      "formwork square metres per cubic metre",
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

const protective = equals("protective_system_applicable", true);
const welded = equals("welded_fixing_applicable", true);
const lifting = equals("lifting_equipment_applicable", true);
const torque = equals("torque_control_applicable", true);
const delivery = and(
  equals("delivery_pricing_mode", "SEPARATE"),
  greaterThan("delivered_anchor_group_mass_kg", 0),
  greaterThan("delivery_distance_km", 0),
);

export const ANCHOR_GROUP_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "material:anchor-group:anchor-bolts", ordinal: 0, section: "Материалы", category: "material", titleRu: "Анкерные болты по утверждённой спецификации", unitId: "piece", formulaId: "anchor_bolt_quantity_v1", procurementEligible: true, titleParameterIds: ["anchor_bolt_designation"], derivedInputParameterIds: ["anchor_group_count", "bolts_per_group"], validationInputParameterIds: ["anchor_bolt_quantity_piece"] }),
  resource({ rowId: "material:anchor-group:nuts", ordinal: 1, section: "Материалы", category: "material", titleRu: "Гайки анкерной группы", unitId: "piece", formulaId: "nut_quantity_v1", procurementEligible: true, titleParameterIds: ["nut_designation"] }),
  resource({ rowId: "material:anchor-group:washers", ordinal: 2, section: "Материалы", category: "material", titleRu: "Шайбы анкерной группы", unitId: "piece", formulaId: "washer_quantity_v1", procurementEligible: true, titleParameterIds: ["washer_designation"] }),
  resource({ rowId: "material:anchor-group:installation-template", ordinal: 3, section: "Материалы", category: "material", titleRu: "Установочный шаблон анкерной группы", unitId: "piece", formulaId: "installation_template_quantity_v1", procurementEligible: true, titleParameterIds: ["installation_template_designation"] }),
  resource({ rowId: "material:anchor-group:fixing-accessories", ordinal: 4, section: "Материалы", category: "material", titleRu: "Фиксаторы и крепёжные приспособления", unitId: "set", formulaId: "fixing_accessory_quantity_v1", procurementEligible: true, titleParameterIds: ["fixing_accessory_designation"] }),
  resource({ rowId: "material:anchor-group:protective-system", ordinal: 5, section: "Материалы", category: "material", titleRu: "Материал защитной системы анкеров", unitId: "kg", formulaId: "protective_material_quantity_v1", inclusionAst: protective, procurementEligible: true, titleParameterIds: ["protective_system_designation"] }),
  resource({ rowId: "material:anchor-group:welding-consumables", ordinal: 6, section: "Материалы", category: "material", titleRu: "Сварочные расходные материалы для фиксации", unitId: "kg", formulaId: "welding_consumable_quantity_v1", inclusionAst: welded, procurementEligible: true, titleParameterIds: ["welding_consumable_designation"] }),
  resource({ rowId: "work:anchor-group:survey-setout", ordinal: 7, section: "Работы", category: "construction_work", titleRu: "Геодезическая разбивка осей анкерной группы", unitId: "man_hour", formulaId: "survey_setout_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:anchor-group:template-assembly", ordinal: 8, section: "Работы", category: "construction_work", titleRu: "Сборка и установка шаблона", unitId: "man_hour", formulaId: "template_assembly_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:anchor-group:install-align", ordinal: 9, section: "Работы", category: "construction_work", titleRu: "Установка и выверка анкерных болтов", unitId: "man_hour", formulaId: "anchor_installation_alignment_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:anchor-group:fix", ordinal: 10, section: "Работы", category: "construction_work", titleRu: "Фиксация анкерной группы по ППР", unitId: "man_hour", formulaId: "fixing_labor_v1", procurementEligible: false }),
  resource({ rowId: "work:anchor-group:protect", ordinal: 11, section: "Работы", category: "construction_work", titleRu: "Защитная обработка анкеров", unitId: "man_hour", formulaId: "protective_application_labor_v1", inclusionAst: protective, procurementEligible: false }),
  resource({ rowId: "equipment:anchor-group:lifting", ordinal: 12, section: "Техника", category: "equipment", titleRu: "Подъёмное оборудование для анкерной группы", unitId: "machine_hour", formulaId: "lifting_machine_time_v1", inclusionAst: lifting, procurementEligible: true, titleParameterIds: ["lifting_equipment_designation"] }),
  resource({ rowId: "equipment:anchor-group:welding", ordinal: 13, section: "Техника", category: "equipment", titleRu: "Сварочное оборудование для проектной фиксации", unitId: "machine_hour", formulaId: "welding_equipment_time_v1", inclusionAst: welded, procurementEligible: true }),
  resource({ rowId: "equipment:anchor-group:survey", ordinal: 14, section: "Техника", category: "equipment", titleRu: "Геодезическое оборудование", unitId: "machine_hour", formulaId: "survey_equipment_time_v1", procurementEligible: true }),
  resource({ rowId: "equipment:anchor-group:torque-tool", ordinal: 15, section: "Техника", category: "equipment", titleRu: "Тарированный динамометрический инструмент", unitId: "machine_hour", formulaId: "torque_tool_time_v1", inclusionAst: torque, procurementEligible: true }),
  resource({ rowId: "service:anchor-group:geometry-control", ordinal: 16, section: "Услуги и контроль", category: "service", titleRu: "Геодезический контроль положения анкерной группы", unitId: "service_hour", formulaId: "geometry_control_service_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "service:anchor-group:acceptance", ordinal: 17, section: "Услуги и контроль", category: "service", titleRu: "Инженерная приёмка анкерной группы", unitId: "service_hour", formulaId: "acceptance_inspection_service_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "service:anchor-group:documents", ordinal: 18, section: "Услуги и контроль", category: "service", titleRu: "Комплект исполнительной документации", unitId: "document", formulaId: "documentation_package_v1", procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "service:anchor-group:torque-control", ordinal: 19, section: "Услуги и контроль", category: "service", titleRu: "Контроль затяжки соединений по проекту", unitId: "service_hour", formulaId: "torque_control_service_v1", inclusionAst: torque, procurementEligible: true, sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "delivery:anchor-group:supply", ordinal: 20, section: "Доставка", category: "delivery", titleRu: "Доставка комплекта анкерной группы", unitId: "t_km", formulaId: "anchor_group_delivery_v1", inclusionAst: delivery, procurementEligible: true, sourceRole: "SUPPLIER_ROUTE_AND_PACKING_LIST" }),
  resource({ rowId: "work:anchor-group:install-align-groups", ordinal: 21, section: "Работы", category: "construction_work", titleRu: "Установка и выверка анкерной группы по шаблону", unitId: "piece", formulaId: "anchor_group_count_v1", procurementEligible: false, sourceRole: "PROJECT_ANCHOR_GROUP_SCHEDULE" }),
  resource({ rowId: "material:anchor-group:thread-protection-caps", ordinal: 22, section: "Материалы", category: "material", titleRu: "Защитные колпачки резьбы анкерных болтов", unitId: "piece", formulaId: "thread_protection_cap_quantity_v1", procurementEligible: true, titleParameterIds: ["thread_protection_cap_designation"], sourceRole: "PROJECT_ANCHOR_GROUP_SCHEDULE" }),
  resource({ rowId: "material:anchor-group:temporary-braces", ordinal: 23, section: "Условные материалы", category: "material", titleRu: "Временные раскосы для фиксации анкерной группы", unitId: "piece", formulaId: "temporary_brace_quantity_v1", inclusionAst: equals("temporary_brace_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["temporary_brace_designation"], sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "work:anchor-group:temporary-braces", ordinal: 24, section: "Условные работы", category: "construction_work", titleRu: "Установка и снятие временных раскосов анкерной группы", unitId: "man_hour", formulaId: "temporary_brace_labor_v1", inclusionAst: equals("temporary_brace_mode", "REQUIRED"), procurementEligible: false, sourceRole: "PROJECT_METHOD_STATEMENT" }),
  resource({ rowId: "material:anchor-group:non-shrink-base-grout", ordinal: 25, section: "Условные материалы", category: "material", titleRu: "Безусадочная подливочная смесь под опорной деталью", unitId: "kg", formulaId: "base_grout_quantity_v1", inclusionAst: equals("base_grout_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["base_grout_designation"], sourceRole: "PROJECT_STRUCTURAL_DETAIL" }),
  resource({ rowId: "work:anchor-group:non-shrink-base-grout", ordinal: 26, section: "Условные работы", category: "construction_work", titleRu: "Устройство безусадочной подливки под опорной деталью", unitId: "man_hour", formulaId: "base_grout_labor_v1", inclusionAst: equals("base_grout_mode", "REQUIRED"), procurementEligible: false, sourceRole: "PROJECT_STRUCTURAL_DETAIL" }),
]);

const BASE_INPUT: Readonly<Record<string, InputValue>> = Object.freeze({
  product_profile_id: ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
  thread_protection_cap_designation: "Защитный колпачок резьбы по спецификации анкерной группы",
  nut_designation: "AG-NUT-PROJECT",
  washer_designation: "AG-WASHER-PROJECT",
  installation_template_designation: "AG-TEMPLATE-PROJECT",
  fixing_accessory_designation: "AG-FIXTURE-PROJECT",
  protective_system_applicable: true,
  protective_system_designation: "AG-PROTECTION-PROJECT",
  welded_fixing_applicable: false,
  welding_consumable_designation: "NOT_APPLICABLE:METHOD_STATEMENT_HAS_NO_WELDED_FIXING",
  welding_consumable_quantity_kg: 0,
  lifting_equipment_applicable: false,
  lifting_equipment_designation: "NOT_APPLICABLE:MANUAL_HANDLING_CONFIRMED_BY_METHOD_STATEMENT",
  lifting_machine_h: 0,
  welding_equipment_h: 0,
  delivery_pricing_mode: "SEPARATE",
  torque_control_applicable: false,
  torque_tool_machine_h: 0,
  torque_control_service_h: 0,
  temporary_brace_mode: "NOT_REQUIRED",
  base_grout_mode: "NOT_REQUIRED",
});

const PROJECT_SCHEDULES: Readonly<Record<
AnchorGroupInstallationContextKey,
Readonly<Record<string, InputValue>>
>> = Object.freeze({
  standard: { anchor_bolt_designation: "AG-M24-STD", anchor_bolt_quantity_piece: 16, nut_quantity_piece: 32, washer_quantity_piece: 32, installation_template_quantity_piece: 1, fixing_accessory_quantity_set: 1, protective_material_quantity_kg: 2.4, survey_setout_worker_h: 4, template_assembly_worker_h: 6, anchor_installation_alignment_worker_h: 12, fixing_worker_h: 5, protective_application_worker_h: 3, survey_equipment_h: 3, geometry_control_service_h: 3, acceptance_inspection_service_h: 2, documentation_package_count: 1, delivered_anchor_group_mass_kg: 420, delivery_distance_km: 18 },
  high_load: { anchor_bolt_designation: "AG-M42-HL", anchor_bolt_quantity_piece: 48, nut_quantity_piece: 96, washer_quantity_piece: 96, installation_template_quantity_piece: 3, fixing_accessory_quantity_set: 3, protective_material_quantity_kg: 9.5, welded_fixing_applicable: true, welding_consumable_designation: "AG-WELD-HL-PROJECT", welding_consumable_quantity_kg: 7.2, survey_setout_worker_h: 10, template_assembly_worker_h: 28, anchor_installation_alignment_worker_h: 54, fixing_worker_h: 26, protective_application_worker_h: 12, lifting_equipment_applicable: true, lifting_equipment_designation: "Автокран по ППР AG-HL", lifting_machine_h: 12, welding_equipment_h: 10, survey_equipment_h: 8, geometry_control_service_h: 8, acceptance_inspection_service_h: 6, documentation_package_count: 2, delivered_anchor_group_mass_kg: 2_850, delivery_distance_km: 34, torque_control_applicable: true, torque_tool_machine_h: 5, torque_control_service_h: 5 },
  large_area: { anchor_bolt_designation: "AG-M30-LA", anchor_bolt_quantity_piece: 96, nut_quantity_piece: 192, washer_quantity_piece: 192, installation_template_quantity_piece: 8, fixing_accessory_quantity_set: 8, protective_material_quantity_kg: 16, welded_fixing_applicable: true, welding_consumable_designation: "AG-WELD-LA-PROJECT", welding_consumable_quantity_kg: 11, survey_setout_worker_h: 18, template_assembly_worker_h: 44, anchor_installation_alignment_worker_h: 82, fixing_worker_h: 38, protective_application_worker_h: 20, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР AG-LA", lifting_machine_h: 18, welding_equipment_h: 16, survey_equipment_h: 14, geometry_control_service_h: 14, acceptance_inspection_service_h: 10, documentation_package_count: 4, delivered_anchor_group_mass_kg: 4_600, delivery_distance_km: 42 },
  small_area: { anchor_bolt_designation: "AG-M20-SA", anchor_bolt_quantity_piece: 8, nut_quantity_piece: 16, washer_quantity_piece: 16, installation_template_quantity_piece: 1, fixing_accessory_quantity_set: 1, protective_material_quantity_kg: 1.2, survey_setout_worker_h: 2, template_assembly_worker_h: 3, anchor_installation_alignment_worker_h: 6, fixing_worker_h: 3, protective_application_worker_h: 1.5, survey_equipment_h: 1.5, geometry_control_service_h: 1.5, acceptance_inspection_service_h: 1, documentation_package_count: 1, delivered_anchor_group_mass_kg: 160, delivery_distance_km: 10 },
  technical_room: { anchor_bolt_designation: "AG-M24-TR", anchor_bolt_quantity_piece: 20, nut_quantity_piece: 40, washer_quantity_piece: 40, installation_template_quantity_piece: 2, fixing_accessory_quantity_set: 2, protective_material_quantity_kg: 3.5, welded_fixing_applicable: true, welding_consumable_designation: "AG-WELD-TR-PROJECT", welding_consumable_quantity_kg: 2.2, survey_setout_worker_h: 5, template_assembly_worker_h: 9, anchor_installation_alignment_worker_h: 18, fixing_worker_h: 9, protective_application_worker_h: 4, welding_equipment_h: 4, survey_equipment_h: 4, geometry_control_service_h: 4, acceptance_inspection_service_h: 3, documentation_package_count: 1, delivered_anchor_group_mass_kg: 620, delivery_distance_km: 20, torque_control_applicable: true, torque_tool_machine_h: 3, torque_control_service_h: 3 },
  wet_zone: { anchor_bolt_designation: "AG-M30-WZ", anchor_bolt_quantity_piece: 24, nut_quantity_piece: 48, washer_quantity_piece: 48, installation_template_quantity_piece: 2, fixing_accessory_quantity_set: 2, protective_system_designation: "AG-WZ-PROTECTION-PROJECT", protective_material_quantity_kg: 7.5, survey_setout_worker_h: 6, template_assembly_worker_h: 12, anchor_installation_alignment_worker_h: 24, fixing_worker_h: 11, protective_application_worker_h: 10, lifting_equipment_applicable: true, lifting_equipment_designation: "Кран-манипулятор по ППР AG-WZ", lifting_machine_h: 6, survey_equipment_h: 5, geometry_control_service_h: 5, acceptance_inspection_service_h: 4, documentation_package_count: 2, delivered_anchor_group_mass_kg: 1_150, delivery_distance_km: 26, torque_control_applicable: true, torque_tool_machine_h: 3, torque_control_service_h: 3 },
});

const GROUP_GEOMETRY: Readonly<Record<
AnchorGroupInstallationContextKey,
Readonly<{ anchor_group_count: number; bolts_per_group: number }>
>> = Object.freeze({
  standard: { anchor_group_count: 4, bolts_per_group: 4 },
  high_load: { anchor_group_count: 8, bolts_per_group: 6 },
  large_area: { anchor_group_count: 16, bolts_per_group: 6 },
  small_area: { anchor_group_count: 2, bolts_per_group: 4 },
  technical_room: { anchor_group_count: 5, bolts_per_group: 4 },
  wet_zone: { anchor_group_count: 6, bolts_per_group: 4 },
});

export function anchorGroupInstallationAcceptanceInputR1(
  contextKey: AnchorGroupInstallationContextKey,
): Readonly<Record<string, InputValue>> {
  const target = ANCHOR_GROUP_INSTALLATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`ANCHOR_GROUP_INSTALLATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const geometry = GROUP_GEOMETRY[contextKey];
  return Object.freeze({
    ...BASE_INPUT,
    ...PROJECT_SCHEDULES[contextKey],
    ...geometry,
    thread_protection_cap_quantity_piece:
      geometry.anchor_group_count * geometry.bolts_per_group,
    approved_anchor_group_schedule_reference: `AGS-${reference}-REV-A`,
    structural_drawing_revision_reference: `STR-AG-${reference}-REV-A`,
    method_statement_reference: `MS-AG-${reference}-REV-A`,
  });
}

export async function compileAnchorGroupInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ANCHOR_GROUP_INSTALLATION_TARGETS[0].catalogId;
  if (!ANCHOR_GROUP_INSTALLATION_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`ANCHOR_GROUP_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const normalizedParameters = { ...submittedParameters };
  const groupCount = Number(normalizedParameters.anchor_group_count);
  const boltsPerGroup = Number(normalizedParameters.bolts_per_group);
  if (Number.isFinite(groupCount) && Number.isFinite(boltsPerGroup)) {
    const derivedBoltQuantity = groupCount * boltsPerGroup;
    const suppliedBoltQuantity = normalizedParameters.anchor_bolt_quantity_piece;
    if (suppliedBoltQuantity == null) {
      normalizedParameters.anchor_bolt_quantity_piece = derivedBoltQuantity;
    } else if (Number.isFinite(Number(suppliedBoltQuantity))
      && Math.abs(Number(suppliedBoltQuantity) - derivedBoltQuantity) > 1e-9) {
      throw Object.assign(new Error(
        "ANCHOR_GROUP_INSTALLATION_BOLT_QUANTITY_MISMATCH",
      ), { code: "PARAMETER_VALIDATION_FAILED" });
    }
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.anchor-group-installation-r1",
    catalogId,
    primaryMeasureParameterId: "anchor_group_count",
    parameterDefinitions: [...ANCHOR_GROUP_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...ANCHOR_GROUP_INSTALLATION_FORMULAS],
    resourceDefinitions: [...ANCHOR_GROUP_INSTALLATION_RESOURCES],
    submittedParameters: normalizedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 28,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const ANCHOR_GROUP_INSTALLATION_SOURCE_METADATA = Object.freeze({
  sourceId: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  normId: ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  productProfileId: ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
  formula: "explicit approved project quantities; delivery mass / 1000 * distance",
  previousReadyMixFactorRejected: true,
  previousReinforcementKgPerM3Rejected: true,
  previousFormworkM2PerM3Rejected: true,
  automaticLaborProductivityRejected: true,
  automaticEquipmentProductivityRejected: true,
});
