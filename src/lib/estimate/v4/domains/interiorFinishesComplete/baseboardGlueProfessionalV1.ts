import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
} from "../../professionalProjectAssemblyV4";
import {
  FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
  type ProfessionalDomainParameterDefinitionV1,
  type ProfessionalDomainParameterSchemaV1,
  type ProfessionalNormativeProfileV1,
  type ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import {
  INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
  type InteriorFinishesDomainInventoryRow,
} from "./inventory";

export const BASEBOARD_GLUE_PROJECT_SPECIFIED_PROFILE_MODE = "PROJECT_SPECIFIED_OTHER" as const;
export const BASEBOARD_GLUE_FORBO_232_PROFILE_MODE = "FORBO_EUROCOL_232" as const;

const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = {
  kind: "EQUALS",
  parameter_id: "estimate_scope_mode",
  value: "FULL_APPLICABLE_SCOPE",
} as const;
const FORBO_ONLY = {
  kind: "EQUALS",
  parameter_id: "adhesive_profile_mode",
  value: BASEBOARD_GLUE_FORBO_232_PROFILE_MODE,
} as const;
const PROJECT_SPECIFIED_ONLY = {
  kind: "EQUALS",
  parameter_id: "adhesive_profile_mode",
  value: BASEBOARD_GLUE_PROJECT_SPECIFIED_PROFILE_MODE,
} as const;
const BOTH_SCOPES = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const;
const FULL_SCOPE = ["FULL_APPLICABLE_SCOPE"] as const;
const KG_RESOURCE_SOURCE_ID = "kg_krer_2015_application_guidance" as const;

type BaseboardGlueProfessionalPackagePartsV1 = {
  contract: { group: string; variant: string; method_prefix: string };
  output: { dimension: string; unit_id: string };
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

function isBaseboardGlue(inventory: InteriorFinishesDomainInventoryRow): boolean {
  return inventory.source_domain_id === "flooring" &&
    inventory.work_type === "glue" &&
    inventory.work_key.includes("_baseboard_glue_");
}

function parameter(
  parameterId: string,
  labelRu: string,
  inputType: ProfessionalDomainParameterDefinitionV1["input_type"],
  priority: ProfessionalDomainParameterDefinitionV1["priority"],
  unitId: string | null,
  formulaConsumers: readonly string[],
  options: {
    minimum?: number;
    maximum?: number;
    choices?: readonly { value: string; label_ru: string }[];
    condition?: ProfessionalDomainParameterDefinitionV1["required_when"];
  } = {},
): ProfessionalDomainParameterDefinitionV1 {
  const condition = options.condition ?? ALWAYS;
  return {
    parameter_id: parameterId,
    label_ru: labelRu,
    input_type: inputType,
    priority,
    unit_id: unitId,
    ...(options.minimum == null ? {} : { minimum: options.minimum }),
    ...(options.maximum == null ? {} : { maximum: options.maximum }),
    ...(options.choices ? { choices: options.choices } : {}),
    visible_when: condition,
    required_when: condition,
    formula_consumers: formulaConsumers,
    source_ownership: [
      "USER_EXPLICIT",
      "PROJECT_DOCUMENT",
      "MATERIAL_PASSPORT",
      "APPLICABLE_NORM",
      "VERIFIED_RATEBOOK",
      "VISIBLE_BASELINE_ASSUMPTION",
    ],
  };
}

function assemblyParameter(
  parameterId: string,
  titleRu: string,
  role: ProfessionalAssemblyParameterDefinitionV4["role"],
  unitId: string | null,
  requiredFor: ProfessionalAssemblyParameterDefinitionV4["required_for"],
): ProfessionalAssemblyParameterDefinitionV4 {
  return { parameter_id: parameterId, title_ru: titleRu, role, unit_id: unitId, required_for: requiredFor };
}

function formula(
  formulaId: string,
  expression: string,
  inputParameterIds: readonly string[],
  outputUnitId: string,
  calculate: ProfessionalAssemblyFormulaV4["calculate"],
): ProfessionalAssemblyFormulaV4 {
  return {
    formula_id: formulaId,
    expression,
    input_parameter_ids: inputParameterIds,
    output_unit_id: outputUnitId,
    calculate,
  };
}

function row(
  inventory: InteriorFinishesDomainInventoryRow,
  rowId: string,
  section: string,
  category: ProfessionalAssemblyRowDefinitionV4["category"],
  titleRu: string,
  rowFormula: ProfessionalAssemblyFormulaV4,
  normativeSourceIds: readonly string[],
  inclusionCondition = "work_included=true",
): ProfessionalAssemblyRowDefinitionV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    row_id: `${technologyId}:baseboard-glue-v1:row:${rowId}`,
    section,
    category,
    title_ru: titleRu,
    formula: rowFormula,
    cost_ownership: "priced_resource",
    cost_owner_id: `${technologyId}:baseboard-glue-v1:cost-owner:${rowId}`,
    semantic_owner: `${technologyId}:baseboard-glue-v1:semantic-owner:${rowId}`,
    normative_source_ids: normativeSourceIds,
    inclusion_condition: inclusionCondition,
    procurement_eligible: ["material", "transport"].includes(category),
  };
}

