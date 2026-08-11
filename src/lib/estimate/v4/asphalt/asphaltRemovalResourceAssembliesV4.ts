import type {
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyParameterRoleV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
  ProfessionalEstimateScopeModeV4,
} from "../professionalProjectAssemblyV4";

const BOTH: readonly ProfessionalEstimateScopeModeV4[] = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"];

function parameter(id: string, title: string, role: ProfessionalAssemblyParameterRoleV4, unit: string | null): ProfessionalAssemblyParameterDefinitionV4 {
  return { parameter_id: id, title_ru: title, role, unit_id: unit, required_for: BOTH };
}

function row(input: {
  id: string;
  section: string;
  category: ProfessionalAssemblyRowDefinitionV4["category"];
  title: string;
  expression: string;
  inputs: readonly string[];
  unit: string;
  calculate: (values: Readonly<Record<string, number>>) => number;
  owner: string;
  sources: readonly string[];
  procurement?: boolean;
  informational?: boolean;
}): ProfessionalAssemblyRowDefinitionV4 {
  return {
    row_id: input.id,
    section: input.section,
    category: input.category,
    title_ru: input.title,
    formula: {
      formula_id: `${input.id}:formula:v1`,
      expression: input.expression,
      input_parameter_ids: input.inputs,
      output_unit_id: input.unit,
      calculate: input.calculate,
    },
    cost_ownership: input.informational ? "informational_output" : "priced_resource",
    cost_owner_id: input.owner,
    semantic_owner: input.owner,
    normative_source_ids: input.sources,
    inclusion_condition: "exact asphalt removal scope and all formula inputs explicitly confirmed",
    procurement_eligible: input.procurement === true,
  };
}

const removalArea = [
  parameter("asphalt_removal_package_required", "Включить ресурсный пакет демонтажа асфальта", "SCOPE_TRIGGER", null),
  parameter("removal_area_m2", "Площадь удаления покрытия", "PROJECT_QUANTITY", "m2"),
  parameter("removal_depth_mm", "Глубина удаления", "PROJECT_QUANTITY", "mm"),
  parameter("existing_asphalt_density_t_m3", "Плотность существующего асфальтобетона", "MATERIAL_PASSPORT_VALUE", "t_m3"),
  parameter("removal_labor_productivity_m2_per_man_hour", "Нормативная производительность труда демонтажного звена", "NORM_RATE", "m2_man_hour"),
  parameter("removal_control_interval_m2_per_test", "Периодичность контроля полноты удаления", "CONTROL_PLAN_VALUE", "m2_test"),
  parameter("removal_documentation_count", "Количество комплектов исполнительной документации демонтажа", "CONTROL_PLAN_VALUE", "document"),
] as const;

