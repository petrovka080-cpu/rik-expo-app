export type IndependentReferenceGoldenV4 = {
  fixtureId: string;
  catalogWorkId: string;
  scenario: "normal" | "minimum" | "large" | "sensitivity" | "invalid";
  inputs: Readonly<Record<string, number>>;
  expected: Readonly<Record<string, number>>;
  expectedUnit: string;
  tolerance: number;
  requiredRowIds: readonly string[];
  forbiddenRowNames: readonly string[];
  expectedError?: string;
  sourceProvenance: "MANUAL_DIMENSIONAL_CALCULATION";
  explanation: string;
};

const g = (
  catalogWorkId: string,
  scenario: IndependentReferenceGoldenV4["scenario"],
  inputs: Readonly<Record<string, number>>,
  expected: Readonly<Record<string, number>>,
  expectedUnit: string,
  requiredRowIds: readonly string[],
  expectedError?: string,
): IndependentReferenceGoldenV4 => ({
  fixtureId: `${catalogWorkId}:${scenario}:independent:v4`,
  catalogWorkId,
  scenario,
  inputs,
  expected,
  expectedUnit,
  tolerance: 0.000001,
  requiredRowIds,
  forbiddenRowNames: ["Основной материал", "Работы", "Оборудование", "Прочее", "Дополнительная услуга"],
  expectedError,
  sourceProvenance: "MANUAL_DIMENSIONAL_CALCULATION",
  explanation: "Ожидание вычислено вручную из явно указанных геометрических входов; production compiler не использован.",
});

