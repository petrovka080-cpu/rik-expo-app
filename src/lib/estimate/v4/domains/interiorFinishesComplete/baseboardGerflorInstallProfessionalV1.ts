import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
} from "../../professionalProjectAssemblyV4";
import {
  GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID,
  GERFLOR_6086_SKIRTING_SOURCE_ID,
  type ProfessionalDomainParameterDefinitionV1,
  type ProfessionalDomainParameterSchemaV1,
  type ProfessionalNormativeProfileV1,
  type ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import {
  INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
  type InteriorFinishesDomainInventoryRow,
} from "./inventory";
import { interiorMaterialSystemKey } from "./technologyProfiles";

const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = {
  kind: "EQUALS",
  parameter_id: "estimate_scope_mode",
  value: "FULL_APPLICABLE_SCOPE",
} as const;
const GERFLOR_ONLY = {
  kind: "EQUALS",
  parameter_id: "product_profile_id",
  value: GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID,
} as const;
const BOTH_SCOPES = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const;
const FULL_SCOPE = ["FULL_APPLICABLE_SCOPE"] as const;
const KG_RESOURCE_SOURCE_ID = "kg_krer_2015_application_guidance" as const;

type BaseboardGerflorInstallProfessionalPackagePartsV1 = {
  contract: { group: string; variant: string; method_prefix: string };
  output: { dimension: string; unit_id: string };
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

function isGerflorStandardInstall(inventory: InteriorFinishesDomainInventoryRow): boolean {
  return inventory.source_domain_id === "flooring" &&
    inventory.work_type === "install" &&
    inventory.scope_capability === "standard" &&
    interiorMaterialSystemKey(inventory) === "BASEBOARD";
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
  inclusionCondition: string,
): ProfessionalAssemblyRowDefinitionV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    row_id: `${technologyId}:gerflor-6086-v1:row:${rowId}`,
    section,
    category,
    title_ru: titleRu,
    formula: rowFormula,
    cost_ownership: "priced_resource",
    cost_owner_id: `${technologyId}:gerflor-6086-v1:cost-owner:${rowId}`,
    semantic_owner: `${technologyId}:gerflor-6086-v1:semantic-owner:${rowId}`,
    normative_source_ids: normativeSourceIds,
    inclusion_condition: inclusionCondition,
    procurement_eligible: category === "material",
  };
}