const REMOVAL_COMMON: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:asphalt-removal-resource-core",
  child_passport_version: "4.1.0",
  domain_owner: "asphalt",
  assembly_id: "typed-child:asphalt-removal-resource-core:v1",
  title_ru: "Ресурсный демонтаж асфальтобетонного покрытия",
  scope_trigger_parameter: "asphalt_removal_package_required",
  scope_trigger_values: [true],
  supported_scope_modes: BOTH,
  parameters: removalArea,
  rows: [
    row({ id: "removal:survey_scope", section: "Подготовительные работы", category: "work", title: "Обследование, разметка и закрепление границ и глубины удаления покрытия", expression: "removal_area_m2", inputs: ["removal_area_m2"], unit: "m2", calculate: (v) => v.removal_area_m2, owner: "removal:survey_scope", sources: ["project_existing_pavement_survey", "kg_krer_2015_collection_27"] }),
    row({ id: "removal:volume", section: "Демонтаж", category: "work", title: "Удаление асфальтобетонного покрытия на подтверждённую глубину", expression: "removal_area_m2 * removal_depth_mm / 1000", inputs: ["removal_area_m2", "removal_depth_mm"], unit: "m3", calculate: (v) => v.removal_area_m2 * v.removal_depth_mm / 1000, owner: "removal:volume", sources: ["kg_krer_2015_collection_27"] }),
    row({ id: "removal:material_stream", section: "Отходы и возвратные материалы", category: "waste", title: "Снятый асфальтобетон как отдельный материальный поток", expression: "removal_area_m2 * removal_depth_mm / 1000 * existing_asphalt_density_t_m3", inputs: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3"], unit: "t", calculate: (v) => v.removal_area_m2 * v.removal_depth_mm / 1000 * v.existing_asphalt_density_t_m3, owner: "removal:material_stream", sources: ["project_existing_pavement_survey"], informational: true }),
    row({ id: "removal:labor", section: "Труд", category: "labor", title: "Труд демонтажного звена асфальтобетонного покрытия", expression: "removal_area_m2 / removal_labor_productivity_m2_per_man_hour", inputs: ["removal_area_m2", "removal_labor_productivity_m2_per_man_hour"], unit: "man_hour", calculate: (v) => v.removal_area_m2 / v.removal_labor_productivity_m2_per_man_hour, owner: "removal:labor", sources: ["kg_krer_2015_collection_27"] }),
    row({ id: "removal:control", section: "Контроль качества", category: "testing", title: "Контроль границ, глубины и состояния основания после удаления покрытия", expression: "ceil(removal_area_m2 / removal_control_interval_m2_per_test)", inputs: ["removal_area_m2", "removal_control_interval_m2_per_test"], unit: "test", calculate: (v) => Math.ceil(v.removal_area_m2 / v.removal_control_interval_m2_per_test), owner: "removal:control", sources: ["project_removal_control_plan"] }),
    row({ id: "removal:documentation", section: "Документация", category: "documentation", title: "Акты объёмов, движения материала и исполнительная документация демонтажа", expression: "removal_documentation_count", inputs: ["removal_documentation_count"], unit: "document", calculate: (v) => v.removal_documentation_count, owner: "removal:documentation", sources: ["project_document_handover_plan"] }),
  ],
};

function methodAssembly(input: { method: string; suffix: string; title: string; productivityKey: string; productivityTitle: string }): ProfessionalChildAssemblyV4 {
  return {
    child_passport_id: `professional-estimate-passport:v4:asphalt-removal-${input.suffix}`,
    child_passport_version: "4.1.0",
    domain_owner: "asphalt",
    assembly_id: `typed-child:asphalt-removal-${input.suffix}:v1`,
    title_ru: input.title,
    scope_trigger_parameter: "removal_method",
    scope_trigger_values: [input.method],
    supported_scope_modes: BOTH,
    parameters: [
      parameter("removal_method", "Способ удаления покрытия", "SCOPE_TRIGGER", null),
      parameter("removal_area_m2", "Площадь удаления", "PROJECT_QUANTITY", "m2"),
      parameter("removal_depth_mm", "Глубина удаления", "PROJECT_QUANTITY", "mm"),
      parameter(input.productivityKey, input.productivityTitle, "NORM_RATE", "m3_machine_hour"),
    ],
    rows: [row({ id: `removal:${input.suffix}:machine`, section: "Машины", category: "machinery", title: input.title, expression: `removal_area_m2 * removal_depth_mm / 1000 / ${input.productivityKey}`, inputs: ["removal_area_m2", "removal_depth_mm", input.productivityKey], unit: "machine_hour", calculate: (v) => v.removal_area_m2 * v.removal_depth_mm / 1000 / v[input.productivityKey], owner: `removal:${input.suffix}:machine`, sources: ["verified_equipment_productivity", "kg_krer_2015_collection_27"] })],
  };
}

const METHOD_ASSEMBLIES = [
  methodAssembly({ method: "COLD_MILLING", suffix: "cold-milling", title: "Дорожная фреза для холодного фрезерования покрытия", productivityKey: "milling_productivity_m3_per_machine_hour", productivityTitle: "Производительность дорожной фрезы по ППР" }),
  methodAssembly({ method: "MECHANICAL_BREAKOUT", suffix: "mechanical-breakout", title: "Механизированный комплект разрушения асфальтобетона", productivityKey: "breakout_productivity_m3_per_machine_hour", productivityTitle: "Производительность механизированного разрушения" }),
  methodAssembly({ method: "MANUAL_BREAKOUT", suffix: "manual-breakout", title: "Малая механизация ручного демонтажа покрытия", productivityKey: "manual_breakout_productivity_m3_per_machine_hour", productivityTitle: "Производительность малой механизации ручного демонтажа" }),
  methodAssembly({ method: "COMBINED", suffix: "combined", title: "Комбинированный комплект фрезерования и локального разрушения", productivityKey: "combined_removal_productivity_m3_per_machine_hour", productivityTitle: "Производительность комбинированного демонтажного комплекта" }),
] as const;

const LOADING: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:asphalt-removal-loading",
  child_passport_version: "4.1.0",
  domain_owner: "asphalt",
  assembly_id: "typed-child:asphalt-removal-loading:v1",
  title_ru: "Погрузка снятого асфальтобетона",
  scope_trigger_parameter: "loading_required",
  scope_trigger_values: [true],
  supported_scope_modes: BOTH,
  parameters: [parameter("loading_required", "Требуется погрузка", "SCOPE_TRIGGER", null), ...removalArea.slice(1, 4), parameter("loader_productivity_t_per_machine_hour", "Производительность погрузчика", "NORM_RATE", "t_machine_hour")],
  rows: [row({ id: "removal:loading", section: "Машины", category: "machinery", title: "Погрузчик для снятого асфальтобетона", expression: "removal_area_m2 * removal_depth_mm / 1000 * existing_asphalt_density_t_m3 / loader_productivity_t_per_machine_hour", inputs: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3", "loader_productivity_t_per_machine_hour"], unit: "machine_hour", calculate: (v) => v.removal_area_m2 * v.removal_depth_mm / 1000 * v.existing_asphalt_density_t_m3 / v.loader_productivity_t_per_machine_hour, owner: "removal:loading", sources: ["verified_equipment_productivity", "kg_krer_2015_collection_27"] })],
};

const HAUL: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:asphalt-removal-haul",
  child_passport_version: "4.1.0",
  domain_owner: "asphalt",
  assembly_id: "typed-child:asphalt-removal-haul:v1",
  title_ru: "Вывоз снятого асфальтобетона",
  scope_trigger_parameter: "haul_required",
  scope_trigger_values: [true],
  supported_scope_modes: BOTH,
  parameters: [
    parameter("haul_required", "Требуется вывоз", "SCOPE_TRIGGER", null), ...removalArea.slice(1, 4),
    parameter("haul_distance_km", "Расстояние вывоза", "LOGISTICS_VALUE", "km"),
    parameter("truck_payload_t", "Полезная загрузка самосвала", "LOGISTICS_VALUE", "t"),
    parameter("truck_average_speed_km_per_machine_hour", "Средняя скорость по транспортной схеме", "LOGISTICS_VALUE", "km_machine_hour"),
    parameter("truck_turnaround_machine_hours", "Погрузка, ожидание и разгрузка рейса", "LOGISTICS_VALUE", "machine_hour"),
  ],
  rows: [
    row({ id: "removal:haul_tkm", section: "Логистика", category: "transport", title: "Транспортная работа по вывозу снятого асфальтобетона", expression: "removal_area_m2 * removal_depth_mm / 1000 * existing_asphalt_density_t_m3 * haul_distance_km", inputs: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3", "haul_distance_km"], unit: "t_km", calculate: (v) => v.removal_area_m2 * v.removal_depth_mm / 1000 * v.existing_asphalt_density_t_m3 * v.haul_distance_km, owner: "removal:haul", sources: ["project_logistics_route"], informational: true }),
    row({ id: "removal:haul_trips", section: "Логистика", category: "transport", title: "Рейсы самосвалов для вывоза снятого асфальтобетона", expression: "ceil(removal_area_m2 * removal_depth_mm / 1000 * existing_asphalt_density_t_m3 / truck_payload_t)", inputs: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3", "truck_payload_t"], unit: "trip", calculate: (v) => Math.ceil(v.removal_area_m2 * v.removal_depth_mm / 1000 * v.existing_asphalt_density_t_m3 / v.truck_payload_t), owner: "removal:haul", sources: ["project_logistics_route"], informational: true }),
    row({ id: "removal:haul_truck_hours", section: "Машины", category: "machinery", title: "Самосвалы для вывоза снятого асфальтобетона", expression: "ceil(removal_area_m2 * removal_depth_mm / 1000 * existing_asphalt_density_t_m3 / truck_payload_t) * (2 * haul_distance_km / truck_average_speed_km_per_machine_hour + truck_turnaround_machine_hours)", inputs: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3", "truck_payload_t", "haul_distance_km", "truck_average_speed_km_per_machine_hour", "truck_turnaround_machine_hours"], unit: "machine_hour", calculate: (v) => Math.ceil(v.removal_area_m2 * v.removal_depth_mm / 1000 * v.existing_asphalt_density_t_m3 / v.truck_payload_t) * (2 * v.haul_distance_km / v.truck_average_speed_km_per_machine_hour + v.truck_turnaround_machine_hours), owner: "removal:haul", sources: ["project_logistics_route", "verified_fleet_productivity"] }),
  ],
};

const DUST: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:asphalt-removal-dust-control",
  child_passport_version: "4.1.0",
  domain_owner: "asphalt",
  assembly_id: "typed-child:asphalt-removal-dust-control:v1",
  title_ru: "Пылеподавление при демонтаже покрытия",
  scope_trigger_parameter: "dust_suppression_required",
  scope_trigger_values: [true],
  supported_scope_modes: BOTH,
  parameters: [parameter("dust_suppression_required", "Требуется пылеподавление", "SCOPE_TRIGGER", null), parameter("removal_area_m2", "Площадь удаления", "PROJECT_QUANTITY", "m2"), parameter("dust_suppression_water_l_m2", "Расход воды на пылеподавление", "NORM_RATE", "l_m2"), parameter("water_truck_productivity_m2_per_machine_hour", "Производительность поливомоечной машины", "NORM_RATE", "m2_machine_hour")],
  rows: [
    row({ id: "removal:dust_water", section: "Материалы", category: "material", title: "Технологическая вода для пылеподавления", expression: "removal_area_m2 * dust_suppression_water_l_m2", inputs: ["removal_area_m2", "dust_suppression_water_l_m2"], unit: "l", calculate: (v) => v.removal_area_m2 * v.dust_suppression_water_l_m2, owner: "removal:dust_water", sources: ["project_environmental_control_plan"], procurement: true }),
    row({ id: "removal:dust_machine", section: "Машины", category: "machinery", title: "Поливомоечная машина для пылеподавления", expression: "removal_area_m2 / water_truck_productivity_m2_per_machine_hour", inputs: ["removal_area_m2", "water_truck_productivity_m2_per_machine_hour"], unit: "machine_hour", calculate: (v) => v.removal_area_m2 / v.water_truck_productivity_m2_per_machine_hour, owner: "removal:dust_machine", sources: ["verified_equipment_productivity"] }),
  ],
};

const BASE_CLEANING: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:asphalt-removal-base-cleaning",
  child_passport_version: "4.1.0",
  domain_owner: "asphalt",
  assembly_id: "typed-child:asphalt-removal-base-cleaning:v1",
  title_ru: "Очистка и приёмка основания после удаления покрытия",
  scope_trigger_parameter: "base_cleaning_required",
  scope_trigger_values: [true],
  supported_scope_modes: BOTH,
  parameters: [parameter("base_cleaning_required", "Требуется очистка основания", "SCOPE_TRIGGER", null), parameter("removal_area_m2", "Площадь основания", "PROJECT_QUANTITY", "m2"), parameter("base_cleaning_productivity_m2_per_man_hour", "Производительность труда очистки основания", "NORM_RATE", "m2_man_hour"), parameter("surface_cleaner_productivity_m2_per_machine_hour", "Производительность очистительной машины", "NORM_RATE", "m2_machine_hour")],
  rows: [
    row({ id: "removal:base_cleaning_output", section: "Основание", category: "work", title: "Очистка основания после удаления асфальтобетона", expression: "removal_area_m2", inputs: ["removal_area_m2"], unit: "m2", calculate: (v) => v.removal_area_m2, owner: "removal:base_cleaning_output", sources: ["kg_krer_2015_collection_27"] }),
    row({ id: "removal:base_cleaning_labor", section: "Труд", category: "labor", title: "Труд рабочих по очистке и приёмке вскрытого основания", expression: "removal_area_m2 / base_cleaning_productivity_m2_per_man_hour", inputs: ["removal_area_m2", "base_cleaning_productivity_m2_per_man_hour"], unit: "man_hour", calculate: (v) => v.removal_area_m2 / v.base_cleaning_productivity_m2_per_man_hour, owner: "removal:base_cleaning_labor", sources: ["kg_krer_2015_collection_27"] }),
    row({ id: "removal:base_cleaning_machine", section: "Машины", category: "machinery", title: "Механизированная очистительная машина основания", expression: "removal_area_m2 / surface_cleaner_productivity_m2_per_machine_hour", inputs: ["removal_area_m2", "surface_cleaner_productivity_m2_per_machine_hour"], unit: "machine_hour", calculate: (v) => v.removal_area_m2 / v.surface_cleaner_productivity_m2_per_machine_hour, owner: "removal:base_cleaning_machine", sources: ["verified_equipment_productivity"] }),
  ],
};

const BOUNDARY_CUTTING: ProfessionalChildAssemblyV4 = {
  child_passport_id: "professional-estimate-passport:v4:asphalt-removal-boundary-cutting",
  child_passport_version: "4.1.0",
  domain_owner: "asphalt",
  assembly_id: "typed-child:asphalt-removal-boundary-cutting:v1",
  title_ru: "Резка границ карт демонтажа",
  scope_trigger_parameter: "boundary_cut_required",
  scope_trigger_values: [true],
  supported_scope_modes: BOTH,
  parameters: [parameter("boundary_cut_required", "Требуется резка границ", "SCOPE_TRIGGER", null), parameter("boundary_cut_length_m", "Длина границ резки", "PROJECT_QUANTITY", "m"), parameter("boundary_cut_consumable_kg_m", "Расход режущего и охлаждающего ресурса", "NORM_RATE", "kg_m"), parameter("boundary_cut_productivity_m_per_man_hour", "Производительность труда резки", "NORM_RATE", "m_man_hour"), parameter("boundary_saw_productivity_m_per_machine_hour", "Производительность нарезчика швов", "NORM_RATE", "m_machine_hour")],
  rows: [
    row({ id: "removal:boundary_consumable", section: "Материалы", category: "material", title: "Расходные материалы резки границ демонтажа", expression: "boundary_cut_length_m * boundary_cut_consumable_kg_m", inputs: ["boundary_cut_length_m", "boundary_cut_consumable_kg_m"], unit: "kg", calculate: (v) => v.boundary_cut_length_m * v.boundary_cut_consumable_kg_m, owner: "removal:boundary_consumable", sources: ["project_cutting_method_statement"], procurement: true }),
    row({ id: "removal:boundary_output", section: "Демонтаж", category: "work", title: "Нарезка границ карт удаления покрытия", expression: "boundary_cut_length_m", inputs: ["boundary_cut_length_m"], unit: "m", calculate: (v) => v.boundary_cut_length_m, owner: "removal:boundary_output", sources: ["kg_krer_2015_collection_27"] }),
    row({ id: "removal:boundary_labor", section: "Труд", category: "labor", title: "Труд звена резки границ демонтажа", expression: "boundary_cut_length_m / boundary_cut_productivity_m_per_man_hour", inputs: ["boundary_cut_length_m", "boundary_cut_productivity_m_per_man_hour"], unit: "man_hour", calculate: (v) => v.boundary_cut_length_m / v.boundary_cut_productivity_m_per_man_hour, owner: "removal:boundary_labor", sources: ["kg_krer_2015_collection_27"] }),
    row({ id: "removal:boundary_saw", section: "Машины", category: "machinery", title: "Нарезчик швов для границ демонтажа", expression: "boundary_cut_length_m / boundary_saw_productivity_m_per_machine_hour", inputs: ["boundary_cut_length_m", "boundary_saw_productivity_m_per_machine_hour"], unit: "machine_hour", calculate: (v) => v.boundary_cut_length_m / v.boundary_saw_productivity_m_per_machine_hour, owner: "removal:boundary_saw", sources: ["verified_equipment_productivity"] }),
  ],
};

function destinationAssembly(value: string, suffix: string, title: string, informational = false): ProfessionalChildAssemblyV4 {
  return {
    child_passport_id: `professional-estimate-passport:v4:asphalt-removal-destination-${suffix}`,
    child_passport_version: "4.1.0",
    domain_owner: "asphalt",
    assembly_id: `typed-child:asphalt-removal-destination-${suffix}:v1`,
    title_ru: title,
    scope_trigger_parameter: "material_destination",
    scope_trigger_values: [value],
    supported_scope_modes: BOTH,
    parameters: [parameter("material_destination", "Назначение снятого материала", "SCOPE_TRIGGER", null), ...removalArea.slice(1, 4)],
    rows: [row({ id: `removal:destination_${suffix}`, section: "Отходы и возвратные материалы", category: informational ? "waste" : "subcontract_service", title, expression: "removal_area_m2 * removal_depth_mm / 1000 * existing_asphalt_density_t_m3", inputs: ["removal_area_m2", "removal_depth_mm", "existing_asphalt_density_t_m3"], unit: "t", calculate: (v) => v.removal_area_m2 * v.removal_depth_mm / 1000 * v.existing_asphalt_density_t_m3, owner: `removal:destination_${suffix}`, sources: ["project_material_management_plan", "eaeu_tr_ts_014_2011"], informational })],
  };
}

export const ASPHALT_REMOVAL_RESOURCE_PARAMETER_KEYS_V4 = Object.freeze([
  "estimate_scope_mode", "asphalt_removal_package_required", "removal_labor_productivity_m2_per_man_hour",
  "removal_control_interval_m2_per_test", "removal_documentation_count",
  "milling_productivity_m3_per_machine_hour", "breakout_productivity_m3_per_machine_hour",
  "manual_breakout_productivity_m3_per_machine_hour", "combined_removal_productivity_m3_per_machine_hour",
  "loader_productivity_t_per_machine_hour", "truck_average_speed_km_per_machine_hour",
  "truck_turnaround_machine_hours", "dust_suppression_water_l_m2", "water_truck_productivity_m2_per_machine_hour",
  "base_cleaning_productivity_m2_per_man_hour", "boundary_cut_required", "boundary_cut_consumable_kg_m",
  "boundary_cut_productivity_m_per_man_hour", "boundary_saw_productivity_m_per_machine_hour",
  "surface_cleaner_productivity_m2_per_machine_hour",
] as const);

export const ASPHALT_REMOVAL_RESOURCE_ASSEMBLIES_V4: readonly ProfessionalChildAssemblyV4[] = Object.freeze([
  REMOVAL_COMMON, ...METHOD_ASSEMBLIES, LOADING, HAUL, DUST, BASE_CLEANING, BOUNDARY_CUTTING,
  destinationAssembly("DISPOSAL", "disposal", "Передача снятого асфальтобетона на подтверждённый объект размещения"),
  destinationAssembly("RECYCLING", "recycling", "Передача снятого асфальтобетона на переработку"),
  destinationAssembly("RECOVERED_MATERIAL", "recovered", "Оприходованный возвратный асфальтобетонный материал", true),
  destinationAssembly("TEMPORARY_STORAGE", "temporary-storage", "Размещение снятого асфальтобетона на подтверждённой временной площадке"),
]);
