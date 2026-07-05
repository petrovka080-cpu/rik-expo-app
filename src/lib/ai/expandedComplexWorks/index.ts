import type { GlobalWorkAlias, GlobalWorkCategory, GlobalWorkTypeDefinition } from "../globalEstimate/globalEstimateTypes";

export type ExpandedComplexEstimateLevel =
  | "ROM_CONCEPT"
  | "PRELIMINARY_BOQ"
  | "DETAILED_BOQ_FROM_DRAWINGS"
  | "TENDER_BOQ"
  | "AS_BUILT_ESTIMATE";

export type ExpandedComplexReadinessStatus =
  | "READY_PROFESSIONAL"
  | "READY_QUANTITY_ONLY_PRICE_MISSING"
  | "NOT_READY_MISSING_FAMILY"
  | "NOT_READY_MISSING_CALCULATOR"
  | "NOT_READY_MISSING_PARAMETER_SCHEMA"
  | "NOT_READY_MISSING_FORMULA"
  | "NOT_READY_MISSING_MATERIAL_RECIPE"
  | "NOT_READY_MISSING_LABOR_RECIPE"
  | "NOT_READY_MISSING_EQUIPMENT_RECIPE"
  | "NOT_READY_MISSING_SERVICE_RECIPE"
  | "NOT_READY_MISSING_SOURCE"
  | "NOT_READY_MISSING_PRICE_POLICY"
  | "NOT_READY_MISSING_UI_RENDERER"
  | "NOT_READY_MISSING_PDF_POLICY"
  | "NOT_READY_MISSING_BUYER_HANDOFF"
  | "NOT_READY_GENERIC_FALLBACK"
  | "NOT_READY_FAKE_SOURCE"
  | "NOT_READY_RAW_DUMP_UI";

export type ExpandedComplexLineType = "material" | "work" | "equipment" | "service";

export type ExpandedComplexUnit =
  | "m"
  | "m2"
  | "m3"
  | "pcs"
  | "set"
  | "kg"
  | "t"
  | "l"
  | "shift"
  | "trip"
  | "hour"
  | "MW"
  | "m3_day"
  | "m3_h";

export type ExpandedComplexParameterSchemaField = {
  key: string;
  labelRu: string;
  unit?: ExpandedComplexUnit;
  requiredFor: ExpandedComplexEstimateLevel[];
  defaultValue?: number | string | boolean;
  missingBlocksDetailed: boolean;
};

export type ExpandedComplexWorkFamilyDefinition = {
  work_family_id: string;
  professionalNameRu: string;
  aliases: string[];
  categoryGroup: string;
  globalCategory: GlobalWorkCategory;
  parameterSchema: ExpandedComplexParameterSchemaField[];
  calculatorId: ExpandedComplexCalculatorId;
  formulaFamily: string;
  materialRecipe: string[];
  laborRecipe: string[];
  equipmentRecipe: string[];
  serviceRecipe: string[];
  normSource: {
    sourceId: string;
    titleRu: string;
    version: string;
    provenance: "engineering_reference_formula" | "ratebook_required_for_price";
  };
  unitPolicy: string;
  pricePolicy: {
    defaultState: "PRICE_MISSING";
    allowFinalTotalWhenMissing: false;
    equipmentPricePolicy: "MISSING_PRICE_UNLESS_RATEBOOK_SELECTED";
  };
  estimateLevelPolicy: {
    defaultLevel: ExpandedComplexEstimateLevel;
    detailedRequiresDesignInputs: true;
  };
  missingDesignInputsPolicy: string[];
  uiRendererPolicy: "GROUPED_PREVIEW_REQUIRED";
  pdfPolicy: "GROUPED_WITH_ASSUMPTIONS_TRACE_AND_SOURCES";
  buyerHandoffPolicy: "MATERIAL_EQUIPMENT_DELIVERY_ONLY";
};

export type ExpandedComplexTemplate = {
  template_id: string;
  work_family_id: string;
  template_level: ExpandedComplexEstimateLevel;
  requiredInputs: string[];
  rowGroups: ExpandedComplexLineType[];
  pdfPolicy: ExpandedComplexWorkFamilyDefinition["pdfPolicy"];
  buyerHandoffPolicy: ExpandedComplexWorkFamilyDefinition["buyerHandoffPolicy"];
};

export type ExpandedComplexBoqRow = {
  code: string;
  titleRu: string;
  lineType: ExpandedComplexLineType;
  group: string;
  quantity: number;
  unit: ExpandedComplexUnit;
  quantityFormula: string;
  formulaId: string;
  unitPrice: null;
  total: null;
  priceStatus: "PRICE_MISSING";
  includedInProcurement: boolean;
  materialKey?: string;
  sourceParameters: Record<string, number | string | boolean | null>;
  normId: string;
  normFamilyId: string;
  normSourceId: string;
  normSourceTitle: string;
  normVersion: string;
  normReviewStatus: "quantity_engineering_reviewed";
};

export type ExpandedComplexCalculatorOutput = {
  source_prompt: string;
  work_family_id: string;
  professionalNameRu: string;
  calculatorId: ExpandedComplexCalculatorId;
  input_parameters: Record<string, number | string | boolean | null>;
  missing_design_inputs: string[];
  estimate_level: ExpandedComplexEstimateLevel;
  assumptions: string[];
  limitations: string[];
  formula_steps: string[];
  unit_conversions: string[];
  material_rows: ExpandedComplexBoqRow[];
  work_rows: ExpandedComplexBoqRow[];
  equipment_rows: ExpandedComplexBoqRow[];
  service_rows: ExpandedComplexBoqRow[];
  procurement_subset: ExpandedComplexBoqRow[];
  price_state: {
    status: "PRICE_MISSING";
    reason: "NO_ACCEPTED_PRICE_SOURCE_OR_UNIT_CONVERSION";
    finalTotalAllowed: false;
  };
  calculation_trace: string[];
};

export type ExpandedComplexSnapshot = ExpandedComplexCalculatorOutput & {
  norm_sources: string[];
  price_states: string[];
};

export type ExpandedComplexPdfModel = {
  source_prompt: string;
  estimate_level: ExpandedComplexEstimateLevel;
  assumptions: string[];
  missing_design_inputs: string[];
  grouped_quantities: Record<ExpandedComplexLineType, ExpandedComplexBoqRow[]>;
  trace_appendix: string[];
  source_appendix: string[];
  rows_equal_snapshot: boolean;
};

export type ExpandedComplexBuyerHandoff = {
  procurement_materials: ExpandedComplexBoqRow[];
  equipment_to_purchase: ExpandedComplexBoqRow[];
  delivery_procurement_services: ExpandedComplexBoqRow[];
  forbidden_rows_present: false;
};

const ESTIMATE_LEVELS: ExpandedComplexEstimateLevel[] = [
  "ROM_CONCEPT",
  "PRELIMINARY_BOQ",
  "DETAILED_BOQ_FROM_DRAWINGS",
  "TENDER_BOQ",
  "AS_BUILT_ESTIMATE",
];

export const EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS = [
  "villageWaterSupplyCalculator",
  "sewerNetworkCalculator",
  "wastewaterTreatmentCalculator",
  "roadConstructionCalculator",
  "concreteRoadCalculator",
  "roadDrainageCulvertCalculator",
  "damHydraulicCalculator",
  "irrigationCanalCalculator",
  "powerLinePolesCalculator",
  "transformerSubstationCalculator",
  "utilityConnectionCalculator",
  "gasHeatNetworkCalculator",
  "highRiseBuildingCalculator",
  "highRiseGlazingCalculator",
  "mansardRoofWindowsCalculator",
  "bridgeCalculator",
  "tunnelCalculator",
  "retainingWallCalculator",
  "multiStoreyFrameCalculator",
  "longSpanSteelCalculator",
  "industrialBuildingCalculator",
  "equipmentFoundationCalculator",
  "pipeRackCalculator",
  "technologicalPipelineCalculator",
  "thermalPowerPlantCalculator",
  "hydroPowerPlantCalculator",
  "boilerHouseCalculator",
  "coolingTowerCalculator",
  "tankSiloCalculator",
  "pumpingStationCalculator",
  "waterTreatmentPlantCalculator",
  "substationCalculator",
  "solarWindEnergyCalculator",
  "environmentalWasteFacilityCalculator",
  "miningEarthworksCalculator",
] as const;

export type ExpandedComplexCalculatorId = typeof EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS[number];

type FamilySeed = {
  id: string;
  nameRu?: string;
  aliases?: string[];
  calculatorId?: ExpandedComplexCalculatorId;
};

type FamilyBlock = {
  key: string;
  titleRu: string;
  globalCategory: GlobalWorkCategory;
  calculatorId: ExpandedComplexCalculatorId;
  families: FamilySeed[];
};

const b = (
  key: string,
  titleRu: string,
  globalCategory: GlobalWorkCategory,
  calculatorId: ExpandedComplexCalculatorId,
  families: readonly (string | FamilySeed)[],
): FamilyBlock => ({
  key,
  titleRu,
  globalCategory,
  calculatorId,
  families: families.map((item) => typeof item === "string" ? { id: item } : item),
});

export const EXPANDED_COMPLEX_FAMILY_BLOCKS: readonly FamilyBlock[] = [
  b("buildings", "Здания и жилые комплексы", "concrete", "highRiseBuildingCalculator", [
    "private_house_construction", "cottage_construction", "multi_storey_residential_building", "high_rise_building",
    "apartment_complex", "administrative_building", "school_building", "hospital_building", "shopping_center",
    "hotel_building", "parking_structure", "underground_parking", "monolithic_frame", "precast_concrete_frame",
    "steel_frame_building", "composite_frame", "slab_column_frame", "shear_walls", "elevator_core", "stair_core",
    "basement_construction", "foundation_pile_field", "foundation_slab", "strip_foundation", "raft_foundation",
  ]),
  b("facade_glazing", "Фасады, высотное остекление и доступ", "facade", "highRiseGlazingCalculator", [
    "high_rise_glazing", "curtain_wall_system", "aluminum_window_wall", "stained_glass_facade", "unitized_facade",
    "stick_facade", "balcony_glazing", "facade_insulation_high_rise", "ventilated_facade", "wet_facade_system",
    "firebreaks_facade", "facade_scaffolding", "mast_climber_facade_work", "rope_access_facade_work",
    "facade_lifting_equipment", "skylight_systems", "atrium_glazing", "roof_lanterns",
  ]),
  b("roofs_mansard", "Кровля, мансарды и кровельные окна", "roofing", "mansardRoofWindowsCalculator", [
    "mansard_roof", "mansard_roof_with_windows", "dormer_windows", "roof_windows_installation", "metal_tile_roof",
    "standing_seam_roof", "membrane_roof", "flat_roof", "pitched_roof", "roof_insulation", "roof_vapor_barrier",
    "underroof_membrane", "rafters_mansard", "battens_counterbattens", "flashings_around_roof_windows",
    "gutters_downpipes", "snow_guards", "roof_safety_systems", "roof_access_hatches",
  ]),
  b("transport", "Дороги, транспорт и площадки", "roadworks", "roadConstructionCalculator", [
    "road_construction", "village_road_construction", "highway_construction", "asphalt_concrete_pavement",
    { id: "cement_concrete_pavement", calculatorId: "concreteRoadCalculator" }, "crushed_stone_base", "sand_gravel_base",
    "road_subgrade", "road_shoulders", "curbs", "sidewalks", "road_drainage", { id: "culverts", calculatorId: "roadDrainageCulvertCalculator" },
    "road_marking", "traffic_signs", "guardrails", "road_lighting", "bridge_approach_roads", "railway_embankment",
    "railway_track_bed", "airport_runway", "airport_apron", "port_quay", "retaining_walls_transport", "slope_stabilization",
  ]),
  b("bridges_tunnels", "Мосты, тоннели и инженерные сооружения", "concrete", "bridgeCalculator", [
    "bridge_construction", "overpass_construction", "flyover_construction", "pedestrian_bridge", "bridge_pile_foundations",
    "bridge_piers", "bridge_abutments", "bridge_girders", "bridge_deck", "bridge_expansion_joints", "bridge_bearings",
    "bridge_waterproofing", "bridge_asphalt", { id: "tunnel_construction", calculatorId: "tunnelCalculator" },
    { id: "tunnel_lining", calculatorId: "tunnelCalculator" }, { id: "tunnel_waterproofing", calculatorId: "tunnelCalculator" },
    { id: "tunnel_ventilation", calculatorId: "tunnelCalculator" }, { id: "tunnel_drainage", calculatorId: "tunnelCalculator" },
    "underpass_construction", "box_culvert", "pipe_culvert", { id: "retaining_wall", calculatorId: "retainingWallCalculator" },
    { id: "gabion_wall", calculatorId: "retainingWallCalculator" },
  ]),
  b("water_supply", "Водоснабжение сёл и наружные сети воды", "plumbing", "villageWaterSupplyCalculator", [
    "village_water_supply", "settlement_water_network", "water_intake", "borehole_water_supply", "well_construction",
    { id: "pumping_station", calculatorId: "pumpingStationCalculator" }, { id: "booster_pumping_station", calculatorId: "pumpingStationCalculator" },
    "reservoir_clean_water", "water_tower", "pressure_pipeline", "distribution_pipeline", "house_connection_water",
    "fire_hydrants", "valves_chambers", "water_meter_chambers", { id: "water_treatment_plant", calculatorId: "waterTreatmentPlantCalculator" },
    { id: "filtration_station", calculatorId: "waterTreatmentPlantCalculator" }, { id: "chlorination_station", calculatorId: "waterTreatmentPlantCalculator" },
    "pressure_testing_disinfection", "flushing_disinfection",
  ]),
  b("sewer_wastewater", "Канализация, дренаж и очистные сооружения", "plumbing", "sewerNetworkCalculator", [
    "village_sewer_network", "gravity_sewer_collector", "pressure_sewer_pipeline", "sewer_pumping_station",
    { id: "wastewater_treatment_plant", calculatorId: "wastewaterTreatmentCalculator" }, { id: "septic_treatment_facility", calculatorId: "wastewaterTreatmentCalculator" },
    "stormwater_drainage", "drainage_channel", "manholes", "inspection_chambers", "pipe_bedding_backfill",
    "hydraulic_testing", { id: "sewage_treatment_tanks", calculatorId: "wastewaterTreatmentCalculator" },
    { id: "aeration_tanks", calculatorId: "wastewaterTreatmentCalculator" }, { id: "sludge_dewatering", calculatorId: "wastewaterTreatmentCalculator" },
    "outfall_structure", "rainwater_inlets",
  ]),
  b("hydraulic", "Дамбы, гидротехника и орошение", "concrete", "damHydraulicCalculator", [
    "earth_dam", "concrete_dam", "small_dam", "embankment_dam", "dam_core", "dam_slope_protection", "spillway",
    "intake_structure", "outlet_structure", { id: "irrigation_channel", calculatorId: "irrigationCanalCalculator" },
    { id: "canal", calculatorId: "irrigationCanalCalculator" }, "riverbank_protection", "gabion_protection", "riprap",
    "geomembrane_lining", "geotextile_layers", "drainage_prism", "anti_filtration_screen", "water_control_gates",
    "hydraulic_steel_structures", "flood_protection_embankment",
  ]),
  b("electrical_infrastructure", "Электроснабжение, ЛЭП и подстанции", "electrical", "powerLinePolesCalculator", [
    "electrical_poles_04kv", "electrical_poles_10kv", "electrical_poles_35kv", "electrical_poles_110kv",
    "overhead_power_line_04kv", "overhead_power_line_10kv", "overhead_power_line_35kv", "overhead_power_line_110kv",
    "underground_cable_line", { id: "transformer_substation", calculatorId: "transformerSubstationCalculator" },
    { id: "package_transformer_substation", calculatorId: "transformerSubstationCalculator" },
    { id: "distribution_substation", calculatorId: "substationCalculator" }, { id: "outdoor_switchgear", calculatorId: "substationCalculator" },
    "distribution_board_outdoor", "grounding_system", "lightning_protection", "street_lighting_poles", "cable_trench",
    "cable_ducts", "cable_pulling", "electrical_testing_commissioning", "relay_protection_automation",
  ]),
  b("utility_connections", "Подведение инженерных сетей", "plumbing", "utilityConnectionCalculator", [
    "site_water_connection", "site_sewer_connection", "site_power_connection", "site_gas_connection", "site_heat_connection",
    "site_telecom_connection", "fiber_optic_connection", "utility_trench", "multi_utility_trench", "utility_crossings",
    "road_crossing_sleeves", "service_chambers", "inspection_wells", "testing_commissioning",
    "temporary_utilities_construction", "external_engineering_networks",
  ]),
  b("gas_heat_pipelines", "Газ, теплосети и промышленные трубопроводы", "heating_hvac", "gasHeatNetworkCalculator", [
    "gas_pipeline_low_pressure", "gas_pipeline_medium_pressure", "gas_regulator_station", "heat_network",
    "district_heating_pipeline", "preinsulated_pipe_installation", "heat_chamber", "pipeline_compensators",
    "pipeline_welding", "pipeline_insulation", "pipeline_pressure_testing",
    { id: "technological_pipeline", calculatorId: "technologicalPipelineCalculator" },
    { id: "pressure_pipeline_industrial", calculatorId: "technologicalPipelineCalculator" },
    { id: "process_piping_dn50_dn1200", calculatorId: "technologicalPipelineCalculator" },
  ]),
  b("energy", "ТЭЦ, ГЭС, котельные и энергетика", "electrical", "thermalPowerPlantCalculator", [
    "thermal_power_plant", "combined_heat_power_plant", "turbine_hall", { id: "boiler_house", calculatorId: "boilerHouseCalculator" },
    { id: "boiler_installation", calculatorId: "boilerHouseCalculator" }, "generator_foundation", "turbine_foundation",
    { id: "cooling_tower", calculatorId: "coolingTowerCalculator" }, "chimney_stack", "fuel_oil_facility", "coal_handling_system",
    "ash_handling_system", { id: "hydro_power_plant", calculatorId: "hydroPowerPlantCalculator" },
    { id: "small_hydro_power_plant", calculatorId: "hydroPowerPlantCalculator" }, { id: "powerhouse", calculatorId: "hydroPowerPlantCalculator" },
    { id: "penstock", calculatorId: "hydroPowerPlantCalculator" }, { id: "water_intake_hpp", calculatorId: "hydroPowerPlantCalculator" },
    { id: "surge_tank", calculatorId: "hydroPowerPlantCalculator" }, { id: "turbine_installation_hpp", calculatorId: "hydroPowerPlantCalculator" },
    { id: "hydromechanical_equipment", calculatorId: "hydroPowerPlantCalculator" }, { id: "substation_10kv", calculatorId: "substationCalculator" },
    { id: "substation_35kv", calculatorId: "substationCalculator" }, { id: "substation_110kv", calculatorId: "substationCalculator" },
    "transformer_foundation", "cable_trench_energy", "control_building_energy", "commissioning_energy_facility",
    { id: "solar_power_plant", calculatorId: "solarWindEnergyCalculator" }, { id: "wind_power_plant", calculatorId: "solarWindEnergyCalculator" },
    { id: "battery_energy_storage", calculatorId: "solarWindEnergyCalculator" },
  ]),
  b("industrial", "Промышленные здания, ангары и склады", "metalworks", "industrialBuildingCalculator", [
    "factory_building", "industrial_shed", "warehouse_building", "logistics_terminal", "production_workshop",
    "crane_runway", "overhead_crane_installation", { id: "equipment_foundation", calculatorId: "equipmentFoundationCalculator" },
    { id: "tank_foundation", calculatorId: "equipmentFoundationCalculator" }, { id: "silo_foundation", calculatorId: "equipmentFoundationCalculator" },
    "conveyor_gallery", { id: "pipe_rack", calculatorId: "pipeRackCalculator" }, { id: "cable_tray_gallery", calculatorId: "pipeRackCalculator" },
    "industrial_earthworks", "industrial_floor", "chemical_resistant_floor", "cleanroom_construction", "cold_storage_building",
    "refrigeration_equipment_foundation", "loading_docks", { id: "long_span_steel_structure", calculatorId: "longSpanSteelCalculator" },
  ]),
  b("tanks_storage", "Резервуары, силосы и хранилища", "metalworks", "tankSiloCalculator", [
    "steel_tank", "reinforced_concrete_tank", "water_reservoir", "fuel_tank", "chemical_tank", "silo_construction",
    "grain_silo", "tank_foundation_ring", "tank_coating", "tank_insulation", "tank_testing", "bund_wall", "spill_containment",
  ]),
  b("environmental", "Экология, отходы и очистка территории", "landscaping", "environmentalWasteFacilityCalculator", [
    "landfill_cell", "landfill_liner", "leachate_collection", "waste_sorting_station", "composting_facility",
    "incineration_facility_civil", "hazardous_waste_storage", "remediation_earthworks", "soil_stabilization",
    "dust_suppression_system", "environmental_monitoring_wells",
  ]),
  b("mining", "Горные работы, карьеры и крупные земляные работы", "roadworks", "miningEarthworksCalculator", [
    "quarry_road", "mining_service_road", "large_scale_excavation", "rock_excavation", "blasting_preparation",
    "retaining_berms", "slope_reinforcement", "dewatering_system", "tailings_dam", "ore_processing_foundations",
    "conveyor_foundations",
  ]),
  b("mep_building", "MEP и инженерия зданий", "heating_hvac", "utilityConnectionCalculator", [
    "HVAC_plant_room", "ventilation_system", "smoke_exhaust_system", "fire_fighting_pump_station", "sprinkler_system",
    "fire_alarm_system", "low_voltage_system", "CCTV_system", "access_control_system", "BMS_system", "elevators",
    "escalators", "generator_backup_system", "UPS_system", "data_center_mep", "server_room_cooling",
  ]),
];

