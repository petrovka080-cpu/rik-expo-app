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
  HVAC_COMPLETE_ALIAS_COUNT,
  HVAC_COMPLETE_DOMAIN_ID,
  HVAC_COMPLETE_DOMAIN_VERSION,
  HVAC_COMPLETE_RECORD_COUNT,
  HVAC_COMPLETE_TECHNOLOGY_COUNT,
  HVAC_DOMAIN_CATALOG_BINDINGS,
  HVAC_DOMAIN_INVENTORY,
  HVAC_REVIEWED_EXCLUSION_COUNT,
  type HvacDomainInventoryRow,
} from "./inventory";
import {
  hvacIsRepair,
  hvacQuantityParameter,
  hvacTechnologyProfile,
  type HvacTechnologyProfile,
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
  const condition = options.condition ?? (priority === "P0" ? ALWAYS : FULL_ONLY);
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

const yesNoChoices = (): readonly { value: string; label_ru: string }[] => [
  { value: "true", label_ru: "Да" },
  { value: "false", label_ru: "Нет" },
];

const CHOICE_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  AS_BUILT_ESTIMATE: "Исполнительная смета",
  DETAILED_BOQ_FROM_DRAWINGS: "Детальная ведомость по проектным чертежам",
  PRELIMINARY_BOQ: "Предварительная ведомость объёмов",
  ROM_CONCEPT: "Концептуальная оценка состава",
  TENDER_BOQ: "Тендерная ведомость объёмов",
  large_area: "Большая площадь",
  small_area: "Малая площадь",
  standard: "Стандартные условия",
  technical_room: "Техническое помещение",
  wet_zone: "Влажная зона",
  SPACE_HEATING: "Отопление помещений",
  DISTRICT_HEATING: "Тепловая сеть и теплоснабжение",
  COMFORT_VENTILATION: "Общеобменная вентиляция",
  PROCESS_VENTILATION: "Технологическая вентиляция",
  COOLING_AIR_CONDITIONING: "Кондиционирование и холодоснабжение",
  FLUE_EXHAUST: "Удаление дымовых газов",
  TESTING_BALANCING: "Испытания, балансировка и ПНР",
  HEATING_WATER: "Теплоноситель системы отопления",
  STEAM_PROJECT_DEFINED: "Пар по проекту",
  SUPPLY_AIR: "Приточный воздух",
  EXHAUST_AIR: "Вытяжной воздух",
  SUPPLY_EXHAUST_AIR: "Приточно-вытяжная система",
  REFRIGERANT_PROJECT_DEFINED: "Хладагент по паспорту производителя",
  FLUE_GAS: "Дымовые газы",
  MIXED_PROJECT_DEFINED: "Среда по проекту",
  INTERNAL: "Внутренняя система",
  EXTERNAL: "Наружная сеть",
  FACILITY: "Технологическое помещение или установка",
  TUNNEL: "Тоннель",
});

function exactChoice(value: string): readonly { value: string; label_ru: string }[] {
  const label = CHOICE_LABELS_RU[value];
  if (!label) throw new Error(`HVAC_CHOICE_LABEL_MISSING:${value}`);
  return [{ value, label_ru: label }];
}

const isPipe = (profile: HvacTechnologyProfile): boolean => profile.requires_pipe_topology;
const isDuct = (profile: HvacTechnologyProfile): boolean => profile.requires_duct_topology;
const isEquipment = (profile: HvacTechnologyProfile): boolean => profile.requires_equipment_package;
const isRefrigerant = (profile: HvacTechnologyProfile): boolean => profile.requires_refrigerant_inputs;
const isExternal = (profile: HvacTechnologyProfile): boolean => profile.network_location === "EXTERNAL";
const isWarmFloor = (profile: HvacTechnologyProfile): boolean => profile.technology_class === "WARM_FLOOR_SYSTEM";
const isCommissioning = (profile: HvacTechnologyProfile): boolean => profile.technology_class === "TESTING_BALANCING_COMMISSIONING";
const isInsulation = (profile: HvacTechnologyProfile): boolean => profile.technology_class === "THERMAL_INSULATION";

function conditionalParameter(
  id: string,
  label: string,
  unit: string | null,
  consumers: readonly string[],
  trigger: string,
  minimum = 0.000001,
  maximum = 100_000_000,
): ProfessionalDomainParameterDefinitionV1 {
  return parameter(id, label, unit ? "number" : "text", "P1", unit, consumers, {
    ...(unit ? { minimum, maximum } : {}),
    condition: { kind: "EQUALS", parameter_id: trigger, value: "true" },
  });
}

