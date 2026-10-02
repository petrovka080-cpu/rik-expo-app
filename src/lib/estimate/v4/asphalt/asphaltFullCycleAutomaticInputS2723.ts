import { buildAsphaltPreliminaryAssemblyPolicyV4 } from "./asphaltPreliminaryAssemblyPolicyV4";

export const ASPHALT_FULL_CYCLE_AUTOMATIC_PROFILE_S2723_ID =
  "S27_23_ASPHALT_FULL_CYCLE_AUTOMATIC_INPUT_V1" as const;

const DIRECT_PARAMETER_IDS = new Set([
  "base_emulsion_rate_l_m2",
  "emulsion_rate_l_m2",
  "paver_working_width_m",
  "paving_shift_length_m",
  "surface_cleaner_productivity_m2_per_machine_hour",
  "bitumen_distributor_productivity_m2_per_machine_hour",
  "paver_productivity_m2_per_machine_hour",
  "roller_productivity_m2_per_machine_hour",
  "pneumatic_roller_productivity_m2_per_machine_hour",
  "road_worker_productivity_m2_per_man_hour",
  "asphalt_plant_distance_km",
  "truck_payload_t",
  "truck_average_speed_km_per_machine_hour",
  "truck_turnaround_machine_hours",
  "laboratory_control",
  "laboratory_test_interval_m2_per_test",
  "incoming_control_interval_m2_per_test",
  "temperature_control_trips_per_test",
  "compaction_control_interval_m2_per_test",
  "core_sampling_interval_m2_per_test",
  "thickness_control_interval_m2_per_test",
  "smoothness_control_interval_m2_per_test",
  "laboratory_protocol_count",
  "executive_survey_service_count",
  "execution_documentation_count",
  "geotextile_required",
  "base_roller_productivity_m2_per_machine_hour",
  "water_truck_productivity_m2_per_machine_hour",
  "base_worker_productivity_m2_per_man_hour",
  "sand_layer_required",
  "sand_thickness_mm",
  "sand_compaction_factor",
  "sand_waste_percent",
  "sand_density_t_m3",
  "aggregate_source_distance_km",
  "sand_water_rate_m3_m3",
  "crushed_layer_count",
  "crushed_layer_1_fraction",
  "crushed_layer_1_thickness_mm",
  "crushed_layer_1_compaction_factor",
  "crushed_layer_1_waste_percent",
  "crushed_layer_2_fraction",
  "crushed_layer_2_thickness_mm",
  "crushed_layer_2_compaction_factor",
  "crushed_layer_2_waste_percent",
  "crushed_density_t_m3",
  "crushed_water_rate_m3_m3",
  "base_density_test_interval_m2",
  "grader_productivity_m2_per_machine_hour",
]);

const PROFILE_DEFAULTS: Readonly<Record<string, unknown>> = Object.freeze({
  traffic_class: "HEAVY",
  base_condition: "ACCEPTED",
  wearing_mix_type: "DENSE_FINE_GRAINED",
  asphalt_density_t_m3: 2.35,
  tack_coat_required: true,
  tack_coat_rate_l_m2: 0.3,
  project_scope: "FULL_ROAD_INFRASTRUCTURE",
  estimate_scope_mode: "FULL_APPLICABLE_SCOPE",
  asphalt_waste_percent: 2,
  binder_layer_required: true,
  binder_layer_thickness_mm: 60,
  binder_mix_type: "DENSE_COARSE_GRAINED",
  base_construction_required: true,
  base_layer_thickness_mm: 150,
  base_material_type: "CRUSHED_STONE",
  base_material_compaction_factor: 1.15,
  subbase_required: false,
  geotextile_overlap_percent: 10,
  curb_required: false,
  drainage_required: false,
  marking_required: false,
  signing_required: false,
  lighting_required: false,
  bridge_deck_package_required: false,
});

function finitePositive(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

/**
 * Produces the visible, editable preliminary profile for the canonical full
 * asphalt-pavement owner. Plan geometry is deliberately not invented: joint
 * and edge rows remain pending until the user supplies their dependent facts.
 */
export function deriveAsphaltFullCycleAutomaticInputS2723(input: Readonly<{
  area_m2: number;
  wearing_layer_thickness_mm?: number;
  overrides?: Readonly<Record<string, unknown>>;
}>): Readonly<Record<string, unknown>> {
  const overrides = { ...(input.overrides ?? {}) };
  const areaM2 = finitePositive(overrides.area_m2 ?? input.area_m2);
  if (areaM2 == null) return Object.freeze(overrides);
  const wearingThicknessMm = finitePositive(
    overrides.wearing_layer_thickness_mm ?? input.wearing_layer_thickness_mm ?? 40,
  ) ?? 40;
  const policyValues = new Map<string, unknown>(Object.entries(overrides));
  policyValues.set("area_m2", areaM2);
  policyValues.set("asphalt_layer_2_thickness_mm", wearingThicknessMm);
  if (overrides.binder_layer_thickness_mm != null) {
    policyValues.set("asphalt_layer_1_thickness_mm", overrides.binder_layer_thickness_mm);
  }
  const policy = buildAsphaltPreliminaryAssemblyPolicyV4({
    raw_text: `Полный цикл асфальтобетонного покрытия ${areaM2} м²`,
    existing_values: policyValues,
    profile_override: "new_full_road_pavement",
  });
  const derived: Record<string, unknown> = { ...PROFILE_DEFAULTS };
  for (const assumption of policy.assumptions) {
    if (DIRECT_PARAMETER_IDS.has(assumption.canonical_key)) {
      derived[assumption.canonical_key] = assumption.value;
    }
  }
  return Object.freeze({
    ...derived,
    area_m2: areaM2,
    wearing_layer_thickness_mm: wearingThicknessMm,
    ...overrides,
  });
}