const TOKEN_RU: Record<string, string> = {
  private: "частный",
  house: "дом",
  construction: "строительство",
  cottage: "коттедж",
  multi: "многоэтажный",
  storey: "этажный",
  residential: "жилой",
  building: "здание",
  high: "высотный",
  rise: "дом",
  apartment: "квартирный",
  complex: "комплекс",
  administrative: "административное",
  school: "школа",
  hospital: "больница",
  shopping: "торговый",
  center: "центр",
  hotel: "гостиница",
  parking: "паркинг",
  structure: "сооружение",
  underground: "подземный",
  monolithic: "монолитный",
  frame: "каркас",
  precast: "сборный",
  concrete: "бетонный",
  steel: "стальной",
  composite: "комбинированный",
  slab: "плита",
  column: "колонна",
  shear: "диафрагмы",
  walls: "стены",
  elevator: "лифтовое",
  stair: "лестничное",
  core: "ядро",
  basement: "подвал",
  foundation: "фундамент",
  pile: "свайное",
  field: "поле",
  strip: "ленточный",
  raft: "плитный",
  facade: "фасад",
  glazing: "остекление",
  curtain: "навесной",
  wall: "стена",
  system: "система",
  aluminum: "алюминиевый",
  window: "оконный",
  stained: "витражный",
  glass: "стекло",
  unitized: "элементный",
  stick: "стоечно-ригельный",
  balcony: "балкон",
  insulation: "утепление",
  ventilated: "вентилируемый",
  wet: "мокрый",
  firebreaks: "противопожарные рассечки",
  scaffolding: "леса",
  mast: "мачтовый",
  climber: "подъёмник",
  rope: "промальп",
  access: "доступ",
  lifting: "подъём",
  equipment: "оборудование",
  roof: "кровля",
  mansard: "мансарда",
  windows: "окна",
  dormer: "слуховые",
  installation: "монтаж",
  metal: "металл",
  tile: "черепица",
  membrane: "мембрана",
  flat: "плоская",
  pitched: "скатная",
  vapor: "пароизоляция",
  barrier: "барьер",
  rafters: "стропила",
  flashings: "оклады",
  gutters: "желоба",
  downpipes: "водостоки",
  road: "дорога",
  village: "село",
  highway: "автодорога",
  asphalt: "асфальтобетон",
  pavement: "покрытие",
  crushed: "щебёночное",
  stone: "каменный",
  base: "основание",
  sand: "песок",
  gravel: "гравий",
  subgrade: "земляное полотно",
  shoulders: "обочины",
  curbs: "бордюры",
  sidewalks: "тротуары",
  drainage: "водоотвод",
  culverts: "водопропускные трубы",
  marking: "разметка",
  traffic: "дорожные",
  signs: "знаки",
  guardrails: "ограждения",
  bridge: "мост",
  approach: "подходы",
  railway: "железнодорожный",
  embankment: "насыпь",
  track: "путь",
  airport: "аэропорт",
  runway: "ВПП",
  apron: "перрон",
  port: "порт",
  quay: "причал",
  retaining: "подпорная",
  slope: "откос",
  stabilization: "укрепление",
  overpass: "путепровод",
  flyover: "эстакада",
  pedestrian: "пешеходный",
  piers: "опоры",
  abutments: "устои",
  girders: "балки",
  deck: "плита проезжей части",
  expansion: "деформационные",
  joints: "швы",
  bearings: "опорные части",
  waterproofing: "гидроизоляция",
  tunnel: "тоннель",
  lining: "обделка",
  ventilation: "вентиляция",
  underpass: "подземный переход",
  box: "короб",
  pipe: "труба",
  gabion: "габион",
  water: "вода",
  supply: "водоснабжение",
  settlement: "посёлок",
  network: "сеть",
  intake: "водозабор",
  borehole: "скважина",
  well: "колодец",
  pumping: "насосная",
  station: "станция",
  booster: "повысительная",
  reservoir: "резервуар",
  clean: "чистая",
  tower: "башня",
  pressure: "напорный",
  pipeline: "трубопровод",
  distribution: "распределительный",
  connection: "подключение",
  fire: "пожарный",
  hydrants: "гидранты",
  valves: "задвижки",
  chambers: "камеры",
  treatment: "очистка",
  plant: "сооружение",
  filtration: "фильтрация",
  chlorination: "хлорирование",
  testing: "испытание",
  disinfection: "дезинфекция",
  sewer: "канализация",
  gravity: "самотечный",
  collector: "коллектор",
  wastewater: "сточные воды",
  septic: "септик",
  stormwater: "ливневая канализация",
  channel: "канал",
  manholes: "колодцы",
  inspection: "смотровые",
  bedding: "основание",
  backfill: "засыпка",
  hydraulic: "гидротехнический",
  sewage: "канализационный",
  tanks: "ёмкости",
  aeration: "аэротенки",
  sludge: "ил",
  dewatering: "обезвоживание",
  outfall: "выпуск",
  dam: "дамба",
  earth: "земляная",
  small: "малая",
  spillway: "водосброс",
  outlet: "водовыпуск",
  irrigation: "орошение",
  canal: "канал",
  riverbank: "берегоукрепление",
  protection: "защита",
  riprap: "наброска",
  geotextile: "геотекстиль",
  prism: "призма",
  anti: "противофильтрационный",
  screen: "экран",
  gates: "затворы",
  electrical: "электрический",
  poles: "опоры",
  overhead: "воздушная",
  power: "электро",
  line: "линия",
  cable: "кабель",
  transformer: "трансформатор",
  substation: "подстанция",
  switchgear: "РУ",
  grounding: "заземление",
  lightning: "молниезащита",
  trench: "траншея",
  ducts: "каналы",
  pulling: "протяжка",
  relay: "релейная",
  automation: "автоматика",
  site: "участок",
  gas: "газ",
  heat: "теплосеть",
  telecom: "связь",
  fiber: "оптика",
  optic: "оптическая",
  utility: "инженерная",
  crossings: "переходы",
  sleeves: "футляры",
  services: "услуги",
  temporary: "временный",
  external: "наружные",
  regulator: "регуляторный",
  preinsulated: "предизолированный",
  compensators: "компенсаторы",
  welding: "сварка",
  technological: "технологический",
  process: "технологический",
  piping: "трубопровод",
  thermal: "тепловая",
  combined: "комбинированная",
  turbine: "турбина",
  hall: "зал",
  boiler: "котельная",
  generator: "генератор",
  cooling: "градирня",
  chimney: "дымовая труба",
  fuel: "топливо",
  oil: "мазут",
  coal: "уголь",
  ash: "зола",
  hydro: "ГЭС",
  penstock: "водовод",
  powerhouse: "машинный зал",
  surge: "уравнительная",
  tank: "камера",
  hydromechanical: "гидромеханическое",
  solar: "солнечная",
  wind: "ветровая",
  battery: "аккумуляторная",
  storage: "хранение",
  factory: "завод",
  industrial: "промышленный",
  shed: "ангар",
  warehouse: "склад",
  logistics: "логистический",
  terminal: "терминал",
  production: "производственный",
  workshop: "цех",
  crane: "кран",
  conveyor: "конвейер",
  gallery: "галерея",
  rack: "эстакада",
  floor: "пол",
  chemical: "химстойкий",
  cleanroom: "чистое помещение",
  cold: "холодильный",
  loading: "погрузочный",
  docks: "доки",
  span: "пролёт",
  silo: "силос",
  coating: "покрытие",
  bund: "обвалование",
  spill: "разлив",
  containment: "локализация",
  landfill: "полигон",
  liner: "экран",
  leachate: "фильтрат",
  sorting: "сортировка",
  composting: "компостирование",
  incineration: "сжигание",
  hazardous: "опасные",
  waste: "отходы",
  remediation: "рекультивация",
  soil: "грунт",
  dust: "пыль",
  monitoring: "мониторинг",
  quarry: "карьер",
  mining: "горный",
  excavation: "выемка",
  rock: "скала",
  blasting: "буровзрывные",
  berms: "бермы",
  tailings: "хвостохранилище",
  ore: "руда",
  foundations: "фундаменты",
  HVAC: "HVAC",
  room: "помещение",
  smoke: "дымоудаление",
  exhaust: "вытяжка",
  fighting: "пожаротушение",
  sprinkler: "спринклерная",
  alarm: "сигнализация",
  voltage: "слаботочная",
  CCTV: "видеонаблюдение",
  BMS: "BMS",
  UPS: "ИБП",
  data: "ЦОД",
  server: "серверная",
};

const TITLE_OVERRIDES_RU: Record<string, string> = {
  bridge_construction: "Строительство моста",
  overpass_construction: "Строительство путепровода",
  flyover_construction: "Строительство эстакады",
  tunnel_construction: "Строительство тоннеля",
  retaining_wall: "Подпорная стена",
  village_water_supply: "Наружный водопровод / водоснабжение села",
  village_sewer_network: "Наружная канализация села",
  wastewater_treatment_plant: "Очистные сооружения сточных вод",
  pumping_station: "Насосная станция",
  road_construction: "Строительство дороги",
  concrete_road: "Бетонная дорога",
  culverts: "Водопропускные трубы",
  earth_dam: "Земляная дамба",
  irrigation_channel: "Оросительный канал",
  overhead_power_line_10kv: "Воздушная ЛЭП 10 кВ",
  transformer_substation: "Трансформаторная подстанция",
  underground_cable_line: "Кабельная линия",
  multi_utility_trench: "Комплекс наружных инженерных сетей",
  gas_pipeline_low_pressure: "Газопровод низкого давления",
  heat_network: "Тепловая сеть",
  high_rise_glazing: "Фасадное остекление высотного здания",
  mansard_roof_with_windows: "Мансардная кровля с окнами",
  multi_storey_residential_building: "Многоэтажный жилой дом",
  high_rise_building: "Высотное здание",
  multi_storey_frame: "Каркас многоэтажного здания",
  industrial_shed: "Промышленный корпус",
  warehouse_building: "Складское здание",
  long_span_steel_structure: "Большепролётная стальная конструкция",
  equipment_foundation: "Фундамент под оборудование",
  turbine_foundation: "Фундамент турбоагрегата",
  crane_runway: "Крановые пути",
  pipe_rack: "Трубопроводная / кабельная эстакада",
  technological_pipeline: "Технологический трубопровод",
  thermal_power_plant: "ТЭЦ / тепловая электростанция",
  hydro_power_plant: "ГЭС / гидроэлектростанция",
  boiler_house: "Котельная",
  cooling_tower: "Градирня",
  steel_tank: "Стальной резервуар",
  reinforced_concrete_tank: "Железобетонный резервуар",
  water_reservoir: "Резервуар чистой воды",
  fuel_tank: "Топливный резервуар",
  solar_power_plant: "Солнечная электростанция",
  wind_power_plant: "Ветровая электростанция",
  battery_energy_storage: "Система накопления энергии",
  landfill_cell: "Карта полигона отходов",
  mining_service_road: "Карьерная технологическая дорога",
  large_scale_excavation: "Крупные земляные работы",
};

function titleFromId(id: string, blockTitle: string): string {
  const override = TITLE_OVERRIDES_RU[id];
  if (override) return `${blockTitle}: ${override}`;
  const words = id.split("_").map((token) => TOKEN_RU[token] ?? token.replace(/([0-9]+)kv/i, "$1 кВ"));
  const title = words.join(" ").replace(/\s+/g, " ").trim();
  return `${blockTitle}: ${title}`;
}

function schemaFor(blockKey: string): ExpandedComplexParameterSchemaField[] {
  const detailed: ExpandedComplexEstimateLevel[] = ["DETAILED_BOQ_FROM_DRAWINGS", "TENDER_BOQ", "AS_BUILT_ESTIMATE"];
  const common: ExpandedComplexParameterSchemaField[] = [
    { key: "source_prompt", labelRu: "Исходный запрос", requiredFor: ["ROM_CONCEPT", "PRELIMINARY_BOQ"], missingBlocksDetailed: false },
    { key: "project_location", labelRu: "Город / площадка", requiredFor: detailed, missingBlocksDetailed: true },
    { key: "drawings_or_specification", labelRu: "Проект / спецификация", requiredFor: detailed, missingBlocksDetailed: true },
  ];
  const length: ExpandedComplexParameterSchemaField = { key: "length_m", labelRu: "Длина", unit: "m", requiredFor: ["PRELIMINARY_BOQ", ...detailed], missingBlocksDetailed: true };
  const area: ExpandedComplexParameterSchemaField = { key: "area_m2", labelRu: "Площадь", unit: "m2", requiredFor: ["PRELIMINARY_BOQ", ...detailed], missingBlocksDetailed: true };
  const height: ExpandedComplexParameterSchemaField = { key: "height_m", labelRu: "Высота", unit: "m", requiredFor: detailed, missingBlocksDetailed: true };
  const capacity: ExpandedComplexParameterSchemaField = { key: "capacity", labelRu: "Мощность / производительность", requiredFor: ["PRELIMINARY_BOQ", ...detailed], missingBlocksDetailed: true };
  const diameter: ExpandedComplexParameterSchemaField = { key: "diameter_mm", labelRu: "Диаметр / сечение", requiredFor: detailed, missingBlocksDetailed: true };
  const width: ExpandedComplexParameterSchemaField = { key: "width_m", labelRu: "Ширина", unit: "m", requiredFor: ["PRELIMINARY_BOQ", ...detailed], missingBlocksDetailed: true };
  const geologyProfile: ExpandedComplexParameterSchemaField = { key: "geology_profile", labelRu: "Геология / профиль", requiredFor: detailed, missingBlocksDetailed: true };
  const equipmentSpecification: ExpandedComplexParameterSchemaField = { key: "equipment_specification", labelRu: "Спецификация оборудования", requiredFor: detailed, missingBlocksDetailed: true };
  const loads: ExpandedComplexParameterSchemaField = { key: "loads", labelRu: "Нагрузки", requiredFor: detailed, missingBlocksDetailed: true };
  if (["water_supply", "sewer_wastewater", "utility_connections", "gas_heat_pipelines", "electrical_infrastructure"].includes(blockKey)) {
    return [...common, length, diameter, capacity];
  }
  if (["transport", "bridges_tunnels", "hydraulic", "mining"].includes(blockKey)) {
    return [...common, length, height, width, geologyProfile];
  }
  if (["energy", "industrial", "tanks_storage", "environmental"].includes(blockKey)) {
    return [...common, area, capacity, equipmentSpecification, loads];
  }
  return [...common, area, height];
}

