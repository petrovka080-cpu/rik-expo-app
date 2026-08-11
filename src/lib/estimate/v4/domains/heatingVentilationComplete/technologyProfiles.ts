import type { HvacDomainInventoryRow, HvacExpandedOwnedFamily } from "./inventory";

export type HvacTechnologyClass =
  | "HEATING_PIPE_NETWORK"
  | "OUTDOOR_HEAT_NETWORK"
  | "HEATING_TERMINAL"
  | "HYDRONIC_EQUIPMENT"
  | "WARM_FLOOR_SYSTEM"
  | "DUCT_NETWORK"
  | "AIR_TERMINAL"
  | "AIR_HANDLING_EQUIPMENT"
  | "REFRIGERANT_SYSTEM"
  | "FLUE_CHIMNEY"
  | "THERMAL_INSULATION"
  | "TESTING_BALANCING_COMMISSIONING";

export type HvacOutputMode =
  | "ROUTE_LENGTH"
  | "COMPONENT_COUNT"
  | "SURFACE_AREA"
  | "SYSTEM_COUNT"
  | "ZONE_AREA";

export type HvacTechnologyProfile = {
  technology_class: HvacTechnologyClass;
  system_label_ru: string;
  operation_label_ru: string;
  system_purpose:
    | "SPACE_HEATING"
    | "DISTRICT_HEATING"
    | "COMFORT_VENTILATION"
    | "PROCESS_VENTILATION"
    | "COOLING_AIR_CONDITIONING"
    | "FLUE_EXHAUST"
    | "TESTING_BALANCING";
  medium_or_air_system:
    | "HEATING_WATER"
    | "STEAM_PROJECT_DEFINED"
    | "SUPPLY_AIR"
    | "EXHAUST_AIR"
    | "SUPPLY_EXHAUST_AIR"
    | "REFRIGERANT_PROJECT_DEFINED"
    | "FLUE_GAS"
    | "MIXED_PROJECT_DEFINED";
  network_location: "INTERNAL" | "EXTERNAL" | "FACILITY" | "TUNNEL";
  output_mode: HvacOutputMode;
  requires_pipe_topology: boolean;
  requires_duct_topology: boolean;
  requires_equipment_package: boolean;
  requires_refrigerant_inputs: boolean;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  forbidden_stages: readonly string[];
};

type ProfileSeed = Omit<HvacTechnologyProfile, "operation_label_ru">;

const profile = (
  technology_class: HvacTechnologyClass,
  system_label_ru: string,
  system_purpose: HvacTechnologyProfile["system_purpose"],
  medium_or_air_system: HvacTechnologyProfile["medium_or_air_system"],
  network_location: HvacTechnologyProfile["network_location"],
  output_mode: HvacOutputMode,
  options: {
    pipe?: boolean;
    duct?: boolean;
    equipment?: boolean;
    refrigerant?: boolean;
    required: readonly string[];
    optional?: readonly string[];
    forbidden?: readonly string[];
  },
): ProfileSeed => ({
  technology_class,
  system_label_ru,
  system_purpose,
  medium_or_air_system,
  network_location,
  output_mode,
  requires_pipe_topology: options.pipe ?? false,
  requires_duct_topology: options.duct ?? false,
  requires_equipment_package: options.equipment ?? false,
  requires_refrigerant_inputs: options.refrigerant ?? false,
  required_stages: options.required,
  optional_stages: options.optional ?? [],
  forbidden_stages: options.forbidden ?? [],
});

