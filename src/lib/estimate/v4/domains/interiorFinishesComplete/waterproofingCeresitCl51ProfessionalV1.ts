import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
} from "../../professionalProjectAssemblyV4";
import {
  CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID,
  CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
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
const FULL_ONLY = {
  kind: "EQUALS",
  parameter_id: "estimate_scope_mode",
  value: "FULL_APPLICABLE_SCOPE",
} as const;
const CERESIT_CL51_ONLY = {
  kind: "EQUALS",
  parameter_id: "product_profile_id",
  value: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID,
} as const;
const BOTH_SCOPES = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const;
const FULL_SCOPE = ["FULL_APPLICABLE_SCOPE"] as const;
const KG_RESOURCE_SOURCE_ID = "kg_krer_2015_application_guidance" as const;

type WaterproofingCeresitCl51PackagePartsV1 = {
  contract: { group: string; variant: string; method_prefix: string };
  output: { dimension: string; unit_id: string };
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

function isExactCl51Target(inventory: InteriorFinishesDomainInventoryRow): boolean {
  return inventory.source_domain_id === "tile_stone" &&
    inventory.work_type === "waterproof" &&
    inventory.scope_capability === "wet_zone" &&
    inventory.work_key === "tile_stone_interior_ceramic_tile_waterproof_wet_zone";
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
  sourceIds: readonly string[],
  inclusionCondition: string,
): ProfessionalAssemblyRowDefinitionV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    row_id: `${technologyId}:ceresit-cl51-v1:row:${rowId}`,
    section,
    category,
    title_ru: titleRu,
    formula: rowFormula,
    cost_ownership: "priced_resource",
    cost_owner_id: `${technologyId}:ceresit-cl51-v1:cost-owner:${rowId}`,
    semantic_owner: `${technologyId}:ceresit-cl51-v1:semantic-owner:${rowId}`,
    normative_source_ids: sourceIds,
    inclusion_condition: inclusionCondition,
    procurement_eligible: category === "material",
  };
}