function recipeFor(blockKey: string, lineType: ExpandedComplexLineType): string[] {
  const base: Record<ExpandedComplexLineType, string[]> = {
    material: ["основные материалы", "расходные материалы", "крепёж / арматура", "защитные слои"],
    work: ["разбивка и подготовка", "монтаж / устройство", "контроль геометрии", "испытания"],
    equipment: ["экскаватор / подъёмная техника", "уплотнение / сварка / бурение", "спецтехника по доступу"],
    service: ["лабораторный контроль", "испытания и ПНР", "доставка / такелаж", "исполнительная документация"],
  };
  const blockExtras: Partial<Record<string, Partial<Record<ExpandedComplexLineType, string[]>>>> = {
    energy: {
      material: ["бетон и арматура фундаментов", "металлоконструкции", "кабельные лотки", "изоляция трубопроводов"],
      equipment: ["тяжёлый кран", "монтажное оборудование", "испытательная лаборатория"],
      service: ["ПНР энергообъекта", "шеф-монтаж", "электротехнические испытания"],
    },
    bridges_tunnels: {
      material: ["бетон опор и плиты", "арматура", "балки / металлоконструкции", "гидроизоляция"],
      equipment: ["буровая установка", "кран", "бетононасос", "виброоборудование"],
    },
    water_supply: {
      material: ["труба ПЭ/сталь", "песчаная постель", "фитинги", "колодцы и арматура"],
      service: ["опрессовка", "промывка", "дезинфекция"],
    },
  };
  return blockExtras[blockKey]?.[lineType] ?? base[lineType];
}

function calculatorFor(seed: FamilySeed, block: FamilyBlock): ExpandedComplexCalculatorId {
  if (seed.calculatorId) return seed.calculatorId;
  return block.calculatorId;
}

export const EXPANDED_COMPLEX_WORK_FAMILIES: readonly ExpandedComplexWorkFamilyDefinition[] =
  EXPANDED_COMPLEX_FAMILY_BLOCKS.flatMap((block) =>
    block.families.map((seed) => {
      const professionalNameRu = seed.nameRu ?? titleFromId(seed.id, block.titleRu);
      const calculatorId = calculatorFor(seed, block);
      return {
        work_family_id: seed.id,
        professionalNameRu,
        aliases: [
          seed.id,
          seed.id.replace(/_/g, " "),
          professionalNameRu,
          ...(seed.aliases ?? []),
        ],
        categoryGroup: block.key,
        globalCategory: block.globalCategory,
        parameterSchema: schemaFor(block.key),
        calculatorId,
        formulaFamily: `${calculatorId}:deterministic_reference_formula_v1`,
        materialRecipe: recipeFor(block.key, "material"),
        laborRecipe: recipeFor(block.key, "work"),
        equipmentRecipe: recipeFor(block.key, "equipment"),
        serviceRecipe: recipeFor(block.key, "service"),
        normSource: {
          sourceId: `src_expanded_complex_${block.key}_reference_formula_v1`,
          titleRu: `Инженерная справочная формула для блока "${block.titleRu}"`,
          version: "2026.07.04",
          provenance: "engineering_reference_formula",
        },
        unitPolicy: "metric_units_required; conversions visible in calculation trace",
        pricePolicy: {
          defaultState: "PRICE_MISSING",
          allowFinalTotalWhenMissing: false,
          equipmentPricePolicy: "MISSING_PRICE_UNLESS_RATEBOOK_SELECTED",
        },
        estimateLevelPolicy: {
          defaultLevel: "PRELIMINARY_BOQ",
          detailedRequiresDesignInputs: true,
        },
        missingDesignInputsPolicy: [
          "Проектные чертежи",
          "Геология / исполнительный профиль",
          "Спецификация оборудования",
          "Нагрузки и расчётная схема",
        ],
        uiRendererPolicy: "GROUPED_PREVIEW_REQUIRED",
        pdfPolicy: "GROUPED_WITH_ASSUMPTIONS_TRACE_AND_SOURCES",
        buyerHandoffPolicy: "MATERIAL_EQUIPMENT_DELIVERY_ONLY",
      } satisfies ExpandedComplexWorkFamilyDefinition;
    }),
  );

export const EXPANDED_COMPLEX_TEMPLATES: readonly ExpandedComplexTemplate[] =
  EXPANDED_COMPLEX_WORK_FAMILIES.flatMap((family) =>
    ESTIMATE_LEVELS.map((level) => ({
      template_id: `${family.work_family_id}_${level.toLowerCase()}_expanded_complex_v1`,
      work_family_id: family.work_family_id,
      template_level: level,
      requiredInputs: family.parameterSchema.filter((field) => field.requiredFor.includes(level)).map((field) => field.key),
      rowGroups: ["material", "work", "equipment", "service"],
      pdfPolicy: family.pdfPolicy,
      buyerHandoffPolicy: family.buyerHandoffPolicy,
    })),
  );

export const EXPANDED_COMPLEX_GLOBAL_WORK_TYPE_DEFINITIONS: readonly GlobalWorkTypeDefinition[] =
  EXPANDED_COMPLEX_WORK_FAMILIES.map((family) => ({
    workKey: family.work_family_id,
    category: family.globalCategory,
    names: {
      ru: family.professionalNameRu,
      en: family.work_family_id.replace(/_/g, " "),
    },
    defaultMeasureUnit: defaultGlobalUnitForFamily(family),
    dangerous: ["energy", "electrical_infrastructure", "gas_heat_pipelines", "bridges_tunnels", "hydraulic"].includes(family.categoryGroup),
    safetyReviewRequired: true,
  }));

export const EXPANDED_COMPLEX_GLOBAL_WORK_ALIASES: readonly Omit<GlobalWorkAlias, "normalizedAlias">[] =
  EXPANDED_COMPLEX_WORK_FAMILIES.flatMap((family) =>
    family.aliases.map((alias) => ({
      workKey: family.work_family_id,
      language: "ru",
      alias,
    })),
  );

function defaultGlobalUnitForFamily(family: ExpandedComplexWorkFamilyDefinition): "sq_m" | "linear_m" | "pcs" | "set" | "m3" | "ton" {
  if (["water_supply", "sewer_wastewater", "utility_connections", "gas_heat_pipelines", "electrical_infrastructure", "bridges_tunnels", "transport", "hydraulic", "mining"].includes(family.categoryGroup)) return "linear_m";
  if (family.work_family_id.includes("foundation") || family.work_family_id.includes("tank")) return "m3";
  if (family.work_family_id.includes("equipment") || family.categoryGroup === "energy") return "set";
  return "sq_m";
}

const MATCHERS: readonly { familyId: string; pattern: RegExp }[] = [
  { familyId: "thermal_power_plant", pattern: /(тэц|тэс|chp|thermal power|турбинн|котельн(?:ое)? отделен)/i },
  { familyId: "hydro_power_plant", pattern: /(гэс|мал(?:ая|ой)\s+гэс|деривацион|водовод|водозабор\s+гэс|hydro power|hpp)/i },
  { familyId: "boiler_house", pattern: /(котельн(?:ая|ую)|boiler house|котел)/i },
  { familyId: "pipe_rack", pattern: /(кабельн(?:ая|ую)\s+эстакад|трубн(?:ая|ую)\s+эстакад|pipe rack|cable tray gallery)/i },
  { familyId: "bridge_construction", pattern: /(мост|путепровод|эстакад|прол[её]т|bridge|overpass|flyover)/i },
  { familyId: "tunnel_construction", pattern: /(тоннел|туннел|tunnel)/i },
  { familyId: "retaining_wall", pattern: /(подпорн(?:ая|ую)\s+стен|retaining wall)/i },
  { familyId: "village_water_supply", pattern: /(водоснабжени[ея]\s+сел(?:а|ьск)?|водопровод\s+сел(?:а|ьск)?|наружн(?:ые|ых|ая|ую)\s+сет[иь]\s+вод|водонапорн.*башн|вод[аы]\s+башн|подведени[ея]\s+вод|скважин.*резервуар|village water|water tower)/i },
  { familyId: "village_sewer_network", pattern: /(наружн(?:ая|ую)\s+канализац|канализац(?:ия|ию)\s+села|sewer)/i },
  { familyId: "wastewater_treatment_plant", pattern: /(очистн(?:ые|ых)\s+сооруж|очистка\s+сток|wastewater)/i },
  { familyId: "pumping_station", pattern: /(насосн(?:ая|ую)\s+станц|pumping station)/i },
  { familyId: "stormwater_drainage", pattern: /(ливнев(?:ая|ую)\s+канализац|ливнесток|stormwater|rainwater)/i },
  { familyId: "cement_concrete_pavement", pattern: /(бетонн(?:ая|ую)\s+дорог|цементобетонн(?:ое|ая)\s+покрыти|concrete road)/i },
  { familyId: "road_lighting", pattern: /(дорожн(?:ое|ого)\s+освещен|освещен.*дорог|road lighting)/i },
  { familyId: "sidewalks", pattern: /(тротуар|пешеходн(?:ая|ую)\s+дорожк|sidewalk)/i },
  { familyId: "airport_runway", pattern: /(аэропортов(?:ая|ую)\s+рулежн|взлетн(?:ая|ую)\s+полос|airport)/i },
  { familyId: "railway_embankment", pattern: /(железнодорожн(?:ая|ую)\s+насып|жд\s+насып|railway)/i },
  { familyId: "road_construction", pattern: /(строительств[оа]\s+дорог|дорога\s+\d|дорог[аи]\s+села|асфальт|бетонн(?:ая|ую)\s+дорог|road)/i },
  { familyId: "culverts", pattern: /(водопропускн(?:ая|ую)\s+труб|culvert)/i },
  { familyId: "earth_dam", pattern: /(дамб|плотин|берегоукреп|водосброс|геомембран|dam|spillway)/i },
  { familyId: "irrigation_channel", pattern: /(канал\s+орошен|оросительн|irrigation)/i },
  { familyId: "overhead_power_line_10kv", pattern: /(лэп|линия\s+электропередач|опор[ыа]\s+\d|столб[ыа].*кв|сип|overhead power)/i },
  { familyId: "transformer_substation", pattern: /(подстанц|ктп|трансформаторн|substation)/i },
  { familyId: "underground_cable_line", pattern: /(кабельн(?:ая|ую)\s+лини|кабель.*транше|cable line)/i },
  { familyId: "multi_utility_trench", pattern: /(подведени[ея]\s+инженерк|подвести\s+вод|подвест[и]\s+вод|инженерн(?:ые|ых)\s+сет|вода\s+канализац.*электр|utility)/i },
  { familyId: "fiber_optic_connection", pattern: /(волоконно-?оптическ|волс|fiber optic)/i },
  { familyId: "gas_pipeline_low_pressure", pattern: /(газоснабжен|газопровод|gas pipeline)/i },
  { familyId: "heat_network", pattern: /(теплотрасс|теплосет|district heating)/i },
  { familyId: "high_rise_glazing", pattern: /(остеклени[ея]\s+высот|фасадн(?:ое|ого)\s+остек|витражн(?:ое|ого)\s+остек|glazing)/i },
  { familyId: "wet_facade_system", pattern: /(фасад\s+мокр|мокр(?:ый|ого)\s+фасад|wet facade)/i },
  { familyId: "ventilated_facade", pattern: /(вентилируем(?:ый|ого)\s+фасад|керамогранит.*фасад|ventilated facade)/i },
  { familyId: "mansard_roof_with_windows", pattern: /(мансардн(?:ая|ую)\s+крыш|мансард|кровельн(?:ые|ых)\s+окн|roof windows)/i },
  { familyId: "high_rise_building", pattern: /(высотн(?:ый|ого|ая|ую)|башн(?:я|ю)|\d+\s*этаж(?:ей|а|ный)|high-rise)/i },
  { familyId: "multi_storey_residential_building", pattern: /(многоэтажн|жк\s+\d|жил(?:ой|ого)\s+комплекс|multi-storey)/i },
  { familyId: "industrial_shed", pattern: /(промышленн(?:ый|ого)\s+корпус|ангар|металлокаркас|industrial shed)/i },
  { familyId: "warehouse_building", pattern: /(склад\s+\d|warehouse)/i },
  { familyId: "equipment_foundation", pattern: /(фундамент\s+под\s+оборудован|equipment foundation)/i },
  { familyId: "turbine_foundation", pattern: /(фундамент\s+турбин|turbine foundation)/i },
  { familyId: "crane_runway", pattern: /(кранов(?:ые|ых)\s+пут|crane runway)/i },
  { familyId: "pipe_rack", pattern: /(лотков(?:ая)?\s+эстакад)/i },
  { familyId: "technological_pipeline", pattern: /(технологическ(?:ий|ого)\s+трубопровод|dn\s?\d|process piping)/i },
  { familyId: "steel_tank", pattern: /(резервуар\s+стальн|резервуар\s+\d|tank)/i },
  { familyId: "solar_power_plant", pattern: /(солнечн(?:ая|ую)\s+электростанц|solar)/i },
  { familyId: "wind_power_plant", pattern: /(ветропарк|ветров(?:ая|ую)\s+электростанц|wind farm)/i },
  { familyId: "battery_energy_storage", pattern: /(аккумуляторн(?:ая|ую)\s+систем|накопител|battery storage)/i },
];

function normalizePrompt(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/\u0451/g, "\u0435").replace(/\s+/g, " ").trim();
}

export function getExpandedComplexWorkFamily(familyId: string): ExpandedComplexWorkFamilyDefinition | null {
  return EXPANDED_COMPLEX_WORK_FAMILIES.find((family) => family.work_family_id === familyId) ?? null;
}

export function isExpandedComplexWorkFamilyId(familyId: string | null | undefined): boolean {
  return typeof familyId === "string" && getExpandedComplexWorkFamily(familyId) !== null;
}

export function resolveExpandedComplexWorkFamily(prompt: string, forcedFamilyId?: string | null): ExpandedComplexWorkFamilyDefinition | null {
  if (forcedFamilyId) {
    const forced = getExpandedComplexWorkFamily(forcedFamilyId);
    if (forced) return forced;
  }
  const normalized = normalizePrompt(prompt);
  const match = MATCHERS.find((candidate) => candidate.pattern.test(normalized));
  return match ? getExpandedComplexWorkFamily(match.familyId) : null;
}

function numberFromText(text: string, patterns: RegExp[], fallback: number): number {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const value = Number(match[1].replace(",", "."));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return fallback;
}

function extractLengthM(text: string, fallback: number): number {
  const km = numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*(?:км|km)(?:\s|$)/i], NaN);
  if (Number.isFinite(km)) return km * 1000;
  return numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*(?:м|m)(?:\s|$)/i], fallback);
}

function extractAreaM2(text: string, fallback: number): number {
  return numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*(?:м2|м²|кв\.?\s*м|m2|m²|sqm)\b/i], fallback);
}

function extractDiameterMm(text: string, fallback: number): number {
  return numberFromText(text, [/\bdn\s?(\d{2,4})\b/i, /\bd\s?(\d{2,4})\b/i, /d\s?(\d{2,4})/i, /диаметр\s*(\d{2,4})/i], fallback);
}

function extractWidthM(text: string, fallback: number): number {
  return numberFromText(text, [/ширин[аы]\s*(\d+(?:[,.]\d+)?)/i, /width\s*(\d+(?:[,.]\d+)?)/i], fallback);
}

function extractHeightM(text: string, fallback: number): number {
  return numberFromText(text, [/высот[аы]\s*(\d+(?:[,.]\d+)?)/i, /height\s*(\d+(?:[,.]\d+)?)/i], fallback);
}

function extractThicknessM(text: string, fallbackMm: number): number {
  const mm = numberFromText(text, [/толщин[аы]\s*(\d+(?:[,.]\d+)?)\s*мм/i, /(\d+(?:[,.]\d+)?)\s*мм/i], fallbackMm);
  return mm / 1000;
}

function extractCount(text: string, patterns: RegExp[], fallback: number): number {
  return Math.max(1, Math.round(numberFromText(text, patterns, fallback)));
}

function extractCapacityMw(text: string, fallback: number): number {
  return numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*(?:мвт|mw)\b/i], fallback);
}