const PIPE_STAGES = [
  "ROUTE_AND_SYSTEM_ACCEPTANCE",
  "SUPPORT_FIXED_POINT_AND_PENETRATION_PREPARATION",
  "PIPE_INSTALLATION",
  "EXACT_FITTINGS_VALVES_AND_JOINTS",
  "PRESSURE_TEST_FLUSHING_AND_BALANCING",
] as const;
const OUTDOOR_HEAT_STAGES = [
  "SURVEY_AND_EXISTING_UTILITY_CONTROL",
  "EARTHWORKS_AND_CHANNEL_OR_CASE_DECISION",
  "PIPE_SUPPORT_ANCHOR_AND_COMPENSATION_INSTALLATION",
  "WELDS_JOINTS_VALVES_AND_CHAMBERS",
  "INSULATION_JOINT_PROTECTION_AND_NDT",
  "PRESSURE_TEST_FLUSHING_BACKFILL_AND_RESTORATION",
] as const;
const EQUIPMENT_STAGES = [
  "EQUIPMENT_PACKAGE_ACCEPTANCE",
  "FRAME_FOUNDATION_AND_VIBRATION_ISOLATION",
  "LIFTING_AND_INSTALLATION",
  "PIPE_DUCT_VALVE_DRAIN_AND_FLEXIBLE_CONNECTIONS",
  "ELECTRICAL_AUTOMATION_BOUNDARY",
  "STARTUP_FUNCTIONAL_TEST_AND_COMMISSIONING",
] as const;
const DUCT_STAGES = [
  "SYSTEM_ZONE_AND_ROUTE_ACCEPTANCE",
  "SUPPORT_HANGER_AND_PENETRATION_PREPARATION",
  "STRAIGHT_DUCT_INSTALLATION",
  "EXACT_FITTINGS_FLANGES_AND_SEALING",
  "TERMINALS_DAMPERS_ACCESS_AND_FLEXIBLE_CONNECTIONS",
  "LEAKAGE_TEST_BALANCING_AND_MEASUREMENT",
] as const;
const REFRIGERANT_STAGES = [
  "MANUFACTURER_SYSTEM_ACCEPTANCE",
  "EQUIPMENT_FRAME_AND_VIBRATION_ISOLATION",
  "EXACT_LIQUID_GAS_BRANCH_AND_DRAIN_LINES",
  "INSULATION_AND_PENETRATIONS",
  "PRESSURE_TEST_VACUUM_AND_MANUFACTURER_CHARGE",
  "ELECTRICAL_CONTROLS_STARTUP_AND_COMMISSIONING",
] as const;

