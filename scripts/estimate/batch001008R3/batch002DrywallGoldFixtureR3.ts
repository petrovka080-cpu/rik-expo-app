import type { Batch002DrywallSuccessorDefinitionR3 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";

export const BATCH002_DRYWALL_GOLD_FIXTURE_R3_CONTRACT =
  "real-professional-estimates-r3.batch002-drywall-gold-fixture.v1" as const;

const EXACT_NUMERIC: Readonly<Record<string, number>> = {
  area_m2: 72,
  perimeter_m: 38,
  curve_element_count: 4,
  curve_radius_m: 2.4,
  curve_angle_deg: 90,
  curve_element_width_m: 1.1,
  curve_drop_height_m: 0.55,
  joint_length_m: 84,
  cut_edge_length_m: 18,
  external_corner_length_m: 22,
  internal_corner_length_m: 16,
  fastener_head_count: 760,
  joint_finish_area_m2: 31,
  insulation_area_m2: 64,
  insulation_thickness_m: 0.05,
  insulation_layer_count: 1,
  support_mesh_area_m2: 64,
  insulation_perimeter_m: 38,
  preparation_area_m2: 72,
  local_defect_area_m2: 4,
  protected_surface_area_m2: 26,
  layout_length_m: 38,
  defect_area_m2: 12,
  repair_board_layer_count: 2,
  damaged_profile_length_m: 9,
  damaged_insulation_volume_m3: 0.35,
  repair_joint_length_m: 29,
  demolition_waste_t: 0.42,
  waste_haul_distance_km: 22,
  correction_point_count: 24,
  local_reinforcement_length_m: 8,
  board_layer_count: 2,
  curve_opening_count: 3,
  curve_edge_length_m: 24,
  wet_forming_area_m2: 18,
  curve_template_count: 2,
  curve_track_line_count: 2,
  curve_stud_spacing_m: 0.4,
  curve_cross_member_spacing_m: 0.5,
  curve_hanger_spacing_m: 0.6,
  curve_track_anchor_spacing_m: 0.4,
  curve_hanger_rod_length_m: 0.8,
  curve_opening_reinforcement_length_m: 9,
  large_area_reference_zone_count: 4,
  large_area_deformation_joint_length_m: 12,
  small_area_cavity_count: 8,
  small_area_patch_perimeter_m: 14,
  small_area_return_length_m: 11,
  technical_penetration_count: 4,
  technical_penetration_perimeter_m: 13,
  technical_equipment_protection_area_m2: 18,
  wet_zone_interface_length_m: 21,
  wet_zone_membrane_area_m2: 64,
  wet_zone_surface_area_m2: 72,
  delivery_mass_kg: 1250,
  delivery_distance_km: 24,
  abrasive_coverage_m2_item: 8,
  alignment_fastener_item_m: 1,
  alignment_shim_kg_item: 0.08,
  board_waste_percent: 7,
  cladding_screw_item_m2_layer: 18,
  curve_joint_tape_run_count: 1,
  forming_water_l_m2: 0.3,
  frame_profile_waste_percent: 7,
  frame_screws_per_connection: 4,
  insulation_retainer_item_m2: 6,
  insulation_sealant_kg_m: 0.18,
  insulation_waste_percent: 7,
  joint_base_compound_kg_m: 0.18,
  joint_finish_compound_kg_m: 0.18,
  joint_tape_run_count: 1,
  large_area_joint_primer_kg_m: 0.12,
  preparation_abrasive_coverage_m2_item: 8,
  preparation_primer_kg_m2: 0.15,
  preparation_repair_compound_kg_m2: 0.35,
  repair_base_compound_kg_m: 0.18,
  repair_board_waste_percent: 7,
  repair_fastener_item_m2: 6,
  repair_finish_compound_kg_m2: 0.35,
  repair_primer_kg_m2: 0.15,
  screw_head_compound_kg_item: 0.004,
  technical_fastener_item_opening: 8,
  technical_sealant_kg_m: 0.18,
  wet_zone_primer_kg_m2: 0.15,
  wet_zone_sealant_kg_m: 0.18,
};

function fixtureNumber(parameterId: string): number {
  if (EXACT_NUMERIC[parameterId] != null) return EXACT_NUMERIC[parameterId];
  throw new Error(`BATCH002_R55_FIXTURE_VALUE_UNEXPLAINED:${parameterId}`);
}

export function batch002DrywallGoldFixtureValuesR3(
  definition: Batch002DrywallSuccessorDefinitionR3,
): Readonly<Record<string, string | number | boolean>> {
  const values: Record<string, string | number | boolean> = Object.fromEntries(
    definition.runtimeFormulas
      .flatMap((item) => item.inputParameterIds)
      .map((parameterId) => [parameterId, fixtureNumber(parameterId)]),
  );
  for (const parameter of definition.passport.parameters) {
    if (parameter.visibilityRole === "USER_INPUT" && values[parameter.parameterId] == null) {
      const contract = definition.passport.userParameterContracts.find((item) => item.parameterId === parameter.parameterId);
      if (!contract) throw new Error(`BATCH002_R55_FIXTURE_CONTRACT_MISSING:${parameter.parameterId}`);
      values[parameter.parameterId] = contract.inputType === "BOOLEAN"
        ? false
        : contract.inputType === "TEXT"
          ? "Явное проектное значение для проверочного расчёта"
          : fixtureNumber(parameter.parameterId);
    }
  }
  const declaredIds = new Set(definition.passport.parameters.map((parameter) => parameter.parameterId));
  const setIfDeclared = (parameterId: string, value: string | number | boolean): void => {
    if (declaredIds.has(parameterId)) values[parameterId] = value;
  };
  setIfDeclared("delivery_included_by_supplier", false);
  setIfDeclared("surface_quality_level", "Q3");
  setIfDeclared("joint_system_type", "Совместимая система шпаклёвки и бумажной ленты");
  setIfDeclared("insulation_type", "Минераловатная акустическая плита 50 мм");
  setIfDeclared("substrate_type", "Минеральное основание после удаления пыли");
  setIfDeclared("repair_board_type", definition.variant === "wet_zone" ? "Влагостойкий лист 12,5 мм" : "Лист 12,5 мм существующей системы");
  setIfDeclared("repair_cause_removed", true);
  setIfDeclared("accepted_frame_revision_id", "accepted-frame-revision-r3-fixture");
  setIfDeclared("board_type", definition.variant === "wet_zone" ? "Гибкий влагостойкий лист проектного радиуса" : "Гибкий лист проектного радиуса");
  setIfDeclared("forming_method", "Сухое формование по допустимому радиусу");
  setIfDeclared("frame_system_type", "Совместимая потолочная система гибких профилей");
  return values;
}