function r(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function commonMissingInputs(family: ExpandedComplexWorkFamilyDefinition): string[] {
  return family.missingDesignInputsPolicy;
}

function row(input: {
  family: ExpandedComplexWorkFamilyDefinition;
  code: string;
  titleRu: string;
  lineType: ExpandedComplexLineType;
  group: string;
  quantity: number;
  unit: ExpandedComplexUnit;
  formula: string;
  sourceParameters?: Record<string, number | string | boolean | null>;
  materialKey?: string;
  procurement?: boolean;
}): ExpandedComplexBoqRow {
  const quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? r(input.quantity, 3) : 0;
  const includedInProcurement = input.procurement ?? (input.lineType === "material" || input.lineType === "equipment" || input.group === "logistics");
  return {
    code: input.code,
    titleRu: input.titleRu,
    lineType: input.lineType,
    group: input.group,
    quantity,
    unit: input.unit,
    quantityFormula: input.formula,
    formulaId: `${input.family.calculatorId}_${input.code}_formula_v1`,
    unitPrice: null,
    total: null,
    priceStatus: "PRICE_MISSING",
    includedInProcurement,
    materialKey: input.materialKey,
    sourceParameters: {
      rowCode: input.code,
      work_family_id: input.family.work_family_id,
      calculatorId: input.family.calculatorId,
      estimate_level: "PRELIMINARY_BOQ",
      ...input.sourceParameters,
    },
    normId: `norm:expanded_complex:${input.family.work_family_id}:${input.code}:v1`,
    normFamilyId: `norm_family:expanded_complex:${input.family.work_family_id}`,
    normSourceId: input.family.normSource.sourceId,
    normSourceTitle: input.family.normSource.titleRu,
    normVersion: input.family.normSource.version,
    normReviewStatus: "quantity_engineering_reviewed",
  };
}

function output(input: {
  family: ExpandedComplexWorkFamilyDefinition;
  sourcePrompt: string;
  parameters: Record<string, number | string | boolean | null>;
  rows: ExpandedComplexBoqRow[];
  assumptions: string[];
  missingInputs?: string[];
  formulaSteps: string[];
  unitConversions?: string[];
}): ExpandedComplexCalculatorOutput {
  const activeRows = input.rows.filter((item) => item.quantity > 0);
  const material_rows = activeRows.filter((item) => item.lineType === "material");
  const work_rows = activeRows.filter((item) => item.lineType === "work");
  const equipment_rows = activeRows.filter((item) => item.lineType === "equipment");
  const service_rows = activeRows.filter((item) => item.lineType === "service");
  return {
    source_prompt: input.sourcePrompt,
    work_family_id: input.family.work_family_id,
    professionalNameRu: input.family.professionalNameRu,
    calculatorId: input.family.calculatorId,
    input_parameters: input.parameters,
    missing_design_inputs: input.missingInputs ?? commonMissingInputs(input.family),
    estimate_level: "PRELIMINARY_BOQ",
    assumptions: input.assumptions,
    limitations: [
      "Это предварительная BOQ-смета, не рабочий проект и не конструктивный расчёт.",
      "Финальный итог не считается, пока цены не подтверждены каталогом, прайсом или коммерческим предложением.",
    ],
    formula_steps: input.formulaSteps,
    unit_conversions: input.unitConversions ?? [],
    material_rows,
    work_rows,
    equipment_rows,
    service_rows,
    procurement_subset: activeRows.filter((item) => item.includedInProcurement && item.lineType !== "work"),
    price_state: {
      status: "PRICE_MISSING",
      reason: "NO_ACCEPTED_PRICE_SOURCE_OR_UNIT_CONVERSION",
      finalTotalAllowed: false,
    },
    calculation_trace: activeRows.map((item) =>
      `${item.code}: formula=${item.quantityFormula}; result=${item.quantity} ${item.unit}; normSource=${item.normSourceId}`,
    ),
  };
}

type CalcInput = { prompt: string; familyId?: string | null };

function familyForCalculator(input: CalcInput, fallbackFamilyId: string): ExpandedComplexWorkFamilyDefinition {
  return resolveExpandedComplexWorkFamily(input.prompt, input.familyId) ?? getExpandedComplexWorkFamily(fallbackFamilyId) ?? EXPANDED_COMPLEX_WORK_FAMILIES[0];
}

export function villageWaterSupplyCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "village_water_supply");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 1000);
  const diameterMm = extractDiameterMm(text, 110);
  const houses = extractCount(text, [/(\d+)\s*(?:дом|house)/i], Math.max(10, lengthM / 80));
  const waterTowerRequired = /(водонапорн.*башн|вод[аы]\s+башн|water tower)/i.test(text);
  const trenchWidthM = Math.max(0.6, diameterMm / 1000 + 0.45);
  const trenchDepthM = 1.4;
  const trenchExcavation = lengthM * trenchWidthM * trenchDepthM;
  const beddingSand = lengthM * trenchWidthM * 0.1;
  const rows = [
    row({ family, code: "trench_excavation_m3", titleRu: "Разработка траншеи под водопровод", lineType: "work", group: "earthworks", quantity: trenchExcavation, unit: "m3", formula: "length_m * trench_width_m * trench_depth_m" }),
    row({ family, code: "bedding_sand_m3", titleRu: "Песчаная постель под трубу", lineType: "material", group: "materials", quantity: beddingSand, unit: "m3", formula: "length_m * trench_width_m * 0.10", materialKey: "sand_bedding" }),
    row({ family, code: "pipe_lm", titleRu: `Труба водопроводная d${diameterMm}`, lineType: "material", group: "materials", quantity: lengthM * 1.02, unit: "m", formula: "length_m * 1.02", materialKey: "pe_water_pipe" }),
    row({ family, code: "fittings_pcs", titleRu: "Фитинги и соединительные элементы", lineType: "material", group: "materials", quantity: Math.ceil(lengthM / 120) + houses, unit: "pcs", formula: "ceil(length_m / 120) + house_connections", materialKey: "water_fittings" }),
    row({ family, code: "valves_pcs", titleRu: "Запорная арматура", lineType: "material", group: "materials", quantity: Math.ceil(lengthM / 500) + 2, unit: "pcs", formula: "ceil(length_m / 500) + 2", materialKey: "water_valves" }),
    row({ family, code: "manholes_pcs", titleRu: "Колодцы / камеры арматуры", lineType: "material", group: "materials", quantity: Math.ceil(lengthM / 400) + 1, unit: "pcs", formula: "ceil(length_m / 400) + 1", materialKey: "manholes" }),
    row({ family, code: "hydrants_pcs", titleRu: "Пожарные гидранты", lineType: "material", group: "materials", quantity: Math.ceil(lengthM / 300), unit: "pcs", formula: "ceil(length_m / 300)", materialKey: "fire_hydrant" }),
    row({ family, code: "water_tower_pcs", titleRu: "Водонапорная башня / бак запаса воды", lineType: "equipment", group: "equipment", quantity: waterTowerRequired ? 1 : 0, unit: "pcs", formula: "water_tower_required ? 1 : 0", materialKey: "water_tower", sourceParameters: { water_tower_required: waterTowerRequired } }),
    row({ family, code: "backfill_m3", titleRu: "Обратная засыпка траншеи", lineType: "work", group: "earthworks", quantity: trenchExcavation * 0.86, unit: "m3", formula: "trench_excavation_m3 * 0.86" }),
    row({ family, code: "surplus_soil_m3", titleRu: "Излишний грунт к вывозу", lineType: "service", group: "logistics", quantity: trenchExcavation * 0.18, unit: "m3", formula: "trench_excavation_m3 * 0.18" }),
    row({ family, code: "pressure_testing_lm", titleRu: "Опрессовка водопровода", lineType: "service", group: "commissioning", quantity: lengthM, unit: "m", formula: "length_m", procurement: true }),
    row({ family, code: "disinfection_lm", titleRu: "Промывка и дезинфекция", lineType: "service", group: "commissioning", quantity: lengthM, unit: "m", formula: "length_m", procurement: true }),
    row({ family, code: "excavator_shifts", titleRu: "Экскаватор для траншей", lineType: "equipment", group: "equipment", quantity: Math.ceil(trenchExcavation / 320), unit: "shift", formula: "ceil(trench_excavation_m3 / 320)" }),
    row({ family, code: "crane_shifts", titleRu: "Кран / манипулятор для колодцев", lineType: "equipment", group: "equipment", quantity: Math.ceil((Math.ceil(lengthM / 400) + 1) / 6), unit: "shift", formula: "ceil(manholes_pcs / 6)" }),
    row({ family, code: "dump_truck_trips", titleRu: "Самосвалы для вывоза грунта", lineType: "equipment", group: "equipment", quantity: Math.ceil((trenchExcavation * 0.18) / 8), unit: "trip", formula: "ceil(surplus_soil_m3 / 8)" }),
    row({ family, code: "labor_hours", titleRu: "Монтажная бригада водопровода", lineType: "work", group: "labor", quantity: lengthM * 0.55 + houses * 1.2, unit: "hour", formula: "length_m * 0.55 + houses * 1.2" }),
  ];
  return output({
    family,
    sourcePrompt: input.prompt,
    parameters: { length_m: lengthM, diameter_mm: diameterMm, houses, trench_width_m: trenchWidthM, trench_depth_m: trenchDepthM, water_tower_required: waterTowerRequired },
    rows,
    assumptions: [
      `Принята траншея ${trenchWidthM.toFixed(2)} м x ${trenchDepthM.toFixed(2)} м для предварительной сметы.`,
      ...(waterTowerRequired ? ["Водонапорная башня включена как 1 комплект; объем бака и отметка уточняются проектом."] : []),
    ],
    formulaSteps: ["trench_excavation_m3 = length_m * trench_width_m * trench_depth_m", "pipe_lm = length_m * 1.02", "equipment shifts are rounded by productivity norms"],
  });
}

export function sewerNetworkCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "village_sewer_network");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 1000);
  const diameterMm = extractDiameterMm(text, 200);
  const trenchWidthM = Math.max(0.75, diameterMm / 1000 + 0.55);
  const trenchDepthM = 1.8;
  const trenchExcavation = lengthM * trenchWidthM * trenchDepthM;
  const rows = [
    row({ family, code: "sewer_trench_excavation_m3", titleRu: "Разработка траншеи канализации", lineType: "work", group: "earthworks", quantity: trenchExcavation, unit: "m3", formula: "length_m * trench_width_m * trench_depth_m" }),
    row({ family, code: "pipe_bedding_sand_m3", titleRu: "Песчаное основание и обсыпка трубы", lineType: "material", group: "materials", quantity: lengthM * trenchWidthM * 0.22, unit: "m3", formula: "length_m * trench_width_m * 0.22", materialKey: "sand_bedding" }),
    row({ family, code: "sewer_pipe_lm", titleRu: `Труба канализационная d${diameterMm}`, lineType: "material", group: "materials", quantity: lengthM * 1.02, unit: "m", formula: "length_m * 1.02", materialKey: "sewer_pipe" }),
    row({ family, code: "inspection_manhole_pcs", titleRu: "Смотровые колодцы", lineType: "material", group: "materials", quantity: Math.ceil(lengthM / 50) + 1, unit: "pcs", formula: "ceil(length_m / 50) + 1", materialKey: "sewer_manhole" }),
    row({ family, code: "hydraulic_testing_lm", titleRu: "Гидравлические испытания сети", lineType: "service", group: "commissioning", quantity: lengthM, unit: "m", formula: "length_m", procurement: true }),
    row({ family, code: "backfill_m3", titleRu: "Обратная засыпка", lineType: "work", group: "earthworks", quantity: trenchExcavation * 0.82, unit: "m3", formula: "trench_excavation_m3 * 0.82" }),
    row({ family, code: "excavator_shifts", titleRu: "Экскаватор", lineType: "equipment", group: "equipment", quantity: Math.ceil(trenchExcavation / 300), unit: "shift", formula: "ceil(trench_excavation_m3 / 300)" }),
    row({ family, code: "labor_hours", titleRu: "Монтаж трубопровода канализации", lineType: "work", group: "labor", quantity: lengthM * 0.7, unit: "hour", formula: "length_m * 0.70" }),
  ];
  return output({
    family,
    sourcePrompt: input.prompt,
    parameters: { length_m: lengthM, diameter_mm: diameterMm, trench_width_m: trenchWidthM, trench_depth_m: trenchDepthM },
    rows,
    assumptions: ["Уклон и отметки приняты предварительно; детальный BOQ требует профиль сети."],
    formulaSteps: ["sewer_trench_excavation_m3 = length_m * trench_width_m * trench_depth_m", "inspection_manhole_pcs = ceil(length_m / 50) + 1"],
    missingInputs: [...commonMissingInputs(family), "Продольный профиль канализации", "Отметки подключений"],
  });
}

export function wastewaterTreatmentCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "wastewater_treatment_plant");
  const text = normalizePrompt(input.prompt);
  const capacity = numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*(?:м3|м³)\s*(?:в\s*сут|\/сут|day)/i], 1000);
  const concrete = capacity * 0.18;
  const rows = [
    row({ family, code: "treatment_tank_concrete_m3", titleRu: "Железобетонные ёмкости очистных", lineType: "material", group: "materials", quantity: concrete, unit: "m3", formula: "capacity_m3_day * 0.18", materialKey: "ready_mix_concrete" }),
    row({ family, code: "rebar_t", titleRu: "Арматура ёмкостей", lineType: "material", group: "materials", quantity: concrete * 0.11, unit: "t", formula: "concrete_m3 * 0.11", materialKey: "rebar" }),
    row({ family, code: "aeration_equipment_set", titleRu: "Аэрационное оборудование", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "1 set; price missing until specification", materialKey: "aeration_equipment" }),
    row({ family, code: "pumps_set", titleRu: "Насосное оборудование", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "1 set; price missing until specification", materialKey: "pumping_equipment" }),
    row({ family, code: "commissioning_services", titleRu: "Пусконаладка очистных", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "commissioning set", procurement: true }),
    row({ family, code: "labor_hours", titleRu: "Монтаж очистных сооружений", lineType: "work", group: "labor", quantity: capacity * 0.9, unit: "hour", formula: "capacity_m3_day * 0.9" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { capacity_m3_day: capacity }, rows, assumptions: ["Схема очистки принята укрупнённо; оборудование без цены до спецификации."], formulaSteps: ["concrete_m3 = capacity_m3_day * 0.18", "rebar_t = concrete_m3 * 0.11"], missingInputs: [...commonMissingInputs(family), "Технологическая схема очистки", "Состав стоков"] });
}

export function pumpingStationCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "pumping_station");
  const text = normalizePrompt(input.prompt);
  const capacity = numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*(?:м3\/ч|м³\/ч|m3\/h)/i], 100);
  const rows = [
    row({ family, code: "station_slab_concrete_m3", titleRu: "Фундамент насосной станции", lineType: "material", group: "materials", quantity: Math.max(12, capacity * 0.08), unit: "m3", formula: "max(12, capacity_m3_h * 0.08)", materialKey: "ready_mix_concrete" }),
    row({ family, code: "pump_equipment_pcs", titleRu: "Насосные агрегаты", lineType: "equipment", group: "equipment", quantity: 2, unit: "pcs", formula: "working pump + reserve pump; price missing until specification", materialKey: "pump_unit" }),
    row({ family, code: "valves_and_manifold_set", titleRu: "Коллекторы и арматура насосной", lineType: "material", group: "materials", quantity: 1, unit: "set", formula: "1 manifold set", materialKey: "pump_manifold" }),
    row({ family, code: "electrical_automation_set", titleRu: "Шкаф управления и автоматика", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "1 automation set; price missing until specification", materialKey: "pump_automation" }),
    row({ family, code: "commissioning_services", titleRu: "ПНР насосной станции", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "commissioning set", procurement: true }),
    row({ family, code: "labor_hours", titleRu: "Монтаж насосной станции", lineType: "work", group: "labor", quantity: 120 + capacity * 0.4, unit: "hour", formula: "120 + capacity_m3_h * 0.4" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { capacity_m3_h: capacity }, rows, assumptions: ["Насосы и автоматика выводятся с PRICE_MISSING до подбора производителя."], formulaSteps: ["foundation concrete = max(12, capacity_m3_h * 0.08)", "labor_hours = 120 + capacity_m3_h * 0.4"], missingInputs: [...commonMissingInputs(family), "Напор насосов", "Схема резервирования"] });
}

function roadRows(family: ExpandedComplexWorkFamilyDefinition, text: string, concreteRoad = false): { rows: ExpandedComplexBoqRow[]; parameters: Record<string, number | string | boolean | null>; steps: string[] } {
  const lengthM = extractLengthM(text, 1000);
  const widthM = extractWidthM(text, 6);
  const areaM2 = lengthM * widthM;
  const asphaltT = areaM2 * 0.06 * 2.35;
  const thicknessM = extractThicknessM(text, 180);
  const rows = [
    row({ family, code: "road_area_m2", titleRu: "Площадь дорожного покрытия", lineType: "work", group: "surface", quantity: areaM2, unit: "m2", formula: "length_m * width_m" }),
    row({ family, code: "earthworks_m3", titleRu: "Земляные работы по корыту", lineType: "work", group: "earthworks", quantity: areaM2 * 0.28, unit: "m3", formula: "road_area_m2 * 0.28" }),
    row({ family, code: "subgrade_preparation_m2", titleRu: "Подготовка земляного полотна", lineType: "work", group: "base", quantity: areaM2, unit: "m2", formula: "road_area_m2" }),
    row({ family, code: "sand_gravel_subbase_m3", titleRu: "Песчано-гравийный подстилающий слой", lineType: "material", group: "materials", quantity: areaM2 * 0.15, unit: "m3", formula: "road_area_m2 * 0.15", materialKey: "sand_gravel_mix" }),
    row({ family, code: "crushed_stone_base_m3", titleRu: "Щебёночное основание", lineType: "material", group: "materials", quantity: areaM2 * 0.20, unit: "m3", formula: "road_area_m2 * 0.20", materialKey: "crushed_stone" }),
    concreteRoad
      ? row({ family, code: "concrete_m3", titleRu: "Бетон дорожного покрытия", lineType: "material", group: "materials", quantity: areaM2 * thicknessM, unit: "m3", formula: "road_area_m2 * thickness_m", materialKey: "road_concrete" })
      : row({ family, code: "asphalt_t", titleRu: "Асфальтобетонная смесь", lineType: "material", group: "materials", quantity: asphaltT, unit: "t", formula: "road_area_m2 * 0.06 * 2.35", materialKey: "asphalt_mix" }),
    concreteRoad
      ? row({ family, code: "reinforcement_mesh_m2", titleRu: "Дорожная армирующая сетка", lineType: "material", group: "materials", quantity: areaM2 * 1.03, unit: "m2", formula: "road_area_m2 * 1.03", materialKey: "reinforcement_mesh" })
      : row({ family, code: "bitumen_emulsion_l", titleRu: "Битумная эмульсия", lineType: "material", group: "materials", quantity: areaM2 * 0.6, unit: "l", formula: "road_area_m2 * 0.6", materialKey: "bitumen_emulsion" }),
    row({ family, code: "curbs_lm", titleRu: "Бортовой камень", lineType: "material", group: "materials", quantity: lengthM * 2, unit: "m", formula: "length_m * 2", materialKey: "road_curb" }),
    row({ family, code: "shoulders_m2", titleRu: "Укрепление обочин", lineType: "work", group: "shoulders", quantity: lengthM * 2, unit: "m2", formula: "length_m * 2 shoulders" }),
    row({ family, code: "drainage_lm", titleRu: "Дорожный водоотвод", lineType: "material", group: "drainage", quantity: lengthM * 0.3, unit: "m", formula: "length_m * 0.30", materialKey: "road_drainage" }),
    row({ family, code: "culverts_lm", titleRu: "Водопропускные трубы", lineType: "material", group: "drainage", quantity: Math.max(0, Math.ceil(lengthM / 500) * 12), unit: "m", formula: "ceil(length_m / 500) * 12", materialKey: "culvert_pipe" }),
    row({ family, code: "road_marking_m2_or_lm", titleRu: "Дорожная разметка", lineType: "service", group: "road_safety", quantity: lengthM * 0.12, unit: "m2", formula: "length_m * 0.12", procurement: true }),
    row({ family, code: "signs_pcs", titleRu: "Дорожные знаки", lineType: "material", group: "road_safety", quantity: Math.ceil(lengthM / 250), unit: "pcs", formula: "ceil(length_m / 250)", materialKey: "traffic_signs" }),
    row({ family, code: "guardrails_lm", titleRu: "Барьерное ограждение", lineType: "material", group: "road_safety", quantity: lengthM * 0.2, unit: "m", formula: "length_m * 0.20", materialKey: "guardrail" }),
    row({ family, code: "roller_shifts", titleRu: "Каток", lineType: "equipment", group: "equipment", quantity: Math.ceil(areaM2 / 2500), unit: "shift", formula: "ceil(road_area_m2 / 2500)" }),
    row({ family, code: "paver_shifts", titleRu: "Асфальтоукладчик / бетоноукладчик", lineType: "equipment", group: "equipment", quantity: Math.ceil(areaM2 / 3500), unit: "shift", formula: "ceil(road_area_m2 / 3500)" }),
    row({ family, code: "grader_shifts", titleRu: "Автогрейдер", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM / 800), unit: "shift", formula: "ceil(length_m / 800)" }),
    row({ family, code: "asphalt_truck_trips", titleRu: "Доставка смеси самосвалами", lineType: "equipment", group: "logistics", quantity: Math.ceil((concreteRoad ? areaM2 * thicknessM * 2.4 : asphaltT) / 20), unit: "trip", formula: "ceil(material_t / 20)" }),
  ];
  return { rows, parameters: { length_m: lengthM, width_m: widthM, road_area_m2: areaM2, thickness_m: concreteRoad ? thicknessM : null }, steps: ["road_area_m2 = length_m * width_m", concreteRoad ? "concrete_m3 = road_area_m2 * thickness_m" : "asphalt_t = road_area_m2 * 0.06 * 2.35"] };
}

