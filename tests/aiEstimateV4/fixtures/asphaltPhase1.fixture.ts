import type { CompileAsphaltProfessionalEstimateV4Input } from "../../../src/lib/estimate/v4/asphalt";

export const ASPHALT_PHASE1_CONTROL_TEXT =
  "Ремонт асфальтобетонного покрытия 1000 м², два слоя 60 и 40 мм, Бишкек, без фрезерования";

export const ASPHALT_PHASE1_COMPLETE_PARAMETERS = Object.freeze({
  geometry_method: "direct_area",
  area_m2: 1000,
  purpose: "public_road",
  traffic_load_category: "medium",
  construction_mode: "repair",
  existing_pavement_condition: "repairable",
  milling_required: false,
  soil_condition: "unknown",
  base_condition: "project_confirmed",
  sand_layer_required: false,
  crushed_layers: [
    { position: 1, fraction: "40_70", thickness_mm: 180, compaction_factor: 1.18, waste_percent: 3 },
    { position: 2, fraction: "20_40", thickness_mm: 120, compaction_factor: 1.16, waste_percent: 3 },
  ],
  geotextile_required: false,
  asphalt_layers: [
    { position: 1, mixture_type: "coarse_lower", thickness_mm: 60, density_t_m3: 2.35, waste_percent: 2 },
    { position: 2, mixture_type: "dense_fine", thickness_mm: 40, density_t_m3: 2.35, waste_percent: 2 },
  ],
  emulsion_measurement_basis: "litre",
  emulsion_rate_l_m2: 0.3,
  curb_length_m: 0,
  drainage_type: "none",
  traffic_signs_count: 0,
  guardrail_length_m: 0,
  asphalt_plant_distance_km: 20,
  truck_payload_t: 15,
  region_city: "Бишкек",
  execution_season: "summer",
  laboratory_control: "project_program",
  laboratory_test_interval_m2_per_test: 500,
  road_worker_productivity_m2_per_man_hour: 12,
  grader_productivity_m2_per_machine_hour: 220,
  roller_productivity_m2_per_machine_hour: 150,
  paver_productivity_m2_per_machine_hour: 180,
});

export function asphaltPhase1CompleteInput(
  overrides: Record<string, unknown> = {},
): CompileAsphaltProfessionalEstimateV4Input {
  return {
    raw_text: ASPHALT_PHASE1_CONTROL_TEXT,
    parameter_overrides: {
      ...ASPHALT_PHASE1_COMPLETE_PARAMETERS,
      ...overrides,
    },
  };
}