function schema(inventory: InteriorFinishesDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const technologyId = inventory.canonical_technology_id;
  const exact = CERESIT_CL51_ONLY;
  const substrateChoices = [
    "mineral_surface",
    "concrete",
    "fully_pointed_brickwork",
    "cement_screed",
    "cementitious_dry_screed",
    "gypsum_board",
    "aerated_concrete",
  ];
  return {
    schema_id: `${technologyId}:ceresit-cl51-parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: technologyId,
    parameters: [
      parameter("work_included", "Гидроизоляция мокрой зоны включена в проект", "boolean", "P0", null, []),
      parameter("estimate_scope_mode", "Состав расчёта", "choice", "P0", null, [], { choices: [
        { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно выбранный состав" },
        { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый профессиональный состав" },
      ] }),
      parameter("scope_capability", "Условия участка", "choice", "P0", null, [], {
        choices: [{ value: inventory.scope_capability, label_ru: "Мокрая зона" }],
      }),
      parameter("funding_source", "Источник финансирования проекта", "choice", "P0", null, [], { choices: [
        { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
        { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
        { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
      ] }),
      parameter("project_type", "Тип объекта по проекту", "text", "P0", null, []),
      parameter("area_m2", "Площадь гидроизоляции под керамическую облицовку", "number", "P0", "m2", [
        "cl51_material", "waterproofing_labor", "waterproofing_equipment", "substrate_preparation", "quality_tests",
      ], { minimum: 0.01, maximum: 1_000_000 }),
      parameter("product_profile_id", "Паспорт выбранной гидроизоляционной системы", "text", "P0", null, []),
      parameter("coat_count", "Число слоёв Ceresit CL 51", "number", "P1", "item", [], {
        minimum: 2, maximum: 2, condition: exact,
      }),
      parameter("installation_location", "Место применения", "choice", "P1", null, [], {
        choices: [{ value: "indoor", label_ru: "Внутри помещения" }], condition: exact,
      }),
      parameter("under_ceramic_covering", "Гидроизоляция выполняется под керамическое покрытие", "boolean", "P1", null, [], { condition: exact }),
      parameter("wet_zone_type", "Тип бытовой мокрой зоны", "choice", "P1", null, [], {
        choices: [
          { value: "bathroom", label_ru: "Ванная" },
          { value: "kitchen", label_ru: "Кухня" },
          { value: "toilet", label_ru: "Туалет" },
        ], condition: exact,
      }),
      parameter("substrate_type", "Основание под Ceresit CL 51", "choice", "P1", null, [], {
        choices: substrateChoices.map((value) => ({ value, label_ru: value })), condition: exact,
      }),
      parameter("substrate_preparation_confirmed", "Подготовка основания по актуальному TDS подтверждена", "boolean", "P1", null, [], { condition: exact }),
      parameter("permanent_water_contact_excluded", "Постоянный контакт с водой и бассейны исключены", "boolean", "P1", null, [], { condition: exact }),
      parameter("rear_surface_moisture_excluded", "Увлажнение основания с обратной стороны исключено", "boolean", "P1", null, [], { condition: exact }),
      parameter("chemical_exposure_excluded", "Химическое воздействие исключено", "boolean", "P1", null, [], { condition: exact }),
      parameter("selected_bucket_size_kg", "Выбранная фасовка Ceresit CL 51", "choice", "P1", "kg", [], {
        choices: [5, 15].map((value) => ({ value: String(value), label_ru: `${value} кг` })), condition: exact,
      }),
      parameter("cl51_procurement_quantity_kg", "Закупочное количество Ceresit CL 51", "number", "P2", "kg", ["cl51_material"], {
        minimum: 5, maximum: 1_000_000_000, condition: exact,
      }),
      parameter("normative_rate_code", "Код применимой ресурсной нормы", "text", "P0", null, []),
      parameter("waterproofing_productivity_m2_per_man_hour", "Производительность нанесения двух слоёв гидроизоляции", "number", "P0", "m2_per_man_hour", ["waterproofing_labor"], {
        minimum: 0.01, maximum: 100_000,
      }),
      parameter("waterproofing_equipment_productivity_m2_per_machine_hour", "Производительность оборудования для гидроизоляции", "number", "P0", "m2_per_machine_hour", ["waterproofing_equipment"], {
        minimum: 0.01, maximum: 100_000,
      }),
      parameter("substrate_preparation_productivity_m2_per_man_hour", "Производительность подготовки основания", "number", "P1", "m2_per_man_hour", ["substrate_preparation"], {
        minimum: 0.01, maximum: 100_000, condition: FULL_ONLY,
      }),
      parameter("junction_tape_length_m", "Проектная длина герметизирующей ленты в примыканиях", "number", "P1", "m", ["junction_tape"], {
        minimum: 0, maximum: 1_000_000, condition: FULL_ONLY,
      }),
      parameter("penetration_collar_count", "Число проектных манжет проходок", "number", "P1", "item", ["penetration_collars"], {
        minimum: 0, maximum: 1_000_000, condition: FULL_ONLY,
      }),
      parameter("qa_interval_m2_per_test", "Площадь на одну проверку качества", "number", "P1", "m2_per_test", ["quality_tests"], {
        minimum: 0.01, maximum: 1_000_000, condition: FULL_ONLY,
      }),
      parameter("documentation_record_count", "Количество записей исполнительного контроля", "number", "P1", "item", ["documentation_records"], {
        minimum: 1, maximum: 10_000, condition: FULL_ONLY,
      }),
    ],
    quantity_alternatives: [["area_m2"]],
  };
}

function mainAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:ceresit-cl51-main-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:ceresit-cl51-main-assembly:v1`,
    title_ru: "Нанесение двухслойной гидроизоляции мокрой зоны под керамическое покрытие",
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: BOTH_SCOPES,
    parameters: [
      assemblyParameter("work_included", "Работа включена", "SCOPE_TRIGGER", null, BOTH_SCOPES),
      assemblyParameter("area_m2", "Площадь гидроизоляции", "PROJECT_QUANTITY", "m2", BOTH_SCOPES),
      assemblyParameter("waterproofing_productivity_m2_per_man_hour", "Производительность труда", "NORM_RATE", "m2_per_man_hour", BOTH_SCOPES),
      assemblyParameter("waterproofing_equipment_productivity_m2_per_machine_hour", "Производительность оборудования", "NORM_RATE", "m2_per_machine_hour", BOTH_SCOPES),
    ],
    rows: [
      row(inventory, "waterproofing_labor", "Труд рабочих", "labor", "Нанесение двух слоёв гидроизоляции", formula(
        `${technologyId}:ceresit-cl51-labor:v1`,
        "area_m2 / waterproofing_productivity_m2_per_man_hour",
        ["area_m2", "waterproofing_productivity_m2_per_man_hour"],
        "man_hour",
        (values) => values.area_m2 / values.waterproofing_productivity_m2_per_man_hour,
      ), [KG_RESOURCE_SOURCE_ID], "work_included=true"),
      row(inventory, "waterproofing_equipment", "Машины и механизмы", "equipment", "Оборудование для нанесения гидроизоляции", formula(
        `${technologyId}:ceresit-cl51-equipment:v1`,
        "area_m2 / waterproofing_equipment_productivity_m2_per_machine_hour",
        ["area_m2", "waterproofing_equipment_productivity_m2_per_machine_hour"],
        "machine_hour",
        (values) => values.area_m2 / values.waterproofing_equipment_productivity_m2_per_machine_hour,
      ), [KG_RESOURCE_SOURCE_ID], "work_included=true"),
    ],
  };
}

function materialAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:ceresit-cl51-material-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:ceresit-cl51-material-assembly:v1`,
    title_ru: "Ceresit CL 51 Express 1-K, закупочное количество",
    scope_trigger_parameter: "product_profile_id",
    scope_trigger_values: [CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID],
    supported_scope_modes: FULL_SCOPE,
    parameters: [
      assemblyParameter("cl51_procurement_quantity_kg", "Закупочное количество Ceresit CL 51", "NORM_RATE", "kg", FULL_SCOPE),
    ],
    rows: [row(inventory, "cl51_material", "Основные материалы", "material", "Ceresit CL 51 Express 1-K", formula(
      `${technologyId}:ceresit-cl51-material:v1`,
      "cl51_procurement_quantity_kg",
      ["cl51_procurement_quantity_kg"],
      "kg",
      (values) => values.cl51_procurement_quantity_kg,
    ), [CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE")],
  };
}

function fullAssembly(inventory: InteriorFinishesDomainInventoryRow): ProfessionalChildAssemblyV4 {
  const technologyId = inventory.canonical_technology_id;
  return {
    child_passport_id: `${technologyId}:ceresit-cl51-full-passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
    assembly_id: `${technologyId}:ceresit-cl51-full-assembly:v1`,
    title_ru: "Подготовка, примыкания, контроль и документация гидроизоляции",
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: FULL_SCOPE,
    parameters: [
      assemblyParameter("area_m2", "Площадь гидроизоляции", "PROJECT_QUANTITY", "m2", FULL_SCOPE),
      assemblyParameter("substrate_preparation_productivity_m2_per_man_hour", "Производительность подготовки", "NORM_RATE", "m2_per_man_hour", FULL_SCOPE),
      assemblyParameter("junction_tape_length_m", "Лента примыканий", "PROJECT_QUANTITY", "m", FULL_SCOPE),
      assemblyParameter("penetration_collar_count", "Манжеты проходок", "PROJECT_QUANTITY", "item", FULL_SCOPE),
      assemblyParameter("qa_interval_m2_per_test", "Интервал контроля", "CONTROL_PLAN_VALUE", "m2_per_test", FULL_SCOPE),
      assemblyParameter("documentation_record_count", "Документы", "CONTROL_PLAN_VALUE", "item", FULL_SCOPE),
    ],
    rows: [
      row(inventory, "substrate_preparation", "Подготовка основания", "labor", "Очистка и приёмка подготовленного основания", formula(
        `${technologyId}:ceresit-cl51-preparation:v1`,
        "area_m2 / substrate_preparation_productivity_m2_per_man_hour",
        ["area_m2", "substrate_preparation_productivity_m2_per_man_hour"],
        "man_hour",
        (values) => values.area_m2 / values.substrate_preparation_productivity_m2_per_man_hour,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "junction_tape", "Герметизация примыканий", "material", "Герметизирующая лента стыков и кромок по проекту", formula(
        `${technologyId}:ceresit-cl51-junction-tape:v1`, "junction_tape_length_m", ["junction_tape_length_m"], "m",
        (values) => values.junction_tape_length_m,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "penetration_collars", "Герметизация проходок", "material", "Герметизирующие манжеты проходок по проекту", formula(
        `${technologyId}:ceresit-cl51-collars:v1`, "penetration_collar_count", ["penetration_collar_count"], "item",
        (values) => values.penetration_collar_count,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "quality_tests", "Контроль качества", "testing", "Контроль сплошности и минимальной толщины покрытия", formula(
        `${technologyId}:ceresit-cl51-quality:v1`,
        "ceil(area_m2 / qa_interval_m2_per_test)",
        ["area_m2", "qa_interval_m2_per_test"],
        "test",
        (values) => Math.ceil(values.area_m2 / values.qa_interval_m2_per_test),
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
      row(inventory, "documentation_records", "Исполнительная документация", "documentation", "Паспорта материала и записи контроля гидроизоляции", formula(
        `${technologyId}:ceresit-cl51-documentation:v1`,
        "documentation_record_count",
        ["documentation_record_count"],
        "item",
        (values) => values.documentation_record_count,
      ), [KG_RESOURCE_SOURCE_ID], "scope_mode=FULL_APPLICABLE_SCOPE"),
    ],
  };
}

export function buildWaterproofingCeresitCl51ProfessionalPackagePartsV1(
  inventory: InteriorFinishesDomainInventoryRow,
): WaterproofingCeresitCl51PackagePartsV1 | null {
  if (!isExactCl51Target(inventory)) return null;
  const technologyId = inventory.canonical_technology_id;
  return {
    contract: {
      group: "INTERIOR_CERAMIC_WET_ZONE_WATERPROOFING",
      variant: "wet_zone",
      method_prefix: "CERESIT_CL51_PROFESSIONAL_OVERLAY",
    },
    output: { dimension: "AREA", unit_id: "m2" },
    schema: schema(inventory),
    child_assemblies: [mainAssembly(inventory), materialAssembly(inventory), fullAssembly(inventory)],
    normative_profile: {
      profile_id: `${technologyId}:ceresit-cl51-kg-resource-profile:v1`,
      profile_version: "1.0.0",
      technology_id: technologyId,
      jurisdiction: "KG",
      requested_source_ids: [KG_RESOURCE_SOURCE_ID],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
      rejected_foreign_source_ids: ["ru_gesn_15", "ru_fer_15"],
    },
    required_stages: [
      "SUBSTRATE_ACCEPTANCE",
      "JUNCTION_AND_PENETRATION_SEALING",
      "CL51_FIRST_COAT",
      "CL51_SECOND_COAT",
      "MINIMUM_DRY_FILM_CONTROL",
      "CERAMIC_COVERING_HANDOFF",
      "SCOPE_WET_ZONE",
    ],
    optional_stages: [],
    resource_policy: {
      policy_id: `${technologyId}:ceresit-cl51-resource-policy:v1`,
      technology_id: technologyId,
      required_categories: ["material", "labor", "equipment", "testing", "documentation"],
      optional_categories: ["transport", "waste", "subcontract_service", "temporary_work"],
      forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ"],
      one_bundle_resource_replacement_forbidden: true,
    },
  };
}
