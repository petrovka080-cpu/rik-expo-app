import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
  ProfessionalEstimateScopeModeV4,
} from "../../professionalProjectAssemblyV4";
import {
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
  WATER_SEWER_COMPLETE_ALIAS_COUNT,
  WATER_SEWER_COMPLETE_DOMAIN_ID,
  WATER_SEWER_COMPLETE_DOMAIN_VERSION,
  WATER_SEWER_COMPLETE_RECORD_COUNT,
  WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT,
  WATER_SEWER_DOMAIN_CATALOG_BINDINGS,
  WATER_SEWER_DOMAIN_INVENTORY,
  WATER_SEWER_REVIEWED_EXCLUSION_COUNT,
  type WaterSewerDomainInventoryRow,
} from "./inventory";
import {
  waterSewerIsRepair,
  waterSewerQuantityParameter,
  waterSewerTechnologyProfile,
  type WaterSewerTechnologyProfile,
} from "./technologyProfiles";

const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = { kind: "EQUALS", parameter_id: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" } as const;

type ParameterOptions = {
  minimum?: number;
  maximum?: number;
  choices?: readonly { value: string; label_ru: string }[];
  condition?: ProfessionalDomainParameterDefinitionV1["visible_when"];
};

function parameter(
  parameter_id: string,
  label_ru: string,
  input_type: ProfessionalDomainParameterDefinitionV1["input_type"],
  priority: ProfessionalDomainParameterDefinitionV1["priority"],
  unit_id: string | null,
  formula_consumers: readonly string[],
  options: ParameterOptions = {},
): ProfessionalDomainParameterDefinitionV1 {
  const condition = options.condition ?? (priority === "P1" ? FULL_ONLY : ALWAYS);
  return {
    parameter_id,
    label_ru,
    input_type,
    priority,
    unit_id,
    ...(options.minimum == null ? {} : { minimum: options.minimum }),
    ...(options.maximum == null ? {} : { maximum: options.maximum }),
    ...(options.choices ? { choices: options.choices } : {}),
    visible_when: condition,
    required_when: condition,
    formula_consumers,
    source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "APPLICABLE_NORM"],
  };
}

function yesNoChoices(): readonly { value: string; label_ru: string }[] {
  return [{ value: "true", label_ru: "Да" }, { value: "false", label_ru: "Нет" }];
}

function exactChoices(value: string, label: string): readonly { value: string; label_ru: string }[] {
  return [{ value, label_ru: label }];
}

const WATER_SEWER_CHOICE_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  AS_BUILT_ESTIMATE: "Исполнительная смета",
  DETAILED_BOQ_FROM_DRAWINGS: "Детальная ведомость по проектным чертежам",
  PRELIMINARY_BOQ: "Предварительная ведомость объёмов",
  ROM_CONCEPT: "Концептуальная оценка состава",
  TENDER_BOQ: "Тендерная ведомость объёмов",
  high_load: "Повышенная нагрузка",
  large_area: "Большая площадь",
  small_area: "Малая площадь",
  standard: "Стандартные условия",
  technical_room: "Техническое помещение",
  wet_zone: "Влажная зона",
  DOMESTIC_WASTEWATER: "Хозяйственно-бытовые сточные воды",
  POTABLE_WATER: "Питьевая вода",
  PROJECT_DEFINED: "Среда по проекту",
  SLUDGE: "Осадок сточных вод",
  STORMWATER: "Дождевые и талые воды",
  ATMOSPHERIC_PROCESS: "Безнапорный технологический процесс",
  GRAVITY: "Самотечный режим",
  MIXED_PROJECT_DEFINED: "Режим по проекту",
  PRESSURE: "Напорный режим",
  EXTERNAL: "Наружная сеть",
  FACILITY: "Технологическое сооружение",
  INTERNAL: "Внутренняя сеть",
  DOMESTIC_SEWER: "Хозяйственно-бытовая канализация",
  STORMWATER_SYSTEM: "Ливневая канализация",
  TECHNICAL_WATER: "Техническое водоснабжение",
  WASTEWATER_TREATMENT: "Очистка сточных вод",
});

function localizedExactChoice(value: string): readonly { value: string; label_ru: string }[] {
  const label = WATER_SEWER_CHOICE_LABELS_RU[value];
  if (!label) throw new Error(`WATER_SEWER_CHOICE_LABEL_MISSING:${value}`);
  return exactChoices(value, label);
}

function isRoute(profile: WaterSewerTechnologyProfile): boolean {
  return profile.output_mode === "ROUTE_LENGTH";
}

function isExternal(profile: WaterSewerTechnologyProfile): boolean {
  return profile.network_location === "EXTERNAL";
}

function isGravity(profile: WaterSewerTechnologyProfile): boolean {
  return profile.pressure_mode === "GRAVITY";
}

function isPotable(profile: WaterSewerTechnologyProfile): boolean {
  return profile.fluid_type === "POTABLE_WATER";
}

function isEquipmentOrTreatment(profile: WaterSewerTechnologyProfile): boolean {
  return ["PUMP_EQUIPMENT", "TREATMENT_PROCESS", "WATER_SOURCE_STORAGE"].includes(profile.technology_class);
}