function schema(inventory: InteriorFinishesDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const technologyId = inventory.canonical_technology_id;
  return {
    schema_id: `${technologyId}:baseboard-glue-parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: technologyId,
    parameters: [
      parameter("work_included", "Приклеивание плинтуса включено в проект", "boolean", "P0", null, [], {
        choices: [{ value: "true", label_ru: "Да" }, { value: "false", label_ru: "Нет" }],
      }),
      parameter("estimate_scope_mode", "Состав расчёта", "choice", "P0", null, [], { choices: [
        { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно выбранный состав" },
        { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый профессиональный состав" },
      ] }),
      parameter("scope_capability", "Условия участка", "choice", "P0", null, [], {
        choices: [{ value: inventory.scope_capability, label_ru: inventory.scope_capability }],
      }),
      parameter("funding_source", "Источник финансирования проекта", "choice", "P0", null, [], { choices: [
        { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
        { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
        { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
      ] }),
      parameter("project_type", "Тип объекта по проекту", "text", "P0", null, []),
      parameter("skirting_length_linear_m", "Измеренная длина приклеиваемого плинтуса", "number", "P0", "m", [
        "baseboard_installation_labor",
        "application_equipment",
        "project_specified_adhesive",
        "preparation_labor",
        "protective_consumables",
        "quality_tests",
      ], { minimum: 0.01, maximum: 1_000_000 }),
      parameter("adhesive_profile_mode", "Профиль монтажного клея", "choice", "P0", null, [], { choices: [
        { value: BASEBOARD_GLUE_PROJECT_SPECIFIED_PROFILE_MODE, label_ru: "Иной клей по проекту и паспорту" },
        { value: BASEBOARD_GLUE_FORBO_232_PROFILE_MODE, label_ru: "Forbo Eurocol 232 Eurosol Montage" },
      ] }),
      parameter("product_profile_id", "Паспорт выбранного монтажного клея", "text", "P0", null, []),
      parameter("selected_adhesive_product", "Точное наименование выбранного монтажного клея", "text", "P0", null, []),
      parameter("skirting_material", "Материал плинтуса", "choice", "P0", null, [], { choices: [
        { value: "PROJECT_SPECIFIED", label_ru: "По проекту" },
        { value: "wood", label_ru: "Дерево" },
        { value: "rigid_pvc", label_ru: "Жёсткий ПВХ" },
      ] }),
      parameter("substrate_type", "Материал основания", "choice", "P0", null, [], { choices: [
        { value: "PROJECT_SPECIFIED", label_ru: "По проекту" },
        { value: "concrete", label_ru: "Бетон" },
        { value: "wood_material", label_ru: "Древесный материал" },
        { value: "clean_metal", label_ru: "Очищенный металл" },
      ] }),
      parameter("adhesive_consumption_ml_linear_m", "Расход монтажного клея на один метр плинтуса", "number", "P0", "ml_per_m", [
        "project_specified_adhesive",
      ], { minimum: 0.001, maximum: 10_000 }),
      parameter("adhesive_cartridge_size_ml", "Объём выбранного картриджа проектного клея", "number", "P0", "ml", [
        "project_specified_adhesive",
      ], { minimum: 1, maximum: 100_000, condition: PROJECT_SPECIFIED_ONLY }),
      parameter("normative_rate_code", "Код применимой ресурсной нормы", "text", "P0", null, []),
      parameter("labor_productivity_linear_m_per_man_hour", "Производительность приклеивания плинтуса", "number", "P0", "m_per_man_hour", [
        "baseboard_installation_labor",
      ], { minimum: 0.01, maximum: 100_000 }),
      parameter("equipment_productivity_linear_m_per_machine_hour", "Производительность монтажного инструмента", "number", "P0", "m_per_machine_hour", [
        "application_equipment",
      ], { minimum: 0.01, maximum: 100_000 }),
      parameter("forbo_adhesive_procurement_quantity_ml", "Закупочное количество Forbo 232 после округления картриджей", "number", "P2", "ml", [
        "forbo_232_adhesive",
      ], { minimum: 310, maximum: 1_000_000_000, condition: FORBO_ONLY }),
      parameter("substrate_ready_confirmed", "Основание прочное, сухое, ровное, очищенное и готово к приклеиванию", "boolean", "P1", null, [], {
        condition: FORBO_ONLY,
      }),
      parameter("processing_conditions_confirmed", "Температура и влажность соответствуют инструкции Forbo 232", "boolean", "P1", null, [], {
        condition: FORBO_ONLY,
      }),
      parameter("ventilation_fire_controls_confirmed", "Подтверждены вентиляция и меры для огнеопасного растворителя", "boolean", "P1", null, [], {
        condition: FORBO_ONLY,
      }),
      parameter("manufacturer_instruction_reference", "Ссылка на применённую инструкцию Forbo 232", "text", "P1", null, [], {
        condition: FORBO_ONLY,
      }),
      parameter("preparation_productivity_linear_m_per_man_hour", "Производительность подготовки линии основания", "number", "P1", "m_per_man_hour", [
        "preparation_labor",
      ], { minimum: 0.01, maximum: 100_000, condition: FULL_ONLY }),
      parameter("protective_consumables_rate_kg_linear_m", "Расход защитных и очистных материалов", "number", "P1", "kg_per_m", [
        "protective_consumables",
      ], { minimum: 0.001, maximum: 100, condition: FULL_ONLY }),
      parameter("adhesive_density_kg_l", "Плотность выбранного монтажного клея", "number", "P1", "kg_per_l", [
        "project_specified_transport_t_km", "project_specified_delivery_trips",
        "forbo_transport_t_km", "forbo_delivery_trips",
      ], { minimum: 0.01, maximum: 10, condition: FULL_ONLY }),
      parameter("delivery_distance_km", "Расстояние доставки монтажного клея", "number", "P1", "km", [
        "project_specified_transport_t_km", "forbo_transport_t_km",
      ], { minimum: 0.1, maximum: 5_000, condition: FULL_ONLY }),
      parameter("truck_payload_t", "Грузоподъёмность транспорта", "number", "P1", "t", [
        "project_specified_delivery_trips", "forbo_delivery_trips",
      ], { minimum: 0.1, maximum: 100, condition: FULL_ONLY }),
      parameter("qa_interval_linear_m_per_test", "Длина линии на одну контрольную проверку", "number", "P1", "m_per_test", [
        "quality_tests",
      ], { minimum: 0.01, maximum: 1_000_000, condition: FULL_ONLY }),
      parameter("documentation_record_count", "Количество актов и записей контроля", "number", "P1", "item", [
        "documentation_records",
      ], { minimum: 1, maximum: 10_000, condition: FULL_ONLY }),
    ],
    quantity_alternatives: [["skirting_length_linear_m"]],
  };
}

function mainAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:baseboard-glue-main-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:baseboard-glue-main-assembly:v1`,
    title_ru: `Линейные операции: ${inventory.localized_name_ru}`,
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: BOTH_SCOPES,
    parameters: [
      assemblyParameter("work_included", "Работа включена", "SCOPE_TRIGGER", null, BOTH_SCOPES),
      assemblyParameter("skirting_length_linear_m", "Длина плинтуса", "PROJECT_QUANTITY", "m", BOTH_SCOPES),
      assemblyParameter("labor_productivity_linear_m_per_man_hour", "Производительность труда", "NORM_RATE", "m_per_man_hour", BOTH_SCOPES),
      assemblyParameter("equipment_productivity_linear_m_per_machine_hour", "Производительность инструмента", "NORM_RATE", "m_per_machine_hour", BOTH_SCOPES),
    ],
    rows: [
      row(inventory, "baseboard_installation_labor", "Труд рабочих", "labor", "Приклеивание плинтуса по измеренной длине", formula(
        `${technologyId}:baseboard-glue-labor:v1`,
        "skirting_length_linear_m / labor_productivity_linear_m_per_man_hour",
        ["skirting_length_linear_m", "labor_productivity_linear_m_per_man_hour"],
        "man_hour",
        (values) => values.skirting_length_linear_m / values.labor_productivity_linear_m_per_man_hour,
      ), [KG_RESOURCE_SOURCE_ID]),
      row(inventory, "application_equipment", "Машины и механизмы", "equipment", "Монтажный инструмент для приклеивания плинтуса", formula(
        `${technologyId}:baseboard-glue-equipment:v1`,
        "skirting_length_linear_m / equipment_productivity_linear_m_per_machine_hour",
        ["skirting_length_linear_m", "equipment_productivity_linear_m_per_machine_hour"],
        "machine_hour",
        (values) => values.skirting_length_linear_m / values.equipment_productivity_linear_m_per_machine_hour,
      ), [KG_RESOURCE_SOURCE_ID]),
    ],
  };
}

function projectSpecifiedAdhesiveAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  const procurement = (values: Readonly<Record<string, number>>) => Math.ceil(
    values.skirting_length_linear_m * values.adhesive_consumption_ml_linear_m /
    values.adhesive_cartridge_size_ml - 1e-9,
  ) * values.adhesive_cartridge_size_ml;
  return {
    child_passport_id: `${technologyId}:project-specified-adhesive-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:project-specified-adhesive-assembly:v1`,
    title_ru: "Монтажный клей по проектной спецификации",
    scope_trigger_parameter: "adhesive_profile_mode",
    scope_trigger_values: [BASEBOARD_GLUE_PROJECT_SPECIFIED_PROFILE_MODE],
    supported_scope_modes: BOTH_SCOPES,
    parameters: [
      assemblyParameter("skirting_length_linear_m", "Длина плинтуса", "PROJECT_QUANTITY", "m", BOTH_SCOPES),
      assemblyParameter("adhesive_consumption_ml_linear_m", "Расход клея", "MATERIAL_PASSPORT_VALUE", "ml_per_m", BOTH_SCOPES),
      assemblyParameter("adhesive_cartridge_size_ml", "Объём картриджа", "MATERIAL_PASSPORT_VALUE", "ml", BOTH_SCOPES),
      assemblyParameter("adhesive_density_kg_l", "Плотность клея", "MATERIAL_PASSPORT_VALUE", "kg_per_l", FULL_SCOPE),
      assemblyParameter("delivery_distance_km", "Расстояние доставки", "LOGISTICS_VALUE", "km", FULL_SCOPE),
      assemblyParameter("truck_payload_t", "Грузоподъёмность транспорта", "LOGISTICS_VALUE", "t", FULL_SCOPE),
    ],
    rows: [
      row(inventory, "project_specified_adhesive", "Основные материалы", "material", "Монтажный клей выбранной проектной системы", formula(
        `${technologyId}:project-specified-adhesive:v1`,
        "ceil((skirting_length_linear_m * adhesive_consumption_ml_linear_m) / adhesive_cartridge_size_ml) * adhesive_cartridge_size_ml",
        ["skirting_length_linear_m", "adhesive_consumption_ml_linear_m", "adhesive_cartridge_size_ml"],
        "ml",
        procurement,
      ), [KG_RESOURCE_SOURCE_ID]),
      row(inventory, "project_specified_transport_t_km", "Транспорт", "transport", "Транспортная работа по доставке монтажного клея", formula(
        `${technologyId}:project-specified-adhesive-transport:v1`,
        "(procurement_ml / 1000 * adhesive_density_kg_l / 1000) * delivery_distance_km",
        ["skirting_length_linear_m", "adhesive_consumption_ml_linear_m", "adhesive_cartridge_size_ml", "adhesive_density_kg_l", "delivery_distance_km"],
        "t_km",
        (values) => procurement(values) / 1000 * values.adhesive_density_kg_l / 1000 * values.delivery_distance_km,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "project_specified_delivery_trips", "Транспорт", "transport", "Рейсы доставки монтажного клея", formula(
        `${technologyId}:project-specified-adhesive-trips:v1`,
        "ceil((procurement_ml / 1000 * adhesive_density_kg_l / 1000) / truck_payload_t)",
        ["skirting_length_linear_m", "adhesive_consumption_ml_linear_m", "adhesive_cartridge_size_ml", "adhesive_density_kg_l", "truck_payload_t"],
        "trip",
        (values) => Math.ceil(procurement(values) / 1000 * values.adhesive_density_kg_l / 1000 / values.truck_payload_t),
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
    ],
  };
}

function forboAdhesiveAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:forbo-232-adhesive-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:forbo-232-adhesive-assembly:v1`,
    title_ru: "Forbo Eurocol 232 Eurosol Montage, картридж 310 мл",
    scope_trigger_parameter: "adhesive_profile_mode",
    scope_trigger_values: [BASEBOARD_GLUE_FORBO_232_PROFILE_MODE],
    supported_scope_modes: BOTH_SCOPES,
    parameters: [
      assemblyParameter("forbo_adhesive_procurement_quantity_ml", "Закупочное количество Forbo 232", "NORM_RATE", "ml", BOTH_SCOPES),
      assemblyParameter("adhesive_density_kg_l", "Плотность клея", "MATERIAL_PASSPORT_VALUE", "kg_per_l", FULL_SCOPE),
      assemblyParameter("delivery_distance_km", "Расстояние доставки", "LOGISTICS_VALUE", "km", FULL_SCOPE),
      assemblyParameter("truck_payload_t", "Грузоподъёмность транспорта", "LOGISTICS_VALUE", "t", FULL_SCOPE),
    ],
    rows: [
      row(inventory, "forbo_232_adhesive", "Основные материалы", "material", "Forbo Eurocol 232 Eurosol Montage, картриджи 310 мл", formula(
        `${technologyId}:forbo-232-adhesive:v1`,
        "forbo_adhesive_procurement_quantity_ml",
        ["forbo_adhesive_procurement_quantity_ml"],
        "ml",
        (values) => values.forbo_adhesive_procurement_quantity_ml,
      ), [FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID]),
      row(inventory, "forbo_transport_t_km", "Транспорт", "transport", "Транспортная работа по доставке Forbo 232", formula(
        `${technologyId}:forbo-232-adhesive-transport:v1`,
        "(forbo_adhesive_procurement_quantity_ml / 1000 * adhesive_density_kg_l / 1000) * delivery_distance_km",
        ["forbo_adhesive_procurement_quantity_ml", "adhesive_density_kg_l", "delivery_distance_km"],
        "t_km",
        (values) => values.forbo_adhesive_procurement_quantity_ml / 1000 * values.adhesive_density_kg_l / 1000 * values.delivery_distance_km,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "forbo_delivery_trips", "Транспорт", "transport", "Рейсы доставки Forbo 232", formula(
        `${technologyId}:forbo-232-adhesive-trips:v1`,
        "ceil((forbo_adhesive_procurement_quantity_ml / 1000 * adhesive_density_kg_l / 1000) / truck_payload_t)",
        ["forbo_adhesive_procurement_quantity_ml", "adhesive_density_kg_l", "truck_payload_t"],
        "trip",
        (values) => Math.ceil(values.forbo_adhesive_procurement_quantity_ml / 1000 * values.adhesive_density_kg_l / 1000 / values.truck_payload_t),
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
    ],
  };
}

function fullAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:baseboard-glue-full-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:baseboard-glue-full-assembly:v1`,
    title_ru: `Полный линейный состав: ${inventory.localized_name_ru}`,
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: FULL_SCOPE,
    parameters: [
      assemblyParameter("work_included", "Работа включена", "SCOPE_TRIGGER", null, FULL_SCOPE),
      assemblyParameter("skirting_length_linear_m", "Длина плинтуса", "PROJECT_QUANTITY", "m", FULL_SCOPE),
      assemblyParameter("preparation_productivity_linear_m_per_man_hour", "Производительность подготовки", "NORM_RATE", "m_per_man_hour", FULL_SCOPE),
      assemblyParameter("protective_consumables_rate_kg_linear_m", "Расход защитных материалов", "MATERIAL_PASSPORT_VALUE", "kg_per_m", FULL_SCOPE),
      assemblyParameter("qa_interval_linear_m_per_test", "Интервал контроля", "CONTROL_PLAN_VALUE", "m_per_test", FULL_SCOPE),
      assemblyParameter("documentation_record_count", "Количество записей", "CONTROL_PLAN_VALUE", "item", FULL_SCOPE),
    ],
    rows: [
      row(inventory, "preparation_labor", "Подготовка основания", "labor", "Подготовка линейного основания перед приклеиванием плинтуса", formula(
        `${technologyId}:baseboard-glue-preparation:v1`,
        "skirting_length_linear_m / preparation_productivity_linear_m_per_man_hour",
        ["skirting_length_linear_m", "preparation_productivity_linear_m_per_man_hour"],
        "man_hour",
        (values) => values.skirting_length_linear_m / values.preparation_productivity_linear_m_per_man_hour,
      ), [KG_RESOURCE_SOURCE_ID]),
      row(inventory, "protective_consumables", "Защита и расходники", "material", "Защитные и очистные материалы для линии плинтуса", formula(
        `${technologyId}:baseboard-glue-protective-consumables:v1`,
        "skirting_length_linear_m * protective_consumables_rate_kg_linear_m",
        ["skirting_length_linear_m", "protective_consumables_rate_kg_linear_m"],
        "kg",
        (values) => values.skirting_length_linear_m * values.protective_consumables_rate_kg_linear_m,
      ), [KG_RESOURCE_SOURCE_ID]),
      row(inventory, "quality_tests", "Контроль качества", "testing", "Контроль основания и приклеенной линии плинтуса", formula(
        `${technologyId}:baseboard-glue-quality-tests:v1`,
        "ceil(skirting_length_linear_m / qa_interval_linear_m_per_test)",
        ["skirting_length_linear_m", "qa_interval_linear_m_per_test"],
        "test",
        (values) => Math.ceil(values.skirting_length_linear_m / values.qa_interval_linear_m_per_test),
      ), [KG_RESOURCE_SOURCE_ID]),
      row(inventory, "documentation_records", "Исполнительная документация", "documentation", "Акты, паспорт клея и записи контроля", formula(
        `${technologyId}:baseboard-glue-documentation:v1`,
        "documentation_record_count",
        ["documentation_record_count"],
        "item",
        (values) => values.documentation_record_count,
      ), [KG_RESOURCE_SOURCE_ID]),
    ],
  };
}

