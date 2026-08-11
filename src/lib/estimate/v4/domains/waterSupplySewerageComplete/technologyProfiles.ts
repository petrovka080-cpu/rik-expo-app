import type {
  WaterSewerDomainInventoryRow,
  WaterSewerExpandedOwnedFamily,
} from "./inventory";

export type WaterSewerTechnologyClass =
  | "FIXTURE_CONNECTION"
  | "INTERNAL_PRESSURE_PIPE"
  | "INTERNAL_GRAVITY_PIPE"
  | "EXTERNAL_PRESSURE_NETWORK"
  | "EXTERNAL_GRAVITY_NETWORK"
  | "VALVE_CHAMBER"
  | "PUMP_EQUIPMENT"
  | "TREATMENT_PROCESS"
  | "WATER_SOURCE_STORAGE"
  | "TESTING_COMMISSIONING";

export type WaterSewerOutputMode = "ROUTE_LENGTH" | "COMPONENT_COUNT" | "PROCESS_UNIT_COUNT";

export type WaterSewerTechnologyProfile = {
  technology_class: WaterSewerTechnologyClass;
  system_label_ru: string;
  operation_label_ru: string;
  system_purpose: "POTABLE_WATER" | "TECHNICAL_WATER" | "DOMESTIC_SEWER" | "STORMWATER" | "WASTEWATER_TREATMENT";
  pressure_mode: "PRESSURE" | "GRAVITY" | "ATMOSPHERIC_PROCESS" | "MIXED_PROJECT_DEFINED";
  fluid_type: "POTABLE_WATER" | "TECHNICAL_WATER" | "DOMESTIC_WASTEWATER" | "STORMWATER" | "SLUDGE" | "PROJECT_DEFINED";
  network_location: "INTERNAL" | "EXTERNAL" | "FACILITY";
  output_mode: WaterSewerOutputMode;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  forbidden_stages: readonly string[];
};

type ProfileSeed = Omit<WaterSewerTechnologyProfile, "operation_label_ru">;

const profile = (
  technology_class: WaterSewerTechnologyClass,
  system_label_ru: string,
  system_purpose: WaterSewerTechnologyProfile["system_purpose"],
  pressure_mode: WaterSewerTechnologyProfile["pressure_mode"],
  fluid_type: WaterSewerTechnologyProfile["fluid_type"],
  network_location: WaterSewerTechnologyProfile["network_location"],
  output_mode: WaterSewerOutputMode,
  required_stages: readonly string[],
  optional_stages: readonly string[],
  forbidden_stages: readonly string[],
): ProfileSeed => ({
  technology_class,
  system_label_ru,
  system_purpose,
  pressure_mode,
  fluid_type,
  network_location,
  output_mode,
  required_stages,
  optional_stages,
  forbidden_stages,
});

const INTERNAL_PRESSURE_STAGES = [
  "ROUTE_AND_SYSTEM_ACCEPTANCE",
  "SUPPORTS_AND_PENETRATIONS",
  "PIPE_OR_COMPONENT_INSTALLATION",
  "EXACT_JOINTS_AND_FITTINGS",
  "PRESSURE_TEST_FLUSHING_ACCEPTANCE",
] as const;
const INTERNAL_GRAVITY_STAGES = [
  "ROUTE_ELEVATION_AND_SLOPE_ACCEPTANCE",
  "SUPPORTS_AND_PENETRATIONS",
  "PIPE_FITTING_AND_REVISION_INSTALLATION",
  "SLOPE_LEAK_AND_FLOW_TEST",
] as const;
const EXTERNAL_PRESSURE_STAGES = [
  "SURVEY_AND_EXISTING_UTILITY_CONTROL",
  "TRENCH_SHORING_AND_DEWATERING_DECISION",
  "BEDDING_AND_PIPE_INSTALLATION",
  "JOINTS_VALVES_THRUST_AND_CHAMBERS",
  "PRESSURE_TEST_FLUSHING_DISINFECTION",
  "BACKFILL_COMPACTION_AND_SURFACE_RESTORATION",
] as const;
const EXTERNAL_GRAVITY_STAGES = [
  "SURVEY_LEVELS_AND_SLOPE_CONTROL",
  "TRENCH_SHORING_AND_DEWATERING_DECISION",
  "BEDDING_PIPE_AND_MANHOLE_INSTALLATION",
  "FITTINGS_CONNECTIONS_AND_SEALS",
  "LEAK_SLOPE_FLOW_AND_CCTV_CONTROL",
  "BACKFILL_COMPACTION_AND_SURFACE_RESTORATION",
] as const;
const EQUIPMENT_STAGES = [
  "EQUIPMENT_PACKAGE_ACCEPTANCE",
  "BASE_FRAME_AND_VIBRATION_ISOLATION",
  "LIFTING_AND_INSTALLATION",
  "EXACT_PIPING_VALVES_AND_DRAINAGE",
  "ELECTRICAL_AUTOMATION_BOUNDARY",
  "TESTING_AND_COMMISSIONING",
] as const;
const TREATMENT_STAGES = [
  "PROCESS_DESIGN_AND_PACKAGE_ACCEPTANCE",
  "PROCESS_UNITS_AND_INTERNAL_PIPING",
  "VALVES_INSTRUMENTS_AND_AUXILIARIES",
  "REAGENT_OR_MEDIA_LOADING",
  "ELECTRICAL_AUTOMATION_BOUNDARY",
  "HYDRAULIC_TESTING_COMMISSIONING_AND_SAMPLING",
] as const;