function schemaFor(row: WaterSewerDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const profile = waterSewerTechnologyProfile(row);
  const quantity = waterSewerQuantityParameter(profile);
  const technologyId = row.canonical_technology_id;
  const parameters: ProfessionalDomainParameterDefinitionV1[] = [
    parameter("work_included", "Выбранная точная работа включена в расчёт", "boolean", "P0", null, [], { choices: yesNoChoices() }),
    parameter("estimate_scope_mode", "Состав ресурсного расчёта", "choice", "P0", null, [], { choices: [
      { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно выбранный состав" },
      { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый состав" },
    ] }),
    parameter("scope_capability", "Точный вариант каталожной работы", "choice", "P0", null, [], { choices: localizedExactChoice(row.scope_capability) }),
    parameter("funding_source", "Источник финансирования проекта", "choice", "P0", null, [], { choices: [
      { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
      { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
      { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
    ] }),
    parameter("project_type", "Тип объекта по утверждённому проекту", "text", "P0", null, []),
    parameter("system_purpose", "Назначение системы", "choice", "P0", null, [], { choices: localizedExactChoice(profile.system_purpose) }),
    parameter("fluid_type", "Транспортируемая среда", "choice", "P0", null, [], { choices: localizedExactChoice(profile.fluid_type) }),
    parameter("pressure_mode", "Гидравлический режим по проекту", "choice", "P0", null, [], { choices: localizedExactChoice(profile.pressure_mode) }),
    parameter("network_location", "Расположение сети или сооружения", "choice", "P0", null, [], { choices: localizedExactChoice(profile.network_location) }),
    parameter(quantity.parameter_id, quantity.label_ru, "number", "P0", quantity.unit_id, ["primary_resource", "installation_labor", "installation_equipment"], { minimum: 0.001, maximum: 100_000_000 }),
    parameter("pipe_or_system_material", "Материал трубы или точная система оборудования", "text", "P0", null, []),
    parameter("nominal_diameter_mm", "Номинальный диаметр DN или присоединительный размер по проекту", "number", "P0", "mm", [], { minimum: 5, maximum: 5_000 }),
    parameter("wall_pressure_class", "Толщина стенки, SDR, schedule или класс давления по проекту", "text", "P0", null, []),
    parameter("jointing_method", "Точный способ соединения", "choice", "P0", null, [], { choices: [
      { value: "SOCKET_SEAL", label_ru: "Раструб с уплотнительным кольцом" },
      { value: "SOCKET_WELD", label_ru: "Раструбная сварка" },
      { value: "BUTT_WELD", label_ru: "Стыковая сварка" },
      { value: "ELECTROFUSION", label_ru: "Электромуфтовое соединение" },
      { value: "THREADED", label_ru: "Резьбовое соединение" },
      { value: "FLANGED", label_ru: "Фланцевое соединение" },
      { value: "PRESS_FIT", label_ru: "Пресс-соединение" },
      { value: "MANUFACTURER_SYSTEM", label_ru: "Система изготовителя по паспорту" },
      { value: "PROJECT_SPECIFIED", label_ru: "По проектной спецификации" },
    ] }),
    parameter("installation_method", "Способ прокладки или монтажа", "choice", "P0", null, [], { choices: [
      { value: "OPEN_INTERNAL", label_ru: "Открытая внутренняя прокладка" },
      { value: "CONCEALED_INTERNAL", label_ru: "Скрытая внутренняя прокладка" },
      { value: "SHAFT_OR_CEILING", label_ru: "Шахта или потолочная зона" },
      { value: "BURIED_TRENCH", label_ru: "Подземная траншейная прокладка" },
      { value: "FACILITY_PACKAGE", label_ru: "Комплектное сооружение или установка" },
      { value: "PROJECT_SPECIFIED", label_ru: "По проекту" },
    ] }),
    parameter("product_profile_id", "Паспорт выбранной трубы, арматуры, прибора или оборудования", "text", "P0", null, []),
    parameter("normative_rate_code", "Код применимой ресурсной нормы КР", "text", "P0", null, []),
    parameter("primary_resource_units_per_output", "Расход основной трубы, изделия или оборудования на единицу результата", "number", "P0", "ratio", ["primary_resource"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("procurement_factor", "Проектный коэффициент закупки с подтверждёнными потерями и раскроем", "number", "P0", "ratio", ["primary_resource"], { minimum: 1, maximum: 3 }),
    parameter("primary_resource_mass_kg_per_unit", "Масса единицы основного ресурса по паспорту", "number", "P0", "kg_per_unit", ["material_mass", "delivery", "waste"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("fitting_count", "Количество фасонных частей по проектной topology/specification", "number", "P0", "item", ["fittings"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("connection_count", "Количество точных соединений", "number", "P0", "item", ["connections"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("joint_count", "Количество монтажных стыков", "number", "P1", "item", ["joint_consumables"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("joint_consumable_kg_per_joint", "Расход соединительных материалов на один стык по системе", "number", "P1", "kg_per_item", ["joint_consumables"], { minimum: 0.000001, maximum: 1_000 }),
    parameter("valve_equipment_count", "Количество арматуры и оборудования по спецификации", "number", "P1", "item", ["valves_equipment"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("penetration_count", "Количество гильз и герметизируемых проходок", "number", "P1", "item", ["penetrations"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("labor_productivity_output_per_man_hour", "Производительность труда по применимой норме", "number", "P0", "output_per_man_hour", ["installation_labor"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("equipment_productivity_output_per_machine_hour", "Производительность механизма по применимой норме", "number", "P0", "output_per_machine_hour", ["installation_equipment"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("connection_productivity_item_per_man_hour", "Производительность выполнения точных соединений", "number", "P1", "item_per_man_hour", ["connection_labor"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("loading_productivity_kg_per_man_hour", "Производительность погрузки и разгрузки", "number", "P1", "kg_per_man_hour", ["loading_labor"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("internal_handling_productivity_kg_per_machine_hour", "Производительность подъёма и внутреннего перемещения", "number", "P1", "kg_per_machine_hour", ["internal_handling"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("delivery_distance_km", "Расстояние доставки основных ресурсов", "number", "P1", "km", ["delivery"], { minimum: 0.001, maximum: 10_000 }),
    parameter("waste_percent", "Подтверждённая доля технологических отходов", "number", "P1", "percent", ["waste"], { minimum: 0, maximum: 50 }),
    parameter("test_section_output", "Объём результата на один испытательный участок", "number", "P1", "output_per_test", ["testing"], { minimum: 0.000001, maximum: 100_000_000 }),
    parameter("test_medium_m3_per_output", "Объём испытательной среды на единицу результата", "number", "P1", "m3_per_output", ["test_medium"], { minimum: 0.000001, maximum: 10_000 }),
    parameter("qa_interval_output", "Объём результата на одну контрольную проверку", "number", "P1", "output_per_test", ["quality_tests"], { minimum: 0.000001, maximum: 100_000_000 }),
    parameter("commissioning_productivity_output_per_man_hour", "Производительность пусконаладочных и приёмочных работ", "number", "P1", "output_per_man_hour", ["commissioning_labor"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("documentation_record_count", "Количество исполнительных схем, актов и протоколов", "number", "P1", "item", ["documentation"], { minimum: 1, maximum: 100_000 }),
  ];

  if (isRoute(profile)) {
    parameters.push(
      parameter("support_spacing_m", "Шаг опор или подвесов по проекту/системе", "number", "P1", "m", ["supports"], { minimum: 0.01, maximum: 100 }),
      parameter("fixed_support_count", "Количество неподвижных и специальных опор", "number", "P1", "item", ["supports"], { minimum: 0, maximum: 1_000_000 }),
    );
  } else {
    parameters.push(parameter("support_count", "Количество рам, опор, креплений или подвесов по проекту", "number", "P1", "item", ["supports"], { minimum: 0.001, maximum: 1_000_000 }));
  }

  parameters.push(
    parameter("insulation_included", "Теплоизоляция или защита от конденсата включена", "choice", "P1", null, [], { choices: yesNoChoices() }),
    parameter("insulation_quantity_per_output", "Расход изоляции и покровного слоя на единицу результата", "number", "P1", "insulation_per_output", ["insulation"], { minimum: 0.000001, maximum: 10_000, condition: { kind: "EQUALS", parameter_id: "insulation_included", value: "true" } }),
    parameter("insulation_labor_productivity_output_per_man_hour", "Производительность монтажа изоляции", "number", "P1", "output_per_man_hour", ["insulation_labor"], { minimum: 0.000001, maximum: 1_000_000, condition: { kind: "EQUALS", parameter_id: "insulation_included", value: "true" } }),
  );

  if (profile.pressure_mode === "PRESSURE" || profile.pressure_mode === "MIXED_PROJECT_DEFINED") {
    parameters.push(
      parameter("operating_pressure_mpa", "Рабочее давление по проекту", "number", "P0", "MPa", [], { minimum: 0.001, maximum: 100 }),
      parameter("test_pressure_mpa", "Испытательное давление по проекту и применимому документу", "number", "P0", "MPa", [], { minimum: 0.001, maximum: 150 }),
    );
  }
  if (isGravity(profile)) {
    parameters.push(
      parameter("design_slope_percent", "Проектный уклон самотечной сети", "number", "P0", "percent", [], { minimum: 0.001, maximum: 100 }),
      parameter("start_elevation_m", "Проектная отметка начала участка", "number", "P0", "m", [], { minimum: -1_000, maximum: 10_000 }),
      parameter("end_elevation_m", "Проектная отметка конца участка", "number", "P0", "m", [], { minimum: -1_000, maximum: 10_000 }),
      parameter("revision_cleanout_count", "Количество ревизий и прочисток", "number", "P1", "item", ["cleanouts"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("cctv_or_flow_test_length_m", "Длина видеоинспекции или проверки проливом", "number", "P1", "m", ["gravity_inspection"], { minimum: 0.001, maximum: 100_000_000 }),
    );
  }
  if (isPotable(profile)) {
    parameters.push(
      parameter("potable_suitability_document_id", "Документ пригодности материалов и реагентов для питьевой воды", "text", "P0", null, []),
      parameter("flushing_water_m3_per_output", "Объём промывочной воды на единицу результата", "number", "P1", "m3_per_output", ["flushing_water", "disinfectant"], { minimum: 0.000001, maximum: 10_000 }),
      parameter("disinfectant_kg_per_m3", "Расход реагента по применимому санитарному документу", "number", "P1", "kg_per_m3", ["disinfectant"], { minimum: 0.000001, maximum: 1_000 }),
      parameter("laboratory_sample_count", "Количество лабораторных проб по программе контроля", "number", "P1", "item", ["laboratory_samples"], { minimum: 1, maximum: 100_000 }),
    );
  }
  if (isExternal(profile)) {
    parameters.push(
      parameter("earthworks_included", "Земляные работы включены в полный состав", "choice", "P1", null, [], { choices: yesNoChoices() }),
      parameter("external_work_length_m", "Проектная длина траншеи или фронта земляных работ", "number", "P1", "m", ["excavation", "bedding", "backfill"], { minimum: 0.001, maximum: 100_000_000, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("trench_width_m", "Проектная ширина траншеи", "number", "P1", "m", ["excavation", "bedding", "backfill"], { minimum: 0.1, maximum: 100, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("trench_depth_m", "Проектная глубина траншеи", "number", "P1", "m", ["excavation", "backfill"], { minimum: 0.1, maximum: 100, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("bedding_thickness_m", "Проектная толщина постели", "number", "P1", "m", ["bedding", "backfill"], { minimum: 0.01, maximum: 10, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("pipe_displacement_m3", "Проектный объём вытеснения трубой и сооружениями", "number", "P1", "m3", ["backfill"], { minimum: 0, maximum: 100_000_000, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("excavation_productivity_m3_per_machine_hour", "Производительность разработки грунта", "number", "P1", "m3_per_machine_hour", ["excavator"], { minimum: 0.000001, maximum: 1_000_000, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("backfill_productivity_m3_per_machine_hour", "Производительность обратной засыпки и уплотнения", "number", "P1", "m3_per_machine_hour", ["compaction"], { minimum: 0.000001, maximum: 1_000_000, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("surplus_soil_m3", "Объём непригодного и избыточного грунта", "number", "P1", "m3", ["surplus_soil", "soil_haul"], { minimum: 0.001, maximum: 100_000_000, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("soil_bulk_density_t_m3", "Насыпная плотность вывозимого грунта", "number", "P1", "t_per_m3", ["soil_haul"], { minimum: 0.1, maximum: 5, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("soil_haul_distance_km", "Расстояние вывоза грунта", "number", "P1", "km", ["soil_haul"], { minimum: 0.001, maximum: 10_000, condition: { kind: "EQUALS", parameter_id: "earthworks_included", value: "true" } }),
      parameter("restoration_included", "Восстановление покрытия включено", "choice", "P1", null, [], { choices: yesNoChoices() }),
      parameter("restoration_width_m", "Ширина восстанавливаемой полосы", "number", "P1", "m", ["surface_restoration"], { minimum: 0.01, maximum: 1_000, condition: { kind: "EQUALS", parameter_id: "restoration_included", value: "true" } }),
      parameter("restoration_material_per_m2", "Расход материала восстановления на 1 м² по проекту", "number", "P1", "kg_per_m2", ["surface_restoration_material"], { minimum: 0.000001, maximum: 10_000, condition: { kind: "EQUALS", parameter_id: "restoration_included", value: "true" } }),
      parameter("restoration_productivity_m2_per_man_hour", "Производительность восстановления покрытия", "number", "P1", "m2_per_man_hour", ["surface_restoration_labor"], { minimum: 0.000001, maximum: 1_000_000, condition: { kind: "EQUALS", parameter_id: "restoration_included", value: "true" } }),
    );
  }
  if (isEquipmentOrTreatment(profile)) {
    parameters.push(
      parameter("design_capacity_m3_day", "Проектная производительность сооружения или оборудования", "number", "P0", "m3_per_day", [], { minimum: 0.000001, maximum: 1_000_000_000 }),
      parameter("equipment_mass_kg_per_output", "Масса оборудования на единицу результата по паспорту", "number", "P1", "kg_per_output", ["equipment_mass", "lifting"], { minimum: 0.000001, maximum: 100_000_000 }),
      parameter("lifting_productivity_kg_per_machine_hour", "Производительность подъёма оборудования", "number", "P1", "kg_per_machine_hour", ["lifting"], { minimum: 0.000001, maximum: 100_000_000 }),
      parameter("electrical_automation_included", "Электроснабжение и автоматизация включены отдельной typed assembly", "choice", "P1", null, [], { choices: yesNoChoices() }),
      parameter("electrical_connection_count", "Количество силовых подключений по проекту", "number", "P1", "item", ["electrical_connections"], { minimum: 0.001, maximum: 100_000, condition: { kind: "EQUALS", parameter_id: "electrical_automation_included", value: "true" } }),
      parameter("automation_point_count", "Количество точек контроля и автоматики по проекту", "number", "P1", "item", ["automation_points"], { minimum: 0.001, maximum: 1_000_000, condition: { kind: "EQUALS", parameter_id: "electrical_automation_included", value: "true" } }),
      parameter("electrical_labor_productivity_point_per_man_hour", "Производительность монтажа подключений и автоматики", "number", "P1", "item_per_man_hour", ["electrical_labor"], { minimum: 0.000001, maximum: 1_000_000, condition: { kind: "EQUALS", parameter_id: "electrical_automation_included", value: "true" } }),
    );
  }
  if (waterSewerIsRepair(row)) {
    parameters.push(
      parameter("demolition_included", "Демонтаж существующего участка включён", "choice", "P1", null, [], { choices: yesNoChoices() }),
      parameter("demolition_output_quantity", "Количество демонтируемого участка или оборудования", "number", "P1", quantity.unit_id, ["demolition_labor", "demolition_waste"], { minimum: 0.001, maximum: 100_000_000, condition: { kind: "EQUALS", parameter_id: "demolition_included", value: "true" } }),
      parameter("demolition_productivity_output_per_man_hour", "Производительность демонтажа", "number", "P1", "output_per_man_hour", ["demolition_labor"], { minimum: 0.000001, maximum: 1_000_000, condition: { kind: "EQUALS", parameter_id: "demolition_included", value: "true" } }),
      parameter("removed_mass_kg_per_output", "Масса демонтированных материалов на единицу", "number", "P1", "kg_per_output", ["demolition_waste", "demolition_haul"], { minimum: 0.000001, maximum: 1_000_000, condition: { kind: "EQUALS", parameter_id: "demolition_included", value: "true" } }),
      parameter("demolition_haul_distance_km", "Расстояние вывоза демонтированных материалов", "number", "P1", "km", ["demolition_haul"], { minimum: 0.001, maximum: 10_000, condition: { kind: "EQUALS", parameter_id: "demolition_included", value: "true" } }),
    );
  }
  return {
    schema_id: `${technologyId}:parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: technologyId,
    parameters,
    quantity_alternatives: [[quantity.parameter_id]],
  };
}

function formula(
  technologyId: string,
  formulaName: string,
  expression: string,
  input_parameter_ids: readonly string[],
  output_unit_id: string,
  calculate: ProfessionalAssemblyFormulaV4["calculate"],
): ProfessionalAssemblyFormulaV4 {
  return {
    formula_id: `${technologyId}:formula:${formulaName}:v1`,
    expression,
    input_parameter_ids,
    output_unit_id,
    calculate,
  };
}

function normativeSourceId(row: WaterSewerDomainInventoryRow): string {
  return waterSewerIsRepair(row) ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";
}

function boqRow(
  row: WaterSewerDomainInventoryRow,
  id: string,
  section: string,
  category: ProfessionalAssemblyRowDefinitionV4["category"],
  title_ru: string,
  rowFormula: ProfessionalAssemblyFormulaV4,
  scope: "BOTH" | "FULL_ONLY",
  domainOwner: string = WATER_SEWER_COMPLETE_DOMAIN_ID,
  costOwnership: ProfessionalAssemblyRowDefinitionV4["cost_ownership"] = "priced_resource",
): ProfessionalAssemblyRowDefinitionV4 {
  return {
    row_id: `${row.canonical_technology_id}:row:${id}`,
    section,
    category,
    title_ru,
    formula: rowFormula,
    cost_ownership: costOwnership,
    cost_owner_id: `${domainOwner}:cost-owner:${row.work_key}:${id}`,
    semantic_owner: `${domainOwner}:semantic-owner:${row.work_key}:${id}`,
    normative_source_ids: [normativeSourceId(row)],
    inclusion_condition: scope === "BOTH" ? "work_included=true" : "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE",
    procurement_eligible: ["material", "transport", "waste", "equipment"].includes(category),
  };
}

function parameterRole(id: string): ProfessionalAssemblyParameterDefinitionV4["role"] {
  if (id === "work_included" || id.endsWith("_included")) return "SCOPE_TRIGGER";
  if (id.includes("normative") || id.includes("productivity") || id.includes("rate") || id.includes("spacing")) return "NORM_RATE";
  if (id.includes("distance") || id.includes("payload") || id.includes("haul")) return "LOGISTICS_VALUE";
  if (id.includes("test") || id.includes("qa_") || id.includes("sample")) return "CONTROL_PLAN_VALUE";
  if (id.includes("material") || id.includes("mass") || id.includes("factor") || id.includes("consumable")) return "MATERIAL_PASSPORT_VALUE";
  return "PROJECT_QUANTITY";
}

function assemblyParameters(
  schema: ProfessionalDomainParameterSchemaV1,
  rows: readonly ProfessionalAssemblyRowDefinitionV4[],
  triggerParameter: string,
  supportedScopes: readonly ProfessionalEstimateScopeModeV4[],
): ProfessionalAssemblyParameterDefinitionV4[] {
  const definitions = new Map(schema.parameters.map((item) => [item.parameter_id, item]));
  const fullOnlyInputs = new Set(rows
    .filter((item) => item.inclusion_condition.includes("FULL_APPLICABLE_SCOPE"))
    .flatMap((item) => item.formula.input_parameter_ids));
  const bothInputs = new Set(rows
    .filter((item) => !item.inclusion_condition.includes("FULL_APPLICABLE_SCOPE"))
    .flatMap((item) => item.formula.input_parameter_ids));
  const ids = new Set([triggerParameter, ...bothInputs, ...fullOnlyInputs]);
  return [...ids].map((id) => {
    const definition = definitions.get(id);
    if (!definition) throw new Error(`WATER_SEWER_ASSEMBLY_PARAMETER_NOT_IN_SCHEMA:${schema.schema_id}:${id}`);
    const requiredFor: readonly ProfessionalEstimateScopeModeV4[] = bothInputs.has(id)
      ? ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"]
      : fullOnlyInputs.has(id)
        ? ["FULL_APPLICABLE_SCOPE"]
        : supportedScopes;
    return {
      parameter_id: id,
      title_ru: definition.label_ru,
      role: parameterRole(id),
      unit_id: definition.unit_id,
      required_for: requiredFor,
    };
  });
}

function childAssembly(
  row: WaterSewerDomainInventoryRow,
  schema: ProfessionalDomainParameterSchemaV1,
  id: string,
  title: string,
  domainOwner: string,
  triggerParameter: string,
  triggerValues: readonly (string | boolean)[],
  scopes: readonly ProfessionalEstimateScopeModeV4[],
  rows: readonly ProfessionalAssemblyRowDefinitionV4[],
): ProfessionalChildAssemblyV4 {
  return {
    child_passport_id: `${row.canonical_technology_id}:child:${id}:passport:v1`,
    child_passport_version: "1.0.0",
    domain_owner: domainOwner,
    assembly_id: `${row.canonical_technology_id}:child:${id}:assembly:v1`,
    title_ru: title,
    scope_trigger_parameter: triggerParameter,
    scope_trigger_values: triggerValues,
    supported_scope_modes: scopes,
    parameters: assemblyParameters(schema, rows, triggerParameter, scopes),
    rows,
  };
}

function mainAssemblies(row: WaterSewerDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4[] {
  const profile = waterSewerTechnologyProfile(row);
  const quantity = waterSewerQuantityParameter(profile);
  const q = quantity.parameter_id;
  const t = row.canonical_technology_id;
  const unit = quantity.unit_id;
  const supportFormula = isRoute(profile)
    ? formula(t, "supports", `ceil(${q} / support_spacing_m) + fixed_support_count`, [q, "support_spacing_m", "fixed_support_count"], "item", (v) => Math.ceil(v[q] / v.support_spacing_m) + v.fixed_support_count)
    : formula(t, "supports", "support_count", ["support_count"], "item", (v) => v.support_count);
  const rows: ProfessionalAssemblyRowDefinitionV4[] = [
    boqRow(row, "primary_resource", "Основные материалы и оборудование", "material", `Основной ресурс для ${profile.system_label_ru}`, formula(t, "primary_resource", `${q} × primary_resource_units_per_output × procurement_factor`, [q, "primary_resource_units_per_output", "procurement_factor"], unit, (v) => v[q] * v.primary_resource_units_per_output * v.procurement_factor), "BOTH"),
    boqRow(row, "fittings", "Фасонные части и соединения", "material", `Фасонные части точной topology для ${profile.system_label_ru}`, formula(t, "fittings", "fitting_count", ["fitting_count"], "item", (v) => v.fitting_count), "BOTH"),
    boqRow(row, "connections", "Фасонные части и соединения", "material", `Точные соединительные узлы для ${profile.system_label_ru}`, formula(t, "connections", "connection_count", ["connection_count"], "item", (v) => v.connection_count), "BOTH"),
    boqRow(row, "installation_labor", "Труд", "labor", `${profile.operation_label_ru}: труд монтажников и операторов`, formula(t, "installation_labor", `${q} / labor_productivity_output_per_man_hour`, [q, "labor_productivity_output_per_man_hour"], "man_hour", (v) => v[q] / v.labor_productivity_output_per_man_hour), "BOTH"),
    boqRow(row, "installation_equipment", "Машины и механизмы", "equipment", `${profile.operation_label_ru}: работа применимого механизма`, formula(t, "installation_equipment", `${q} / equipment_productivity_output_per_machine_hour`, [q, "equipment_productivity_output_per_machine_hour"], "machine_hour", (v) => v[q] / v.equipment_productivity_output_per_machine_hour), "FULL_ONLY"),
    boqRow(row, "joint_consumables", "Фасонные части и соединения", "material", `Материалы точного способа соединения ${profile.system_label_ru}`, formula(t, "joint_consumables", "joint_count × joint_consumable_kg_per_joint", ["joint_count", "joint_consumable_kg_per_joint"], "kg", (v) => v.joint_count * v.joint_consumable_kg_per_joint), "FULL_ONLY"),
    boqRow(row, "valves_equipment", "Арматура и оборудование", "equipment", `Арматура и оборудование по спецификации ${profile.system_label_ru}`, formula(t, "valves_equipment", "valve_equipment_count", ["valve_equipment_count"], "item", (v) => v.valve_equipment_count), "FULL_ONLY"),
    boqRow(row, "supports", "Крепления, опоры и проходки", "material", `Опоры и крепления для ${profile.system_label_ru}`, supportFormula, "FULL_ONLY"),
    boqRow(row, "penetrations", "Крепления, опоры и проходки", "material", "Гильзы, уплотнения и герметизация проходок", formula(t, "penetrations", "penetration_count", ["penetration_count"], "item", (v) => v.penetration_count), "FULL_ONLY"),
    boqRow(row, "connection_labor", "Труд", "labor", "Труд выполнения точных соединений", formula(t, "connection_labor", "connection_count / connection_productivity_item_per_man_hour", ["connection_count", "connection_productivity_item_per_man_hour"], "man_hour", (v) => v.connection_count / v.connection_productivity_item_per_man_hour), "FULL_ONLY"),
    boqRow(row, "loading_labor", "Логистика", "labor", "Погрузка и разгрузка основных ресурсов", formula(t, "loading_labor", `${q} × primary_resource_units_per_output × primary_resource_mass_kg_per_unit / loading_productivity_kg_per_man_hour`, [q, "primary_resource_units_per_output", "primary_resource_mass_kg_per_unit", "loading_productivity_kg_per_man_hour"], "man_hour", (v) => v[q] * v.primary_resource_units_per_output * v.primary_resource_mass_kg_per_unit / v.loading_productivity_kg_per_man_hour), "FULL_ONLY"),
    boqRow(row, "internal_handling", "Логистика", "equipment", "Подъём и внутреннее перемещение ресурсов", formula(t, "internal_handling", `${q} × primary_resource_units_per_output × primary_resource_mass_kg_per_unit / internal_handling_productivity_kg_per_machine_hour`, [q, "primary_resource_units_per_output", "primary_resource_mass_kg_per_unit", "internal_handling_productivity_kg_per_machine_hour"], "machine_hour", (v) => v[q] * v.primary_resource_units_per_output * v.primary_resource_mass_kg_per_unit / v.internal_handling_productivity_kg_per_machine_hour), "FULL_ONLY"),
    boqRow(row, "delivery", "Внешняя доставка", "transport", "Доставка основных ресурсов", formula(t, "delivery", `${q} × primary_resource_units_per_output × primary_resource_mass_kg_per_unit / 1000 × delivery_distance_km`, [q, "primary_resource_units_per_output", "primary_resource_mass_kg_per_unit", "delivery_distance_km"], "t_km", (v) => v[q] * v.primary_resource_units_per_output * v.primary_resource_mass_kg_per_unit / 1_000 * v.delivery_distance_km), "FULL_ONLY"),
    boqRow(row, "waste", "Отходы", "waste", "Технологические отходы основной системы", formula(t, "waste", `${q} × primary_resource_units_per_output × primary_resource_mass_kg_per_unit × waste_percent / 100`, [q, "primary_resource_units_per_output", "primary_resource_mass_kg_per_unit", "waste_percent"], "kg", (v) => v[q] * v.primary_resource_units_per_output * v.primary_resource_mass_kg_per_unit * v.waste_percent / 100), "FULL_ONLY"),
    boqRow(row, "testing", "Испытания и контроль", "testing", "Испытательные участки по программе контроля", formula(t, "testing", `ceil(${q} / test_section_output)`, [q, "test_section_output"], "item", (v) => Math.ceil(v[q] / v.test_section_output)), "FULL_ONLY"),
    boqRow(row, "test_medium", "Испытания и контроль", "material", "Испытательная среда", formula(t, "test_medium", `${q} × test_medium_m3_per_output`, [q, "test_medium_m3_per_output"], "m3", (v) => v[q] * v.test_medium_m3_per_output), "FULL_ONLY"),
    boqRow(row, "quality_tests", "Испытания и контроль", "testing", "Операционный и лабораторный контроль", formula(t, "quality_tests", `ceil(${q} / qa_interval_output)`, [q, "qa_interval_output"], "item", (v) => Math.ceil(v[q] / v.qa_interval_output)), "FULL_ONLY"),
    boqRow(row, "commissioning_labor", "Пусконаладка", "labor", "Труд испытаний, промывки и ввода в эксплуатацию", formula(t, "commissioning_labor", `${q} / commissioning_productivity_output_per_man_hour`, [q, "commissioning_productivity_output_per_man_hour"], "man_hour", (v) => v[q] / v.commissioning_productivity_output_per_man_hour), "FULL_ONLY"),
    boqRow(row, "documentation", "Исполнительная документация", "documentation", "Исполнительные схемы, акты скрытых работ и протоколы", formula(t, "documentation", "documentation_record_count", ["documentation_record_count"], "item", (v) => v.documentation_record_count), "FULL_ONLY"),
  ];
  if (isGravity(profile)) {
    rows.push(
      boqRow(row, "cleanouts", "Фасонные части и соединения", "material", "Ревизии и прочистки самотечной сети", formula(t, "cleanouts", "revision_cleanout_count", ["revision_cleanout_count"], "item", (v) => v.revision_cleanout_count), "FULL_ONLY"),
      boqRow(row, "gravity_inspection", "Испытания и контроль", "testing", "Проверка уклона, герметичности и видеоинспекция", formula(t, "gravity_inspection", "cctv_or_flow_test_length_m", ["cctv_or_flow_test_length_m"], "m", (v) => v.cctv_or_flow_test_length_m), "FULL_ONLY"),
    );
  }
  if (isPotable(profile)) {
    rows.push(
      boqRow(row, "flushing_water", "Промывка и санитарная подготовка", "material", "Вода для промывки питьевой системы", formula(t, "flushing_water", `${q} × flushing_water_m3_per_output`, [q, "flushing_water_m3_per_output"], "m3", (v) => v[q] * v.flushing_water_m3_per_output), "FULL_ONLY"),
      boqRow(row, "disinfectant", "Промывка и санитарная подготовка", "material", "Дезинфицирующий реагент по подтверждённому санитарному документу", formula(t, "disinfectant", `${q} × flushing_water_m3_per_output × disinfectant_kg_per_m3`, [q, "flushing_water_m3_per_output", "disinfectant_kg_per_m3"], "kg", (v) => v[q] * v.flushing_water_m3_per_output * v.disinfectant_kg_per_m3), "FULL_ONLY"),
      boqRow(row, "laboratory_samples", "Промывка и санитарная подготовка", "testing", "Лабораторные пробы питьевой воды", formula(t, "laboratory_samples", "laboratory_sample_count", ["laboratory_sample_count"], "item", (v) => v.laboratory_sample_count), "FULL_ONLY"),
    );
  }
  const minimalRows = rows.filter((item) => !item.inclusion_condition.includes("FULL_APPLICABLE_SCOPE"));
  const fullRows = rows.filter((item) => item.inclusion_condition.includes("FULL_APPLICABLE_SCOPE"));
  return [
    childAssembly(
      row,
      schema,
      "main-minimal",
      row.display_title_ru,
      WATER_SEWER_COMPLETE_DOMAIN_ID,
      "work_included",
      [true, "true"],
      ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
      minimalRows,
    ),
    childAssembly(
      row,
      schema,
      "main-full",
      `${row.display_title_ru}: полный применимый ресурсный состав`,
      WATER_SEWER_COMPLETE_DOMAIN_ID,
      "work_included",
      [true, "true"],
      ["FULL_APPLICABLE_SCOPE"],
      fullRows,
    ),
  ];
}

function insulationAssembly(row: WaterSewerDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const profile = waterSewerTechnologyProfile(row);
  const quantity = waterSewerQuantityParameter(profile);
  const q = quantity.parameter_id;
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "insulation", "Изоляция и защита", "material", "Изоляция, пароизоляция и покровный слой", formula(t, "insulation", `${q} × insulation_quantity_per_output`, [q, "insulation_quantity_per_output"], isRoute(profile) ? "m" : "m2", (v) => v[q] * v.insulation_quantity_per_output), "FULL_ONLY", "insulation"),
    boqRow(row, "insulation_labor", "Изоляция и защита", "labor", "Труд монтажа изоляции и защитного слоя", formula(t, "insulation_labor", `${q} / insulation_labor_productivity_output_per_man_hour`, [q, "insulation_labor_productivity_output_per_man_hour"], "man_hour", (v) => v[q] / v.insulation_labor_productivity_output_per_man_hour), "FULL_ONLY", "insulation"),
  ];
  return childAssembly(row, schema, "insulation", "Изоляция и защита трубопровода или оборудования", "insulation", "insulation_included", ["true", true], ["FULL_APPLICABLE_SCOPE"], rows);
}

function earthworksAssembly(row: WaterSewerDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const excavation = formula(t, "excavation", "external_work_length_m × trench_width_m × trench_depth_m", ["external_work_length_m", "trench_width_m", "trench_depth_m"], "m3", (v) => v.external_work_length_m * v.trench_width_m * v.trench_depth_m);
  const bedding = formula(t, "bedding", "external_work_length_m × trench_width_m × bedding_thickness_m", ["external_work_length_m", "trench_width_m", "bedding_thickness_m"], "m3", (v) => v.external_work_length_m * v.trench_width_m * v.bedding_thickness_m);
  const backfill = formula(t, "backfill", "external_work_length_m × trench_width_m × trench_depth_m - external_work_length_m × trench_width_m × bedding_thickness_m - pipe_displacement_m3", ["external_work_length_m", "trench_width_m", "trench_depth_m", "bedding_thickness_m", "pipe_displacement_m3"], "m3", (v) => v.external_work_length_m * v.trench_width_m * v.trench_depth_m - v.external_work_length_m * v.trench_width_m * v.bedding_thickness_m - v.pipe_displacement_m3);
  const rows = [
    boqRow(row, "excavation", "Земляные работы", "work", "Разработка грунта по проектному профилю траншеи", excavation, "FULL_ONLY", "earthworks"),
    boqRow(row, "bedding", "Земляные работы", "material", "Постель и подготовка основания трубопровода", bedding, "FULL_ONLY", "earthworks"),
    boqRow(row, "backfill", "Земляные работы", "work", "Послойная обратная засыпка", backfill, "FULL_ONLY", "earthworks"),
    boqRow(row, "excavator", "Земляные работы", "equipment", "Работа землеройного механизма", formula(t, "excavator", "(external_work_length_m × trench_width_m × trench_depth_m) / excavation_productivity_m3_per_machine_hour", ["external_work_length_m", "trench_width_m", "trench_depth_m", "excavation_productivity_m3_per_machine_hour"], "machine_hour", (v) => v.external_work_length_m * v.trench_width_m * v.trench_depth_m / v.excavation_productivity_m3_per_machine_hour), "FULL_ONLY", "earthworks"),
    boqRow(row, "compaction", "Земляные работы", "equipment", "Послойное уплотнение обратной засыпки", formula(t, "compaction", "(external_work_length_m × trench_width_m × trench_depth_m - external_work_length_m × trench_width_m × bedding_thickness_m - pipe_displacement_m3) / backfill_productivity_m3_per_machine_hour", ["external_work_length_m", "trench_width_m", "trench_depth_m", "bedding_thickness_m", "pipe_displacement_m3", "backfill_productivity_m3_per_machine_hour"], "machine_hour", (v) => (v.external_work_length_m * v.trench_width_m * v.trench_depth_m - v.external_work_length_m * v.trench_width_m * v.bedding_thickness_m - v.pipe_displacement_m3) / v.backfill_productivity_m3_per_machine_hour), "FULL_ONLY", "earthworks"),
    boqRow(row, "surplus_soil", "Земляные работы", "waste", "Непригодный и избыточный грунт", formula(t, "surplus_soil", "surplus_soil_m3", ["surplus_soil_m3"], "m3", (v) => v.surplus_soil_m3), "FULL_ONLY", "earthworks"),
    boqRow(row, "soil_haul", "Земляные работы", "transport", "Погрузка и вывоз избыточного грунта", formula(t, "soil_haul", "surplus_soil_m3 × soil_bulk_density_t_m3 × soil_haul_distance_km", ["surplus_soil_m3", "soil_bulk_density_t_m3", "soil_haul_distance_km"], "t_km", (v) => v.surplus_soil_m3 * v.soil_bulk_density_t_m3 * v.soil_haul_distance_km), "FULL_ONLY", "earthworks"),
  ];
  return childAssembly(row, schema, "earthworks", "Траншея, постель, засыпка и вывоз грунта", "earthworks", "earthworks_included", ["true", true], ["FULL_APPLICABLE_SCOPE"], rows);
}

function restorationAssembly(row: WaterSewerDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const area = formula(t, "surface_restoration", "external_work_length_m × restoration_width_m", ["external_work_length_m", "restoration_width_m"], "m2", (v) => v.external_work_length_m * v.restoration_width_m);
  const rows = [
    boqRow(row, "surface_restoration_material", "Восстановление покрытия", "material", "Материалы восстановления покрытия", formula(t, "surface_restoration_material", "external_work_length_m × restoration_width_m × restoration_material_per_m2", ["external_work_length_m", "restoration_width_m", "restoration_material_per_m2"], "kg", (v) => v.external_work_length_m * v.restoration_width_m * v.restoration_material_per_m2), "FULL_ONLY", "surface_restoration"),
    boqRow(row, "surface_restoration", "Восстановление покрытия", "work", "Восстановление покрытия по проектному профилю", area, "FULL_ONLY", "surface_restoration"),
    boqRow(row, "surface_restoration_labor", "Восстановление покрытия", "labor", "Труд восстановления покрытия", formula(t, "surface_restoration_labor", "external_work_length_m × restoration_width_m / restoration_productivity_m2_per_man_hour", ["external_work_length_m", "restoration_width_m", "restoration_productivity_m2_per_man_hour"], "man_hour", (v) => v.external_work_length_m * v.restoration_width_m / v.restoration_productivity_m2_per_man_hour), "FULL_ONLY", "surface_restoration"),
  ];
  return childAssembly(row, schema, "surface-restoration", "Восстановление нарушенного покрытия", "surface_restoration", "restoration_included", ["true", true], ["FULL_APPLICABLE_SCOPE"], rows);
}

function electricalAutomationAssembly(row: WaterSewerDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "electrical_connections", "Электроснабжение и автоматизация", "equipment", "Силовые подключения оборудования по проекту", formula(t, "electrical_connections", "electrical_connection_count", ["electrical_connection_count"], "item", (v) => v.electrical_connection_count), "FULL_ONLY", "electrical_power"),
    boqRow(row, "automation_points", "Электроснабжение и автоматизация", "equipment", "Точки контроля и автоматизации по проекту", formula(t, "automation_points", "automation_point_count", ["automation_point_count"], "item", (v) => v.automation_point_count), "FULL_ONLY", "automation_controls"),
    boqRow(row, "electrical_labor", "Электроснабжение и автоматизация", "labor", "Труд монтажа силовых подключений и автоматики", formula(t, "electrical_labor", "(electrical_connection_count + automation_point_count) / electrical_labor_productivity_point_per_man_hour", ["electrical_connection_count", "automation_point_count", "electrical_labor_productivity_point_per_man_hour"], "man_hour", (v) => (v.electrical_connection_count + v.automation_point_count) / v.electrical_labor_productivity_point_per_man_hour), "FULL_ONLY", "electrical_automation"),
  ];
  return childAssembly(row, schema, "electrical-automation", "Граница электроснабжения и автоматизации", "electrical_automation", "electrical_automation_included", ["true", true], ["FULL_APPLICABLE_SCOPE"], rows);
}

function demolitionAssembly(row: WaterSewerDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "demolition_labor", "Демонтаж", "labor", "Труд отключения, слива и демонтажа", formula(t, "demolition_labor", "demolition_output_quantity / demolition_productivity_output_per_man_hour", ["demolition_output_quantity", "demolition_productivity_output_per_man_hour"], "man_hour", (v) => v.demolition_output_quantity / v.demolition_productivity_output_per_man_hour), "FULL_ONLY", "demolition"),
    boqRow(row, "demolition_waste", "Демонтаж", "waste", "Демонтированные материалы и оборудование", formula(t, "demolition_waste", "demolition_output_quantity × removed_mass_kg_per_output", ["demolition_output_quantity", "removed_mass_kg_per_output"], "kg", (v) => v.demolition_output_quantity * v.removed_mass_kg_per_output), "FULL_ONLY", "demolition"),
    boqRow(row, "demolition_haul", "Демонтаж", "transport", "Вывоз демонтированных материалов", formula(t, "demolition_haul", "demolition_output_quantity × removed_mass_kg_per_output / 1000 × demolition_haul_distance_km", ["demolition_output_quantity", "removed_mass_kg_per_output", "demolition_haul_distance_km"], "t_km", (v) => v.demolition_output_quantity * v.removed_mass_kg_per_output / 1_000 * v.demolition_haul_distance_km), "FULL_ONLY", "demolition"),
  ];
  return childAssembly(row, schema, "demolition", "Демонтаж и обращение с отходами", "demolition", "demolition_included", ["true", true], ["FULL_APPLICABLE_SCOPE"], rows);
}

function assembliesFor(row: WaterSewerDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4[] {
  const profile = waterSewerTechnologyProfile(row);
  const assemblies = [...mainAssemblies(row, schema), insulationAssembly(row, schema)];
  if (isExternal(profile)) assemblies.push(earthworksAssembly(row, schema), restorationAssembly(row, schema));
  if (isEquipmentOrTreatment(profile)) assemblies.push(electricalAutomationAssembly(row, schema));
  if (waterSewerIsRepair(row)) assemblies.push(demolitionAssembly(row, schema));
  return assemblies;
}

const schemas: readonly ProfessionalDomainParameterSchemaV1[] = Object.freeze(WATER_SEWER_DOMAIN_INVENTORY.map(schemaFor));
const schemasByTechnologyId = new Map(schemas.map((schema) => [schema.technology_id, schema]));
const assemblyProfiles: readonly ProfessionalAssemblyProfileV1[] = Object.freeze(WATER_SEWER_DOMAIN_INVENTORY.map((row) => {
  const schema = schemasByTechnologyId.get(row.canonical_technology_id);
  if (!schema) throw new Error(`WATER_SEWER_SCHEMA_NOT_FOUND:${row.catalog_id}`);
  return {
    assembly_profile_id: `${row.canonical_technology_id}:assembly-profile:v1`,
    assembly_profile_version: "1.0.0",
    technology_id: row.canonical_technology_id,
    child_assemblies: assembliesFor(row, schema),
  };
}));

const normativeProfiles: readonly ProfessionalNormativeProfileV1[] = Object.freeze(WATER_SEWER_DOMAIN_INVENTORY.map((row) => ({
  profile_id: `${row.canonical_technology_id}:normative-profile:v1`,
  profile_version: "1.0.0",
  technology_id: row.canonical_technology_id,
  jurisdiction: "KG",
  requested_source_ids: [normativeSourceId(row)],
  requested_source_types: ["RESOURCE_ESTIMATE_NORM" as const],
  rejected_foreign_source_ids: ["ru_gesn_2022_unadopted", "manufacturer_unverified_generic"],
})));

const formulaPacks: readonly ProfessionalFormulaPackV1[] = Object.freeze(assemblyProfiles.map((assembly) => ({
  formula_pack_id: `${assembly.technology_id}:formula-pack:v1`,
  formula_pack_version: "1.0.0",
  technology_id: assembly.technology_id,
  formula_ids: assembly.child_assemblies.flatMap((child) => child.rows.map((row) => row.formula.formula_id)),
  unit_trace_contract: assembly.child_assemblies.flatMap((child) => child.rows.map((row) => `${row.formula.formula_id}:${row.formula.output_unit_id}`)),
})));

const technologies: readonly ProfessionalCanonicalTechnologyV1[] = Object.freeze(WATER_SEWER_DOMAIN_INVENTORY.map((row) => {
  const profile = waterSewerTechnologyProfile(row);
  const quantity = waterSewerQuantityParameter(profile);
  return {
    technology_id: row.canonical_technology_id,
    operation_class: row.operation_class,
    method: `${row.construction_method}:${profile.technology_class}:${row.scope_capability}`,
    material_system: `${row.primary_material_or_system}:${profile.system_purpose}:${profile.fluid_type}`,
    output: { dimension: profile.output_mode, unit_id: quantity.unit_id },
    required_stages: profile.required_stages,
    optional_stages: profile.optional_stages,
    forbidden_stages: profile.forbidden_stages,
    parameter_schema_id: `${row.canonical_technology_id}:parameter-schema:v1`,
    formula_pack_id: `${row.canonical_technology_id}:formula-pack:v1`,
    assembly_profile_id: `${row.canonical_technology_id}:assembly-profile:v1`,
    normative_profile_ids: [`${row.canonical_technology_id}:normative-profile:v1`],
    resource_completeness_policy_id: `${row.canonical_technology_id}:resource-policy:v1`,
  };
}));

const resourcePolicies: readonly ProfessionalResourceCompletenessPolicyV1[] = Object.freeze(WATER_SEWER_DOMAIN_INVENTORY.map((row) => ({
  policy_id: `${row.canonical_technology_id}:resource-policy:v1`,
  technology_id: row.canonical_technology_id,
  required_categories: ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"],
  optional_categories: ["work", "subcontract_service", "temporary_work"],
  forbidden_generic_rows: ["Комплект труб", "Комплект фитингов", "Сантехнические работы", "Монтаж системы — 1 комплект"],
  one_bundle_resource_replacement_forbidden: true as const,
})));

export const WATER_SEWER_COMPLETE_DOMAIN_PACKAGE: ProfessionalEstimateDomainPackageV1 = Object.freeze({
  manifest: {
    domain_id: WATER_SEWER_COMPLETE_DOMAIN_ID,
    domain_version: WATER_SEWER_COMPLETE_DOMAIN_VERSION,
    catalog_record_count: WATER_SEWER_COMPLETE_RECORD_COUNT,
    canonical_technology_count: WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT,
    alias_count: WATER_SEWER_COMPLETE_ALIAS_COUNT,
    excluded_count: WATER_SEWER_REVIEWED_EXCLUSION_COUNT,
    supported_scopes: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
    supported_jurisdictions: ["KG"],
    passports: WATER_SEWER_DOMAIN_INVENTORY.map((row) => `domain-passport:${row.catalog_id}:v1`),
    schemas: schemas.map((schema) => schema.schema_id),
    formula_packs: formulaPacks.map((pack) => pack.formula_pack_id),
    normative_profiles: normativeProfiles.map((profile) => profile.profile_id),
    child_assembly_dependencies: ["earthworks", "surface_restoration", "insulation", "electrical_automation", "demolition"],
    readiness: "DOMAIN_GREEN",
  },
  catalog_bindings: WATER_SEWER_DOMAIN_CATALOG_BINDINGS,
  canonical_technologies: technologies,
  parameter_schemas: schemas,
  normative_profiles: normativeProfiles,
  formula_packs: formulaPacks,
  assembly_profiles: assemblyProfiles,
  resource_completeness_policies: resourcePolicies,
});

export const waterSewerDomainFactory = createProfessionalEstimateDomainFactoryV1(WATER_SEWER_COMPLETE_DOMAIN_PACKAGE);

if (
  waterSewerDomainFactory.binding_by_catalog_id.size !== WATER_SEWER_COMPLETE_RECORD_COUNT ||
  waterSewerDomainFactory.technology_by_id.size !== WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT ||
  waterSewerDomainFactory.schema_by_id.size !== WATER_SEWER_COMPLETE_TECHNOLOGY_COUNT ||
  waterSewerDomainFactory.package.manifest.alias_count !== 0
) {
  throw new Error("WATER_SEWER_FACTORY_DENOMINATOR_MISMATCH");
}