export function buildBaseboardGlueProfessionalPackagePartsV1(
  inventory: InteriorFinishesDomainInventoryRow,
): BaseboardGlueProfessionalPackagePartsV1 | null {
  if (!isBaseboardGlue(inventory)) return null;
  const technologyId = inventory.canonical_technology_id;
  const childAssemblies = [
    mainAssembly(inventory),
    projectSpecifiedAdhesiveAssembly(inventory),
    forboAdhesiveAssembly(inventory),
    fullAssembly(inventory),
  ] as const;
  return {
    contract: {
      group: "BASEBOARD_GLUE",
      variant: inventory.scope_capability,
      method_prefix: "BASEBOARD_GLUE_PROFESSIONAL_OVERLAY",
    },
    output: { dimension: "LINEAR", unit_id: "m" },
    schema: schema(inventory),
    child_assemblies: childAssemblies,
    normative_profile: {
      profile_id: `${technologyId}:baseboard-glue-kg-resource-profile:v1`,
      profile_version: "1.0.0",
      technology_id: technologyId,
      jurisdiction: "KG",
      requested_source_ids: [KG_RESOURCE_SOURCE_ID],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
      rejected_foreign_source_ids: ["ru_gesn_11", "ru_fer_11"],
    },
    required_stages: [
      "BASE_ACCEPTANCE",
      "LINEAR_SETTING_OUT",
      "ADHESIVE_APPLICATION",
      "SKIRTING_INSTALLATION",
      "BOND_CONTROL",
      `SCOPE_${inventory.scope_capability.toUpperCase()}`,
    ],
    optional_stages: ["LOCAL_SUBSTRATE_REPAIR"],
    resource_policy: {
      policy_id: `${technologyId}:baseboard-glue-resource-policy:v1`,
      technology_id: technologyId,
      required_categories: ["material", "labor", "equipment", "testing", "documentation"],
      optional_categories: ["transport", "waste", "subcontract_service", "temporary_work"],
      forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ"],
      one_bundle_resource_replacement_forbidden: true,
    },
  };
}