const BASE_SYSTEM_PROFILES: Readonly<Record<string, ProfileSeed>> = Object.freeze({
  BATH: profile("FIXTURE_CONNECTION", "ванны и её точных подключений", "POTABLE_WATER", "MIXED_PROJECT_DEFINED", "POTABLE_WATER", "INTERNAL", "COMPONENT_COUNT", INTERNAL_PRESSURE_STAGES, ["SANITARY_FIXTURE_SEALING"], ["TRENCH_EXCAVATION"]),
  MIXER: profile("FIXTURE_CONNECTION", "смесителя и его точных подключений", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "COMPONENT_COUNT", INTERNAL_PRESSURE_STAGES, ["FLEXIBLE_OR_RIGID_CONNECTORS"], ["TRENCH_EXCAVATION"]),
  SHOWER: profile("FIXTURE_CONNECTION", "душевого прибора и его точных подключений", "POTABLE_WATER", "MIXED_PROJECT_DEFINED", "POTABLE_WATER", "INTERNAL", "COMPONENT_COUNT", INTERNAL_PRESSURE_STAGES, ["TRAP_AND_WATERPROOF_COLLAR"], ["TRENCH_EXCAVATION"]),
  SINK: profile("FIXTURE_CONNECTION", "мойки и её точных подключений", "POTABLE_WATER", "MIXED_PROJECT_DEFINED", "POTABLE_WATER", "INTERNAL", "COMPONENT_COUNT", INTERNAL_PRESSURE_STAGES, ["TRAP_AND_CONNECTORS"], ["TRENCH_EXCAVATION"]),
  TOILET: profile("FIXTURE_CONNECTION", "унитаза и его точных подключений", "DOMESTIC_SEWER", "GRAVITY", "DOMESTIC_WASTEWATER", "INTERNAL", "COMPONENT_COUNT", INTERNAL_GRAVITY_STAGES, ["FLUSHING_CONNECTION"], ["PRESSURE_PIPE_DISINFECTION", "TRENCH_EXCAVATION"]),
  SEWER: profile("INTERNAL_GRAVITY_PIPE", "внутренней канализационной сети", "DOMESTIC_SEWER", "GRAVITY", "DOMESTIC_WASTEWATER", "INTERNAL", "ROUTE_LENGTH", INTERNAL_GRAVITY_STAGES, ["ACOUSTIC_INSULATION", "FIRESTOPPING"], ["PRESSURE_PIPE_DISINFECTION", "TRENCH_EXCAVATION"]),
  PPR_PIPE: profile("INTERNAL_PRESSURE_PIPE", "внутреннего полипропиленового водопровода", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "ROUTE_LENGTH", INTERNAL_PRESSURE_STAGES, ["THERMAL_INSULATION", "FIRESTOPPING"], ["TRENCH_EXCAVATION", "STEEL_WELDING"]),
  PND_PIPE: profile("INTERNAL_PRESSURE_PIPE", "водопровода из полиэтиленовых труб", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "ROUTE_LENGTH", INTERNAL_PRESSURE_STAGES, ["THERMAL_INSULATION", "FIRESTOPPING"], ["TRENCH_EXCAVATION", "STEEL_WELDING"]),
  WATER_PIPE: profile("INTERNAL_PRESSURE_PIPE", "внутреннего водопровода", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "ROUTE_LENGTH", INTERNAL_PRESSURE_STAGES, ["THERMAL_INSULATION", "FIRESTOPPING"], ["TRENCH_EXCAVATION"]),
  RISER: profile("INTERNAL_PRESSURE_PIPE", "стояка водоснабжения", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "ROUTE_LENGTH", INTERNAL_PRESSURE_STAGES, ["FIRESTOPPING", "THERMAL_INSULATION"], ["TRENCH_EXCAVATION"]),
  COLLECTOR: profile("INTERNAL_PRESSURE_PIPE", "коллекторного узла водоснабжения", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "COMPONENT_COUNT", INTERNAL_PRESSURE_STAGES, ["CABINET_AND_LABELING"], ["TRENCH_EXCAVATION"]),
  BOILER: profile("PUMP_EQUIPMENT", "водонагревательного оборудования", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "COMPONENT_COUNT", EQUIPMENT_STAGES, ["SAFETY_GROUP", "THERMAL_INSULATION"], ["TRENCH_EXCAVATION"]),
  FILTER: profile("PUMP_EQUIPMENT", "фильтра водоснабжения", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "COMPONENT_COUNT", EQUIPMENT_STAGES, ["BYPASS_AND_DRAIN"], ["TRENCH_EXCAVATION"]),
  METER: profile("PUMP_EQUIPMENT", "водомерного узла", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "INTERNAL", "COMPONENT_COUNT", EQUIPMENT_STAGES, ["BYPASS_AND_SEALING"], ["TRENCH_EXCAVATION"]),
  PUMP: profile("PUMP_EQUIPMENT", "насосного оборудования", "TECHNICAL_WATER", "PRESSURE", "PROJECT_DEFINED", "INTERNAL", "COMPONENT_COUNT", EQUIPMENT_STAGES, ["VIBRATION_ISOLATION", "DRAINAGE"], ["TRENCH_EXCAVATION"]),
  INSTALLATION: profile("PUMP_EQUIPMENT", "комплектной водопроводной установки", "TECHNICAL_WATER", "MIXED_PROJECT_DEFINED", "PROJECT_DEFINED", "INTERNAL", "COMPONENT_COUNT", EQUIPMENT_STAGES, ["MANUFACTURER_PACKAGE"], ["TRENCH_EXCAVATION"]),
});

