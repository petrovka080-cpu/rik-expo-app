import type {
  ProfessionalEstimateUnit,
  ProfessionalGroupKey,
  ProfessionalParameterDefinition,
} from "./professionalEstimateTypes";

const AREA_PARAMETER: ProfessionalParameterDefinition = {
  parameter_key: "quantity",
  visible_name_ru: "Quantity",
  value_type: "number",
  required: true,
  unit: "m2",
};

const REGION_PARAMETER: ProfessionalParameterDefinition = {
  parameter_key: "region",
  visible_name_ru: "Region",
  value_type: "enum",
  required: true,
  allowed_values: ["KG_BISHKEK", "KG_OSH", "KZ_ALMATY", "KZ_ASTANA", "RU_DEFAULT", "UZ_TASHKENT"],
};

const WASTE_PARAMETER: ProfessionalParameterDefinition = {
  parameter_key: "waste_percent",
  visible_name_ru: "Waste percent",
  value_type: "number",
  required: true,
  unit: "piece",
  default_value: 5,
};

const GROUP_PARAMETER_UNITS: Readonly<Record<ProfessionalGroupKey, ProfessionalEstimateUnit>> = {
  demolition: "m2",
  earthworks: "m3",
  foundation_concrete: "m3",
  reinforcement_formwork: "kg",
  masonry: "m2",
  waterproofing: "m2",
  roofing: "m2",
  insulation: "m2",
  facade: "m2",
  plaster_putty_paint: "m2",
  drywall_ceiling: "m2",
  tile_stone: "m2",
  flooring: "m2",
  doors_windows: "piece",
  electrical_power: "piece",
  low_voltage_security: "piece",
  plumbing_sewerage: "set",
  heating_hvac: "piece",
  ventilation_ac: "linear_m",
  paving_landscape: "m2",
  special_repair: "set",
};

const GROUP_EXTRA_PARAMETERS: Readonly<Record<ProfessionalGroupKey, readonly ProfessionalParameterDefinition[]>> = {
  demolition: [{ parameter_key: "haul_distance_km", visible_name_ru: "Haul distance", value_type: "number", required: false, unit: "linear_m" }],
  earthworks: [{ parameter_key: "soil_type", visible_name_ru: "Soil type", value_type: "enum", required: false, allowed_values: ["normal", "wet", "rocky"] }],
  foundation_concrete: [{ parameter_key: "concrete_grade", visible_name_ru: "Concrete grade", value_type: "enum", required: true, allowed_values: ["B20", "B25", "B30"], default_value: "B25" }],
  reinforcement_formwork: [{ parameter_key: "rebar_class", visible_name_ru: "Rebar class", value_type: "enum", required: true, allowed_values: ["A500C", "A400"], default_value: "A500C" }],
  masonry: [{ parameter_key: "wall_thickness_mm", visible_name_ru: "Wall thickness", value_type: "number", required: false }],
  waterproofing: [{ parameter_key: "wet_area", visible_name_ru: "Wet area", value_type: "boolean", required: false, default_value: false }],
  roofing: [{ parameter_key: "roof_slope", visible_name_ru: "Roof slope", value_type: "enum", required: false, allowed_values: ["flat", "pitched"] }],
  insulation: [{ parameter_key: "insulation_thickness_mm", visible_name_ru: "Insulation thickness", value_type: "number", required: false }],
  facade: [{ parameter_key: "facade_system", visible_name_ru: "Facade system", value_type: "enum", required: false, allowed_values: ["wet", "ventilated", "panel"] }],
  plaster_putty_paint: [{ parameter_key: "layer_count", visible_name_ru: "Layer count", value_type: "number", required: false, default_value: 1 }],
  drywall_ceiling: [{ parameter_key: "frame_step_mm", visible_name_ru: "Frame step", value_type: "number", required: false, default_value: 600 }],
  tile_stone: [{ parameter_key: "tile_zone", visible_name_ru: "Tile zone", value_type: "enum", required: false, allowed_values: ["wall", "floor", "wet"] }],
  flooring: [{ parameter_key: "floor_base_ready", visible_name_ru: "Floor base ready", value_type: "boolean", required: false, default_value: true }],
  doors_windows: [{ parameter_key: "opening_count", visible_name_ru: "Opening count", value_type: "number", required: false }],
  electrical_power: [{ parameter_key: "point_count", visible_name_ru: "Point count", value_type: "number", required: false }],
  low_voltage_security: [{ parameter_key: "device_count", visible_name_ru: "Device count", value_type: "number", required: false }],
  plumbing_sewerage: [{ parameter_key: "fixture_count", visible_name_ru: "Fixture count", value_type: "number", required: false }],
  heating_hvac: [{ parameter_key: "thermal_load_kw", visible_name_ru: "Thermal load", value_type: "number", required: false }],
  ventilation_ac: [{ parameter_key: "duct_length_m", visible_name_ru: "Duct length", value_type: "number", required: false, unit: "linear_m" }],
  paving_landscape: [{ parameter_key: "base_thickness_mm", visible_name_ru: "Base thickness", value_type: "number", required: false, default_value: 150 }],
  special_repair: [{ parameter_key: "scope_verified", visible_name_ru: "Scope verified", value_type: "boolean", required: true, default_value: true }],
};

export function defaultUnitForProfessionalGroup(groupKey: ProfessionalGroupKey): ProfessionalEstimateUnit {
  return GROUP_PARAMETER_UNITS[groupKey];
}

export function buildProfessionalParameterSchema(groupKey: ProfessionalGroupKey): ProfessionalParameterDefinition[] {
  return [
    { ...AREA_PARAMETER, unit: defaultUnitForProfessionalGroup(groupKey) },
    REGION_PARAMETER,
    WASTE_PARAMETER,
    ...GROUP_EXTRA_PARAMETERS[groupKey],
  ];
}