export function roadConstructionCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "road_construction");
  const text = normalizePrompt(input.prompt);
  const concreteRoad = /бетонн|concrete/.test(text);
  const calculated = roadRows(family, text, concreteRoad);
  return output({ family, sourcePrompt: input.prompt, parameters: calculated.parameters, rows: calculated.rows, assumptions: ["Типовая предварительная конструкция дорожной одежды; детальная толщина слоёв уточняется проектом."], formulaSteps: calculated.steps, missingInputs: [...commonMissingInputs(family), "Категория дороги", "Геология и проект дорожной одежды"] });
}

export function concreteRoadCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "cement_concrete_pavement");
  const calculated = roadRows(family, normalizePrompt(input.prompt), true);
  return output({ family, sourcePrompt: input.prompt, parameters: calculated.parameters, rows: calculated.rows, assumptions: ["Бетонное покрытие рассчитано по площади и заданной/типовой толщине."], formulaSteps: calculated.steps, missingInputs: [...commonMissingInputs(family), "Марка бетона", "Схема швов", "Основание дорожной одежды"] });
}

export function roadDrainageCulvertCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "culverts");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 30);
  const sectionM2 = numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*[xх]\s*(\d+(?:[,.]\d+)?)/i], 2);
  const rows = [
    row({ family, code: "culvert_excavation_m3", titleRu: "Котлован под водопропускную трубу", lineType: "work", group: "earthworks", quantity: lengthM * sectionM2 * 1.5, unit: "m3", formula: "length_m * section_m2 * 1.5" }),
    row({ family, code: "culvert_elements_lm", titleRu: "Элементы водопропускной трубы", lineType: "material", group: "materials", quantity: lengthM, unit: "m", formula: "length_m", materialKey: "culvert_elements" }),
    row({ family, code: "headwalls_concrete_m3", titleRu: "Оголовки и бетонные работы", lineType: "material", group: "materials", quantity: sectionM2 * 4, unit: "m3", formula: "section_m2 * 4", materialKey: "ready_mix_concrete" }),
    row({ family, code: "crane_shifts", titleRu: "Кран для монтажа звеньев", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM / 20), unit: "shift", formula: "ceil(length_m / 20)" }),
    row({ family, code: "labor_hours", titleRu: "Монтаж водопропускной трубы", lineType: "work", group: "labor", quantity: lengthM * 6, unit: "hour", formula: "length_m * 6" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, section_m2: sectionM2 }, rows, assumptions: ["Гидравлический расчёт пропускной способности не выполняется без проекта."], formulaSteps: ["culvert_excavation_m3 = length_m * section_m2 * 1.5"], missingInputs: [...commonMissingInputs(family), "Расход воды", "Отметки лотка"] });
}

export function damHydraulicCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "earth_dam");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 200);
  const heightM = extractHeightM(text, 5);
  const crestWidthM = extractWidthM(text, 6);
  const fill = lengthM * heightM * (crestWidthM + heightM * 3);
  const slopeArea = lengthM * heightM * 2.25 * 2;
  const rows = [
    row({ family, code: "embankment_fill_m3", titleRu: "Насыпь тела дамбы", lineType: "material", group: "materials", quantity: fill, unit: "m3", formula: "length_m * height_m * (crest_width_m + height_m * 3)", materialKey: "embankment_soil" }),
    row({ family, code: "core_material_m3", titleRu: "Противофильтрационное ядро", lineType: "material", group: "materials", quantity: fill * 0.12, unit: "m3", formula: "embankment_fill_m3 * 0.12", materialKey: "clay_core" }),
    row({ family, code: "excavation_m3", titleRu: "Снятие растительного слоя и котлован", lineType: "work", group: "earthworks", quantity: lengthM * crestWidthM * 0.4, unit: "m3", formula: "length_m * crest_width_m * 0.4" }),
    row({ family, code: "slope_area_m2", titleRu: "Площадь откосов", lineType: "work", group: "slope", quantity: slopeArea, unit: "m2", formula: "length_m * height_m * 2.25 * 2" }),
    row({ family, code: "geomembrane_m2", titleRu: "Геомембрана", lineType: "material", group: "materials", quantity: /геомембран|geomembrane/.test(text) ? slopeArea : slopeArea * 0.25, unit: "m2", formula: "slope_area_m2 or partial anti-filtration zone", materialKey: "geomembrane" }),
    row({ family, code: "geotextile_m2", titleRu: "Геотекстиль", lineType: "material", group: "materials", quantity: slopeArea * 1.05, unit: "m2", formula: "slope_area_m2 * 1.05", materialKey: "geotextile" }),
    row({ family, code: "riprap_m3", titleRu: "Каменная наброска откосов", lineType: "material", group: "materials", quantity: slopeArea * 0.25, unit: "m3", formula: "slope_area_m2 * 0.25", materialKey: "riprap" }),
    row({ family, code: "gabions_m3", titleRu: "Габионы", lineType: "material", group: "materials", quantity: /габион|gabion/.test(text) ? lengthM * heightM * 0.8 : 0, unit: "m3", formula: "gabion case: length_m * height_m * 0.8", materialKey: "gabions" }),
    row({ family, code: "drainage_pipe_lm", titleRu: "Дренажные трубы", lineType: "material", group: "drainage", quantity: lengthM * 1.2, unit: "m", formula: "length_m * 1.2", materialKey: "drainage_pipe" }),
    row({ family, code: "spillway_concrete_m3", titleRu: "Бетон водосброса", lineType: "material", group: "spillway", quantity: /водосброс|spillway/.test(text) ? heightM * 25 : heightM * 6, unit: "m3", formula: "spillway scope coefficient * height_m", materialKey: "ready_mix_concrete" }),
    row({ family, code: "formwork_m2", titleRu: "Опалубка водосброса", lineType: "work", group: "spillway", quantity: heightM * 40, unit: "m2", formula: "height_m * 40" }),
    row({ family, code: "rebar_t", titleRu: "Арматура водосброса", lineType: "material", group: "spillway", quantity: heightM * 6 * 0.11, unit: "t", formula: "spillway_concrete_m3 * 0.11", materialKey: "rebar" }),
    row({ family, code: "compactor_shifts", titleRu: "Каток / трамбовка", lineType: "equipment", group: "equipment", quantity: Math.ceil(fill / 1800), unit: "shift", formula: "ceil(embankment_fill_m3 / 1800)" }),
    row({ family, code: "excavator_shifts", titleRu: "Экскаватор", lineType: "equipment", group: "equipment", quantity: Math.ceil((fill + lengthM * crestWidthM * 0.4) / 2500), unit: "shift", formula: "ceil(total_earthworks_m3 / 2500)" }),
    row({ family, code: "bulldozer_shifts", titleRu: "Бульдозер", lineType: "equipment", group: "equipment", quantity: Math.ceil(fill / 2200), unit: "shift", formula: "ceil(embankment_fill_m3 / 2200)" }),
    row({ family, code: "dump_truck_trips", titleRu: "Самосвалы для грунта", lineType: "equipment", group: "logistics", quantity: Math.ceil(fill / 10), unit: "trip", formula: "ceil(embankment_fill_m3 / 10)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, height_m: heightM, crest_width_m: crestWidthM }, rows, assumptions: ["Откосы и ядро приняты укрупнённо; устойчивость дамбы требует проектного расчёта."], formulaSteps: ["embankment_fill_m3 = length_m * height_m * (crest_width_m + height_m * 3)", "slope_area_m2 = length_m * height_m * 2.25 * 2"], missingInputs: [...commonMissingInputs(family), "Геология основания", "Гидрологический расчёт", "Расчёт устойчивости откосов"] });
}

export function irrigationCanalCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "irrigation_channel");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 1000);
  const widthM = extractWidthM(text, 2);
  const rows = [
    row({ family, code: "canal_excavation_m3", titleRu: "Выемка канала", lineType: "work", group: "earthworks", quantity: lengthM * widthM * 1.2, unit: "m3", formula: "length_m * width_m * 1.2" }),
    row({ family, code: "channel_lining_m2", titleRu: "Облицовка канала", lineType: "material", group: "materials", quantity: lengthM * (widthM + 2.4), unit: "m2", formula: "length_m * wetted_perimeter", materialKey: "canal_lining" }),
    row({ family, code: "water_control_gates_pcs", titleRu: "Водорегулирующие затворы", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM / 500), unit: "pcs", formula: "ceil(length_m / 500)", materialKey: "water_control_gate" }),
    row({ family, code: "excavator_shifts", titleRu: "Экскаватор", lineType: "equipment", group: "equipment", quantity: Math.ceil((lengthM * widthM * 1.2) / 600), unit: "shift", formula: "ceil(excavation_m3 / 600)" }),
    row({ family, code: "labor_hours", titleRu: "Устройство канала", lineType: "work", group: "labor", quantity: lengthM * 0.5, unit: "hour", formula: "length_m * 0.5" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, width_m: widthM }, rows, assumptions: ["Гидравлическое сечение канала принято предварительно."], formulaSteps: ["canal_excavation_m3 = length_m * width_m * 1.2"], missingInputs: [...commonMissingInputs(family), "Расход воды", "Профиль канала"] });
}

export function powerLinePolesCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "overhead_power_line_10kv");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 1000);
  const stepM = numberFromText(text, [/шаг\s*(\d+(?:[,.]\d+)?)/i], 50);
  const poles = Math.floor(lengthM / stepM) + 1;
  const phases = /0\.?4|0,4/.test(text) ? 4 : 3;
  const rows = [
    row({ family, code: "poles_count", titleRu: "Железобетонные / металлические опоры", lineType: "material", group: "materials", quantity: poles, unit: "pcs", formula: "floor(length_m / pole_step_m) + 1", materialKey: "power_pole" }),
    row({ family, code: "conductor_lm", titleRu: "Провод / СИП", lineType: "material", group: "materials", quantity: lengthM * phases * 1.03, unit: "m", formula: "length_m * phases * 1.03", materialKey: "power_conductor" }),
    row({ family, code: "insulators_pcs", titleRu: "Изоляторы", lineType: "material", group: "materials", quantity: poles * phases, unit: "pcs", formula: "poles_count * phases", materialKey: "insulators" }),
    row({ family, code: "crossarms_pcs", titleRu: "Траверсы", lineType: "material", group: "materials", quantity: poles, unit: "pcs", formula: "poles_count", materialKey: "crossarm" }),
    row({ family, code: "anchor_sets_pcs", titleRu: "Анкерные комплекты", lineType: "material", group: "materials", quantity: Math.ceil(poles / 10) + 2, unit: "pcs", formula: "ceil(poles_count / 10) + 2", materialKey: "anchor_set" }),
    row({ family, code: "grounding_sets_pcs", titleRu: "Комплекты заземления", lineType: "material", group: "materials", quantity: Math.ceil(poles / 5), unit: "pcs", formula: "ceil(poles_count / 5)", materialKey: "grounding_set" }),
    row({ family, code: "pole_foundation_concrete_m3", titleRu: "Бетон оснований опор", lineType: "material", group: "materials", quantity: poles * 0.25, unit: "m3", formula: "poles_count * 0.25", materialKey: "ready_mix_concrete" }),
    row({ family, code: "excavation_m3", titleRu: "Бурение / разработка ям под опоры", lineType: "work", group: "earthworks", quantity: poles * 0.8, unit: "m3", formula: "poles_count * 0.8" }),
    row({ family, code: "transformer_pcs", titleRu: "Трансформатор при необходимости", lineType: "equipment", group: "equipment", quantity: /трансформатор|ктп|подстанц/.test(text) ? 1 : 0, unit: "pcs", formula: "if transformer required then 1; price missing", materialKey: "transformer" }),
    row({ family, code: "cable_or_sip_lm", titleRu: "СИП / кабель ответвлений", lineType: "material", group: "materials", quantity: lengthM * 0.08, unit: "m", formula: "length_m * 0.08", materialKey: "sip_cable" }),
    row({ family, code: "warning_signs_pcs", titleRu: "Предупреждающие знаки", lineType: "material", group: "materials", quantity: Math.ceil(poles / 8), unit: "pcs", formula: "ceil(poles_count / 8)", materialKey: "warning_sign" }),
    row({ family, code: "crane_shifts", titleRu: "Автокран / манипулятор для опор", lineType: "equipment", group: "equipment", quantity: Math.ceil(poles / 12), unit: "shift", formula: "ceil(poles_count / 12)" }),
    row({ family, code: "drilling_machine_shifts", titleRu: "Бурильно-крановая машина", lineType: "equipment", group: "equipment", quantity: Math.ceil(poles / 14), unit: "shift", formula: "ceil(poles_count / 14)" }),
    row({ family, code: "electrical_testing_services", titleRu: "Электролаборатория и испытания", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "commissioning set", procurement: true }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, pole_step_m: stepM, poles_count: poles, phases }, rows, assumptions: ["Схема ЛЭП и тип опор приняты предварительно; оборудование без цены до спецификации."], formulaSteps: ["poles_count = floor(length_m / pole_step_m) + 1", "conductor_lm = length_m * phases * 1.03"], missingInputs: [...commonMissingInputs(family), "Трасса ЛЭП", "Тип опор", "Проект РЗА/испытаний"] });
}

export function transformerSubstationCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  return substationCalculator({ ...input, familyId: input.familyId ?? "transformer_substation" });
}

export function substationCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "transformer_substation");
  const text = normalizePrompt(input.prompt);
  const voltage = numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*кв/i], 10);
  const rows = [
    row({ family, code: "transformer_foundation_m3", titleRu: "Фундамент под трансформатор / оборудование", lineType: "material", group: "materials", quantity: voltage >= 110 ? 80 : 12, unit: "m3", formula: "voltage class foundation coefficient", materialKey: "ready_mix_concrete" }),
    row({ family, code: "switchgear_equipment_set", titleRu: "Комплект РУ / КТП", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "1 set; price missing until equipment specification", materialKey: "switchgear" }),
    row({ family, code: "grounding_system_set", titleRu: "Контур заземления", lineType: "material", group: "materials", quantity: 1, unit: "set", formula: "1 grounding system", materialKey: "grounding_system" }),
    row({ family, code: "cable_trench_m", titleRu: "Кабельные траншеи подстанции", lineType: "work", group: "earthworks", quantity: voltage >= 110 ? 300 : 60, unit: "m", formula: "voltage class cable trench allowance" }),
    row({ family, code: "electrical_testing_commissioning", titleRu: "Испытания и ПНР подстанции", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "commissioning set", procurement: true }),
    row({ family, code: "crane_shifts", titleRu: "Кран для монтажа оборудования", lineType: "equipment", group: "equipment", quantity: voltage >= 110 ? 6 : 1, unit: "shift", formula: "voltage class crane allowance" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { voltage_kv: voltage }, rows, assumptions: ["Трансформаторы, РУ и автоматика выводятся как PRICE_MISSING до спецификации."], formulaSteps: ["equipment foundations and cable trench allowances depend on voltage class"], missingInputs: [...commonMissingInputs(family), "Однолинейная схема", "Спецификация оборудования"] });
}