const BASE_SYSTEM_PROFILES: Readonly<Record<string, ProfileSeed>> = Object.freeze({
  AIR_CURTAIN: profile("AIR_HANDLING_EQUIPMENT", "воздушно-тепловой завесы", "SPACE_HEATING", "SUPPLY_AIR", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["HEATING_MEDIUM_CONNECTIONS"], forbidden: ["TRENCH_EARTHWORKS"] }),
  BALANCING: profile("TESTING_BALANCING_COMMISSIONING", "гидравлической балансировки системы отопления", "TESTING_BALANCING", "HEATING_WATER", "INTERNAL", "SYSTEM_COUNT", { required: ["DESIGN_FLOW_ACCEPTANCE", "MEASUREMENT_POINTS", "BALANCING", "PROTOCOLS"], forbidden: ["POTABLE_DISINFECTION"] }),
  BOILER: profile("HYDRONIC_EQUIPMENT", "котла отопления", "SPACE_HEATING", "HEATING_WATER", "FACILITY", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["FLUE_AND_FUEL_BOUNDARIES"], forbidden: ["HIDDEN_FUEL_SELECTION"] }),
  CHILLER: profile("REFRIGERANT_SYSTEM", "холодильной машины", "COOLING_AIR_CONDITIONING", "REFRIGERANT_PROJECT_DEFINED", "FACILITY", "COMPONENT_COUNT", { equipment: true, refrigerant: true, required: REFRIGERANT_STAGES, forbidden: ["GENERIC_REFRIGERANT_CHARGE"] }),
  CHIMNEY: profile("FLUE_CHIMNEY", "дымового канала или газохода", "FLUE_EXHAUST", "FLUE_GAS", "INTERNAL", "ROUTE_LENGTH", { duct: true, required: DUCT_STAGES, optional: ["CONDENSATE_DRAIN", "WEATHER_PROTECTION"], forbidden: ["COMFORT_AIR_TERMINALS"] }),
  COLLECTOR: profile("HYDRONIC_EQUIPMENT", "коллекторного узла отопления", "SPACE_HEATING", "HEATING_WATER", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["CABINET_AND_LABELING"], forbidden: ["DUCT_FITTINGS"] }),
  CONDITIONER: profile("REFRIGERANT_SYSTEM", "системы кондиционирования", "COOLING_AIR_CONDITIONING", "REFRIGERANT_PROJECT_DEFINED", "INTERNAL", "SYSTEM_COUNT", { equipment: true, refrigerant: true, required: REFRIGERANT_STAGES, forbidden: ["GENERIC_REFRIGERANT_CHARGE"] }),
  FANCOIL: profile("AIR_HANDLING_EQUIPMENT", "фанкойла", "COOLING_AIR_CONDITIONING", "HEATING_WATER", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["CONDENSATE_DRAIN"], forbidden: ["HIDDEN_CAPACITY_SELECTION"] }),
  HEATING_PIPE: profile("HEATING_PIPE_NETWORK", "трубопровода отопления", "SPACE_HEATING", "HEATING_WATER", "INTERNAL", "ROUTE_LENGTH", { pipe: true, required: PIPE_STAGES, optional: ["THERMAL_INSULATION", "FIRESTOPPING"], forbidden: ["POTABLE_DISINFECTION"] }),
  HEATING_PUMP: profile("HYDRONIC_EQUIPMENT", "циркуляционного насоса отопления", "SPACE_HEATING", "HEATING_WATER", "FACILITY", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["DRAIN_AND_AIR_RELEASE"], forbidden: ["HIDDEN_HEAD_SELECTION"] }),
  HEAT_STATION: profile("HYDRONIC_EQUIPMENT", "теплового пункта", "DISTRICT_HEATING", "HEATING_WATER", "FACILITY", "SYSTEM_COUNT", { equipment: true, pipe: true, required: EQUIPMENT_STAGES, optional: ["METERING_AND_HEAT_EXCHANGER_PACKAGE"], forbidden: ["HIDDEN_LOAD_SELECTION"] }),
  INSULATION: profile("THERMAL_INSULATION", "теплоизоляции системы отопления", "SPACE_HEATING", "HEATING_WATER", "INTERNAL", "SURFACE_AREA", { required: ["SURFACE_ACCEPTANCE", "INSULATION_INSTALLATION", "VAPOR_OR_COVER_LAYER", "QUALITY_ACCEPTANCE"], forbidden: ["PIPE_OR_DUCT_PRIMARY_MATERIAL"] }),
  RADIATOR: profile("HEATING_TERMINAL", "отопительного прибора", "SPACE_HEATING", "HEATING_WATER", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: ["BASE_AND_MODEL_ACCEPTANCE", "BRACKETS_AND_INSTALLATION", "VALVES_THERMOSTAT_AIR_RELEASE_AND_CONNECTIONS", "PRESSURE_TEST_AND_REGULATION"], forbidden: ["DUCT_FITTINGS"] }),
  SPLIT: profile("REFRIGERANT_SYSTEM", "сплит-системы", "COOLING_AIR_CONDITIONING", "REFRIGERANT_PROJECT_DEFINED", "INTERNAL", "SYSTEM_COUNT", { equipment: true, refrigerant: true, required: REFRIGERANT_STAGES, forbidden: ["GENERIC_REFRIGERANT_CHARGE"] }),
  THERMOSTAT: profile("HEATING_TERMINAL", "терморегулирующего устройства", "SPACE_HEATING", "HEATING_WATER", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: ["CONTROL_PROFILE_ACCEPTANCE", "INSTALLATION", "CONNECTION", "FUNCTIONAL_TEST"], forbidden: ["TRENCH_EARTHWORKS"] }),
  WARM_FLOOR: profile("WARM_FLOOR_SYSTEM", "водяного тёплого пола", "SPACE_HEATING", "HEATING_WATER", "INTERNAL", "ZONE_AREA", { pipe: true, required: ["ZONE_AND_LAYOUT_ACCEPTANCE", "SUBSTRATE_INSULATION_AND_FIXING", "EXACT_CIRCUIT_PIPE_INSTALLATION", "MANIFOLD_VALVES_AND_CONNECTIONS", "PRESSURE_TEST_BEFORE_AND_AFTER_CLOSURE"], optional: ["INTERIOR_SCREED_CHILD", "AUTOMATION_CHILD"], forbidden: ["HIDDEN_CIRCUIT_DESIGN"] }),
  COMMISSIONING: profile("TESTING_BALANCING_COMMISSIONING", "наладки вентиляционной системы", "TESTING_BALANCING", "SUPPLY_EXHAUST_AIR", "INTERNAL", "SYSTEM_COUNT", { required: ["DESIGN_AIRFLOW_ACCEPTANCE", "MEASUREMENT_POINTS", "BALANCING", "FUNCTIONAL_TESTS", "PROTOCOLS"], forbidden: ["HIDDEN_AIRFLOW_DESIGN"] }),
  DIFFUSER: profile("AIR_TERMINAL", "диффузора", "COMFORT_VENTILATION", "SUPPLY_AIR", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: ["TERMINAL_PROFILE_ACCEPTANCE", "PLENUM_DAMPER_AND_FASTENERS", "INSTALLATION", "AIRFLOW_MEASUREMENT_AND_BALANCING"], forbidden: ["PIPE_FITTINGS"] }),
  DUCT: profile("DUCT_NETWORK", "воздуховодной сети", "COMFORT_VENTILATION", "SUPPLY_EXHAUST_AIR", "INTERNAL", "ROUTE_LENGTH", { duct: true, required: DUCT_STAGES, optional: ["THERMAL_ACOUSTIC_INSULATION", "FIRESTOPPING"], forbidden: ["PIPE_FITTINGS"] }),
  DUCT_INSULATION: profile("THERMAL_INSULATION", "изоляции воздуховодов", "COMFORT_VENTILATION", "SUPPLY_EXHAUST_AIR", "INTERNAL", "SURFACE_AREA", { required: ["DUCT_SURFACE_ACCEPTANCE", "INSULATION_INSTALLATION", "VAPOR_BARRIER_AND_COVER", "QUALITY_ACCEPTANCE"], forbidden: ["PRIMARY_DUCT_METAL"] }),
  EXHAUST: profile("DUCT_NETWORK", "вытяжной вентиляционной системы", "COMFORT_VENTILATION", "EXHAUST_AIR", "INTERNAL", "SYSTEM_COUNT", { duct: true, equipment: true, required: DUCT_STAGES, optional: ["FAN_AND_TERMINALS"], forbidden: ["HIDDEN_AIRFLOW_DESIGN"] }),
  FAN: profile("AIR_HANDLING_EQUIPMENT", "вентилятора", "COMFORT_VENTILATION", "SUPPLY_EXHAUST_AIR", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["FLEXIBLE_CONNECTIONS"], forbidden: ["HIDDEN_FAN_SELECTION"] }),
  GRILLE: profile("AIR_TERMINAL", "вентиляционной решётки", "COMFORT_VENTILATION", "SUPPLY_EXHAUST_AIR", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: ["TERMINAL_PROFILE_ACCEPTANCE", "FRAME_DAMPER_AND_FASTENERS", "INSTALLATION", "AIRFLOW_MEASUREMENT_AND_BALANCING"], forbidden: ["PIPE_FITTINGS"] }),
  HOOD: profile("AIR_HANDLING_EQUIPMENT", "вытяжного зонта", "PROCESS_VENTILATION", "EXHAUST_AIR", "INTERNAL", "COMPONENT_COUNT", { equipment: true, duct: true, required: EQUIPMENT_STAGES, optional: ["GREASE_FILTER_AND_DRAIN"], forbidden: ["HIDDEN_EXHAUST_RATE"] }),
  RECUPERATOR: profile("AIR_HANDLING_EQUIPMENT", "рекуператора", "COMFORT_VENTILATION", "SUPPLY_EXHAUST_AIR", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["CONDENSATE_DRAIN_AND_FROST_PROTECTION"], forbidden: ["HIDDEN_RECOVERY_SELECTION"] }),
  SILENCER: profile("AIR_HANDLING_EQUIPMENT", "шумоглушителя", "COMFORT_VENTILATION", "SUPPLY_EXHAUST_AIR", "INTERNAL", "COMPONENT_COUNT", { equipment: true, required: ["ACOUSTIC_PROFILE_ACCEPTANCE", "FRAME_AND_INSTALLATION", "DUCT_CONNECTIONS", "ACOUSTIC_MEASUREMENT"], forbidden: ["HIDDEN_NOISE_SELECTION"] }),
  SUPPLY: profile("DUCT_NETWORK", "приточной вентиляционной системы", "COMFORT_VENTILATION", "SUPPLY_AIR", "INTERNAL", "SYSTEM_COUNT", { duct: true, equipment: true, required: DUCT_STAGES, optional: ["AHU_AND_TERMINALS"], forbidden: ["HIDDEN_AIRFLOW_DESIGN"] }),
  VENT_CHANNEL: profile("DUCT_NETWORK", "вентиляционного канала", "COMFORT_VENTILATION", "SUPPLY_EXHAUST_AIR", "INTERNAL", "ROUTE_LENGTH", { duct: true, required: DUCT_STAGES, optional: ["FIRESTOPPING"], forbidden: ["PIPE_FITTINGS"] }),
});

