import type { CanonicalEstimateParameterDefinition } from "../backendPlatform/canonicalEstimateCompileCore";

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

