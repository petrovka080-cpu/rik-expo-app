import type { Batch001DrywallSuccessorDefinitionR3 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";

export const BATCH001_DRYWALL_GOLD_FIXTURE_R3_CONTRACT =
  "real-professional-estimates-r3.batch001-drywall-gold-fixture.v1" as const;

const EXACT_NUMERIC_VALUES: Readonly<Record<string, number>> = {
  horizontal_face_area_m2: 60,
  vertical_face_length_m: 30,
  vertical_face_count: 1,
  bulkhead_drop_height_m: 0.5,
  end_face_area_m2: 2,
  return_face_area_m2: 3,
  opening_area_m2: 1,
  perimeter_length_m: 60,
  internal_corner_length_m: 12,
  external_corner_length_m: 10,
  transition_length_m: 4,
  opening_perimeter_m: 8,
  working_height_m: 3.2,
  board_layer_count: 2,
  board_thickness_mm: 12.5,
  board_cutting_waste_percent: 7,
  sheet_joint_length_m: 62,
  cut_edge_length_m: 18,
  edge_profile_length_m: 8,
  shadow_joint_profile_length_m: 0,
  acoustic_tape_length_m: 0,
  insulation_area_m2: 0,
  protective_membrane_area_m2: 0,
  profile_cut_length_m: 45,
  profile_extension_count: 4,
  technical_service_opening_count: 4,
  technical_opening_perimeter_m_item: 3,
  technical_opening_profile_m_per_opening: 3,
  technical_opening_reinforcement_fastener_item: 32,
  wet_zone_penetration_count: 4,
  wet_zone_cuff_count: 4,
  large_area_control_joint_length_m: 12,
  large_area_clad_control_joint_length_m: 12,
  large_area_two_level_connector_count: 35,
  large_area_staging_zone_count: 3,
  small_area_self_supporting_profile_length_m: 20,
  small_area_self_supporting_stud_length_m: 18,
  small_area_cut_edge_length_m: 16,
  delivery_distance_km: 18,
};

function fixtureNumber(parameterId: string): number {
  const exact = EXACT_NUMERIC_VALUES[parameterId];
  if (exact != null) return exact;
  if (parameterId.includes("spacing_m")) return 0.6;
  if (parameterId.endsWith("_run_count")) return 1;
  if (parameterId.includes("waste_percent")) return 7;
  if (parameterId.includes("density_kg_l")) return 1.15;
  if (parameterId.includes("mass_kg_m2")) return 9;
  if (parameterId.includes("mass_kg_m")) return 0.5;
  if (parameterId.includes("mass_kg_item")) return 0.05;
  if (parameterId.includes("kg_per_penetration")) return 0.3;
  if (parameterId.includes("kg_m2")) return 0.25;
  if (parameterId.includes("kg_m")) return 0.08;
  if (parameterId.includes("l_m2")) return 0.15;
  if (parameterId.includes("item_m2")) return 14;
  if (parameterId.includes("item_per_opening")) return 8;
  if (parameterId.includes("m_per_opening")) return 3;
  if (parameterId.includes("length_m_item")) return 0.5;
  if (parameterId.includes("capacity")) return 25;
  if (parameterId.includes("productivity")) return 10;
  if (parameterId.includes("interval")) return 50;
  if (parameterId.includes("percent")) return 5;
  if (parameterId.includes("count")) return 1;
  if (parameterId.includes("area_m2")) return 0;
  if (parameterId.includes("length_m")) return 10;
  if (parameterId.includes("distance_km")) return 18;
  if (parameterId.includes("rate_")) return 1;
  return 1;
}

export function batch001DrywallGoldFixtureValuesR3(
  definition: Batch001DrywallSuccessorDefinitionR3,
): Readonly<Record<string, string | number | boolean>> {
  const formulaInputs = new Set(definition.runtimeFormulas.flatMap((formula) => formula.inputParameterIds));
  const values: Record<string, string | number | boolean> = Object.fromEntries(
    [...formulaInputs].map((parameterId) => [parameterId, fixtureNumber(parameterId)]),
  );
  for (const parameter of definition.passport.parameters) {
    if (parameter.visibilityRole === "USER_INPUT" && values[parameter.parameterId] == null) {
      values[parameter.parameterId] = fixtureNumber(parameter.parameterId);
    }
  }
  values.exact_system_route = "Совместимая потолочная система П112 по проекту";
  values.board_type = definition.variant === "wet_zone"
    ? "Влагостойкий гипсокартонный лист 12,5 мм"
    : definition.variant === "high_load"
      ? "Усиленный гипсокартонный лист 12,5 мм"
      : "Гипсокартонный лист 12,5 мм";
  values.surface_quality_level = "Q3";
  values.delivery_included_by_supplier = false;
  return values;
}