const EXPANDED_PROFILES: Readonly<Record<HvacExpandedOwnedFamily, ProfileSeed>> = Object.freeze({
  boiler_house: profile("HYDRONIC_EQUIPMENT", "котельной", "DISTRICT_HEATING", "HEATING_WATER", "FACILITY", "SYSTEM_COUNT", { equipment: true, pipe: true, required: EQUIPMENT_STAGES, optional: ["FLUE_FUEL_AND_WATER_BOUNDARIES"], forbidden: ["HIDDEN_FUEL_SYSTEM"] }),
  boiler_installation: profile("HYDRONIC_EQUIPMENT", "котельного оборудования", "SPACE_HEATING", "HEATING_WATER", "FACILITY", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["FLUE_BOUNDARY"], forbidden: ["HIDDEN_CAPACITY_SELECTION"] }),
  chimney_stack: profile("FLUE_CHIMNEY", "дымовой трубы и газоходов", "FLUE_EXHAUST", "FLUE_GAS", "EXTERNAL", "ROUTE_LENGTH", { duct: true, required: DUCT_STAGES, optional: ["STRUCTURAL_STACK_CHILD", "WEATHER_PROTECTION"], forbidden: ["COMFORT_AIR_TERMINALS"] }),
  cooling_tower: profile("AIR_HANDLING_EQUIPMENT", "градирни", "COOLING_AIR_CONDITIONING", "HEATING_WATER", "FACILITY", "COMPONENT_COUNT", { equipment: true, required: EQUIPMENT_STAGES, optional: ["WATER_TREATMENT_BOUNDARY"], forbidden: ["HIDDEN_CAPACITY_SELECTION"] }),
  district_heating_pipeline: profile("OUTDOOR_HEAT_NETWORK", "магистральной тепловой сети", "DISTRICT_HEATING", "HEATING_WATER", "EXTERNAL", "ROUTE_LENGTH", { pipe: true, required: OUTDOOR_HEAT_STAGES, optional: ["EARTHWORKS_AND_RESTORATION_CHILD"], forbidden: ["POTABLE_DISINFECTION"] }),
  heat_chamber: profile("HYDRONIC_EQUIPMENT", "тепловой камеры", "DISTRICT_HEATING", "HEATING_WATER", "EXTERNAL", "COMPONENT_COUNT", { equipment: true, pipe: true, required: OUTDOOR_HEAT_STAGES, optional: ["STRUCTURAL_CHAMBER_CHILD"], forbidden: ["DUCT_FITTINGS"] }),
  heat_network: profile("OUTDOOR_HEAT_NETWORK", "тепловой сети", "DISTRICT_HEATING", "HEATING_WATER", "EXTERNAL", "ROUTE_LENGTH", { pipe: true, required: OUTDOOR_HEAT_STAGES, optional: ["EARTHWORKS_AND_RESTORATION_CHILD"], forbidden: ["POTABLE_DISINFECTION"] }),
  HVAC_plant_room: profile("HYDRONIC_EQUIPMENT", "машинного помещения отопления и вентиляции", "SPACE_HEATING", "MIXED_PROJECT_DEFINED", "FACILITY", "SYSTEM_COUNT", { equipment: true, pipe: true, duct: true, required: EQUIPMENT_STAGES, optional: ["MULTI_SYSTEM_CONNECTIONS"], forbidden: ["HIDDEN_CAPACITY_SELECTION"] }),
  pipeline_compensators: profile("HEATING_PIPE_NETWORK", "компенсаторов отопительного трубопровода", "DISTRICT_HEATING", "HEATING_WATER", "EXTERNAL", "COMPONENT_COUNT", { pipe: true, required: PIPE_STAGES, optional: ["ANCHORS_AND_GUIDES"], forbidden: ["DUCT_FITTINGS"] }),
  preinsulated_pipe_installation: profile("OUTDOOR_HEAT_NETWORK", "предизолированного трубопровода", "DISTRICT_HEATING", "HEATING_WATER", "EXTERNAL", "ROUTE_LENGTH", { pipe: true, required: OUTDOOR_HEAT_STAGES, optional: ["JOINT_INSULATION_AND_ALARM_WIRES"], forbidden: ["POTABLE_DISINFECTION"] }),
  server_room_cooling: profile("REFRIGERANT_SYSTEM", "охлаждения серверного помещения", "COOLING_AIR_CONDITIONING", "REFRIGERANT_PROJECT_DEFINED", "FACILITY", "SYSTEM_COUNT", { equipment: true, refrigerant: true, required: REFRIGERANT_STAGES, optional: ["REDUNDANCY_AND_MONITORING_BOUNDARY"], forbidden: ["GENERIC_REFRIGERANT_CHARGE"] }),
  site_heat_connection: profile("OUTDOOR_HEAT_NETWORK", "подключения площадки к тепловой сети", "DISTRICT_HEATING", "HEATING_WATER", "EXTERNAL", "ROUTE_LENGTH", { pipe: true, required: OUTDOOR_HEAT_STAGES, optional: ["EXISTING_NETWORK_CONNECTION"], forbidden: ["POTABLE_DISINFECTION"] }),
  tunnel_ventilation: profile("DUCT_NETWORK", "тоннельной вентиляции", "PROCESS_VENTILATION", "SUPPLY_EXHAUST_AIR", "TUNNEL", "SYSTEM_COUNT", { duct: true, equipment: true, required: DUCT_STAGES, optional: ["FIRE_SAFETY_CONTROL_BOUNDARY"], forbidden: ["HIDDEN_AIRFLOW_DESIGN"] }),
  ventilation_system: profile("DUCT_NETWORK", "приточно-вытяжной вентиляции", "COMFORT_VENTILATION", "SUPPLY_EXHAUST_AIR", "FACILITY", "SYSTEM_COUNT", { duct: true, equipment: true, required: DUCT_STAGES, optional: ["AHU_TERMINALS_AND_CONTROLS"], forbidden: ["HIDDEN_AIRFLOW_DESIGN"] }),
});