export const MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4: readonly IndependentReferenceGoldenV4[] = [
  g("building_structure_demolition", "normal", { volume_m3: 10, waste_density_t_m3: 1.5, truck_payload_t: 10 }, { demolished_volume: 10, waste_mass: 15, haul_trips: 2 }, "m3", ["demolition_work", "demolition_waste", "demolition_haul"]),
  g("building_structure_demolition", "minimum", { volume_m3: 0.1, waste_density_t_m3: 1, truck_payload_t: 1 }, { demolished_volume: 0.1, waste_mass: 0.1, haul_trips: 1 }, "m3", ["demolition_work"]),
  g("building_structure_demolition", "large", { volume_m3: 10000, waste_density_t_m3: 2, truck_payload_t: 20 }, { demolished_volume: 10000, waste_mass: 20000, haul_trips: 1000 }, "m3", ["demolition_work", "demolition_haul"]),
  g("building_structure_demolition", "sensitivity", { volume_m3: 10, waste_density_t_m3: 2, truck_payload_t: 10 }, { demolished_volume: 10, waste_mass: 20, haul_trips: 2 }, "m3", ["demolition_waste"]),
  g("building_structure_demolition", "invalid", { volume_m3: 0, waste_density_t_m3: 1, truck_payload_t: 10 }, {}, "m3", [], "INVALID_P0"),

  g("trench_excavation", "normal", { length_m: 10, width_m: 1, depth_m: 2, productivity_m3_h: 5 }, { trench_area: 10, excavation_volume: 20, excavator_hours: 4 }, "m3", ["trench_excavation_work", "trench_excavator"]),
  g("trench_excavation", "minimum", { length_m: 1, width_m: 0.5, depth_m: 0.5, productivity_m3_h: 1 }, { trench_area: 0.5, excavation_volume: 0.25, excavator_hours: 0.25 }, "m3", ["trench_excavation_work"]),
  g("trench_excavation", "large", { length_m: 10000, width_m: 2, depth_m: 3, productivity_m3_h: 100 }, { trench_area: 20000, excavation_volume: 60000, excavator_hours: 600 }, "m3", ["trench_excavation_work", "trench_excavator"]),
  g("trench_excavation", "sensitivity", { length_m: 10, width_m: 2, depth_m: 2, productivity_m3_h: 5 }, { trench_area: 20, excavation_volume: 40, excavator_hours: 8 }, "m3", ["trench_excavation_work"]),
  g("trench_excavation", "invalid", { length_m: 10, width_m: 1, depth_m: 0, productivity_m3_h: 5 }, {}, "m3", [], "INVALID_P0"),

  g("strip_foundation", "normal", { length_m: 10, width_m: 0.5, height_m: 1, rebar_rate_kg_m3: 100 }, { foundation_plan_area: 5, foundation_concrete_volume: 5, foundation_rebar_mass: 500, foundation_formwork_area: 10 }, "m3", ["foundation_concrete", "foundation_rebar", "foundation_formwork"]),
  g("strip_foundation", "minimum", { length_m: 1, width_m: 0.2, height_m: 0.3, rebar_rate_kg_m3: 50 }, { foundation_plan_area: 0.2, foundation_concrete_volume: 0.06, foundation_rebar_mass: 3, foundation_formwork_area: 0.3 }, "m3", ["foundation_concrete"]),
  g("strip_foundation", "large", { length_m: 1000, width_m: 1, height_m: 2, rebar_rate_kg_m3: 150 }, { foundation_plan_area: 1000, foundation_concrete_volume: 2000, foundation_rebar_mass: 300000, foundation_formwork_area: 2000 }, "m3", ["foundation_concrete", "foundation_rebar"]),
  g("strip_foundation", "sensitivity", { length_m: 10, width_m: 1, height_m: 1, rebar_rate_kg_m3: 100 }, { foundation_plan_area: 10, foundation_concrete_volume: 10, foundation_rebar_mass: 1000, foundation_formwork_area: 10 }, "m3", ["foundation_concrete"]),
  g("strip_foundation", "invalid", { length_m: 10, width_m: 0, height_m: 1, rebar_rate_kg_m3: 100 }, {}, "m3", [], "INVALID_P0"),

  g("monolithic_slab_concreting", "normal", { area_m2: 100, thickness_mm: 200, rebar_rate_kg_m3: 100 }, { thickness_m: 0.2, slab_concrete_volume: 20, slab_rebar_mass: 2000 }, "m3", ["slab_concrete", "slab_rebar", "slab_concreting_work"]),
  g("monolithic_slab_concreting", "minimum", { area_m2: 1, thickness_mm: 50, rebar_rate_kg_m3: 50 }, { thickness_m: 0.05, slab_concrete_volume: 0.05, slab_rebar_mass: 2.5 }, "m3", ["slab_concrete"]),
  g("monolithic_slab_concreting", "large", { area_m2: 10000, thickness_mm: 300, rebar_rate_kg_m3: 150 }, { thickness_m: 0.3, slab_concrete_volume: 3000, slab_rebar_mass: 450000 }, "m3", ["slab_concrete", "slab_rebar"]),
  g("monolithic_slab_concreting", "sensitivity", { area_m2: 100, thickness_mm: 300, rebar_rate_kg_m3: 100 }, { thickness_m: 0.3, slab_concrete_volume: 30, slab_rebar_mass: 3000 }, "m3", ["slab_concrete"]),
  g("monolithic_slab_concreting", "invalid", { area_m2: 100, thickness_mm: 0, rebar_rate_kg_m3: 100 }, {}, "m3", [], "INVALID_P0"),

  g("masonry_wall", "normal", { length_m: 10, height_m: 3, thickness_m: 0.25, brick_rate_pcs_m3: 400 }, { wall_area: 30, masonry_volume: 7.5, brick_count: 3000 }, "m3", ["masonry_brick", "masonry_work", "masonry_geometry_control"]),
  g("masonry_wall", "minimum", { length_m: 1, height_m: 1, thickness_m: 0.1, brick_rate_pcs_m3: 400 }, { wall_area: 1, masonry_volume: 0.1, brick_count: 40 }, "m3", ["masonry_brick"]),
  g("masonry_wall", "large", { length_m: 1000, height_m: 10, thickness_m: 0.5, brick_rate_pcs_m3: 500 }, { wall_area: 10000, masonry_volume: 5000, brick_count: 2500000 }, "m3", ["masonry_brick", "masonry_work"]),
  g("masonry_wall", "sensitivity", { length_m: 10, height_m: 3, thickness_m: 0.5, brick_rate_pcs_m3: 400 }, { wall_area: 30, masonry_volume: 15, brick_count: 6000 }, "m3", ["masonry_brick"]),
  g("masonry_wall", "invalid", { length_m: 10, height_m: 3, thickness_m: 0, brick_rate_pcs_m3: 400 }, {}, "m3", [], "INVALID_P0"),

  g("wall_plaster", "normal", { area_m2: 100, thickness_mm: 10, mix_rate_kg_m2_mm: 1.2 }, { plaster_area: 100, thickness_m: 0.01, plaster_volume: 1, plaster_mix_mass: 1200 }, "m2", ["plaster_dry_mix", "plaster_application", "plaster_quality"]),
  g("wall_plaster", "minimum", { area_m2: 1, thickness_mm: 1, mix_rate_kg_m2_mm: 1 }, { plaster_area: 1, thickness_m: 0.001, plaster_volume: 0.001, plaster_mix_mass: 1 }, "m2", ["plaster_application"]),
  g("wall_plaster", "large", { area_m2: 10000, thickness_mm: 30, mix_rate_kg_m2_mm: 1.5 }, { plaster_area: 10000, thickness_m: 0.03, plaster_volume: 300, plaster_mix_mass: 450000 }, "m2", ["plaster_dry_mix", "plaster_application"]),
  g("wall_plaster", "sensitivity", { area_m2: 100, thickness_mm: 20, mix_rate_kg_m2_mm: 1.2 }, { plaster_area: 100, thickness_m: 0.02, plaster_volume: 2, plaster_mix_mass: 2400 }, "m2", ["plaster_dry_mix"]),
  g("wall_plaster", "invalid", { area_m2: 0, thickness_mm: 10, mix_rate_kg_m2_mm: 1.2 }, {}, "m2", [], "INVALID_P0"),

  g("roll_roofing", "normal", { area_m2: 100, layers_count: 2, waste_factor: 1.1 }, { roof_area: 100, layered_area: 200, membrane_area: 220 }, "m2", ["roof_membrane", "roll_roofing_work", "roof_quality"]),
  g("roll_roofing", "minimum", { area_m2: 1, layers_count: 1, waste_factor: 1 }, { roof_area: 1, layered_area: 1, membrane_area: 1 }, "m2", ["roof_membrane"]),
  g("roll_roofing", "large", { area_m2: 10000, layers_count: 4, waste_factor: 1.2 }, { roof_area: 10000, layered_area: 40000, membrane_area: 48000 }, "m2", ["roof_membrane", "roll_roofing_work"]),
  g("roll_roofing", "sensitivity", { area_m2: 100, layers_count: 2, waste_factor: 1.2 }, { roof_area: 100, layered_area: 200, membrane_area: 240 }, "m2", ["roof_membrane"]),
  g("roll_roofing", "invalid", { area_m2: 100, layers_count: 0, waste_factor: 1.1 }, {}, "m2", [], "INVALID_P0"),

  g("water_pipe_installation", "normal", { length_m: 100, material_factor: 1.05, support_spacing_m: 1 }, { installed_pipe_length: 100, pipe_material_length: 105, support_count: 100 }, "m", ["water_pipe", "water_pipe_supports", "water_pipe_work", "water_pressure_test"]),
  g("water_pipe_installation", "minimum", { length_m: 1, material_factor: 1, support_spacing_m: 2 }, { installed_pipe_length: 1, pipe_material_length: 1, support_count: 1 }, "m", ["water_pipe"]),
  g("water_pipe_installation", "large", { length_m: 10000, material_factor: 1.1, support_spacing_m: 2 }, { installed_pipe_length: 10000, pipe_material_length: 11000, support_count: 5000 }, "m", ["water_pipe", "water_pipe_work"]),
  g("water_pipe_installation", "sensitivity", { length_m: 100, material_factor: 1.2, support_spacing_m: 1 }, { installed_pipe_length: 100, pipe_material_length: 120, support_count: 100 }, "m", ["water_pipe"]),
  g("water_pipe_installation", "invalid", { length_m: 0, material_factor: 1.05, support_spacing_m: 1 }, {}, "m", [], "INVALID_P0"),

  g("sewer_pipe_installation", "normal", { length_m: 100, material_factor: 1.05, pipe_segment_m: 6 }, { installed_sewer_length: 100, sewer_material_length: 105, joint_count: 17 }, "m", ["sewer_pipe", "sewer_joints", "sewer_pipe_work", "sewer_line_test"]),
  g("sewer_pipe_installation", "minimum", { length_m: 1, material_factor: 1, pipe_segment_m: 6 }, { installed_sewer_length: 1, sewer_material_length: 1, joint_count: 1 }, "m", ["sewer_pipe"]),
  g("sewer_pipe_installation", "large", { length_m: 10000, material_factor: 1.1, pipe_segment_m: 6 }, { installed_sewer_length: 10000, sewer_material_length: 11000, joint_count: 1667 }, "m", ["sewer_pipe", "sewer_pipe_work"]),
  g("sewer_pipe_installation", "sensitivity", { length_m: 100, material_factor: 1.05, pipe_segment_m: 3 }, { installed_sewer_length: 100, sewer_material_length: 105, joint_count: 34 }, "m", ["sewer_joints"]),
  g("sewer_pipe_installation", "invalid", { length_m: 100, material_factor: 1.05, pipe_segment_m: 0 }, {}, "m", [], "INVALID_P0"),

  g("power_cable_laying", "normal", { route_length_m: 100, cable_factor: 1.1, fixing_spacing_m: 0.5 }, { installed_cable_length: 100, cable_material_length: 110, cable_fixing_count: 200 }, "m", ["power_cable", "power_cable_fixings", "power_cable_work", "power_cable_test"]),
  g("power_cable_laying", "minimum", { route_length_m: 1, cable_factor: 1, fixing_spacing_m: 1 }, { installed_cable_length: 1, cable_material_length: 1, cable_fixing_count: 1 }, "m", ["power_cable"]),
  g("power_cable_laying", "large", { route_length_m: 10000, cable_factor: 1.2, fixing_spacing_m: 2 }, { installed_cable_length: 10000, cable_material_length: 12000, cable_fixing_count: 5000 }, "m", ["power_cable", "power_cable_work"]),
  g("power_cable_laying", "sensitivity", { route_length_m: 100, cable_factor: 1.1, fixing_spacing_m: 0.25 }, { installed_cable_length: 100, cable_material_length: 110, cable_fixing_count: 400 }, "m", ["power_cable_fixings"]),
  g("power_cable_laying", "invalid", { route_length_m: 100, cable_factor: 1.1, fixing_spacing_m: 0 }, {}, "m", [], "INVALID_P0"),

  g("heating_appliance_installation", "normal", { appliance_count: 10, brackets_per_appliance: 2, valves_per_appliance: 2 }, { installed_appliance_count: 10, bracket_count: 20, valve_count: 20 }, "pcs", ["heating_appliance", "heating_brackets", "heating_valves", "heating_installation_work"]),
  g("heating_appliance_installation", "minimum", { appliance_count: 1, brackets_per_appliance: 2, valves_per_appliance: 2 }, { installed_appliance_count: 1, bracket_count: 2, valve_count: 2 }, "pcs", ["heating_appliance"]),
  g("heating_appliance_installation", "large", { appliance_count: 10000, brackets_per_appliance: 3, valves_per_appliance: 2 }, { installed_appliance_count: 10000, bracket_count: 30000, valve_count: 20000 }, "pcs", ["heating_appliance", "heating_installation_work"]),
  g("heating_appliance_installation", "sensitivity", { appliance_count: 10, brackets_per_appliance: 4, valves_per_appliance: 3 }, { installed_appliance_count: 10, bracket_count: 40, valve_count: 30 }, "pcs", ["heating_brackets", "heating_valves"]),
  g("heating_appliance_installation", "invalid", { appliance_count: 0, brackets_per_appliance: 2, valves_per_appliance: 2 }, {}, "pcs", [], "INVALID_P0"),

  g("asphalt_pavement", "normal", { area_m2: 100, thickness_mm: 50, density_t_m3: 2.4 }, { asphalt_area: 100, asphalt_thickness_m: 0.05, asphalt_volume: 5, asphalt_mass: 12 }, "m2", ["asphalt_mix", "asphalt_laying", "asphalt_compaction", "asphalt_quality"]),
  g("asphalt_pavement", "minimum", { area_m2: 1, thickness_mm: 10, density_t_m3: 2 }, { asphalt_area: 1, asphalt_thickness_m: 0.01, asphalt_volume: 0.01, asphalt_mass: 0.02 }, "m2", ["asphalt_mix"]),
  g("asphalt_pavement", "large", { area_m2: 100000, thickness_mm: 100, density_t_m3: 2.5 }, { asphalt_area: 100000, asphalt_thickness_m: 0.1, asphalt_volume: 10000, asphalt_mass: 25000 }, "m2", ["asphalt_mix", "asphalt_laying"]),
  g("asphalt_pavement", "sensitivity", { area_m2: 100, thickness_mm: 100, density_t_m3: 2.4 }, { asphalt_area: 100, asphalt_thickness_m: 0.1, asphalt_volume: 10, asphalt_mass: 24 }, "m2", ["asphalt_mix"]),
  g("asphalt_pavement", "invalid", { area_m2: 100, thickness_mm: 0, density_t_m3: 2.4 }, {}, "m2", [], "INVALID_P0"),
] as const;

