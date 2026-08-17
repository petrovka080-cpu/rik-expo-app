import type { AsphaltRelatedProfileV4 } from "./asphaltRelatedSemanticContractV4";

export const ASPHALT_RELATED_BASELINE_ASSUMPTION_VERSION_V4 =
  "asphalt-related-visible-baseline:r5.2:2026-08-17.v1" as const;

export type AsphaltRelatedBaselineAssumptionV4 = {
  value: string | number | boolean;
  sourceId: string;
  sourceVersion: typeof ASPHALT_RELATED_BASELINE_ASSUMPTION_VERSION_V4;
  reasonRu: string;
};

const BASELINE_VALUES: Readonly<Record<string, string | number | boolean>> = Object.freeze({
  estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
  project_scope: "SURFACING_ONLY",
  area_m2: 100,
  removal_area_m2: 100,
  removal_depth_mm: 50,
  removal_method: "MECHANICAL_BREAKOUT",
  removal_extent: "FULL",
  existing_asphalt_density_t_m3: 2.35,
  haul_required: false,
  material_destination: "RECYCLING",
  loading_required: false,
  base_cleaning_required: false,
  work_scope: "PURE_DEMOLITION",
  wearing_layer_thickness_mm: 50,
  binder_layer_thickness_mm: 60,
  asphalt_density_t_m3: 2.35,
  prepared_base_confirmed: true,
  bridge_deck_system_confirmed: true,
  traffic_class: "HEAVY",
  parking_purpose: "PASSENGER_CARS",
  vehicle_type: "PASSENGER_CARS",
  base_condition: "ACCEPTED",
  underlying_layer_condition: "ACCEPTED",
  existing_surface_condition: "SOUND",
  wearing_mix_type: "DENSE_FINE_GRAINED",
  binder_mix_type: "DENSE_COARSE_GRAINED",
  connection_width_m: 6,
  number_of_cards: 1,
  repair_method: "SAW_CUT_AND_REPLACE",
  boundary_cut_required: false,
  tack_coat_required: false,
  tack_coat_rate_l_m2: 0.3,
  milling_required: false,
  waterproofing_type: "ROLLED",
  waterproofing_condition: "ACCEPTED",
  protective_layer_thickness_mm: 40,
  asphalt_waste_percent: 3,
  base_emulsion_rate_l_m2: 0.3,
  surface_cleaner_productivity_m2_per_machine_hour: 500,
  bitumen_distributor_productivity_m2_per_machine_hour: 800,
  paver_productivity_m2_per_machine_hour: 300,
  roller_productivity_m2_per_machine_hour: 250,
  pneumatic_roller_productivity_m2_per_machine_hour: 250,
  road_worker_productivity_m2_per_man_hour: 25,
  asphalt_plant_distance_km: 10,
  truck_payload_t: 20,
  truck_average_speed_km_per_machine_hour: 40,
  truck_turnaround_machine_hours: 0.5,
  laboratory_control: "contractor",
  incoming_control_interval_m2_per_test: 1000,
  compaction_control_interval_m2_per_test: 1000,
  core_sampling_interval_m2_per_test: 1000,
  laboratory_test_interval_m2_per_test: 1000,
  temperature_control_trips_per_test: 5,
  smoothness_control_interval_m2_per_test: 1000,
  thickness_control_interval_m2_per_test: 1000,
  laboratory_protocol_count: 1,
  executive_survey_service_count: 1,
  execution_documentation_count: 1,
  removal_labor_productivity_m2_per_man_hour: 20,
  removal_control_interval_m2_per_test: 500,
  removal_documentation_count: 1,
  milling_productivity_m3_per_machine_hour: 20,
  breakout_productivity_m3_per_machine_hour: 15,
  manual_breakout_productivity_m3_per_machine_hour: 5,
  combined_removal_productivity_m3_per_machine_hour: 12,
});

export function getAsphaltRelatedBaselineAssumptionV4(
  profile: AsphaltRelatedProfileV4,
  parameterKey: string,
): AsphaltRelatedBaselineAssumptionV4 | null {
  const value = parameterKey === "removal_method" && profile.canonicalWorkKey === "asphalt_milling"
    ? "COLD_MILLING"
    : BASELINE_VALUES[parameterKey];
  if (value === undefined) return null;
  return {
    value,
    sourceId: `engineering_assumption:asphalt-related-r52-baseline:${profile.canonicalWorkKey}:${parameterKey}`,
    sourceVersion: ASPHALT_RELATED_BASELINE_ASSUMPTION_VERSION_V4,
    reasonRu: `Для исходной предварительной сметы принято значение «${String(value)}»; замените его фактическим проектным или измеренным значением.`,
  };
}