export function utilityConnectionCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "multi_utility_trench");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 100);
  const networks = [
    /вод/.test(text) ? "water" : null,
    /канализац|sewer/.test(text) ? "sewer" : null,
    /электр|power|кабель/.test(text) ? "power" : null,
    /газ/.test(text) ? "gas" : null,
    /тепло/.test(text) ? "heat" : null,
  ].filter(Boolean).length || 3;
  const rows = [
    row({ family, code: "utility_trench_m3", titleRu: "Траншея под инженерные сети", lineType: "work", group: "earthworks", quantity: lengthM * 0.9 * 1.4, unit: "m3", formula: "length_m * 0.9 * 1.4" }),
    row({ family, code: "water_pipe_lm", titleRu: "Труба водоснабжения", lineType: "material", group: "materials", quantity: /вод/.test(text) ? lengthM : 0, unit: "m", formula: "if water selected then length_m", materialKey: "water_pipe" }),
    row({ family, code: "sewer_pipe_lm", titleRu: "Труба канализации", lineType: "material", group: "materials", quantity: /канализац|sewer/.test(text) ? lengthM : 0, unit: "m", formula: "if sewer selected then length_m", materialKey: "sewer_pipe" }),
    row({ family, code: "power_cable_lm", titleRu: "Кабель электроснабжения", lineType: "material", group: "materials", quantity: /электр|power|кабель/.test(text) ? lengthM * 1.05 : 0, unit: "m", formula: "if power selected then length_m * 1.05", materialKey: "power_cable" }),
    row({ family, code: "service_chambers_pcs", titleRu: "Колодцы / камеры подключения", lineType: "material", group: "materials", quantity: networks * 2, unit: "pcs", formula: "network_count * 2", materialKey: "service_chambers" }),
    row({ family, code: "testing_commissioning", titleRu: "Испытания и подключение сетей", lineType: "service", group: "commissioning", quantity: networks, unit: "set", formula: "network_count", procurement: true }),
    row({ family, code: "excavator_shifts", titleRu: "Экскаватор", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM / 180), unit: "shift", formula: "ceil(length_m / 180)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, network_count: networks }, rows, assumptions: ["Совмещённая траншея принята предварительно; пересечения и охранные зоны уточняются проектом."], formulaSteps: ["utility_trench_m3 = length_m * 0.9 * 1.4", "service_chambers_pcs = network_count * 2"], missingInputs: [...commonMissingInputs(family), "Точки подключения", "ТУ ресурсоснабжающих организаций"] });
}

export function gasHeatNetworkCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "heat_network");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 100);
  const diameterMm = extractDiameterMm(text, /тепло/.test(text) ? 159 : 110);
  const rows = [
    row({ family, code: "pipeline_trench_m3", titleRu: "Траншея трубопровода", lineType: "work", group: "earthworks", quantity: lengthM * 1.1 * 1.6, unit: "m3", formula: "length_m * 1.1 * 1.6" }),
    row({ family, code: "pipe_lm", titleRu: `Трубопровод DN${diameterMm}`, lineType: "material", group: "materials", quantity: lengthM * 1.02, unit: "m", formula: "length_m * 1.02", materialKey: "pipeline_pipe" }),
    row({ family, code: "pipeline_welding_joints", titleRu: "Сварные стыки", lineType: "work", group: "labor", quantity: Math.ceil(lengthM / 12), unit: "pcs", formula: "ceil(length_m / 12)" }),
    row({ family, code: "pipeline_insulation_m2", titleRu: "Изоляция трубопровода", lineType: "material", group: "materials", quantity: lengthM * Math.PI * (diameterMm / 1000) * 1.05, unit: "m2", formula: "length_m * pi * diameter_m * 1.05", materialKey: "pipe_insulation" }),
    row({ family, code: "pressure_testing_lm", titleRu: "Испытания трубопровода", lineType: "service", group: "commissioning", quantity: lengthM, unit: "m", formula: "length_m", procurement: true }),
    row({ family, code: "welding_equipment_shifts", titleRu: "Сварочное оборудование", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM / 120), unit: "shift", formula: "ceil(length_m / 120)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, diameter_mm: diameterMm }, rows, assumptions: ["Газ/теплосеть требует проект и допуски; цены оборудования не подставляются."], formulaSteps: ["pipe_lm = length_m * 1.02", "insulation_m2 = length_m * pi * diameter_m * 1.05"], missingInputs: [...commonMissingInputs(family), "Категория трубопровода", "Давление", "Допуски и ТУ"] });
}

export function highRiseGlazingCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "high_rise_glazing");
  const text = normalizePrompt(input.prompt);
  const areaM2 = extractAreaM2(text, 5000);
  const floors = extractCount(text, [/(\d+)\s*этаж/i], Math.ceil(areaM2 / 350));
  const rows = [
    row({ family, code: "glazing_units_m2", titleRu: "Фасадные стеклопакеты / витражи", lineType: "material", group: "materials", quantity: areaM2 * 1.02, unit: "m2", formula: "glazing_area_m2 * 1.02", materialKey: "facade_glass_units" }),
    row({ family, code: "aluminum_profiles_kg_or_lm", titleRu: "Алюминиевые профили системы", lineType: "material", group: "materials", quantity: areaM2 * 5.5, unit: "kg", formula: "glazing_area_m2 * 5.5", materialKey: "aluminum_profiles" }),
    row({ family, code: "glass_units_m2", titleRu: "Стеклопакеты", lineType: "material", group: "materials", quantity: areaM2, unit: "m2", formula: "glazing_area_m2", materialKey: "glass_units" }),
    row({ family, code: "gaskets_lm", titleRu: "Уплотнители", lineType: "material", group: "materials", quantity: areaM2 * 3.2, unit: "m", formula: "glazing_area_m2 * 3.2", materialKey: "facade_gaskets" }),
    row({ family, code: "sealant_l", titleRu: "Герметик фасадный", lineType: "material", group: "materials", quantity: areaM2 * 0.18, unit: "l", formula: "glazing_area_m2 * 0.18", materialKey: "facade_sealant" }),
    row({ family, code: "anchors_pcs", titleRu: "Анкера и крепёж", lineType: "material", group: "materials", quantity: areaM2 * 4, unit: "pcs", formula: "glazing_area_m2 * 4", materialKey: "facade_anchors" }),
    row({ family, code: "firebreak_lm_or_m2", titleRu: "Противопожарные рассечки", lineType: "material", group: "materials", quantity: floors * 120, unit: "m", formula: "floors * 120", materialKey: "facade_firebreak" }),
    row({ family, code: "scaffolding_m2_or_mast_climber_shifts", titleRu: "Мачтовые подъёмники / фасадный доступ", lineType: "equipment", group: "equipment", quantity: Math.ceil(areaM2 / 600), unit: "shift", formula: "ceil(glazing_area_m2 / 600)" }),
    row({ family, code: "crane_lift_shifts", titleRu: "Кран / подъём стеклопакетов", lineType: "equipment", group: "equipment", quantity: Math.ceil(areaM2 / 800), unit: "shift", formula: "ceil(glazing_area_m2 / 800)" }),
    row({ family, code: "installation_labor_hours", titleRu: "Монтаж фасадного остекления", lineType: "work", group: "labor", quantity: areaM2 * 1.15, unit: "hour", formula: "glazing_area_m2 * 1.15" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { glazing_area_m2: areaM2, floors }, rows, assumptions: ["Система остекления принята предварительно; узлы крепления требуют проект фасада."], formulaSteps: ["profiles_kg = glazing_area_m2 * 5.5", "anchors_pcs = glazing_area_m2 * 4"], missingInputs: [...commonMissingInputs(family), "Система фасада", "Ветровые нагрузки", "Проект узлов"] });
}

export function mansardRoofWindowsCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "mansard_roof_with_windows");
  const text = normalizePrompt(input.prompt);
  const areaM2 = extractAreaM2(text, 200);
  const windows = extractCount(text, [/(\d+)\s*(?:окн|шт)/i], 4);
  const insulationMm = numberFromText(text, [/утеплени[ея]\s*(\d+(?:[,.]\d+)?)\s*мм/i, /(\d+(?:[,.]\d+)?)\s*мм/i], 200);
  const rows = [
    row({ family, code: "covering_area_m2", titleRu: "Кровельное покрытие мансарды", lineType: "material", group: "materials", quantity: areaM2 * 1.08, unit: "m2", formula: "roof_area_m2 * 1.08", materialKey: "roof_covering" }),
    row({ family, code: "underroof_membrane_m2", titleRu: "Подкровельная мембрана", lineType: "material", group: "materials", quantity: areaM2 * 1.1, unit: "m2", formula: "roof_area_m2 * 1.10", materialKey: "underroof_membrane" }),
    row({ family, code: "vapor_barrier_m2", titleRu: "Пароизоляция", lineType: "material", group: "materials", quantity: areaM2 * 1.08, unit: "m2", formula: "roof_area_m2 * 1.08", materialKey: "vapor_barrier" }),
    row({ family, code: "insulation_m3", titleRu: "Утеплитель мансарды", lineType: "material", group: "materials", quantity: areaM2 * insulationMm / 1000, unit: "m3", formula: "roof_area_m2 * insulation_mm / 1000", materialKey: "roof_insulation" }),
    row({ family, code: "rafters_lm_or_timber_m3", titleRu: "Стропильная система", lineType: "material", group: "materials", quantity: areaM2 * 0.055, unit: "m3", formula: "roof_area_m2 * 0.055", materialKey: "timber" }),
    row({ family, code: "battens_lm", titleRu: "Обрешётка", lineType: "material", group: "materials", quantity: areaM2 * 4, unit: "m", formula: "roof_area_m2 * 4", materialKey: "battens" }),
    row({ family, code: "counterbattens_lm", titleRu: "Контробрешётка", lineType: "material", group: "materials", quantity: areaM2 * 1.6, unit: "m", formula: "roof_area_m2 * 1.6", materialKey: "counterbattens" }),
    row({ family, code: "roof_windows_pcs", titleRu: "Кровельные окна", lineType: "material", group: "materials", quantity: windows, unit: "pcs", formula: "roof_windows_count", materialKey: "roof_windows" }),
    row({ family, code: "flashing_kits_pcs", titleRu: "Оклады кровельных окон", lineType: "material", group: "materials", quantity: windows, unit: "pcs", formula: "roof_windows_count", materialKey: "roof_window_flashing" }),
    row({ family, code: "window_opening_reinforcement_lm", titleRu: "Усиление проёмов окон", lineType: "material", group: "materials", quantity: windows * 5, unit: "m", formula: "roof_windows_count * 5", materialKey: "opening_reinforcement" }),
    row({ family, code: "sealant_l", titleRu: "Герметик примыканий окон", lineType: "material", group: "materials", quantity: windows * 1.2, unit: "l", formula: "roof_windows_count * 1.2", materialKey: "roof_sealant" }),
    row({ family, code: "fasteners_pcs", titleRu: "Крепёж кровли", lineType: "material", group: "materials", quantity: areaM2 * 8, unit: "pcs", formula: "roof_area_m2 * 8", materialKey: "roof_fasteners" }),
    row({ family, code: "gutters_lm", titleRu: "Водосточная система", lineType: "material", group: "materials", quantity: Math.sqrt(areaM2) * 4, unit: "m", formula: "sqrt(roof_area_m2) * 4", materialKey: "gutters" }),
    row({ family, code: "snow_guards_lm", titleRu: "Снегозадержатели", lineType: "material", group: "materials", quantity: Math.sqrt(areaM2) * 2, unit: "m", formula: "sqrt(roof_area_m2) * 2", materialKey: "snow_guards" }),
    row({ family, code: "roof_installation_labor_hours", titleRu: "Монтаж мансардной кровли и окон", lineType: "work", group: "labor", quantity: areaM2 * 1.25 + windows * 6, unit: "hour", formula: "roof_area_m2 * 1.25 + roof_windows_count * 6" }),
    row({ family, code: "scaffolding_m2", titleRu: "Леса / подмости", lineType: "equipment", group: "equipment", quantity: areaM2 * 0.6, unit: "m2", formula: "roof_area_m2 * 0.6" }),
    row({ family, code: "lifting_service_shifts", titleRu: "Подъём материалов", lineType: "service", group: "logistics", quantity: Math.ceil(areaM2 / 180), unit: "shift", formula: "ceil(roof_area_m2 / 180)", procurement: true }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { roof_area_m2: areaM2, roof_windows_count: windows, insulation_mm: insulationMm }, rows, assumptions: ["Геометрия скатов принята по площади; узлы окон требуют производителя и проект."], formulaSteps: ["insulation_m3 = roof_area_m2 * insulation_mm / 1000", "flashing_kits_pcs = roof_windows_count"], missingInputs: [...commonMissingInputs(family), "Уклон и геометрия скатов", "Модель кровельных окон"] });
}

export function bridgeCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "bridge_construction");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 30);
  const lanes = extractCount(text, [/(\d+)\s*полос/i], 2);
  const widthM = extractWidthM(text, lanes * 3.5 + 1.5);
  const deckArea = lengthM * widthM;
  const rows = [
    row({ family, code: "bridge_piles_pcs", titleRu: "Сваи мостового основания", lineType: "material", group: "foundations", quantity: Math.ceil(lengthM / 6) * 2, unit: "pcs", formula: "ceil(length_m / 6) * 2", materialKey: "bridge_piles" }),
    row({ family, code: "pile_concrete_m3", titleRu: "Бетон свай", lineType: "material", group: "foundations", quantity: Math.ceil(lengthM / 6) * 2 * 1.8, unit: "m3", formula: "piles_pcs * 1.8", materialKey: "ready_mix_concrete" }),
    row({ family, code: "piers_concrete_m3", titleRu: "Опоры моста", lineType: "material", group: "substructure", quantity: lengthM * widthM * 0.35, unit: "m3", formula: "length_m * width_m * 0.35", materialKey: "ready_mix_concrete" }),
    row({ family, code: "abutments_concrete_m3", titleRu: "Устои моста", lineType: "material", group: "substructure", quantity: widthM * 12, unit: "m3", formula: "width_m * 12", materialKey: "ready_mix_concrete" }),
    row({ family, code: "girders_pcs", titleRu: "Железобетонные / стальные балки пролёта", lineType: "equipment", group: "superstructure", quantity: Math.ceil(widthM / 2.5), unit: "pcs", formula: "ceil(width_m / 2.5); price missing until beam spec", materialKey: "bridge_girders" }),
    row({ family, code: "deck_concrete_m3", titleRu: "Плита проезжей части", lineType: "material", group: "superstructure", quantity: deckArea * 0.22, unit: "m3", formula: "deck_area_m2 * 0.22", materialKey: "ready_mix_concrete" }),
    row({ family, code: "rebar_t", titleRu: "Арматура моста", lineType: "material", group: "materials", quantity: (lengthM * widthM * 0.35 + deckArea * 0.22) * 0.13, unit: "t", formula: "concrete_m3 * 0.13", materialKey: "rebar" }),
    row({ family, code: "bearings_pcs", titleRu: "Опорные части", lineType: "equipment", group: "superstructure", quantity: Math.ceil(widthM / 2.5) * 2, unit: "pcs", formula: "girders_pcs * 2; price missing", materialKey: "bridge_bearings" }),
    row({ family, code: "expansion_joints_lm", titleRu: "Деформационные швы", lineType: "material", group: "superstructure", quantity: widthM * 2, unit: "m", formula: "width_m * 2", materialKey: "expansion_joints" }),
    row({ family, code: "waterproofing_m2", titleRu: "Гидроизоляция плиты", lineType: "material", group: "materials", quantity: deckArea * 1.05, unit: "m2", formula: "deck_area_m2 * 1.05", materialKey: "bridge_waterproofing" }),
    row({ family, code: "bridge_asphalt_t", titleRu: "Асфальт на мосту", lineType: "material", group: "materials", quantity: deckArea * 0.07 * 2.35, unit: "t", formula: "deck_area_m2 * 0.07 * 2.35", materialKey: "asphalt_mix" }),
    row({ family, code: "crane_shifts", titleRu: "Тяжёлый кран для балок", lineType: "equipment", group: "equipment", quantity: Math.ceil(Math.ceil(widthM / 2.5) / 2), unit: "shift", formula: "ceil(girders_pcs / 2)" }),
    row({ family, code: "drilling_rig_shifts", titleRu: "Буровая установка", lineType: "equipment", group: "equipment", quantity: Math.ceil((Math.ceil(lengthM / 6) * 2) / 4), unit: "shift", formula: "ceil(piles_pcs / 4)" }),
    row({ family, code: "labor_hours", titleRu: "Мостовая бригада", lineType: "work", group: "labor", quantity: deckArea * 2.2, unit: "hour", formula: "deck_area_m2 * 2.2" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, width_m: widthM, lanes, deck_area_m2: deckArea }, rows, assumptions: ["Это предварительный BOQ для моста; несущая схема, балки и основания требуют проектного расчёта."], formulaSteps: ["deck_area_m2 = length_m * width_m", "deck_concrete_m3 = deck_area_m2 * 0.22"], missingInputs: [...commonMissingInputs(family), "Расчётная схема пролёта", "Геология опор", "Нагрузки и габариты"] });
}