// Static, independently calculated depth expectations.
// Tuple order: preparation, transport mass, labor hours, equipment hours,
// transport work, trips, service quantity, document count.
export const MULTI_DOMAIN_INDEPENDENT_DEPTH_EXPECTATIONS_V4: readonly (
  readonly [fixtureId: string, expected: readonly number[]]
)[] = [
  ["building_structure_demolition:normal:independent:v4", [10, 15, 12.5, 1.25, 300, 2, 10, 1]],
  ["building_structure_demolition:minimum:independent:v4", [0.1, 0.15, 0.125, 0.0125, 3, 1, 0.1, 1]],
  ["building_structure_demolition:large:independent:v4", [10000, 15000, 12500, 1250, 300000, 1500, 10000, 1]],
  ["building_structure_demolition:sensitivity:independent:v4", [10, 15, 12.5, 1.25, 300, 2, 10, 1]],
  ["trench_excavation:normal:independent:v4", [20, 34, 5, 0.8, 680, 4, 20, 1]],
  ["trench_excavation:minimum:independent:v4", [0.25, 0.425, 0.0625, 0.01, 8.5, 1, 0.25, 1]],
  ["trench_excavation:large:independent:v4", [60000, 102000, 15000, 2400, 2040000, 10200, 60000, 1]],
  ["trench_excavation:sensitivity:independent:v4", [40, 68, 10, 1.6, 1360, 7, 40, 1]],
  ["strip_foundation:normal:independent:v4", [5, 12, 7.142857, 0.416667, 240, 2, 5, 1]],
  ["strip_foundation:minimum:independent:v4", [0.06, 0.144, 0.085714, 0.005, 2.88, 1, 0.06, 1]],
  ["strip_foundation:large:independent:v4", [2000, 4800, 2857.142857, 166.666667, 96000, 480, 2000, 1]],
  ["strip_foundation:sensitivity:independent:v4", [10, 24, 14.285714, 0.833333, 480, 3, 10, 1]],
  ["monolithic_slab_concreting:normal:independent:v4", [20, 48, 20, 1.111111, 960, 5, 20, 1]],
  ["monolithic_slab_concreting:minimum:independent:v4", [0.05, 0.12, 0.05, 0.002778, 2.4, 1, 0.05, 1]],
  ["monolithic_slab_concreting:large:independent:v4", [3000, 7200, 3000, 166.666667, 144000, 720, 3000, 1]],
  ["monolithic_slab_concreting:sensitivity:independent:v4", [30, 72, 30, 1.666667, 1440, 8, 30, 1]],
  ["masonry_wall:normal:independent:v4", [7.5, 13.5, 15, 1.25, 270, 2, 7.5, 1]],
  ["masonry_wall:minimum:independent:v4", [0.1, 0.18, 0.2, 0.016667, 3.6, 1, 0.1, 1]],
  ["masonry_wall:large:independent:v4", [5000, 9000, 10000, 833.333333, 180000, 900, 5000, 1]],
  ["masonry_wall:sensitivity:independent:v4", [15, 27, 30, 2.5, 540, 3, 15, 1]],
  ["wall_plaster:normal:independent:v4", [100, 2, 12.5, 2.857143, 40, 1, 100, 1]],
  ["wall_plaster:minimum:independent:v4", [1, 0.02, 0.125, 0.028571, 0.4, 1, 1, 1]],
  ["wall_plaster:large:independent:v4", [10000, 200, 1250, 285.714286, 4000, 20, 10000, 1]],
  ["wall_plaster:sensitivity:independent:v4", [100, 2, 12.5, 2.857143, 40, 1, 100, 1]],
  ["roll_roofing:normal:independent:v4", [100, 1.5, 10, 2.222222, 30, 1, 100, 1]],
  ["roll_roofing:minimum:independent:v4", [1, 0.015, 0.1, 0.022222, 0.3, 1, 1, 1]],
  ["roll_roofing:large:independent:v4", [10000, 150, 1000, 222.222222, 3000, 15, 10000, 1]],
  ["roll_roofing:sensitivity:independent:v4", [100, 1.5, 10, 2.222222, 30, 1, 100, 1]],
  ["water_pipe_installation:normal:independent:v4", [100, 0.4, 25, 5, 8, 1, 100, 1]],
  ["water_pipe_installation:minimum:independent:v4", [1, 0.004, 0.25, 0.05, 0.08, 1, 1, 1]],
  ["water_pipe_installation:large:independent:v4", [10000, 40, 2500, 500, 800, 4, 10000, 1]],
  ["water_pipe_installation:sensitivity:independent:v4", [100, 0.4, 25, 5, 8, 1, 100, 1]],
  ["sewer_pipe_installation:normal:independent:v4", [100, 1.2, 33.333333, 6.666667, 24, 1, 100, 1]],
  ["sewer_pipe_installation:minimum:independent:v4", [1, 0.012, 0.333333, 0.066667, 0.24, 1, 1, 1]],
  ["sewer_pipe_installation:large:independent:v4", [10000, 120, 3333.333333, 666.666667, 2400, 12, 10000, 1]],
  ["sewer_pipe_installation:sensitivity:independent:v4", [100, 1.2, 33.333333, 6.666667, 24, 1, 100, 1]],
  ["power_cable_laying:normal:independent:v4", [100, 0.8, 8.333333, 1.666667, 16, 1, 100, 1]],
  ["power_cable_laying:minimum:independent:v4", [1, 0.008, 0.083333, 0.016667, 0.16, 1, 1, 1]],
  ["power_cable_laying:large:independent:v4", [10000, 80, 833.333333, 166.666667, 1600, 8, 10000, 1]],
  ["power_cable_laying:sensitivity:independent:v4", [100, 0.8, 8.333333, 1.666667, 16, 1, 100, 1]],
  ["heating_appliance_installation:normal:independent:v4", [10, 0.4, 20, 2.5, 8, 1, 10, 1]],
  ["heating_appliance_installation:minimum:independent:v4", [1, 0.04, 2, 0.25, 0.8, 1, 1, 1]],
  ["heating_appliance_installation:large:independent:v4", [10000, 400, 20000, 2500, 8000, 40, 10000, 1]],
  ["heating_appliance_installation:sensitivity:independent:v4", [10, 0.4, 20, 2.5, 8, 1, 10, 1]],
  ["asphalt_pavement:normal:independent:v4", [100, 12, 5, 0.555556, 240, 2, 100, 1]],
  ["asphalt_pavement:minimum:independent:v4", [1, 0.12, 0.05, 0.005556, 2.4, 1, 1, 1]],
  ["asphalt_pavement:large:independent:v4", [100000, 12000, 5000, 555.555556, 240000, 1200, 100000, 1]],
  ["asphalt_pavement:sensitivity:independent:v4", [100, 12, 5, 0.555556, 240, 2, 100, 1]],
] as const;
