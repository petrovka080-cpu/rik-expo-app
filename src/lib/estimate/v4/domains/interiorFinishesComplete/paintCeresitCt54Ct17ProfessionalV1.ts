import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
} from "../../professionalProjectAssemblyV4";
import {
  CERESIT_CT17_PAINT_PRIMER_SOURCE_ID,
  CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
  CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
  type ProfessionalDomainParameterDefinitionV1,
  type ProfessionalDomainParameterSchemaV1,
  type ProfessionalNormativeProfileV1,
  type ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import {
  INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
  type InteriorFinishesDomainInventoryRow,
} from "./inventory";

const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = { kind: "EQUALS", parameter_id: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" } as const;
const CERESIT_WALL_SYSTEM_ONLY = {
  kind: "EQUALS",
  parameter_id: "product_profile_id",
  value: CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
} as const;
const BOTH_SCOPES = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const;
const FULL_SCOPE = ["FULL_APPLICABLE_SCOPE"] as const;
const KG_RESOURCE_SOURCE_ID = "kg_krer_2015_application_guidance" as const;

type PaintCeresitPackagePartsV1 = {
  contract: { group: string; variant: string; method_prefix: string };
  output: { dimension: string; unit_id: string };
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

function isExactWallPaintTarget(inventory: InteriorFinishesDomainInventoryRow): boolean {
  return inventory.source_domain_id === "plaster_paint" &&
    inventory.work_type === "paint" &&
    inventory.scope_capability === "standard" &&
    inventory.work_key === "plaster_paint_interior_paint_wall_paint_standard";
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
  return { formula_id: formulaId, expression, input_parameter_ids: inputParameterIds, output_unit_id: outputUnitId, calculate };
}

function row(
  inventory: InteriorFinishesDomainInventoryRow,
  rowId: string,
  section: string,
  category: ProfessionalAssemblyRowDefinitionV4["category"],
  titleRu: string,
  rowFormula: ProfessionalAssemblyFormulaV4,
  sourceIds: readonly string[],
  inclusionCondition: string,
): ProfessionalAssemblyRowDefinitionV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    row_id: `${technologyId}:ceresit-ct54-ct17-v1:row:${rowId}`,
    section,
    category,
    title_ru: titleRu,
    formula: rowFormula,
    cost_ownership: "priced_resource",
    cost_owner_id: `${technologyId}:ceresit-ct54-ct17-v1:cost-owner:${rowId}`,
    semantic_owner: `${technologyId}:ceresit-ct54-ct17-v1:semantic-owner:${rowId}`,
    normative_source_ids: sourceIds,
    inclusion_condition: inclusionCondition,
    procurement_eligible: category === "material",
  };
}

function schema(inventory: InteriorFinishesDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const technologyId = inventory.canonical_technology_id;
  const exact = CERESIT_WALL_SYSTEM_ONLY;
  return {
    schema_id: `${technologyId}:ceresit-ct54-ct17-parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: technologyId,
    parameters: [
      parameter("work_included", "Окраска стен включена в проект", "boolean", "P0", null, []),
      parameter("estimate_scope_mode", "Состав расчёта", "choice", "P0", null, [], { choices: [
        { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно выбранный состав" },
        { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый профессиональный состав" },
      ] }),
      parameter("scope_capability", "Условия участка", "choice", "P0", null, [], {
        choices: [{ value: inventory.scope_capability, label_ru: "Стандартная внутренняя зона" }],
      }),
      parameter("funding_source", "Источник финансирования проекта", "choice", "P0", null, [], { choices: [
        { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
        { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
        { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
      ] }),
      parameter("project_type", "Тип объекта по проекту", "text", "P0", null, []),
      parameter("area_m2", "Площадь внутренних стен под систему CT 17 и CT 54", "number", "P0", "m2", [
        "ct17_paint_primer", "ct54_paint", "paint_labor", "paint_equipment", "substrate_preparation", "quality_tests",
      ], { minimum: 0.01, maximum: 1_000_000 }),
      parameter("product_profile_id", "Паспорт выбранной системы окраски", "text", "P0", null, []),
      parameter("selected_primer_product", "Точное наименование грунтовки", "choice", "P1", null, [], {
        choices: [{ value: "Ceresit CT 17 Profi", label_ru: "Ceresit CT 17 Profi" }], condition: exact,
      }),
      parameter("ct17_paint_substrate_type", "Основание стены для CT 17", "choice", "P1", null, [], {
        choices: ["absorbent_wall", "plaster", "concrete", "gypsum", "aerated_concrete", "non_impregnated_plasterboard"]
          .map((value) => ({ value, label_ru: value })), condition: exact,
      }),
      parameter("ct17_paint_substrate_evenness", "Ровность основания для CT 17", "choice", "P1", null, [], {
        choices: [{ value: "even", label_ru: "Ровное" }, { value: "locally_uneven", label_ru: "Локально неровное" }], condition: exact,
      }),
      parameter("ct17_paint_substrate_absorbency", "Впитываемость основания для CT 17", "choice", "P1", null, [], {
        choices: [{ value: "absorbent", label_ru: "Впитывающее" }], condition: exact,
      }),
      parameter("ct17_paint_selected_consumption_l_m2", "Проектный расход CT 17", "number", "P1", "l_per_m2", [], {
        minimum: 0.1, maximum: 0.5, condition: exact,
      }),
      parameter("ct17_paint_dilution_ratio", "Разбавление CT 17 перед окраской", "choice", "P1", null, [], {
        choices: [{ value: "undiluted", label_ru: "Без разбавления" }, { value: "water_1_to_1", label_ru: "Вода 1:1" }], condition: exact,
      }),
      parameter("ct17_paint_coat_count", "Количество слоёв CT 17", "number", "P1", "item", [], { minimum: 1, maximum: 10, condition: exact }),
      parameter("ct17_paint_substrate_dry_load_bearing_clean_confirmed", "Сухое, прочное и чистое основание для CT 17 подтверждено", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct17_paint_complete_drying_confirmed", "Полное высыхание CT 17 перед CT 54 подтверждено", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct17_paint_application_conditions_confirmed", "Условия нанесения CT 17 по TDS подтверждены", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct17_paint_application_temperature_c", "Температура нанесения CT 17", "number", "P1", "celsius", [], { minimum: 5, maximum: 25, condition: exact }),
      parameter("ct17_paint_relative_humidity_percent", "Относительная влажность при нанесении CT 17", "number", "P1", "percent", [], { minimum: 0, maximum: 79.99, condition: exact }),
      parameter("ct17_paint_selected_container_size_l", "Выбранная фасовка CT 17", "choice", "P1", "l", [], {
        choices: [1, 2, 5, 10].map((value) => ({ value: String(value), label_ru: `${value} л` })), condition: exact,
      }),
      parameter("ct17_paint_additional_waste_not_published_confirmed", "Отсутствие опубликованного дополнительного запаса CT 17 подтверждено", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct17_paint_tds_confirmed", "TDS CT 17 Profi 03.24 подтверждён", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct17_paint_tds_reference", "Ссылка на TDS CT 17", "text", "P1", null, [], { condition: exact }),
      parameter("ct17_paint_material_certificate_reference", "Сертификат партии CT 17", "text", "P1", null, [], { condition: exact }),
      parameter("selected_paint_product", "Точное наименование краски", "choice", "P1", null, [], {
        choices: [{ value: "Ceresit CT 54 Silicate Aero", label_ru: "Ceresit CT 54 Silicate Aero" }], condition: exact,
      }),
      parameter("ct54_coat_count", "Количество слоёв CT 54", "number", "P1", "item", [], { minimum: 2, maximum: 2, condition: exact }),
      parameter("ct54_substrate_type", "Основание стены для CT 54", "choice", "P1", null, [], {
        choices: ["cement_plaster", "lime_cement_plaster", "lime_plaster", "brick_wall", "concrete", "primed_indoor_gypsum_substrate", "primed_indoor_gypsum_board", "primed_indoor_gypsum_fibre_board"]
          .map((value) => ({ value, label_ru: value })), condition: exact,
      }),
      parameter("ct54_substrate_absorption", "Впитывание основания для CT 54", "choice", "P1", null, [], {
        choices: ["low", "normal", "high"].map((value) => ({ value, label_ru: value })), condition: exact,
      }),
      parameter("ct54_substrate_smoothness", "Гладкость основания для CT 54", "choice", "P1", null, [], {
        choices: ["smooth", "slightly_textured", "textured"].map((value) => ({ value, label_ru: value })), condition: exact,
      }),
      parameter("ct54_substrate_carrying_smooth_dry_clean_confirmed", "Прочное, гладкое, сухое и чистое основание для CT 54 подтверждено", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct54_installation_location", "Место применения CT 54", "choice", "P1", null, [], {
        choices: [{ value: "indoor", label_ru: "Внутренние стены" }], condition: exact,
      }),
      parameter("ct54_intercoat_break_hours", "Перерыв между слоями CT 54", "number", "P1", "hour", [], { minimum: 12, maximum: 240, condition: exact }),
      parameter("ct54_application_conditions_confirmed", "Условия нанесения CT 54 по TDS подтверждены", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct54_application_temperature_c", "Температура нанесения CT 54", "number", "P1", "celsius", [], { minimum: 5, maximum: 25, condition: exact }),
      parameter("ct54_relative_humidity_percent", "Относительная влажность при нанесении CT 54", "number", "P1", "percent", [], { minimum: 0, maximum: 79.99, condition: exact }),
      parameter("ct54_facade_rain_protection_confirmed", "Фасадная защита от дождя применима", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct54_tds_variant_confirmed", "TDS C_CT54_TDS_1_0819 подтверждён", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct54_project_average_rate_confirmed", "Средний расход 0,3 л/м² для двух слоёв принят проектом", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct54_selected_container_size_l", "Выбранная фасовка CT 54", "choice", "P1", "l", [], {
        choices: [3.5, 15].map((value) => ({ value: String(value), label_ru: `${value} л` })), condition: exact,
      }),
      parameter("ct54_additional_waste_not_published_confirmed", "Отсутствие опубликованного дополнительного запаса CT 54 подтверждено", "boolean", "P1", null, [], { condition: exact }),
      parameter("ct54_tds_reference", "Ссылка на TDS CT 54", "text", "P1", null, [], { condition: exact }),
      parameter("ct54_material_certificate_reference", "Сертификат партии CT 54", "text", "P1", null, [], { condition: exact }),
      parameter("ct17_paint_primer_procurement_quantity_l", "Закупочное количество CT 17", "number", "P2", "l", ["ct17_paint_primer"], { minimum: 1, maximum: 1_000_000_000, condition: exact }),
      parameter("ct54_paint_procurement_quantity_l", "Закупочное количество CT 54", "number", "P2", "l", ["ct54_paint"], { minimum: 3.5, maximum: 1_000_000_000, condition: exact }),
      parameter("normative_rate_code", "Код применимой ресурсной нормы", "text", "P0", null, []),
      parameter("paint_productivity_m2_per_man_hour", "Производительность нанесения двух слоёв CT 54", "number", "P0", "m2_per_man_hour", ["paint_labor"], { minimum: 0.01, maximum: 100_000 }),
      parameter("paint_equipment_productivity_m2_per_machine_hour", "Производительность малярного оборудования", "number", "P0", "m2_per_machine_hour", ["paint_equipment"], { minimum: 0.01, maximum: 100_000 }),
      parameter("substrate_preparation_productivity_m2_per_man_hour", "Производительность подготовки основания", "number", "P1", "m2_per_man_hour", ["substrate_preparation"], { minimum: 0.01, maximum: 100_000, condition: FULL_ONLY }),
      parameter("masking_consumables_rate_kg_m2", "Расход укрывных и защитных материалов", "number", "P1", "kg_per_m2", ["masking_consumables"], { minimum: 0.001, maximum: 100, condition: FULL_ONLY }),
      parameter("qa_interval_m2_per_test", "Площадь на одну проверку качества", "number", "P1", "m2_per_test", ["quality_tests"], { minimum: 0.01, maximum: 1_000_000, condition: FULL_ONLY }),
      parameter("documentation_record_count", "Количество записей контроля", "number", "P1", "item", ["documentation_records"], { minimum: 1, maximum: 10_000, condition: FULL_ONLY }),
    ],
    quantity_alternatives: [["area_m2"]],
  };
}

function mainAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:ceresit-ct54-main-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:ceresit-ct54-main-assembly:v1`,
    title_ru: "Нанесение системы окраски Ceresit CT 17 и CT 54 на внутренние стены",
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: BOTH_SCOPES,
    parameters: [
      assemblyParameter("work_included", "Работа включена", "SCOPE_TRIGGER", null, BOTH_SCOPES),
      assemblyParameter("area_m2", "Площадь стен", "PROJECT_QUANTITY", "m2", BOTH_SCOPES),
      assemblyParameter("paint_productivity_m2_per_man_hour", "Производительность труда", "NORM_RATE", "m2_per_man_hour", BOTH_SCOPES),
      assemblyParameter("paint_equipment_productivity_m2_per_machine_hour", "Производительность оборудования", "NORM_RATE", "m2_per_machine_hour", BOTH_SCOPES),
    ],
    rows: [
      row(inventory, "paint_labor", "Труд рабочих", "labor", "Нанесение двух слоёв Ceresit CT 54 на подготовленные стены", formula(
        `${technologyId}:ceresit-ct54-paint-labor:v1`, "area_m2 / paint_productivity_m2_per_man_hour",
        ["area_m2", "paint_productivity_m2_per_man_hour"], "man_hour",
        (values) => values.area_m2 / values.paint_productivity_m2_per_man_hour,
      ), [KG_RESOURCE_SOURCE_ID], "work_included=true"),
      row(inventory, "paint_equipment", "Машины и механизмы", "equipment", "Малярное оборудование для CT 17 и CT 54", formula(
        `${technologyId}:ceresit-ct54-paint-equipment:v1`, "area_m2 / paint_equipment_productivity_m2_per_machine_hour",
        ["area_m2", "paint_equipment_productivity_m2_per_machine_hour"], "machine_hour",
        (values) => values.area_m2 / values.paint_equipment_productivity_m2_per_machine_hour,
      ), [KG_RESOURCE_SOURCE_ID], "work_included=true"),
    ],
  };
}

function materialAssembly(
  inventory: InteriorFinishesDomainInventoryRow,
  rowId: "ct17_paint_primer" | "ct54_paint",
  outputParameterId: "ct17_paint_primer_procurement_quantity_l" | "ct54_paint_procurement_quantity_l",
  titleRu: string,
  sourceId: string,
): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:${rowId}-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:${rowId}-assembly:v1`,
    title_ru: titleRu,
    scope_trigger_parameter: "product_profile_id",
    scope_trigger_values: [CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID],
    supported_scope_modes: FULL_SCOPE,
    parameters: [assemblyParameter(outputParameterId, titleRu, "NORM_RATE", "l", FULL_SCOPE)],
    rows: [row(inventory, rowId, "Основные материалы", "material", titleRu, formula(
      `${technologyId}:${rowId}-formula:v1`, outputParameterId, [outputParameterId], "l",
      (values) => values[outputParameterId],
    ), [sourceId], "scope_mode=FULL_APPLICABLE_SCOPE")],
  };
}

function fullAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:ceresit-ct54-full-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:ceresit-ct54-full-assembly:v1`,
    title_ru: "Подготовка, контроль и документация системы CT 17 / CT 54",
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: FULL_SCOPE,
    parameters: [
      assemblyParameter("area_m2", "Площадь стен", "PROJECT_QUANTITY", "m2", FULL_SCOPE),
      assemblyParameter("substrate_preparation_productivity_m2_per_man_hour", "Производительность подготовки", "NORM_RATE", "m2_per_man_hour", FULL_SCOPE),
      assemblyParameter("masking_consumables_rate_kg_m2", "Расход укрывных и защитных материалов", "MATERIAL_PASSPORT_VALUE", "kg_per_m2", FULL_SCOPE),
      assemblyParameter("qa_interval_m2_per_test", "Интервал контроля", "CONTROL_PLAN_VALUE", "m2_per_test", FULL_SCOPE),
      assemblyParameter("documentation_record_count", "Документы", "CONTROL_PLAN_VALUE", "item", FULL_SCOPE),
    ],
    rows: [
      row(inventory, "substrate_preparation", "Подготовка основания", "labor", "Очистка и приёмка основания перед CT 17", formula(
        `${technologyId}:ceresit-wall-preparation:v1`, "area_m2 / substrate_preparation_productivity_m2_per_man_hour",
        ["area_m2", "substrate_preparation_productivity_m2_per_man_hour"], "man_hour",
        (values) => values.area_m2 / values.substrate_preparation_productivity_m2_per_man_hour,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "masking_consumables", "Защита и расходники", "material", "Укрывные и защитные материалы для малярных работ", formula(
        `${technologyId}:ceresit-wall-masking-consumables:v1`, "area_m2 * masking_consumables_rate_kg_m2",
        ["area_m2", "masking_consumables_rate_kg_m2"], "kg",
        (values) => values.area_m2 * values.masking_consumables_rate_kg_m2,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "quality_tests", "Контроль качества", "testing", "Контроль грунтования, межслойной выдержки и покрытия", formula(
        `${technologyId}:ceresit-wall-quality:v1`, "ceil(area_m2 / qa_interval_m2_per_test)",
        ["area_m2", "qa_interval_m2_per_test"], "test",
        (values) => Math.ceil(values.area_m2 / values.qa_interval_m2_per_test),
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "documentation_records", "Исполнительная документация", "documentation", "Паспорта материалов и записи контроля CT 17 / CT 54", formula(
        `${technologyId}:ceresit-wall-documentation:v1`, "documentation_record_count",
        ["documentation_record_count"], "item", (values) => values.documentation_record_count,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
    ],
  };
}

export function buildPaintCeresitCt54Ct17ProfessionalPackagePartsV1(
  inventory: InteriorFinishesDomainInventoryRow,
): PaintCeresitPackagePartsV1 | null {
  if (!isExactWallPaintTarget(inventory)) return null;
  const technologyId = inventory.canonical_technology_id;
  return {
    contract: { group: "INTERIOR_WALL_PAINT", variant: "standard", method_prefix: "CERESIT_CT54_CT17_PROFESSIONAL_OVERLAY" },
    output: { dimension: "AREA", unit_id: "m2" },
    schema: schema(inventory),
    child_assemblies: [
      mainAssembly(inventory),
      materialAssembly(inventory, "ct17_paint_primer", "ct17_paint_primer_procurement_quantity_l", "Грунтовка Ceresit CT 17 Profi перед окраской", CERESIT_CT17_PAINT_PRIMER_SOURCE_ID),
      materialAssembly(inventory, "ct54_paint", "ct54_paint_procurement_quantity_l", "Силикатная краска Ceresit CT 54 Silicate Aero", CERESIT_CT54_INTERIOR_WALL_SOURCE_ID),
      fullAssembly(inventory),
    ],
    normative_profile: {
      profile_id: `${technologyId}:ceresit-ct54-ct17-kg-resource-profile:v1`,
      profile_version: "1.0.0",
      technology_id: technologyId,
      jurisdiction: "KG",
      requested_source_ids: [KG_RESOURCE_SOURCE_ID],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
      rejected_foreign_source_ids: ["ru_gesn_15", "ru_fer_15"],
    },
    required_stages: [
      "SUBSTRATE_ACCEPTANCE", "CT17_PRIMER_APPLICATION", "CT17_COMPLETE_DRYING",
      "CT54_FIRST_COAT", "INTERCOAT_BREAK", "CT54_SECOND_COAT", "COVERAGE_CONTROL", "SCOPE_STANDARD",
    ],
    optional_stages: [],
    resource_policy: {
      policy_id: `${technologyId}:ceresit-ct54-ct17-resource-policy:v1`,
      technology_id: technologyId,
      required_categories: ["material", "labor", "equipment", "testing", "documentation"],
      optional_categories: ["transport", "waste", "subcontract_service", "temporary_work"],
      forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ"],
      one_bundle_resource_replacement_forbidden: true,
    },
  };
}