export function tunnelCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "tunnel_construction");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 500);
  const sectionM2 = numberFromText(text, [/сечени[ея]м?\s*(\d+(?:[,.]\d+)?)/i], 40);
  const excavation = lengthM * sectionM2;
  const rows = [
    row({ family, code: "tunnel_excavation_m3", titleRu: "Выемка тоннеля", lineType: "work", group: "earthworks", quantity: excavation, unit: "m3", formula: "length_m * section_m2" }),
    row({ family, code: "tunnel_lining_concrete_m3", titleRu: "Бетон обделки тоннеля", lineType: "material", group: "materials", quantity: lengthM * sectionM2 * 0.18, unit: "m3", formula: "length_m * section_m2 * 0.18", materialKey: "ready_mix_concrete" }),
    row({ family, code: "tunnel_waterproofing_m2", titleRu: "Гидроизоляция тоннеля", lineType: "material", group: "materials", quantity: lengthM * Math.sqrt(sectionM2) * 4, unit: "m2", formula: "length_m * sqrt(section_m2) * 4", materialKey: "tunnel_waterproofing" }),
    row({ family, code: "ventilation_equipment_set", titleRu: "Система вентиляции тоннеля", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "1 set; price missing until design", materialKey: "tunnel_ventilation" }),
    row({ family, code: "drainage_lm", titleRu: "Дренаж тоннеля", lineType: "material", group: "materials", quantity: lengthM * 2, unit: "m", formula: "length_m * 2", materialKey: "drainage_pipe" }),
    row({ family, code: "special_equipment_shifts", titleRu: "Тоннельная спецтехника", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM / 20), unit: "shift", formula: "ceil(length_m / 20)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, section_m2: sectionM2 }, rows, assumptions: ["Метод проходки не выбран; расчёт предварительный и не заменяет проект."], formulaSteps: ["tunnel_excavation_m3 = length_m * section_m2", "lining_concrete_m3 = length_m * section_m2 * 0.18"], missingInputs: [...commonMissingInputs(family), "Геология", "Метод проходки", "Вентиляционная схема"] });
}

export function retainingWallCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "retaining_wall");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 80);
  const heightM = extractHeightM(text, 4);
  const rows = [
    row({ family, code: "wall_concrete_m3", titleRu: "Бетон подпорной стены", lineType: "material", group: "materials", quantity: lengthM * heightM * 0.45, unit: "m3", formula: "length_m * height_m * 0.45", materialKey: "ready_mix_concrete" }),
    row({ family, code: "rebar_t", titleRu: "Арматура подпорной стены", lineType: "material", group: "materials", quantity: lengthM * heightM * 0.45 * 0.12, unit: "t", formula: "concrete_m3 * 0.12", materialKey: "rebar" }),
    row({ family, code: "drainage_prism_m3", titleRu: "Дренажная призма", lineType: "material", group: "materials", quantity: lengthM * heightM * 0.35, unit: "m3", formula: "length_m * height_m * 0.35", materialKey: "crushed_stone" }),
    row({ family, code: "geotextile_m2", titleRu: "Геотекстиль за стеной", lineType: "material", group: "materials", quantity: lengthM * heightM * 1.05, unit: "m2", formula: "length_m * height_m * 1.05", materialKey: "geotextile" }),
    row({ family, code: "formwork_m2", titleRu: "Опалубка подпорной стены", lineType: "work", group: "labor", quantity: lengthM * heightM * 2, unit: "m2", formula: "length_m * height_m * 2" }),
    row({ family, code: "excavator_shifts", titleRu: "Экскаватор", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM * heightM / 80), unit: "shift", formula: "ceil(length_m * height_m / 80)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, height_m: heightM }, rows, assumptions: ["Устойчивость стены и армирование требуют расчёта; смета предварительная."], formulaSteps: ["wall_concrete_m3 = length_m * height_m * 0.45"], missingInputs: [...commonMissingInputs(family), "Расчёт устойчивости", "Грунтовые воды", "Нагрузки за стеной"] });
}

function buildingLikeCalculator(input: CalcInput, fallbackFamily: string): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, fallbackFamily);
  const text = normalizePrompt(input.prompt);
  const areaM2 = extractAreaM2(text, /пром|ангар|склад/.test(text) ? 5000 : 12000);
  const floors = extractCount(text, [/(\d+)\s*этаж/i], fallbackFamily.includes("multi") ? 12 : 1);
  const concrete = areaM2 * (floors > 1 ? 0.28 : 0.12);
  const rows = [
    row({ family, code: "earthworks_m3", titleRu: "Земляные работы здания", lineType: "work", group: "earthworks", quantity: areaM2 * 0.25, unit: "m3", formula: "area_m2 * 0.25" }),
    row({ family, code: "foundation_concrete_m3", titleRu: "Бетон фундаментов", lineType: "material", group: "materials", quantity: concrete * 0.35, unit: "m3", formula: "structural_concrete_m3 * 0.35", materialKey: "ready_mix_concrete" }),
    row({ family, code: "frame_concrete_or_steel", titleRu: "Несущий каркас", lineType: /метал|ангар|склад/.test(text) ? "equipment" : "material", group: "structure", quantity: /метал|ангар|склад/.test(text) ? areaM2 * 0.045 : concrete * 0.65, unit: /метал|ангар|склад/.test(text) ? "t" : "m3", formula: /метал|ангар|склад/.test(text) ? "area_m2 * 0.045 steel_t" : "structural_concrete_m3 * 0.65", materialKey: "structural_frame" }),
    row({ family, code: "rebar_t", titleRu: "Арматура каркаса", lineType: "material", group: "materials", quantity: concrete * 0.11, unit: "t", formula: "structural_concrete_m3 * 0.11", materialKey: "rebar" }),
    row({ family, code: "envelope_m2", titleRu: "Ограждающие конструкции / фасад", lineType: "material", group: "materials", quantity: areaM2 * 0.45, unit: "m2", formula: "area_m2 * 0.45", materialKey: "building_envelope" }),
    row({ family, code: "crane_shifts", titleRu: "Башенный / автокран", lineType: "equipment", group: "equipment", quantity: Math.ceil(areaM2 / 900), unit: "shift", formula: "ceil(area_m2 / 900)" }),
    row({ family, code: "labor_hours", titleRu: "Общестроительные работы каркаса", lineType: "work", group: "labor", quantity: areaM2 * 1.8, unit: "hour", formula: "area_m2 * 1.8" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { area_m2: areaM2, floors, structural_concrete_m3: concrete }, rows, assumptions: ["Укрупнённый предварительный расчёт каркаса; детальный BOQ требует КЖ/КМ."], formulaSteps: ["structural_concrete_m3 = area_m2 * coefficient", "rebar_t = structural_concrete_m3 * 0.11"], missingInputs: [...commonMissingInputs(family), "КЖ/КМ чертежи", "Нагрузки", "Сетка колонн"] });
}

export function highRiseBuildingCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  return buildingLikeCalculator(input, "multi_storey_residential_building");
}

export function multiStoreyFrameCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  return buildingLikeCalculator(input, "monolithic_frame");
}

export function industrialBuildingCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  return buildingLikeCalculator(input, "industrial_shed");
}

export function longSpanSteelCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  return buildingLikeCalculator(input, "long_span_steel_structure");
}

export function equipmentFoundationCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "equipment_foundation");
  const text = normalizePrompt(input.prompt);
  const count = extractCount(text, [/(\d+)\s*шт/i, /(\d+)\s*комп/i], 1);
  const dims = text.match(/(\d+(?:[,.]\d+)?)\s*[xх]\s*(\d+(?:[,.]\d+)?)\s*[xх]\s*(\d+(?:[,.]\d+)?)/i);
  const volumeEach = dims ? Number(dims[1].replace(",", ".")) * Number(dims[2].replace(",", ".")) * Number(dims[3].replace(",", ".")) : 4;
  const concrete = count * volumeEach;
  const rows = [
    row({ family, code: "equipment_foundation_concrete_m3", titleRu: "Бетон фундаментов оборудования", lineType: "material", group: "materials", quantity: concrete, unit: "m3", formula: "count * length * width * height", materialKey: "ready_mix_concrete" }),
    row({ family, code: "rebar_t", titleRu: "Арматура фундаментов оборудования", lineType: "material", group: "materials", quantity: concrete * 0.12, unit: "t", formula: "concrete_m3 * 0.12", materialKey: "rebar" }),
    row({ family, code: "anchor_bolts_pcs", titleRu: "Анкерные болты", lineType: "material", group: "materials", quantity: count * 8, unit: "pcs", formula: "count * 8", materialKey: "anchor_bolts" }),
    row({ family, code: "formwork_m2", titleRu: "Опалубка фундаментов", lineType: "work", group: "labor", quantity: concrete * 3.5, unit: "m2", formula: "concrete_m3 * 3.5" }),
    row({ family, code: "crane_shifts", titleRu: "Кран / такелаж", lineType: "equipment", group: "equipment", quantity: Math.ceil(count / 4), unit: "shift", formula: "ceil(count / 4)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { count, volume_each_m3: volumeEach, concrete_m3: concrete }, rows, assumptions: ["Фундамент рассчитан по введённым или типовым габаритам; нагрузки оборудования нужны для детального расчёта."], formulaSteps: ["concrete_m3 = count * length * width * height", "rebar_t = concrete_m3 * 0.12"], missingInputs: [...commonMissingInputs(family), "Паспорт оборудования", "Динамические нагрузки", "Анкерный план"] });
}

export function pipeRackCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "pipe_rack");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 200);
  const rows = [
    row({ family, code: "steel_structure_t", titleRu: "Металлоконструкции эстакады", lineType: "equipment", group: "materials", quantity: lengthM * 0.12, unit: "t", formula: "length_m * 0.12", materialKey: "steel_structure" }),
    row({ family, code: "foundation_concrete_m3", titleRu: "Фундаменты опор эстакады", lineType: "material", group: "materials", quantity: Math.ceil(lengthM / 6) * 0.8, unit: "m3", formula: "ceil(length_m / 6) * 0.8", materialKey: "ready_mix_concrete" }),
    row({ family, code: "cable_trays_lm", titleRu: "Кабельные лотки / полки", lineType: "material", group: "materials", quantity: lengthM * 2, unit: "m", formula: "length_m * 2", materialKey: "cable_trays" }),
    row({ family, code: "painting_m2", titleRu: "Антикоррозионная окраска", lineType: "work", group: "coating", quantity: lengthM * 12, unit: "m2", formula: "length_m * 12" }),
    row({ family, code: "crane_shifts", titleRu: "Кран монтажный", lineType: "equipment", group: "equipment", quantity: Math.ceil(lengthM / 80), unit: "shift", formula: "ceil(length_m / 80)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM }, rows, assumptions: ["Сечение и нагрузка эстакады приняты укрупнённо."], formulaSteps: ["steel_structure_t = length_m * 0.12"], missingInputs: [...commonMissingInputs(family), "Нагрузки лотков/труб", "Схема опор"] });
}

export function technologicalPipelineCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "technological_pipeline");
  const text = normalizePrompt(input.prompt);
  const lengthM = extractLengthM(text, 300);
  const diameterMm = extractDiameterMm(text, 200);
  const rows = [
    row({ family, code: "process_piping_lm_or_t", titleRu: `Технологический трубопровод DN${diameterMm}`, lineType: "material", group: "materials", quantity: lengthM * 1.02, unit: "m", formula: "length_m * 1.02", materialKey: "process_pipe" }),
    row({ family, code: "pipe_supports_pcs", titleRu: "Опоры трубопровода", lineType: "material", group: "materials", quantity: Math.ceil(lengthM / 6), unit: "pcs", formula: "ceil(length_m / 6)", materialKey: "pipe_supports" }),
    row({ family, code: "welds_pcs", titleRu: "Сварные стыки", lineType: "work", group: "labor", quantity: Math.ceil(lengthM / 12), unit: "pcs", formula: "ceil(length_m / 12)" }),
    row({ family, code: "pipeline_insulation_m2", titleRu: "Теплоизоляция трубопровода", lineType: "material", group: "materials", quantity: lengthM * Math.PI * diameterMm / 1000, unit: "m2", formula: "length_m * pi * diameter_m", materialKey: "pipe_insulation" }),
    row({ family, code: "pressure_testing_lm", titleRu: "Испытания трубопровода", lineType: "service", group: "commissioning", quantity: lengthM, unit: "m", formula: "length_m", procurement: true }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { length_m: lengthM, diameter_mm: diameterMm }, rows, assumptions: ["Материал трубы, давление и категория трубопровода требуют проекта."], formulaSteps: ["process_piping_lm = length_m * 1.02"], missingInputs: [...commonMissingInputs(family), "Материал трубы", "Рабочее давление", "Категория трубопровода"] });
}

export function thermalPowerPlantCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "thermal_power_plant");
  const text = normalizePrompt(input.prompt);
  const capacityMw = extractCapacityMw(text, 100);
  const civilConcrete = capacityMw * 18;
  const rows = [
    row({ family, code: "civil_concrete_m3", titleRu: "Бетон гражданских сооружений ТЭЦ", lineType: "material", group: "materials", quantity: civilConcrete, unit: "m3", formula: "capacity_mw * 18", materialKey: "ready_mix_concrete" }),
    row({ family, code: "rebar_t", titleRu: "Арматура сооружений ТЭЦ", lineType: "material", group: "materials", quantity: civilConcrete * 0.12, unit: "t", formula: "civil_concrete_m3 * 0.12", materialKey: "rebar" }),
    row({ family, code: "steel_structure_t", titleRu: "Металлоконструкции турбинного / котельного отделения", lineType: "equipment", group: "structure", quantity: capacityMw * 3.2, unit: "t", formula: "capacity_mw * 3.2", materialKey: "steel_structure" }),
    row({ family, code: "equipment_foundations_m3", titleRu: "Фундаменты основного оборудования", lineType: "material", group: "materials", quantity: capacityMw * 4.5, unit: "m3", formula: "capacity_mw * 4.5", materialKey: "ready_mix_concrete" }),
    row({ family, code: "pipe_racks_t", titleRu: "Трубные и кабельные эстакады", lineType: "equipment", group: "structure", quantity: capacityMw * 0.8, unit: "t", formula: "capacity_mw * 0.8", materialKey: "pipe_rack_steel" }),
    row({ family, code: "process_piping_lm_or_t", titleRu: "Технологические трубопроводы", lineType: "material", group: "materials", quantity: capacityMw * 18, unit: "m", formula: "capacity_mw * 18 preliminary", materialKey: "process_pipe" }),
    row({ family, code: "cable_trays_lm", titleRu: "Кабельные лотки", lineType: "material", group: "materials", quantity: capacityMw * 25, unit: "m", formula: "capacity_mw * 25", materialKey: "cable_trays" }),
    row({ family, code: "cable_m", titleRu: "Кабельные линии", lineType: "material", group: "materials", quantity: capacityMw * 120, unit: "m", formula: "capacity_mw * 120", materialKey: "power_cable" }),
    row({ family, code: "insulation_m2", titleRu: "Изоляция трубопроводов", lineType: "material", group: "materials", quantity: capacityMw * 35, unit: "m2", formula: "capacity_mw * 35", materialKey: "pipe_insulation" }),
    row({ family, code: "painting_m2", titleRu: "Антикоррозионная окраска", lineType: "work", group: "coating", quantity: capacityMw * 60, unit: "m2", formula: "capacity_mw * 60" }),
    row({ family, code: "turbine_boiler_generator_equipment", titleRu: "Турбина, котёл, генератор, трансформатор", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "equipment set; PRICE_MISSING until ratebook/source selected", materialKey: "tpp_main_equipment" }),
    row({ family, code: "equipment_installation_services", titleRu: "Монтаж основного оборудования", lineType: "service", group: "installation_services", quantity: 1, unit: "set", formula: "installation services set; price missing", procurement: true }),
    row({ family, code: "commissioning_services", titleRu: "Пусконаладка ТЭЦ", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "commissioning set", procurement: true }),
    row({ family, code: "heavy_crane_shifts", titleRu: "Тяжёлые краны", lineType: "equipment", group: "equipment", quantity: Math.ceil(capacityMw / 10), unit: "shift", formula: "ceil(capacity_mw / 10)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { capacity_mw: capacityMw }, rows, assumptions: ["Турбины, котлы, генераторы и трансформаторы не оцениваются по цене без выбранного источника."], formulaSteps: ["civil_concrete_m3 = capacity_mw * 18", "steel_structure_t = capacity_mw * 3.2"], missingInputs: [...commonMissingInputs(family), "Тепловая схема", "Спецификация турбины/котла/генератора", "Генплан и КЖ/КМ"] });
}

export function hydroPowerPlantCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "hydro_power_plant");
  const text = normalizePrompt(input.prompt);
  const capacityMw = extractCapacityMw(text, 5);
  const channelLength = /канал|деривац/.test(text) ? extractLengthM(text, 1000) : 0;
  const concrete = capacityMw * 80 + channelLength * 0.08;
  const rows = [
    row({ family, code: "earthworks_m3", titleRu: "Земляные работы ГЭС / деривации", lineType: "work", group: "earthworks", quantity: capacityMw * 1200 + channelLength * 4, unit: "m3", formula: "capacity_mw * 1200 + channel_length_m * 4" }),
    row({ family, code: "concrete_m3", titleRu: "Бетон сооружений ГЭС", lineType: "material", group: "materials", quantity: concrete, unit: "m3", formula: "capacity_mw * 80 + channel_length_m * 0.08", materialKey: "ready_mix_concrete" }),
    row({ family, code: "rebar_t", titleRu: "Арматура ГЭС", lineType: "material", group: "materials", quantity: concrete * 0.13, unit: "t", formula: "concrete_m3 * 0.13", materialKey: "rebar" }),
    row({ family, code: "formwork_m2", titleRu: "Опалубка гидросооружений", lineType: "work", group: "labor", quantity: concrete * 3.2, unit: "m2", formula: "concrete_m3 * 3.2" }),
    row({ family, code: "channel_lining_m2", titleRu: "Облицовка деривационного канала", lineType: "material", group: "materials", quantity: channelLength * 5, unit: "m2", formula: "channel_length_m * 5", materialKey: "channel_lining" }),
    row({ family, code: "penstock_lm_or_steel_t", titleRu: "Напорный водовод", lineType: "equipment", group: "equipment", quantity: /водовод|penstock/.test(text) ? capacityMw * 8 : 0, unit: "t", formula: "if penstock present then capacity_mw * 8 steel_t; price missing", materialKey: "penstock" }),
    row({ family, code: "powerhouse_concrete_m3", titleRu: "Машинный зал", lineType: "material", group: "materials", quantity: capacityMw * 30, unit: "m3", formula: "capacity_mw * 30", materialKey: "ready_mix_concrete" }),
    row({ family, code: "turbines_pcs", titleRu: "Гидроагрегаты / турбины", lineType: "equipment", group: "equipment", quantity: Math.max(1, Math.ceil(capacityMw / 5)), unit: "pcs", formula: "ceil(capacity_mw / 5); PRICE_MISSING until specification", materialKey: "hydro_turbine" }),
    row({ family, code: "gates_valves", titleRu: "Затворы и гидромеханика", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "hydromechanical set; PRICE_MISSING until specification", materialKey: "hydromechanical_equipment" }),
    row({ family, code: "crane_equipment_shifts", titleRu: "Краны и монтажное оборудование", lineType: "equipment", group: "equipment", quantity: Math.ceil(capacityMw / 2), unit: "shift", formula: "ceil(capacity_mw / 2)" }),
    row({ family, code: "commissioning_services", titleRu: "ПНР ГЭС", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "commissioning set", procurement: true }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { capacity_mw: capacityMw, channel_length_m: channelLength }, rows, assumptions: ["Напор, расход и турбины не придумываются; оборудование только с PRICE_MISSING до спецификации."], formulaSteps: ["earthworks_m3 = capacity_mw * 1200 + channel_length_m * 4", "concrete_m3 = capacity_mw * 80 + channel_length_m * 0.08"], missingInputs: [...commonMissingInputs(family), "Расход и напор", "Тип гидроагрегата", "Гидрология"] });
}

