import type {
  ExpandedComplexBoqRow,
  ExpandedComplexLineType,
  ExpandedComplexUnit,
} from "../index";

export const S2B_INFRASTRUCTURE_ENGINEERING_GREEN_STATUS =
  "GREEN_INFRASTRUCTURE_ENGINEERING_PROFESSIONAL_BOQ_DECOMPOSITION_WAVE2_READY_NO_RELEASE" as const;

export const S2B_REGULATED_SAFETY_NOTICE =
  "Предварительная смета не заменяет проект, инженерный расчёт и обязательную экспертизу.";

export const S2B_PROFESSIONAL_MIN_ROWS = 45;

export type S2BWave2Kind =
  | "road"
  | "bridge"
  | "tunnel"
  | "water"
  | "sewer"
  | "stormwater"
  | "electrical"
  | "substation"
  | "lighting"
  | "heating_ventilation"
  | "boiler"
  | "solar"
  | "well"
  | "pipeline"
  | "retaining_wall"
  | "hydraulic"
  | "external_networks";

export type S2BWave2ControlCase = {
  id: string;
  prompt: string;
  familyId: string;
  calculatorId: string;
  kind: S2BWave2Kind;
  requiredCodeTokens: readonly string[];
  regulated: boolean;
};

export const S2B_WAVE2_CONTROL_CASES: readonly S2BWave2ControlCase[] = [
  {
    id: "asphalt_area_10000",
    prompt: "Асфальтирование 10 000 м²",
    familyId: "asphalt_concrete_pavement",
    calculatorId: "roadConstructionCalculator",
    kind: "road",
    requiredCodeTokens: ["asphalt_lower", "asphalt_upper", "bitumen", "laboratory", "marking"],
    regulated: false,
  },
  {
    id: "road_1km_7m_two_layers",
    prompt: "Дорога 1 км шириной 7 м, асфальтобетон, основание щебень",
    familyId: "road_construction",
    calculatorId: "roadConstructionCalculator",
    kind: "road",
    requiredCodeTokens: ["road_area", "crushed_stone", "asphalt_lower", "asphalt_upper", "curb"],
    regulated: false,
  },
  {
    id: "water_pipe_1000m_d110",
    prompt: "Водопровод Ø110 длиной 1 000 м",
    familyId: "village_water_supply",
    calculatorId: "villageWaterSupplyCalculator",
    kind: "water",
    requiredCodeTokens: ["trench", "pipe", "valves", "disinfection", "hydro"],
    regulated: false,
  },
  {
    id: "sewer_800m_d200_12_manholes",
    prompt: "Канализация Ø200 длиной 800 м, 12 колодцев",
    familyId: "village_sewer_network",
    calculatorId: "sewerNetworkCalculator",
    kind: "sewer",
    requiredCodeTokens: ["sewer", "slope", "manhole", "hydraulic", "outfall"],
    regulated: false,
  },
  {
    id: "stormwater_inlets_500m",
    prompt: "Ливневая канализация 500 м с дождеприёмниками",
    familyId: "stormwater_drainage",
    calculatorId: "stormwaterNetworkCalculator",
    kind: "stormwater",
    requiredCodeTokens: ["stormwater", "rain_inlet", "silt_trap", "outlet", "slope"],
    regulated: false,
  },
  {
    id: "building_electrical_180m2",
    prompt: "Электрика здания 180 м²",
    familyId: "low_voltage_system",
    calculatorId: "electricalNetworkCalculator",
    kind: "electrical",
    requiredCodeTokens: ["cable", "panel", "breaker", "grounding", "commissioning"],
    regulated: false,
  },
  {
    id: "cable_line_10kv_2km",
    prompt: "Кабельная линия 10 кВ длиной 2 км",
    familyId: "underground_cable_line",
    calculatorId: "powerCableLineCalculator",
    kind: "electrical",
    requiredCodeTokens: ["cable", "duct", "trench", "joint", "voltage"],
    regulated: false,
  },
  {
    id: "ventilation_cafe_120m2",
    prompt: "Вентиляция кафе 120 м²",
    familyId: "ventilation_system",
    calculatorId: "heatingVentilationCalculator",
    kind: "heating_ventilation",
    requiredCodeTokens: ["airflow", "duct", "fan", "filter", "balancing"],
    regulated: false,
  },
  {
    id: "house_heating_200m2",
    prompt: "Отопление дома 200 м²",
    familyId: "HVAC_plant_room",
    calculatorId: "heatingVentilationCalculator",
    kind: "heating_ventilation",
    requiredCodeTokens: ["heat_load", "pipe", "radiator", "insulation", "balancing"],
    regulated: false,
  },
  {
    id: "solar_30kw",
    prompt: "Солнечная электростанция 30 кВт",
    familyId: "solar_power_plant",
    calculatorId: "solarWindEnergyCalculator",
    kind: "solar",
    requiredCodeTokens: ["solar", "panel", "inverter", "grounding", "monitoring"],
    regulated: false,
  },
  {
    id: "well_80m",
    prompt: "Скважина глубиной 80 м",
    familyId: "well_construction",
    calculatorId: "wellConstructionCalculator",
    kind: "well",
    requiredCodeTokens: ["well", "drilling", "casing", "filter", "water_analysis"],
    regulated: true,
  },
  {
    id: "bridge_60m_10m",
    prompt: "Мост длиной 60 м шириной 10 м",
    familyId: "bridge_construction",
    calculatorId: "bridgeCalculator",
    kind: "bridge",
    requiredCodeTokens: ["bridge", "piles", "girders", "bearings", "expansion"],
    regulated: true,
  },
  {
    id: "tunnel_400m",
    prompt: "Тоннель длиной 400 м",
    familyId: "tunnel_construction",
    calculatorId: "tunnelCalculator",
    kind: "tunnel",
    requiredCodeTokens: ["tunnel", "excavation", "lining", "ventilation", "fire_safety"],
    regulated: true,
  },
  {
    id: "retaining_wall_80x4",
    prompt: "Подпорная стена 80 × 4 м",
    familyId: "retaining_wall",
    calculatorId: "retainingWallCalculator",
    kind: "retaining_wall",
    requiredCodeTokens: ["retaining", "drainage", "geotextile", "stability", "backfill"],
    regulated: false,
  },
  {
    id: "process_pipeline_600m_d159",
    prompt: "Технологический трубопровод Ø159 длиной 600 м",
    familyId: "technological_pipeline",
    calculatorId: "technologicalPipelineCalculator",
    kind: "pipeline",
    requiredCodeTokens: ["process", "weld", "support", "ndt", "pressure_testing"],
    regulated: true,
  },
  {
    id: "earth_dam_120m_6m",
    prompt: "Дамба длиной 120 м высотой 6 м",
    familyId: "earth_dam",
    calculatorId: "damHydraulicCalculator",
    kind: "hydraulic",
    requiredCodeTokens: ["hydraulic", "earthworks", "spillway", "monitoring", "safety"],
    regulated: true,
  },
];

export type S2BComponent = {
  code: string;
  titleRu: string;
  materialUnit: ExpandedComplexUnit;
  materialKey: string;
};

export type S2BDomainBlockRole =
  | "DOMAIN_REQUIRED"
  | "DOMAIN_OPTIONAL"
  | "GENERAL_SITE_SUPPORT"
  | "MISSING_DESIGN_INPUT";

export type S2BDomainPack = {
  prefix: string;
  workUnit: ExpandedComplexUnit;
  components: readonly S2BComponent[];
};

export type S2BExpandedRowFactory = (input: {
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
}) => ExpandedComplexBoqRow;