const EXPANDED_PROFILES: Readonly<Record<WaterSewerExpandedOwnedFamily, ProfileSeed>> = Object.freeze({
  aeration_tanks: profile("TREATMENT_PROCESS", "аэротенков", "WASTEWATER_TREATMENT", "ATMOSPHERIC_PROCESS", "DOMESTIC_WASTEWATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["AERATION_EQUIPMENT"], ["POTABLE_DISINFECTION"]),
  booster_pumping_station: profile("PUMP_EQUIPMENT", "повысительной насосной станции", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", EQUIPMENT_STAGES, ["PRESSURE_VESSELS"], ["WASTEWATER_HANDLING"]),
  borehole_water_supply: profile("WATER_SOURCE_STORAGE", "скважинного водозабора", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", EQUIPMENT_STAGES, ["WELL_HEAD_AND_RAW_WATER_PIPE"], ["WASTEWATER_HANDLING"]),
  chlorination_station: profile("TREATMENT_PROCESS", "станции обеззараживания", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["REAGENT_STORAGE_AND_DOSING"], ["WASTEWATER_HANDLING"]),
  distribution_pipeline: profile("EXTERNAL_PRESSURE_NETWORK", "распределительного водопровода", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_PRESSURE_STAGES, ["CONNECTION_NODES"], ["WASTEWATER_HANDLING"]),
  filtration_station: profile("TREATMENT_PROCESS", "фильтровальной станции", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["FILTER_MEDIA_AND_BACKWASH"], ["WASTEWATER_HANDLING"]),
  flushing_disinfection: profile("TESTING_COMMISSIONING", "промывки и дезинфекции", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "ROUTE_LENGTH", ["SECTION_ISOLATION", "FLUSHING", "DISINFECTION", "SAMPLING_AND_ACCEPTANCE"], ["TEMPORARY_WATER_SUPPLY"], ["WASTEWATER_PROCESS_ROWS"]),
  gravity_sewer_collector: profile("EXTERNAL_GRAVITY_NETWORK", "самотечного канализационного коллектора", "DOMESTIC_SEWER", "GRAVITY", "DOMESTIC_WASTEWATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_GRAVITY_STAGES, ["DROP_MANHOLES"], ["PRESSURE_PIPE_DISINFECTION"]),
  house_connection_water: profile("EXTERNAL_PRESSURE_NETWORK", "водопроводного ввода", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_PRESSURE_STAGES, ["BUILDING_PENETRATION_AND_METER"], ["WASTEWATER_HANDLING"]),
  inspection_chambers: profile("VALVE_CHAMBER", "смотровых камер", "DOMESTIC_SEWER", "GRAVITY", "DOMESTIC_WASTEWATER", "EXTERNAL", "COMPONENT_COUNT", EXTERNAL_GRAVITY_STAGES, ["BENCHING_AND_CHANNEL"], ["PRESSURE_PIPE_DISINFECTION"]),
  inspection_wells: profile("VALVE_CHAMBER", "смотровых колодцев", "DOMESTIC_SEWER", "GRAVITY", "DOMESTIC_WASTEWATER", "EXTERNAL", "COMPONENT_COUNT", EXTERNAL_GRAVITY_STAGES, ["BENCHING_AND_CHANNEL"], ["PRESSURE_PIPE_DISINFECTION"]),
  manholes: profile("VALVE_CHAMBER", "канализационных колодцев", "DOMESTIC_SEWER", "GRAVITY", "DOMESTIC_WASTEWATER", "EXTERNAL", "COMPONENT_COUNT", EXTERNAL_GRAVITY_STAGES, ["LOAD_CLASS_HATCH"], ["PRESSURE_PIPE_DISINFECTION"]),
  outfall_structure: profile("EXTERNAL_GRAVITY_NETWORK", "выпускного сооружения", "STORMWATER", "GRAVITY", "STORMWATER", "EXTERNAL", "COMPONENT_COUNT", EXTERNAL_GRAVITY_STAGES, ["EROSION_PROTECTION"], ["POTABLE_DISINFECTION"]),
  pressure_pipeline: profile("EXTERNAL_PRESSURE_NETWORK", "наружного напорного водопровода", "TECHNICAL_WATER", "PRESSURE", "PROJECT_DEFINED", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_PRESSURE_STAGES, ["THRUST_BLOCKS"], ["WASTEWATER_HANDLING"]),
  pressure_sewer_pipeline: profile("EXTERNAL_PRESSURE_NETWORK", "напорного канализационного трубопровода", "DOMESTIC_SEWER", "PRESSURE", "DOMESTIC_WASTEWATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_PRESSURE_STAGES, ["AIR_AND_WASHOUT_VALVES"], ["POTABLE_DISINFECTION"]),
  pressure_testing_disinfection: profile("TESTING_COMMISSIONING", "испытания и дезинфекции напорной сети", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "ROUTE_LENGTH", ["SECTION_ISOLATION", "PRESSURE_TEST", "FLUSHING_AND_DISINFECTION", "SAMPLING_AND_ACCEPTANCE"], ["TEMPORARY_WATER_SUPPLY"], ["WASTEWATER_PROCESS_ROWS"]),
  pumping_station: profile("PUMP_EQUIPMENT", "насосной станции", "TECHNICAL_WATER", "PRESSURE", "PROJECT_DEFINED", "FACILITY", "PROCESS_UNIT_COUNT", EQUIPMENT_STAGES, ["SUCTION_AND_DISCHARGE_HEADERS"], []),
  rainwater_inlets: profile("VALVE_CHAMBER", "дождеприёмников", "STORMWATER", "GRAVITY", "STORMWATER", "EXTERNAL", "COMPONENT_COUNT", EXTERNAL_GRAVITY_STAGES, ["GRATING_AND_SILT_BUCKET"], ["POTABLE_DISINFECTION"]),
  reservoir_clean_water: profile("WATER_SOURCE_STORAGE", "резервуара чистой воды", "POTABLE_WATER", "ATMOSPHERIC_PROCESS", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["WATERPROOFING_AND_LEVEL_INSTRUMENTS"], ["WASTEWATER_HANDLING"]),
  septic_treatment_facility: profile("TREATMENT_PROCESS", "септической установки", "WASTEWATER_TREATMENT", "GRAVITY", "DOMESTIC_WASTEWATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["INFILTRATION_OR_EFFLUENT_OUTLET"], ["POTABLE_DISINFECTION"]),
  settlement_water_network: profile("EXTERNAL_PRESSURE_NETWORK", "сети водоснабжения населённого пункта", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_PRESSURE_STAGES, ["DISTRICT_VALVES_AND_CONNECTIONS"], ["WASTEWATER_HANDLING"]),
  sewage_treatment_tanks: profile("TREATMENT_PROCESS", "ёмкостей очистки сточных вод", "WASTEWATER_TREATMENT", "ATMOSPHERIC_PROCESS", "DOMESTIC_WASTEWATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["INTERNAL_CHANNELS_AND_BAFFLES"], ["POTABLE_DISINFECTION"]),
  sewer_pumping_station: profile("PUMP_EQUIPMENT", "канализационной насосной станции", "DOMESTIC_SEWER", "PRESSURE", "DOMESTIC_WASTEWATER", "FACILITY", "PROCESS_UNIT_COUNT", EQUIPMENT_STAGES, ["WET_WELL_AND_GUIDE_RAILS"], ["POTABLE_DISINFECTION"]),
  site_sewer_connection: profile("EXTERNAL_GRAVITY_NETWORK", "подключения площадки к канализации", "DOMESTIC_SEWER", "GRAVITY", "DOMESTIC_WASTEWATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_GRAVITY_STAGES, ["EXISTING_NETWORK_CONNECTION"], ["POTABLE_DISINFECTION"]),
  site_water_connection: profile("EXTERNAL_PRESSURE_NETWORK", "подключения площадки к водопроводу", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_PRESSURE_STAGES, ["EXISTING_NETWORK_CONNECTION"], ["WASTEWATER_HANDLING"]),
  sludge_dewatering: profile("TREATMENT_PROCESS", "обезвоживания осадка", "WASTEWATER_TREATMENT", "ATMOSPHERIC_PROCESS", "SLUDGE", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["POLYMER_DOSING_AND_CAKE_HANDLING"], ["POTABLE_DISINFECTION"]),
  stormwater_drainage: profile("EXTERNAL_GRAVITY_NETWORK", "ливневой канализационной сети", "STORMWATER", "GRAVITY", "STORMWATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_GRAVITY_STAGES, ["RAINWATER_INLETS_AND_OUTFALL"], ["POTABLE_DISINFECTION"]),
  valves_chambers: profile("VALVE_CHAMBER", "камер водопроводной арматуры", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "COMPONENT_COUNT", EXTERNAL_PRESSURE_STAGES, ["VALVE_SUPPORTS_AND_DRAINAGE"], ["WASTEWATER_HANDLING"]),
  village_sewer_network: profile("EXTERNAL_GRAVITY_NETWORK", "канализационной сети населённого пункта", "DOMESTIC_SEWER", "GRAVITY", "DOMESTIC_WASTEWATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_GRAVITY_STAGES, ["HOUSE_CONNECTIONS"], ["POTABLE_DISINFECTION"]),
  village_water_supply: profile("EXTERNAL_PRESSURE_NETWORK", "водоснабжения населённого пункта", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "ROUTE_LENGTH", EXTERNAL_PRESSURE_STAGES, ["HOUSE_CONNECTIONS"], ["WASTEWATER_HANDLING"]),
  wastewater_treatment_plant: profile("TREATMENT_PROCESS", "очистных сооружений сточных вод", "WASTEWATER_TREATMENT", "MIXED_PROJECT_DEFINED", "DOMESTIC_WASTEWATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["SLUDGE_AND_EFFLUENT_LINES"], ["POTABLE_DISINFECTION"]),
  water_intake: profile("WATER_SOURCE_STORAGE", "водозаборного сооружения", "POTABLE_WATER", "MIXED_PROJECT_DEFINED", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", EQUIPMENT_STAGES, ["SCREENING_AND_RAW_WATER_PUMPS"], ["WASTEWATER_HANDLING"]),
  water_meter_chambers: profile("VALVE_CHAMBER", "камер водомерных узлов", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "EXTERNAL", "COMPONENT_COUNT", EXTERNAL_PRESSURE_STAGES, ["METER_BYPASS_AND_SEALING"], ["WASTEWATER_HANDLING"]),
  water_reservoir: profile("WATER_SOURCE_STORAGE", "резервуара водоснабжения", "POTABLE_WATER", "ATMOSPHERIC_PROCESS", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["WATERPROOFING_AND_OVERFLOW"], ["WASTEWATER_HANDLING"]),
  water_tower: profile("WATER_SOURCE_STORAGE", "водонапорной башни", "POTABLE_WATER", "ATMOSPHERIC_PROCESS", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", EQUIPMENT_STAGES, ["RISER_OVERFLOW_AND_LEVEL_CONTROL"], ["WASTEWATER_HANDLING"]),
  water_treatment_plant: profile("TREATMENT_PROCESS", "комплекса водоподготовки", "POTABLE_WATER", "MIXED_PROJECT_DEFINED", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", TREATMENT_STAGES, ["FILTER_MEDIA_REAGENTS_AND_BACKWASH"], ["WASTEWATER_HANDLING"]),
  well_construction: profile("WATER_SOURCE_STORAGE", "водозаборной скважины", "POTABLE_WATER", "PRESSURE", "POTABLE_WATER", "FACILITY", "PROCESS_UNIT_COUNT", EQUIPMENT_STAGES, ["CASING_FILTER_GRAVEL_PACK_AND_WELLHEAD"], ["WASTEWATER_HANDLING"]),
});

const OPERATION_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  CONNECT: "Подключение",
  INSTALL: "Монтаж",
  PREPARE: "Подготовка",
  PRESSURE_TEST: "Испытание",
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

export function waterSewerTechnologyProfile(row: WaterSewerDomainInventoryRow): WaterSewerTechnologyProfile {
  const seed = row.source_domain_id === "plumbing"
    ? BASE_SYSTEM_PROFILES[row.primary_material_or_system]
    : EXPANDED_PROFILES[row.source_domain_id.slice("expanded:".length) as WaterSewerExpandedOwnedFamily];
  const operationLabel = OPERATION_LABELS_RU[row.operation_class];
  if (!seed || !operationLabel) {
    throw new Error(`WATER_SEWER_TECHNOLOGY_PROFILE_MISSING:${row.catalog_id}:${row.operation_class}:${row.primary_material_or_system}`);
  }
  if (row.operation_class === "PRESSURE_TEST") {
    return {
      ...seed,
      technology_class: "TESTING_COMMISSIONING",
      operation_label_ru: operationLabel,
      required_stages: ["SECTION_ISOLATION", "TEST_MEDIUM_FILLING", "PRESSURE_OR_LEAK_TEST", "DRAINING_AND_ACCEPTANCE"],
    };
  }
  return { ...seed, operation_label_ru: operationLabel };
}

export function waterSewerQuantityParameter(profileData: WaterSewerTechnologyProfile): {
  parameter_id: string;
  label_ru: string;
  unit_id: string;
} {
  if (profileData.output_mode === "ROUTE_LENGTH") {
    return { parameter_id: "route_length_m", label_ru: "Проектная длина трассы", unit_id: "m" };
  }
  if (profileData.output_mode === "COMPONENT_COUNT") {
    return { parameter_id: "component_count", label_ru: "Количество точных компонентов или узлов по проекту", unit_id: "item" };
  }
  return { parameter_id: "process_unit_count", label_ru: "Количество технологических линий, сооружений или установок по проекту", unit_id: "item" };
}

export function waterSewerIsRepair(row: WaterSewerDomainInventoryRow): boolean {
  return row.new_repair_demolition_state === "REPAIR" || ["REPAIR", "REPLACE"].includes(row.operation_class);
}