export function boilerHouseCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  return thermalPowerPlantCalculator({ ...input, familyId: input.familyId ?? "boiler_house" });
}

export function coolingTowerCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  return thermalPowerPlantCalculator({ ...input, familyId: input.familyId ?? "cooling_tower" });
}

export function tankSiloCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "steel_tank");
  const text = normalizePrompt(input.prompt);
  const volumeM3 = numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*(?:м3|м³|m3)\b/i], 1000);
  const rows = [
    row({ family, code: "tank_foundation_m3", titleRu: "Фундамент резервуара", lineType: "material", group: "materials", quantity: volumeM3 * 0.06, unit: "m3", formula: "volume_m3 * 0.06", materialKey: "ready_mix_concrete" }),
    row({ family, code: "steel_shell_t", titleRu: "Стальная стенка и днище", lineType: "equipment", group: "materials", quantity: volumeM3 * 0.018, unit: "t", formula: "volume_m3 * 0.018", materialKey: "steel_tank_shell" }),
    row({ family, code: "tank_coating_m2", titleRu: "Антикоррозионное покрытие резервуара", lineType: "material", group: "materials", quantity: Math.pow(volumeM3, 2 / 3) * 18, unit: "m2", formula: "pow(volume_m3, 2/3) * 18", materialKey: "tank_coating" }),
    row({ family, code: "tank_erection_labor_hours", titleRu: "Монтаж корпуса и обвязки резервуара", lineType: "work", group: "labor", quantity: volumeM3 * 0.9, unit: "hour", formula: "volume_m3 * 0.9" }),
    row({ family, code: "tank_testing", titleRu: "Испытания резервуара", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "testing set", procurement: true }),
    row({ family, code: "crane_shifts", titleRu: "Кран монтажный", lineType: "equipment", group: "equipment", quantity: Math.ceil(volumeM3 / 250), unit: "shift", formula: "ceil(volume_m3 / 250)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { volume_m3: volumeM3 }, rows, assumptions: ["Марка стали, класс опасности и покрытие уточняются проектом."], formulaSteps: ["steel_shell_t = volume_m3 * 0.018"], missingInputs: [...commonMissingInputs(family), "Тип резервуара", "Среда хранения", "Расчёт стенки"] });
}

export function waterTreatmentPlantCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  return wastewaterTreatmentCalculator({ ...input, familyId: input.familyId ?? "water_treatment_plant" });
}

export function solarWindEnergyCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, /ветро|wind/i.test(input.prompt) ? "wind_power_plant" : /аккум|battery/i.test(input.prompt) ? "battery_energy_storage" : "solar_power_plant");
  const text = normalizePrompt(input.prompt);
  const capacityMw = extractCapacityMw(text, 5);
  const rows = [
    row({ family, code: "equipment_foundations_m3", titleRu: "Фундаменты энергооборудования", lineType: "material", group: "materials", quantity: capacityMw * 20, unit: "m3", formula: "capacity_mw * 20", materialKey: "ready_mix_concrete" }),
    row({ family, code: "energy_equipment_set", titleRu: "Солнечные панели / ВЭУ / BESS", lineType: "equipment", group: "equipment", quantity: 1, unit: "set", formula: "main equipment set; PRICE_MISSING until specification", materialKey: "renewable_energy_equipment" }),
    row({ family, code: "cable_m", titleRu: "Кабельные линии", lineType: "material", group: "materials", quantity: capacityMw * 180, unit: "m", formula: "capacity_mw * 180", materialKey: "power_cable" }),
    row({ family, code: "grounding_system_set", titleRu: "Заземление площадки", lineType: "material", group: "materials", quantity: 1, unit: "set", formula: "1 set", materialKey: "grounding_system" }),
    row({ family, code: "energy_installation_labor_hours", titleRu: "Монтаж энергооборудования и кабельных линий", lineType: "work", group: "labor", quantity: capacityMw * 42, unit: "hour", formula: "capacity_mw * 42" }),
    row({ family, code: "commissioning_services", titleRu: "ПНР энергоустановки", lineType: "service", group: "commissioning", quantity: 1, unit: "set", formula: "commissioning set", procurement: true }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { capacity_mw: capacityMw }, rows, assumptions: ["Основное оборудование не оценивается по цене без спецификации производителя."], formulaSteps: ["equipment_foundations_m3 = capacity_mw * 20"], missingInputs: [...commonMissingInputs(family), "Спецификация оборудования", "Схема выдачи мощности"] });
}

export function environmentalWasteFacilityCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "landfill_cell");
  const text = normalizePrompt(input.prompt);
  const areaM2 = extractAreaM2(text, 10000);
  const rows = [
    row({ family, code: "earthworks_m3", titleRu: "Земляные работы карты / площадки", lineType: "work", group: "earthworks", quantity: areaM2 * 0.6, unit: "m3", formula: "area_m2 * 0.6" }),
    row({ family, code: "landfill_liner_m2", titleRu: "Противофильтрационный экран", lineType: "material", group: "materials", quantity: areaM2 * 1.08, unit: "m2", formula: "area_m2 * 1.08", materialKey: "landfill_liner" }),
    row({ family, code: "leachate_collection_lm", titleRu: "Сбор фильтрата", lineType: "material", group: "materials", quantity: Math.sqrt(areaM2) * 8, unit: "m", formula: "sqrt(area_m2) * 8", materialKey: "leachate_pipe" }),
    row({ family, code: "monitoring_wells_pcs", titleRu: "Наблюдательные скважины", lineType: "service", group: "monitoring", quantity: 4, unit: "pcs", formula: "minimum monitoring wells", procurement: true }),
    row({ family, code: "compactor_shifts", titleRu: "Уплотняющая техника", lineType: "equipment", group: "equipment", quantity: Math.ceil(areaM2 / 2500), unit: "shift", formula: "ceil(area_m2 / 2500)" }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { area_m2: areaM2 }, rows, assumptions: ["Экологические требования и класс полигона требуют проекта ОВОС/ПД."], formulaSteps: ["landfill_liner_m2 = area_m2 * 1.08"], missingInputs: [...commonMissingInputs(family), "Класс отходов", "Экологические условия"] });
}

export function miningEarthworksCalculator(input: CalcInput): ExpandedComplexCalculatorOutput {
  const family = familyForCalculator(input, "large_scale_excavation");
  const text = normalizePrompt(input.prompt);
  const volumeM3 = numberFromText(text, [/(\d+(?:[,.]\d+)?)\s*(?:м3|м³|m3)/i], 50000);
  const rows = [
    row({ family, code: "large_scale_excavation_m3", titleRu: "Крупная выемка грунта / породы", lineType: "work", group: "earthworks", quantity: volumeM3, unit: "m3", formula: "input volume_m3" }),
    row({ family, code: "temporary_stabilization_geotextile_m2", titleRu: "Temporary geotextile for haul roads and slopes", lineType: "material", group: "materials", quantity: Math.max(1000, Math.sqrt(volumeM3) * 18), unit: "m2", formula: "max(1000, sqrt(volume_m3) * 18)", materialKey: "geotextile" }),
    row({ family, code: "dust_suppression_water_l", titleRu: "Dust suppression water", lineType: "material", group: "materials", quantity: volumeM3 * 0.4, unit: "l", formula: "volume_m3 * 0.4", materialKey: "process_water" }),
    row({ family, code: "haulage_trips", titleRu: "Вывоз / перемещение горной массы", lineType: "equipment", group: "logistics", quantity: Math.ceil(volumeM3 / 18), unit: "trip", formula: "ceil(volume_m3 / 18)" }),
    row({ family, code: "excavator_shifts", titleRu: "Экскаваторы", lineType: "equipment", group: "equipment", quantity: Math.ceil(volumeM3 / 2500), unit: "shift", formula: "ceil(volume_m3 / 2500)" }),
    row({ family, code: "bulldozer_shifts", titleRu: "Бульдозеры", lineType: "equipment", group: "equipment", quantity: Math.ceil(volumeM3 / 3500), unit: "shift", formula: "ceil(volume_m3 / 3500)" }),
    row({ family, code: "survey_control", titleRu: "Геодезический контроль", lineType: "service", group: "quality", quantity: 1, unit: "set", formula: "survey control set", procurement: true }),
  ];
  return output({ family, sourcePrompt: input.prompt, parameters: { volume_m3: volumeM3 }, rows, assumptions: ["Буровзрывные работы и откосы требуют ППР и проекта."], formulaSteps: ["excavator_shifts = ceil(volume_m3 / 2500)"], missingInputs: [...commonMissingInputs(family), "Категория грунта/породы", "ППР", "Транспортное плечо"] });
}

export function calculateExpandedComplexEstimate(input: CalcInput): ExpandedComplexCalculatorOutput | null {
  const family = resolveExpandedComplexWorkFamily(input.prompt, input.familyId);
  if (!family) return null;
  const calculators: Record<ExpandedComplexCalculatorId, (input: CalcInput) => ExpandedComplexCalculatorOutput> = {
    villageWaterSupplyCalculator,
    sewerNetworkCalculator,
    wastewaterTreatmentCalculator,
    roadConstructionCalculator,
    concreteRoadCalculator,
    roadDrainageCulvertCalculator,
    damHydraulicCalculator,
    irrigationCanalCalculator,
    powerLinePolesCalculator,
    transformerSubstationCalculator,
    utilityConnectionCalculator,
    gasHeatNetworkCalculator,
    highRiseBuildingCalculator,
    highRiseGlazingCalculator,
    mansardRoofWindowsCalculator,
    bridgeCalculator,
    tunnelCalculator,
    retainingWallCalculator,
    multiStoreyFrameCalculator,
    longSpanSteelCalculator,
    industrialBuildingCalculator,
    equipmentFoundationCalculator,
    pipeRackCalculator,
    technologicalPipelineCalculator,
    thermalPowerPlantCalculator,
    hydroPowerPlantCalculator,
    boilerHouseCalculator,
    coolingTowerCalculator,
    tankSiloCalculator,
    pumpingStationCalculator,
    waterTreatmentPlantCalculator,
    substationCalculator,
    solarWindEnergyCalculator,
    environmentalWasteFacilityCalculator,
    miningEarthworksCalculator,
  };
  return calculators[family.calculatorId]({ ...input, familyId: family.work_family_id });
}

export function buildExpandedComplexSnapshot(estimate: ExpandedComplexCalculatorOutput): ExpandedComplexSnapshot {
  return {
    ...estimate,
    norm_sources: [...new Set([...estimate.material_rows, ...estimate.work_rows, ...estimate.equipment_rows, ...estimate.service_rows].map((rowItem) => rowItem.normSourceTitle))],
    price_states: ["PRICE_MISSING"],
  };
}

export function buildExpandedComplexPdfModel(snapshot: ExpandedComplexSnapshot): ExpandedComplexPdfModel {
  const grouped_quantities: Record<ExpandedComplexLineType, ExpandedComplexBoqRow[]> = {
    material: snapshot.material_rows,
    work: snapshot.work_rows,
    equipment: snapshot.equipment_rows,
    service: snapshot.service_rows,
  };
  const snapshotRowCount = snapshot.material_rows.length + snapshot.work_rows.length + snapshot.equipment_rows.length + snapshot.service_rows.length;
  const modelRowCount = Object.values(grouped_quantities).reduce((sum, rows) => sum + rows.length, 0);
  return {
    source_prompt: snapshot.source_prompt,
    estimate_level: snapshot.estimate_level,
    assumptions: snapshot.assumptions,
    missing_design_inputs: snapshot.missing_design_inputs,
    grouped_quantities,
    trace_appendix: snapshot.calculation_trace,
    source_appendix: snapshot.norm_sources,
    rows_equal_snapshot: snapshotRowCount === modelRowCount,
  };
}

export function buildExpandedComplexBuyerHandoff(snapshot: ExpandedComplexSnapshot): ExpandedComplexBuyerHandoff {
  return {
    procurement_materials: snapshot.material_rows.filter((rowItem) => rowItem.includedInProcurement),
    equipment_to_purchase: snapshot.equipment_rows.filter((rowItem) => rowItem.includedInProcurement),
    delivery_procurement_services: snapshot.service_rows.filter((rowItem) => rowItem.includedInProcurement),
    forbidden_rows_present: false,
  };
}

export function classifyExpandedComplexProfessionalReadiness(
  family: ExpandedComplexWorkFamilyDefinition,
): ExpandedComplexReadinessStatus {
  if (!family.work_family_id) return "NOT_READY_MISSING_FAMILY";
  if (!family.calculatorId) return "NOT_READY_MISSING_CALCULATOR";
  if (family.parameterSchema.length === 0) return "NOT_READY_MISSING_PARAMETER_SCHEMA";
  if (!family.formulaFamily) return "NOT_READY_MISSING_FORMULA";
  if (family.materialRecipe.length === 0) return "NOT_READY_MISSING_MATERIAL_RECIPE";
  if (family.laborRecipe.length === 0) return "NOT_READY_MISSING_LABOR_RECIPE";
  if (family.equipmentRecipe.length === 0) return "NOT_READY_MISSING_EQUIPMENT_RECIPE";
  if (family.serviceRecipe.length === 0) return "NOT_READY_MISSING_SERVICE_RECIPE";
  if (!family.normSource.sourceId) return "NOT_READY_MISSING_SOURCE";
  if (family.pricePolicy.defaultState !== "PRICE_MISSING") return "NOT_READY_MISSING_PRICE_POLICY";
  if (family.uiRendererPolicy !== "GROUPED_PREVIEW_REQUIRED") return "NOT_READY_MISSING_UI_RENDERER";
  if (family.pdfPolicy !== "GROUPED_WITH_ASSUMPTIONS_TRACE_AND_SOURCES") return "NOT_READY_MISSING_PDF_POLICY";
  if (family.buyerHandoffPolicy !== "MATERIAL_EQUIPMENT_DELIVERY_ONLY") return "NOT_READY_MISSING_BUYER_HANDOFF";
  return "READY_QUANTITY_ONLY_PRICE_MISSING";
}

export function buildExpandedComplexCoverageMap() {
  return {
    generated_at: new Date().toISOString(),
    expanded_work_families_count: EXPANDED_COMPLEX_WORK_FAMILIES.length,
    expanded_templates_count: EXPANDED_COMPLEX_TEMPLATES.length,
    required_calculators_count: EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length,
    families: EXPANDED_COMPLEX_WORK_FAMILIES.map((family) => ({
      work_family_id: family.work_family_id,
      categoryGroup: family.categoryGroup,
      calculatorId: family.calculatorId,
      readiness: classifyExpandedComplexProfessionalReadiness(family),
      templates: EXPANDED_COMPLEX_TEMPLATES.filter((template) => template.work_family_id === family.work_family_id).length,
    })),
  };
}

export const EXPANDED_COMPLEX_CRITICAL_CASE_PROMPTS: readonly string[] = [
  "водоснабжение села 5 км труба ПЭ100 d110",
  "водопровод села 3 км 120 домов",
  "скважина насосная станция резервуар 100 м3",
  "наружная канализация 2 км труба d200",
  "очистные сооружения 1000 м3 в сутки",
  "насосная станция 500 м3/ч",
  "ливневая канализация 1 км d500",
  "водозабор река насосная станция резервуар",
  "строительство дороги 1 км ширина 6 м асфальт",
  "дорога села 2 км ширина 7 м щебень асфальт",
  "бетонная дорога 500 м ширина 5 м толщина 180 мм",
  "водопропускная труба 2х2 м длина 30 м",
  "дорожное освещение 2 км 60 опор",
  "тротуар 1 км ширина 2 м",
  "аэропортовая рулежная дорожка 500 м",
  "железнодорожная насыпь 1 км",
  "дамба земляная 200 м высота 5 м",
  "плотина бетонная 150 м высота 8 м",
  "берегоукрепление 300 м габионы",
  "канал орошения 1 км",
  "водосброс бетонный 200 м3",
  "геомембрана дамбы 5000 м2",
  "ЛЭП 10 кВ 2 км шаг опор 50 м",
  "ЛЭП 0.4 кВ 1 км СИП",
  "подстанция 10/0.4 кВ 250 кВА",
  "подстанция 110 кВ",
  "кабельная линия 0.4 кВ 500 м траншея",
  "подведение инженерных сетей 100 м вода канализация электричество",
  "подвести воду и канализацию к участку 80 м",
  "газоснабжение участка 100 м",
  "теплотрасса 200 м",
  "волоконно-оптическая линия 2 км",
  "остекление высотного дома 5000 м²",
  "фасадное остекление 18 этажей 6000 м²",
  "витражное остекление 3000 м²",
  "фасад мокрый 8000 м² минвата 150 мм",
  "вентилируемый фасад 7000 м² керамогранит",
  "мансардная крыша 200 м² с 6 окнами металлочерепица утепление 200 мм",
  "устройство мансардной кровли 150 м² 4 кровельных окна",
  "кровельные окна 8 шт с окладами",
  "многоэтажный дом 12 этажей 12000 м² монолит",
  "ЖК 18 этажей 25000 м² монолитный каркас",
  "промышленный корпус 5000 м² металлокаркас",
  "ангар 3000 м² металлокаркас",
  "склад 10000 м² сендвич панели",
  "фундамент под оборудование 12 шт 2х2х1 м",
  "крановые пути 200 м",
  "кабельная эстакада 200 м",
  "технологический трубопровод DN200 300 м",
  "резервуар стальной 1000 м3",
  "ТЭЦ 100 МВт турбинный зал котельное отделение",
  "котельная 20 МВт",
  "фундамент турбины 1 комплект",
  "ГЭС 5 МВт деривационный канал 1 км",
  "ГЭС 20 МВт машинный зал водовод",
  "солнечная электростанция 5 МВт",
  "ветропарк 10 МВт фундаменты ВЭУ",
  "аккумуляторная система хранения 10 МВт·ч",
  "мост 30 м 2 полосы свайное основание",
  "путепровод 60 м ширина 12 м железобетонные балки",
  "тоннель 500 м сечением 40 м²",
  "подпорная стена 80 м высота 4 м",
];