function schemaFor(row: HvacDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const profile = hvacTechnologyProfile(row);
  const quantity = hvacQuantityParameter(profile);
  const parameters: ProfessionalDomainParameterDefinitionV1[] = [
    parameter("work_included", "Точная выбранная работа включена в расчёт", "boolean", "P0", null, [], { choices: yesNoChoices() }),
    parameter("estimate_scope_mode", "Состав ресурсного расчёта", "choice", "P0", null, [], { choices: [
      { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно выбранный состав" },
      { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый состав" },
    ] }),
    parameter("scope_capability", "Точный вариант каталожной работы", "choice", "P0", null, [], { choices: exactChoice(row.scope_capability) }),
    parameter("funding_source", "Источник финансирования", "choice", "P0", null, [], { choices: [
      { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
      { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
      { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
    ] }),
    parameter("project_type", "Тип объекта по утверждённому проекту", "text", "P0", null, []),
    parameter("system_purpose", "Назначение системы", "choice", "P0", null, [], { choices: exactChoice(profile.system_purpose) }),
    parameter("medium_or_air_system", "Теплоноситель, воздушная среда или хладагент", "choice", "P0", null, [], { choices: exactChoice(profile.medium_or_air_system) }),
    parameter("network_location", "Расположение системы", "choice", "P0", null, [], { choices: exactChoice(profile.network_location) }),
    parameter(quantity.parameter_id, quantity.label_ru, "number", "P0", quantity.unit_id, ["primary_resource", "installation_labor", "installation_equipment"], { minimum: 0.001, maximum: 100_000_000 }),
    parameter("exact_material_or_equipment", "Точный материал, изделие или модель оборудования по проекту", "text", "P0", null, []),
    parameter("product_profile_id", "Паспорт выбранного материала или оборудования", "text", "P0", null, []),
    parameter("normative_rate_code", "Код применимой ресурсной нормы КР", "text", "P0", null, []),
    parameter("primary_resource_units_per_output", "Расход основного ресурса на единицу результата по проекту или норме", "number", "P0", "ratio", ["primary_resource"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("procurement_factor", "Проектный коэффициент закупки с подтверждёнными потерями", "number", "P0", "ratio", ["primary_resource"], { minimum: 1, maximum: 3 }),
    parameter("primary_resource_mass_kg_per_unit", "Масса единицы основного ресурса по паспорту", "number", "P0", "kg_per_unit", ["delivery", "waste"], { minimum: 0.000001, maximum: 100_000_000 }),
    parameter("accessory_count", "Количество точных комплектующих по спецификации", "number", "P0", "item", ["accessories"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("connection_count", "Количество точных монтажных соединений", "number", "P0", "item", ["connections"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("labor_productivity_output_per_man_hour", "Производительность труда по применимой норме", "number", "P0", "output_per_man_hour", ["installation_labor"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("equipment_productivity_output_per_machine_hour", "Производительность монтажного механизма по применимой норме", "number", "P0", "output_per_machine_hour", ["installation_equipment"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("joint_consumable_kg_per_connection", "Расход материалов соединения на один стык", "number", "P1", "kg_per_item", ["joint_consumables"], { minimum: 0.000001, maximum: 10_000 }),
    parameter("support_count", "Количество опор, подвесов, рам или кронштейнов по проекту", "number", "P1", "item", ["supports"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("penetration_count", "Количество проходок через конструкции", "number", "P1", "item", ["penetrations"], { minimum: 0.001, maximum: 10_000_000 }),
    parameter("connection_productivity_item_per_man_hour", "Производительность сборки точных соединений", "number", "P1", "item_per_man_hour", ["connection_labor"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("loading_productivity_kg_per_man_hour", "Производительность погрузки и разгрузки", "number", "P1", "kg_per_man_hour", ["loading_labor"], { minimum: 0.000001, maximum: 100_000_000 }),
    parameter("handling_productivity_kg_per_machine_hour", "Производительность подъёма и внутреннего перемещения", "number", "P1", "kg_per_machine_hour", ["internal_handling"], { minimum: 0.000001, maximum: 100_000_000 }),
    parameter("delivery_distance_km", "Расстояние доставки", "number", "P1", "km", ["delivery"], { minimum: 0.001, maximum: 10_000 }),
    parameter("waste_percent", "Подтверждённая доля технологических отходов", "number", "P1", "percent", ["waste"], { minimum: 0.000001, maximum: 50 }),
    parameter("control_section_output", "Объём результата на один контрольный участок", "number", "P1", "output_per_test", ["quality_control"], { minimum: 0.000001, maximum: 100_000_000 }),
    parameter("commissioning_productivity_output_per_man_hour", "Производительность испытаний и ПНР", "number", "P1", "output_per_man_hour", ["commissioning_labor"], { minimum: 0.000001, maximum: 1_000_000 }),
    parameter("documentation_record_count", "Количество исполнительных схем, актов и протоколов", "number", "P1", "item", ["documentation"], { minimum: 0.001, maximum: 1_000_000 }),
    parameter("firestopping_included", "Противопожарная заделка проходок включена", "choice", "P1", null, [], { choices: yesNoChoices() }),
    conditionalParameter("firestop_material_kg_per_penetration", "Расход сертифицированной огнезаделки на проходку", "kg_per_item", ["firestop_material"], "firestopping_included"),
    conditionalParameter("firestop_productivity_item_per_man_hour", "Производительность устройства огнезаделки", "item_per_man_hour", ["firestop_labor"], "firestopping_included"),
  ];

  if (!isInsulation(profile)) {
    parameters.push(
      parameter("insulation_included", "Тепловая или акустическая изоляция включена", "choice", "P1", null, [], { choices: yesNoChoices() }),
      conditionalParameter("insulation_quantity", "Проектное количество изоляции", profile.output_mode === "ROUTE_LENGTH" ? "m" : "m2", ["insulation"], "insulation_included"),
      conditionalParameter("insulation_labor_productivity_per_man_hour", "Производительность монтажа изоляции", "output_per_man_hour", ["insulation_labor"], "insulation_included"),
    );
  }
  if (isPipe(profile) || isWarmFloor(profile)) {
    parameters.push(
      parameter("nominal_diameter_mm", "Номинальный диаметр DN по проекту", "number", "P0", "mm", [], { minimum: 5, maximum: 5_000 }),
      parameter("pipe_material_and_class", "Материал, SDR/schedule и класс трубы", "text", "P0", null, []),
      parameter("jointing_method", "Точный способ соединения трубы", "text", "P0", null, []),
      parameter("design_supply_temperature_c", "Расчётная температура подачи по проекту", "number", "P0", "degC", [], { minimum: -60, maximum: 500 }),
      parameter("design_return_temperature_c", "Расчётная температура обратной линии по проекту", "number", "P0", "degC", [], { minimum: -60, maximum: 500 }),
      parameter("working_pressure_mpa", "Рабочее давление по проекту", "number", "P0", "MPa", [], { minimum: 0.001, maximum: 100 }),
      parameter("test_pressure_mpa", "Испытательное давление по проекту", "number", "P0", "MPa", [], { minimum: 0.001, maximum: 200 }),
      parameter("elbow_count", "Количество отводов по спецификации", "number", "P1", "item", ["pipe_elbows"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("tee_count", "Количество тройников по спецификации", "number", "P1", "item", ["pipe_tees"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("reducer_count", "Количество переходов по спецификации", "number", "P1", "item", ["pipe_reducers"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("valve_count", "Количество арматуры по спецификации", "number", "P1", "item", ["valves"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("pressure_test_section_count", "Количество участков опрессовки", "number", "P1", "item", ["pressure_test"], { minimum: 0.001, maximum: 1_000_000 }),
    );
    if (!isWarmFloor(profile)) {
      parameters.push(
        parameter("heating_terminals_included", "Отопительные приборы включены отдельной typed assembly", "choice", "P1", null, [], { choices: yesNoChoices() }),
        conditionalParameter("heating_terminal_count", "Количество отопительных приборов по проекту", "item", ["heating_terminals", "heating_terminal_connections"], "heating_terminals_included"),
        conditionalParameter("heating_terminal_connection_count", "Количество комплектов подключения приборов", "item", ["heating_terminal_connections"], "heating_terminals_included"),
        conditionalParameter("heating_terminal_productivity_item_per_man_hour", "Производительность монтажа отопительных приборов", "item_per_man_hour", ["heating_terminal_labor"], "heating_terminals_included"),
      );
    }
  }
  if (isDuct(profile)) {
    parameters.push(
      parameter("duct_material_and_coating", "Материал, толщина и покрытие воздуховодов", "text", "P0", null, []),
      parameter("duct_shape", "Форма сечения воздуховода", "choice", "P0", null, [], { choices: [
        { value: "ROUND", label_ru: "Круглое сечение" },
        { value: "RECTANGULAR", label_ru: "Прямоугольное сечение" },
        { value: "MIXED_EXPLICIT", label_ru: "Смешанная ведомость по проекту" },
      ] }),
      parameter("duct_surface_area_m2", "Площадь металла воздуховодов по ведомости проекта", "number", "P0", "m2", ["duct_metal"], { minimum: 0.001, maximum: 100_000_000 }),
      parameter("design_airflow_m3_h", "Проектный расход воздуха", "number", "P0", "m3_per_hour", [], { minimum: 0.001, maximum: 100_000_000 }),
      parameter("duct_pressure_class", "Класс давления и герметичности воздуховода", "text", "P0", null, []),
      parameter("duct_elbow_count", "Количество отводов воздуховода", "number", "P1", "item", ["duct_elbows"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("duct_tee_count", "Количество тройников воздуховода", "number", "P1", "item", ["duct_tees"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("duct_transition_count", "Количество переходов воздуховода", "number", "P1", "item", ["duct_transitions"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("damper_count", "Количество клапанов и заслонок", "number", "P1", "item", ["dampers"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("air_terminal_count", "Количество воздухораспределителей", "number", "P1", "item", ["air_terminals"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("measurement_point_count", "Количество точек аэродинамических измерений", "number", "P1", "item", ["air_measurements"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("silencer_count", "Количество шумоглушителей по проекту", "number", "P1", "item", ["silencers"], { minimum: 0.001, maximum: 10_000_000 }),
    );
  }
  if (isEquipment(profile)) {
    parameters.push(
      parameter("equipment_model", "Точная модель и комплектность оборудования", "text", "P0", null, []),
      parameter("design_capacity_kw", "Проектная тепловая или холодильная мощность", "number", "P0", "kW", [], { minimum: 0.001, maximum: 1_000_000_000 }),
      parameter("equipment_design_flow_m3_h", "Проектный расход оборудования", "number", "P0", "m3_per_hour", [], { minimum: 0.001, maximum: 1_000_000_000 }),
      parameter("equipment_performance_profile", "Проектная рабочая точка: напор, давление, температуры и иные паспортные параметры", "text", "P0", null, []),
      parameter("equipment_mass_kg", "Масса оборудования по паспорту", "number", "P1", "kg", ["equipment_lifting"], { minimum: 0.001, maximum: 100_000_000 }),
      parameter("frame_count", "Количество рам и оснований", "number", "P1", "item", ["equipment_frames"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("vibration_isolator_count", "Количество виброизоляторов", "number", "P1", "item", ["vibration_isolators"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("lifting_productivity_kg_per_machine_hour", "Производительность подъёма оборудования", "number", "P1", "kg_per_machine_hour", ["equipment_lifting"], { minimum: 0.000001, maximum: 100_000_000 }),
      parameter("auxiliary_equipment_count", "Количество отдельных насосов, теплообменников, фильтров и иных единиц по спецификации", "number", "P1", "item", ["auxiliary_equipment"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("flexible_connection_count", "Количество гибких вставок и присоединительных узлов", "number", "P1", "item", ["flexible_connections"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("electrical_automation_included", "Электроснабжение и автоматика включены отдельной сборкой", "choice", "P1", null, [], { choices: yesNoChoices() }),
      conditionalParameter("electrical_connection_count", "Количество силовых подключений", "item", ["electrical_connections"], "electrical_automation_included"),
      conditionalParameter("automation_point_count", "Количество точек контроля и автоматики", "item", ["automation_points"], "electrical_automation_included"),
      conditionalParameter("electrical_labor_productivity_point_per_man_hour", "Производительность подключения электрики и автоматики", "item_per_man_hour", ["electrical_labor"], "electrical_automation_included"),
    );
  }
  if (isRefrigerant(profile)) {
    parameters.push(
      parameter("manufacturer_system_profile_id", "Паспорт согласованной холодильной системы", "text", "P0", null, []),
      parameter("refrigerant_type", "Тип хладагента по паспорту", "text", "P0", null, []),
      parameter("liquid_line_length_m", "Длина жидкостной линии по проекту", "number", "P0", "m", ["liquid_line"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("gas_line_length_m", "Длина газовой линии по проекту", "number", "P0", "m", ["gas_line"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("refrigerant_branch_count", "Количество ответвителей по проекту производителя", "number", "P1", "item", ["refrigerant_branches"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("manufacturer_charge_kg", "Количество хладагента по расчёту производителя", "number", "P1", "kg", ["manufacturer_charge"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("vacuum_test_section_count", "Количество участков опрессовки и вакуумирования", "number", "P1", "item", ["vacuum_test"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("condensate_drain_included", "Дренаж конденсата включён отдельной сборкой", "choice", "P1", null, [], { choices: yesNoChoices() }),
      conditionalParameter("condensate_drain_length_m", "Длина дренажа конденсата", "m", ["condensate_drain"], "condensate_drain_included"),
      conditionalParameter("condensate_drain_fitting_count", "Количество фасонных частей дренажа", "item", ["condensate_drain_fittings"], "condensate_drain_included"),
      conditionalParameter("condensate_drain_productivity_m_per_man_hour", "Производительность монтажа дренажа", "m_per_man_hour", ["condensate_drain_labor"], "condensate_drain_included"),
    );
  }
  if (isWarmFloor(profile)) {
    parameters.push(
      parameter("circuit_length_m", "Суммарная длина контуров по проекту", "number", "P0", "m", ["warm_floor_pipe"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("circuit_count", "Количество контуров по проекту", "number", "P0", "item", ["warm_floor_circuits"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("manifold_outlet_count", "Количество выходов коллектора", "number", "P1", "item", ["warm_floor_manifold"], { minimum: 0.001, maximum: 1_000_000 }),
      parameter("fixing_units_per_m2", "Расход креплений на площадь по системе", "number", "P1", "item_per_m2", ["warm_floor_fixing"], { minimum: 0.000001, maximum: 10_000 }),
      parameter("interior_screed_included", "Стяжка над тёплым полом включена отдельной сборкой", "choice", "P1", null, [], { choices: yesNoChoices() }),
      conditionalParameter("screed_volume_m3", "Проектный объём стяжки", "m3", ["screed_material", "screed_work"], "interior_screed_included"),
      conditionalParameter("screed_productivity_m3_per_man_hour", "Производительность устройства стяжки", "m3_per_man_hour", ["screed_work"], "interior_screed_included"),
    );
  }
  if (isCommissioning(profile)) {
    parameters.push(
      parameter("measurement_point_count", "Количество точек измерения по программе", "number", "P0", "item", ["commissioning_measurements"], { minimum: 0.001, maximum: 10_000_000 }),
      parameter("design_flow_total", "Суммарный проектный расход системы", "number", "P0", "project_flow_unit", [], { minimum: 0.001, maximum: 1_000_000_000 }),
      parameter("measurement_productivity_point_per_man_hour", "Производительность измерений и балансировки", "number", "P1", "item_per_man_hour", ["balancing_labor"], { minimum: 0.000001, maximum: 1_000_000 }),
    );
  }
  if (isExternal(profile)) {
    parameters.push(
      parameter("earthworks_included", "Траншея и земляные работы включены", "choice", "P1", null, [], { choices: yesNoChoices() }),
      conditionalParameter("external_work_length_m", "Длина наружной трассы для земляных работ", "m", ["excavation", "bedding", "backfill"], "earthworks_included"),
      conditionalParameter("trench_width_m", "Ширина траншеи по проекту", "m", ["excavation", "bedding", "backfill"], "earthworks_included", 0.01, 100),
      conditionalParameter("trench_depth_m", "Глубина траншеи по проекту", "m", ["excavation", "backfill"], "earthworks_included", 0.01, 100),
      conditionalParameter("bedding_thickness_m", "Толщина постели по проекту", "m", ["bedding", "backfill"], "earthworks_included", 0.001, 10),
      conditionalParameter("excavation_productivity_m3_per_machine_hour", "Производительность разработки грунта", "m3_per_machine_hour", ["excavator"], "earthworks_included"),
      conditionalParameter("backfill_productivity_m3_per_machine_hour", "Производительность обратной засыпки", "m3_per_machine_hour", ["compaction"], "earthworks_included"),
      conditionalParameter("surplus_soil_m3", "Объём вывозимого грунта", "m3", ["surplus_soil", "soil_haul"], "earthworks_included"),
      conditionalParameter("soil_bulk_density_t_m3", "Насыпная плотность вывозимого грунта", "t_per_m3", ["soil_haul"], "earthworks_included", 0.1, 5),
      conditionalParameter("soil_haul_distance_km", "Расстояние вывоза грунта", "km", ["soil_haul"], "earthworks_included", 0.001, 10_000),
      parameter("restoration_included", "Восстановление нарушенного покрытия включено", "choice", "P1", null, [], { choices: yesNoChoices() }),
      conditionalParameter("restoration_area_m2", "Площадь восстановления покрытия", "m2", ["restoration_material", "restoration_work"], "restoration_included"),
      conditionalParameter("restoration_material_kg_per_m2", "Расход материала восстановления", "kg_per_m2", ["restoration_material"], "restoration_included"),
      conditionalParameter("restoration_productivity_m2_per_man_hour", "Производительность восстановления", "m2_per_man_hour", ["restoration_work"], "restoration_included"),
    );
  }
  if (hvacIsRepair(row)) {
    parameters.push(
      parameter("demolition_included", "Демонтаж существующей системы включён", "choice", "P1", null, [], { choices: yesNoChoices() }),
      conditionalParameter("demolition_output_quantity", "Количество демонтируемой системы", quantity.unit_id, ["demolition_labor", "demolition_waste"], "demolition_included"),
      conditionalParameter("demolition_productivity_output_per_man_hour", "Производительность демонтажа", "output_per_man_hour", ["demolition_labor"], "demolition_included"),
      conditionalParameter("removed_mass_kg_per_output", "Масса демонтируемых материалов на единицу", "kg_per_output", ["demolition_waste", "demolition_haul"], "demolition_included"),
      conditionalParameter("demolition_haul_distance_km", "Расстояние вывоза демонтированных материалов", "km", ["demolition_haul"], "demolition_included", 0.001, 10_000),
    );
  }
  return {
    schema_id: `${row.canonical_technology_id}:parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: row.canonical_technology_id,
    parameters,
    quantity_alternatives: [[quantity.parameter_id]],
  };
}

function formula(
  technologyId: string,
  name: string,
  expression: string,
  input_parameter_ids: readonly string[],
  output_unit_id: string,
  calculate: ProfessionalAssemblyFormulaV4["calculate"],
): ProfessionalAssemblyFormulaV4 {
  return { formula_id: `${technologyId}:formula:${name}:v1`, expression, input_parameter_ids, output_unit_id, calculate };
}

const normativeSourceId = (row: HvacDomainInventoryRow): string =>
  hvacIsRepair(row) ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance";

function boqRow(
  row: HvacDomainInventoryRow,
  id: string,
  section: string,
  category: ProfessionalAssemblyRowDefinitionV4["category"],
  title_ru: string,
  rowFormula: ProfessionalAssemblyFormulaV4,
  scope: "BOTH" | "FULL_ONLY",
  domainOwner: string = HVAC_COMPLETE_DOMAIN_ID,
): ProfessionalAssemblyRowDefinitionV4 {
  return {
    row_id: `${row.canonical_technology_id}:row:${id}`,
    section,
    category,
    title_ru,
    formula: rowFormula,
    cost_ownership: "priced_resource",
    cost_owner_id: `${domainOwner}:cost-owner:${row.work_key}:${id}`,
    semantic_owner: `${domainOwner}:semantic-owner:${row.work_key}:${id}`,
    normative_source_ids: [normativeSourceId(row)],
    inclusion_condition: scope === "BOTH" ? "work_included=true" : "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE",
    procurement_eligible: ["material", "transport", "waste", "equipment"].includes(category),
  };
}

function parameterRole(id: string): ProfessionalAssemblyParameterDefinitionV4["role"] {
  if (id === "work_included" || id.endsWith("_included")) return "SCOPE_TRIGGER";
  if (id.includes("productivity") || id.includes("rate") || id.includes("normative")) return "NORM_RATE";
  if (id.includes("distance") || id.includes("haul")) return "LOGISTICS_VALUE";
  if (id.includes("test") || id.includes("control") || id.includes("measurement")) return "CONTROL_PLAN_VALUE";
  if (id.includes("material") || id.includes("mass") || id.includes("factor") || id.includes("consumable") || id.includes("charge")) return "MATERIAL_PASSPORT_VALUE";
  return "PROJECT_QUANTITY";
}

function assemblyParameters(
  schema: ProfessionalDomainParameterSchemaV1,
  rows: readonly ProfessionalAssemblyRowDefinitionV4[],
  triggerParameter: string,
  scopes: readonly ProfessionalEstimateScopeModeV4[],
): ProfessionalAssemblyParameterDefinitionV4[] {
  const byId = new Map(schema.parameters.map((item) => [item.parameter_id, item]));
  const ids = new Set([triggerParameter, ...rows.flatMap((item) => item.formula.input_parameter_ids)]);
  return [...ids].map((id) => {
    const definition = byId.get(id);
    if (!definition) throw new Error(`HVAC_ASSEMBLY_PARAMETER_NOT_IN_SCHEMA:${schema.schema_id}:${id}`);
    return {
      parameter_id: id,
      title_ru: definition.label_ru,
      role: parameterRole(id),
      unit_id: definition.unit_id,
      required_for: scopes,
    };
  });
}

function childAssembly(
  row: HvacDomainInventoryRow,
  schema: ProfessionalDomainParameterSchemaV1,
  id: string,
  title: string,
  domainOwner: string,
  triggerParameter: string,
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
    scope_trigger_values: [true, "true"],
    supported_scope_modes: scopes,
    parameters: assemblyParameters(schema, rows, triggerParameter, scopes),
    rows,
  };
}

function mainAssemblies(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4[] {
  const profile = hvacTechnologyProfile(row);
  const quantity = hvacQuantityParameter(profile);
  const q = quantity.parameter_id;
  const t = row.canonical_technology_id;
  const unit = quantity.unit_id;
  const rows: ProfessionalAssemblyRowDefinitionV4[] = [
    boqRow(row, "primary_resource", "Основные материалы и оборудование", "material", `Основной проектный ресурс: ${profile.system_label_ru}`, formula(t, "primary_resource", `${q} × primary_resource_units_per_output × procurement_factor`, [q, "primary_resource_units_per_output", "procurement_factor"], unit, (v) => v[q] * v.primary_resource_units_per_output * v.procurement_factor), "BOTH"),
    boqRow(row, "accessories", "Комплектующие", "material", `Точные комплектующие: ${profile.system_label_ru}`, formula(t, "accessories", "accessory_count", ["accessory_count"], "item", (v) => v.accessory_count), "BOTH"),
    boqRow(row, "connections", "Соединения", "material", `Точные монтажные соединения: ${profile.system_label_ru}`, formula(t, "connections", "connection_count", ["connection_count"], "item", (v) => v.connection_count), "BOTH"),
    boqRow(row, "installation_labor", "Труд", "labor", `${profile.operation_label_ru}: труд монтажников`, formula(t, "installation_labor", `${q} / labor_productivity_output_per_man_hour`, [q, "labor_productivity_output_per_man_hour"], "man_hour", (v) => v[q] / v.labor_productivity_output_per_man_hour), "BOTH"),
    boqRow(row, "installation_equipment", "Машины и механизмы", "equipment", `${profile.operation_label_ru}: применимые механизмы`, formula(t, "installation_equipment", `${q} / equipment_productivity_output_per_machine_hour`, [q, "equipment_productivity_output_per_machine_hour"], "machine_hour", (v) => v[q] / v.equipment_productivity_output_per_machine_hour), "BOTH"),
    boqRow(row, "joint_consumables", "Соединения", "material", "Расходные материалы точного способа соединения", formula(t, "joint_consumables", "connection_count × joint_consumable_kg_per_connection", ["connection_count", "joint_consumable_kg_per_connection"], "kg", (v) => v.connection_count * v.joint_consumable_kg_per_connection), "FULL_ONLY"),
    boqRow(row, "supports", "Опоры, подвесы и рамы", "material", "Опоры, подвесы, рамы и крепления по проекту", formula(t, "supports", "support_count", ["support_count"], "item", (v) => v.support_count), "FULL_ONLY"),
    boqRow(row, "penetrations", "Проходки", "material", "Гильзы и герметизация проходок", formula(t, "penetrations", "penetration_count", ["penetration_count"], "item", (v) => v.penetration_count), "FULL_ONLY"),
    boqRow(row, "connection_labor", "Труд", "labor", "Труд сборки точных соединений", formula(t, "connection_labor", "connection_count / connection_productivity_item_per_man_hour", ["connection_count", "connection_productivity_item_per_man_hour"], "man_hour", (v) => v.connection_count / v.connection_productivity_item_per_man_hour), "FULL_ONLY"),
    boqRow(row, "loading_labor", "Логистика", "labor", "Погрузка и разгрузка ресурсов", formula(t, "loading_labor", `${q} × primary_resource_units_per_output × primary_resource_mass_kg_per_unit / loading_productivity_kg_per_man_hour`, [q, "primary_resource_units_per_output", "primary_resource_mass_kg_per_unit", "loading_productivity_kg_per_man_hour"], "man_hour", (v) => v[q] * v.primary_resource_units_per_output * v.primary_resource_mass_kg_per_unit / v.loading_productivity_kg_per_man_hour), "FULL_ONLY"),
    boqRow(row, "internal_handling", "Логистика", "equipment", "Подъём и внутреннее перемещение ресурсов", formula(t, "internal_handling", `${q} × primary_resource_units_per_output × primary_resource_mass_kg_per_unit / handling_productivity_kg_per_machine_hour`, [q, "primary_resource_units_per_output", "primary_resource_mass_kg_per_unit", "handling_productivity_kg_per_machine_hour"], "machine_hour", (v) => v[q] * v.primary_resource_units_per_output * v.primary_resource_mass_kg_per_unit / v.handling_productivity_kg_per_machine_hour), "FULL_ONLY"),
    boqRow(row, "delivery", "Внешняя логистика", "transport", "Доставка основных ресурсов", formula(t, "delivery", `${q} × primary_resource_units_per_output × primary_resource_mass_kg_per_unit / 1000 × delivery_distance_km`, [q, "primary_resource_units_per_output", "primary_resource_mass_kg_per_unit", "delivery_distance_km"], "t_km", (v) => v[q] * v.primary_resource_units_per_output * v.primary_resource_mass_kg_per_unit / 1_000 * v.delivery_distance_km), "FULL_ONLY"),
    boqRow(row, "waste", "Отходы", "waste", "Технологические отходы с подтверждённой долей", formula(t, "waste", `${q} × primary_resource_units_per_output × primary_resource_mass_kg_per_unit × waste_percent / 100`, [q, "primary_resource_units_per_output", "primary_resource_mass_kg_per_unit", "waste_percent"], "kg", (v) => v[q] * v.primary_resource_units_per_output * v.primary_resource_mass_kg_per_unit * v.waste_percent / 100), "FULL_ONLY"),
    boqRow(row, "quality_control", "Испытания и контроль", "testing", "Операционный контроль и контрольные участки", formula(t, "quality_control", `ceil(${q} / control_section_output)`, [q, "control_section_output"], "item", (v) => Math.ceil(v[q] / v.control_section_output)), "FULL_ONLY"),
    boqRow(row, "commissioning_labor", "Испытания, балансировка и ПНР", "labor", "Труд испытаний, регулирования и ввода в эксплуатацию", formula(t, "commissioning_labor", `${q} / commissioning_productivity_output_per_man_hour`, [q, "commissioning_productivity_output_per_man_hour"], "man_hour", (v) => v[q] / v.commissioning_productivity_output_per_man_hour), "FULL_ONLY"),
    boqRow(row, "documentation", "Исполнительная документация", "documentation", "Исполнительные схемы, акты и протоколы", formula(t, "documentation", "documentation_record_count", ["documentation_record_count"], "item", (v) => v.documentation_record_count), "FULL_ONLY"),
  ];
  if (isPipe(profile) || isWarmFloor(profile)) {
    rows.push(
      boqRow(row, "pipe_elbows", "Трубопроводная арматура", "material", "Отводы точного DN и класса", formula(t, "pipe_elbows", "elbow_count", ["elbow_count"], "item", (v) => v.elbow_count), "FULL_ONLY"),
      boqRow(row, "pipe_tees", "Трубопроводная арматура", "material", "Тройники точного DN и класса", formula(t, "pipe_tees", "tee_count", ["tee_count"], "item", (v) => v.tee_count), "FULL_ONLY"),
      boqRow(row, "pipe_reducers", "Трубопроводная арматура", "material", "Переходы по спецификации", formula(t, "pipe_reducers", "reducer_count", ["reducer_count"], "item", (v) => v.reducer_count), "FULL_ONLY"),
      boqRow(row, "valves", "Трубопроводная арматура", "equipment", "Запорная, регулирующая и балансировочная арматура", formula(t, "valves", "valve_count", ["valve_count"], "item", (v) => v.valve_count), "FULL_ONLY"),
      boqRow(row, "pressure_test", "Испытания и контроль", "testing", "Опрессовка проектным испытательным давлением", formula(t, "pressure_test", "pressure_test_section_count", ["pressure_test_section_count"], "item", (v) => v.pressure_test_section_count), "FULL_ONLY"),
    );
  }
  if (isDuct(profile)) {
    rows.push(
      boqRow(row, "duct_metal", "Воздуховоды", "material", "Металл воздуховодов по проектной ведомости поверхности", formula(t, "duct_metal", "duct_surface_area_m2", ["duct_surface_area_m2"], "m2", (v) => v.duct_surface_area_m2), "FULL_ONLY"),
      boqRow(row, "duct_elbows", "Фасонные части воздуховодов", "material", "Отводы воздуховода", formula(t, "duct_elbows", "duct_elbow_count", ["duct_elbow_count"], "item", (v) => v.duct_elbow_count), "FULL_ONLY"),
      boqRow(row, "duct_tees", "Фасонные части воздуховодов", "material", "Тройники воздуховода", formula(t, "duct_tees", "duct_tee_count", ["duct_tee_count"], "item", (v) => v.duct_tee_count), "FULL_ONLY"),
      boqRow(row, "duct_transitions", "Фасонные части воздуховодов", "material", "Переходы воздуховода", formula(t, "duct_transitions", "duct_transition_count", ["duct_transition_count"], "item", (v) => v.duct_transition_count), "FULL_ONLY"),
      boqRow(row, "dampers", "Арматура вентиляции", "equipment", "Клапаны и регулирующие заслонки", formula(t, "dampers", "damper_count", ["damper_count"], "item", (v) => v.damper_count), "FULL_ONLY"),
      boqRow(row, "air_terminals", "Воздухораспределители", "equipment", "Решётки, диффузоры или иные проектные воздухораспределители", formula(t, "air_terminals", "air_terminal_count", ["air_terminal_count"], "item", (v) => v.air_terminal_count), "FULL_ONLY"),
      boqRow(row, "silencers", "Акустические элементы", "equipment", "Шумоглушители по проекту", formula(t, "silencers", "silencer_count", ["silencer_count"], "item", (v) => v.silencer_count), "FULL_ONLY"),
      boqRow(row, "air_measurements", "Балансировка", "testing", "Аэродинамические измерения в проектных точках", formula(t, "air_measurements", "measurement_point_count", ["measurement_point_count"], "item", (v) => v.measurement_point_count), "FULL_ONLY"),
    );
  }
  if (isEquipment(profile)) {
    rows.push(
      boqRow(row, "equipment_frames", "Рамы и основания", "material", "Рамы и основания оборудования", formula(t, "equipment_frames", "frame_count", ["frame_count"], "item", (v) => v.frame_count), "FULL_ONLY"),
      boqRow(row, "vibration_isolators", "Виброизоляция", "material", "Виброизоляторы по паспорту оборудования", formula(t, "vibration_isolators", "vibration_isolator_count", ["vibration_isolator_count"], "item", (v) => v.vibration_isolator_count), "FULL_ONLY"),
      boqRow(row, "equipment_lifting", "Подъём оборудования", "equipment", "Машинное время подъёма оборудования", formula(t, "equipment_lifting", "equipment_mass_kg / lifting_productivity_kg_per_machine_hour", ["equipment_mass_kg", "lifting_productivity_kg_per_machine_hour"], "machine_hour", (v) => v.equipment_mass_kg / v.lifting_productivity_kg_per_machine_hour), "FULL_ONLY"),
      boqRow(row, "auxiliary_equipment", "Комплектность оборудования", "equipment", "Отдельные насосы, теплообменники, фильтры и иные единицы по спецификации", formula(t, "auxiliary_equipment", "auxiliary_equipment_count", ["auxiliary_equipment_count"], "item", (v) => v.auxiliary_equipment_count), "FULL_ONLY"),
      boqRow(row, "flexible_connections", "Комплектность оборудования", "material", "Гибкие вставки и точные присоединительные узлы", formula(t, "flexible_connections", "flexible_connection_count", ["flexible_connection_count"], "item", (v) => v.flexible_connection_count), "FULL_ONLY"),
    );
  }
  if (isRefrigerant(profile)) {
    rows.push(
      boqRow(row, "liquid_line", "Холодильные линии", "material", "Жидкостная линия согласованного диаметра", formula(t, "liquid_line", "liquid_line_length_m", ["liquid_line_length_m"], "m", (v) => v.liquid_line_length_m), "FULL_ONLY"),
      boqRow(row, "gas_line", "Холодильные линии", "material", "Газовая линия согласованного диаметра", formula(t, "gas_line", "gas_line_length_m", ["gas_line_length_m"], "m", (v) => v.gas_line_length_m), "FULL_ONLY"),
      boqRow(row, "refrigerant_branches", "Холодильные линии", "material", "Ответвители по проекту производителя", formula(t, "refrigerant_branches", "refrigerant_branch_count", ["refrigerant_branch_count"], "item", (v) => v.refrigerant_branch_count), "FULL_ONLY"),
      boqRow(row, "manufacturer_charge", "Хладагент", "material", "Хладагент по расчёту производителя без скрытого подбора", formula(t, "manufacturer_charge", "manufacturer_charge_kg", ["manufacturer_charge_kg"], "kg", (v) => v.manufacturer_charge_kg), "FULL_ONLY"),
      boqRow(row, "vacuum_test", "Испытания и контроль", "testing", "Опрессовка, вакуумирование и контроль герметичности", formula(t, "vacuum_test", "vacuum_test_section_count", ["vacuum_test_section_count"], "item", (v) => v.vacuum_test_section_count), "FULL_ONLY"),
    );
  }
  if (isWarmFloor(profile)) {
    rows.push(
      boqRow(row, "warm_floor_pipe", "Тёплый пол", "material", "Труба контуров по проектной раскладке", formula(t, "warm_floor_pipe", "circuit_length_m", ["circuit_length_m"], "m", (v) => v.circuit_length_m), "FULL_ONLY"),
      boqRow(row, "warm_floor_circuits", "Тёплый пол", "work", "Монтаж отдельных контуров", formula(t, "warm_floor_circuits", "circuit_count", ["circuit_count"], "item", (v) => v.circuit_count), "FULL_ONLY"),
      boqRow(row, "warm_floor_manifold", "Тёплый пол", "equipment", "Выходы коллектора с арматурой", formula(t, "warm_floor_manifold", "manifold_outlet_count", ["manifold_outlet_count"], "item", (v) => v.manifold_outlet_count), "FULL_ONLY"),
      boqRow(row, "warm_floor_fixing", "Тёплый пол", "material", "Крепления контуров по системе", formula(t, "warm_floor_fixing", "zone_area_m2 × fixing_units_per_m2", ["zone_area_m2", "fixing_units_per_m2"], "item", (v) => v.zone_area_m2 * v.fixing_units_per_m2), "FULL_ONLY"),
    );
  }
  if (isCommissioning(profile)) {
    rows.push(
      boqRow(row, "commissioning_measurements", "Балансировка и ПНР", "testing", "Измерения в точках программы ПНР", formula(t, "commissioning_measurements", "measurement_point_count", ["measurement_point_count"], "item", (v) => v.measurement_point_count), "FULL_ONLY"),
      boqRow(row, "balancing_labor", "Балансировка и ПНР", "labor", "Труд измерений и балансировки", formula(t, "balancing_labor", "measurement_point_count / measurement_productivity_point_per_man_hour", ["measurement_point_count", "measurement_productivity_point_per_man_hour"], "man_hour", (v) => v.measurement_point_count / v.measurement_productivity_point_per_man_hour), "FULL_ONLY"),
    );
  }
  const minimalRows = rows.filter((item) => !item.inclusion_condition.includes("FULL_APPLICABLE_SCOPE"));
  const fullRows = rows.filter((item) => item.inclusion_condition.includes("FULL_APPLICABLE_SCOPE"));
  return [
    childAssembly(row, schema, "main-minimal", row.display_title_ru, HVAC_COMPLETE_DOMAIN_ID, "work_included", ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"], minimalRows),
    childAssembly(row, schema, "main-full", `${row.display_title_ru}: полный применимый ресурсный состав`, HVAC_COMPLETE_DOMAIN_ID, "work_included", ["FULL_APPLICABLE_SCOPE"], fullRows),
  ];
}

function insulationAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "insulation", "Изоляция", "material", "Тепловая или акустическая изоляция с покровным слоем", formula(t, "insulation", "insulation_quantity", ["insulation_quantity"], schema.parameters.find((item) => item.parameter_id === "insulation_quantity")?.unit_id ?? "m2", (v) => v.insulation_quantity), "FULL_ONLY", "insulation"),
    boqRow(row, "insulation_labor", "Изоляция", "labor", "Труд монтажа изоляции и покровного слоя", formula(t, "insulation_labor", "insulation_quantity / insulation_labor_productivity_per_man_hour", ["insulation_quantity", "insulation_labor_productivity_per_man_hour"], "man_hour", (v) => v.insulation_quantity / v.insulation_labor_productivity_per_man_hour), "FULL_ONLY", "insulation"),
  ];
  return childAssembly(row, schema, "insulation", "Изоляция системы", "insulation", "insulation_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function firestopAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "firestop_material", "Огнезаделка", "material", "Сертифицированная система огнезаделки проходок", formula(t, "firestop_material", "penetration_count × firestop_material_kg_per_penetration", ["penetration_count", "firestop_material_kg_per_penetration"], "kg", (v) => v.penetration_count * v.firestop_material_kg_per_penetration), "FULL_ONLY", "fire_safety_firestopping"),
    boqRow(row, "firestop_labor", "Огнезаделка", "labor", "Труд устройства и маркировки огнезаделок", formula(t, "firestop_labor", "penetration_count / firestop_productivity_item_per_man_hour", ["penetration_count", "firestop_productivity_item_per_man_hour"], "man_hour", (v) => v.penetration_count / v.firestop_productivity_item_per_man_hour), "FULL_ONLY", "fire_safety_firestopping"),
  ];
  return childAssembly(row, schema, "firestopping", "Противопожарная заделка проходок", "fire_safety_firestopping", "firestopping_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function heatingTerminalsAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "heating_terminals", "Отопительные приборы", "equipment", "Отопительные приборы точной модели и мощности по проекту", formula(t, "heating_terminals", "heating_terminal_count", ["heating_terminal_count"], "item", (v) => v.heating_terminal_count), "FULL_ONLY", HVAC_COMPLETE_DOMAIN_ID),
    boqRow(row, "heating_terminal_connections", "Отопительные приборы", "material", "Клапаны, термостатические головки, воздухоотводчики и комплекты подключения", formula(t, "heating_terminal_connections", "heating_terminal_connection_count", ["heating_terminal_connection_count"], "item", (v) => v.heating_terminal_connection_count), "FULL_ONLY", HVAC_COMPLETE_DOMAIN_ID),
    boqRow(row, "heating_terminal_labor", "Отопительные приборы", "labor", "Труд монтажа и регулирования отопительных приборов", formula(t, "heating_terminal_labor", "heating_terminal_count / heating_terminal_productivity_item_per_man_hour", ["heating_terminal_count", "heating_terminal_productivity_item_per_man_hour"], "man_hour", (v) => v.heating_terminal_count / v.heating_terminal_productivity_item_per_man_hour), "FULL_ONLY", HVAC_COMPLETE_DOMAIN_ID),
  ];
  return childAssembly(row, schema, "heating-terminals", "Отопительные приборы и их подключения", HVAC_COMPLETE_DOMAIN_ID, "heating_terminals_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function electricalAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "electrical_connections", "Электрика и автоматика", "equipment", "Силовые подключения по проекту", formula(t, "electrical_connections", "electrical_connection_count", ["electrical_connection_count"], "item", (v) => v.electrical_connection_count), "FULL_ONLY", "electrical_automation"),
    boqRow(row, "automation_points", "Электрика и автоматика", "equipment", "Точки контроля и автоматики по проекту", formula(t, "automation_points", "automation_point_count", ["automation_point_count"], "item", (v) => v.automation_point_count), "FULL_ONLY", "electrical_automation"),
    boqRow(row, "electrical_labor", "Электрика и автоматика", "labor", "Труд подключения электрики и автоматики", formula(t, "electrical_labor", "(electrical_connection_count + automation_point_count) / electrical_labor_productivity_point_per_man_hour", ["electrical_connection_count", "automation_point_count", "electrical_labor_productivity_point_per_man_hour"], "man_hour", (v) => (v.electrical_connection_count + v.automation_point_count) / v.electrical_labor_productivity_point_per_man_hour), "FULL_ONLY", "electrical_automation"),
  ];
  return childAssembly(row, schema, "electrical-automation", "Граница электроснабжения и автоматики", "electrical_automation", "electrical_automation_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function condensateAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "condensate_drain", "Дренаж конденсата", "material", "Трубопровод дренажа конденсата", formula(t, "condensate_drain", "condensate_drain_length_m", ["condensate_drain_length_m"], "m", (v) => v.condensate_drain_length_m), "FULL_ONLY", "water_supply_sewerage"),
    boqRow(row, "condensate_drain_fittings", "Дренаж конденсата", "material", "Фасонные части дренажа", formula(t, "condensate_drain_fittings", "condensate_drain_fitting_count", ["condensate_drain_fitting_count"], "item", (v) => v.condensate_drain_fitting_count), "FULL_ONLY", "water_supply_sewerage"),
    boqRow(row, "condensate_drain_labor", "Дренаж конденсата", "labor", "Труд монтажа дренажа", formula(t, "condensate_drain_labor", "condensate_drain_length_m / condensate_drain_productivity_m_per_man_hour", ["condensate_drain_length_m", "condensate_drain_productivity_m_per_man_hour"], "man_hour", (v) => v.condensate_drain_length_m / v.condensate_drain_productivity_m_per_man_hour), "FULL_ONLY", "water_supply_sewerage"),
  ];
  return childAssembly(row, schema, "condensate-drain", "Дренаж конденсата", "water_supply_sewerage", "condensate_drain_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function earthworksAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const excavation = (v: Readonly<Record<string, number>>) => v.external_work_length_m * v.trench_width_m * v.trench_depth_m;
  const bedding = (v: Readonly<Record<string, number>>) => v.external_work_length_m * v.trench_width_m * v.bedding_thickness_m;
  const rows = [
    boqRow(row, "excavation", "Земляные работы", "work", "Разработка грунта по проектному профилю траншеи", formula(t, "excavation", "external_work_length_m × trench_width_m × trench_depth_m", ["external_work_length_m", "trench_width_m", "trench_depth_m"], "m3", excavation), "FULL_ONLY", "earthworks"),
    boqRow(row, "bedding", "Земляные работы", "material", "Постель наружной тепловой сети", formula(t, "bedding", "external_work_length_m × trench_width_m × bedding_thickness_m", ["external_work_length_m", "trench_width_m", "bedding_thickness_m"], "m3", bedding), "FULL_ONLY", "earthworks"),
    boqRow(row, "backfill", "Земляные работы", "work", "Послойная обратная засыпка", formula(t, "backfill", "external_work_length_m × trench_width_m × (trench_depth_m - bedding_thickness_m)", ["external_work_length_m", "trench_width_m", "trench_depth_m", "bedding_thickness_m"], "m3", (v) => v.external_work_length_m * v.trench_width_m * (v.trench_depth_m - v.bedding_thickness_m)), "FULL_ONLY", "earthworks"),
    boqRow(row, "excavator", "Земляные работы", "equipment", "Машинное время разработки грунта", formula(t, "excavator", "excavation / excavation_productivity_m3_per_machine_hour", ["external_work_length_m", "trench_width_m", "trench_depth_m", "excavation_productivity_m3_per_machine_hour"], "machine_hour", (v) => excavation(v) / v.excavation_productivity_m3_per_machine_hour), "FULL_ONLY", "earthworks"),
    boqRow(row, "compaction", "Земляные работы", "equipment", "Машинное время обратной засыпки и уплотнения", formula(t, "compaction", "backfill / backfill_productivity_m3_per_machine_hour", ["external_work_length_m", "trench_width_m", "trench_depth_m", "bedding_thickness_m", "backfill_productivity_m3_per_machine_hour"], "machine_hour", (v) => v.external_work_length_m * v.trench_width_m * (v.trench_depth_m - v.bedding_thickness_m) / v.backfill_productivity_m3_per_machine_hour), "FULL_ONLY", "earthworks"),
    boqRow(row, "surplus_soil", "Земляные работы", "waste", "Избыточный и непригодный грунт", formula(t, "surplus_soil", "surplus_soil_m3", ["surplus_soil_m3"], "m3", (v) => v.surplus_soil_m3), "FULL_ONLY", "earthworks"),
    boqRow(row, "soil_haul", "Земляные работы", "transport", "Вывоз избыточного грунта", formula(t, "soil_haul", "surplus_soil_m3 × soil_bulk_density_t_m3 × soil_haul_distance_km", ["surplus_soil_m3", "soil_bulk_density_t_m3", "soil_haul_distance_km"], "t_km", (v) => v.surplus_soil_m3 * v.soil_bulk_density_t_m3 * v.soil_haul_distance_km), "FULL_ONLY", "earthworks"),
  ];
  return childAssembly(row, schema, "earthworks", "Траншея наружной тепловой сети", "earthworks", "earthworks_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function restorationAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "restoration_material", "Восстановление", "material", "Материалы восстановления покрытия", formula(t, "restoration_material", "restoration_area_m2 × restoration_material_kg_per_m2", ["restoration_area_m2", "restoration_material_kg_per_m2"], "kg", (v) => v.restoration_area_m2 * v.restoration_material_kg_per_m2), "FULL_ONLY", "surface_restoration"),
    boqRow(row, "restoration_work", "Восстановление", "labor", "Труд восстановления покрытия", formula(t, "restoration_work", "restoration_area_m2 / restoration_productivity_m2_per_man_hour", ["restoration_area_m2", "restoration_productivity_m2_per_man_hour"], "man_hour", (v) => v.restoration_area_m2 / v.restoration_productivity_m2_per_man_hour), "FULL_ONLY", "surface_restoration"),
  ];
  return childAssembly(row, schema, "restoration", "Восстановление нарушенного покрытия", "surface_restoration", "restoration_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function screedAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "screed_material", "Стяжка", "material", "Смесь проектной стяжки над тёплым полом", formula(t, "screed_material", "screed_volume_m3", ["screed_volume_m3"], "m3", (v) => v.screed_volume_m3), "FULL_ONLY", "interior_finishes"),
    boqRow(row, "screed_work", "Стяжка", "labor", "Труд устройства проектной стяжки", formula(t, "screed_work", "screed_volume_m3 / screed_productivity_m3_per_man_hour", ["screed_volume_m3", "screed_productivity_m3_per_man_hour"], "man_hour", (v) => v.screed_volume_m3 / v.screed_productivity_m3_per_man_hour), "FULL_ONLY", "interior_finishes"),
  ];
  return childAssembly(row, schema, "interior-screed", "Стяжка над тёплым полом", "interior_finishes", "interior_screed_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function demolitionAssembly(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4 {
  const t = row.canonical_technology_id;
  const rows = [
    boqRow(row, "demolition_labor", "Демонтаж", "labor", "Отключение и демонтаж существующей системы", formula(t, "demolition_labor", "demolition_output_quantity / demolition_productivity_output_per_man_hour", ["demolition_output_quantity", "demolition_productivity_output_per_man_hour"], "man_hour", (v) => v.demolition_output_quantity / v.demolition_productivity_output_per_man_hour), "FULL_ONLY", "demolition"),
    boqRow(row, "demolition_waste", "Демонтаж", "waste", "Демонтированные материалы и оборудование", formula(t, "demolition_waste", "demolition_output_quantity × removed_mass_kg_per_output", ["demolition_output_quantity", "removed_mass_kg_per_output"], "kg", (v) => v.demolition_output_quantity * v.removed_mass_kg_per_output), "FULL_ONLY", "demolition"),
    boqRow(row, "demolition_haul", "Демонтаж", "transport", "Вывоз демонтированных материалов", formula(t, "demolition_haul", "demolition_output_quantity × removed_mass_kg_per_output / 1000 × demolition_haul_distance_km", ["demolition_output_quantity", "removed_mass_kg_per_output", "demolition_haul_distance_km"], "t_km", (v) => v.demolition_output_quantity * v.removed_mass_kg_per_output / 1_000 * v.demolition_haul_distance_km), "FULL_ONLY", "demolition"),
  ];
  return childAssembly(row, schema, "demolition", "Демонтаж и обращение с отходами", "demolition", "demolition_included", ["FULL_APPLICABLE_SCOPE"], rows);
}

function assembliesFor(row: HvacDomainInventoryRow, schema: ProfessionalDomainParameterSchemaV1): ProfessionalChildAssemblyV4[] {
  const profile = hvacTechnologyProfile(row);
  const assemblies = [...mainAssemblies(row, schema), firestopAssembly(row, schema)];
  if (!isInsulation(profile)) assemblies.push(insulationAssembly(row, schema));
  if (isPipe(profile) && !isWarmFloor(profile)) assemblies.push(heatingTerminalsAssembly(row, schema));
  if (isEquipment(profile)) assemblies.push(electricalAssembly(row, schema));
  if (isRefrigerant(profile)) assemblies.push(condensateAssembly(row, schema));
  if (isExternal(profile)) assemblies.push(earthworksAssembly(row, schema), restorationAssembly(row, schema));
  if (isWarmFloor(profile)) assemblies.push(screedAssembly(row, schema));
  if (hvacIsRepair(row)) assemblies.push(demolitionAssembly(row, schema));
  return assemblies;
}

const schemas: readonly ProfessionalDomainParameterSchemaV1[] = Object.freeze(HVAC_DOMAIN_INVENTORY.map(schemaFor));
const schemasByTechnologyId = new Map(schemas.map((schema) => [schema.technology_id, schema]));
const assemblyProfiles: readonly ProfessionalAssemblyProfileV1[] = Object.freeze(HVAC_DOMAIN_INVENTORY.map((row) => {
  const schema = schemasByTechnologyId.get(row.canonical_technology_id);
  if (!schema) throw new Error(`HVAC_SCHEMA_NOT_FOUND:${row.catalog_id}`);
  return {
    assembly_profile_id: `${row.canonical_technology_id}:assembly-profile:v1`,
    assembly_profile_version: "1.0.0",
    technology_id: row.canonical_technology_id,
    child_assemblies: assembliesFor(row, schema),
  };
}));

const normativeProfiles: readonly ProfessionalNormativeProfileV1[] = Object.freeze(HVAC_DOMAIN_INVENTORY.map((row) => ({
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

const technologies: readonly ProfessionalCanonicalTechnologyV1[] = Object.freeze(HVAC_DOMAIN_INVENTORY.map((row) => {
  const profile = hvacTechnologyProfile(row);
  const quantity = hvacQuantityParameter(profile);
  return {
    technology_id: row.canonical_technology_id,
    operation_class: row.operation_class,
    method: `${row.construction_method}:${profile.technology_class}:${row.scope_capability}`,
    material_system: `${row.primary_material_or_system}:${profile.system_purpose}:${profile.medium_or_air_system}`,
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

const resourcePolicies: readonly ProfessionalResourceCompletenessPolicyV1[] = Object.freeze(HVAC_DOMAIN_INVENTORY.map((row) => ({
  policy_id: `${row.canonical_technology_id}:resource-policy:v1`,
  technology_id: row.canonical_technology_id,
  required_categories: ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"],
  optional_categories: ["work", "subcontract_service", "temporary_work"],
  forbidden_generic_rows: ["Комплект отопления", "Комплект вентиляции", "Монтаж HVAC", "Система — 1 комплект"],
  one_bundle_resource_replacement_forbidden: true as const,
})));

export const HVAC_COMPLETE_DOMAIN_PACKAGE: ProfessionalEstimateDomainPackageV1 = Object.freeze({
  manifest: {
    domain_id: HVAC_COMPLETE_DOMAIN_ID,
    domain_version: HVAC_COMPLETE_DOMAIN_VERSION,
    catalog_record_count: HVAC_COMPLETE_RECORD_COUNT,
    canonical_technology_count: HVAC_COMPLETE_TECHNOLOGY_COUNT,
    alias_count: HVAC_COMPLETE_ALIAS_COUNT,
    excluded_count: HVAC_REVIEWED_EXCLUSION_COUNT,
    supported_scopes: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
    supported_jurisdictions: ["KG"],
    passports: HVAC_DOMAIN_INVENTORY.map((row) => `domain-passport:${row.catalog_id}:v1`),
    schemas: schemas.map((schema) => schema.schema_id),
    formula_packs: formulaPacks.map((pack) => pack.formula_pack_id),
    normative_profiles: normativeProfiles.map((profile) => profile.profile_id),
    child_assembly_dependencies: ["insulation", "fire_safety_firestopping", "electrical_automation", "water_supply_sewerage", "earthworks", "surface_restoration", "interior_finishes", "demolition"],
    readiness: "DOMAIN_GREEN",
  },
  catalog_bindings: HVAC_DOMAIN_CATALOG_BINDINGS,
  canonical_technologies: technologies,
  parameter_schemas: schemas,
  normative_profiles: normativeProfiles,
  formula_packs: formulaPacks,
  assembly_profiles: assemblyProfiles,
  resource_completeness_policies: resourcePolicies,
});

export const hvacDomainFactory = createProfessionalEstimateDomainFactoryV1(HVAC_COMPLETE_DOMAIN_PACKAGE);

if (
  hvacDomainFactory.binding_by_catalog_id.size !== HVAC_COMPLETE_RECORD_COUNT ||
  hvacDomainFactory.technology_by_id.size !== HVAC_COMPLETE_TECHNOLOGY_COUNT ||
  hvacDomainFactory.schema_by_id.size !== HVAC_COMPLETE_TECHNOLOGY_COUNT ||
  hvacDomainFactory.package.manifest.alias_count !== 0
) {
  throw new Error("HVAC_FACTORY_DENOMINATOR_MISMATCH");
}