function schema(inventory: InteriorFinishesDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const technologyId = inventory.canonical_technology_id;
  return {
    schema_id: `${technologyId}:gerflor-6086-parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: technologyId,
    parameters: [
      parameter("work_included", "Монтаж плинтуса включён в проект", "boolean", "P0", null, []),
      parameter("estimate_scope_mode", "Состав расчёта", "choice", "P0", null, [], { choices: [
        { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно выбранный состав" },
        { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый профессиональный состав" },
      ] }),
      parameter("scope_capability", "Условия участка", "choice", "P0", null, [], {
        choices: [{ value: inventory.scope_capability, label_ru: "Стандартная зона" }],
      }),
      parameter("funding_source", "Источник финансирования проекта", "choice", "P0", null, [], { choices: [
        { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
        { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
        { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
      ] }),
      parameter("project_type", "Тип объекта по проекту", "text", "P0", null, []),
      parameter("finished_perimeter_linear_m", "Измеренный чистовой периметр установки плинтуса", "number", "P0", "linear_m", [
        "gerflor_6086_skirting", "installation_labor", "application_equipment", "preparation_labor", "quality_tests",
      ], { minimum: 0.01, maximum: 1_000_000 }),
      parameter("inside_corner_count", "Количество внутренних углов по обмеру", "number", "P1", "item", [], {
        minimum: 0, maximum: 100_000, condition: GERFLOR_ONLY,
      }),
      parameter("outside_corner_count", "Количество внешних углов по обмеру", "number", "P1", "item", [], {
        minimum: 0, maximum: 100_000, condition: GERFLOR_ONLY,
      }),
      parameter("product_profile_id", "Паспорт выбранного плинтуса", "text", "P0", null, []),
      parameter("selected_skirting_product", "Точное наименование выбранного плинтуса", "choice", "P1", null, [], {
        choices: [{ value: "Gerflor Design Skirting 6086", label_ru: "Gerflor Design Skirting 6086" }],
        condition: GERFLOR_ONLY,
      }),
      parameter("gerflor_piece_length_m", "Длина одной планки Gerflor 6086", "number", "P1", "m", [], {
        minimum: 2, maximum: 2, condition: GERFLOR_ONLY,
      }),
      parameter("gerflor_packaging_confirmed", "Подтверждена упаковка 6 планок по 2 м", "boolean", "P1", null, [], { condition: GERFLOR_ONLY }),
      parameter("gerflor_corner_cutting_method_reference", "Ссылка на принятую схему раскроя внутренних и внешних углов", "text", "P1", null, [], { condition: GERFLOR_ONLY }),
      parameter("gerflor_corner_allowance_not_assumed_confirmed", "Подтверждено, что автоматический запас на углы не добавляется", "boolean", "P1", null, [], { condition: GERFLOR_ONLY }),
      parameter("gerflor_installation_surface_prepared_plane_confirmed", "Подготовленная ровная поверхность установки подтверждена", "boolean", "P1", null, [], { condition: GERFLOR_ONLY }),
      parameter("gerflor_manufacturer_instruction_reference", "Ссылка на инструкцию Gerflor PMO [516V1]", "text", "P1", null, [], { condition: GERFLOR_ONLY }),
      parameter("material_certificate_reference", "Ссылка на сертификат выбранной партии Gerflor 6086", "text", "P1", null, [], { condition: GERFLOR_ONLY }),
      parameter("gerflor_skirting_procurement_quantity_linear_m", "Закупочная длина Gerflor 6086 после округления планок", "number", "P2", "linear_m", ["gerflor_6086_skirting"], {
        minimum: 2, maximum: 1_000_000_000, condition: GERFLOR_ONLY,
      }),
      parameter("normative_rate_code", "Код применимой ресурсной нормы", "text", "P0", null, []),
      parameter("labor_productivity_linear_m_per_man_hour", "Производительность монтажа плинтуса", "number", "P0", "m_per_man_hour", ["installation_labor"], {
        minimum: 0.01, maximum: 100_000,
      }),
      parameter("equipment_productivity_linear_m_per_machine_hour", "Производительность монтажного инструмента", "number", "P0", "m_per_machine_hour", ["application_equipment"], {
        minimum: 0.01, maximum: 100_000,
      }),
      parameter("preparation_productivity_linear_m_per_man_hour", "Производительность подготовки линии установки", "number", "P1", "m_per_man_hour", ["preparation_labor"], {
        minimum: 0.01, maximum: 100_000, condition: FULL_ONLY,
      }),
      parameter("qa_interval_linear_m_per_test", "Длина линии на одну контрольную проверку", "number", "P1", "m_per_test", ["quality_tests"], {
        minimum: 0.01, maximum: 1_000_000, condition: FULL_ONLY,
      }),
      parameter("documentation_record_count", "Количество актов и записей контроля", "number", "P1", "item", ["documentation_records"], {
        minimum: 1, maximum: 10_000, condition: FULL_ONLY,
      }),
    ],
    quantity_alternatives: [["finished_perimeter_linear_m"]],
  };
}

function mainAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:gerflor-6086-main-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:gerflor-6086-main-assembly:v1`,
    title_ru: "Монтаж Gerflor Design Skirting 6086 по чистовому периметру",
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: BOTH_SCOPES,
    parameters: [
      assemblyParameter("work_included", "Работа включена", "SCOPE_TRIGGER", null, BOTH_SCOPES),
      assemblyParameter("finished_perimeter_linear_m", "Чистовой периметр", "PROJECT_QUANTITY", "linear_m", BOTH_SCOPES),
      assemblyParameter("labor_productivity_linear_m_per_man_hour", "Производительность труда", "NORM_RATE", "m_per_man_hour", BOTH_SCOPES),
      assemblyParameter("equipment_productivity_linear_m_per_machine_hour", "Производительность инструмента", "NORM_RATE", "m_per_machine_hour", BOTH_SCOPES),
    ],
    rows: [
      row(inventory, "installation_labor", "Труд рабочих", "labor", "Монтаж плинтуса по измеренному чистовому периметру", formula(
        `${technologyId}:gerflor-6086-installation-labor:v1`,
        "finished_perimeter_linear_m / labor_productivity_linear_m_per_man_hour",
        ["finished_perimeter_linear_m", "labor_productivity_linear_m_per_man_hour"],
        "man_hour",
        (values) => values.finished_perimeter_linear_m / values.labor_productivity_linear_m_per_man_hour,
      ), [KG_RESOURCE_SOURCE_ID], "work_included=true"),
      row(inventory, "application_equipment", "Машины и механизмы", "equipment", "Монтажный и раскройный инструмент", formula(
        `${technologyId}:gerflor-6086-application-equipment:v1`,
        "finished_perimeter_linear_m / equipment_productivity_linear_m_per_machine_hour",
        ["finished_perimeter_linear_m", "equipment_productivity_linear_m_per_machine_hour"],
        "machine_hour",
        (values) => values.finished_perimeter_linear_m / values.equipment_productivity_linear_m_per_machine_hour,
      ), [KG_RESOURCE_SOURCE_ID], "work_included=true"),
    ],
  };
}

function gerflorMaterialAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:gerflor-6086-material-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:gerflor-6086-material-assembly:v1`,
    title_ru: "Плинтус Gerflor Design Skirting 6086, планки 2 м",
    scope_trigger_parameter: "product_profile_id",
    scope_trigger_values: [GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID],
    supported_scope_modes: FULL_SCOPE,
    parameters: [
      assemblyParameter("gerflor_skirting_procurement_quantity_linear_m", "Закупочная длина Gerflor 6086", "NORM_RATE", "linear_m", FULL_SCOPE),
    ],
    rows: [
      row(inventory, "gerflor_6086_skirting", "Основные материалы", "material", "Gerflor Design Skirting 6086, планки длиной 2 м", formula(
        `${technologyId}:gerflor-6086-material:v1`,
        "gerflor_skirting_procurement_quantity_linear_m",
        ["gerflor_skirting_procurement_quantity_linear_m"],
        "linear_m",
        (values) => values.gerflor_skirting_procurement_quantity_linear_m,
      ), [GERFLOR_6086_SKIRTING_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
    ],
  };
}

function fullAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:gerflor-6086-full-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:gerflor-6086-full-assembly:v1`,
    title_ru: "Полный состав монтажа Gerflor 6086",
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: FULL_SCOPE,
    parameters: [
      assemblyParameter("finished_perimeter_linear_m", "Чистовой периметр", "PROJECT_QUANTITY", "linear_m", FULL_SCOPE),
      assemblyParameter("preparation_productivity_linear_m_per_man_hour", "Производительность подготовки", "NORM_RATE", "m_per_man_hour", FULL_SCOPE),
      assemblyParameter("qa_interval_linear_m_per_test", "Интервал контроля", "CONTROL_PLAN_VALUE", "m_per_test", FULL_SCOPE),
      assemblyParameter("documentation_record_count", "Документы", "CONTROL_PLAN_VALUE", "item", FULL_SCOPE),
    ],
    rows: [
      row(inventory, "preparation_labor", "Подготовка основания", "labor", "Подготовка ровной линии установки плинтуса", formula(
        `${technologyId}:gerflor-6086-preparation:v1`,
        "finished_perimeter_linear_m / preparation_productivity_linear_m_per_man_hour",
        ["finished_perimeter_linear_m", "preparation_productivity_linear_m_per_man_hour"],
        "man_hour",
        (values) => values.finished_perimeter_linear_m / values.preparation_productivity_linear_m_per_man_hour,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "quality_tests", "Контроль качества", "testing", "Контроль раскроя, углов и установленной линии", formula(
        `${technologyId}:gerflor-6086-quality-tests:v1`,
        "ceil(finished_perimeter_linear_m / qa_interval_linear_m_per_test)",
        ["finished_perimeter_linear_m", "qa_interval_linear_m_per_test"],
        "test",
        (values) => Math.ceil(values.finished_perimeter_linear_m / values.qa_interval_linear_m_per_test),
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "documentation_records", "Исполнительная документация", "documentation", "Паспорт материала, схема раскроя и записи контроля", formula(
        `${technologyId}:gerflor-6086-documentation:v1`,
        "documentation_record_count",
        ["documentation_record_count"],
        "item",
        (values) => values.documentation_record_count,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
    ],
  };
}

export function buildBaseboardGerflorInstallProfessionalPackagePartsV1(
  inventory: InteriorFinishesDomainInventoryRow,
): BaseboardGerflorInstallProfessionalPackagePartsV1 | null {
  if (!isGerflorStandardInstall(inventory)) return null;
  const technologyId = inventory.canonical_technology_id;
  const childAssemblies = [
    mainAssembly(inventory),
    gerflorMaterialAssembly(inventory),
    fullAssembly(inventory),
  ] as const;
  return {
    contract: {
      group: "BASEBOARD_INSTALL",
      variant: "standard",
      method_prefix: "BASEBOARD_GERFLOR_PROFESSIONAL_OVERLAY",
    },
    output: { dimension: "LINEAR", unit_id: "linear_m" },
    schema: schema(inventory),
    child_assemblies: childAssemblies,
    normative_profile: {
      profile_id: `${technologyId}:gerflor-6086-kg-resource-profile:v1`,
      profile_version: "1.0.0",
      technology_id: technologyId,
      jurisdiction: "KG",
      requested_source_ids: [KG_RESOURCE_SOURCE_ID],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
      rejected_foreign_source_ids: ["ru_gesn_11", "ru_fer_11"],
    },
    required_stages: [
      "FINISHED_PERIMETER_MEASUREMENT",
      "SURFACE_PREPARATION",
      "CORNER_CUTTING",
      "SKIRTING_INSTALLATION",
      "INSTALLATION_CONTROL",
      "SCOPE_STANDARD",
    ],
    optional_stages: [],
    resource_policy: {
      policy_id: `${technologyId}:gerflor-6086-resource-policy:v1`,
      technology_id: technologyId,
      required_categories: ["material", "labor", "equipment", "testing", "documentation"],
      optional_categories: ["transport", "waste", "subcontract_service", "temporary_work"],
      forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ"],
      one_bundle_resource_replacement_forbidden: true,
    },
  };
}
