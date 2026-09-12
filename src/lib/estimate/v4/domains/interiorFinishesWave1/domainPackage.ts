import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
} from "../../professionalProjectAssemblyV4";
import {
  CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID,
  createProfessionalEstimateDomainFactoryV1,
  type ProfessionalAssemblyProfileV1,
  type ProfessionalCanonicalTechnologyV1,
  type ProfessionalDomainParameterDefinitionV1,
  type ProfessionalDomainParameterSchemaV1,
  type ProfessionalEstimateDomainPackageV1,
  type ProfessionalFormulaPackV1,
  type ProfessionalNormativeProfileV1,
  type ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import {
  INTERIOR_FINISHES_WAVE_1_CATALOG_BINDINGS,
  INTERIOR_FINISHES_WAVE_1_DOMAIN_ID,
  INTERIOR_FINISHES_WAVE_1_INVENTORY,
  canonicalBaseWorkKey,
  type InteriorFinishesWave1ScopeCapability,
} from "./inventory";

type FormulaKind = "LAYER_KG" | "COAT_KG" | "AREA_SHEET" | "LINEAR_PROFILE";

type TechnologyConfig = {
  canonical_base_work_key: string;
  professional_name_ru: string;
  material_title_ru: string;
  labor_title_ru: string;
  equipment_title_ru: string;
  method: string;
  material_system: string;
  formula_kind: FormulaKind;
  required_stages: readonly string[];
  optional_stages: readonly string[];
};

const CONFIGS: readonly TechnologyConfig[] = Object.freeze([
  {
    canonical_base_work_key: "plaster_paint_interior_wall_plaster_apply",
    professional_name_ru: "Нанесение штукатурного слоя на стены",
    material_title_ru: "Штукатурная смесь выбранной проектом системы",
    labor_title_ru: "Нанесение, разравнивание и подрезка штукатурного слоя стен",
    equipment_title_ru: "Растворосмесительное и штукатурное оборудование",
    method: "WALL_PLASTER_APPLICATION",
    material_system: "WALL_PLASTER",
    formula_kind: "LAYER_KG",
    required_stages: ["SUBSTRATE_ACCEPTANCE", "MIX_PREPARATION", "PLASTER_APPLICATION", "LEVEL_CONTROL"],
    optional_stages: ["PRIMER", "MESH_REINFORCEMENT", "BEACONS", "ACCESS_EQUIPMENT"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_ceiling_plaster_apply",
    professional_name_ru: "Нанесение штукатурного слоя на потолок",
    material_title_ru: "Потолочная штукатурная смесь выбранной проектом системы",
    labor_title_ru: "Нанесение и выравнивание штукатурного слоя потолка",
    equipment_title_ru: "Растворосмесительное оборудование и средства доступа",
    method: "CEILING_PLASTER_APPLICATION",
    material_system: "CEILING_PLASTER",
    formula_kind: "LAYER_KG",
    required_stages: ["OVERHEAD_SUBSTRATE_ACCEPTANCE", "MIX_PREPARATION", "CEILING_APPLICATION", "LEVEL_CONTROL"],
    optional_stages: ["PRIMER", "MESH_REINFORCEMENT", "ACCESS_EQUIPMENT"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_wall_putty_apply",
    professional_name_ru: "Нанесение шпаклёвочного слоя на стены",
    material_title_ru: "Шпаклёвочная смесь выбранного класса финиша",
    labor_title_ru: "Нанесение и выравнивание шпаклёвочного слоя стен",
    equipment_title_ru: "Смесительное и шлифовально-пылеудаляющее оборудование",
    method: "WALL_PUTTY_APPLICATION",
    material_system: "WALL_PUTTY",
    formula_kind: "LAYER_KG",
    required_stages: ["SUBSTRATE_ACCEPTANCE", "MIX_PREPARATION", "PUTTY_APPLICATION", "FINISH_CLASS_CONTROL"],
    optional_stages: ["PRIMER", "REINFORCEMENT_TAPE", "SANDING", "DUST_EXTRACTION"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_paint_wall_apply",
    professional_name_ru: "Окраска внутренних стен",
    material_title_ru: "Краска выбранной проектом системы для стен",
    labor_title_ru: "Нанесение проектного количества слоёв краски на стены",
    equipment_title_ru: "Малярное распылительное или валиковое оборудование",
    method: "WALL_PAINT_APPLICATION",
    material_system: "PAINT",
    formula_kind: "COAT_KG",
    required_stages: ["SUBSTRATE_ACCEPTANCE", "PAINT_PREPARATION", "COAT_APPLICATION", "COVERAGE_CONTROL"],
    optional_stages: ["PRIMER", "MASKING", "MECHANIZED_SPRAY", "ACCESS_EQUIPMENT"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_paint_ceiling_apply",
    professional_name_ru: "Окраска потолков",
    material_title_ru: "Краска выбранной проектом системы для потолков",
    labor_title_ru: "Нанесение проектного количества слоёв краски на потолок",
    equipment_title_ru: "Малярное оборудование и средства безопасного доступа",
    method: "CEILING_PAINT_APPLICATION",
    material_system: "PAINT",
    formula_kind: "COAT_KG",
    required_stages: ["OVERHEAD_SUBSTRATE_ACCEPTANCE", "PAINT_PREPARATION", "CEILING_COAT_APPLICATION", "COVERAGE_CONTROL"],
    optional_stages: ["PRIMER", "MASKING", "MECHANIZED_SPRAY", "ACCESS_EQUIPMENT"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_decor_plaster_apply",
    professional_name_ru: "Нанесение декоративной штукатурки",
    material_title_ru: "Декоративная штукатурная композиция выбранной фактуры",
    labor_title_ru: "Нанесение и формирование проектной декоративной фактуры",
    equipment_title_ru: "Смесительное и фактурообразующее оборудование",
    method: "DECORATIVE_PLASTER_APPLICATION",
    material_system: "DECORATIVE_PLASTER",
    formula_kind: "LAYER_KG",
    required_stages: ["SUBSTRATE_ACCEPTANCE", "BATCH_PREPARATION", "DECORATIVE_APPLICATION", "REFERENCE_SAMPLE_CONTROL"],
    optional_stages: ["COLORED_PRIMER", "MASKING", "PROTECTIVE_COATING"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_primer_apply",
    professional_name_ru: "Грунтование отделочной поверхности",
    material_title_ru: "Грунтовочный состав выбранного назначения",
    labor_title_ru: "Равномерное нанесение проектного количества слоёв грунтовки",
    equipment_title_ru: "Оборудование для нанесения грунтовочного состава",
    method: "PRIMER_APPLICATION",
    material_system: "PRIMER",
    formula_kind: "COAT_KG",
    required_stages: ["SUBSTRATE_CLEANLINESS_CONTROL", "PRIMER_PREPARATION", "PRIMER_APPLICATION", "DRYING_CONTROL"],
    optional_stages: ["DUST_EXTRACTION", "MASKING", "SECOND_COAT"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_repair_layer_apply",
    professional_name_ru: "Нанесение локального ремонтного слоя",
    material_title_ru: "Ремонтный состав, совместимый с существующим основанием",
    labor_title_ru: "Заполнение дефектов и восстановление профиля ремонтным составом",
    equipment_title_ru: "Смесительное и ремонтное оборудование",
    method: "LOCAL_REPAIR_LAYER_APPLICATION",
    material_system: "REPAIR_MORTAR",
    formula_kind: "LAYER_KG",
    required_stages: ["DEFECT_MAPPING", "EDGE_PREPARATION", "REPAIR_APPLICATION", "BOND_CONTROL"],
    optional_stages: ["REINFORCEMENT", "BONDING_PRIMER", "CURING_PROTECTION"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_corner_apply",
    professional_name_ru: "Устройство отделочных углов и примыканий",
    material_title_ru: "Угловой профиль и сопрягающие элементы выбранной системы",
    labor_title_ru: "Установка и выверка угловых профилей и примыканий",
    equipment_title_ru: "Резательное и измерительное оборудование для профилей",
    method: "CORNER_PROFILE_INSTALLATION",
    material_system: "CORNER_PROFILE",
    formula_kind: "LINEAR_PROFILE",
    required_stages: ["JUNCTION_SURVEY", "PROFILE_CUTTING", "PROFILE_INSTALLATION", "LINE_CONTROL"],
    optional_stages: ["SEALING_TAPE", "ADDITIONAL_REINFORCEMENT"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_texture_apply",
    professional_name_ru: "Нанесение фактурного отделочного покрытия",
    material_title_ru: "Фактурный отделочный состав выбранной структуры",
    labor_title_ru: "Нанесение и структурирование фактурного покрытия",
    equipment_title_ru: "Смесительное и фактурообразующее оборудование",
    method: "TEXTURE_COATING_APPLICATION",
    material_system: "TEXTURE_COATING",
    formula_kind: "LAYER_KG",
    required_stages: ["REFERENCE_SAMPLE_ACCEPTANCE", "MATERIAL_PREPARATION", "TEXTURE_APPLICATION", "APPEARANCE_CONTROL"],
    optional_stages: ["COLORED_PRIMER", "MASKING", "PROTECTIVE_COATING"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_glass_fiber_apply",
    professional_name_ru: "Наклеивание малярного стеклохолста",
    material_title_ru: "Малярный стеклохолст выбранной плотности",
    labor_title_ru: "Раскрой, наклеивание и стыковка полотен стеклохолста",
    equipment_title_ru: "Раскройное и клеенаносящее оборудование",
    method: "GLASS_FIBER_WALLCOVERING_INSTALLATION",
    material_system: "GLASS_FIBER_SHEET",
    formula_kind: "AREA_SHEET",
    required_stages: ["SUBSTRATE_ACCEPTANCE", "SHEET_CUTTING", "ADHESIVE_APPLICATION", "SHEET_INSTALLATION", "JOINT_CONTROL"],
    optional_stages: ["PRIMER", "ADDITIONAL_JOINT_REINFORCEMENT"],
  },
  {
    canonical_base_work_key: "plaster_paint_interior_finish_layer_apply",
    professional_name_ru: "Нанесение финишного выравнивающего слоя",
    material_title_ru: "Финишная выравнивающая смесь выбранного класса качества",
    labor_title_ru: "Нанесение и доведение финишного слоя до проектного класса",
    equipment_title_ru: "Смесительное и финишно-шлифовальное оборудование",
    method: "FINISH_LAYER_APPLICATION",
    material_system: "FINISH_PUTTY",
    formula_kind: "LAYER_KG",
    required_stages: ["SUBSTRATE_ACCEPTANCE", "MIX_PREPARATION", "FINISH_APPLICATION", "FINISH_CLASS_CONTROL"],
    optional_stages: ["PRIMER", "SANDING", "DUST_EXTRACTION"],
  },
]);

const configByBaseWorkKey = new Map(CONFIGS.map((config) => [config.canonical_base_work_key, config]));

if (
  configByBaseWorkKey.size !== 12 ||
  INTERIOR_FINISHES_WAVE_1_INVENTORY.some((item) => !configByBaseWorkKey.has(canonicalBaseWorkKey(item.work_key)))
) {
  throw new Error("INTERIOR_WAVE1_CONFIG_DENOMINATOR_MISMATCH");
}

const SCOPE_LABELS_RU: Readonly<Record<InteriorFinishesWave1ScopeCapability, string>> = Object.freeze({
  standard: "Стандартные условия",
  small_area: "Малая площадь",
  large_area: "Большая площадь",
  wet_zone: "Мокрая зона",
  technical_room: "Техническое помещение",
  high_load: "Повышенная эксплуатационная нагрузка",
  repair: "Ремонт существующей отделки",
});

const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = { kind: "EQUALS", parameter_id: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" } as const;
const CERESIT_CT29_INTERIOR_WALL_PLASTER_ONLY = {
  kind: "EQUALS",
  parameter_id: "product_profile_id",
  value: CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID,
} as const;

function parameter(
  parameter_id: string,
  label_ru: string,
  input_type: ProfessionalDomainParameterDefinitionV1["input_type"],
  priority: ProfessionalDomainParameterDefinitionV1["priority"],
  unit_id: string | null,
  formula_consumers: readonly string[],
  options: {
    minimum?: number;
    maximum?: number;
    choices?: readonly { value: string; label_ru: string }[];
    fullOnly?: boolean;
    condition?: ProfessionalDomainParameterDefinitionV1["required_when"];
  } = {},
): ProfessionalDomainParameterDefinitionV1 {
  const condition = options.condition ?? (options.fullOnly ? FULL_ONLY : ALWAYS);
  return {
    parameter_id,
    label_ru,
    unit_id,
    priority,
    input_type,
    ...(options.minimum == null ? {} : { minimum: options.minimum }),
    ...(options.maximum == null ? {} : { maximum: options.maximum }),
    ...(options.choices ? { choices: options.choices } : {}),
    visible_when: condition,
    required_when: condition,
    formula_consumers,
    source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "APPLICABLE_NORM"],
  };
}

function quantityParameterId(config: TechnologyConfig): "junction_length_m" | "area_m2" {
  return config.formula_kind === "LINEAR_PROFILE" ? "junction_length_m" : "area_m2";
}

function formulaParameters(config: TechnologyConfig): ProfessionalDomainParameterDefinitionV1[] {
  if (config.formula_kind === "LAYER_KG") {
    return [
      parameter("layer_thickness_mm", "Толщина наносимого слоя", "number", "P0", "mm", ["primary_material_quantity"], { minimum: 0.1, maximum: 100 }),
      parameter("material_consumption_kg_m2_mm", "Расход выбранного материала на 1 м² при толщине 1 мм", "number", "P0", "kg_per_m2_mm", ["primary_material_quantity"], { minimum: 0.01, maximum: 20 }),
    ];
  }
  if (config.formula_kind === "COAT_KG") {
    return [
      parameter("coat_count", "Количество слоёв по проекту", "number", "P0", "item", ["primary_material_quantity"], { minimum: 1, maximum: 10 }),
      parameter("material_consumption_kg_m2_coat", "Расход выбранного материала на 1 м² одного слоя", "number", "P0", "kg_per_m2_coat", ["primary_material_quantity"], { minimum: 0.01, maximum: 5 }),
    ];
  }
  if (config.formula_kind === "AREA_SHEET") {
    return [
      parameter("material_consumption_m2_m2", "Расход стеклохолста с учётом раскроя", "number", "P0", "m2_per_m2", ["primary_material_quantity"], { minimum: 1, maximum: 2 }),
      parameter("material_mass_kg_per_unit", "Масса 1 м² выбранного стеклохолста", "number", "P0", "kg_per_m2", ["material_mass"], { minimum: 0.01, maximum: 2 }),
    ];
  }
  return [
    parameter("material_consumption_m_m", "Расход профиля на 1 м готового угла", "number", "P0", "m_per_m", ["primary_material_quantity"], { minimum: 1, maximum: 2 }),
    parameter("material_mass_kg_per_unit", "Масса 1 м выбранного профиля", "number", "P0", "kg_per_m", ["material_mass"], { minimum: 0.01, maximum: 10 }),
  ];
}

function scopeParameterDefinitions(
  scope: InteriorFinishesWave1ScopeCapability,
  quantityUnit: "m2" | "m",
): ProfessionalDomainParameterDefinitionV1[] {
  const perOutput = `${quantityUnit}_per_man_hour`;
  switch (scope) {
    case "standard":
      return [];
    case "small_area":
      return [
        parameter("small_area_detail_productivity_output_per_man_hour", "Производительность ручной доводки на малой площади", "number", "P1", perOutput, ["small_area_detail_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }),
      ];
    case "large_area":
      return [
        parameter("large_area_material_handling_productivity_kg_per_machine_hour", "Производительность механизированной подачи материалов", "number", "P1", "kg_per_machine_hour", ["large_area_material_handling_equipment"], { minimum: 0.01, maximum: 100_000, fullOnly: true }),
      ];
    case "wet_zone":
      return [
        parameter("wet_zone_protection_rate_kg_per_output", "Расход совместимого влагозащитного состава по проекту системы", "number", "P1", `kg_per_${quantityUnit}`, ["wet_zone_protection_material"], { minimum: 0.001, maximum: 100, fullOnly: true }),
        parameter("wet_zone_moisture_control_interval_output_per_test", "Площадь или длина на одну проверку влажности основания", "number", "P1", `${quantityUnit}_per_test`, ["wet_zone_moisture_tests"], { minimum: 0.01, maximum: 1_000_000, fullOnly: true }),
      ];
    case "technical_room":
      return [
        parameter("technical_room_protective_material_rate_kg_per_output", "Расход защитного материала для технического помещения", "number", "P1", `kg_per_${quantityUnit}`, ["technical_room_protective_material"], { minimum: 0.001, maximum: 100, fullOnly: true }),
        parameter("technical_room_detailing_productivity_output_per_man_hour", "Производительность обработки вводов, примыканий и инженерных проходок", "number", "P1", perOutput, ["technical_room_detailing_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }),
      ];
    case "high_load":
      return [
        parameter("high_load_reinforcement_rate_output_per_output", "Расход армирующего материала для зоны повышенной нагрузки", "number", "P1", `${quantityUnit}_per_${quantityUnit}`, ["high_load_reinforcement_material"], { minimum: 0.001, maximum: 10, fullOnly: true }),
        parameter("high_load_reinforcement_productivity_output_per_man_hour", "Производительность монтажа армирующего слоя", "number", "P1", perOutput, ["high_load_reinforcement_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }),
      ];
    case "repair":
      return [
        parameter("repair_removal_quantity_output", "Объём удаления непрочных участков существующей отделки", "number", "P1", quantityUnit, ["repair_removal_labor", "repair_removed_waste", "repair_waste_transport"], { minimum: 0.001, maximum: 10_000_000, fullOnly: true }),
        parameter("repair_removed_mass_kg_per_output", "Масса удаляемой отделки на единицу объёма", "number", "P1", `kg_per_${quantityUnit}`, ["repair_removed_waste", "repair_waste_transport"], { minimum: 0.001, maximum: 1_000, fullOnly: true }),
        parameter("repair_removal_productivity_output_per_man_hour", "Производительность удаления непрочных участков", "number", "P1", perOutput, ["repair_removal_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }),
        parameter("repair_waste_haul_distance_km", "Расстояние вывоза демонтированной отделки", "number", "P1", "km", ["repair_waste_transport"], { minimum: 0.1, maximum: 5_000, fullOnly: true }),
      ];
  }
}

function ceresitCt29InteriorWallPlasterConditionalParameters(
  config: TechnologyConfig,
  scope: InteriorFinishesWave1ScopeCapability,
): ProfessionalDomainParameterDefinitionV1[] {
  if (
    config.canonical_base_work_key !== "plaster_paint_interior_wall_plaster_apply" ||
    config.material_system !== "WALL_PLASTER" ||
    scope !== "standard"
  ) {
    return [];
  }
  const condition = CERESIT_CT29_INTERIOR_WALL_PLASTER_ONLY;
  return [
    parameter("ct29_application_mode", "Режим применения Ceresit CT 29", "choice", "P1", null, [], {
      choices: [{
        value: "plaster_application_by_area_and_thickness",
        label_ru: "Штукатурное нанесение по площади и толщине слоя",
      }],
      condition,
    }),
    parameter("substrate_type", "Минеральное основание для Ceresit CT 29", "choice", "P1", null, [], {
      choices: [
        "concrete",
        "traditional_plaster",
        "cement_lime_plaster",
        "rough_mineral_substrate",
        "small_masonry_work",
      ].map((value) => ({ value, label_ru: value })),
      condition,
    }),
    parameter("substrate_rough_load_carrying_clean_confirmed", "Основание шероховатое, несущее и очищенное", "boolean", "P1", null, [], { condition }),
    parameter("substrate_absorbency_class", "Класс впитываемости основания", "choice", "P1", null, [], {
      choices: [
        { value: "normal_absorption", label_ru: "Нормально впитывающее" },
        { value: "dry_highly_absorbent", label_ru: "Сухое сильно впитывающее" },
        { value: "low_or_non_homogeneous", label_ru: "Слабо или неоднородно впитывающее" },
      ],
      condition,
    }),
    parameter("substrate_absorbency_preparation_confirmed", "Подготовка основания выбрана по впитываемости", "boolean", "P1", null, [], { condition }),
    parameter("installation_location", "Место применения Ceresit CT 29", "choice", "P1", null, [], {
      choices: [{ value: "indoor", label_ru: "Внутренние стены" }],
      condition,
    }),
    parameter("application_conditions_confirmed", "Температура нанесения 5–25 °C и условия TDS подтверждены", "boolean", "P1", null, [], { condition }),
    parameter("exterior_curing_protection_confirmed", "Наружная защита от дождя и быстрого высыхания применима", "boolean", "P1", null, [], { condition }),
    parameter("ct29_global_tds_variant_confirmed", "Подтверждена карточка C_CT29_TDS_1_0120", "boolean", "P1", null, [], { condition }),
    parameter("selected_bag_size_kg", "Выбранная фасовка Ceresit CT 29", "choice", "P1", "kg", [], {
      choices: [5, 25].map((value) => ({ value: String(value), label_ru: `${value} кг` })),
      condition,
    }),
  ];
}

function schemaFor(
  technologyId: string,
  config: TechnologyConfig,
  scope: InteriorFinishesWave1ScopeCapability,
): ProfessionalDomainParameterSchemaV1 {
  const quantityId = quantityParameterId(config);
  const quantityUnit = quantityId === "area_m2" ? "m2" : "m";
  return {
    schema_id: `${technologyId}:parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: technologyId,
    parameters: [
      parameter("work_included", "Выбранная операция входит в объём проекта", "boolean", "P0", null, [], {
        choices: [{ value: "true", label_ru: "Да" }, { value: "false", label_ru: "Нет" }],
      }),
      parameter("estimate_scope_mode", "Состав расчёта", "choice", "P0", null, [], {
        choices: [
          { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Только явно выбранная операция" },
          { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый состав" },
        ],
      }),
      parameter("scope_capability", "Условия участка", "choice", "P0", null, [], {
        choices: [{ value: scope, label_ru: SCOPE_LABELS_RU[scope] }],
      }),
      parameter("funding_source", "Источник финансирования проекта", "choice", "P0", null, [], {
        choices: [
          { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
          { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
          { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
        ],
      }),
      parameter("project_type", "Тип объекта по проекту", "text", "P0", null, [], {}),
      parameter(quantityId, quantityId === "area_m2" ? "Площадь отделочной поверхности" : "Длина углов и примыканий", "number", "P0", quantityUnit, ["primary_material_quantity", "application_labor", "application_equipment"], { minimum: 0.01, maximum: 10_000_000 }),
      parameter("surface_type", "Материал и тип основания", "choice", "P0", null, [], {
        choices: [
          { value: "CONCRETE", label_ru: "Бетон" },
          { value: "MASONRY", label_ru: "Кладка" },
          { value: "CEMENT_PLASTER", label_ru: "Цементная штукатурка" },
          { value: "GYPSUM_BOARD", label_ru: "Гипсокартон" },
          { value: "PROJECT_SPECIFIED", label_ru: "По проекту" },
        ],
      }),
      parameter("existing_condition", "Состояние основания", "choice", "P0", null, [], {
        choices: [
          { value: "ACCEPTED", label_ru: "Принято и готово" },
          { value: "LOCAL_REPAIR_REQUIRED", label_ru: "Нужен локальный ремонт" },
          { value: "FULL_PREPARATION_REQUIRED", label_ru: "Нужна полная подготовка" },
        ],
      }),
      parameter("application_method", "Способ выполнения", "choice", "P0", null, [], {
        choices: [
          { value: "MANUAL", label_ru: "Ручной" },
          { value: "MECHANIZED", label_ru: "Механизированный" },
          { value: "PROJECT_SPECIFIED", label_ru: "По проекту" },
        ],
      }),
      parameter("product_profile_id", "Паспорт выбранного материала или системы", "text", "P0", null, [], {}),
      parameter("normative_rate_code", "Код применимой ресурсной расценки по проекту", "text", "P0", null, [], {}),
      ...formulaParameters(config),
      ...ceresitCt29InteriorWallPlasterConditionalParameters(config, scope),
      parameter("labor_productivity_output_per_man_hour", "Производительность труда по принятой норме или проекту производства работ", "number", "P0", `${quantityUnit}_per_man_hour`, ["application_labor"], { minimum: 0.01, maximum: 10_000 }),
      parameter("equipment_productivity_output_per_machine_hour", "Производительность выбранного механизма", "number", "P0", `${quantityUnit}_per_machine_hour`, ["application_equipment"], { minimum: 0.01, maximum: 100_000 }),
      parameter("surface_preparation_productivity_output_per_man_hour", "Производительность подготовки основания", "number", "P1", `${quantityUnit}_per_man_hour`, ["surface_preparation_labor"], { minimum: 0.01, maximum: 10_000, fullOnly: true }),
      parameter("auxiliary_material_rate_kg_per_output", "Расход вспомогательных материалов", "number", "P1", `kg_per_${quantityUnit}`, ["auxiliary_material"], { minimum: 0, maximum: 100, fullOnly: true }),
      parameter("waste_percent", "Проектный процент технологических потерь", "number", "P1", "percent", ["waste_output"], { minimum: 0, maximum: 50, fullOnly: true }),
      parameter("delivery_distance_km", "Расстояние доставки материалов", "number", "P1", "km", ["transport_t_km"], { minimum: 0.1, maximum: 5_000, fullOnly: true }),
      parameter("truck_payload_t", "Полезная грузоподъёмность транспорта", "number", "P1", "t", ["delivery_trips"], { minimum: 0.1, maximum: 100, fullOnly: true }),
      parameter("loading_productivity_kg_per_man_hour", "Производительность погрузочно-разгрузочных работ", "number", "P1", "kg_per_man_hour", ["loading_labor"], { minimum: 0.1, maximum: 100_000, fullOnly: true }),
      parameter("waste_handling_productivity_kg_per_man_hour", "Производительность сбора и перемещения отходов", "number", "P1", "kg_per_man_hour", ["waste_handling_labor"], { minimum: 0.1, maximum: 100_000, fullOnly: true }),
      parameter("qa_interval_output_per_test", "Площадь или длина на одну контрольную проверку", "number", "P1", `${quantityUnit}_per_test`, ["quality_tests"], { minimum: 0.01, maximum: 1_000_000, fullOnly: true }),
      parameter("documentation_record_count", "Количество актов и записей исполнительной документации", "number", "P1", "item", ["documentation_records"], { minimum: 1, maximum: 10_000, fullOnly: true }),
      ...scopeParameterDefinitions(scope, quantityUnit),
    ],
    quantity_alternatives: [[quantityId]],
  };
}

function assemblyParameter(
  parameter_id: string,
  title_ru: string,
  role: ProfessionalAssemblyParameterDefinitionV4["role"],
  unit_id: string | null,
  required_for: ProfessionalAssemblyParameterDefinitionV4["required_for"],
): ProfessionalAssemblyParameterDefinitionV4 {
  return { parameter_id, title_ru, role, unit_id, required_for };
}

function formula(
  formula_id: string,
  expression: string,
  input_parameter_ids: readonly string[],
  output_unit_id: string,
  calculate: ProfessionalAssemblyFormulaV4["calculate"],
): ProfessionalAssemblyFormulaV4 {
  return { formula_id, expression, input_parameter_ids, output_unit_id, calculate };
}

function primaryMaterialFormula(config: TechnologyConfig, technologyId: string): ProfessionalAssemblyFormulaV4 {
  const quantityId = quantityParameterId(config);
  if (config.formula_kind === "LAYER_KG") {
    return formula(`${technologyId}:primary-material:v1`, "area_m2 × layer_thickness_mm × material_consumption_kg_m2_mm", ["area_m2", "layer_thickness_mm", "material_consumption_kg_m2_mm"], "kg", (v) => v.area_m2 * v.layer_thickness_mm * v.material_consumption_kg_m2_mm);
  }
  if (config.formula_kind === "COAT_KG") {
    return formula(`${technologyId}:primary-material:v1`, "area_m2 × coat_count × material_consumption_kg_m2_coat", ["area_m2", "coat_count", "material_consumption_kg_m2_coat"], "kg", (v) => v.area_m2 * v.coat_count * v.material_consumption_kg_m2_coat);
  }
  if (config.formula_kind === "AREA_SHEET") {
    return formula(`${technologyId}:primary-material:v1`, "area_m2 × material_consumption_m2_m2", ["area_m2", "material_consumption_m2_m2"], "m2", (v) => v.area_m2 * v.material_consumption_m2_m2);
  }
  return formula(`${technologyId}:primary-material:v1`, "junction_length_m × material_consumption_m_m", [quantityId, "material_consumption_m_m"], "m", (v) => v.junction_length_m * v.material_consumption_m_m);
}

function materialMassFormula(config: TechnologyConfig, technologyId: string): ProfessionalAssemblyFormulaV4 {
  const primary = primaryMaterialFormula(config, technologyId);
  if (primary.output_unit_id === "kg") {
    return { ...primary, formula_id: `${technologyId}:material-mass:v1` };
  }
  return formula(`${technologyId}:material-mass:v1`, `(${primary.expression}) × material_mass_kg_per_unit`, [...primary.input_parameter_ids, "material_mass_kg_per_unit"], "kg", (v) => primary.calculate(v) * v.material_mass_kg_per_unit);
}

function row(
  technologyId: string,
  rowId: string,
  section: string,
  category: ProfessionalAssemblyRowDefinitionV4["category"],
  titleRu: string,
  rowFormula: ProfessionalAssemblyFormulaV4,
  costOwnership: ProfessionalAssemblyRowDefinitionV4["cost_ownership"] = "priced_resource",
  supportedScope: "BOTH" | "FULL_ONLY" = "FULL_ONLY",
): ProfessionalAssemblyRowDefinitionV4 {
  return {
    row_id: `${technologyId}:row:${rowId}`,
    section,
    category,
    title_ru: titleRu,
    formula: rowFormula,
    cost_ownership: costOwnership,
    cost_owner_id: `${technologyId}:cost-owner:${rowId}`,
    semantic_owner: `${technologyId}:semantic-owner:${rowId}`,
    normative_source_ids: ["kg_krer_2015_application_guidance", "kg_krerr_2015_application_guidance"],
    inclusion_condition: supportedScope === "BOTH"
      ? "work_included=true"
      : "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE",
    procurement_eligible: category === "material" || category === "transport" || category === "waste",
  };
}

function mainAssembly(technologyId: string, config: TechnologyConfig): ProfessionalChildAssemblyV4 {
  const quantityId = quantityParameterId(config);
  const quantityUnit = quantityId === "area_m2" ? "m2" : "m";
  const primaryFormula = primaryMaterialFormula(config, technologyId);
  const mainParameters: ProfessionalAssemblyParameterDefinitionV4[] = [
    assemblyParameter("work_included", "Операция включена", "SCOPE_TRIGGER", null, ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]),
    assemblyParameter(quantityId, quantityId === "area_m2" ? "Площадь поверхности" : "Длина углов", "PROJECT_QUANTITY", quantityUnit, ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]),
    ...primaryFormula.input_parameter_ids
      .filter((parameterId) => parameterId !== quantityId)
      .map((parameterId) => assemblyParameter(parameterId, parameterId, "MATERIAL_PASSPORT_VALUE", parameterId.includes("thickness") ? "mm" : parameterId === "coat_count" ? "item" : null, ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"])),
    assemblyParameter("labor_productivity_output_per_man_hour", "Производительность труда", "NORM_RATE", `${quantityUnit}_per_man_hour`, ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]),
    assemblyParameter("equipment_productivity_output_per_machine_hour", "Производительность механизма", "NORM_RATE", `${quantityUnit}_per_machine_hour`, ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]),
  ];
  return {
    child_passport_id: `${technologyId}:main-passport`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_WAVE_1_DOMAIN_ID,
    assembly_id: `${technologyId}:main-assembly:v1`,
    title_ru: config.professional_name_ru,
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
    parameters: mainParameters,
    rows: [
      row(technologyId, "primary_material", "Материалы", "material", config.material_title_ru, primaryFormula, "priced_resource", "BOTH"),
      row(technologyId, "application_labor", "Основной технологический процесс", "labor", config.labor_title_ru,
        formula(`${technologyId}:application-labor:v1`, `${quantityId} ÷ labor_productivity_output_per_man_hour`, [quantityId, "labor_productivity_output_per_man_hour"], "man_hour", (v) => v[quantityId] / v.labor_productivity_output_per_man_hour), "priced_resource", "BOTH"),
      row(technologyId, "application_equipment", "Машины и механизмы", "equipment", config.equipment_title_ru,
        formula(`${technologyId}:application-equipment:v1`, `${quantityId} ÷ equipment_productivity_output_per_machine_hour`, [quantityId, "equipment_productivity_output_per_machine_hour"], "machine_hour", (v) => v[quantityId] / v.equipment_productivity_output_per_machine_hour), "priced_resource", "BOTH"),
    ],
  };
}

function fullAssembly(technologyId: string, config: TechnologyConfig): ProfessionalChildAssemblyV4 {
  const quantityId = quantityParameterId(config);
  const quantityUnit = quantityId === "area_m2" ? "m2" : "m";
  const massFormula = materialMassFormula(config, technologyId);
  const primaryFormula = primaryMaterialFormula(config, technologyId);
  const massInputs = massFormula.input_parameter_ids;
  return {
    child_passport_id: `${technologyId}:full-support-passport`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_WAVE_1_DOMAIN_ID,
    assembly_id: `${technologyId}:full-support-assembly:v1`,
    title_ru: `Полный применимый состав: ${config.professional_name_ru}`,
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: ["FULL_APPLICABLE_SCOPE"],
    parameters: [
      assemblyParameter("work_included", "Операция включена", "SCOPE_TRIGGER", null, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter(quantityId, "Проектный объём", "PROJECT_QUANTITY", quantityUnit, ["FULL_APPLICABLE_SCOPE"]),
      ...massInputs.filter((id) => id !== quantityId).map((id) => assemblyParameter(id, id, id.includes("productivity") ? "NORM_RATE" : "MATERIAL_PASSPORT_VALUE", null, ["FULL_APPLICABLE_SCOPE"])),
      assemblyParameter("surface_preparation_productivity_output_per_man_hour", "Производительность подготовки", "NORM_RATE", `${quantityUnit}_per_man_hour`, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("auxiliary_material_rate_kg_per_output", "Расход вспомогательных материалов", "MATERIAL_PASSPORT_VALUE", `kg_per_${quantityUnit}`, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("waste_percent", "Технологические потери", "PROJECT_QUANTITY", "percent", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("delivery_distance_km", "Расстояние доставки", "LOGISTICS_VALUE", "km", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("truck_payload_t", "Грузоподъёмность транспорта", "LOGISTICS_VALUE", "t", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("loading_productivity_kg_per_man_hour", "Производительность погрузки", "NORM_RATE", "kg_per_man_hour", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("waste_handling_productivity_kg_per_man_hour", "Производительность обращения с отходами", "NORM_RATE", "kg_per_man_hour", ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("qa_interval_output_per_test", "Интервал контроля", "CONTROL_PLAN_VALUE", `${quantityUnit}_per_test`, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("documentation_record_count", "Количество записей документации", "CONTROL_PLAN_VALUE", "item", ["FULL_APPLICABLE_SCOPE"]),
    ],
    rows: [
      row(technologyId, "surface_preparation_labor", "Подготовка основания", "labor", `Подготовка основания перед операцией «${config.professional_name_ru}»`,
        formula(`${technologyId}:surface-preparation-labor:v1`, `${quantityId} ÷ surface_preparation_productivity_output_per_man_hour`, [quantityId, "surface_preparation_productivity_output_per_man_hour"], "man_hour", (v) => v[quantityId] / v.surface_preparation_productivity_output_per_man_hour)),
      row(technologyId, "auxiliary_material", "Вспомогательные материалы", "material", `Вспомогательные материалы системы «${config.professional_name_ru}»`,
        formula(`${technologyId}:auxiliary-material:v1`, `${quantityId} × auxiliary_material_rate_kg_per_output`, [quantityId, "auxiliary_material_rate_kg_per_output"], "kg", (v) => v[quantityId] * v.auxiliary_material_rate_kg_per_output)),
      row(technologyId, "transport_t_km", "Доставка и логистика", "transport", `Транспортная работа по доставке материалов для «${config.professional_name_ru}»`,
        formula(`${technologyId}:transport-t-km:v1`, `((${massFormula.expression}) ÷ 1000) × delivery_distance_km`, [...massInputs, "delivery_distance_km"], "t_km", (v) => (massFormula.calculate(v) / 1000) * v.delivery_distance_km)),
      row(technologyId, "delivery_trips", "Доставка и логистика", "transport", `Рейсы транспорта для материалов «${config.professional_name_ru}»`,
        formula(`${technologyId}:delivery-trips:v1`, `ceil(((${massFormula.expression}) ÷ 1000) ÷ truck_payload_t)`, [...massInputs, "truck_payload_t"], "trip", (v) => Math.ceil((massFormula.calculate(v) / 1000) / v.truck_payload_t))),
      row(technologyId, "loading_labor", "Погрузка и разгрузка", "labor", `Погрузочно-разгрузочные работы для «${config.professional_name_ru}»`,
        formula(`${technologyId}:loading-labor:v1`, `(${massFormula.expression}) ÷ loading_productivity_kg_per_man_hour`, [...massInputs, "loading_productivity_kg_per_man_hour"], "man_hour", (v) => massFormula.calculate(v) / v.loading_productivity_kg_per_man_hour)),
      row(technologyId, "waste_output", "Отходы и утилизация", "waste", `Технологические отходы материалов «${config.professional_name_ru}»`,
        formula(`${technologyId}:waste-output:v1`, `(${primaryFormula.expression}) × waste_percent ÷ 100`, [...primaryFormula.input_parameter_ids, "waste_percent"], primaryFormula.output_unit_id, (v) => primaryFormula.calculate(v) * v.waste_percent / 100), "informational_output"),
      row(technologyId, "waste_handling_labor", "Отходы и утилизация", "labor", `Сбор и перемещение отходов после «${config.professional_name_ru}»`,
        formula(`${technologyId}:waste-handling-labor:v1`, `((${massFormula.expression}) × waste_percent ÷ 100) ÷ waste_handling_productivity_kg_per_man_hour`, [...massInputs, "waste_percent", "waste_handling_productivity_kg_per_man_hour"], "man_hour", (v) => (massFormula.calculate(v) * v.waste_percent / 100) / v.waste_handling_productivity_kg_per_man_hour)),
      row(technologyId, "quality_tests", "Контроль качества", "testing", `Контроль основания, геометрии и качества результата «${config.professional_name_ru}»`,
        formula(`${technologyId}:quality-tests:v1`, `ceil(${quantityId} ÷ qa_interval_output_per_test)`, [quantityId, "qa_interval_output_per_test"], "test", (v) => Math.ceil(v[quantityId] / v.qa_interval_output_per_test))),
      row(technologyId, "documentation_records", "Исполнительная документация", "documentation", `Акты, паспорта материалов и записи контроля для «${config.professional_name_ru}»`,
        formula(`${technologyId}:documentation-records:v1`, "documentation_record_count", ["documentation_record_count"], "item", (v) => v.documentation_record_count)),
    ],
  };
}

function scopeAssembly(
  technologyId: string,
  config: TechnologyConfig,
  scope: InteriorFinishesWave1ScopeCapability,
): ProfessionalChildAssemblyV4 | null {
  if (scope === "standard") return null;
  const quantityId = quantityParameterId(config);
  const quantityUnit = quantityId === "area_m2" ? "m2" : "m";
  const baseParameters: ProfessionalAssemblyParameterDefinitionV4[] = [
    assemblyParameter("work_included", "Операция включена", "SCOPE_TRIGGER", null, ["FULL_APPLICABLE_SCOPE"]),
  ];
  const rows: ProfessionalAssemblyRowDefinitionV4[] = [];
  const parameters: ProfessionalAssemblyParameterDefinitionV4[] = [...baseParameters];

  if (scope === "small_area") {
    parameters.push(
      assemblyParameter(quantityId, "Проектный объём", "PROJECT_QUANTITY", quantityUnit, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("small_area_detail_productivity_output_per_man_hour", "Производительность ручной доводки", "NORM_RATE", `${quantityUnit}_per_man_hour`, ["FULL_APPLICABLE_SCOPE"]),
    );
    rows.push(row(technologyId, "small_area_detail_labor", "Особые условия малой площади", "labor", `Ручная доводка и обработка границ малой площади для «${config.professional_name_ru}»`,
      formula(`${technologyId}:small-area-detail-labor:v1`, `${quantityId} ÷ small_area_detail_productivity_output_per_man_hour`, [quantityId, "small_area_detail_productivity_output_per_man_hour"], "man_hour", (v) => v[quantityId] / v.small_area_detail_productivity_output_per_man_hour)));
  } else if (scope === "large_area") {
    const massFormula = materialMassFormula(config, technologyId);
    parameters.push(
      ...massFormula.input_parameter_ids.map((id) => assemblyParameter(id, id, id === quantityId ? "PROJECT_QUANTITY" : "MATERIAL_PASSPORT_VALUE", id === quantityId ? quantityUnit : null, ["FULL_APPLICABLE_SCOPE"])),
      assemblyParameter("large_area_material_handling_productivity_kg_per_machine_hour", "Производительность механизированной подачи", "NORM_RATE", "kg_per_machine_hour", ["FULL_APPLICABLE_SCOPE"]),
    );
    rows.push(row(technologyId, "large_area_material_handling_equipment", "Механизированная подача материалов", "equipment", `Механизированная подача материалов на большой площади для «${config.professional_name_ru}»`,
      formula(`${technologyId}:large-area-material-handling:v1`, `(${massFormula.expression}) ÷ large_area_material_handling_productivity_kg_per_machine_hour`, [...massFormula.input_parameter_ids, "large_area_material_handling_productivity_kg_per_machine_hour"], "machine_hour", (v) => massFormula.calculate(v) / v.large_area_material_handling_productivity_kg_per_machine_hour)));
  } else if (scope === "wet_zone") {
    parameters.push(
      assemblyParameter(quantityId, "Проектный объём", "PROJECT_QUANTITY", quantityUnit, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("wet_zone_protection_rate_kg_per_output", "Расход влагозащитного состава", "MATERIAL_PASSPORT_VALUE", `kg_per_${quantityUnit}`, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("wet_zone_moisture_control_interval_output_per_test", "Интервал контроля влажности", "CONTROL_PLAN_VALUE", `${quantityUnit}_per_test`, ["FULL_APPLICABLE_SCOPE"]),
    );
    rows.push(
      row(technologyId, "wet_zone_protection_material", "Материалы мокрой зоны", "material", `Совместимый влагозащитный состав системы для «${config.professional_name_ru}»`,
        formula(`${technologyId}:wet-zone-protection-material:v1`, `${quantityId} × wet_zone_protection_rate_kg_per_output`, [quantityId, "wet_zone_protection_rate_kg_per_output"], "kg", (v) => v[quantityId] * v.wet_zone_protection_rate_kg_per_output)),
      row(technologyId, "wet_zone_moisture_tests", "Контроль влажности", "testing", `Измерение влажности основания мокрой зоны перед «${config.professional_name_ru}»`,
        formula(`${technologyId}:wet-zone-moisture-tests:v1`, `ceil(${quantityId} ÷ wet_zone_moisture_control_interval_output_per_test)`, [quantityId, "wet_zone_moisture_control_interval_output_per_test"], "test", (v) => Math.ceil(v[quantityId] / v.wet_zone_moisture_control_interval_output_per_test))),
    );
  } else if (scope === "technical_room") {
    parameters.push(
      assemblyParameter(quantityId, "Проектный объём", "PROJECT_QUANTITY", quantityUnit, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("technical_room_protective_material_rate_kg_per_output", "Расход защитного материала", "MATERIAL_PASSPORT_VALUE", `kg_per_${quantityUnit}`, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("technical_room_detailing_productivity_output_per_man_hour", "Производительность обработки проходок", "NORM_RATE", `${quantityUnit}_per_man_hour`, ["FULL_APPLICABLE_SCOPE"]),
    );
    rows.push(
      row(technologyId, "technical_room_protective_material", "Материалы технического помещения", "material", `Защитный материал проектной системы технического помещения для «${config.professional_name_ru}»`,
        formula(`${technologyId}:technical-room-protective-material:v1`, `${quantityId} × technical_room_protective_material_rate_kg_per_output`, [quantityId, "technical_room_protective_material_rate_kg_per_output"], "kg", (v) => v[quantityId] * v.technical_room_protective_material_rate_kg_per_output)),
      row(technologyId, "technical_room_detailing_labor", "Инженерные проходки и примыкания", "labor", `Обработка вводов, проходок и примыканий технического помещения для «${config.professional_name_ru}»`,
        formula(`${technologyId}:technical-room-detailing-labor:v1`, `${quantityId} ÷ technical_room_detailing_productivity_output_per_man_hour`, [quantityId, "technical_room_detailing_productivity_output_per_man_hour"], "man_hour", (v) => v[quantityId] / v.technical_room_detailing_productivity_output_per_man_hour)),
    );
  } else if (scope === "high_load") {
    parameters.push(
      assemblyParameter(quantityId, "Проектный объём", "PROJECT_QUANTITY", quantityUnit, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("high_load_reinforcement_rate_output_per_output", "Расход армирующего материала", "MATERIAL_PASSPORT_VALUE", `${quantityUnit}_per_${quantityUnit}`, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("high_load_reinforcement_productivity_output_per_man_hour", "Производительность монтажа армирующего слоя", "NORM_RATE", `${quantityUnit}_per_man_hour`, ["FULL_APPLICABLE_SCOPE"]),
    );
    rows.push(
      row(technologyId, "high_load_reinforcement_material", "Армирование зоны повышенной нагрузки", "material", `Армирующий материал проектной системы для «${config.professional_name_ru}»`,
        formula(`${technologyId}:high-load-reinforcement-material:v1`, `${quantityId} × high_load_reinforcement_rate_output_per_output`, [quantityId, "high_load_reinforcement_rate_output_per_output"], quantityUnit, (v) => v[quantityId] * v.high_load_reinforcement_rate_output_per_output)),
      row(technologyId, "high_load_reinforcement_labor", "Армирование зоны повышенной нагрузки", "labor", `Монтаж армирующего слоя для «${config.professional_name_ru}»`,
        formula(`${technologyId}:high-load-reinforcement-labor:v1`, `${quantityId} ÷ high_load_reinforcement_productivity_output_per_man_hour`, [quantityId, "high_load_reinforcement_productivity_output_per_man_hour"], "man_hour", (v) => v[quantityId] / v.high_load_reinforcement_productivity_output_per_man_hour)),
    );
  } else {
    parameters.push(
      assemblyParameter("repair_removal_quantity_output", "Объём удаления существующей отделки", "PROJECT_QUANTITY", quantityUnit, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("repair_removed_mass_kg_per_output", "Масса удаляемой отделки", "PROJECT_QUANTITY", `kg_per_${quantityUnit}`, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("repair_removal_productivity_output_per_man_hour", "Производительность удаления", "NORM_RATE", `${quantityUnit}_per_man_hour`, ["FULL_APPLICABLE_SCOPE"]),
      assemblyParameter("repair_waste_haul_distance_km", "Расстояние вывоза", "LOGISTICS_VALUE", "km", ["FULL_APPLICABLE_SCOPE"]),
    );
    rows.push(
      row(technologyId, "repair_removal_labor", "Демонтаж и подготовка ремонта", "labor", `Удаление непрочных участков перед «${config.professional_name_ru}»`,
        formula(`${technologyId}:repair-removal-labor:v1`, "repair_removal_quantity_output ÷ repair_removal_productivity_output_per_man_hour", ["repair_removal_quantity_output", "repair_removal_productivity_output_per_man_hour"], "man_hour", (v) => v.repair_removal_quantity_output / v.repair_removal_productivity_output_per_man_hour)),
      row(technologyId, "repair_removed_waste", "Демонтажные отходы", "waste", `Отходы удалённой существующей отделки перед «${config.professional_name_ru}»`,
        formula(`${technologyId}:repair-removed-waste:v1`, "repair_removal_quantity_output × repair_removed_mass_kg_per_output", ["repair_removal_quantity_output", "repair_removed_mass_kg_per_output"], "kg", (v) => v.repair_removal_quantity_output * v.repair_removed_mass_kg_per_output)),
      row(technologyId, "repair_waste_transport", "Вывоз демонтажных отходов", "transport", `Транспортная работа по вывозу отходов перед «${config.professional_name_ru}»`,
        formula(`${technologyId}:repair-waste-transport:v1`, "(repair_removal_quantity_output × repair_removed_mass_kg_per_output ÷ 1000) × repair_waste_haul_distance_km", ["repair_removal_quantity_output", "repair_removed_mass_kg_per_output", "repair_waste_haul_distance_km"], "t_km", (v) => (v.repair_removal_quantity_output * v.repair_removed_mass_kg_per_output / 1000) * v.repair_waste_haul_distance_km)),
    );
  }

  return {
    child_passport_id: `${technologyId}:scope-${scope}-passport`,
    child_passport_version: "1.0.0",
    domain_owner: INTERIOR_FINISHES_WAVE_1_DOMAIN_ID,
    assembly_id: `${technologyId}:scope-${scope}-assembly:v1`,
    title_ru: `${SCOPE_LABELS_RU[scope]}: ${config.professional_name_ru}`,
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: ["FULL_APPLICABLE_SCOPE"],
    parameters,
    rows,
  };
}

function normativeProfiles(
  technologyId: string,
  config: TechnologyConfig,
  scope: InteriorFinishesWave1ScopeCapability,
): ProfessionalNormativeProfileV1[] {
  const resourceSourceId = scope === "repair"
    ? "kg_krerr_2015_application_guidance"
    : "kg_krer_2015_application_guidance";
  const profiles: ProfessionalNormativeProfileV1[] = [
    {
      profile_id: `${technologyId}:kg-resource-norm-profile:v1`,
      profile_version: "1.0.0",
      technology_id: technologyId,
      jurisdiction: "KG",
      requested_source_ids: [resourceSourceId],
      requested_source_types: ["RESOURCE_ESTIMATE_NORM"],
      rejected_foreign_source_ids: ["ru_gesn_15", "ru_fer_15"],
    },
  ];
  if (config.material_system === "PAINT" || config.material_system === "PRIMER") {
    profiles.push({
      profile_id: `${technologyId}:eaeu-paint-safety-profile:v1`,
      profile_version: "1.0.0",
      technology_id: technologyId,
      jurisdiction: "EAEU",
      requested_source_ids: ["eaeu_tr_053_2026_paint_safety"],
      requested_source_types: ["LAW_OR_TECHNICAL_REGULATION"],
      rejected_foreign_source_ids: [],
    });
  }
  return profiles;
}

const technologies: ProfessionalCanonicalTechnologyV1[] = [];
const schemas: ProfessionalDomainParameterSchemaV1[] = [];
const profiles: ProfessionalNormativeProfileV1[] = [];
const formulaPacks: ProfessionalFormulaPackV1[] = [];
const assemblyProfiles: ProfessionalAssemblyProfileV1[] = [];
const resourcePolicies: ProfessionalResourceCompletenessPolicyV1[] = [];

for (const inventory of INTERIOR_FINISHES_WAVE_1_INVENTORY) {
  const technologyId = inventory.canonical_technology_id;
  const config = configByBaseWorkKey.get(canonicalBaseWorkKey(inventory.work_key));
  if (!config) throw new Error(`INTERIOR_WAVE1_CONFIG_MISSING:${technologyId}`);
  const scope = inventory.scope_capability;
  const schema = schemaFor(technologyId, config, scope);
  const technologyProfiles = normativeProfiles(technologyId, config, scope);
  const scopedChild = scopeAssembly(technologyId, config, scope);
  const children = [mainAssembly(technologyId, config), fullAssembly(technologyId, config), ...(scopedChild ? [scopedChild] : [])];
  const formulaIds = children.flatMap((child) => child.rows.map((item) => item.formula.formula_id));
  const formulaPackId = `${technologyId}:formula-pack:v1`;
  const assemblyProfileId = `${technologyId}:assembly-profile:v1`;
  const policyId = `${technologyId}:resource-policy:v1`;
  technologies.push({
    technology_id: technologyId,
    operation_class: "APPLY",
    method: `${config.method}:${scope.toUpperCase()}`,
    material_system: config.material_system,
    output: {
      dimension: config.formula_kind === "LINEAR_PROFILE" ? "LENGTH" : "AREA",
      unit_id: config.formula_kind === "LINEAR_PROFILE" ? "m" : "m2",
    },
    required_stages: [...config.required_stages, `SCOPE_${scope.toUpperCase()}`],
    optional_stages: config.optional_stages,
    forbidden_stages: ["GENERIC_INSTALLATION", "UNSOURCED_ONE_BUNDLE_RESOURCE", "ASPHALT_STAGE"],
    parameter_schema_id: schema.schema_id,
    formula_pack_id: formulaPackId,
    assembly_profile_id: assemblyProfileId,
    normative_profile_ids: technologyProfiles.map((profile) => profile.profile_id),
    resource_completeness_policy_id: policyId,
  });
  schemas.push(schema);
  profiles.push(...technologyProfiles);
  formulaPacks.push({
    formula_pack_id: formulaPackId,
    formula_pack_version: "1.0.0",
    technology_id: technologyId,
    formula_ids: formulaIds,
    unit_trace_contract: ["formula_expression", "input_parameter_ids", "input_values_with_sources", "output_unit", "substitution_trace"],
  });
  assemblyProfiles.push({
    assembly_profile_id: assemblyProfileId,
    assembly_profile_version: "1.0.0",
    technology_id: technologyId,
    child_assemblies: children,
  });
  resourcePolicies.push({
    policy_id: policyId,
    technology_id: technologyId,
    required_categories: ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"],
    optional_categories: ["subcontract_service", "temporary_work"],
    forbidden_generic_rows: ["Основные материалы", "Общестроительные работы", "Комплект оборудования", "Технологический запас"],
    one_bundle_resource_replacement_forbidden: true,
  });
}

export const INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE: ProfessionalEstimateDomainPackageV1 = {
  manifest: {
    domain_id: INTERIOR_FINISHES_WAVE_1_DOMAIN_ID,
    domain_version: "1.0.0",
    catalog_record_count: INTERIOR_FINISHES_WAVE_1_INVENTORY.length,
    canonical_technology_count: technologies.length,
    alias_count: 0,
    excluded_count: 0,
    supported_scopes: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
    supported_jurisdictions: ["KG"],
    passports: technologies.map((technology) => `domain-passport:${technology.technology_id}`),
    schemas: schemas.map((schema) => schema.schema_id),
    formula_packs: formulaPacks.map((pack) => pack.formula_pack_id),
    normative_profiles: profiles.map((profile) => profile.profile_id),
    child_assembly_dependencies: [],
    readiness: "IMPLEMENTATION_READY",
  },
  catalog_bindings: INTERIOR_FINISHES_WAVE_1_CATALOG_BINDINGS,
  canonical_technologies: technologies,
  parameter_schemas: schemas,
  normative_profiles: profiles,
  formula_packs: formulaPacks,
  assembly_profiles: assemblyProfiles,
  resource_completeness_policies: resourcePolicies,
};

export const interiorFinishesWave1DomainFactory = createProfessionalEstimateDomainFactoryV1(
  INTERIOR_FINISHES_WAVE_1_DOMAIN_PACKAGE,
);