const OPERATION_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  BALANCE: "Балансировка",
  COMMISSION: "Пусконаладка",
  CONNECT: "Подключение",
  INSTALL: "Монтаж",
  INSULATE: "Изоляция",
  PREPARE: "Подготовка",
  REPAIR: "Ремонт",
  REPLACE: "Замена",
  ROUTE: "Прокладка трассы",
  SEAL: "Герметизация",
  AS_BUILT_ESTIMATE: "Исполнительный ресурсный расчёт",
  DETAILED_BOQ_FROM_DRAWINGS: "Детальная ведомость по проектным чертежам",
  PRELIMINARY_BOQ: "Предварительная ресурсная ведомость",
  ROM_CONCEPT: "Концептуальная ресурсная оценка",
  TENDER_BOQ: "Тендерная ресурсная ведомость",
});

export function hvacTechnologyProfile(row: HvacDomainInventoryRow): HvacTechnologyProfile {
  const seed = row.source_domain_id === "heating_hvac" || row.source_domain_id === "ventilation"
    ? BASE_SYSTEM_PROFILES[row.primary_material_or_system]
    : EXPANDED_PROFILES[row.source_domain_id.slice("expanded:".length) as HvacExpandedOwnedFamily];
  const operationLabel = OPERATION_LABELS_RU[row.operation_class];
  if (!seed || !operationLabel) {
    throw new Error(`HVAC_TECHNOLOGY_PROFILE_MISSING:${row.catalog_id}:${row.operation_class}:${row.primary_material_or_system}`);
  }
  return { ...seed, operation_label_ru: operationLabel };
}

export function hvacQuantityParameter(profileData: HvacTechnologyProfile): {
  parameter_id: string;
  label_ru: string;
  unit_id: string;
} {
  if (profileData.output_mode === "ROUTE_LENGTH") {
    return { parameter_id: "route_length_m", label_ru: "Проектная длина трассы", unit_id: "m" };
  }
  if (profileData.output_mode === "SURFACE_AREA") {
    return { parameter_id: "surface_area_m2", label_ru: "Проектная площадь изолируемой поверхности", unit_id: "m2" };
  }
  if (profileData.output_mode === "SYSTEM_COUNT") {
    return { parameter_id: "system_count", label_ru: "Количество проектных систем или установок", unit_id: "item" };
  }
  if (profileData.output_mode === "ZONE_AREA") {
    return { parameter_id: "zone_area_m2", label_ru: "Площадь проектных зон", unit_id: "m2" };
  }
  return { parameter_id: "component_count", label_ru: "Количество точных приборов, компонентов или узлов", unit_id: "item" };
}

export function hvacIsRepair(row: HvacDomainInventoryRow): boolean {
  return row.new_repair_demolition_state === "REPAIR" || ["REPAIR", "REPLACE"].includes(row.operation_class);
}
